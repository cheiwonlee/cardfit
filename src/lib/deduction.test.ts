import { describe, expect, it } from 'vitest';
import {
  basicLimitOf,
  calcDeduction,
  estimateRefund,
  extraLimitOf,
  MEANINGFUL_GAIN,
  optimalMix,
  potentialGain,
} from './deduction';

/** 만원 -> 원 */
const M = (n: number) => n * 10_000;

describe('분기 A — 문턱 미달', () => {
  it('총액이 문턱에 못 미치면 공제 0', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(600), check: M(200) });
    expect(r.deduction).toBe(0);
    expect(r.stage).toBe('A');
  });

  it('[경계] 총액이 문턱과 정확히 같으면 공제 0, 분기는 A', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(1000), check: 0 });
    expect(r.deduction).toBe(0);
    expect(r.stage).toBe('A');
  });

  it('[경계] 문턱보다 1원 많으면 분기 B로 넘어감', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(1000), check: 1 });
    expect(r.stage).toBe('B');
  });
});

describe('분기 B — 황금 구간', () => {
  it('신용카드로만 2,000만원', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(2000), check: 0 });
    expect(r.deduction).toBe(M(150));
    expect(r.stage).toBe('B');
  });

  it('신용카드로 500만원을 더 써도 체크카드 전환보다 못하다', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(2500), check: 0 });
    expect(r.deduction).toBe(M(225)); // 2,000만원을 신용+체크로 반씩 나눈 300만원보다 적음
  });
});

describe('핵심 비교 — 같은 총액, 다른 결과', () => {
  const grossSalary = M(4000);

  it('총액 2,000만원: 전부 신용 150만원 vs 신용/체크 반반 300만원 (정확히 2배)', () => {
    const allCredit = calcDeduction({ grossSalary, credit: M(2000), check: 0 });
    const halfHalf = calcDeduction({ grossSalary, credit: M(1000), check: M(1000) });
    expect(halfHalf.deduction).toBe(allCredit.deduction * 2);
  });

  it('신용카드가 문턱 이하이면 어떻게 나눠 써도 공제액이 동일하다', () => {
    // 이 성질 때문에 "문턱까지 신용카드 먼저"의 근거는 세금이 아니라 카드 혜택이다
    const halfHalf = calcDeduction({ grossSalary, credit: M(1000), check: M(1000) });
    const allCheck = calcDeduction({ grossSalary, credit: 0, check: M(2000) });
    const mixed = calcDeduction({ grossSalary, credit: M(400), check: M(1600) });
    expect(halfHalf.deduction).toBe(M(300));
    expect(allCheck.deduction).toBe(M(300));
    expect(mixed.deduction).toBe(M(300));
  });
});

describe('분기 C — 한도 소진', () => {
  it('[경계] 공제 대상이 한도와 정확히 같으면 C', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(1000), check: M(1000) });
    expect(r.target).toBe(M(300));
    expect(r.deduction).toBe(M(300));
    expect(r.stage).toBe('C');
  });

  it('한도를 넘겨도 공제액은 300만원에서 멈춘다', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: M(1000), check: M(1500) });
    expect(r.target).toBe(M(450));
    expect(r.deduction).toBe(M(300));
    expect(r.stage).toBe('C');
  });
});

describe('한도 구간 경계 — 여기서 가장 많이 틀린다', () => {
  it('총급여 7,000만원 정확히는 300만원 한도 (이하 포함)', () => {
    const r = calcDeduction({ grossSalary: M(7000), credit: M(1750), check: M(2000) });
    expect(r.limit).toBe(M(300));
    expect(r.deduction).toBe(M(300));
  });

  it('총급여가 1원 많아지면 한도가 250만원으로 떨어진다', () => {
    const r = calcDeduction({ grossSalary: M(7000) + 1, credit: M(1750), check: M(2000) });
    expect(r.limit).toBe(M(250));
    expect(r.deduction).toBe(M(250));
  });

  it('1.2억 초과 200만원 구간은 현행법에 존재하지 않는다', () => {
    // 2023년 이전 기준. 블로그에는 아직 남아 있으나 조특법 제126조의2 제10항에 없다.
    expect(basicLimitOf(M(12000) + 1)).toBe(M(250));
    expect(basicLimitOf(M(50000))).toBe(M(250));
  });

  it('자녀 수에 따라 한도가 올라간다 (2025.12.23. 개정)', () => {
    expect(basicLimitOf(M(6000), 0)).toBe(M(300));
    expect(basicLimitOf(M(6000), 1)).toBe(M(350));
    expect(basicLimitOf(M(6000), 2)).toBe(M(400));
    expect(basicLimitOf(M(6000), 3)).toBe(M(400));
    expect(basicLimitOf(M(9000), 0)).toBe(M(250));
    expect(basicLimitOf(M(9000), 1)).toBe(M(275));
    expect(basicLimitOf(M(9000), 2)).toBe(M(300));
  });

  it('자녀 2명이면 같은 소비로 100만원을 더 공제받는다', () => {
    const base = { grossSalary: M(4000), credit: M(1000), check: M(2000) };
    const noKids = calcDeduction(base);
    const twoKids = calcDeduction({ ...base, children: 2 });
    expect(twoKids.deduction - noKids.deduction).toBe(M(100));
  });
});

describe('추가 한도는 항목별이 아니라 합산 한도다', () => {
  it('제126조의2 제11항: 7천만원 이하 300만원, 초과 200만원', () => {
    expect(extraLimitOf(M(7000))).toBe(M(300));
    expect(extraLimitOf(M(7000) + 1)).toBe(M(200));
  });
});

describe('예외 입력', () => {
  it('소비가 전혀 없으면 공제 0, 분기 A', () => {
    const r = calcDeduction({ grossSalary: M(4000), credit: 0, check: 0 });
    expect(r.deduction).toBe(0);
    expect(r.stage).toBe('A');
  });

  it('총급여 0원도 터지지 않는다', () => {
    expect(() => calcDeduction({ grossSalary: 0, credit: M(100), check: 0 })).not.toThrow();
  });

  it('[회귀] 부동소수점 오차로 1원이 사라지지 않는다', () => {
    // 실수 연산 버전에서 17,109,149원이 나왔던 입력
    const r = calcDeduction({ grossSalary: 91_830_028, credit: 50_432_193, check: 43_293_157 });
    expect(r.target).toBe(17_109_150);
  });

  it('음수 입력은 거부한다', () => {
    expect(() => calcDeduction({ grossSalary: M(4000), credit: -1, check: 0 })).toThrow(RangeError);
  });

  it('문턱이 소수점으로 떨어져도 원 단위로 정리된다', () => {
    const r = calcDeduction({ grossSalary: 33_333_333, credit: M(1000), check: M(1000) });
    expect(Number.isInteger(r.deduction)).toBe(true);
  });
});

describe('환급액 추정', () => {
  it('공제 300만원 × 한계세율 15% × 지방소득세 포함 = 495,000원', () => {
    expect(estimateRefund(M(300), 0.15)).toBe(495_000);
  });

  it('한계세율이 6%면 같은 공제액도 198,000원에 그친다', () => {
    // 저연봉 사용자에게 절세액을 과장하면 안 된다는 근거
    expect(estimateRefund(M(300), 0.06)).toBe(198_000);
  });
});

describe('행동 권유 가드', () => {
  it('문턱을 1원 넘긴 사용자에게는 개선 효과를 권하지 않는다', () => {
    const input = { grossSalary: M(4000), credit: M(1000), check: 1 };
    expect(calcDeduction(input).stage).toBe('B');
    expect(potentialGain(input)).toBeLessThan(MEANINGFUL_GAIN);
  });

  it('신용카드 2,000만원 사용자는 전환 효과가 유의미하다', () => {
    const input = { grossSalary: M(4000), credit: M(2000), check: 0 };
    expect(potentialGain(input)).toBe(M(150));
  });
});

describe('optimalMix', () => {
  it('문턱은 신용, 한도는 체크로 채운다', () => {
    const m = optimalMix(M(4000));
    expect(m.credit).toBe(M(1000));
    expect(m.check).toBe(M(1000));
    expect(m.creditOnlyAbove).toBe(M(2000));
    expect(m.deduction).toBe(M(300));
    expect(calcDeduction({ grossSalary: M(4000), credit: m.credit, check: m.check }).stage).toBe('C');
  });

  it('자녀가 있으면 한도가 올라 체크 사용액이 늘어난다', () => {
    expect(optimalMix(M(4000), 2).check).toBeGreaterThan(optimalMix(M(4000), 0).check);
  });
});

describe('potentialGain', () => {
  it('자녀 수를 그대로 반영한다 (한도가 달라지므로)', () => {
    const input = { grossSalary: M(4000), credit: M(3000), check: 0, children: 2 };
    // 자녀 2명이면 한도 400만원까지 채울 수 있어 개선 여지가 더 크다
    expect(potentialGain(input)).toBeGreaterThan(
      potentialGain({ ...input, children: 0 }),
    );
  });
});

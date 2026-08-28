import { describe, expect, it } from 'vitest';
import {
  earnedIncomeTaxCredit,
  estimateGrossFromNet,
  estimateNetPay,
  progressiveTax,
  resolvePay,
  resolvePreTax,
  socialInsurance,
} from './netPay';

const M = (n: number) => n * 10_000;

describe('누진세율', () => {
  it('과세표준 1,400만원은 전액 6%', () => {
    expect(progressiveTax(M(1400))).toBe(M(84));
  });

  it('과세표준 2,545만원은 구간을 쪼개어 계산한다', () => {
    // 1,400만 × 6% + 1,145만 × 15%
    expect(Math.round(progressiveTax(M(2545)))).toBe(M(84) + M(171.75));
  });

  it('과세표준 0원이면 세금도 0원', () => {
    expect(progressiveTax(0)).toBe(0);
  });
});

describe('근로소득세액공제 한도', () => {
  it('총급여 3,300만원 이하는 74만원이 상한', () => {
    expect(earnedIncomeTaxCredit(M(3000), M(500))).toBe(740_000);
  });

  it('총급여가 오르면 상한이 내려간다', () => {
    const low = earnedIncomeTaxCredit(M(4000), M(500));
    const high = earnedIncomeTaxCredit(M(6000), M(500));
    expect(high).toBeLessThan(low);
    expect(high).toBeGreaterThanOrEqual(660_000);
  });

  it('산출세액이 작으면 한도가 아니라 55%가 적용된다', () => {
    expect(earnedIncomeTaxCredit(M(3000), 1_000_000)).toBe(550_000);
  });
});

describe('4대보험', () => {
  it('장기요양보험료는 건강보험료에 곱해서 나온다', () => {
    const g = M(4000);
    const health = g * 0.03545;
    expect(Math.round(socialInsurance(g))).toBe(
      Math.round(g * 0.045 + health + health * 0.1295 + g * 0.009),
    );
  });
});

describe('세전 연봉 → 총급여', () => {
  it('세전 4,000만원은 식대 240만원을 빼 총급여 3,760만원', () => {
    const r = resolvePreTax(M(4000));
    expect(r.grossSalary).toBe(M(3760));
    expect(estimateNetPay(r.grossSalary, r.nonTaxableMonthly).grossTotal).toBe(M(4000));
  });

  it('식대보다 작은 세전 연봉은 총급여 0으로 둔다', () => {
    const r = resolvePreTax(M(120));
    expect(r.grossSalary).toBe(0);
    expect(r.nonTaxableMonthly).toBe(M(10));
  });

  it('세전 월급은 12를 곱해 연봉으로 본다', () => {
    const year = resolvePay(M(4000), 'pre-tax', 'year');
    const month = resolvePay(M(4000) / 12, 'pre-tax', 'month');
    expect(month.pay.grossTotal).toBe(year.pay.grossTotal);
    expect(month.grossSalary).toBe(year.grossSalary);
  });
});

describe('세후 실수령 → 총급여 역산', () => {
  it('세전에서 나온 연 실수령을 넣으면 총급여가 거의 그대로 돌아온다', () => {
    const forward = resolvePay(M(4000), 'pre-tax');
    const back = estimateGrossFromNet(forward.pay.netYear, 'year');
    expect(Math.abs(back.grossSalary - forward.grossSalary)).toBeLessThan(10_000);
    expect(Math.abs(back.pay.netYear - forward.pay.netYear)).toBeLessThan(10_000);
  });

  it('월 실수령으로 역산해도 월급이 맞는다', () => {
    const forward = resolvePay(M(4000), 'pre-tax');
    const back = estimateGrossFromNet(forward.pay.netMonth, 'month');
    expect(back.pay.netMonth).toBe(forward.pay.netMonth);
  });

  it('resolvePay 세후 연봉은 실수령에 가깝게 맞춘다', () => {
    const { pay } = resolvePay(M(3000), 'post-tax', 'year');
    expect(Math.abs(pay.netYear - M(3000))).toBeLessThan(20_000);
  });
});

describe('실수령액', () => {
  it('총급여 4,000만원은 월 300만원대 초반으로 나온다', () => {
    const r = estimateNetPay(M(4000));
    expect(r.netMonth).toBeGreaterThan(2_900_000);
    expect(r.netMonth).toBeLessThan(3_200_000);
  });

  it('비과세 수당은 세금 없이 그대로 더해진다', () => {
    const withMeal = estimateNetPay(M(4000), 200_000);
    const without = estimateNetPay(M(4000), 0);
    expect(withMeal.netYear - without.netYear).toBe(200_000 * 12);
  });

  it('총급여가 높을수록 실수령 비율이 낮아진다 (누진세)', () => {
    const low = estimateNetPay(M(3000));
    const high = estimateNetPay(M(10000));
    expect(high.netYear / high.grossTotal).toBeLessThan(low.netYear / low.grossTotal);
  });

  it('총급여 0원이어도 음수가 나오지 않는다', () => {
    expect(estimateNetPay(0, 0).netYear).toBe(0);
  });
});

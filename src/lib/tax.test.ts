import { describe, expect, it } from 'vitest';
import { earnedIncomeDeduction, estimateMarginalRate, estimateTaxBase, NATIONAL_PENSION_RATE } from './tax';

const M = (n: number) => n * 10_000;

describe('과세표준 추정', () => {
  it('표준세액공제 가정이면 국민연금만 과세표준에서 뺀다', () => {
    const S = M(4000);
    expect(estimateTaxBase(S, 0)).toBe(
      S - earnedIncomeDeduction(S) - 1_500_000 - S * NATIONAL_PENSION_RATE,
    );
  });

  it('카드 공제액만큼 과세표준이 더 줄어든다', () => {
    const S = M(4000);
    expect(estimateTaxBase(S, M(300))).toBe(estimateTaxBase(S, 0) - M(300));
  });

  it('총급여 2,600만원은 한계세율 15%', () => {
    // 4대보험 전액(9.4%)을 빼면 과세표준이 1,400만원 아래로 내려가 6%로 잘못 잡힌다
    expect(estimateMarginalRate(M(2600), 0)).toBe(0.15);
  });
});

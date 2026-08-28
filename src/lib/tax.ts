/**
 * 한계세율 추정
 *
 * 카드 공제액을 환급액으로 바꾸려면 한계세율이 필요한데, 정확한 과세표준은
 * 부양가족·보험료·연금 등 개인별 항목이 전부 있어야 나온다. 여기서는 총급여만으로
 * 1인 가구를 가정해 추정한다. 화면에는 반드시 "추정치"로 표기할 것.
 */

/** 근로소득공제 — 소득세법 제47조. 공제 한도 2,000만원. */
export function earnedIncomeDeduction(grossSalary: number): number {
  const S = grossSalary;
  let d: number;
  if (S <= 5_000_000) d = S * 0.7;
  else if (S <= 15_000_000) d = 3_500_000 + (S - 5_000_000) * 0.4;
  else if (S <= 45_000_000) d = 7_500_000 + (S - 15_000_000) * 0.15;
  else if (S <= 100_000_000) d = 12_000_000 + (S - 45_000_000) * 0.05;
  else d = 14_750_000 + (S - 100_000_000) * 0.02;
  return Math.min(d, 20_000_000);
}

/**
 * 국민연금 근로자 부담 요율.
 * 표준세액공제를 가정하면 과세표준에서 빼는 사회보험은 공적연금보험료(국민연금)뿐이다.
 * 건강보험·고용보험은 특별소득공제 항목이라 표준세액공제와 함께 쓸 수 없다.
 * netPay.INSURANCE_RATES.nationalPension 과 같아야 한다.
 */
export const NATIONAL_PENSION_RATE = 0.045;

/** 소득세 기본세율 구간 — 소득세법 제55조 */
export const TAX_BRACKETS = [
  { upTo: 14_000_000, rate: 0.06 },
  { upTo: 50_000_000, rate: 0.15 },
  { upTo: 88_000_000, rate: 0.24 },
  { upTo: 150_000_000, rate: 0.35 },
  { upTo: 300_000_000, rate: 0.38 },
  { upTo: 500_000_000, rate: 0.4 },
  { upTo: 1_000_000_000, rate: 0.42 },
  { upTo: Infinity, rate: 0.45 },
] as const;

export function marginalRateOf(taxBase: number): number {
  return TAX_BRACKETS.find((b) => taxBase <= b.upTo)!.rate;
}

/** 1인 가구·표준세액공제 가정 과세표준 추정 */
export function estimateTaxBase(grossSalary: number, cardDeduction: number): number {
  const pension = grossSalary * NATIONAL_PENSION_RATE;
  const base =
    grossSalary -
    earnedIncomeDeduction(grossSalary) -
    1_500_000 - // 본인 기본공제
    pension -
    cardDeduction;
  return Math.max(0, base);
}

export function estimateMarginalRate(grossSalary: number, cardDeduction: number): number {
  return marginalRateOf(estimateTaxBase(grossSalary, cardDeduction));
}

import { earnedIncomeDeduction, NATIONAL_PENSION_RATE, TAX_BRACKETS } from './tax';

/**
 * 실수령액 추정
 *
 * 정확한 값이 아니다. 실제 급여에서 매달 떼는 세금은 근로소득 간이세액표를 따르고,
 * 그 차액은 이듬해 연말정산에서 정산된다. 여기서는 1년치 세금을 계산해 12로 나눈
 * 값을 쓰므로 실제 월급 명세서와는 차이가 난다. 화면에 반드시 "추정"으로 표기할 것.
 *
 * 가정: 1인 가구, 부양가족 없음, 식대 월 20만원 비과세, 표준세액공제 적용.
 */

/**
 * 4대보험 근로자 부담 요율.
 * 매년 고시로 바뀐다. 배포 전 최신 요율로 반드시 갱신할 것.
 */
export const INSURANCE_RATES = {
  nationalPension: NATIONAL_PENSION_RATE, // 국민연금
  health: 0.03545, // 건강보험
  longTermCareOfHealth: 0.1295, // 장기요양 (건강보험료에 곱한다)
  employment: 0.009, // 고용보험
} as const;

/** 식대 등 비과세 수당 기본값 (월) */
export const DEFAULT_NON_TAXABLE_MONTHLY = 200_000;

/** 본인 기본공제 */
const PERSONAL_DEDUCTION = 1_500_000;

/** 특별공제를 따로 받지 않을 때의 표준세액공제 */
const STANDARD_TAX_CREDIT = 130_000;

export interface NetPay {
  /** 세전 총지급액 (총급여 + 비과세 수당) */
  grossTotal: number;
  /** 4대보험 근로자 부담분 (연) */
  insurance: number;
  /** 소득세 + 지방소득세 (연) */
  incomeTax: number;
  /** 실수령액 (연) */
  netYear: number;
  /** 실수령액 (월) */
  netMonth: number;
}

/** 4대보험 근로자 부담분 (연) */
export function socialInsurance(grossSalary: number): number {
  const health = grossSalary * INSURANCE_RATES.health;
  return (
    grossSalary * INSURANCE_RATES.nationalPension +
    health +
    health * INSURANCE_RATES.longTermCareOfHealth +
    grossSalary * INSURANCE_RATES.employment
  );
}

/** 과세표준에 누진세율을 구간별로 적용한 산출세액 */
export function progressiveTax(taxBase: number): number {
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of TAX_BRACKETS) {
    if (taxBase <= prev) break;
    tax += (Math.min(taxBase, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
}

/** 근로소득세액공제 — 소득세법 제59조 */
export function earnedIncomeTaxCredit(grossSalary: number, computedTax: number): number {
  const credit =
    computedTax <= 1_300_000
      ? computedTax * 0.55
      : 715_000 + (computedTax - 1_300_000) * 0.3;

  let cap: number;
  if (grossSalary <= 33_000_000) cap = 740_000;
  else if (grossSalary <= 70_000_000)
    cap = Math.max(660_000, 740_000 - (grossSalary - 33_000_000) * 0.008);
  else if (grossSalary <= 120_000_000)
    cap = Math.max(500_000, 660_000 - (grossSalary - 70_000_000) * 0.5);
  else cap = Math.max(200_000, 500_000 - (grossSalary - 120_000_000) * 0.5);

  return Math.min(credit, cap);
}

export function estimateNetPay(
  grossSalary: number,
  nonTaxableMonthly = DEFAULT_NON_TAXABLE_MONTHLY,
): NetPay {
  const nonTaxable = nonTaxableMonthly * 12;
  const grossTotal = grossSalary + nonTaxable;
  const insurance = socialInsurance(grossSalary);
  const pension = grossSalary * INSURANCE_RATES.nationalPension;

  const taxBase = Math.max(
    0,
    grossSalary - earnedIncomeDeduction(grossSalary) - PERSONAL_DEDUCTION - pension,
  );

  const computed = progressiveTax(taxBase);
  const determined = Math.max(
    0,
    computed - earnedIncomeTaxCredit(grossSalary, computed) - STANDARD_TAX_CREDIT,
  );
  const incomeTax = determined * 1.1; // 지방소득세 10% 포함

  const netYear = Math.max(0, grossTotal - insurance - incomeTax);

  return {
    grossTotal,
    insurance: Math.round(insurance),
    incomeTax: Math.round(incomeTax),
    netYear: Math.round(netYear),
    netMonth: Math.round(netYear / 12),
  };
}

export type PayKind = 'pre-tax' | 'post-tax';
export type NetPeriod = 'year' | 'month';

/**
 * 세전 연봉(세전 총지급액)에서 총급여를 나눈다.
 * 식대 비과세는 세전 연봉에 포함되어 있다고 보고, 모자라면 식대만 줄인다.
 */
export function resolvePreTax(
  preTaxYear: number,
  nonTaxableMonthly = DEFAULT_NON_TAXABLE_MONTHLY,
): { grossSalary: number; nonTaxableMonthly: number } {
  const mealYear = nonTaxableMonthly * 12;
  if (preTaxYear <= 0) return { grossSalary: 0, nonTaxableMonthly: 0 };
  if (preTaxYear <= mealYear) {
    return { grossSalary: 0, nonTaxableMonthly: Math.round(preTaxYear / 12) };
  }
  return { grossSalary: preTaxYear - mealYear, nonTaxableMonthly };
}

function netOf(pay: NetPay, period: NetPeriod): number {
  return period === 'month' ? pay.netMonth : pay.netYear;
}

/**
 * 세후 실수령액에서 총급여를 역산한다.
 * 같은 실수령을 만드는 총급여가 여러 개일 수 있어, 관측값과의 차이가 가장 작은 값을 고른다.
 */
export function estimateGrossFromNet(
  netAmount: number,
  period: NetPeriod,
): { grossSalary: number; pay: NetPay } {
  const target = Math.round(netAmount);
  if (target <= 0) {
    const pay = estimateNetPay(0, 0);
    return { grossSalary: 0, pay };
  }

  const floor = netOf(estimateNetPay(0), period);
  const meal = target < floor ? 0 : DEFAULT_NON_TAXABLE_MONTHLY;
  const valueOf = (gross: number) => netOf(estimateNetPay(gross, meal), period);

  let lo = 0;
  let hi = Math.max(target, 10_000_000);
  while (valueOf(hi) < target && hi < 2_000_000_000) {
    hi = Math.min(Math.floor(hi * 1.8) + 1_000_000, 2_000_000_000);
  }

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (valueOf(mid) < target) lo = mid + 1;
    else hi = mid;
  }

  let best = lo;
  let bestPay = estimateNetPay(best, meal);
  let bestDiff = Math.abs(netOf(bestPay, period) - target);
  for (const g of [lo - 1, lo + 1]) {
    if (g < 0) continue;
    const p = estimateNetPay(g, meal);
    const d = Math.abs(netOf(p, period) - target);
    if (d < bestDiff) {
      best = g;
      bestPay = p;
      bestDiff = d;
    }
  }

  return { grossSalary: best, pay: bestPay };
}

/** 입력 금액을 카드 공제용 총급여와 실수령 추정으로 바꾼다. */
export function resolvePay(
  amountWon: number,
  kind: PayKind,
  period: NetPeriod = 'year',
): { grossSalary: number; pay: NetPay } {
  if (kind === 'pre-tax') {
    const yearAmount = period === 'month' ? amountWon * 12 : amountWon;
    const { grossSalary, nonTaxableMonthly } = resolvePreTax(yearAmount);
    return { grossSalary, pay: estimateNetPay(grossSalary, nonTaxableMonthly) };
  }
  return estimateGrossFromNet(amountWon, period);
}

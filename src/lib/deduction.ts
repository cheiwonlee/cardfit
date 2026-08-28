/**
 * 신용카드 등 소득공제 계산
 *
 * 근거: 조세특례제한법 제126조의2
 * 조문 최종 개정 2025.12.23. (법률 제21223호)
 * 현행 법률 제21549호(시행 2026.4.21.)에서 본조는 개정되지 않음. 2026-08-28 대조 확인.
 *
 * 미확정: 제10항 자녀등 한도 가산의 적용 귀속연도. 2026년 귀속으로 추정되나
 *         법률 제21223호 부칙 미확인. 확인 전까지 children 기본값 0으로 운용할 것.
 * 일몰:   제1항에 따라 2028.12.31.까지 사용분에 한해 적용된다.
 * 미구현: 제6호 다목(최저사용금액이 신용카드+직불카드 합계보다 큰 경우, 40% 차감).
 *         현재는 전통시장·대중교통·문화체육 카테고리를 받지 않으므로 이 분기에
 *         도달할 수 없다. 특별 카테고리를 추가하는 순간 반드시 함께 구현할 것.
 *
 * 설계 원칙
 * 1) 공제액 계산과 환급액 추정을 분리한다. 섞으면 틀렸을 때 원인을 못 찾는다.
 * 2) 금액 계산은 부동소수점을 쓰지 않는다. 0.15 / 0.3 은 이진수로 정확히
 *    표현되지 않아 Math.floor 단계에서 1원이 사라진다. (무작위 30만 건 중
 *    1,024건에서 실제로 재현됨) 따라서 1/10000원 단위 정수로 계산한다.
 */

export type Stage = 'A' | 'B' | 'C';

export interface DeductionInput {
  /**
   * 총급여. 세전 연봉이 아니다.
   * 세전 연봉에서 식대 등 비과세소득을 뺀 금액이며,
   * 원천징수영수증 16번 항목에 해당한다.
   * 월 20만원 식대만 있어도 연 240만원 차이가 나므로 UI 라벨에 반드시 명시할 것.
   */
  grossSalary: number;
  /** 신용카드 사용액 (공제 제외 항목은 미리 제거된 값) */
  credit: number;
  /** 체크카드 + 현금영수증 사용액 */
  check: number;
  /** 자녀등(자녀·손자녀 등 대통령령으로 정하는 부양가족) 수. 한도가 달라진다. */
  children?: number;
}

export interface DeductionResult {
  threshold: number;
  target: number;
  limit: number;
  deduction: number;
  stage: Stage;
}

export const THRESHOLD_RATE = 0.25;
export const CREDIT_RATE = 0.15;
export const CHECK_RATE = 0.3;

/**
 * 기본 공제 한도 — 조세특례제한법 제126조의2 제10항 (2025.12.23. 개정)
 * 총급여 7천만원 기준 2구간이며, 자녀등이 있으면 한도가 올라간다.
 * 주의: 1.2억 초과 200만원 구간은 현행법에 없다. (2023년 이전 기준이며
 * 아직도 그렇게 적어둔 블로그가 많으므로 원문을 기준으로 할 것)
 */
/** 분기 B로 판정됐더라도 개선 효과가 이 금액 미만이면 행동을 권하지 않는다 */
export const MEANINGFUL_GAIN = 10_000;

export function basicLimitOf(grossSalary: number, children = 0): number {
  const low = grossSalary <= 70_000_000;
  if (children >= 2) return low ? 4_000_000 : 3_000_000;
  if (children === 1) return low ? 3_500_000 : 2_750_000;
  return low ? 3_000_000 : 2_500_000;
}

/**
 * 추가 한도 — 제126조의2 제11항 (2025.12.23. 신설)
 * 항목별 개별 한도가 아니라 합산 한도다.
 * 전통시장 + 대중교통 합계 200만원, 총급여 7천만원 이하면 문화체육사용분을
 * 더해 300만원. 특별 카테고리 구현 시 이 값을 쓸 것.
 */
export function extraLimitOf(grossSalary: number): number {
  return grossSalary <= 70_000_000 ? 3_000_000 : 2_000_000;
}

export function calcDeduction({ grossSalary, credit, check, children = 0 }: DeductionInput): DeductionResult {
  if (grossSalary < 0 || credit < 0 || check < 0) {
    throw new RangeError('금액은 음수일 수 없습니다');
  }

  // 이하 정수 산술. th, c 는 1/100원 단위, offset/grossScaled 는 1/10000원 단위.
  const th = grossSalary * 25;
  const c = credit * 100;

  // 문턱 차감: 공제율이 낮은 신용카드분부터 소진시키는 것이 납세자에게 유리
  const offset = c >= th ? th * 15 : c * 15 + (th - c) * 30;
  const grossScaled = c * 15 + check * 100 * 30 - offset;

  const threshold = grossSalary * THRESHOLD_RATE;
  const target = Math.max(0, Math.floor(grossScaled / 10_000));
  const limit = basicLimitOf(grossSalary, children);
  const deduction = Math.min(target, limit);
  const stage: Stage = credit + check <= threshold ? 'A' : target >= limit ? 'C' : 'B';

  return { threshold, target, limit, deduction, stage };
}

/**
 * 체크카드 전환으로 늘어나는 공제액.
 * 이 값이 MEANINGFUL_GAIN 미만이면 행동을 권하지 않는다.
 */
export function potentialGain(input: DeductionInput): number {
  const now = calcDeduction(input);
  const bestCredit = Math.min(input.credit, input.grossSalary * THRESHOLD_RATE);
  const best = calcDeduction({
    ...input,
    credit: bestCredit,
    check: input.credit + input.check - bestCredit,
  });
  return best.deduction - now.deduction;
}

/**
 * 환급액 추정 = 공제액 × (한계세율 + 지방소득세 10%)
 * marginalRate 는 과세표준 추정으로 별도 산출해 주입한다.
 * 화면에는 반드시 "1인 가구 기준 추정치"로 표기할 것.
 */
export function estimateRefund(deduction: number, marginalRate: number): number {
  return Math.round(deduction * marginalRate * 1.1);
}

export interface OptimalMix {
  /** 문턱까지 신용카드 (연, 원) */
  credit: number;
  /** 한도를 채우는 체크·현금 (연, 원) */
  check: number;
  /** 한도를 신용만으로 채울 때, 문턱 위에서 더 써야 하는 금액 (연, 원) */
  creditOnlyAbove: number;
  threshold: number;
  limit: number;
  deduction: number;
}

/**
 * 공제 한도를 채우면서 문턱 위 지출을 최소화하는 신용/체크 조합.
 * 문턱 아래는 결제 수단이 공제에 영향을 주지 않으므로 신용카드로 두고,
 * 문턱 위는 반영 비율이 두 배인 체크·현금으로 한도를 채운다.
 */
export function optimalMix(grossSalary: number, children = 0): OptimalMix {
  if (grossSalary < 0) throw new RangeError('금액은 음수일 수 없습니다');

  const threshold = grossSalary * THRESHOLD_RATE;
  const limit = basicLimitOf(grossSalary, children);
  const check = Math.ceil((limit * 10) / 3);
  const creditOnlyAbove = Math.ceil((limit * 20) / 3);
  const credit = Math.max(0, threshold);
  const deduction = calcDeduction({ grossSalary, credit, check, children }).deduction;

  return { credit, check, creditOnlyAbove, threshold, limit, deduction };
}

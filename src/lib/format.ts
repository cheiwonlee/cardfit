/** 원 단위 금액을 만원 숫자로 (표시 전용) */
export function manwon(won: number): string {
  return Math.round(won / 10_000).toLocaleString('ko-KR');
}

/** 원 단위 금액을 사람이 읽는 문장으로 */
export function won(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

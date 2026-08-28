import { manwon } from '../lib/format';
import type { OptimalMix as Mix } from '../lib/deduction';

interface Props {
  mix: Mix;
  refund: number;
  applied: boolean;
  onFind: () => void;
}

/**
 * 한도를 가장 적게 쓰고 채우는 신용/체크 조합.
 * 버튼을 누르면 입력칸에 그 금액을 넣고, 이유를 아래에 풀어 쓴다.
 */
export default function OptimalMix({ mix, refund, applied, onFind }: Props) {
  return (
    <div className="field">
      <button type="button" className="opt-btn" onClick={onFind}>
        최적의 비율 찾기
      </button>
      {applied && (
        <div className="optimal">
          <p className="optimal-kicker">한도를 채우는 가장 짧은 길</p>
          <dl className="optimal-amounts">
            <div>
              <dt>신용카드</dt>
              <dd>
                월 {manwon(mix.credit / 12)}만원
                <span>연 {manwon(mix.credit)}만원</span>
              </dd>
            </div>
            <div>
              <dt>체크·현금</dt>
              <dd>
                월 {manwon(mix.check / 12)}만원
                <span>연 {manwon(mix.check)}만원</span>
              </dd>
            </div>
          </dl>
          <p className="optimal-refund">
            이렇게 쓰면 공제 한도 {manwon(mix.limit)}만원을 채우고, 돌려받는 돈은 약{' '}
            <b>{manwon(refund)}만원</b>입니다.
          </p>
          <ol className="optimal-why">
            <li>
              총급여의 25%인 {manwon(mix.threshold)}만원까지는 신용이든 체크든 공제가 0원입니다. 이
              구간은 할인과 적립이 좋은 신용카드를 쓰는 편이 이득입니다.
            </li>
            <li>
              그 위로는 체크카드·현금영수증이 쓴 돈의 30%, 신용카드는 15%만 공제에 반영됩니다. 같은
              금액을 써도 체크가 두 배입니다.
            </li>
            <li>
              한도 {manwon(mix.limit)}만원을 채우려면 문턱 위에서 체크는 {manwon(mix.check)}만원,
              신용만 쓰면 {manwon(mix.creditOnlyAbove)}만원이 필요합니다. 그래서 문턱 위는 체크로
              채웁니다.
            </li>
            <li>
              한도를 채운 뒤에는 카드를 더 써도 돌려받는 돈이 늘지 않습니다. 남은 소비는 할인 좋은
              카드로 돌리면 됩니다.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

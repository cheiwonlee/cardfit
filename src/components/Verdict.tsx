import { MEANINGFUL_GAIN } from '../lib/deduction';
import { manwon, won } from '../lib/format';

interface Props {
  stage: 'A' | 'B' | 'C';
  gain: number;
  gainRefund: number;
  threshold: number;
  spent: number;
  limit: number;
  creditYear: number;
}

/**
 * 결론 카드.
 *
 * 세 부분으로 고정한다. 지금 어떤 상태인지 / 왜 그런지 / 그래서 무엇을 하면 되는지.
 * "바꿔도 차이 없습니다" 같이 주어가 빠진 문장은 쓰지 않는다. 무엇을 바꾸는지,
 * 무엇이 같은지를 문장 안에 적는다.
 */
export default function Verdict({
  stage,
  gain,
  gainRefund,
  threshold,
  spent,
  limit,
  creditYear,
}: Props) {
  // 문턱을 갓 넘긴 사람에게 "바꾸면 이득"이라고 말하면 실제 차액이 몇백 원이다.
  const worthActing = stage === 'B' && gain >= MEANINGFUL_GAIN;

  if (stage === 'A') {
    return (
      <Card
        step="1단계"
        state="아직 공제가 시작되지 않았습니다"
        title={
          <>
            지금 카드값으로는 <em>세금이 줄어들지 않습니다</em>
          </>
        }
        why={`카드 공제는 1년 카드값이 총급여의 25%인 ${manwon(threshold)}만원을 넘은 다음부터 시작됩니다. 지금은 ${manwon(spent)}만원이라 ${manwon(threshold - spent)}만원이 모자랍니다. 이 구간에서는 신용카드로 결제하든 체크카드로 결제하든 줄어드는 세금이 똑같이 0원입니다.`}
        action="결제 수단은 고민하지 마세요. 할인과 적립이 가장 좋은 카드를 쓰는 게 이득입니다."
      />
    );
  }

  if (stage === 'C') {
    return (
      <Card
        step="3단계"
        state="공제 한도를 다 채웠습니다"
        title={
          <>
            카드를 더 써도 <em>돌려받는 돈은 그대로입니다</em>
          </>
        }
        why={`올해 카드로 받을 수 있는 공제는 ${manwon(limit)}만원이 최대인데, 지금 사용액으로 이미 그 한도를 채웠습니다. 여기서 카드값을 늘려도 공제액은 ${manwon(limit)}만원에서 멈춥니다.`}
        action="남은 소비는 할인 좋은 카드로 돌리세요. 공제를 더 받고 싶다면 대중교통, 전통시장, 도서·공연처럼 한도가 따로 붙는 곳에 쓰는 방법이 있습니다."
      />
    );
  }

  if (!worthActing) {
    return (
      <Card
        step="2단계"
        state="공제가 막 시작된 지점입니다"
        title={
          <>
            체크카드로 옮겨도 <em>{won(gainRefund)} 차이입니다</em>
          </>
        }
        why={`공제가 시작되는 ${manwon(threshold)}만원을 이제 막 넘겼습니다. 신용카드 결제를 전부 체크카드로 바꿔도 돌려받는 돈이 ${won(gainRefund)} 늘어나는 데 그칩니다.`}
        action="이 금액을 위해 결제 습관을 바꿀 필요는 없습니다. 편한 대로 쓰세요."
      />
    );
  }

  return (
    <Card
      step="2단계"
      state="결제 수단을 바꾸면 이득인 구간입니다"
      title={
        <>
          체크카드로 옮기면 <em>{won(gainRefund)}을 더 받습니다</em>
        </>
      }
      why={`신용카드는 쓴 돈의 15%만, 체크카드와 현금영수증은 30%가 공제에 반영됩니다. 지금은 신용카드로 연 ${manwon(creditYear)}만원을 쓰고 있어서 반영 비율이 낮은 쪽에 소비가 몰려 있습니다.`}
      action={`신용카드는 연 ${manwon(threshold)}만원(월 ${manwon(threshold / 12)}만원)까지만 쓰고, 그 위로는 체크카드나 현금영수증으로 결제하세요. 공제액이 ${manwon(gain)}만원 늘어납니다.`}
    />
  );
}

interface CardProps {
  step: string;
  state: string;
  title: React.ReactNode;
  why: string;
  action: string;
}

function Card({ step, state, title, why, action }: CardProps) {
  return (
    <div className="verdict">
      <p className="verdict-stage">
        <span>{step}</span>
        {state}
      </p>
      <h2 className="verdict-title">{title}</h2>
      <p className="verdict-body">{why}</p>
      <p className="verdict-action">
        <span>지금 할 일</span>
        {action}
      </p>
    </div>
  );
}

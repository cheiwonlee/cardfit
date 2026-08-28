import { manwon } from '../lib/format';
import type { NetPay, NetPeriod, PayKind } from '../lib/netPay';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  grossSalary: number;
  pay: NetPay;
  payKind: PayKind;
  netPeriod: NetPeriod;
}

/**
 * 세전과 세후가 왜 다른지 설명하는 도움말.
 *
 * 일반론으로 쓰지 않고 사용자가 지금 넣은 금액을 그대로 넣어 설명한다.
 * "월급에서 뭐가 빠지는지"를 항목별 금액으로 보여주는 게 핵심이다.
 */
export default function PayHelpModal({
  open,
  onClose,
  grossSalary,
  pay,
  payKind,
  netPeriod,
}: Props) {
  const nonTaxable = pay.grossTotal - grossSalary;
  const enteredIsNet = payKind === 'post-tax';
  const enteredIsMonthlyNet = enteredIsNet && netPeriod === 'month';

  return (
    <Modal open={open} onClose={onClose} eyebrow="용어 안내" title="세전과 세후는 뭐가 다른가요">
      <p>
        회사가 주기로 한 금액이 <b>세전</b>이고, 실제로 통장에 들어오는 금액이 <b>세후</b>입니다.
        그 사이에서 4대보험과 세금이 빠집니다. 카드 공제는 세전 연봉이 아니라 <b>총급여</b>(식대
        같은 비과세 수당을 뺀 금액)의 25%부터 시작합니다.
      </p>

      <h3>지금 넣은 금액으로 보면</h3>
      <table className="breakdown">
        <tbody>
          <tr>
            <th>총급여 (카드 공제 기준)</th>
            <td>{manwon(grossSalary)}만원</td>
          </tr>
          <tr className="plus">
            <th>비과세 식대 (월 20만원 가정)</th>
            <td>+{manwon(nonTaxable)}만원</td>
          </tr>
          <tr className={payKind === 'pre-tax' ? 'entered subtotal' : 'subtotal'}>
            <th>
              세전 연봉
              {payKind === 'pre-tax'
                ? netPeriod === 'month'
                  ? ' (지금 넣은 월급 × 12)'
                  : ' (지금 넣은 금액)'
                : ' (추정)'}
            </th>
            <td>{manwon(pay.grossTotal)}만원</td>
          </tr>
          <tr className="minus">
            <th>4대보험 (국민연금·건강·장기요양·고용)</th>
            <td>−{manwon(pay.insurance)}만원</td>
          </tr>
          <tr className="minus">
            <th>소득세 + 지방소득세</th>
            <td>−{manwon(pay.incomeTax)}만원</td>
          </tr>
          <tr className={enteredIsNet && !enteredIsMonthlyNet ? 'entered total' : 'total'}>
            <th>연 실수령액{enteredIsNet && !enteredIsMonthlyNet ? ' (지금 넣은 금액)' : ''}</th>
            <td>{manwon(pay.netYear)}만원</td>
          </tr>
          <tr className={enteredIsMonthlyNet ? 'entered total' : 'total'}>
            <th>월 실수령액{enteredIsMonthlyNet ? ' (지금 넣은 금액)' : ''}</th>
            <td>{manwon(pay.netMonth)}만원</td>
          </tr>
        </tbody>
      </table>

      <h3>왜 숫자를 바꾸나요</h3>
      {payKind === 'pre-tax' ? (
        <p>
          {netPeriod === 'month'
            ? '세전 월급에 12를 곱한 뒤 식대를 빼면 총급여가 됩니다.'
            : '세전 연봉에서 식대를 빼면 총급여가 됩니다.'}{' '}
          카드 공제가 시작되는 지점은 이 총급여의 25%입니다. 아래 실수령액은 4대보험과 세금을 뺀
          추정치입니다.
        </p>
      ) : (
        <p>
          통장에 들어오는 금액만 알 때도, 빠져 나간 4대보험과 세금을 거꾸로 더하면 세전 연봉을
          추정할 수 있습니다. 카드 공제는 그 안에서 식대를 뺀 총급여로 계산합니다.
        </p>
      )}
      <p className="modal-tip">
        총급여는 원천징수영수증 16번 항목에 적혀 있습니다. 부양가족과 다른 공제에 따라 실제 금액은
        달라집니다.
      </p>

      <h3>매달 떼는 세금은 왜 연말정산 결과와 다른가요</h3>
      <p>
        회사가 매달 떼는 세금은 근로소득 간이세액표라는 표를 보고 대략 계산한 금액입니다. 1년치
        실제 세금은 연말정산에서 확정되고, 그동안 더 냈으면 돌려받고 덜 냈으면 더 냅니다. 카드
        공제가 여기서 작동합니다.
      </p>

      <p className="modal-caveat">
        위 금액은 부양가족이 없는 1인 가구를 가정한 추정치입니다. 부양가족, 의료비, 주택자금 같은
        다른 공제에 따라 실제 금액은 달라집니다.
      </p>
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import Gauge from './components/Gauge';
import HometaxModal from './components/HometaxModal';
import OptimalMix from './components/OptimalMix';
import PayHelpModal from './components/PayHelpModal';
import SpendField from './components/SpendField';
import StageGuide from './components/StageGuide';
import Verdict from './components/Verdict';
import {
  basicLimitOf,
  calcDeduction,
  CHECK_RATE,
  CREDIT_RATE,
  estimateRefund,
  optimalMix,
  potentialGain,
  THRESHOLD_RATE,
} from './lib/deduction';
import { manwon } from './lib/format';
import { resolvePay, type NetPeriod, type PayKind } from './lib/netPay';
import { estimateMarginalRate } from './lib/tax';

function toManwon(won: number): number {
  return Math.max(0, Math.round(won / 10_000));
}

function toMonthlyManwon(won: number, mode: 'round' | 'ceil' = 'round'): number {
  const raw = won / 12 / 10_000;
  return Math.max(0, mode === 'ceil' ? Math.ceil(raw - 1e-9) : Math.round(raw));
}

export default function App() {
  const [payKind, setPayKind] = useState<PayKind>('pre-tax');
  const [period, setPeriod] = useState<NetPeriod>('year');
  const [salaryManwon, setSalaryManwon] = useState(4000);
  const [creditMonthly, setCreditMonthly] = useState(100);
  const [checkMonthly, setCheckMonthly] = useState(20);
  const [children, setChildren] = useState(0);
  const [hometaxOpen, setHometaxOpen] = useState(false);
  const [payHelpOpen, setPayHelpOpen] = useState(false);
  const [optimalOpen, setOptimalOpen] = useState(false);

  const amountWon = salaryManwon * 10_000;
  const { grossSalary, pay } = useMemo(
    () => resolvePay(amountWon, payKind, period),
    [amountWon, payKind, period],
  );

  const credit = creditMonthly * 12 * 10_000;
  const check = checkMonthly * 12 * 10_000;

  const result = useMemo(
    () => calcDeduction({ grossSalary, credit, check, children }),
    [grossSalary, credit, check, children],
  );

  const limit = basicLimitOf(grossSalary, children);
  const threshold = grossSalary * THRESHOLD_RATE;
  const rate = estimateMarginalRate(grossSalary, result.deduction);
  const refund = estimateRefund(result.deduction, rate);
  const gain = potentialGain({ grossSalary, credit, check, children });
  const gainRefund = estimateRefund(gain, rate);

  const mix = useMemo(() => optimalMix(grossSalary, children), [grossSalary, children]);
  const mixRate = estimateMarginalRate(grossSalary, mix.deduction);
  const mixRefund = estimateRefund(mix.deduction, mixRate);

  const kindLabel = payKind === 'pre-tax' ? '세전' : '세후';
  const salaryLabel =
    period === 'year' ? `1. ${kindLabel} 연봉은 얼마인가요` : `1. ${kindLabel} 월급은 얼마인가요`;
  const salaryUnit = period === 'month' ? '만원 / 월' : '만원 / 연';

  const switchKind = (next: PayKind) => {
    if (next === payKind) return;
    if (next === 'post-tax') {
      const n = period === 'month' ? pay.netMonth : pay.netYear;
      setSalaryManwon(toManwon(n));
    } else {
      const n = period === 'month' ? pay.grossTotal / 12 : pay.grossTotal;
      setSalaryManwon(toManwon(n));
    }
    setPayKind(next);
  };

  const switchPeriod = (next: NetPeriod) => {
    if (next === period) return;
    if (payKind === 'post-tax') {
      const n = next === 'month' ? pay.netMonth : pay.netYear;
      setSalaryManwon(toManwon(n));
    } else {
      const n = next === 'month' ? pay.grossTotal / 12 : pay.grossTotal;
      setSalaryManwon(toManwon(n));
    }
    setPeriod(next);
  };

  const applyOptimal = () => {
    setCreditMonthly(toMonthlyManwon(mix.credit));
    setCheckMonthly(toMonthlyManwon(mix.check, 'ceil'));
    setOptimalOpen(true);
  };

  return (
    <main className="page">
      <p className="eyebrow">카드정산</p>
      <h1 className="headline">
        올해 카드, <em>어디까지</em> 써야 이득일까
      </h1>
      <p className="lede">
        연말정산에서 카드는 아무리 써도 공제가 늘지 않는 구간이 있습니다. 세전 연봉이나 실수령액과
        한 달 카드값만 넣으면 그 경계를 눈금으로 보여드립니다.
      </p>

      <section className="panel">
        <h2 className="panel-title">세 가지만 넣으면 됩니다</h2>

        <div className="field">
          <div className="field-head">
            <label className="field-label" htmlFor="salary">
              {salaryLabel}
              <button
                type="button"
                className="help-btn"
                onClick={() => setPayHelpOpen(true)}
                aria-label="세전과 세후의 차이 알아보기"
              >
                ?
              </button>
            </label>
          </div>
          <div className="seg" role="group" aria-label="세전 또는 세후">
            <button type="button" aria-pressed={payKind === 'pre-tax'} onClick={() => switchKind('pre-tax')}>
              세전
            </button>
            <button type="button" aria-pressed={payKind === 'post-tax'} onClick={() => switchKind('post-tax')}>
              세후
            </button>
          </div>
          <div className="seg seg-sub" role="group" aria-label="연봉 또는 월급">
            <button type="button" aria-pressed={period === 'year'} onClick={() => switchPeriod('year')}>
              연봉
            </button>
            <button type="button" aria-pressed={period === 'month'} onClick={() => switchPeriod('month')}>
              월급
            </button>
          </div>
          <div className="salary-input">
            <input
              id="salary"
              type="number"
              inputMode="numeric"
              min={0}
              step={period === 'month' ? 10 : 100}
              value={salaryManwon}
              onChange={(e) => setSalaryManwon(Math.max(0, Number(e.target.value) || 0))}
            />
            <span>{salaryUnit}</span>
          </div>
          <button type="button" className="netpay" onClick={() => setPayHelpOpen(true)}>
            {payKind === 'pre-tax' ? (
              <>
                <span className="netpay-label">매달 손에 쥐는 돈</span>
                <span className="netpay-value">약 {manwon(pay.netMonth)}만원</span>
              </>
            ) : (
              <>
                <span className="netpay-label">세전 연봉</span>
                <span className="netpay-value">약 {manwon(pay.grossTotal)}만원</span>
              </>
            )}
            <span className="netpay-more">계산 내역 보기</span>
          </button>
          <p className="field-note">
            {payKind === 'pre-tax'
              ? period === 'month'
                ? '회사가 주기로 한 세전 월급입니다. 12를 곱해 연봉으로 보고, 식대를 빼 총급여를 추정합니다.'
                : '회사가 주기로 한 세전 연봉입니다. 식대처럼 세금이 안 붙는 수당이 포함되어 있다고 보고, 카드 공제 기준인 총급여를 추정합니다.'
              : period === 'month'
                ? '통장에 실제로 들어오는 월급입니다. 4대보험과 세금을 거꾸로 더해 세전 연봉과 총급여를 추정합니다.'
                : '통장에 실제로 들어오는 연봉입니다. 4대보험과 세금을 거꾸로 더해 세전 연봉과 총급여를 추정합니다.'}
          </p>
        </div>

        <SpendField
          id="credit"
          label="2. 신용카드로 한 달에 얼마나 쓰나요"
          value={creditMonthly}
          onChange={setCreditMonthly}
          note="이번 달 하나가 아니라 보통 달의 평균입니다. 금액을 누르면 직접 입력할 수 있습니다. 통신비, 보험료, 공과금, 아파트 관리비는 빼고 넣으세요. 이 항목들은 카드로 냈어도 공제 대상이 아닙니다."
        />

        <SpendField
          id="check"
          label="3. 체크카드와 현금은 한 달에 얼마나 쓰나요"
          value={checkMonthly}
          onChange={setCheckMonthly}
          note="현금은 현금영수증을 받은 것만 셉니다. 금액을 누르면 직접 입력할 수 있습니다. 계좌이체와 간편결제도 체크카드에서 빠져나갔다면 여기에 넣으세요."
        />

        <div className="field">
          <div className="field-head">
            <span className="field-label">자녀가 있나요 (선택)</span>
          </div>
          <div className="seg">
            {[0, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={children === n}
                onClick={() => setChildren(n)}
              >
                {n === 2 ? '2명 이상' : `${n}명`}
              </button>
            ))}
          </div>
          <p className="field-note">자녀가 있으면 공제 한도가 올라갑니다.</p>
        </div>

        <OptimalMix mix={mix} refund={mixRefund} applied={optimalOpen} onFind={applyOptimal} />
      </section>

      <details className="lookup">
        <summary>내 카드값이 얼마인지 모르겠어요</summary>
        <p>
          정확한 숫자는{' '}
          <button type="button" className="link-btn" onClick={() => setHometaxOpen(true)}>
            국세청 홈택스 연말정산 미리보기
          </button>
          에 있습니다. 1월부터 9월까지 실제 사용액을 결제 수단별로 보여줍니다.
        </p>
        <p>
          지금 당장은 카드사 앱의 이번 달 결제 예정 금액을 봐도 됩니다. 대략만 맞아도 어느 구간에
          있는지는 나옵니다. 이 계산기는 정확한 환급액을 맞추는 게 아니라 방향을 알려주는
          도구입니다.
        </p>
      </details>

      <p className="gauge-caption">
        연간 카드값 <b>{manwon(credit + check).toString()}만원</b> 기준
      </p>

      <Gauge
        threshold={threshold}
        checkFull={threshold + limit / CHECK_RATE}
        creditFull={threshold + limit / CREDIT_RATE}
        spent={credit + check}
      />

      <StageGuide
        stage={result.stage}
        threshold={threshold}
        checkFull={threshold + limit / CHECK_RATE}
        creditFull={threshold + limit / CREDIT_RATE}
        spent={credit + check}
      />

      <Verdict
        stage={result.stage}
        gain={gain}
        gainRefund={gainRefund}
        threshold={threshold}
        spent={credit + check}
        limit={limit}
        creditYear={credit}
      />

      <dl className="numbers">
        <div>
          <dt>세금을 매기는 소득에서 빼주는 금액</dt>
          <dd>{manwon(result.deduction)}만원</dd>
          <p>소득공제액</p>
        </div>
        <div>
          <dt>그래서 실제로 돌려받는 돈</dt>
          <dd>약 {manwon(refund)}만원</dd>
          <p>1인 가구 기준 추정</p>
        </div>
      </dl>

      <p className="numbers-note">
        소득공제는 세금을 그만큼 깎아주는 게 아니라, 세금을 매기는 기준 소득을 줄여주는
        것입니다. 그래서 돌려받는 돈은 공제액보다 훨씬 작습니다. 줄어든 소득에 내 세율을 곱한
        만큼만 돌아옵니다.
      </p>

      <details>
        <summary>왜 이렇게 나오나요</summary>
        <p>
          카드 소득공제는 총급여의 25%를 넘게 쓴 금액부터 시작합니다. 지금 기준으로는{' '}
          {manwon(threshold)}만원까지는 얼마를 쓰든 공제가 0원입니다.
        </p>
        <p>
          그 위로는 결제 수단에 따라 반영 비율이 다릅니다. 신용카드는 15%, 체크카드와 현금영수증은
          30%입니다. 그래서 같은 금액을 써도 체크카드 쪽이 두 배로 잡힙니다.
        </p>
        <p>
          공제에는 한도가 있어서 {manwon(limit)}만원을 채우면 더 써도 늘지 않습니다. 한도를 채우는
          데 필요한 금액이 체크카드는 {manwon(limit / CHECK_RATE)}만원, 신용카드는{' '}
          {manwon(limit / CREDIT_RATE)}만원인 이유가 이 비율 차이입니다.
        </p>
        <p>
          하나 더. 문턱 아래 구간에서는 신용카드로 쓰든 체크카드로 쓰든 공제액이 똑같습니다. 그
          구간에서 신용카드를 권하는 이유는 세금이 아니라 카드 자체의 할인과 적립 때문입니다.
        </p>
      </details>

      <details>
        <summary>계산에 넣지 않은 것</summary>
        <ul>
          <li>공과금, 통신비, 보험료, 세금, 해외 결제, 상품권은 애초에 사용액에 들어가지 않습니다.</li>
          <li>전통시장, 대중교통, 도서·공연·영화, 체육시설은 별도 한도가 더 있습니다.</li>
          <li>배우자와 부양가족의 카드 사용액은 한 사람에게 몰아서 계산할 수 있습니다.</li>
          <li>돌려받는 돈은 1인 가구를 가정한 추정치입니다. 부양가족과 다른 공제에 따라 달라집니다.</li>
        </ul>
      </details>

      <footer>
        <p>
          조세특례제한법 제126조의2 기준. 이 계산기는 참고용이고, 실제 정산 금액은{' '}
          <button type="button" className="link-btn" onClick={() => setHometaxOpen(true)}>
            국세청 홈택스 연말정산 미리보기
          </button>
          에서 확인하세요.
        </p>
      </footer>

      <HometaxModal open={hometaxOpen} onClose={() => setHometaxOpen(false)} />
      <PayHelpModal
        open={payHelpOpen}
        onClose={() => setPayHelpOpen(false)}
        grossSalary={grossSalary}
        pay={pay}
        payKind={payKind}
        netPeriod={period}
      />
    </main>
  );
}

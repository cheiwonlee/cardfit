import { manwon } from '../lib/format';

interface Props {
  /** 문턱 (총급여 25%) */
  threshold: number;
  /** 체크카드로만 채웠을 때 한도가 차는 지점 */
  checkFull: number;
  /** 신용카드로만 채웠을 때 한도가 차는 지점 */
  creditFull: number;
  /** 내 연간 총 사용액 */
  spent: number;
}

/**
 * 소비 구간 눈금자.
 *
 * 한도가 차는 지점을 두 개 표시하는 게 핵심이다. 같은 한도인데 체크카드는
 * 신용카드의 절반만 써도 도달한다는 사실이 두 눈금의 간격으로 드러난다.
 */
export default function Gauge({ threshold, checkFull, creditFull, spent }: Props) {
  const max = Math.max(creditFull, spent) * 1.15 || 1;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <div className="gauge">
      <div
        className="gauge-track"
        role="img"
        aria-label={`연간 ${manwon(spent)}만원 사용. 공제 시작 ${manwon(threshold)}만원, 체크카드 기준 한도 도달 ${manwon(checkFull)}만원.`}
      >
        <div className="gauge-zone zone-dead" style={{ width: pct(threshold) }} />
        <div className="gauge-zone zone-good" style={{ width: pct(checkFull - threshold) }} />
        <div className="gauge-zone zone-over" style={{ flex: 1 }} />
        <div className="gauge-marker" style={{ left: pct(spent) }} />
      </div>

      <div className="gauge-ticks" aria-hidden="true">
        <span className="tick tick-edge-start" style={{ left: 0 }}>
          <b>0</b>
        </span>
        <span className="tick" style={{ left: pct(threshold) }}>
          <b>{manwon(threshold)}</b>
          공제 시작
        </span>
        <span className="tick" style={{ left: pct(checkFull) }}>
          <b>{manwon(checkFull)}</b>
          체크로 한도
        </span>
        <span className="tick tick-edge-end" style={{ left: pct(creditFull) }}>
          <b>{manwon(creditFull)}</b>
          신용으로 한도
        </span>
      </div>
    </div>
  );
}

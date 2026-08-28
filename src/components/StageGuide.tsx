import { manwon } from '../lib/format';

interface Props {
  stage: 'A' | 'B' | 'C';
  threshold: number;
  checkFull: number;
  creditFull: number;
  spent: number;
}

const STEPS = [
  {
    id: 'A' as const,
    step: '1단계',
    name: '공제 시작 전',
    hint: '신용이든 체크든 돌려받는 돈은 0원입니다. 할인과 적립이 좋은 카드를 쓰세요.',
  },
  {
    id: 'B' as const,
    step: '2단계',
    name: '공제가 느는 구간',
    hint: '문턱을 넘긴 금액만 공제됩니다. 체크·현금이 신용의 두 배로 잡힙니다.',
  },
  {
    id: 'C' as const,
    step: '3단계',
    name: '한도 소진',
    hint: '공제 한도를 채운 뒤입니다. 더 써도 돌려받는 돈은 그대로입니다.',
  },
];

/**
 * 세 구간을 세로로 나란히 보여 준다.
 * 가로 눈금은 모바일에서 숫자가 겹치기 쉬워, 단계·연·월을 카드로 읽게 한다.
 */
export default function StageGuide({ stage, threshold, checkFull, creditFull, spent }: Props) {
  return (
    <ol className="stages">
      {STEPS.map((item) => {
        const now = stage === item.id;
        return (
          <li key={item.id} className={now ? 'is-now' : undefined}>
            <p className="stages-head">
              <span>{item.step}</span>
              {now && <b>지금 여기 · 연 {manwon(spent)}만원</b>}
            </p>
            <p className="stages-name">{item.name}</p>
            <p className="stages-range">{rangeOf(item.id, threshold, checkFull, creditFull)}</p>
            <p className="stages-hint">{item.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}

function rangeOf(
  id: 'A' | 'B' | 'C',
  threshold: number,
  checkFull: number,
  creditFull: number,
): string {
  if (id === 'A') {
    return `연 0~${manwon(threshold)}만원 · 월 0~${manwon(threshold / 12)}만원`;
  }
  if (id === 'B') {
    return `연 ${manwon(threshold)}만원부터 · 체크로 한도 ${manwon(checkFull)}만원 · 신용으로 한도 ${manwon(creditFull)}만원`;
  }
  return `체크 기준 연 ${manwon(checkFull)}만원 이상 · 신용 기준 연 ${manwon(creditFull)}만원 이상`;
}

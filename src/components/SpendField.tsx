import { useEffect, useRef, useState } from 'react';

const SLIDER_CAP = 500;

interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  note: string;
}

/**
 * 월 사용액. 슬라이더와, 금액을 눌러 켜는 숫자 입력을 같이 둔다.
 */
export default function SpendField({ id, label, value, onChange, note }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  const sliderMax = Math.max(SLIDER_CAP, value);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const commit = () => {
    const n = Math.max(0, Math.floor(Number(String(draft).replace(/,/g, '')) || 0));
    onChange(n);
    setEditing(false);
  };

  return (
    <div className="field">
      <div className="field-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      </div>
      <input
        id={editing ? undefined : id}
        type="range"
        min={0}
        max={sliderMax}
        step={5}
        value={Math.min(value, sliderMax)}
        onChange={(e) => {
          setEditing(false);
          onChange(Number(e.target.value));
        }}
      />
      {editing ? (
        <div className="spend-edit">
          <span>월</span>
          <input
            ref={ref}
            id={id}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={draft}
            aria-label={`${label} 직접 입력, 만원 단위`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                setDraft(String(value));
                setEditing(false);
              }
            }}
          />
          <span>만원</span>
        </div>
      ) : (
        <p className="field-readout">
          <button
            type="button"
            className="spend-amount"
            onClick={() => setEditing(true)}
            title="눌러서 직접 입력"
          >
            월 {value.toLocaleString('ko-KR')}만원
          </button>
          <span>연 {(value * 12).toLocaleString('ko-KR')}만원</span>
        </p>
      )}
      <p className="field-note">{note}</p>
    </div>
  );
}

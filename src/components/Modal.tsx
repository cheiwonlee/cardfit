import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 제목 위에 붙는 작은 라벨 */
  eyebrow?: string;
  title: string;
  children: ReactNode;
  /** 하단 영역. 없으면 닫기 버튼만 나온다. */
  footer?: ReactNode;
}

/**
 * 팝업 껍데기.
 *
 * 네이티브 <dialog>의 showModal()을 쓴다. 닫힌 dialog 에는 display:none 이
 * 유지돼야 한다. flex 를 기본값으로 두면 닫혀도 화면에 남아 버튼이 안 눌린다.
 */
export default function Modal({ open, onClose, eyebrow, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `modal-${title.replace(/\s/g, '')}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <div className="modal-head">
          {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-foot">
          {footer}
          <button type="button" className="btn-quiet" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}

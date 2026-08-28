import Modal from './Modal';

const HOMETAX_URL = 'https://www.hometax.go.kr';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** 홈택스 '연말정산 미리보기' 안내 팝업 */
export default function HometaxModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="국세청 홈택스"
      title="연말정산 미리보기"
      footer={
        <a className="btn-primary" href={HOMETAX_URL} target="_blank" rel="noreferrer noopener">
          홈택스 바로가기
        </a>
      }
    >
      <p>
        1~9월 카드 사용액과 전년도 신고 내역을 바탕으로 올해 예상 세액과 환급액을 미리 계산해 주는
        서비스입니다. 보통 매년 11월 초에 열리고, 남은 기간의 소비와 저축 계획을 조정하는 데
        씁니다.
      </p>

      <h3>어디로 들어가나요</h3>
      <p className="modal-path">
        홈택스 로그인 → 장려금·연말정산·기부금 → 편리한 연말정산 → 연말정산 미리보기
      </p>

      <h3>순서</h3>
      <ol className="modal-steps">
        <li>
          <b>신용카드 소득공제액 계산</b>
          1~9월 실제 카드 사용액을 확인하고, 10~12월에 쓸 예상 금액을 넣습니다. 이 화면의 숫자를
          여기 계산기에 그대로 옮기면 됩니다.
        </li>
        <li>
          <b>신고내역 수정 및 항목별 입력</b>
          작년 신고 내역을 바탕으로 올해 바뀐 총급여, 의료비, 교육비, 연금계좌 납입액 등을 수정해
          넣습니다.
        </li>
        <li>
          <b>예상세액 계산</b>
          최종 예상 세액과 환급 또는 추가 납부 예상액을 확인합니다.
        </li>
      </ol>

      <p className="modal-tip">
        연금저축이나 IRP처럼 세액공제를 받는 상품은 12월 31일까지 넣어야 올해 정산에 반영됩니다.
      </p>
    </Modal>
  );
}

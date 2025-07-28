import React, { useState } from 'react';
import Modal from './Modal';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose, onAgree }) => {
  const [isAgreed, setIsAgreed] = useState(false);

  const handleAgreeClick = () => {
    if (isAgreed) {
      onAgree();
    }
  };

  const handleClose = () => {
    setIsAgreed(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="consent-modal">
      <div className="consent-header">
        <h2>HTP 심리검사 면책 및 개인정보 활용 동의서</h2>
      </div>
      
      <div className="consent-content">
        <div className="consent-section">
          <h3>1. 검사의 목적 및 활용</h3>
          <p>
            본 HTP 심리검사는 내담자의 성격 특성, 정서 상태, 내면의 욕구 및 갈등을 비언어적인 방식으로 이해하기 위한 목적으로 시행됩니다. 
            검사 결과는 전문 상담가와의 상담 과정에서 내담자의 자기 이해를 돕는 참고 자료로만 활용되며, 어떠한 의학적 진단이나 법적 효력을 갖지 않습니다.
          </p>
        </div>

        <div className="consent-section">
          <h3>2. 수집하는 개인정보</h3>
          <div className="info-lists">
            <div className="info-item">
              <strong>필수 항목:</strong> 이름, 생년월일, 성별, 검사 그림 이미지
            </div>
            <div className="info-item">
              <strong>선택 항목:</strong> 연락처, 이메일 주소 (결과 해석 및 추가 상담 안내용)
            </div>
          </div>
        </div>

        <div className="consent-section">
          <h3>3. 개인정보 보유 및 이용 기간</h3>
          <p>
            수집된 개인정보는 상담 서비스가 진행되는 기간 동안 보유 및 이용되며, 서비스 종결 또는 정보주체의 파기 요청 시 지체 없이 파기됩니다. 
            단, 관련 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보관할 수 있습니다.
          </p>
        </div>

        <div className="consent-section">
          <h3>4. 동의 거부 권리 및 불이익</h3>
          <p>
            귀하는 위 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 
            단, 필수 항목에 대한 동의를 거부하실 경우, 검사 진행 및 결과 해석이 불가능하여 관련 서비스를 제공받으실 수 없습니다.
          </p>
        </div>

        <div className="consent-section">
          <h3>5. 면책 조항</h3>
          <p>
            본 검사는 내담자의 주관적인 그림 표현을 바탕으로 한 심리적 해석을 제공합니다. 
            이는 확정적인 진단이 아니며, 상담의 참고 자료로 활용될 뿐입니다. 
            검사 결과의 해석이나 이를 기반으로 한 어떠한 결정에 대해서도 본 기관은 법적 책임을 지지 않습니다.
          </p>
        </div>
      </div>

      <div className="consent-footer">
        <div className="consent-checkbox">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="consent-checkbox-input"
            />
            <span className="checkmark"></span>
            위 모든 내용을 충분히 이해하였으며, HTP 심리검사 시행 및 개인정보 활용에 동의합니다.
          </label>
        </div>
        
        <div className="consent-buttons">
          <button className="consent-btn cancel" onClick={handleClose}>
            취소
          </button>
          <button 
            className={`consent-btn agree ${isAgreed ? 'enabled' : 'disabled'}`}
            onClick={handleAgreeClick}
            disabled={!isAgreed}
          >
            동의하고 시작하기
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConsentModal;
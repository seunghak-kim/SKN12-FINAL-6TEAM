"use client"

import { Button } from "../../components/ui/button"
import React, { useState } from 'react';
import Modal from './Modal';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose, onAgree }) => {
  const [isAgreed, setIsAgreed] = useState(false);

  const handleClose = () => {
    setIsAgreed(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg w-full max-h-[85vh] h-auto">
      <div className="px-4 sm:px-5 md:px-6 lg:px-7 py-4" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800 text-left">HTP 심리검사 면책 및 개인정보 활용 동의서</h2>
        </div>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed max-h-[50vh] overflow-y-auto text-left">
          <div>
            <h3 className="font-bold text-blue-600 mb-2">1. 검사의 목적 및 활용</h3>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              본 HTP 심리검사는 내담자의 성격 특성, 정서 상태, 내면의 욕구 및 갈등을 
              비언어적인 방식으로 이해하기 위한 목적으로 시행됩니다.
            </p>
            <p style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              검사 결과는 전문 상담가와의 상담 과정에서 내담자의 자기 이해를 돕는 <strong>참고 자료로만 활용되며, 어떠한 의학적 진단이나 법적 효력을 갖지 않습니다.</strong>
            </p>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-2">2. 수집하는 개인정보</h3>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              <strong>필수 항목:</strong> 이름, 생년월일, 성별, 검사 그림 이미지
            </p>
            <p style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              <strong>선택 항목:</strong> 연락처, 이메일 주소 (결과 해석 및 추가 상담 내용)
            </p>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-2">3. 개인정보 보유 및 이용 기간</h3>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              수집된 개인정보는 상담 서비스가 진행되는 기간 동안 보유 및 이용되며, <strong>회원 탈퇴 시 아래의 모든 개인정보가 즉시 삭제됩니다.</strong>
            </p>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              삭제 대상: 채팅 기록 / 그림 검사 결과 / 개인 프로필 정보 / 페르소나 매칭 데이터
            </p>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              <strong className="text-red-600">또한, 삭제된 데이터는 복구할 수 없습니다.</strong>
            </p>
            <p style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              단, 관련 법령에 따라 개인정보를 보존할 필요가 있는 경우
              해당 법령에서 정한 기간 동안 보관할 수 있습니다.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-2">4. 동의 거부 권리 및 불이익</h3>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              귀하는 위 개인정보 수집 및 이용에 대한 <strong>동의를 거부할 권리가 있습니다.</strong>
            </p>
            <p style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              단, <strong>필수 항목에 대한 동의를 거부하실 경우, 검사 진행 및 결과 해석이 
              불가능하여 관련 서비스를 제공받으실 수 없습니다.</strong>
            </p>
          </div>

          <div>
            <h3 className="font-bold text-blue-600 mb-2">5. 면책 조항</h3>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              본 검사는 내담자의 주관적인 그림을 바탕으로 한 심리적 해석을 제공합니다.
            </p>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              본 검사는 <strong>HTP 기반 간이검사</strong>로써, <strong>확정적인 진단이 아니며</strong> 상담의 참고 자료로 활용될 뿐입니다.
            </p>
            <p className="mb-2" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              또한 <strong>LLM 기반</strong>으로 결과가 생성되기 때문에, <strong>같은 그림이라도 답변이 다를 수 있습니다.</strong>
            </p>
            <p style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              <strong>검사 결과의 해석이나 이를 기반으로 한 어떠한 결정에 대해서도 
              본 서비스는 법적 책임을 지지 않습니다.</strong>
            </p>
          </div>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3 mb-2">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="agreement" className="text-gray-800 cursor-pointer text-left" style={{wordBreak: 'keep-all', overflowWrap: 'break-word'}}>
              <p className="font-bold">
                위 모든 내용을 충분히 이해하였으며, 
                HTP 심리검사 시행 및 개인정보 활용에 동의합니다.
              </p>
            </label>
          </div>
        </div>

        <div className="flex space-x-4 mt-4">
          <Button onClick={onClose} variant="outline" className="flex-1 py-3 rounded-full bg-transparent">
            취소하기
          </Button>
          <Button
            onClick={onAgree}
            disabled={!isAgreed}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-full"
          >
            동의하고 시작하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConsentModal;

import React from 'react';
import { Button } from '../ui/button';
import Modal from './Modal';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">회원탈퇴</h2>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-400/30">
            <span className="text-4xl">😢</span>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-4">정말 탈퇴하실건가요?</h3>

          <div className="text-gray-600 text-sm space-y-2 mb-6">
            <p>지금 탈퇴하시면 아래 정보가 즉시 삭제됩니다.</p>
            <ul className="text-left space-y-1 mt-4">
              <li>• 모든 채팅 기록</li>
              <li>• 그림 검사 결과</li>
              <li>• 개인 프로필 정보</li>
              <li>• 페르소나 매칭 데이터</li>
            </ul>
            <p className="text-red-500 font-medium mt-4">모든 데이터가 완전히 삭제되며 복구할 수 없습니다.</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-slate-600/50 to-slate-700/50 hover:from-slate-600/70 hover:to-slate-700/70 text-white py-3 rounded-full font-medium border border-white/10"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-full font-medium shadow-lg"
          >
            탈퇴하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAccountModal;
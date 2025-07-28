import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Check } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onComplete?: () => void;
}

interface Step {
  id: number;
  name: string;
  completed: boolean;
  active: boolean;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onComplete }) => {
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, name: '이미지 처리', completed: false, active: false },
    { id: 2, name: '패턴 분석', completed: false, active: false },
    { id: 3, name: '결과 생성', completed: false, active: false }
  ]);

  const [currentMessage, setCurrentMessage] = useState('분석을 시작합니다...');

  useEffect(() => {
    if (!isOpen) {
      // 모달이 닫혔을 때 초기화
      setSteps([
        { id: 1, name: '이미지 처리', completed: false, active: false },
        { id: 2, name: '패턴 분석', completed: false, active: false },
        { id: 3, name: '결과 생성', completed: false, active: false }
      ]);
      setCurrentMessage('분석을 시작합니다...');
      return;
    }

    // 단계별 진행 시뮬레이션
    const progressSteps = async () => {
      // 1단계: 이미지 처리
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, active: true } : step
      ));
      setCurrentMessage('이미지를 처리하고 있습니다...');
      
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      setSteps(prev => prev.map(step => 
        step.id === 1 ? { ...step, completed: true, active: false } : step
      ));

      // 2단계: 패턴 분석
      setSteps(prev => prev.map(step => 
        step.id === 2 ? { ...step, active: true } : step
      ));
      setCurrentMessage('패턴을 분석하고 있습니다...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setSteps(prev => prev.map(step => 
        step.id === 2 ? { ...step, completed: true, active: false } : step
      ));

      // 3단계: 결과 생성
      setSteps(prev => prev.map(step => 
        step.id === 3 ? { ...step, active: true } : step
      ));
      setCurrentMessage('결과를 생성하고 있습니다...');
      
      await new Promise(resolve => setTimeout(resolve, 4500));
      
      setSteps(prev => prev.map(step => 
        step.id === 3 ? { ...step, completed: true, active: false } : step
      ));
      setCurrentMessage('분석이 완료되었습니다!');
      
      // 완료 메시지를 보여주고 외부에서 모달을 닫을 때까지 대기
      // onComplete는 외부에서 실제 분석 완료 시 호출됨
    };

    progressSteps();
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} className="analysis-loading-modal">
      <div className="analysis-loading-content">
        <div className="analysis-spinner">
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
        </div>
        
        <h2>그림을 분석하고 있습니다</h2>
        <p>AI가 당신의 그림을 분석하여<br />심리 상태를 파악하고 있습니다</p>
        
        <div className="analysis-steps">
          {steps.map((step) => (
            <div key={step.id} className="step-indicator">
              <div className={`step-dot ${step.completed ? 'completed' : step.active ? 'active' : ''}`}>
                {step.completed && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className={step.completed ? 'text-green-600' : step.active ? 'text-blue-600' : 'text-gray-500'}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
        
        <div className="loading-message">
          {currentMessage}
        </div>
      </div>
    </Modal>
  );
};

export default AnalysisModal;
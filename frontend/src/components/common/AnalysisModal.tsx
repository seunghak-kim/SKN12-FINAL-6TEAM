import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Check } from 'lucide-react';
import { PipelineStatusResponse } from '../../types';

interface AnalysisModalProps {
  isOpen: boolean;
  analysisStatus?: PipelineStatusResponse | null;
  onComplete?: () => void;
  onClose?: () => void;
}

interface Step {
  id: number;
  name: string;
  completed: boolean;
  active: boolean;
}

interface Joke {
  question: string;
  answer: string;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, analysisStatus, onComplete, onClose }) => {
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, name: '이미지 처리', completed: false, active: false },
    { id: 2, name: '패턴 분석', completed: false, active: false },
    { id: 3, name: '결과 생성', completed: false, active: false }
  ]);

  const [currentMessage, setCurrentMessage] = useState('분석을 시작합니다...');
  const [randomJoke, setRandomJoke] = useState<Joke | null>(null);

  // 랜덤 퀴즈 로드
  useEffect(() => {
    if (isOpen) {
      fetch('/jokes.json')
        .then(response => response.json())
        .then(jokes => {
          if (jokes && jokes.length > 0) {
            const randomIndex = Math.floor(Math.random() * jokes.length);
            setRandomJoke(jokes[randomIndex]);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // 모달이 닫혔을 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setSteps([
        { id: 1, name: '이미지 처리', completed: false, active: false },
        { id: 2, name: '패턴 분석', completed: false, active: false },
        { id: 3, name: '결과 생성', completed: false, active: false }
      ]);
      setCurrentMessage('분석을 시작합니다...');
      setRandomJoke(null);
    }
  }, [isOpen]);


  // 실제 분석 상태에 따른 진행 상황 업데이트
  useEffect(() => {
    if (!isOpen) return;

    if (!analysisStatus) {
      // analysisStatus가 없을 때는 시작 메시지 표시
      setCurrentMessage('분석을 시작합니다...');
      return;
    }

    const { status, message, current_step } = analysisStatus;

    // 메시지는 퀴즈로 덮어씀 (기존 message 무시)
    // 퀴즈 기반 메시지 설정
      switch (status) {
        case 'pending':
          setCurrentMessage('분석을 시작합니다...');
          break;
        case 'processing':
          if (typeof current_step === 'number') {
            switch (current_step) {
              case 1:
                setCurrentMessage('분석을 시작합니다...');
                break;
              case 2:
                setCurrentMessage(randomJoke ? randomJoke.question : '패턴을 분석하고 있습니다...');
                break;
              case 3:
                setCurrentMessage(randomJoke ? '정답: ' + randomJoke.answer : '결과를 생성하고 있습니다...');
                break;
              default:
                setCurrentMessage('분석을 진행하고 있습니다...');
            }
          } else {
            setCurrentMessage('분석을 진행하고 있습니다...');
          }
          break;
        case 'completed':
          if (randomJoke) {
            setCurrentMessage('정답: ' + randomJoke.answer);
          } else {
          setCurrentMessage('분석이 완료되었습니다!');
          }
          break;
        case 'failed':
          setCurrentMessage('분석 중 오류가 발생했습니다.');
          break;
        default:
          setCurrentMessage('분석을 진행하고 있습니다...');
      }

    // 단계별 진행 상황 업데이트
    if (status === 'processing' && typeof current_step === 'number') {
      // current_step이 숫자인 경우 (1, 2, 3 등)
      setSteps(prev => prev.map(step => {
        if (step.id === current_step) {
          return { ...step, active: true, completed: false };
        } else if (step.id < current_step) {
          return { ...step, completed: true, active: false };
        } else {
          return { ...step, completed: false, active: false };
        }
      }));
    } else if (status === 'completed') {
      // 모든 단계 완료
      setSteps(prev => prev.map(step => ({ ...step, completed: true, active: false })));
    }
  }, [analysisStatus, isOpen, onComplete, randomJoke]);

  return (
    <Modal isOpen={isOpen} onClose={onClose || (() => {})} className="relative">
      <div className="p-8 text-center">
        {/* 스피너 또는 완료 체크 */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            {analysisStatus?.status === 'completed' ? (
              // 완료시 체크 표시
              <div className="w-20 h-20 flex items-center justify-center">
                <Check className="w-16 h-16 text-purple-600" />
              </div>
            ) : (
              // 진행중일 때 스피너
              <>
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
              </>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {analysisStatus?.status === 'completed' ? '분석이 완료되었습니다!' : '그림을 분석하고 있습니다'}
          </h2>
          <p className="text-gray-600 mb-6">
            {analysisStatus?.status === 'completed' 
              ? <>AI 분석을 통해<br />당신의 심리 상태를 파악했습니다</>
              : <>AI가 당신의 그림을 분석하여<br />심리 상태를 파악하고 있습니다</>
            }
          </p>
        </div>
        
        {/* 단계별 진행 상황 */}
        <div className="space-y-4 mb-6 flex flex-col items-center">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3 w-40">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 flex-shrink-0 ${
                step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.active 
                    ? 'bg-purple-600 text-white animate-pulse' 
                    : 'bg-gray-300 text-gray-600'
              }`} style={{ animationDuration: step.active ? '3s' : undefined }}>
                {step.completed ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className={`font-medium transition-colors duration-300 text-left flex-1 whitespace-nowrap ${
                step.completed ? 'text-green-600' : step.active ? 'text-purple-600' : 'text-gray-500'
              }`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
        
        {/* 현재 상태 메시지 */}
        <div className="text-purple-600 font-medium bg-purple-50 py-3 px-4 rounded-lg">
          {currentMessage}
        </div>
        
        {/* 결과 보러가기 버튼 (완료시에만 표시) */}
        {analysisStatus?.status === 'completed' && (
          <div className="mt-6">
            <button
              onClick={() => {
                if (onComplete) {
                  onComplete();
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              결과 보러가기
            </button>
          </div>
        )}
        
        {/* 안내 메시지 */}
        <div className="text-xs text-gray-400 mt-4">
          {analysisStatus?.status === 'completed' 
            ? '🎉 분석이 완료되었습니다! 위 버튼을 눌러 결과를 확인하세요.'
            : '💡 그림 분석은 1분 정도 소요되며, 분석이 완료되면 버튼이 나타납니다'
          }
        </div>
      </div>
    </Modal>
  );
};
export default AnalysisModal;
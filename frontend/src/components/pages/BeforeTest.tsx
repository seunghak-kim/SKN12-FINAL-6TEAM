import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { FileImage, MessageCircle, ArrowRight } from 'lucide-react';

interface BeforeTestProps {
  onNavigate?: (screen: string) => void;
}

const BeforeTest: React.FC<BeforeTestProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleGoToTest = () => {
    if (onNavigate) {
      onNavigate('test');
    } else {
      navigate('/test-instruction');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F103F] via-[#1a1b4a] via-[#2a2b5a] to-[#3a3b6a] relative overflow-hidden">
      <Navigation activeTab="chat" onNavigate={onNavigate} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* 헤더 */}
          <div className="mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              페르소나 챗봇과 대화하기
            </h1>
            <p className="text-xl text-white/80">
              개인 맞춤형 상담을 위해 먼저 그림 검사를 진행해주세요
            </p>
          </div>

          {/* 안내 카드 */}
          {/* <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <div className="flex justify-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-6">
              왜 그림 검사가 필요한가요?
            </h3></div>
            <div className="space-y-4 text-white/90 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p>그림을 통해 당신의 성격과 심리 상태를 분석합니다</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p>분석 결과를 바탕으로 당신에게 가장 적합한 페르소나 챗봇을 매칭해드립니다</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p>5가지로 유형화된 챗봇을 통해 개인 맞춤형 상담과 조언을 받을 수 있습니다</p>
              </div>
            </div>
          </div> */}


          {/* 프로세스 안내 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-white mb-6">검사 진행 과정</h3>
            <div className="flex items-center justify-center space-x-4 text-white/90">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <span className="font-semibold">1</span>
                </div>
                <p className="text-sm">그림 그리기</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/60" />
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <span className="font-semibold">2</span>
                </div>
                <p className="text-sm">LLM 기반 그림 분석</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/60" />
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <span className="font-semibold">3</span>
                </div>
                <p className="text-sm">페르소나 챗봇 매칭</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/60" />
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                  <span className="font-semibold">4</span>
                </div>
                <p className="text-sm">맞춤 멘탈케어 진행</p>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="space-y-4">
            <button
              onClick={handleGoToTest}
              className="w-full bg-gradient-to-r from-purple-500/60 to-pink-500/60 px-8 py-4 font-semibold hover:from-purple-500/30 hover:to-pink-500/30 text-white rounded-full text-lg border border-white/10"
            >
              <span>그림 검사 시작하기</span>
            </button>
            

          </div>
        </div>
      </div>
    </div>
  );
};

export default BeforeTest;
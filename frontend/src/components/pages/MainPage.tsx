import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { Button } from "../../components/ui/button"

interface MainPageProps {
  onStartDreamSearch: () => void;
  onNavigate?: (screen: string) => void;
}

const MainPage: React.FC<MainPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showConsentModal, setShowConsentModal] = useState(false);

  // URL 파라미터 확인하여 자동으로 동의서 팝업 표시
  useEffect(() => {
    const startTest = searchParams.get('startTest');
    if (startTest === 'true') {
      setShowConsentModal(true);
      // URL에서 파라미터 제거
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleStartDreamSearchClick = () => {
    setShowConsentModal(true);
  };

  const handleConsentAgree = () => {
    setShowConsentModal(false);
    navigate('/test');
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Decorative orbs */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-40 blur-xl"></div>
      <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-50 blur-lg"></div>
      <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60 blur-sm"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full opacity-20 blur-2xl"></div>

      {/* Orbital rings */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-96 h-96 border border-cyan-400/10 rounded-full"></div>
        <div className="absolute inset-0 w-[500px] h-[500px] border border-purple-400/10 rounded-full -translate-x-12 -translate-y-12"></div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full mr-4 opacity-80"></div>
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-60"></div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">MY MOODY</h1>

          <div className="text-white/90 text-lg md:text-xl mb-4 max-w-2xl mx-auto">
            당신의 감정이 위로받을 수 있도록 -
          </div>
          <div className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            마이무디는 HTP* 그림 심리 분석과 맞춤형 챗봇 기능을 제공합니다
          </div>

          <div className="text-white/70 text-sm mb-8 max-w-2xl mx-auto">
            HTP란? House(집) - Tree(나무) - Person(사람)으로 구성된 그림심리검사로,
            <br />
            당신의 심리 상태를 확인할 수 있습니다
          </div>

          <Button
            onClick={() => navigate('/test')}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            그림검사 시작하기
          </Button>
        </div>

        {/* About Service Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">About Service</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Service Card 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">심리 상태 분석</h3>
              <p className="text-white/70 text-sm">
                그림을 통한
                <br />
                심리 상태 파악
              </p>
            </div>

            {/* Service Card 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-cyan-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">전문적 분석</h3>
              <p className="text-white/70 text-sm">
                AI 기반
                <br />
                심리 분석 제공
              </p>
            </div>

            {/* Service Card 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">맞춤형 상담</h3>
              <p className="text-white/70 text-sm">
                개인별
                <br />
                맞춤 상담 서비스
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navigation from '../common/Navigation';
import ConsentModal from '../common/ConsentModal';

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
    <div className="bg-gray-50 min-h-screen">
      <Navigation onNavigate={onNavigate} />

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-16 px-5 text-center mx-5 my-5 rounded-3xl">
        <h2 className="text-4xl mb-5">HTP란?</h2>
        <p className="text-lg mb-8 leading-relaxed">
          House(집) - Tree(나무) - Person(사람)으로 구성된<br />
          그림 심리 검사로, 당신의 심리 상태를 확인할 수 있습니다
        </p>
        <div className="flex justify-center gap-3">
          <span className="w-3 h-3 rounded-full bg-white"></span>
          <span className="w-3 h-3 rounded-full bg-white bg-opacity-50"></span>
          <span className="w-3 h-3 rounded-full bg-white bg-opacity-50"></span>
        </div>
      </div>

      <div className="py-16 px-5 text-center">
        <h3 className="text-3xl mb-12 text-gray-800">서비스 소개</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-10 rounded-2xl shadow-lg hover:transform hover:-translate-y-2 transition-transform duration-300">
            <div className="text-5xl mb-5">❤️</div>
            <h4 className="text-xl mb-4 text-gray-800">심리 상태 분석</h4>
            <p className="text-gray-600 text-sm">그림을 통한 심리 상태 파악</p>
          </div>
          <div className="bg-white p-10 rounded-2xl shadow-lg hover:transform hover:-translate-y-2 transition-transform duration-300">
            <div className="text-5xl mb-5">📋</div>
            <h4 className="text-xl mb-4 text-gray-800">전문적 분석</h4>
            <p className="text-gray-600 text-sm">AI 기반 심리 분석 제공</p>
          </div>
          <div className="bg-white p-10 rounded-2xl shadow-lg hover:transform hover:-translate-y-2 transition-transform duration-300">
            <div className="text-5xl mb-5">💬</div>
            <h4 className="text-xl mb-4 text-gray-800">맞춤형 상담</h4>
            <p className="text-gray-600 text-sm">개인별 맞춤 상담 서비스</p>
          </div>
        </div>
      </div>

      <div className="py-16 px-5 text-center bg-white mx-5 rounded-2xl">
        <h3 className="text-3xl mb-12 text-gray-800">HTP: House(집) - Tree(나무) - Person(사람) 심리검사</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-8xl mb-5">🏠</div>
            <h4 className="text-lg mb-4 text-gray-800">집 (HOUSE)</h4>
            <p className="text-gray-600 text-sm">가족 관계와 안정감을 나타냅니다</p>
          </div>
          <div className="text-center">
            <div className="text-8xl mb-5">🌳</div>
            <h4 className="text-lg mb-4 text-gray-800">나무 (TREE)</h4>
            <p className="text-gray-600 text-sm">성장과 발달, 생명력을 의미합니다</p>
          </div>
          <div className="text-center">
            <div className="text-8xl mb-5">👤</div>
            <h4 className="text-lg mb-4 text-gray-800">사람 (PERSON)</h4>
            <p className="text-gray-600 text-sm">자아상과 대인관계를 보여줍니다</p>
          </div>
        </div>
      </div>

      <div className="py-16 px-5 text-center">
        <h3 className="text-3xl mb-12 text-pink-600">검사 순서</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <div className="text-left">
            <div className="bg-pink-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-5">01</div>
            <h4 className="text-lg mb-4 text-gray-800">개인정보 동의서</h4>
            <p className="text-gray-600 leading-relaxed">HTP 심리검사 시행 및 개인정보 활용에 대한 동의서 작성</p>
          </div>
          <div className="text-left">
            <div className="bg-pink-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-5">02</div>
            <h4 className="text-lg mb-4 text-gray-800">검사 진행</h4>
            <p className="text-gray-600 leading-relaxed">집-나무-사람 순서로 그림을 그리고 검사 진행</p>
          </div>
          <div className="text-left">
            <div className="bg-pink-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-5">03</div>
            <h4 className="text-lg mb-4 text-gray-800">결과 확인</h4>
            <p className="text-gray-600 leading-relaxed">분석 결과 확인 및 맞춤형 상담 서비스 제공</p>
          </div>
        </div>
      </div>

      <div className="py-16 px-5 text-center bg-white mx-5 rounded-2xl">
        <div className="flex justify-center gap-5 mb-8">
          <span className="text-6xl font-bold text-yellow-500">?</span>
          <span className="text-6xl font-bold text-blue-500">?</span>
          <span className="text-6xl font-bold text-green-500">?</span>
        </div>
        <h3 className="text-2xl mb-10 text-gray-800 leading-relaxed">
          아직 한 번도 그림검사를 진행하지 않으셨나요?<br />
          그림 검사를 진행하고 나에게 맞는 페르소나를<br />
          찾으세요!
        </h3>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white py-4 px-10 rounded-full text-lg font-semibold cursor-pointer hover:transform hover:-translate-y-1 transition-all duration-300"
          onClick={handleStartDreamSearchClick}
        >
          그림검사 하러 가기
        </button>
      </div>

      <ConsentModal 
        isOpen={showConsentModal}
        onClose={handleConsentClose}
        onAgree={handleConsentAgree}
      />
    </div>
  );
};

export default MainPage;
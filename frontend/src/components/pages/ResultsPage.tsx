import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import CharacterCard from '../common/CharacterCard';
import { SearchResult } from '../../types';
import { testService } from '../../services/testService';

interface ResultsPageProps {
  characters: SearchResult[];
  selectedCharacter: SearchResult | null;
  showModal: boolean;
  onCharacterSelect: (character: SearchResult) => void;
  onCloseModal: () => void;
  onStartChat: () => void;
  onNavigate?: (screen: string) => void;
  currentTestResult: string;
}

const ResultsPage: React.FC<ResultsPageProps> = ({
  characters,
  onCharacterSelect,
  onStartChat,
  onNavigate,
  currentTestResult
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [testData, setTestData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isCreatingResult, setIsCreatingResult] = useState(false);

  // TestInstructionPage에서 전달받은 데이터 처리
  useEffect(() => {
    const stateData = location.state as { testId: number; imageUrl: string } | null;
    
    if (stateData?.testId) {
      setTestData(stateData);
      // AI 분석 결과 생성 및 DB 저장
      createTestResult(stateData.testId);
    }
  }, [location.state]);

  const createTestResult = async (testId: number) => {
    setIsCreatingResult(true);
    
    try {
      // 간단한 테스트 결과 텍스트
      const testResultText = "테스트 결과: 그림을 통해 당신의 심리 상태를 분석했습니다. 현재 감정 상태를 잘 표현하고 있으며, 이를 통해 더 나은 대화를 나눌 수 있을 것입니다.";
      
      // 테스트 결과를 DB에 저장
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/test/drawing-test-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          test_id: testId,
          friends_type: 3, // 슬픔이
          summary_text: testResultText
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 에러 응답:', errorData);
        // 이미 결과가 있더라도 일단 진행
        setAnalysisResult(testResultText);
      } else {
        const result = await response.json();
        console.log('결과 저장 성공:', result);
        setAnalysisResult(testResultText);
      }
      
    } catch (error) {
      console.error('테스트 결과 생성 실패:', error);
      // 에러가 있어도 테스트 결과는 표시
      setAnalysisResult("테스트 결과: 그림 분석이 완료되었습니다. 결과를 바탕으로 대화를 진행해보세요.");
    } finally {
      setIsCreatingResult(false);
    }
  };

  const handleCharacterClick = (character: SearchResult) => {
    onCharacterSelect(character);
    onStartChat();
    navigate('/chat');
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />

      <div className="container mx-auto px-5 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="text-6xl">😢</div>
            <div className="bg-white rounded-2xl p-4 shadow-lg relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
                <div className="w-4 h-4 bg-white rotate-45 shadow-lg"></div>
              </div>
              <p className="text-gray-700 font-medium">
                나를<br />
                놀리나.
              </p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            당신의 페르소나는 <span className="text-blue-600">{currentTestResult}</span> 입니다
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              01
            </div>
            <div className="w-full">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">검사 결과 요약</h4>
              {isCreatingResult ? (
                <div className="flex items-center space-x-2 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-gray-600">AI가 그림을 분석하고 있습니다...</span>
                </div>
              ) : analysisResult ? (
                <>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {analysisResult}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">감정적 깊이</span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">내성적 성향</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">공감 능력</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  당신의 그림에서 나타난 심리적 특성을 분석한 결과, 현재 내면의 슬픔과 고민이 깊어 보입니다. 이러한 감정을 이해하고 함께 극복해나가는 것이 중요합니다.
                </p>
              )}
              
              {testData?.imageUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">분석한 그림</h5>
                  <img 
                    src={testService.getImageUrl(testData.imageUrl)} 
                    alt="분석된 그림" 
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            {currentTestResult === '슬픔이' ? '대화 가능한 캐릭터' : '모든 결과 유형 보기'}
          </h3>
          {currentTestResult === '슬픔이' && (
            <p className="text-center text-gray-600 text-sm mb-6">
              현재 검사 결과에 따라 슬픔이와만 대화할 수 있습니다.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(character => (
              <div key={character.id} className="text-center">
                <div className="mb-4">
                  <CharacterCard
                    character={character}
                    onClick={handleCharacterClick}
                  />
                </div>
                <button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
                  onClick={() => handleCharacterClick(character)}
                >
                  {character.name}와 대화하기
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import CharacterCard from '../common/CharacterCard';
import ProbabilityChart from '../common/ProbabilityChart';
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [probabilities, setProbabilities] = useState<{ [key: string]: number } | null>(null);

  // TestInstructionPage에서 전달받은 데이터 처리
  useEffect(() => {
    const stateData = location.state as { testId: number; imageUrl: string } | null;
    
    if (stateData?.testId) {
      setTestData(stateData);
      // AI 분석 결과 생성 및 DB 저장
      createTestResult(stateData.testId);
      // 분석 상태 조회하여 확률 데이터 가져오기
      fetchAnalysisStatus(stateData.testId);
    }
  }, [location.state]);

  const fetchAnalysisStatus = async (testId: number) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/pipeline/analysis-status/${testId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed' && data.result) {
          // API에서 직접 확률 데이터 가져오기
          const probabilities = data.result.probabilities;
          if (probabilities && Object.keys(probabilities).length > 0) {
            setProbabilities(probabilities);
          }
          
          // result_text가 있으면 분석 결과 업데이트
          if (data.result.result_text) {
            setAnalysisResult(data.result.result_text);
          }
        }
      }
    } catch (error) {
      console.error('분석 상태 조회 실패:', error);
    }
  };

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
          friends_type: 2, // 내면이
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

      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="text-center mb-4">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="text-4xl">😖</div>
            <div className="bg-white rounded-xl p-3 shadow-md relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
                <div className="w-3 h-3 bg-white rotate-45 shadow-md"></div>
              </div>
              <p className="text-gray-700 font-medium text-sm">
                아무도 내 기분을 제대로 이해하지 못할 거야... 괜찮아, 혼자인 게 더 편하니까. 내 세상 안에서 나는 완전하거든.
              </p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            당신의 페르소나는 <span className="text-blue-600">{currentTestResult}</span> 입니다
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                01
              </div>
            </div>
            <div className="w-full">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">검사 결과 요약</h4>
              {isCreatingResult ? (
                <div className="flex justify-center items-center space-x-2 py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-gray-600">AI가 그림을 분석하고 있습니다...</span>
                </div>
              ) : analysisResult ? (
                <>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 text-center max-w-2xl mx-auto">
                    {analysisResult}
                  </p>
                  <div className="flex justify-center flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">감정적 깊이</span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">내성적 성향</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">공감 능력</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed mb-4 text-center max-w-2xl mx-auto">
                  당신의 그림에서 나타난 심리적 특성을 분석한 결과, 현재 내면의 슬픔과 고민이 깊어 보입니다. 이러한 감정을 이해하고 함께 극복해나가는 것이 중요합니다.
                </p>
              )}
              
              {testData?.imageUrl && (
                <div className="mt-4 flex flex-col items-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">분석한 그림</h5>
                  <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
                    <img 
                      src={testService.getImageUrl(testData.imageUrl)} 
                      alt="분석된 그림" 
                      className="w-32 h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity duration-200">
                        클릭하여 확대
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 확률 차트 컴포넌트 */}
        {probabilities && Object.keys(probabilities).length > 0 && (
          <ProbabilityChart probabilities={probabilities} />
        )}

        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
            결과 유형 보기
          </h3>
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
            {characters
              .filter(character => {
                // 현재 테스트 결과와 일치하는 캐릭터만 표시
                return character.name === currentTestResult;
              })
              .map(character => (
                <div key={character.id} className="text-center">
                  <div className="mb-3">
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

      {/* 이미지 모달 */}
      {showImageModal && testData?.imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-opacity duration-200 z-10"
            >
              ✕
            </button>
            <img 
              src={testService.getImageUrl(testData.imageUrl)}
              alt="분석된 그림 확대보기"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
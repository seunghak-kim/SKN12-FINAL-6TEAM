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
  updateTestResult: (newTestResult: string) => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({
  characters,
  onCharacterSelect,
  onStartChat,
  onNavigate,
  currentTestResult,
  updateTestResult
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [testData, setTestData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isCreatingResult, setIsCreatingResult] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [probabilities, setProbabilities] = useState<{ [key: string]: number } | null>(null);
  const [actualPersonalityType, setActualPersonalityType] = useState<string>('내면형');
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // 성격 유형별 데이터 매핑
  const personalityData: { [key: string]: { friendsType: number; emoji: string; message: string; keywords: string[]; color: string; } } = {
    '추진형': {
      friendsType: 1,
      emoji: '💪',
      message: '목표를 향해 나아가자! 어떤 장애물도 내가 극복할 수 있어. 도전이 두렵지 않아!',
      keywords: ['목표 지향', '리더십', '적극성'],
      color: 'red'
    },
    '내면형': {
      friendsType: 2, 
      emoji: '😖',
      message: '아무도 내 기분을 제대로 이해하지 못할 거야... 괜찮아, 혼자인 게 더 편하니까. 내 세상 안에서 나는 완전하거든.',
      keywords: ['감정적 깊이', '내성적 성향', '공감 능력'],
      color: 'blue'
    },
    '관계형': {
      friendsType: 3,
      emoji: '🤝', 
      message: '함께하면 더 좋은 일들이 생길 거야! 혼자보다는 다 같이 할 때 더 의미있어.',
      keywords: ['사교성', '협력', '친화력'],
      color: 'green'
    },
    '쾌락형': {
      friendsType: 4,
      emoji: '😄',
      message: '인생은 즐거워야 해! 재미있는 일들을 찾아보자! 매 순간이 새로운 모험이야.',
      keywords: ['즐거움 추구', '활발함', '창의성'],
      color: 'yellow'
    },
    '안정형': {
      friendsType: 5,
      emoji: '😌',
      message: '차분하고 안정적인 게 최고야. 평온함 속에서 행복을 찾자. 급할 건 없어.',
      keywords: ['안정감', '신중함', '조화'],
      color: 'purple'
    }
  };

  // 실제 분석 결과에서 주 성격 유형 추출
  const getMainPersonalityType = (probabilities: { [key: string]: number }) => {
    if (!probabilities || Object.keys(probabilities).length === 0) {
      return '내면형'; // 기본값
    }
    
    return Object.entries(probabilities)
      .sort(([,a], [,b]) => b - a)[0][0]; // 가장 높은 확률의 유형
  };

  // 성격 유형을 캐릭터 이름으로 변환
  const getCharacterName = (personalityType: string) => {
    const typeToCharacter: { [key: string]: string } = {
      '추진형': '추진이',
      '내면형': '내면이', 
      '관계형': '관계이',
      '쾌락형': '쾌락이',
      '안정형': '안정이'
    };
    return typeToCharacter[personalityType] || '내면이';
  };

  // TestInstructionPage에서 전달받은 데이터 처리
  useEffect(() => {
    const stateData = location.state as { 
      testId: number | null; 
      imageUrl?: string; 
      error?: boolean; 
      errorMessage?: string;
      fromPipeline?: boolean;
    } | null;
    
    if (stateData?.error) {
      // 분석 실패 시 0% 데이터 표시
      console.log('분석 실패 상태로 0% UI 표시');
      setTestData({ testId: null, error: true, errorMessage: stateData.errorMessage });
      setAnalysisResult(stateData.errorMessage || '분석 중 오류가 발생했습니다.');
      
      // 모든 페르소나를 0%로 설정
      setProbabilities({
        '추진형': 0,
        '내면형': 0,
        '관계형': 0,
        '쾌락형': 0,
        '안정형': 0
      });
    } else if (stateData?.testId) {
      setTestData(stateData);
      // 순서가 중요: 먼저 분석 데이터를 가져온 후 DB 저장
      initializeTestResult(stateData.testId);
    }
  }, [location.state]);

  // 분석 데이터 가져온 후 DB 저장하는 순서 보장
  const initializeTestResult = async (testId: number) => {
    try {
      // 1. 먼저 분석 상태 조회하여 파이프라인 결과 가져오기
      const pipelineData = await fetchAnalysisStatus(testId);
      
      // 2. 그 다음 DB에 저장 (파이프라인 데이터를 직접 전달)
      await createTestResult(testId, pipelineData);
    } catch (error) {
      console.error('테스트 결과 초기화 실패:', error);
    }
  };

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
          // 파이프라인 결과 저장 (state 업데이트용)
          setPipelineResult(data.result);
          
          // API에서 직접 확률 데이터 가져오기
          const probabilities = data.result.probabilities;
          if (probabilities && Object.keys(probabilities).length > 0) {
            setProbabilities(probabilities);
            // 실제 성격 유형 업데이트 (파이프라인에서 예측한 값 직접 사용)
            const predictedType = data.result?.predicted_personality || '내면형';
            setActualPersonalityType(predictedType);
            // 캐릭터 이름으로 변환해서 useAppState에 반영
            const characterName = getCharacterName(predictedType);
            updateTestResult(characterName);
          }
          
          // result_text가 있으면 분석 결과 업데이트
          if (data.result.result_text) {
            setAnalysisResult(data.result.result_text);
          }
          
          // 파이프라인 데이터를 직접 반환 (state에 의존하지 않음)
          return data.result;
        } else {
          return null;
        }
      } else {
        console.error('분석 상태 조회 실패:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('분석 상태 조회 오류:', error);
      return null;
    }
  };

  const createTestResult = async (testId: number, pipelineData?: any) => {
    setIsCreatingResult(true);
    
    try {
      // 파이프라인 데이터 직접 사용 (state에 의존하지 않음)
      const predictedPersonality = pipelineData?.predicted_personality || actualPersonalityType;
      const pipelineFriendsType = pipelineData?.friends_type;
      
      // friends_type만 업데이트 (summary_text는 파이프라인에서 이미 설정됨)
      const finalFriendsType = pipelineFriendsType || personalityData[predictedPersonality]?.friendsType || 2;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/test/drawing-test-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          test_id: testId,
          friends_type: finalFriendsType
          // summary_text 제거: 파이프라인에서 이미 상세한 분석 결과 저장됨
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 에러 응답:', errorData);
        // 파이프라인 결과 텍스트를 사용
        if (pipelineData?.result_text) {
          setAnalysisResult(pipelineData.result_text);
        }
      } else {
        const result = await response.json();
        // 파이프라인 결과 텍스트를 사용
        if (pipelineData?.result_text) {
          setAnalysisResult(pipelineData.result_text);
        }
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
            <div className="text-4xl">{personalityData[actualPersonalityType]?.emoji || '😖'}</div>
            <div className="bg-white rounded-xl p-3 shadow-md relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
                <div className="w-3 h-3 bg-white rotate-45 shadow-md"></div>
              </div>
              <p className="text-gray-700 font-medium text-sm">
                {personalityData[actualPersonalityType]?.message || '아무도 내 기분을 제대로 이해하지 못할 거야... 괜찮아, 혼자인 게 더 편하니까. 내 세상 안에서 나는 완전하거든.'}
              </p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            당신의 페르소나는 <span className={`text-${personalityData[actualPersonalityType]?.color || 'blue'}-600`}>{actualPersonalityType}</span> 입니다
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
                <p className="text-gray-600 text-sm leading-relaxed mb-4 text-center max-w-2xl mx-auto">
                  {analysisResult}
                </p>
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

        {/* 확률 차트 컴포넌트 - 항상 표시 */}
        <ProbabilityChart 
          probabilities={probabilities || {
            '추진형': 0,
            '내면형': 0,
            '관계형': 0,
            '쾌락형': 0,
            '안정형': 0
          }} 
        />

        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
            결과 유형 보기
          </h3>
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
            {characters
              .filter(character => {
                // 실제 분석된 성격 유형을 캐릭터 이름으로 변환해서 매칭
                return character.name === getCharacterName(actualPersonalityType);
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
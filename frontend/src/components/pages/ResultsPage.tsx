import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { SearchResult } from '../../types';
import { testService } from '../../services/testService';
import { Button } from "../../components/ui/button";

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

  // 확률 값에 따른 색상 가져오기
  const getColorForType = (type: string) => {
    const colorMap: { [key: string]: string } = {
      '추진형': 'from-orange-400 to-red-500',
      '내면형': 'from-pink-200 to-brown-300',
      '관계형': 'from-gray-600 to-gray-800',
      '쾌락형': 'from-yellow-400 to-orange-500',
      '안정형': 'from-gray-100 to-gray-300'
    };
    return colorMap[type] || 'from-pink-200 to-brown-300';
  };

  // 확률 값에 따른 이모지 가져오기
  const getEmojiForType = (type: string) => {
    const emojiMap: { [key: string]: string } = {
      '추진형': '🦊',
      '내면형': '🐰',
      '관계형': '🦝',
      '쾌락형': '🐱',
      '안정형': '🐼'
    };
    return emojiMap[type] || '🐰';
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
            // 실제 성격 유형 업데이트
            const mainType = getMainPersonalityType(probabilities);
            setActualPersonalityType(mainType);
            // 캐릭터 이름으로 변환해서 useAppState에 반영
            const characterName = getCharacterName(mainType);
            updateTestResult(characterName);
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
          friends_type: personalityData[actualPersonalityType]?.friendsType || 2,
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

  // 주 성격 유형의 확률 값 가져오기
  const getMainProbability = () => {
    if (!probabilities) return 82;
    const prob = probabilities[actualPersonalityType];
    return prob ? Math.round(prob * 100) : 82;
  };

  // 다른 성격 유형들의 확률 정렬된 배열 가져오기
  const getOtherPersonalities = () => {
    if (!probabilities) {
      return [
        { type: '추진형', probability: 60 },
        { type: '관계형', probability: 40 },
        { type: '쾌락형', probability: 20 },
        { type: '안정형', probability: 10 }
      ];
    }

    return Object.entries(probabilities)
      .filter(([type]) => type !== actualPersonalityType)
      .map(([type, prob]) => ({ type, probability: Math.round(prob * 100) }))
      .sort((a, b) => b.probability - a.probability);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />

      <div className="relative z-10 container mx-auto px-8 py-8">
        {/* Main result card */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h1 className="text-white text-xl font-bold text-center mb-8">그림 심리 분석 결과</h1>

            <div className="bg-slate-600/50 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-white text-2xl font-bold mb-2">
                    당신의 페르소나는 <span className="text-pink-400">{getCharacterName(actualPersonalityType)}</span> 입니다
                  </h2>

                  <div className="w-full bg-gray-300 rounded-full h-3 mb-4">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full"
                      style={{ width: `${getMainProbability()}%` }}
                    ></div>
                  </div>

                  <div className="text-white/90 text-sm mb-4">나와 {getMainProbability()}%만큼 가까워진</div>
                </div>

                <div className={`w-32 h-32 bg-gradient-to-br ${getColorForType(actualPersonalityType)} rounded-full flex items-center justify-center ml-8`}>
                  <span className="text-4xl">{getEmojiForType(actualPersonalityType)}</span>
                </div>
              </div>

              <div className="bg-slate-500/50 rounded-xl p-6 mb-6">
                <p className="text-white/90 text-sm leading-relaxed">
                  {isCreatingResult ? (
                    <span className="flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      분석 결과를 생성하고 있습니다...
                    </span>
                  ) : (
                    analysisResult || personalityData[actualPersonalityType]?.message || 
                    "그림을 통해 당신의 심리 상태를 분석했습니다. 현재 감정 상태를 잘 표현하고 있으며, 이를 통해 더 나은 대화를 나눌 수 있을 것입니다."
                  )}
                </p>
              </div>

              <Button
                onClick={() => onNavigate?.("chatbot")}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-full font-medium"
              >
                {getCharacterName(actualPersonalityType)}와 대화하기
              </Button>
            </div>

            {testData?.imageUrl && (
              <div className="mt-8 flex flex-col items-center">
                <h5 className="text-sm font-medium text-white mb-2">분석한 그림</h5>
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

        {/* Other character options */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h2 className="text-white text-xl font-bold text-center mb-8">다른 페르소나 결과</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getOtherPersonalities().map((personality, index) => (
                <div key={personality.type} className="bg-slate-600/50 rounded-2xl p-6 text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getColorForType(personality.type)} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className="text-2xl">{getEmojiForType(personality.type)}</span>
                  </div>
                  <h3 className="text-white font-bold mb-2">{getCharacterName(personality.type)}</h3>
                  <p className="text-white/70 text-sm mb-2">나와 {personality.probability}%만큼</p>
                  <p className="text-white/70 text-sm">가까워진!</p>
                </div>
              ))}
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
    </div>
  );
};

export default ResultsPage;
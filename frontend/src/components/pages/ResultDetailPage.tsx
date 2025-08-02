import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { ArrowLeft, Loader, ChevronLeft } from 'lucide-react';
import { TestResult } from '../../types';
import { testService } from '../../services/testService';
import { Button } from "../../components/ui/button";

interface PersonalityType {
  name: string;
  percentage: number;
  color: string;
}

interface ResultDetailPageProps {
  testResults: TestResult[];
  onNavigate?: (screen: string) => void;
  onStartChat?: (characterName: string) => void;
}

const ResultDetailPage: React.FC<ResultDetailPageProps> = ({
  onNavigate,
  onStartChat
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [personalityTypes, setPersonalityTypes] = useState<PersonalityType[]>([]);

  useEffect(() => {
    const loadTestResult = async () => {
      if (!id) {
        setError('테스트 ID가 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        // 모든 테스트 결과를 가져와서 해당 ID 찾기
        const allResults = await testService.getMyTestResults();
        const foundResult = allResults.find(result => result.test_id.toString() === id);
        
        if (foundResult) {
          // persona_type에 따른 올바른 캐릭터 이름 매핑
          const getCharacterName = (personaType?: number) => {
            switch (personaType) {
              case 1: return '추진이';
              case 2: return '내면이';
              case 3: return '관계이';
              case 4: return '쾌락이';
              case 5: return '안정이';
              default: return foundResult.result?.persona_info?.persona_name || '분석 중';
            }
          };

          // 분류 모델에서 나온 5유형 확률 데이터 설정
          const personalityData: PersonalityType[] = [
            { name: "추진이", percentage: foundResult.result?.personality_scores?.추진이 || 0, color: "from-orange-500 to-red-600" },
            { name: "내면이", percentage: foundResult.result?.personality_scores?.내면이 || 0, color: "from-gray-500 to-gray-700" },
            { name: "관계이", percentage: foundResult.result?.personality_scores?.관계이 || 0, color: "from-purple-500 to-pink-600" },
            { name: "쾌락이", percentage: foundResult.result?.personality_scores?.쾌락이 || 0, color: "from-yellow-500 to-orange-600" },
            { name: "안정이", percentage: foundResult.result?.personality_scores?.안정이 || 0, color: "from-blue-500 to-purple-600" },
          ];

          setPersonalityTypes(personalityData);

          const formattedResult: TestResult = {
            id: foundResult.test_id.toString(),
            testType: 'Drawing' as const,
            result: foundResult.result?.summary_text || '결과 분석 중입니다.',
            characterMatch: getCharacterName(foundResult.result?.persona_type),
            date: foundResult.submitted_at,
            description: foundResult.result?.summary_text || '자세한 내용은 결과보기를 확인하세요.',
            images: [foundResult.image_url],
            personalityScores: foundResult.result?.personality_scores || {
              추진이: 0,
              내면이: 0,
              관계이: 0,
              쾌락이: 0,
              안정이: 0
            }
          };
          setTestResult(formattedResult);
        } else {
          setError('결과를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('테스트 결과 로드 실패:', error);
        setError('결과를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTestResult();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navigation onNavigate={onNavigate} activeTab="mypage" />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">결과를 불러오는 중...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navigation onNavigate={onNavigate} activeTab="mypage" />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">{error || '결과를 찾을 수 없습니다'}</h1>
            <button
              onClick={() => navigate('/mypage')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              마이페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleBackToMyPage = () => {
    navigate('/mypage');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCharacterImage = (characterName: string) => {
    const imageMap: { [key: string]: string } = {
      '추진이': '/assets/persona/추진이.png',
      '내면이': '/assets/persona/내면이.png',
      '관계이': '/assets/persona/관계이.png',
      '쾌락이': '/assets/persona/쾌락이.png',
      '안정이': '/assets/persona/안정이.png'
    };
    return imageMap[characterName] || '/assets/persona/내면이.png';
  };

  const getCharacterColor = (characterName: string) => {
    const colorMap: { [key: string]: string } = {
      '추진이': 'from-orange-400 to-red-500',
      '내면이': 'from-pink-200 to-brown-300',
      '관계이': 'from-gray-600 to-gray-800',
      '쾌락이': 'from-yellow-400 to-orange-500',
      '안정이': 'from-gray-100 to-gray-300'
    };
    return colorMap[characterName] || 'from-gray-400 to-gray-600';
  };

  const getCharacterDescription = (character: string): string => {
    switch (character) {
      case '추진이': return '목표 달성과 성공을 추구하며, 효율적이고 실용적인 해결책을 제시합니다.';
      case '내면이': return '깊이 있는 자기 성찰과 개인적 성장에 집중합니다. 당신의 내면 세계를 탐구하고 진정한 자아를 발견하는 여정을 함께해요.';
      case '관계이': return '타인과의 조화로운 관계 형성에 뛰어납니다. 소통의 어려움을 해결하고 더 깊은 인간관계를 만들어가는 방법을 알려드려요.';
      case '쾌락이': return '삶의 즐거움과 다양한 경험을 추구합니다. 새로운 관점으로 문제를 바라보고 창의적이고 흥미진진한 해결방안을 제안해드려요.';
      case '안정이': return '평화롭고 안정적인 환경을 선호하며, 갈등을 조화롭게 해결하는 데 능숙합니다. 마음의 평온을 찾고 균형 잡힌 삶을 추구해요.';
      default: return '당신만의 특별한 성격 유형입니다.';
    }
  };

  const getCharacterFeatures = (character: string): string[] => {
    switch (character) {
      case '추진이': 
        return [
          '도전적인 상황에서도 앞으로 나아가는 동력',
          '효율적이고 실용적인 문제 해결 능력',
          '목표 지향적이고 성취욕이 강함',
          '리더십과 추진력을 발휘하는 능력'
        ];
      case '내면이':
        return [
          '깊은 자기 성찰과 내적 탐구',
          '창의적이고 예술적인 감수성',
          '진정성과 개성을 중시하는 가치관',
          '감정의 깊이와 복잡성을 이해하는 능력'
        ];
      case '관계이':
        return [
          '뛰어난 공감 능력과 소통 스킬',
          '타인의 감정을 잘 이해하고 배려',
          '조화로운 인간관계 구축 능력',
          '갈등 상황에서의 중재 및 해결 능력'
        ];
      case '쾌락이':
        return [
          '삶을 즐기는 긍정적인 에너지',
          '창의적이고 혁신적인 아이디어',
          '다양한 경험과 새로운 도전을 추구',
          '유연하고 적응력이 뛰어남'
        ];
      case '안정이':
        return [
          '평화롭고 조화로운 환경 조성',
          '꾸준하고 안정적인 접근 방식',
          '갈등을 피하고 평화를 추구',
          '인내심과 포용력이 뛰어남'
        ];
      default: 
        return ['특별한 개성과 매력', '독특한 관점과 사고방식'];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F103F] via-[#1a1b4a] to-[#2a2b5a] relative overflow-hidden">
      <Navigation onNavigate={onNavigate} activeTab="mypage" />

      {/* Decorative elements */}
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full opacity-20 blur-2xl"></div>

      {/* Back button */}
      <button
        onClick={() => navigate("/mypage")}
        className="absolute top-24 left-8 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium transition-colors flex items-center"
      >
        <ChevronLeft size={16} className="mr-1" />
        마이페이지로 돌아가기
      </button>

      {/* Header */}
      <div className="relative z-10 container mx-auto px-8 py-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">검사 결과 상세</h1>
          <p className="text-white/80">검사 일시: {formatDate(testResult.date)}</p>
        </div>

        {/* Test Result Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white text-center mb-8">검사 결과</h2>

            <div className="bg-slate-600/50 rounded-2xl p-8 mb-8">
              <p className="text-white/90 text-sm leading-relaxed mb-6">
                {testResult.description}
              </p>

              {/* Image Display */}
              {testResult.images && testResult.images[0] && (
                <div className="flex justify-center">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => setSelectedImageIndex(0)}
                  >
                    <img
                      src={testService.getImageUrl(testResult.images[0])}
                      alt="분석된 그림"
                      className="w-32 h-32 object-cover rounded-2xl"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-2xl flex items-center justify-center transition-all duration-200">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity duration-200">
                        클릭하여 확대
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-white/70 text-center text-sm mt-4">그림을 클릭하여 더 자세히 볼 수 있습니다</p>
            </div>
          </div>

          {/* Character Profile Card */}
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 mt-8">
            <h1 className="text-2xl font-bold text-white text-center mb-8">당신의 성격 유형</h1>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Character Display */}
              <div className="text-center">
                <div className="flex flex-col items-center justify-center mx-auto mb-6">
                  <img
                    src={getCharacterImage(testResult.characterMatch)}
                    alt={testResult.characterMatch}
                    className="w-40 h-40 object-contain"
                  />
                  <h2 className="text-2xl font-bold text-white mt-4">{testResult.characterMatch}</h2>
                </div>
              </div>

              {/* Personality Bars */}
              <div className="space-y-4">
                {personalityTypes.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-16 text-white text-sm font-medium">{item.name}</div>
                    <div className="flex-1 bg-slate-600/50 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} transition-all duration-1000`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-white text-sm font-medium text-right">{item.percentage.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Character Description */}
            <div className="mt-8">
              <div className="bg-slate-600/50 rounded-2xl p-6 mb-8">
                <p className="text-white/90 text-lg italic mb-4">"{getCharacterDescription(testResult.characterMatch)}"</p>
                
                <h3 className="text-white font-bold mb-4">{testResult.characterMatch}의 특징</h3>
                <ul className="text-white/90 text-sm space-y-2 text-left max-w-md mx-auto">
                  {getCharacterFeatures(testResult.characterMatch).map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={() => onNavigate?.("chatbot")}
                className={`bg-gradient-to-r ${getCharacterColor(testResult.characterMatch)} hover:opacity-90 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                {testResult.characterMatch}와 대화하기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && testResult && testResult.images && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={testService.getImageUrl(testResult.images[selectedImageIndex])} 
              alt={`분석된 그림 ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDetailPage;
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { ArrowLeft, MessageSquare, Users, Loader } from 'lucide-react';
import { TestResult } from '../../types';
import { testService } from '../../services/testService';

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
          const formattedResult: TestResult = {
            id: foundResult.test_id.toString(),
            testType: 'Drawing' as const,
            result: foundResult.result?.summary_text || '결과 분석 중입니다.',
            characterMatch: foundResult.result?.friend_info?.friends_name || '분석 중',
            date: foundResult.submitted_at,
            description: foundResult.result?.summary_text || '자세한 내용은 결과보기를 확인하세요.',
            images: [foundResult.image_url]
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
        <Navigation onNavigate={onNavigate} />
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
        <Navigation onNavigate={onNavigate} />
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

  const handleStartChat = () => {
    if (onStartChat) {
      onStartChat(testResult.characterMatch);
    }
    navigate('/chat');
  };

  const handleViewCharacters = () => {
    navigate('/characters');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCharacterEmoji = (characterName: string) => {
    const emojiMap: { [key: string]: string } = {
      '슬픔이': '😢',
      '기쁨이': '😊',
      '버럭이': '😤',
      '까칠이': '😑',
      '소심이': '😰'
    };
    return emojiMap[characterName] || '😊';
  };

  const getCharacterColor = (characterName: string) => {
    const colorMap: { [key: string]: string } = {
      '슬픔이': 'from-blue-400 to-indigo-600',
      '기쁨이': 'from-yellow-400 to-orange-500',
      '버럭이': 'from-red-400 to-pink-600',
      '까칠이': 'from-gray-400 to-slate-600',
      '소심이': 'from-green-400 to-emerald-600'
    };
    return colorMap[characterName] || 'from-blue-400 to-indigo-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation onNavigate={onNavigate} />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToMyPage}
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>마이페이지로 돌아가기</span>
            </button>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-800">검사 결과 상세</h1>
            <p className="text-gray-600">{formatDate(testResult.date)} 검사 결과</p>
          </div>

          <div className="space-y-8">
            {/* Test Result */}
            <div className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-xl">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">검사결과</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="prose prose-gray max-w-none">
                  <p className="leading-relaxed text-gray-700">
                    {testResult.description || 
                    `이 검사 결과는 ${testResult.characterMatch}와 매칭되었습니다. 당신의 그림에서 나타난 심리적 특성을 분석한 결과, 현재의 감정 상태와 성격적 특징이 잘 드러났습니다. 이러한 분석을 바탕으로 맞춤형 상담을 제공해드릴 수 있습니다.`}
                  </p>
                </div>
                {testResult.images && testResult.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">분석한 그림</h4>
                    <div className="flex flex-wrap gap-4">
                      {testResult.images.map((imageUrl, index) => (
                        <div key={index} className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={testService.getImageUrl(imageUrl)} 
                            alt={`분석된 그림 ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-500 text-sm">이미지를 불러올 수 없습니다</div>`;
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Matched Persona */}
            <div className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-xl">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">매칭된 페르소나</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center space-x-6">
                  <div className={`w-20 h-20 bg-gradient-to-br ${getCharacterColor(testResult.characterMatch)} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl">{getCharacterEmoji(testResult.characterMatch)}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-indigo-600">{testResult.characterMatch}</h3>
                    <p className="text-gray-600">
                      {testResult.characterMatch === '슬픔이' && "당신의 슬픔과 아픔을 이해하고 공감해드려요. 혼자가 아니라는 것을 느끼며 천천히 마음의 상처를 치유해나가요."}
                      {testResult.characterMatch === '기쁨이' && "긍정적인 에너지와 밝은 마음으로 당신의 일상을 더욱 활기차게 만들어드려요."}
                      {testResult.characterMatch === '버럭이' && "때로는 화를 내는 것도 필요해요. 억압된 감정을 건강하게 표현하는 방법을 함께 찾아봐요."}
                      {testResult.characterMatch === '까칠이' && "솔직하고 직설적인 조언으로 현실적인 해결책을 제시해드려요."}
                      {testResult.characterMatch === '소심이' && "조심스럽고 세심한 마음으로 당신의 고민을 함께 들어드려요."}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleStartChat}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-full flex items-center justify-center space-x-2 transition-all duration-300"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{testResult.characterMatch}와 대화하기</span>
                  </button>
                  <button
                    onClick={handleViewCharacters}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-full flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>다른 캐릭터 보기</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultDetailPage;
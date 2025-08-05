import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Navigation from '../common/Navigation';
import { SearchResult } from '../../types';
import { testService } from '../../services/testService';
import { Button } from "../../components/ui/button";
import { ThumbsUp, ThumbsDown, Download } from "lucide-react";

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
  onCharacterSelect,
  onStartChat,
  onNavigate,
  updateTestResult
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [testData, setTestData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isCreatingResult, setIsCreatingResult] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // 모달 상태에 따른 body 스크롤 제어
  useEffect(() => {
    if (showImageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);
  const [probabilities, setProbabilities] = useState<{ [key: string]: number } | null>(null);
  const [actualPersonalityType, setActualPersonalityType] = useState<string>('');
  const [satisfaction, setSatisfaction] = useState<"like" | "dislike" | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  // 결과 카드를 이미지로 저장
  const handleSaveAsImage = async () => {
    if (!resultCardRef.current) return;
    
    try {
      // html2canvas 동적 import
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(resultCardRef.current, {
        background: '#0F103F',
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.classList.contains('exclude-from-image');
        }
      });
      
      // 캔버스를 blob으로 변환
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        
        // 다운로드 링크 생성
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `그림검사결과_${getCharacterName(actualPersonalityType)}_${new Date().toLocaleDateString('ko-KR')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
      
    } catch (error) {
      console.error('이미지 저장 중 오류가 발생했습니다:', error);
      alert('이미지 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // thumbs up/down 피드백 처리
  const handleThumbsFeedback = async (feedbackType: 'like' | 'dislike') => {    
    try {
      // testData 구조 확인
      const testId = testData?.test_id || testData?.testId || testData?.id;
      
      if (testId) {
        await testService.updateThumbsFeedback(testId, feedbackType);
        setSatisfaction(feedbackType);
      } else {
        console.error('테스트 ID가 없습니다. testData:', testData);
        // testId가 없어도 UI는 업데이트
        setSatisfaction(feedbackType);
      }
      
      // 3초 후 메시지 자동 사라짐
      setTimeout(() => {
        setSatisfaction(null);
      }, 2000);
    } catch (error) {
      console.error('피드백 전송 실패:', error);
      // 에러가 발생해도 UI는 업데이트 (사용자 경험 향상)
      setSatisfaction(feedbackType);
      
      // 3초 후 메시지 자동 사라짐
      setTimeout(() => {
        setSatisfaction(null);
      }, 2000);
    }
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
    return typeToCharacter[personalityType];
  };

// 확률 값에 따른 색상 가져오기
const getColorForType = (type: string) => {
  const colorMap: { [key: string]: string } = {
    '추진형': 'from-[#DC143C] to-[#FF6347]',
    '쾌락형': 'from-[#FF6347] to-[#E6B800]',
    '안정형': 'from-[#E6B800] to-[#3CB371]',
    '내면형': 'from-[#3CB371] to-[#6495ED]',
    '관계형': 'from-[#6495ED] to-[#9932CC]'
  };
  return colorMap[type];
};

  // 확률 값에 따른 캐릭터 이미지 가져오기
  const getCharacterImageForType = (type: string) => {
    const imageMap: { [key: string]: string } = {
      '추진형': '../../assets/persona/추진이.png',
      '내면형': '../../assets/persona/내면이.png',
      '관계형': '../../assets/persona/관계이.png',
      '쾌락형': '../../assets/persona/쾌락이.png',
      '안정형': '../../assets/persona/안정이.png'
    };
    return imageMap[type];
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
      // 1. 먼저 테스트 정보를 가져와서 이미지 URL 설정
      try {
        const testInfo = await testService.getTestById(testId);
        if (testInfo?.image_url) {
          setTestData((prev: any) => ({
            ...prev,
            image_url: testInfo.image_url,
            imageUrl: testInfo.image_url
          }));
        }
      } catch (error) {
        console.error('테스트 정보 가져오기 실패:', error);
      }
      
      // 2. 분석 상태 조회하여 파이프라인 결과 가져오기
      const pipelineData = await fetchAnalysisStatus(testId);
      
      // 3. 그 다음 DB에 저장 (파이프라인 데이터를 직접 전달)  
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
          // API에서 직접 확률 데이터 가져오기
          const probabilities = data.result.probabilities;
          if (probabilities && Object.keys(probabilities).length > 0) {
            setProbabilities(probabilities);
            // 실제 성격 유형 업데이트
            const mainType = getMainPersonalityType(probabilities);
            if (mainType) {
            setActualPersonalityType(mainType);
            // 캐릭터 이름으로 변환해서 useAppState에 반영
            const characterName = getCharacterName(mainType);
            updateTestResult(characterName);
            }
          } else {
            console.warn('Warning 확률 데이터가 비어있음');
          }
          
          // result_text가 있으면 분석 결과 업데이트
          if (data.result.result_text || data.result.summary_text) {
            const analysisText = data.result.result_text || data.result.summary_text;
            setAnalysisResult(analysisText);
          }
          
          // 이미지 URL 업데이트 (API 응답에 image_url이 있는 경우)
          if (data.result.image_url || data.image_url) {
            setTestData((prev: any) => ({
              ...prev,
              imageUrl: data.result.image_url || data.image_url
            }));
          }
          
          // 파이프라인 데이터 반환 (createTestResult에 전달용)
          return {
            predicted_personality: data.result.predicted_personality,
            probabilities: data.result.probabilities,
            result_text: data.result.result_text || data.result.summary_text,
            persona_type: data.result.persona_type,
            analysis_method: data.result.analysis_method
          };
        }
        
        return data; // 진행 중이나 다른 상태인 경우
      } else {
        console.error('분석 상태 조회 실패:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('분석 상태 조회 오류:', error);
      return null;
    }
    
    return null; // 기본 반환값
  };

  const createTestResult = async (testId: number, pipelineData?: any) => {
    setIsCreatingResult(true);
        
    try {
      // 파이프라인 데이터 직접 사용 (state에 의존하지 않음)
      const predictedPersonality = pipelineData?.predicted_personality || actualPersonalityType;
      const pipelinePersonaType = pipelineData?.persona_type;

      // persona_type만 업데이트 (summary_text는 파이프라인에서 이미 설정됨)
      const personalityMapping: { [key: string]: number } = {
        '추진형': 1,
        '내면형': 2,
        '관계형': 3,
        '쾌락형': 4,
        '안정형': 5
      };
      const finalPersonaType = pipelinePersonaType || personalityMapping[predictedPersonality] || 2;      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/test/drawing-test-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          test_id: testId,
          persona_type: finalPersonaType
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
        await response.json();
        // 파이프라인 결과 텍스트를 사용
        if (pipelineData?.result_text) {
          setAnalysisResult(pipelineData.result_text);
        } else {
          console.warn('Warning pipelineData.result_text가 비어있음');
        }
      }
      
    } catch (error) {
      console.error('테스트 결과 생성 실패:', error);
      // 에러가 있어도 테스트 결과는 표시
      if (pipelineData?.result_text) {
        setAnalysisResult(pipelineData.result_text);
      } else {
        setAnalysisResult("테스트 결과: 그림 분석이 완료되었습니다. 결과를 바탕으로 대화를 진행해보세요.");
      }
    } finally {
      setIsCreatingResult(false);
    }
  };


  const handlePersonalityClick = (personalityType: string) => {
    // 성격 유형을 SearchResult 형태로 변환
    const personalityMapping: { [key: string]: number } = {
      '추진형': 1,
      '내면형': 2,
      '관계형': 3,
      '쾌락형': 4,
      '안정형': 5
    };
    
    const character: SearchResult = {
      id: personalityMapping[personalityType]?.toString() || "2",
      name: getCharacterName(personalityType),
      description: analysisResult || "분석 결과를 바탕으로 대화해보세요.",
      avatar: getCharacterImageForType(personalityType)
    };
    
    onCharacterSelect(character);
    onStartChat();
    navigate('/chat');
  };

  // 실제 분석 결과에서 주 성격 유형 추출
  const getMainPersonalityType = (probabilities: { [key: string]: number }) => {
    if (!probabilities || Object.keys(probabilities).length === 0) {
      return null;
    }
    
    return Object.entries(probabilities)
      .sort(([,a], [,b]) => b - a)[0][0];
  };

  // 주 성격 유형의 확률 값 가져오기
  const getMainProbability = () => {
    if (!probabilities || !actualPersonalityType) return 0;
    const prob = probabilities[actualPersonalityType];
    return prob ? Math.round(prob) : 0;
  };

  // 다른 성격 유형들의 확률 정렬된 배열 가져오기
  const getOtherPersonalities = () => {
    if (!probabilities || !actualPersonalityType) {
      return [];
    }

    return Object.entries(probabilities)
      .filter(([type]) => type !== actualPersonalityType)
      .map(([type, prob]) => ({ type, probability: Math.round(prob) }))
      .sort((a, b) => b.probability - a.probability);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F103F] via-[#1a1b4a] to-[#2a2b5a] relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-60 blur-lg"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-30 blur-2xl"></div>

      <div className="relative z-10 container mx-auto px-8 py-8">
      
        {/* Main result card */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h1 className="text-white text-xl font-bold text-left mb-8">그림 심리 분석 결과</h1>

            <div ref={resultCardRef} className="bg-slate-600/50 rounded-2xl p-8">
              <div className="flex items-center justify-center space-x-8 mb-6">
                {/* 왼쪽: 캐릭터 */}
                {actualPersonalityType ? (
                <div className={`w-32 h-32 ${getColorForType(actualPersonalityType)} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                  <img 
                    src={getCharacterImageForType(actualPersonalityType)} 
                    alt={getCharacterName(actualPersonalityType)}
                    className="w-32 h-32 object-cover"
                  />
                </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 text-xs">분석 중...</span>
                  </div>
                )}

                {/* 가운데: 페르소나 정보 */}
                <div className="flex-1 text-center">
                  <h2 className="text-white text-2xl font-bold mb-6 text-left">
                    {actualPersonalityType ? (
                      <>당신의 페르소나는 <span className="text-pink-400">{getCharacterName(actualPersonalityType)}</span> 입니다</>
                    ) : (
                      <>분석 중입니다...</>
                    )}
                  </h2>

                  <div className="w-full bg-gray-300 rounded-full h-3 mb-4">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full"
                      style={{ width: `${getMainProbability()}%` }}
                    ></div>
                  </div>

                  <div className="text-white/90 text-sm mb-4 text-left">
                    {actualPersonalityType ? `나와 ${getMainProbability()}%만큼 가까워요!` : '결과를 기다리는 중...'}
                  </div>
                </div>

                {/* 오른쪽: 업로드된 이미지 */}
                <div className="flex-shrink-0">
                  {testData?.imageUrl ? (
                    <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
                      <img 
                        src={testService.getImageUrl(testData.imageUrl)} 
                        alt="분석된 그림" 
                        className="w-32 h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity duration-200">
                          클릭하여 확대
                        </span>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const imageUrl = testData?.image_url || testData?.imageUrl;                      
                      if (imageUrl) {
                        const fullImageUrl = testService.getImageUrl(imageUrl);                        
                        return (
                          <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
                            <img 
                              src={fullImageUrl}
                              alt="분석한 그림"
                              className="w-32 h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                              onError={(e) => {
                                console.error('❌ 오른쪽 이미지 로드 실패:', fullImageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity duration-200">
                                클릭하여 확대
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-32 h-32 bg-slate-500/50 rounded-lg flex items-center justify-center">
                            <span className="text-white/50 text-xs text-center">이미지 없음</span>
                          </div>
                        );
                      }
                    })()
                  )}
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
                    analysisResult || "그림을 통해 당신의 심리 상태를 분석했습니다. 현재 감정 상태를 잘 표현하고 있으며, 이를 통해 더 나은 대화를 나눌 수 있을 것입니다."
                  )}
                </p>
              </div>

              {actualPersonalityType ? (
              <Button
                onClick={() => handlePersonalityClick(actualPersonalityType)}
                className="exclude-from-image w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-full font-medium"
              >
                {getCharacterName(actualPersonalityType)}와 대화하기
              </Button>
              ) : (
                <Button
                  disabled
                  className="exclude-from-image w-full bg-gray-500 text-gray-300 py-3 rounded-full font-medium cursor-not-allowed"
                >
                  분석 완료 후 이용 가능
                </Button>
              )}
            </div>

            {/* 수정(따봉/붐따) 및 저장 버튼 */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="flex">
                {/* 수정(따봉/붐따) 박스 */}
                <div className="flex-[2] bg-slate-700/60 backdrop-blur-lg rounded-l-2xl p-4 border border-white/20 shadow-2xl border-r-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-lg font-bold">나와 매칭된 결과가 마음에 드시나요?</h3>
                    <div className="flex space-x-1">
                    <button
                      onClick={() => handleThumbsFeedback("like")}
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                        satisfaction === "like"
                          ? "bg-green-500 text-white shadow-lg scale-110"
                          : "bg-white/20 text-white/70 hover:bg-white/30 hover:scale-105"
                      }`}
                    >
                      <ThumbsUp size={20} />
                    </button>
                    <button
                      onClick={() => handleThumbsFeedback("dislike")}
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                        satisfaction === "dislike"
                          ? "bg-red-500 text-white shadow-lg scale-110"
                          : "bg-white/20 text-white/70 hover:bg-white/30 hover:scale-105"
                      }`}
                    >
                      <ThumbsDown size={20} />
                    </button>
                  </div>
                  </div>
                  {satisfaction && (
                    <div className="mt-3 text-center">
                      <p className="text-white/80 text-sm animate-fade-in">
                        {satisfaction === "like" ? "좋은 평가 감사합니다! 😊" : "더 나은 결과를 위해 노력하겠습니다 🙏"}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* 저장 버튼 박스 */}
                <div className="flex-[1] bg-slate-700/60 backdrop-blur-lg rounded-r-2xl p-4 border border-white/20 shadow-2xl border-l-0">
                  <div className="flex items-center justify-center h-full space-x-3">
                    <h3 className="text-white text-m font-bold">이미지로 저장하기</h3>
                    <button
                      onClick={handleSaveAsImage}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 hover:scale-105"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            </div>
          </div>


        {/* Other character options */}
        {getOtherPersonalities().length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-700/60 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-white text-xl font-bold text-center mb-8">다른 페르소나 결과</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {getOtherPersonalities().map((personality) => (
                <div
                  key={personality.type}
                  className="bg-slate-600/60 rounded-2xl p-6 text-center backdrop-blur-sm border border-white/10 hover:bg-slate-600/70 transition-all duration-300"
                >
                  <div
                    className={`w-24 h-24 ${getColorForType(personality.type)} flex items-center justify-center mx-auto mb-4 overflow-hidden`}
                  >
                    <img 
                      src={getCharacterImageForType(personality.type)} 
                      alt={getCharacterName(personality.type)}
                      className="w-26 h-26 object-cover"
                    />
                  </div>
                  <h3 className="text-white font-bold mb-2">{getCharacterName(personality.type)}</h3>
                  <p className="text-white/70 text-sm mb-1">나와 {personality.probability}%만큼</p>
                  <p className="text-white/70 text-sm mb-4">가까워요!</p>
                  <Button
                    onClick={() => handlePersonalityClick(personality.type)}
                    className={`w-full bg-gradient-to-r ${getColorForType(personality.type)} hover:opacity-90 text-white py-2 px-4 rounded-full text-sm font-medium shadow-lg transition-all duration-300`}
                  >
                    {getCharacterName(personality.type)}와 대화하기
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    

        {/* 이미지 모달 - Portal로 body에 직접 렌더링 */}
        {showImageModal && testData?.imageUrl && createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
            style={{ zIndex: 999999 }}
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageModal(false);
                }}
                className="absolute top-4 right-4 text-white bg-red-600 rounded-full w-12 h-12 flex items-center justify-center hover:bg-red-700 transition-colors duration-200 text-xl font-bold cursor-pointer"
                style={{ zIndex: 1000000 }}
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
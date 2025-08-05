import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import PipelineHealthCheck from '../common/PipelineHealthCheck';
import PipelineTestPanel from '../common/PipelineTestPanel';
import ConsentModal from '../common/ConsentModal';
import { Button } from "../../components/ui/button"

interface TestInstructionPageProps {
  onStartAnalysis: (imageFile: File | null, description: string) => Promise<void>;
  onNavigate?: (screen: string) => void;
}

const TestInstructionPage: React.FC<TestInstructionPageProps> = ({ onStartAnalysis, onNavigate }) => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  };

  const handleStartTest = async () => {
    // 개인정보 동의 팝업 표시
    setShowConsentModal(true);
  };

  const handleConsentAgree = () => {
    setShowConsentModal(false);
    navigate('/test');
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
  };


  const handleAnalysis = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    
    try {
      // 새로운 파이프라인 API 사용
      const { testService } = await import('../../services/testService');
      
      
      // 이미지 분석 시작
      const analysisResult = await testService.analyzeImage(selectedImage, description);
      
      const testId = analysisResult.test_id;
      
      // 분석 상태 폴링 시작
      await testService.pollAnalysisStatus(testId.toString(), (status) => {
        
        // 진행률에 따른 UI 업데이트 (AnalysisModal에서 처리)
        // 여기서는 로그만 출력
        if (status.status === 'processing') {
        }
      });
      
      
      // 분석 완료 후 결과 페이지로 이동
      setIsAnalyzing(false);
      navigate('/results', { 
        state: { 
          testId: testId,
          fromPipeline: true
        } 
      });
      
    } catch (error) {
      console.error('❌ 파이프라인 분석 실패:', error);
      setIsAnalyzing(false);
      
      // 분석 실패해도 결과 페이지로 이동 (0% UI 표시)
      navigate('/results', { 
        state: { 
          testId: null, // testId가 없음을 표시
          fromPipeline: true,
          error: true, // 분석 실패 플래그
          errorMessage: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
        } 
      });
    }
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
    navigate('/results');
  };

  const canAnalyze = selectedImage !== null && !isAnalyzing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

       {/* Subtle particles background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('/images/subtle-particles.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>

      {/* Glowing orb */}
      <div
        className="absolute top-1/4 right-1/4 w-48 h-48 opacity-50 animate-pulse"
        style={{
          backgroundImage: `url('/images/glowing-orb.png')`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          animationDuration: "3s",
        }}
      ></div>

      {/* Enhanced decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-full opacity-30 blur-xl animate-pulse"></div>
      <div
        className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 rounded-full opacity-40 blur-lg animate-pulse"
        style={{ animationDelay: "1.5s" }}
      ></div>

      {/* Enhanced orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[600px] h-[600px] border border-cyan-400/15 rounded-full animate-spin"
          style={{ animationDuration: "25s" }}
        ></div>
        <div
          className="absolute w-[700px] h-[700px] border border-purple-400/10 rounded-full animate-spin"
          style={{ animationDuration: "35s" }}
        ></div>
        <div
          className="absolute w-[800px] h-[800px] border border-pink-400/5 rounded-full animate-spin"
          style={{ animationDuration: "45s" }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Large purple circle container with enhanced mystical effect */}
          <div className="relative w-[500px] h-[500px] mx-auto mb-12 bg-gradient-to-br from-purple-700 via-purple-800 via-indigo-800 to-purple-900 rounded-full flex flex-col items-center justify-center p-8 shadow-2xl border border-purple-400/20">
            {/* Inner glow effect */}
            <div className="absolute inset-4 bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-cyan-400/20 rounded-full blur-xl"></div>

            <div className="relative z-10 flex flex-col items-center justify-center h-full pt-8">
              <h1 className="text-2xl font-bold text-white mb-4 text-center drop-shadow-lg">My Moody의 HTP 검사란?</h1>

              <div className="text-white/90 text-sm mb-6 leading-relaxed text-center max-w-xs">
                H(House)-T(Tree)-P(Person)으로
                <br />
                이루어진 그림 심리 검사로,
                <br />
                My Moody만의 해석 체계를 기반으로 한
                <br />
                간이 심리 테스트입니다
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 w-full max-w-xs border border-white/10">
                <h2 className="text-white font-bold mb-3 text-center text-sm">HTP 심리검사 순서</h2>

                <div className="text-left text-white/90 text-xs space-y-2">
                  <div className="flex items-start">
                    <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0 shadow-lg">
                      1
                    </div>
                    <div>
                      <div className="font-semibold mb-1 text-xs">집, 나무, 사람 검사</div>
                      <div className="text-xs text-white/70 leading-relaxed">
                        집, 나무, 사람을 요소별로 한 번에 그려주시면 검사가 완료됩니다
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0 shadow-lg">
                      2
                    </div>
                    <div>
                      <div className="font-semibold mb-1 text-xs">그림 완성 및 결과 확인</div>
                      <div className="text-xs text-white/70 leading-relaxed">
                        심리 분석 결과와 나에게 맞는 페르소나를 확인합니다
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* V-shaped arrow pointing down with animation */}
              <div className="mt-12 flex justify-center">
                <div 
                  className="animate-bounce"
                  style={{ animationDuration: "2s" }}
                >
                  <svg 
                    width="24" 
                    height="16" 
                    viewBox="0 0 24 16" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white opacity-80"
                  >
                    <path 
                      d="M2 2L12 12L22 2" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced button with better visibility and spacing */}
          <div className="mb-20">
            <Button
              onClick={handleStartTest}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 text-white px-12 py-5 rounded-full text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 transform hover:scale-105"
            >
              그림 검사 하러 가기
            </Button>

            {/* Subtle glow effect around button */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-indigo-600/20 rounded-full blur-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </div>
      </div>


      {/* ConsentModal */}
      <ConsentModal
        isOpen={showConsentModal}
        onClose={handleConsentClose}
        onAgree={handleConsentAgree}
      />
    </div>
  );
};

export default TestInstructionPage;
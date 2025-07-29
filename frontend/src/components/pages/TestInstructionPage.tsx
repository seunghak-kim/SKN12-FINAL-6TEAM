import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import PipelineHealthCheck from '../common/PipelineHealthCheck';
import PipelineTestPanel from '../common/PipelineTestPanel';
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
    // 개인정보 동의 팝업 없이 바로 분석 시작
    handleAnalysis();
  };


  const handleAnalysis = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    
    try {
      // 새로운 파이프라인 API 사용
      const { testService } = await import('../../services/testService');
      
      console.log('🚀 파이프라인 분석 시작:', selectedImage.name);
      
      // 이미지 분석 시작
      const analysisResult = await testService.analyzeImage(selectedImage, description);
      console.log('✅ 분석 시작 응답:', analysisResult);
      
      const testId = analysisResult.test_id;
      
      // 분석 상태 폴링 시작
      console.log('📡 상태 폴링 시작, test_id:', testId);
      await testService.pollAnalysisStatus(testId.toString(), (status) => {
        console.log('📊 폴링 상태 업데이트:', status);
        
        // 진행률에 따른 UI 업데이트 (AnalysisModal에서 처리)
        // 여기서는 로그만 출력
        if (status.status === 'processing') {
          console.log(`⏳ 분석 진행 중: ${status.message}`);
        }
      });
      
      console.log('🎉 분석 완료! 결과 페이지로 이동');
      
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
      console.log('분석 실패했지만 결과 페이지로 이동하여 0% UI 표시');
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

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-40 blur-lg"></div>

      {/* 3D Crystal */}
      <div className="absolute bottom-20 right-20 w-32 h-40 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 opacity-60 transform rotate-12 rounded-lg shadow-2xl"></div>

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] border border-cyan-400/10 rounded-full"></div>
        <div className="absolute w-[700px] h-[700px] border border-purple-400/10 rounded-full"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Large purple circle container */}
          <div className="relative w-96 h-96 mx-auto mb-8 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-full flex flex-col items-center justify-center p-8 shadow-2xl">
            <h1 className="text-2xl font-bold text-white mb-4">My Moody의 HTP 검사란?</h1>

            <div className="text-white/90 text-sm mb-6 leading-relaxed">
              H(House)-T(Tree)-P(Person)으로
              <br />
              이루어진 그림 심리 검사로,
              <br />
              My Moody만의 해석 체계를 기반으로 한
              <br />
              간이 심리 테스트입니다
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6">
              <h2 className="text-white font-bold mb-2">HTP 심리검사 순서</h2>

              <div className="text-left text-white/90 text-sm space-y-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    1
                  </div>
                  <div>
                    <div className="font-semibold">집, 나무, 사람 검사</div>
                    <div className="text-xs text-white/70">
                      집, 나무, 사람을 요소별로 한 번에 그려주시면 검사가 완료됩니다
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    2
                  </div>
                  <div>
                    <div className="font-semibold">그림 완성 및 결과 확인</div>
                    <div className="text-xs text-white/70">심리 분석 결과와 나에게 맞는 페르소나를 확인합니다</div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate('/test')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              그림 검사 하러 가기
            </Button>
          </div>
        </div>
      </div>
      
      <PipelineHealthCheck 
        isVisible={showHealthCheck}
        onClose={() => setShowHealthCheck(false)}
      />
      <PipelineTestPanel 
        isVisible={showTestPanel}
        onClose={() => setShowTestPanel(false)}
      />
    </div>
  );
};

export default TestInstructionPage;
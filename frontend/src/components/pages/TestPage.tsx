import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import ConsentModal from '../common/ConsentModal';
import { testService } from '../../services/testService';
import { PipelineStatusResponse } from '../../types';
import { agreementService } from '../../services/agreementService';
import { Button } from "../../components/ui/button";

interface TestPageProps {
  onNext?: () => void;
  onStartAnalysis?: (imageFile: File | null, description: string) => Promise<void>;
  onNavigate?: (screen: string) => void;
}

const TestPage: React.FC<TestPageProps> = ({ onStartAnalysis, onNavigate }) => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDescription] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<PipelineStatusResponse | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  // 컴포넌트 마운트 시 동의 상태 확인
  useEffect(() => {
    const checkConsentStatus = async () => {
      try {
        const status = await agreementService.getHtpConsentStatus();
        setHasAgreed(status.has_agreed);
      } catch (error) {
        console.error('동의 상태 확인 실패:', error);
        setHasAgreed(false);
      }
    };

    checkConsentStatus();
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    
    // 이미지 미리보기 생성
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

  const handleStartTest = () => {
    // 동의 상태와 관계없이 항상 동의 모달 표시
    setShowConsentModal(true);
  };

  const handleConsentAgree = async () => {
    try {
      await agreementService.createHtpConsent();
      setHasAgreed(true);
      setShowConsentModal(false);
      navigate('/test-instruction');
    } catch (error) {
      console.error('동의 처리 실패:', error);
      alert('동의 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
  };

  const handleAnalysis = async () => {
    if (!selectedImage) return;

    try {
      setIsAnalyzing(true);
      setAnalysisStatus(null);

      // 이미지 분석 시작
      const analysisResponse = await testService.analyzeImage(selectedImage, description);
      setCurrentTestId(analysisResponse.test_id);

      // 분석 상태 폴링 시작
      const finalStatus = await testService.pollAnalysisStatus(
        analysisResponse.test_id,
        (status) => {
          setAnalysisStatus(status);
        }
      );

      if (finalStatus.status === 'completed') {
        // 분석 완료 시 결과 페이지로 이동
        setIsAnalyzing(false);
        navigate('/results');
      } else if (finalStatus.status === 'failed') {
        // 분석 실패 시 에러 처리
        console.error('Analysis failed:', finalStatus.error);
        setIsAnalyzing(false);
        alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsAnalyzing(false);
      alert('분석을 시작하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleAnalysisComplete = () => {
    // 스피너 완료 후 결과 페이지로 이동
    setIsAnalyzing(false);
    navigate('/results');
  };

  const canAnalyze = selectedImage !== null && !isAnalyzing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-40 blur-lg"></div>
      <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-30 blur-xl"></div>

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] border border-cyan-400/10 rounded-full"></div>
        <div className="absolute w-[600px] h-[600px] border border-purple-400/10 rounded-full"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-8">
        <div className="max-w-md mx-auto">
          {/* Main container */}
          <div className="bg-slate-600/40 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h1 className="text-white text-xl font-bold text-center mb-8">그림 업로드</h1>

            {/* Instructions */}
            <div className="bg-slate-500/50 rounded-2xl p-6 mb-8">
              <h2 className="text-white font-bold mb-4">필독사항</h2>
              <div className="text-white/90 text-sm space-y-2">
                <p>• 메모장, 흰종이 노트 등을 활용해 집, 나무, 사람 각 요소를 분리해서 그려주세요</p>
                <p>• 3가지 요소를 모두 그려야 정상적인 검사가 가능합니다</p>
                <p>• 파일 업로드는 JPG 및 PNG로만 가능합니다</p>
              </div>
            </div>

            {/* Upload area */}
            <div 
              className={`border-2 border-dashed rounded-2xl p-8 mb-6 text-center transition-colors ${
                isDragOver ? 'border-white/50 bg-white/10' : 'border-white/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={imagePreview} 
                    alt="선택한 이미지" 
                    className="max-w-full h-32 object-contain mx-auto rounded-lg"
                  />
                  <p className="text-white/90 text-sm">선택된 파일: {selectedImage?.name}</p>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="text-white/70 hover:text-white text-sm underline"
                  >
                    다른 파일 선택
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-white/70 mb-4">파일을 드래그해서 놓거나, 클릭하여 불러오세요</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-full cursor-pointer"
                    >
                      파일 선택하기
                    </Button>
                  </label>
                </>
              )}
            </div>

            {/* Example images */}
            <div className="bg-slate-500/50 rounded-2xl p-6 mb-6">
              <h3 className="text-white font-bold mb-4 text-center">예시</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center">
                  <span className="text-xs text-gray-600">집 그림</span>
                </div>
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center">
                  <span className="text-xs text-gray-600">나무 그림</span>
                </div>
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center">
                  <span className="text-xs text-gray-600">사람 그림</span>
                </div>
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center">
                  <span className="text-xs text-gray-600">전체 그림</span>
                </div>
              </div>
            </div>

            {/* 설명 입력 */}
            {selectedImage && (
              <div className="mb-6">
                <label className="block text-white font-bold mb-2">
                  그림에 대한 설명 (선택사항)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="그림에 대해 간단히 설명해주세요..."
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 resize-none"
                  rows={3}
                />
              </div>
            )}

            {/* 분석 시작 버튼 */}
            {selectedImage && (
              <Button
                onClick={handleAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-full font-medium disabled:opacity-50"
              >
                {isAnalyzing ? '분석 중...' : '분석 시작하기'}
              </Button>
            )}
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

export default TestPage;
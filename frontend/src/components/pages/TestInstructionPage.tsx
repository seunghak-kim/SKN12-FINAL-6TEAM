import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import ConsentModal from '../common/ConsentModal';
import AnalysisModal from '../common/AnalysisModal';

interface TestInstructionPageProps {
  onStartAnalysis: (imageFile: File | null, description: string) => void;
  onNavigate?: (screen: string) => void;
}

const TestInstructionPage: React.FC<TestInstructionPageProps> = ({ onStartAnalysis, onNavigate }) => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const handleStartTest = () => {
    setShowConsentModal(true);
  };

  const handleConsentAgree = () => {
    setShowConsentModal(false);
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
  };

  const handleAnalysis = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    
    try {
      // 이미지 업로드 및 테스트 생성
      const { testService } = await import('../../services/testService');
      const uploadResult = await testService.uploadDrawingImage(selectedImage);
      
      // 업로드 성공 후 결과 페이지로 이동하면서 testId 전달
      setTimeout(() => {
        setIsAnalyzing(false);
        navigate('/results', { 
          state: { 
            testId: uploadResult.test_id,
            imageUrl: uploadResult.image_url 
          } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      setIsAnalyzing(false);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
    navigate('/results');
  };

  const canAnalyze = selectedImage !== null && !isAnalyzing;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">HTP 심리검사</h1>
          <p className="text-gray-600">그림을 업로드하고 설명을 작성해주세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 이미지 업로드 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-2xl">🖼️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">그림 업로드</h2>
            </div>
            
            <div 
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : selectedImage 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="업로드된 그림" 
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button 
                      className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      이미지 변경
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl text-gray-400">☁️</div>
                  <div>
                    <p className="text-gray-600 mb-3">파일을 드래그해서 놓거나 클릭하여 선택하세요</p>
                    <button 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <span>📁</span>
                      <span>파일 선택하기</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">JPG, PNG, GIF 파일만 업로드 가능합니다</p>
                </div>
              )}
              
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {/* 설명 입력 섹션 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-2xl">✏️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">그림 설명</h2>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="그림에 대한 설명을 입력하세요. 예: 어떤 기분으로 그렸는지, 특별한 의미가 있는지 등..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                maxLength={500}
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium">선택사항</span>
                <span className="text-gray-500">{description.length}/500</span>
              </div>
            </div>
          </div>
        </div>

        {/* 분석 시작 버튼 */}
        <div className="text-center mt-8">
          <button 
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              canAnalyze 
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleAnalysis}
            disabled={!canAnalyze}
          >
            {isAnalyzing ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>분석 중...</span>
              </span>
            ) : canAnalyze ? (
              <span className="flex items-center space-x-2">
                <span>🔍</span>
                <span>분석 시작하기</span>
              </span>
            ) : (
              '이미지를 업로드해주세요'
            )}
          </button>
          
          {canAnalyze && !isAnalyzing && (
            <p className="text-gray-600 mt-4 text-sm">
              업로드된 이미지를 분석하여 심리 상태를 파악합니다
            </p>
          )}
        </div>
      </div>

      <ConsentModal 
        isOpen={showConsentModal}
        onClose={handleConsentClose}
        onAgree={handleConsentAgree}
      />
      
      <AnalysisModal isOpen={isAnalyzing} onComplete={handleAnalysisComplete} />
    </div>
  );
};

export default TestInstructionPage;
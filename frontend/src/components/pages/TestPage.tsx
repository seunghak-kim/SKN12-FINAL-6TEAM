import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import AnalysisModal from '../common/AnalysisModal';
import ConsentModal from '../common/ConsentModal';

interface TestPageProps {
  onStartAnalysis: (imageFile: File | null, description: string) => Promise<void>;
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
    setShowConsentModal(true);
  };

  const handleConsentAgree = () => {
    setShowConsentModal(false);
    navigate('/test-instruction');
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await onStartAnalysis(selectedImage, description);
      // 실제 분석 완료 후 모달 닫기 및 결과 페이지 이동
      handleAnalysisComplete();
    } catch (error) {
      console.error('분석 실패:', error);
      handleAnalysisComplete();
    }
  };

  const handleAnalysisComplete = () => {
    // 스피너 완료 후 결과 페이지로 이동
    setIsAnalyzing(false);
    navigate('/results');
  };

  const canAnalyze = selectedImage !== null && !isAnalyzing;

  if (showDescription) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation onNavigate={onNavigate} />
        
        <div className="container mx-auto px-5 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-3 text-gray-800">HTP 심리검사</h1>
            <p className="text-gray-600">그림을 통해 당신의 심리 상태를 알아보세요</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">검사 순서</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  01
                </div>
                <div>
                  {/* <h3 className="text-lg font-semibold text-gray-800 mb-1">집검사</h3> */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 text-left">집검사</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">총 3가지 항목의 검사가 있습니다. 집검사부터 시작하여 나무, 사람 순서로 진행됩니다.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  02
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 text-left">나무, 사람</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">집검사 이후 나무 사람의 항목의 차례에 따라 그림을 그리고 검사가 완료됩니다.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  03
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 text-left">그림 완성</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">안내에 따라 각 그림 요소를 선택하여 그리기 그리고 검사 결과를 확인합니다.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center gap-3 mb-6">
              <span className="text-4xl font-bold text-yellow-500">?</span>
              <span className="text-4xl font-bold text-blue-500">?</span>
              <span className="text-4xl font-bold text-green-500">?</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-800 leading-relaxed">
              아직 한 번도 그림검사를 진행하지 않으셨나요?
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              그림 검사를 진행하고 나에게 맞는 페르소나를<br/>
              찾으세요!
            </p>
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 rounded-full text-lg font-semibold cursor-pointer hover:transform hover:-translate-y-1 transition-all duration-300 shadow-lg"
              onClick={handleStartTest}
            >
              그림검사 하러 가기
            </button>
          </div>
        </div>
        
        <ConsentModal 
          isOpen={showConsentModal}
          onClose={handleConsentClose}
          onAgree={handleConsentAgree}
        />
      </div>
    );
  }

  return (
    <div className="test-screen">
      <Navigation onNavigate={onNavigate} />
      
      <div className="test-container">
        <div className="test-header">
          <h1>HTP 심리검사</h1>
          <p>그림을 업로드하고 설명을 작성해주세요</p>
        </div>

        <div className="test-content">
          {/* 그림 업로드 섹션 */}
          <div className="upload-section">
            <div className="section-header">
              <span className="section-icon">🖼️</span>
              <h2>그림 업로드</h2>
            </div>
            
            <div 
              className={`upload-area ${isDragOver ? 'drag-over' : ''} ${selectedImage ? 'has-image' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="업로드된 그림" />
                  <div className="image-overlay">
                    <button 
                      className="change-image-btn"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      이미지 변경
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">☁️</div>
                  <p>또는 여기에 파일을 드래그해서 놓으세요</p>
                  <button 
                    className="upload-btn"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    📁 파일 선택하기
                  </button>
                </div>
              )}
              
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* 그림 설명 섹션 */}
          <div className="description-section">
            <div className="section-header">
              <span className="section-icon">✏️</span>
              <h2>그림 설명</h2>
            </div>
            
            <div className="description-area">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="그림에 대한 설명을 입력하세요. 예: 어떤 기분으로 그렸는지, 특별한 의미가 있는지 등..."
                className="description-input"
                rows={6}
              />
              <div className="description-info">
                <span className="optional-label">선택사항</span>
                <span className="char-count">{description.length}/500</span>
              </div>
            </div>
          </div>

          {/* 분석 시작 버튼 */}
          <div className="analysis-section">
            <button 
              className={`analysis-btn ${canAnalyze ? 'enabled' : 'disabled'}`}
              onClick={handleAnalysis}
              disabled={!canAnalyze}
            >
              {isAnalyzing ? '분석 중...' : canAnalyze ? '🔍 분석 시작하기' : '이미지를 업로드해주세요'}
            </button>
            
            {canAnalyze && !isAnalyzing && (
              <p className="analysis-notice">
                업로드된 이미지를 분석하여 심리 상태를 파악합니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 분석 로딩 모달 */}
      <AnalysisModal isOpen={isAnalyzing} onComplete={handleAnalysisComplete} />
    </div>
  );
};

export default TestPage;
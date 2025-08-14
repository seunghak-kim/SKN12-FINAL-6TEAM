import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import ConsentModal from '../common/ConsentModal';
import AnalysisModal from '../common/AnalysisModal';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDescription] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<PipelineStatusResponse | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // 캔버스 관련 상태
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  // 큰 그림판 모달 상태
  const [showLargeCanvas, setShowLargeCanvas] = useState(false);
  const [largeCanvasRef, setLargeCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [largeCanvasImageData, setLargeCanvasImageData] = useState<{
    data: ImageData;
    originalWidth: number;
    originalHeight: number;
  } | null>(null);
  const [showLargeCanvasMessage, setShowLargeCanvasMessage] = useState(true);

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

  // 반응형 캔버스 크기 계산 함수
  const calculateCanvasSize = () => {
    const screenWidth = window.innerWidth;
    
    // 13인치 노트북을 위한 자연스러운 반응형 처리
    let width, height;
    
    if (screenWidth < 640) {
      // 모바일: 화면 너비의 95%, 높이는 4:3 비율
      width = Math.min(screenWidth * 0.95, 400);
      height = Math.floor(width * 0.75);
      console.log('📱 모바일 크기:', { screenWidth, calculatedWidth: width, calculatedHeight: height });
    } else if (screenWidth < 1024) {
      // 13인치 노트북 및 태블릿: 화면 너비의 90%, 높이는 4:3 비율
      width = Math.min(screenWidth * 0.9, 800);
      height = Math.floor(width * 0.75);
      console.log('💻 13인치 노트북/태블릿 크기:', { screenWidth, calculatedWidth: width, calculatedHeight: height });
    } else {
      // 대형 화면: 화면 너비의 80%, 높이는 4:3 비율
      width = Math.min(screenWidth * 0.8, 1200);
      height = Math.floor(width * 0.75);
      console.log('🖥️ 대형 화면 크기:', { screenWidth, calculatedWidth: width, calculatedHeight: height });
    }
    
    const result = { width: Math.floor(width), height };
    console.log('🎯 최종 반환값:', result);
    return result;
  };

  // 큰 그림판 크기 계산 함수 (화면 크기에 맞춤)
  const calculateLargeCanvasSize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 화면의 90% 크기로 설정 (여백 확보)
    const maxWidth = Math.floor(screenWidth * 0.9);
    const maxHeight = Math.floor(screenHeight * 0.9);
    
    // 4:3 비율 유지하면서 화면에 맞춤
    let width, height;
    if (maxWidth / maxHeight > 4/3) {
      // 화면이 가로로 긴 경우
      height = maxHeight;
      width = Math.floor(height * 4/3);
    } else {
      // 화면이 세로로 긴 경우
      width = maxWidth;
      height = Math.floor(width * 3/4);
    }
    
    console.log('🎨 큰 그림판 크기:', { screenWidth, screenHeight, calculatedWidth: width, calculatedHeight: height });
    return { width, height };
  };

  // 캔버스 초기화 및 반응형 크기 조정
  useEffect(() => {
    if (canvasRef && activeTab === 'draw') {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        const { width, height } = calculateCanvasSize();
        
        console.log('🎨 캔버스 초기화:', { 
          canvasRef: !!canvasRef, 
          activeTab, 
          calculatedWidth: width, 
          calculatedHeight: height,
          screenWidth: window.innerWidth,
          deviceType: window.innerWidth < 768 ? '모바일' : window.innerWidth < 1024 ? '태블릿' : '데스크톱'
        });
        
        // 캔버스 크기 설정
        const canvas = canvasRef;
        canvas.width = width;
        canvas.height = height;
        
        console.log('✅ 캔버스 크기 설정 완료:', { 
          actualCanvasWidth: canvas.width, 
          actualCanvasHeight: canvas.height 
        });
        
        // 캔버스를 완전히 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 흰색 배경으로 초기화 (이것이 기본 배경이 됨)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 기본 설정
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, [canvasRef, activeTab]);

  // 화면 크기 변경 시 캔버스 크기 재조정
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef && activeTab === 'draw') {
        const ctx = canvasRef.getContext('2d');
        if (ctx) {
          const { width, height } = calculateCanvasSize();
          
          // 현재 그린 내용을 임시로 저장
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasRef.width;
          tempCanvas.height = canvasRef.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvasRef, 0, 0);
          }
          
          // 캔버스 크기 재설정
          canvasRef.width = width;
          canvasRef.height = height;
          
          // 흰색 배경으로 초기화
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          
          // 기존 내용을 새로운 크기에 맞게 스케일링하여 복원
          if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            const scaleX = width / tempCanvas.width;
            const scaleY = height / tempCanvas.height;
            const scale = Math.min(scaleX, scaleY);
            
            const scaledWidth = tempCanvas.width * scale;
            const scaledHeight = tempCanvas.height * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;
            
            ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
          }
          
          // 기본 설정 복원
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, activeTab]);

  // 큰 그림판 초기화
  useEffect(() => {
    if (largeCanvasRef && showLargeCanvas) {
      const ctx = largeCanvasRef.getContext('2d');
      if (ctx) {
        const { width, height } = calculateLargeCanvasSize();
        
        console.log('🎨 큰 그림판 초기화:', { 
          largeCanvasRef: !!largeCanvasRef, 
          showLargeCanvas, 
          calculatedWidth: width, 
          calculatedHeight: height
        });
        
        // 큰 캔버스 크기 설정
        largeCanvasRef.width = width;
        largeCanvasRef.height = height;
        
        // 흰색 배경으로 초기화
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // 그리기 설정 초기화
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        
        // 작은 그림판의 원본 내용을 큰 그림판에 복원 (항상 원본 크기 기준)
        if (largeCanvasImageData) {
          // 원본 크기의 임시 캔버스 생성
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = largeCanvasImageData.originalWidth;
          tempCanvas.height = largeCanvasImageData.originalHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            // 원본 ImageData를 임시 캔버스에 복원
            tempCtx.putImageData(largeCanvasImageData.data, 0, 0);
            
            // 임시 캔버스를 큰 그림판 크기에 맞게 스케일링하여 복원
            ctx.drawImage(tempCanvas, 0, 0, width, height);
          }
          
          console.log('🎯 원본 크기 기준으로 큰 그림판에 복원:', {
            originalWidth: largeCanvasImageData.originalWidth,
            originalHeight: largeCanvasImageData.originalHeight,
            targetWidth: width,
            targetHeight: height
          });
        }
        
        console.log('✅ 큰 그림판 초기화 완료:', { 
          actualCanvasWidth: largeCanvasRef.width, 
          actualCanvasHeight: largeCanvasRef.height
        });
      }
    }
  }, [largeCanvasRef, showLargeCanvas, largeCanvasImageData]);

  // 작은 그림판에서 그리기 도구 변경 시 캔버스에 반영
  useEffect(() => {
    if (canvasRef && activeTab === 'draw') {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = currentColor;
      }
    }
  }, [canvasRef, activeTab, brushSize, currentColor]);

  // 큰 그림판에서 그리기 도구 변경 시 캔버스에 반영
  useEffect(() => {
    if (largeCanvasRef && showLargeCanvas) {
      const ctx = largeCanvasRef.getContext('2d');
      if (ctx) {
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = currentColor;
      }
    }
  }, [largeCanvasRef, showLargeCanvas, brushSize, currentColor]);



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

  const handleFileDelete = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // 캔버스 관련 함수들
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef) return;
    
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    // CSS 크기와 실제 캔버스 크기의 비율을 계산하여 정확한 좌표 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 그리기 설정
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // 클릭한 지점에 점 그리기 (선이 시작되도록)
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // CSS 크기와 실제 캔버스 크기의 비율을 계산하여 정확한 좌표 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  // 큰 그림판 마우스 이벤트 함수들
  const startDrawingLarge = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!largeCanvasRef) return;
    
    const canvas = largeCanvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const drawLarge = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !largeCanvasRef) return;

    const canvas = largeCanvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 터치 이벤트를 위한 별도 함수들
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef) return;
    
    // 터치 이벤트에서 스크롤 방지
    e.preventDefault();
    
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    // CSS 크기와 실제 캔버스 크기의 비율을 계산하여 정확한 좌표 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // 그리기 설정
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // 터치한 지점에 점 그리기
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef) return;

    // 터치 이벤트에서 스크롤 방지
    e.preventDefault();

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    // CSS 크기와 실제 캔버스 크기의 비율을 계산하여 정확한 좌표 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  // 큰 그림판 터치 이벤트 함수들
  const startDrawingLargeTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!largeCanvasRef) return;
    
    e.preventDefault();
    
    const canvas = largeCanvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.moveTo(x, y);
  };

  const drawLargeTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !largeCanvasRef) return;
    
    e.preventDefault();
    
    const canvas = largeCanvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    // 캔버스 완전 초기화
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // 흰색 배경으로 채우기
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
    
    // composite operation 리셋
    ctx.globalCompositeOperation = 'source-over';
  };

  // 큰 그림판 열기
  const openLargeCanvas = () => {
    if (!canvasRef) return;
    
    const ctx = canvasRef.getContext('2d');
    if (ctx) {
      // 현재 작은 그림판의 내용을 저장 (원본 크기 그대로)
      const { width, height } = calculateCanvasSize();
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // 원본 크기 정보도 함께 저장
      setLargeCanvasImageData({
        data: imageData,
        originalWidth: width,
        originalHeight: height
      });
      setShowLargeCanvas(true);
      setShowLargeCanvasMessage(true);
      
      // 5초 후 메시지 숨기기
      setTimeout(() => {
        setShowLargeCanvasMessage(false);
      }, 5000);
    }
  };

  // 큰 그림판 닫기
  const closeLargeCanvas = () => {
    setShowLargeCanvas(false);
    setShowLargeCanvasMessage(true); // 메시지 상태 리셋
    // 큰 그림판을 닫을 때는 ImageData를 유지하여 다음에 열 때 원본 크기로 복원할 수 있도록 함
    // setLargeCanvasImageData(null); // 이 줄을 제거하여 원본 데이터 유지
  };

  // 큰 그림판에 작은 그림판 내용 복원
  const restoreToSmallCanvas = () => {
    if (!largeCanvasRef || !canvasRef) return;
    
    const smallCtx = canvasRef.getContext('2d');
    const largeCtx = largeCanvasRef.getContext('2d');
    
    if (smallCtx && largeCtx) {
      const { width: smallWidth, height: smallHeight } = calculateCanvasSize();
      const { width: largeWidth, height: largeHeight } = calculateLargeCanvasSize();
      
      // 작은 그림판을 흰색으로 초기화
      smallCtx.fillStyle = 'white';
      smallCtx.fillRect(0, 0, smallWidth, smallHeight);
      
      // 큰 그림판의 현재 내용을 가져와서 작은 그림판에 복원
      const currentLargeImageData = largeCtx.getImageData(0, 0, largeWidth, largeHeight);
      
      // 큰 그림판의 현재 내용을 작은 그림판에 맞게 스케일링하여 복원
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = largeWidth;
      tempCanvas.height = largeHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.putImageData(currentLargeImageData, 0, 0);
        smallCtx.drawImage(tempCanvas, 0, 0, smallWidth, smallHeight);
      }
      
      console.log('✅ 큰 그림판의 현재 내용을 작은 그림판에 복원 완료');
    }
    
    closeLargeCanvas();
  };



  const saveCanvasAsImage = () => {
    if (!canvasRef) return null;
    
    // 새로운 캔버스를 생성하여 흰색 배경 위에 그림을 합성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.width;
    tempCanvas.height = canvasRef.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // 흰색 배경 그리기
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 원본 캔버스 내용을 위에 합성 (지우개로 지운 부분은 투명하게 유지)
    tempCtx.drawImage(canvasRef, 0, 0);
    
    // 임시 캔버스를 blob으로 변환
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'drawing.png', { type: 'image/png' });
        setSelectedImage(file);
        
        // 미리보기 생성
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }, 'image/png');
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

    setIsAnalyzing(true);
    setShowAnalysisModal(true);
    setAnalysisStatus(null);

    // 새로운 AbortController 생성
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 이미지 분석 시작
      const analysisResponse = await testService.analyzeImage(selectedImage, '');
      setCurrentTestId(analysisResponse.test_id);

      // 분석 상태 폴링 시작 (AbortSignal 전달)
      const finalStatus = await testService.pollAnalysisStatus(
        analysisResponse.test_id,
        (status) => {
          setAnalysisStatus(status);
        },
        controller.signal
      );

      if (finalStatus.status === 'completed') {
        // 분석 완료 시 - AnalysisModal의 onComplete에서 처리하도록 함
        // setIsAnalyzing(false);
        // setShowAnalysisModal(false);
        // navigate는 AnalysisModal의 onComplete에서 처리
      } else if (finalStatus.status === 'cancelled') {
        // 분석 중단 시 (모달이 닫힌 경우) - 조용히 처리
        setIsAnalyzing(false);
        setShowAnalysisModal(false);
      } else if (finalStatus.status === 'failed') {
        // 분석 실패 시 에러 처리
        setIsAnalyzing(false);
        setShowAnalysisModal(false);
        alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      // 중단된 경우가 아닌 실제 오류인 경우에만 알림 표시
      if (!controller.signal.aborted) {
        setIsAnalyzing(false);
        setShowAnalysisModal(false);
        alert('분석을 시작하는 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleAnalysisComplete = () => {
    // 스피너 완료 후 결과 페이지로 이동
    setIsAnalyzing(false);
    navigate('/results');
  };

  const canAnalyze = selectedImage !== null && !isAnalyzing;

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
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
            <h1 className="text-white text-xl font-bold text-center mb-8">그림 업로드 또는 그리기</h1>

            {/* 탭 선택 */}
            <div className="flex mb-6">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-white/20 text-white border-2 border-white/30'
                    : 'bg-white/10 text-white/70 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                이미지 업로드
              </button>
              <button
                onClick={() => setActiveTab('draw')}
                className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
                  activeTab === 'draw'
                    ? 'bg-white/20 text-white border-2 border-white/30'
                    : 'bg-white/10 text-white/70 border-2 border-white/20 hover:bg-white/15'
                }`}
              >
                직접 그리기
              </button>
            </div>

          {/* Instructions */}
          <div className="bg-slate-500/50 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-bold mb-4">필독사항</h2>
          <div className="text-white/90 text-sm space-y-2">
            {activeTab === 'upload' ? (
              <>
                <p>• 핸드폰 메모장, 종이, 노트 등에 <br/>아래 예시와 같이 그린 뒤 촬영하여 올려주세요</p>
                <p>• 집,나무, 사람 3가지 요소를 분리해서 그려야 <br/>정상적인 검사가 가능합니다</p>
                <p>• 파일 업로드는 JPG 및 PNG로만 가능합니다</p>
                <p>• 사진은 뒤집히거나 회전하지 않도록 <br/>올바른 방향으로 촬영해 주세요</p>
              </>
            ) : (
              <>
                <p>• 집, 나무, 사람 3가지 요소를 분리해서 그려주세요</p>
                <p>• 그림을 완성한 후 '그림 저장' 버튼을 클릭하시면 분석 시작 버튼이 활성화됩니다</p>
                <p>• 브러시 크기를 자유롭게 조정할 수 있습니다</p>
                <p>• 실수한 부분은 지우개로 수정할 수 있습니다</p>
              </>
            )}
          </div>
          </div>

            {/* Content area */}
            {activeTab === 'upload' ? (
              /* Upload area */
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
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-reselect"
                  />
                  <div className="flex items-center justify-center space-x-4">
                    <label 
                      htmlFor="file-reselect"
                      className="text-white/70 hover:text-white text-sm underline cursor-pointer"
                    >
                      다른 파일 선택
                    </label>
                    <button
                      onClick={handleFileDelete}
                      className="text-white/70 hover:text-red-300 text-sm underline cursor-pointer"
                    >
                      파일 삭제하기
                    </button>
                  </div>
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
                  <label 
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-full cursor-pointer inline-block font-medium transition-all duration-300"
                  >
                    파일 선택하기
                  </label>
                </>
              )}
            </div>
            ) : (
              /* Canvas area */
              <div className="space-y-6">
                {/* Drawing tools */}
                <div className="bg-slate-500/50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold">그리기 도구</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Brush size */}
                    <div className="flex items-center space-x-3">
                      <label className="text-white/90 text-sm">브러시 크기:</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-white/70 text-sm w-8">{brushSize}px</span>
                    </div>
                    
                    {/* Brush/Eraser buttons */}
                    <div className="flex items-center space-x-3">
                      <label className="text-white/90 text-sm">도구:</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setIsEraser(false)}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            !isEraser 
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg' 
                              : 'bg-slate-600/50 text-slate-300 cursor-default'
                          }`}
                        >
                          브러시
                        </button>
                        <button
                          onClick={() => setIsEraser(true)}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                            isEraser 
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg' 
                              : 'bg-slate-600/50 text-slate-300 cursor-default'
                          }`}
                        >
                          지우개
                        </button>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={clearCanvas}
                        className="flex-1 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white py-2 px-4 rounded-lg text-sm transition-colors shadow-md"
                      >
                        전체 지우기
                      </button>
                      <button
                        onClick={saveCanvasAsImage}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2 px-4 rounded-lg text-sm transition-colors shadow-md"
                      >
                        그림 저장
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canvas */}
                <div className="border-2 border-white/30 rounded-2xl p-4 bg-white">
                  <div className="text-center mb-3">
                    <p className="text-gray-600 text-sm mb-2">아래 버튼을 클릭하면 큰 그림판에서 그리실 수 있습니다</p>
                    <button
                      onClick={openLargeCanvas}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-md"
                    >
                      🎨 큰 그림판 열기
                    </button>
                  </div>
                  <canvas
                    ref={setCanvasRef}
                    className={`border border-gray-300 rounded-lg w-full h-auto ${isEraser ? 'cursor-pointer' : 'cursor-crosshair'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawingTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* 분석 시작 버튼 */}
            {selectedImage && (
              <Button
                onClick={handleAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-full font-medium disabled:opacity-50 mb-6"
              >
                {isAnalyzing ? '분석 중...' : '분석 시작하기'}
              </Button>
            )}

            {/* Example images */}
            <div className="bg-slate-500/50 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-center">예시</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  <img 
                    src="/assets/image_ex1.jpg" 
                    alt="예시그림 1" 
                    className="w-full h-full object-cover rounded" 
                    onClick={() => setEnlargedImage("/assets/image_ex1.jpg")}
                  />
                </div>
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  <img 
                    src="/assets/image_ex2.jpg" 
                    alt="예시그림 2" 
                    className="w-full h-full object-cover rounded" 
                    onClick={() => setEnlargedImage("/assets/image_ex2.jpg")}
                  />
                </div>
                <div className="bg-white rounded-lg p-2 aspect-square flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  <img 
                    src="/assets/image_ex3.jpg" 
                    alt="예시그림 3" 
                    className="w-full h-full object-cover rounded" 
                    onClick={() => setEnlargedImage("/assets/image_ex3.jpg")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

            

      {/* ConsentModal */}
      <ConsentModal 
        isOpen={showConsentModal}
        onClose={handleConsentClose}
        onAgree={handleConsentAgree}
      />

      {/* AnalysisModal */}
      {(() => {
        return null;
      })()}
      <AnalysisModal 
        isOpen={showAnalysisModal}
        analysisStatus={analysisStatus}
        onComplete={() => {
          setIsAnalyzing(false);
          setShowAnalysisModal(false);
          if (currentTestId) {
            navigate('/results', { 
              state: { 
                testId: parseInt(currentTestId),
                fromPipeline: true
              } 
            });
          }
        }}
        onClose={() => {
          // 폴링 중단
          if (abortController) {
            abortController.abort();
            setAbortController(null);
          }
          
          // 즉시 UI 상태 변경 (사용자 경험 개선)
          setIsAnalyzing(false);
          setShowAnalysisModal(false);
          
          // 백그라운드에서 정리 작업 수행
          if (currentTestId) {
            testService.deleteDrawingTest(currentTestId)
              .then(() => {
                console.log('분석 중단으로 인한 테스트 삭제 완료:', currentTestId);
              })
              .catch((error) => {
                // 삭제 실패해도 사용자에게는 알리지 않음 (조용히 처리)
                console.warn('테스트 삭제 실패 (무시됨):', error);
              });
          }
          
          // 상태 초기화
          setCurrentTestId(null);
          setAnalysisStatus(null);
        }}
      />

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={enlargedImage} 
              alt="확대된 예시 이미지" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 큰 그림판 모달 */}
      {showLargeCanvas && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* 헤더 */}
            {showLargeCanvasMessage && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg animate-fade-in">
                <h2 className="text-xl font-bold text-gray-800">🎨 큰 그림판</h2>
                <p className="text-sm text-gray-600 text-center">사용자 화면 크기에 맞는 큰 그림판입니다</p>
              </div>
            )}

            {/* 큰 캔버스 */}
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              {/* 큰 그림판용 그리기 도구 */}
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-center space-x-4">
                  {/* 브러시 크기 */}
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-700 text-sm font-medium">브러시:</label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-gray-700 text-sm w-8">{brushSize}px</span>
                  </div>
                  
                  {/* 브러시/지우개 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEraser(false)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        !isEraser 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      브러시
                    </button>
                    <button
                      onClick={() => setIsEraser(true)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isEraser 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      지우개
                    </button>
                  </div>
                  
                  {/* 전체 지우기 */}
                  <button
                    onClick={() => {
                      if (largeCanvasRef) {
                        const ctx = largeCanvasRef.getContext('2d');
                        if (ctx) {
                          const { width, height } = calculateLargeCanvasSize();
                          ctx.clearRect(0, 0, width, height);
                          ctx.fillStyle = 'white';
                          ctx.fillRect(0, 0, width, height);
                        }
                      }
                    }}
                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm transition-colors"
                  >
                    전체 지우기
                  </button>
                </div>
              </div>
              
              <canvas
                ref={setLargeCanvasRef}
                className={`border-2 border-gray-300 rounded-lg ${isEraser ? 'cursor-pointer' : 'cursor-crosshair'}`}
                onMouseDown={startDrawingLarge}
                onMouseMove={drawLarge}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawingLargeTouch}
                onTouchMove={drawLargeTouch}
                onTouchEnd={stopDrawing}
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* 하단 버튼들 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex space-x-4">
              <button
                onClick={restoreToSmallCanvas}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg"
              >
                ✅ 작은 그림판에 저장
              </button>
              <button
                onClick={closeLargeCanvas}
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg"
              >
                ❌ 닫기
              </button>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={closeLargeCanvas}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default TestPage;
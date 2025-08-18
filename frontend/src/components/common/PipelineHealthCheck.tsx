import React, { useState, useEffect } from 'react';

interface PipelineHealthStatus {
  pipeline_status: string;
  timestamp: string;
  components: {
    yolo_model: boolean;
    openai_api: boolean;
    kobert_model: boolean;
    directories: boolean;
  };
  directories: {
    test_images: string;
    detection_results: string;
    rag_docs: string;
  };
}

interface PipelineHealthCheckProps {
  isVisible: boolean;
  onClose: () => void;
}

const PipelineHealthCheck: React.FC<PipelineHealthCheckProps> = ({ isVisible, onClose }) => {
  const [healthStatus, setHealthStatus] = useState<PipelineHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPipelineHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      // API 기본 URL 설정 (개발 환경)
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? `${window.location.protocol}//${window.location.hostname}` 
        : '';
      
      const url = `${baseUrl}/api/v1/pipeline/pipeline-health`;
      console.log('🔗 요청 URL:', url);

      // 다양한 토큰 소스에서 유효한 JWT 토큰 찾기
      let token = localStorage.getItem('token') || 
                  localStorage.getItem('auth_token') || 
                  localStorage.getItem('access_token');
      
      // 쿠키에서도 토큰 찾기 시도
      if (!token) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'auth_token' || name === 'access_token') {
            token = value;
            break;
          }
        }
      }
      
      console.log('🔑 토큰 상태:', token ? `${token.substring(0, 20)}...` : '토큰 없음');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      console.log('📡 응답 상태:', response.status);
      console.log('📡 응답 헤더:', response.headers.get('content-type'));

      if (!response.ok) {
        // 응답 본문을 텍스트로 읽어서 실제 오류 내용 확인
        const responseText = await response.text();
        console.error('❌ 응답 내용:', responseText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n\n응답 내용: ${responseText.substring(0, 200)}...`);
      }

      // Content-Type 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ JSON이 아닌 응답:', responseText);
        throw new Error(`서버가 JSON 대신 다른 형식을 반환했습니다.\n\nContent-Type: ${contentType}\n\n응답: ${responseText.substring(0, 200)}...`);
      }

      const data = await response.json();
      setHealthStatus(data);
      console.log('✅ 파이프라인 상태 확인 성공:', data);

    } catch (err) {
      console.error('❌ 파이프라인 상태 확인 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      checkPipelineHealth();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getComponentIcon = (isHealthy: boolean) => {
    return isHealthy ? '✅' : '❌';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🔧 파이프라인 상태 확인</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">파이프라인 상태를 확인하는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <h3 className="font-semibold text-red-800">상태 확인 실패</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={checkPipelineHealth}
              className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : healthStatus ? (
          <div className="space-y-6">
            {/* 전체 상태 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {getStatusIcon(healthStatus.pipeline_status)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">전체 상태</h3>
                    <p className={`text-sm font-medium ${getStatusColor(healthStatus.pipeline_status)}`}>
                      {healthStatus.pipeline_status.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>확인 시간</p>
                  <p>{new Date(healthStatus.timestamp).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            </div>

            {/* 구성 요소 상태 */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">🔧 구성 요소 상태</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">YOLO 모델</span>
                  <span className="text-lg">{getComponentIcon(healthStatus.components.yolo_model)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">OpenAI API</span>
                  <span className="text-lg">{getComponentIcon(healthStatus.components.openai_api)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">KoBERT 모델</span>
                  <span className="text-lg">{getComponentIcon(healthStatus.components.kobert_model)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">디렉토리</span>
                  <span className="text-lg">{getComponentIcon(healthStatus.components.directories)}</span>
                </div>
              </div>
            </div>

            {/* 디렉토리 정보 */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">📁 디렉토리 경로</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">테스트 이미지:</span>
                  <span className="text-gray-600 font-mono">{healthStatus.directories.test_images}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">검출 결과:</span>
                  <span className="text-gray-600 font-mono">{healthStatus.directories.detection_results}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">RAG 문서:</span>
                  <span className="text-gray-600 font-mono">{healthStatus.directories.rag_docs}</span>
                </div>
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <div className="text-center">
              <button
                onClick={checkPipelineHealth}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>상태 새로고침</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PipelineHealthCheck;
import { apiClient } from './apiClient';
import { DrawingTest, PipelineAnalysisResponse, PipelineStatusResponse } from '../types';

class TestService {
  private readonly BASE_PATH = '/api/v1/test';
  private readonly PIPELINE_PATH = '/api/v1/pipeline';

  /**
   * 현재 사용자의 그림 테스트 결과 조회
   */
  async getMyTestResults(): Promise<DrawingTest[]> {
    try {
      return await apiClient.get<DrawingTest[]>(`${this.BASE_PATH}/drawing-test-results/my-results`);
    } catch (error) {
      console.error('Failed to fetch test results:', error);
      throw error;
    }
  }

  /**
   * 그림 이미지 업로드 및 파이프라인 분석 시작
   */
  async analyzeImage(file: File, description?: string): Promise<PipelineAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      // FormData를 사용할 때는 Content-Type을 자동으로 설정되도록 해야 함
      // AbortController로 타임아웃 제어 (3분)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3분
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${this.PIPELINE_PATH}/analyze-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to start image analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to analyze image:', error);
      throw error;
    }
  }

  /**
   * 분석 상태 확인
   */
  async getAnalysisStatus(testId: string): Promise<PipelineStatusResponse> {
    try {
      return await apiClient.get<PipelineStatusResponse>(`${this.PIPELINE_PATH}/analysis-status/${testId}`);
    } catch (error) {
      console.error('Failed to get analysis status:', error);
      throw error;
    }
  }

  /**
   * 분석 완료까지 폴링
   */
  async pollAnalysisStatus(testId: string, onProgress?: (status: PipelineStatusResponse) => void): Promise<PipelineStatusResponse> {
    const poll = async (): Promise<PipelineStatusResponse> => {
      const status = await this.getAnalysisStatus(testId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // 2초 후 재요청
      await new Promise(resolve => setTimeout(resolve, 2000));
      return poll();
    };

    return poll();
  }

  /**
   * 그림 이미지 업로드 및 테스트 생성 (기존 호환성 유지)
   * @deprecated Use analyzeImage instead
   */
  async uploadDrawingImage(file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // FormData를 사용할 때는 Content-Type을 자동으로 설정되도록 해야 함
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${this.BASE_PATH}/drawing-tests/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload drawing image:', error);
      throw error;
    }
  }

  /**
   * 이미지 URL을 절대 경로로 변환
   */
  getImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // 로컬 경로를 절대 URL로 변환
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    // 'result/images/filename.jpg' -> '/images/filename.jpg'
    const relativePath = imageUrl.replace('result/', '');
    return `${baseUrl}/${relativePath}`;
  }
}

export const testService = new TestService();
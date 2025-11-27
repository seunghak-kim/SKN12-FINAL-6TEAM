import { apiClient } from './apiClient';
import { DrawingTest, PipelineAnalysisResponse, PipelineStatusResponse } from '../types';

class TestService {
  private readonly BASE_PATH = '/v1/test';
  private readonly PIPELINE_PATH = '/v1/pipeline';

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
   * 사용자의 테스트 기록 여부 확인 및 최신 결과 반환
   */
  async getUserTestStatus(): Promise<{ hasTests: boolean; latestResult?: DrawingTest }> {
    try {
      const testResults = await this.getMyTestResults();

      if (testResults.length === 0) {
        return { hasTests: false };
      }

      // 최신 테스트 결과 반환 (submitted_at 기준 정렬)
      const sortedResults = testResults.sort((a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );

      return {
        hasTests: true,
        latestResult: sortedResults[0]
      };
    } catch (error) {
      console.error('Failed to check user test status:', error);
      return { hasTests: false };
    }
  }

  /**
   * 그림 이미지 업로드 및 파이프라인 분석 시작
   */
  async analyzeImage(file: File, description?: string): Promise<PipelineAnalysisResponse> {
    try {
      console.log('🔍 analyzeImage 호출됨:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        description
      });

      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      console.log('📡 API 요청 시작:', `${this.PIPELINE_PATH}/analyze-image`);

      const result = await apiClient.postFormData<PipelineAnalysisResponse>(
        `${this.PIPELINE_PATH}/analyze-image`,
        formData
      );

      console.log('✅ 분석 시작 성공:', result);
      return result;
    } catch (error) {
      console.error('❌ 이미지 분석 요청 실패:', error);
      if (error instanceof Error) {
        throw new Error(`분석 요청 실패: ${error.message}`);
      }
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
  async pollAnalysisStatus(testId: string, onProgress?: (status: PipelineStatusResponse) => void, abortSignal?: AbortSignal): Promise<PipelineStatusResponse> {
    const poll = async (): Promise<PipelineStatusResponse> => {
      // 중단 신호가 있으면 폴링 중단
      if (abortSignal?.aborted) {
        return { status: 'cancelled', message: 'Analysis cancelled by user' } as PipelineStatusResponse;
      }

      try {
        const status = await this.getAnalysisStatus(testId);

        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          return status;
        }

        // 2초 후 재요청 (중단 신호 확인)
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, 2000);
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new Error('Analysis cancelled'));
            });
          }
        });

        return poll();
      } catch (error) {
        // 404 등의 오류가 발생하면 중단된 것으로 처리
        if (abortSignal?.aborted) {
          return { status: 'cancelled', message: 'Analysis cancelled by user' } as PipelineStatusResponse;
        }
        throw error;
      }
    };

    return poll();
  }


  /**
   * 이미지 URL을 절대 경로로 변환
   */
  getImageUrl(imageUrl: string): string {
    // 로컬 경로를 절대 URL로 변환
    // 'result/images/filename.jpg' -> 'http://backend:8000/images/filename.jpg'
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;

    let apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    // Remove trailing slash
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
    // Remove /api suffix
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

    // Remove 'result/' prefix if present to match the mounted static path
    // Backend mounts 'result/images' to '/images'
    // So 'result/images/foo.jpg' becomes '/images/foo.jpg'
    const cleanPath = imageUrl.replace(/^result\//, '').replace(/^\/result\//, '');
    const relativePath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

    const fullUrl = `${baseUrl}/${relativePath}`;
    console.log(`🖼️ getImageUrl: ${imageUrl} -> ${fullUrl}`);
    return fullUrl;
  }

  /**
   * 테스트 결과에 thumbs up/down 피드백 전송
   */
  async updateThumbsFeedback(testId: number, feedbackType: 'like' | 'dislike'): Promise<any> {
    try {
      return await apiClient.post(`${this.BASE_PATH}/drawing-test-results/feedback`, {
        test_id: testId,
        feedback_type: feedbackType
      });
    } catch (error) {
      console.error('Failed to update thumbs feedback:', error);
      throw error;
    }
  }

  /**
   * 특정 테스트 정보 조회 (이미지 URL 포함)
   */
  async getTestById(testId: number): Promise<any> {
    try {
      return await apiClient.get(`${this.BASE_PATH}/drawing-tests/${testId}`);
    } catch (error) {
      console.error('Failed to get test by id:', error);
      throw error;
    }
  }

  /**
   * 현재 사용자의 가장 최근 매칭된 페르소나 조회
   */
  async getLatestMatchedPersona(): Promise<{ matched_persona_id: number | null; matched_at?: string }> {
    try {
      return await apiClient.get(`${this.BASE_PATH}/drawing-test-results/latest-matched`);
    } catch (error) {
      console.error('Failed to get latest matched persona:', error);
      throw error;
    }
  }

  /**
   * 그림검사 결과 삭제
   */
  async deleteDrawingTest(testId: string): Promise<any> {
    try {
      return await apiClient.delete(`${this.BASE_PATH}/drawing-tests/${testId}`);
    } catch (error) {
      console.error('Failed to delete drawing test:', error);
      throw error;
    }
  }

  /**
   * 그림검사 결과 생성
   */
  async createDrawingTestResult(data: { test_id: number; persona_type: number }): Promise<any> {
    try {
      return await apiClient.post(`${this.BASE_PATH}/drawing-test-results`, data);
    } catch (error) {
      console.error('Failed to create drawing test result:', error);
      throw error;
    }
  }
  /**
   * 특정 테스트 결과 상세 조회 (관리자 접근 가능)
   */
  async getTestResultDetail(testId: string): Promise<DrawingTest> {
    try {
      return await apiClient.get<DrawingTest>(`${this.BASE_PATH}/drawing-test-results/${testId}/detail`);
    } catch (error) {
      console.error('Failed to fetch test result detail:', error);
      throw error;
    }
  }
}

export const testService = new TestService();
import { apiClient } from './apiClient';
import { DrawingTest } from '../types';

class TestService {
  private readonly BASE_PATH = '/api/v1/test';

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
   * 그림 이미지 업로드 및 테스트 생성
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
import { apiClient } from './apiClient';
import { RatingRequest, RatingResponse, AverageRatingResponse } from '../types';

class RatingService {
  private readonly BASE_PATH = '/api/ratings';

  /**
   * 새 평가 생성
   */
  async createRating(data: RatingRequest): Promise<RatingResponse> {
    try {
      return await apiClient.post<RatingResponse>(this.BASE_PATH, data);
    } catch (error) {
      console.error('Failed to create rating:', error);
      throw error;
    }
  }

  /**
   * 사용자의 평가 목록 조회
   */
  async getUserRatings(userId: number): Promise<RatingResponse[]> {
    try {
      return await apiClient.get<RatingResponse[]>(`${this.BASE_PATH}?user_id=${userId}`);
    } catch (error) {
      console.error('Failed to fetch user ratings:', error);
      throw error;
    }
  }

  /**
   * 세션의 평가 목록 조회
   */
  async getSessionRatings(sessionId: string): Promise<RatingResponse[]> {
    try {
      return await apiClient.get<RatingResponse[]>(`${this.BASE_PATH}?session_id=${sessionId}`);
    } catch (error) {
      console.error('Failed to fetch session ratings:', error);
      throw error;
    }
  }

  /**
   * 특정 평가 조회
   */
  async getRating(ratingId: number): Promise<RatingResponse> {
    try {
      return await apiClient.get<RatingResponse>(`${this.BASE_PATH}/${ratingId}`);
    } catch (error) {
      console.error('Failed to fetch rating:', error);
      throw error;
    }
  }

  /**
   * 평가 수정
   */
  async updateRating(ratingId: number, data: Partial<Pick<RatingRequest, 'rating' | 'comment'>>): Promise<RatingResponse> {
    try {
      return await apiClient.put<RatingResponse>(`${this.BASE_PATH}/${ratingId}`, data);
    } catch (error) {
      console.error('Failed to update rating:', error);
      throw error;
    }
  }

  /**
   * 평가 삭제
   */
  async deleteRating(ratingId: number): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`${this.BASE_PATH}/${ratingId}`);
    } catch (error) {
      console.error('Failed to delete rating:', error);
      throw error;
    }
  }

  /**
   * 세션의 평균 평점 조회
   */
  async getSessionAverageRating(sessionId: string): Promise<AverageRatingResponse> {
    try {
      return await apiClient.get<AverageRatingResponse>(`${this.BASE_PATH}/sessions/${sessionId}/average`);
    } catch (error) {
      console.error('Failed to fetch session average rating:', error);
      throw error;
    }
  }

  /**
   * 사용자의 평균 평점 조회
   */
  async getUserAverageRating(userId: number): Promise<AverageRatingResponse> {
    try {
      return await apiClient.get<AverageRatingResponse>(`${this.BASE_PATH}/users/${userId}/average`);
    } catch (error) {
      console.error('Failed to fetch user average rating:', error);
      throw error;
    }
  }
}

export const ratingService = new RatingService();
import { apiClient } from './apiClient';

class AgreementService {
  private readonly BASE_PATH = '/api/v1/agreement';

  /**
   * HTP 심리검사 개인정보 활용 동의
   */
  async createHtpConsent(): Promise<any> {
    try {
      return await apiClient.post(`${this.BASE_PATH}/htp-consent`, {});
    } catch (error) {
      console.error('Failed to create HTP consent:', error);
      throw error;
    }
  }

  /**
   * 현재 사용자의 HTP 동의 상태 확인
   */
  async getHtpConsentStatus(): Promise<{ has_agreed: boolean; agreed_at?: string }> {
    try {
      return await apiClient.get(`${this.BASE_PATH}/htp-consent/status`);
    } catch (error) {
      console.error('Failed to get HTP consent status:', error);
      throw error;
    }
  }
}

export const agreementService = new AgreementService();
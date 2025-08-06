import { apiClient } from './apiClient';

export interface Persona {
  persona_id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

class PersonaService {
  private readonly BASE_PATH = '/api/v1/persona';

  /**
   * 모든 활성화된 페르소나 조회
   */
  async getAllPersonas(): Promise<Persona[]> {
    try {
      return await apiClient.get<Persona[]>(this.BASE_PATH);
    } catch (error) {
      console.error('Failed to fetch personas:', error);
      throw error;
    }
  }

  /**
   * 특정 페르소나 조회
   */
  async getPersonaById(personaId: number): Promise<Persona> {
    try {
      return await apiClient.get<Persona>(`${this.BASE_PATH}/${personaId}`);
    } catch (error) {
      console.error('Failed to fetch persona:', error);
      throw error;
    }
  }
}

export const personaService = new PersonaService();
import { apiClient } from './apiClient';
import {
  ChatSession,
  ChatSessionDetail,
  ChatMessage,
  SendMessageRequest,
  SendMessageResponse,
  CreateSessionRequest,
  ApiError
} from '../types';

export class ChatService {
  // 새 채팅 세션 생성
  async createSession(data: CreateSessionRequest): Promise<ChatSession> {
    try {
      return await apiClient.post<ChatSession>('/chat/sessions', data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 사용자의 모든 채팅 세션 조회
  async getUserSessions(userId: number): Promise<ChatSession[]> {
    try {
      return await apiClient.get<ChatSession[]>(`/chat/sessions?user_id=${userId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 특정 채팅 세션 상세 조회 (메시지 포함)
  async getSessionDetail(sessionId: string): Promise<ChatSessionDetail> {
    try {
      return await apiClient.get<ChatSessionDetail>(`/chat/sessions/${sessionId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 메시지 전송
  async sendMessage(sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      return await apiClient.post<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, data);
    } catch (error) {
      throw this.handleError(error);
    }
  }


  // 세션 삭제
  async deleteSession(sessionId: string): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`/chat/sessions/${sessionId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 세션의 모든 메시지 조회
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      return await apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 에러 처리
  private handleError(error: any): ApiError {
    if (error.response && error.response.data) {
      return {
        error: error.response.data.error || 'API 오류가 발생했습니다.',
        detail: error.response.data.detail,
        code: error.response.status
      };
    }
    return {
      error: error.message || '알 수 없는 오류가 발생했습니다.',
      code: 500
    };
  }

  // 백엔드 메시지를 프론트엔드 형식으로 변환
  static convertToFrontendMessage(message: ChatMessage) {
    return {
      id: message.chat_messages_id,
      type: message.sender_type,
      content: message.content,
      timestamp: new Date(message.created_at).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    };
  }

  // 프론트엔드 메시지를 백엔드 형식으로 변환
  static convertFromFrontendMessage(message: any, sessionId: string): Partial<ChatMessage> {
    return {
      session_id: sessionId,
      sender_type: message.type,
      content: message.content,
      created_at: new Date().toISOString()
    };
  }
}

export const chatService = new ChatService();
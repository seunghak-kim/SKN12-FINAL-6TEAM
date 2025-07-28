import { useState, useCallback } from 'react';
import { chatService, ChatService } from '../services/chatService';
import {
  ChatSession,
  FrontendChatMessage,
  SendMessageRequest,
  CreateSessionRequest
} from '../types';

interface UseChatSessionReturn {
  // 상태
  session: ChatSession | null;
  messages: FrontendChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  greeting: string | null;

  // 액션
  createSession: (data: CreateSessionRequest) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
  clearMessages: () => void;
  loadGreeting: (sessionId: string) => Promise<void>;
}

export const useChatSession = (): UseChatSessionReturn => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<FrontendChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 에러 처리 헬퍼
  const handleError = useCallback((error: any) => {
    console.error('Chat session error:', error);
    if (error.error) {
      setError(error.error);
    } else if (error.message) {
      setError(error.message);
    } else {
      setError('알 수 없는 오류가 발생했습니다.');
    }
  }, []);

  // 새 채팅 세션 생성
  const createSession = useCallback(async (data: CreateSessionRequest) => {
    // 이미 세션이 있거나 로딩 중이거나 세션 생성 중이면 중복 생성 방지
    if (session || isLoading || isCreatingSession) {
      console.log('세션 생성 중복 방지:', { 
        hasSession: !!session, 
        isLoading, 
        isCreatingSession 
      });
      return;
    }
    
    setIsCreatingSession(true);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('세션 생성 요청:', data);
      const newSession = await chatService.createSession(data);
      console.log('세션 생성 성공:', newSession);
      setSession(newSession);
      
      // 세션 생성 후 greeting 메시지 로드
      try {
        const greetingData = await chatService.getSessionGreeting(newSession.chat_sessions_id);
        console.log('greeting 로드 성공:', greetingData);
        setGreeting(greetingData.greeting);
      } catch (greetingError) {
        console.error('greeting 로드 실패:', greetingError);
      }
      
      // 세션 생성 후 기존 메시지 로드
      try {
        const sessionMessages = await chatService.getSessionMessages(newSession.chat_sessions_id);
        const frontendMessages = sessionMessages.map(msg => 
          ChatService.convertToFrontendMessage(msg)
        );
        setMessages(frontendMessages);
      } catch (messageError) {
        console.error('초기 메시지 로드 실패:', messageError);
      }
    } catch (error) {
      console.error('createSession 에러:', error);
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsCreatingSession(false);
    }
  }, [session, isLoading, isCreatingSession, handleError]);


  // 세션 상세 정보 로드
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sessionDetail = await chatService.getSessionDetail(sessionId);
      setSession(sessionDetail);
      
      // 메시지 변환 및 설정
      const frontendMessages = sessionDetail.messages.map(msg => 
        ChatService.convertToFrontendMessage(msg)
      );
      setMessages(frontendMessages);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!session || !content.trim() || isSending) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      const messageRequest: SendMessageRequest = {
        content: content.trim(),
        enable_tts: false
      };
      
      const response = await chatService.sendMessage(session.chat_sessions_id, messageRequest);
      
      // 새로운 메시지들을 프론트엔드 형식으로 변환
      const userMessage = ChatService.convertToFrontendMessage(response.user_message);
      const assistantMessage = ChatService.convertToFrontendMessage(response.assistant_message);
      
      // 메시지 목록에 추가
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // 세션 정보 업데이트 (필요한 경우)
      if (response.session_updated) {
        await loadSession(session.chat_sessions_id);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsSending(false);
    }
  }, [session, isSending, handleError, loadSession]);


  // 세션 삭제
  const deleteSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await chatService.deleteSession(sessionId);
      setSession(null);
      setMessages([]);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 메시지 클리어
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // greeting 로드
  const loadGreeting = useCallback(async (sessionId: string) => {
    try {
      const greetingData = await chatService.getSessionGreeting(sessionId);
      setGreeting(greetingData.greeting);
    } catch (error) {
      console.error('greeting 로드 실패:', error);
      handleError(error);
    }
  }, [handleError]);

  return {
    // 상태
    session,
    messages,
    isLoading,
    isSending,
    error,
    greeting,

    // 액션
    createSession,
    sendMessage,
    loadSession,
    deleteSession,
    clearError,
    clearMessages,
    loadGreeting
  };
};
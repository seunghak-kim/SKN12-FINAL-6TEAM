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
  createSession: (data: CreateSessionRequest) => Promise<ChatSession | null>;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
  clearMessages: () => void;
  resetSession: () => void;
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

  const createSession = useCallback(async (data: CreateSessionRequest): Promise<ChatSession | null> => {
    // resetSession 직후에는 session이 null이므로 isLoading, isCreatingSession만 체크
    if (isLoading || isCreatingSession) {
      console.log('세션 생성 중복 방지:', { hasSession: !!session, isLoading, isCreatingSession });
      return null; // 중복 생성 방지
    }

  setIsCreatingSession(true);
  setIsLoading(true);
  setError(null);

  try {
    console.log('세션 생성 요청:', data);
    const newSession = await chatService.createSession(data);
    console.log('세션 생성 성공:', newSession);
    setSession(newSession);

    const sessionData = {
      sessionId: newSession.chat_sessions_id,
      personaId: newSession.persona_id,
      timestamp: Date.now(),
    };
    localStorage.setItem('lastChatSession', JSON.stringify(sessionData));
    console.log('useChatSession - 세션 정보 localStorage에 저장:', sessionData);

    // 개인화된 인사 생성을 백그라운드에서 처리
    console.log('createSession - 개인화된 인사 API 호출 시작 (백그라운드)');
    
    // 초기에는 빈 메시지로 시작
    setMessages([]);
    
    // 개인화된 인사 생성 (백그라운드에서 처리)
    chatService.getPersonalizedGreeting(newSession.chat_sessions_id)
      .then(personalizedGreeting => {
        console.log('createSession - 개인화된 인사 API 응답:', personalizedGreeting);
        if (personalizedGreeting.greeting) {
          console.log('createSession - 개인화된 인사 설정:', personalizedGreeting.greeting);
          setGreeting(personalizedGreeting.greeting);
          
          // 개인화된 인사가 생성되면 메시지 한 번만 로드
          setTimeout(async () => {
            try {
              const updatedMessages = await chatService.getSessionMessages(newSession.chat_sessions_id);
              const frontendMessages = updatedMessages.map(m => ChatService.convertToFrontendMessage(m));
              setMessages(frontendMessages);
              console.log('createSession - 개인화된 인사 반영 후 메시지 업데이트, 메시지 수:', frontendMessages.length);
            } catch (e) {
              console.error('개인화된 인사 반영 후 메시지 로드 실패:', e);
            }
          }, 500); // 500ms로 조정
        }
      })
      .catch(e => {
        console.error('createSession - 개인화된 인사 로드 실패:', e);
        // 개인화된 인사 실패 시에만 기본 메시지 로드
        chatService.getSessionMessages(newSession.chat_sessions_id)
          .then(sessionMessages => {
            const frontendMessages = sessionMessages.map((m) => ChatService.convertToFrontendMessage(m));
            setMessages(frontendMessages);
            console.log('createSession - 기본 메시지 로드 완료 (인사 실패 후), 메시지 수:', frontendMessages.length);
          })
          .catch(e => console.error('기본 메시지 로드 실패:', e));
      });

    return newSession; // ✅ 여기!
  } catch (error) {
    console.error('createSession 에러:', error);
    handleError(error);
    return null; // 실패 시 null
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
      console.log('useChatSession - 세션 로드 시작:', sessionId);
      const sessionDetail = await chatService.getSessionDetail(sessionId);
      console.log('useChatSession - 세션 로드 완료:', {
        sessionId: sessionDetail.chat_sessions_id,
        personaId: sessionDetail.persona_id,
        sessionName: sessionDetail.session_name
      });
      setSession(sessionDetail);
      
      // localStorage에 로드된 세션 정보 저장
      const sessionData = {
        sessionId: sessionDetail.chat_sessions_id,
        personaId: sessionDetail.persona_id,
        timestamp: Date.now()
      };
      localStorage.setItem('lastChatSession', JSON.stringify(sessionData));
      console.log('useChatSession - 로드된 세션 정보 localStorage에 저장:', sessionData);
      
      // 메시지 변환 및 설정
      const frontendMessages = sessionDetail.messages.map(msg => 
        ChatService.convertToFrontendMessage(msg)
      );
      setMessages(frontendMessages);

      // 새로 생성된 세션인 경우에만 개인화된 인사 API 호출
      // 조건: 메시지가 없고, 세션이 방금 생성된 경우 (생성 시간이 5분 이내)
      if (frontendMessages.length === 0) {
        const sessionCreatedAt = new Date(sessionDetail.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - sessionCreatedAt.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000; // 5분
        
        if (timeDiff < fiveMinutesInMs) {
          try {
            console.log('loadSession - 새로 생성된 빈 세션 감지, 개인화된 인사 API 호출 시작:', sessionId);
            const personalizedGreeting = await chatService.getPersonalizedGreeting(sessionId);
            console.log('loadSession - 개인화된 인사 API 응답:', personalizedGreeting);
            
            if (personalizedGreeting.greeting) {
              console.log('loadSession - 개인화된 인사 설정:', personalizedGreeting.greeting);
              setGreeting(personalizedGreeting.greeting);
              
              // 개인화된 인사가 생성되었으므로 메시지 다시 로드
              setTimeout(async () => {
                try {
                  const updatedSessionDetail = await chatService.getSessionDetail(sessionId);
                  const updatedMessages = updatedSessionDetail.messages.map(msg => 
                    ChatService.convertToFrontendMessage(msg)
                  );
                  setMessages(updatedMessages);
                  console.log('loadSession - 개인화된 인사 반영 후 메시지 업데이트 완료, 메시지 수:', updatedMessages.length);
                } catch (updateError) {
                  console.error('loadSession - 메시지 업데이트 실패:', updateError);
                }
              }, 1000); // 1초 후에 메시지 다시 로드
            }
          } catch (greetingError) {
            console.error('loadSession - 개인화된 인사 로드 실패:', greetingError);
          }
        } else {
          console.log('loadSession - 오래된 빈 세션이므로 개인화된 인사 API 호출 생략');
        }
      }
    } catch (error) {
      console.error('useChatSession - 세션 로드 실패:', error);
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
      console.log('메시지 전송 시작:', {
        sessionId: session.chat_sessions_id,
        content: content.trim()
      });

      const messageRequest: SendMessageRequest = {
        content: content.trim(),
        enable_tts: false
      };
      
      const response = await chatService.sendMessage(session.chat_sessions_id, messageRequest);
      
      console.log('메시지 전송 응답:', response);
      
      // 응답이 제대로 왔는지 확인
      if (!response || !response.user_message || !response.assistant_message) {
        throw new Error('서버 응답이 올바르지 않습니다.');
      }
      
      // 새로운 메시지들을 프론트엔드 형식으로 변환
      const userMessage = ChatService.convertToFrontendMessage(response.user_message);
      const assistantMessage = ChatService.convertToFrontendMessage(response.assistant_message);
      
      // 메시지 목록에 추가
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      console.log('메시지 추가 완료:', { userMessage, assistantMessage });
      
      // 세션 정보 업데이트 (필요한 경우)
      if (response.session_updated) {
        await loadSession(session.chat_sessions_id);
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
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

  // 세션 완전히 리셋 (새로운 세션 생성을 위해)
  const resetSession = useCallback(() => {
    setSession(null);
    setMessages([]);
    setError(null);
    setGreeting(null);
    setIsCreatingSession(false);
  }, []);

  // greeting 로드 함수 제거 (더 이상 사용하지 않음)

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
    resetSession
  };
};
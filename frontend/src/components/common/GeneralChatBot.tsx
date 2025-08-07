import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../../services/chatService';
import { CreateSessionRequest, SendMessageRequest } from '../../types';

interface ChatBotMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface GeneralChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const GeneralChatBot: React.FC<GeneralChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatBotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 채팅 세션 초기화
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
    }
  }, [isOpen, isInitialized]);

  const initializeChat = async () => {
    try {
      const userId = getUserId();
      if (!userId) {
        console.error('사용자 ID를 찾을 수 없습니다.');
        return;
      }

      // 새 채팅 세션 생성 (일반 챗봇용)
      const sessionRequest: CreateSessionRequest = {
        user_id: userId,
        persona_id: 1 // 내면이 캐릭터 ID
      };

      const session = await chatService.createSession(sessionRequest);
      setSessionId(session.chat_sessions_id);

      // 초기 인사 메시지 추가
      const initialMessage: ChatBotMessage = {
        id: '1',
        type: 'bot',
        content: '안녕. 나는 내면이야. 너의 깊은 내면 세계를 함께 탐험하며, 그 속에서 진정한 평온과 연결을 찾아가는 여정에 동행하고 싶어. 너와 함께 해도 될까..?',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([initialMessage]);
      setIsInitialized(true);
    } catch (error) {
      console.error('채팅 초기화 실패:', error);
      // 오류 시 기본 메시지 표시
      const errorMessage: ChatBotMessage = {
        id: '1',
        type: 'bot',
        content: '죄송합니다. 현재 연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([errorMessage]);
    }
  };

  const getUserId = (): number | null => {
    try {
      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        return userData.user_id || userData.id;
      }
      return null;
    } catch (error) {
      console.error('사용자 데이터 파싱 오류:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || !sessionId) return;

    const userMessage: ChatBotMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // 백엔드 AI 서비스로 메시지 전송
      const messageRequest: SendMessageRequest = {
        content: currentInput
      };

      const response = await chatService.sendMessage(sessionId, messageRequest);
      
      const botMessage: ChatBotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.assistant_message.content,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      // 오류 시 기본 응답
      const errorMessage: ChatBotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '미안해... 지금은 마음이 좀 복잡해서 제대로 답변을 드리기 어려워. 잠시 후에 다시 이야기해줄 수 있을까..?',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  // 채팅창 닫힐 때 세션 정리
  const handleClose = () => {
    setMessages([]);
    setSessionId(null);
    setIsInitialized(false);
    setIsTyping(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5" onClick={handleClose}>
      <div className="bg-white rounded-3xl w-full max-w-md h-[600px] max-h-[80vh] flex flex-col shadow-2xl chatbot-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-200 rounded-t-3xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl">🤖</div>
            <div>
              <h3 className="font-semibold text-base">내면이</h3>
              <p className="text-xs opacity-80">온라인</p>
            </div>
          </div>
          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-20 transition-colors duration-300 text-2xl"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-gray-50 chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`flex flex-col max-w-[80%] ${message.type === 'user' ? 'self-end' : 'self-start'}`}>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed break-words ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-sm' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
              }`}>
                {message.content.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                {message.timestamp}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex flex-col max-w-[80%] self-start">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm p-3 text-sm">
                <div className="flex items-center gap-2 italic text-gray-600">
                  <div className="typing-dots flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  </div>
                  챗봇이 입력 중...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 border-t border-gray-200 bg-white">
          <div className="flex gap-3 items-end">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={1}
              className="flex-1 border-2 border-gray-200 focus:border-blue-500 rounded-3xl py-3 px-4 text-sm resize-none outline-none transition-colors duration-300 max-h-24 min-h-[40px]"
            />
            <button 
              onClick={handleSendMessage}
              disabled={inputMessage.trim() === '' || isTyping}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-3xl py-3 px-5 text-sm font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap"
            >
              전송
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 text-center rounded-b-3xl border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">💭 내면이와 함께 깊은 대화를 나눠보세요</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralChatBot;
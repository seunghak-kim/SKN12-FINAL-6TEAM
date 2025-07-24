import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import Modal from '../common/Modal';
import StarRating from '../common/StarRating';
import { FrontendChatMessage, SearchResult } from '../../types';
import { useChatSession } from '../../hooks/useChatSession';
import { authService } from '../../services/authService';

interface ChatPageProps {
  selectedCharacter: SearchResult | null;
  showRatingModal: boolean;
  onShowRating: () => void;
  onCloseRatingModal: () => void;
  onNavigate?: (screen: string) => void;
  onInitializeChat?: () => void;
  // 새로 추가된 props
  userId?: number;
  friendsId?: number;
}

const ChatPage: React.FC<ChatPageProps> = ({
  selectedCharacter,
  showRatingModal,
  onShowRating,
  onCloseRatingModal,
  onNavigate,
  onInitializeChat,
  userId, // 외부에서 전달받거나 내부에서 계산
  friendsId // 외부에서 전달받거나 selectedCharacter에서 가져옴
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [currentRating, setCurrentRating] = useState(3);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarMessagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // FastAPI 연동을 위한 훅 사용 (Hook들은 early return 이전에 호출되어야 함)
  const {
    session,
    messages: chatMessages,
    isLoading,
    isSending,
    error,
    greeting,
    createSession,
    sendMessage,
    loadSession,
    clearError,
    clearMessages,
    loadGreeting
  } = useChatSession();

  // 실제 사용자 ID 가져오기
  const [realUserId, setRealUserId] = useState<number | null>(null);
  const currentUserId = userId || realUserId;
  const currentFriendsId = friendsId || (selectedCharacter ? parseInt(selectedCharacter.id) : 1);
  
  // 컴포넌트 마운트 시 실제 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setRealUserId(user.id);
          console.log('현재 로그인된 사용자:', user);
        } else {
          console.log('로그인된 사용자 없음');
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    
    loadCurrentUser();
  }, []);
  
  console.log('ChatPage 사용자 ID 정보:', {
    userId: userId,
    realUserId: realUserId,
    authServiceId: authService.getCurrentUserId(),
    currentUserId: currentUserId,
    isAuthenticated: authService.isAuthenticated()
  });

  // 초기 메시지를 한 번만 생성하고 저장
  const [initialMessage] = useState(() => {
    const characterMessages: { [key: string]: string[] } = {
      '추진이': [
        "안녕하세요! 오늘 달성하고 싶은 목표가 있나요?",
        "무엇을 이루고 싶으신지 말해보세요. 함께 효율적인 방법을 찾아보죠!",
        "성공을 향한 첫 걸음을 내딛어보세요. 어떤 도전이 기다리고 있나요?",
        "목표가 명확하면 길이 보입니다. 무엇부터 시작할까요?"
      ],
      '공감형': [
        "안녕하세요. 오늘 하루는 어떠셨나요?",
        "마음이 편안한 곳에서 이야기해보세요. 무엇이든 들어드릴게요.",
        "혼자서 힘드셨을 텐데, 이제는 함께 이야기 나눠요.",
        "당신의 감정을 이해하고 공감해드리고 싶어요."
      ],
      '분석형': [
        "안녕하세요. 어떤 문제를 해결하고 싶으신가요?",
        "상황을 차근차근 분석해보겠습니다. 자세히 말씀해주세요.",
        "논리적으로 접근해보죠. 핵심 문제가 무엇인지 파악해보세요.",
        "체계적으로 정리하면 해답이 보일 거예요."
      ],
      '창의형': [
        "안녕하세요! 새로운 아이디어가 떠오르는 시간이에요!",
        "상상력을 발휘해서 색다른 관점으로 접근해볼까요?",
        "창의적인 해결책을 함께 찾아보겠습니다!",
        "틀에 박힌 생각에서 벗어나 자유롭게 이야기해보세요."
      ]
    };

    const characterName = selectedCharacter?.name || '공감형';
    const messages = characterMessages[characterName] || characterMessages['공감형'];
    return messages[Math.floor(Math.random() * messages.length)];
  });

  // 모든 useEffect들을 early return 이전에 위치시킴
  useEffect(() => {
    // 컴포넌트가 마운트되면 입력창에 포커스
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // URL 파라미터에서 세션 ID를 확인하고 세션을 로드하거나 새로 생성
  useEffect(() => {
    if (!session && !isLoading) {
      // 중복 호출 방지를 위한 플래그
      let isCancelled = false;
      
      const initializeSession = async () => {
        if (isCancelled) return;
        
        try {
          // URL 파라미터에서 세션 ID 확인
          const urlParams = new URLSearchParams(location.search);
          const sessionId = urlParams.get('sessionId');
          
          if (sessionId) {
            // 기존 세션 로드
            console.log('기존 세션 로드 시도:', sessionId);
            await loadSession(sessionId);
          } else if (selectedCharacter && currentUserId !== null) {
            // 새 세션 생성
            console.log('새 세션 생성 시도:', { userId: currentUserId, friendsId: currentFriendsId, characterName: selectedCharacter.name });
            
            // 사용자 인증 상태 재확인 (좀 더 관대하게)
            if (!authService.isAuthenticated() && !localStorage.getItem('access_token')) {
              console.error('사용자가 로그인되어 있지 않습니다.');
              alert('로그인이 필요합니다. 다시 로그인해주세요.');
              navigate('/');
              return;
            }
            
            await createSession({
              user_id: currentUserId,
              friends_id: currentFriendsId,
              session_name: `${selectedCharacter.name}와의 대화`
            });
          }
        } catch (error) {
          console.error('세션 초기화 실패:', error);
        }
      };
      
      initializeSession();
      
      // cleanup function
      return () => {
        isCancelled = true;
      };
    }
  }, [selectedCharacter?.name, session, isLoading, currentUserId, currentFriendsId, createSession, loadSession, location.search]);

  // 레거시 초기화 함수 호출 (기존 코드와의 호환성 유지)
  useEffect(() => {
    if (onInitializeChat) {
      onInitializeChat();
    }
  }, [onInitializeChat]);

  useEffect(() => {
    // 메시지가 업데이트될 때마다 스크롤을 맨 아래로
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // 사이드바 채팅도 맨 아래로 스크롤
    if (sidebarMessagesEndRef.current) {
      sidebarMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    // 전송 완료 후 입력창에 포커스
    if (!isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSending]);

  // 에러 표시 처리
  useEffect(() => {
    if (error) {
      console.error('채팅 오류:', error);
      // 필요한 경우 사용자에게 에러 메시지 표시
    }
  }, [error]);

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트 (지연 적용)
  useEffect(() => {
    // 약간의 지연을 두어 사용자 정보가 로드되기를 기다림
    const timeoutId = setTimeout(() => {
      if (realUserId === null && !authService.isAuthenticated()) {
        console.log('사용자가 로그인되어 있지 않습니다. 메인 페이지로 리다이렉트합니다.');
        navigate('/');
      }
    }, 2000); // 2초 지연
    
    return () => clearTimeout(timeoutId);
  }, [realUserId, navigate]);

  // 로딩 타임아웃 관리
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 3000); // 3초 후 로딩 화면 숨김
    
    if (currentUserId) {
      setShowLoading(false);
    }
    
    return () => clearTimeout(timer);
  }, [currentUserId]);
  
  if (!currentUserId && showLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || isSending || isChatEnded) return;
    const messageToSend = inputMessage.trim();
    
    // 즉시 입력창 비우기
    setInputMessage('');
    
    // 강제로 입력창 비우기
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    // 약간의 딜레이를 두고 다시 한 번 비우기
    setTimeout(() => {
      setInputMessage('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }, 0);
    
    // FastAPI를 통해 메시지 전송
    if (session) {
      try {
        await sendMessage(messageToSend);
      } catch (error) {
        console.error('메시지 전송 실패:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRatingChange = (rating: number) => {
    setCurrentRating(rating);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleEndChat = async () => {
    setIsChatEnded(true);
    
    // 필요한 경우 세션 통계 로드
    if (session) {
      try {
        // 세션 통계 정보 가져오기 (나중에 사용할 수 있음)
        // await loadStats(session.chat_sessions_id);
      } catch (error) {
        console.error('세션 통계 로드 실패:', error);
      }
    }
  };

  const getLastBotMessage = () => {
    const botMessages = chatMessages.filter(msg => msg.type !== 'user');
    return botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;
  };



  const lastBotMessage = getLastBotMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />

      <div className="flex max-w-7xl mx-auto relative">
        {/* Toggle Button - Bookmark Style */}
        <button
          onClick={toggleSidebar}
          className={`fixed top-24 z-50 bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-blue-600 ${
            sidebarVisible ? 'right-80' : 'right-0'
          }`}
          style={{
            width: '60px',
            height: '80px',
            borderRadius: sidebarVisible ? '8px 0 0 8px' : '0 8px 8px 0',
            clipPath: sidebarVisible ? 'none' : 'polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0% 50%)'
          }}
        >
          <div className="flex flex-col items-center justify-center h-full">
            {sidebarVisible ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <>
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs font-medium">채팅</span>
              </>
            )}
          </div>
        </button>

        {/* Main Content */}
        <div className={`flex-1 p-8 transition-all duration-300 ${sidebarVisible ? 'mr-80' : ''}`}>
          <div className="max-w-2xl mx-auto">
            {/* Character */}
            <div className="flex justify-center mb-8">
              <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                <img 
                  src="/assets/character.png" 
                  alt={selectedCharacter?.name || '안정이'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Last Bot Message Display */}
            {(lastBotMessage || chatMessages.length === 0) && (
              <div className="bg-gray-300 rounded-2xl p-6 mb-8 text-center">
                <p className="text-gray-800 text-lg font-medium break-words word-wrap overflow-wrap">
                  {lastBotMessage?.content || greeting || initialMessage}
                </p>
              </div>
            )}

            {/* Input Area */}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isChatEnded ? '대화가 종료되었습니다' : `${selectedCharacter?.name || '안정이'}에게 고민이나 질문을 물어보세요`}
                className="flex-1 rounded-full border-gray-300 px-6 py-3 text-base border focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={handleKeyPress}
                autoFocus
                disabled={isSending || isChatEnded}
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || inputMessage.trim() === '' || isChatEnded}
                className="rounded-full px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChatEnded ? '종료됨' : isSending ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>

        {/* Chat History Sidebar */}
        {sidebarVisible && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-40 transition-transform duration-300 transform translate-x-0 border-l border-gray-200">
            <div className="p-6 pt-20 h-full flex flex-col">
              {/* Header */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  채팅 내역
                </h2>
                <p className="text-sm text-gray-500 mt-1">{selectedCharacter?.name || '안정이'}와의 대화</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-6">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">아직 대화가 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">메시지를 보내서 대화를 시작해보세요</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] ${message.type === 'user' ? '' : ''}`}>
                        <div
                          className={`rounded-2xl px-4 py-2 shadow-sm ${
                            message.type === 'user' 
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100 text-gray-800 border border-gray-200"
                          }`}
                        >
                          <p className="text-sm leading-relaxed word-wrap">{message.content}</p>
                        </div>
                        <p className={`text-xs mt-1 ${
                          message.type === 'user' ? "text-right text-blue-200" : "text-left text-gray-400"
                        }`}>
                          {(() => {
                            try {
                              const timestamp = message.timestamp || new Date().toISOString();
                              const date = new Date(timestamp);
                              
                              if (isNaN(date.getTime())) {
                                return new Date().toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                });
                              }
                              
                              return date.toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                            } catch (error) {
                              return new Date().toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={sidebarMessagesEndRef} />
              </div>
              
              {/* Actions */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <button 
                  onClick={onShowRating}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 px-4 rounded-xl transition-colors flex items-center justify-center font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  다른 캐릭터와 대화하기
                </button>
                <button 
                  onClick={handleEndChat}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg transition-colors text-sm"
                  disabled={isChatEnded}
                >
                  {isChatEnded ? '대화가 종료됨' : '대화 종료'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showRatingModal} onClose={onCloseRatingModal} className="rating-modal">
        <h3>만족도 조사</h3>
        <div className="rating-section">
          <StarRating 
            initialRating={3}
            onRatingChange={handleRatingChange}
            centered={true}
          />
          <p className="rating-text">
            {currentRating > 0 && `${currentRating}점을 선택하셨습니다.`}
          </p>
        </div>
        <div className="rating-feedback">
          <h4>기타 의견(선택)</h4>
          <textarea placeholder="이 캐릭터는 제 취향 돋구었어요, 저에게 딱 맞는 해결책을 제시해줬어요 등 챗봇에 대한 의견을 자유롭게 적어주세요"></textarea>
          <button 
            className="submit-btn"
            onClick={() => {
              onCloseRatingModal();
              navigate('/characters');
            }}
          >
            다른 캐릭터랑도 대화해보기
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;
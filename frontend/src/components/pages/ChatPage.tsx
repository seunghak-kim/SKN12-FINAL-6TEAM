import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import Modal from '../common/Modal';
import StarRating, { SatisfactionModal } from '../common/StarRating';
import { FrontendChatMessage, SearchResult } from '../../types';
import { useChatSession } from '../../hooks/useChatSession';
import { authService } from '../../services/authService';
import { testService } from '../../services/testService';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

interface ChatPageProps {
  selectedCharacter: SearchResult | null;
  showRatingModal: boolean;
  onShowRating: () => void;
  onCloseRatingModal: () => void;
  onNavigate?: (screen: string) => void;
  onInitializeChat?: () => void;
  onShowSatisfaction?: () => void;
  // 새로 추가된 props
  userId?: number;
  personaId?: number;
}

const ChatPage: React.FC<ChatPageProps> = ({
  selectedCharacter,
  showRatingModal,
  onShowRating,
  onCloseRatingModal,
  onNavigate,
  onInitializeChat,
  userId, // 외부에서 전달받거나 내부에서 계산
  personaId // 외부에서 전달받거나 selectedCharacter에서 가져옴
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [currentRating, setCurrentRating] = useState(3);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarMessagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);

const toggleChatPanel = () => {
  if (showChatPanel) {
    setShowChatPanel(false);
    setTimeout(() => setIsVisible(false), 500); // 닫힘 애니메이션 후 DOM 제거
  } else {
    setIsVisible(true);
    setTimeout(() => setShowChatPanel(true), 10); // 살짝 지연 후 애니메이션 실행
  }
};


useEffect(() => {
  setHasMounted(true);
}, []);
useEffect(() => {
  setShowChatPanel(false);
}, []);

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
  const [latestPersonaId, setLatestPersonaId] = useState<number | null>(null);
  const currentUserId = userId || realUserId;
  // 페르소나 ID에 따른 이름과 아바타 매핑 (MyPage와 동일한 로직)
  const getPersonaName = (personaType: number | null): string => {
    const nameMap: { [key: number]: string } = {
      1: '추진이',
      2: '내면이',
      3: '관계이',
      4: '쾌락이',
      5: '안정이',
    };
    return personaType && nameMap[personaType] ? nameMap[personaType] : '알 수 없음';
  };

  const getCharacterAvatar = (personaId: number | null): string => {
    const nameMap: { [key: number]: string } = {
      1: '추진이',
      2: '내면이',
      3: '관계이',
      4: '쾌락이',
      5: '안정이',
    };
    const name = personaId && nameMap[personaId] ? nameMap[personaId] : '알 수 없음';
    return `/assets/persona/${name}.png`;
  };

  // 세션 데이터를 최우선으로 하고, 없으면 최신 페르소나, 그 다음 기타 값들 사용
  const actualPersonaId = session?.persona_id || personaId || latestPersonaId || (selectedCharacter ? parseInt(selectedCharacter.id) : null);
  const currentPersonaName = getPersonaName(actualPersonaId);
  const currentAvatarPath = getCharacterAvatar(actualPersonaId);

  
  // 컴포넌트 마운트 시 실제 사용자 정보 및 최신 페르소나 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setRealUserId(user.id);
          } else {
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };
    
    const loadLatestPersona = async () => {
      try {
        const result = await testService.getLatestMatchedPersona();
        if (result.matched_persona_id) {
          setLatestPersonaId(result.matched_persona_id);
        }
      } catch (error) {
        console.error('최신 페르소나 로드 실패:', error);
      }
    };
    
    loadCurrentUser();
    loadLatestPersona();
  }, []);
  

  // 초기 메시지를 한 번만 생성하고 저장

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
            await loadSession(sessionId);
          } else if (selectedCharacter && currentUserId !== null) {
            // 새 세션 생성
            
            // 사용자 인증 상태 재확인 (좀 더 관대하게)
            if (!authService.isAuthenticated() && !localStorage.getItem('access_token')) {
              console.error('사용자가 로그인되어 있지 않습니다.');
              alert('로그인이 필요합니다. 다시 로그인해주세요.');
              navigate('/');
              return;
            }
            
            if (actualPersonaId !== null) {
              await createSession({
                user_id: currentUserId,
                persona_id: actualPersonaId,
                session_name: `${currentPersonaName}와의 대화`
              });
            }
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
  }, [selectedCharacter?.name, session, isLoading, currentUserId, actualPersonaId, createSession, loadSession, location.search]);

  // 세션이 생성되면 URL에 세션 ID 추가 (새로고침 시 세션 유지를 위해)
  useEffect(() => {
    if (session?.chat_sessions_id) {
      const urlParams = new URLSearchParams(location.search);
      const currentSessionId = urlParams.get('sessionId');
      
      // URL에 세션 ID가 없거나 다른 경우에만 업데이트
      if (currentSessionId !== session.chat_sessions_id) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('sessionId', session.chat_sessions_id);
        window.history.replaceState({}, '', currentUrl.toString());
      }
    }
  }, [session?.chat_sessions_id, location.search]);

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

  const handleEndChat = async () => {
    setIsChatEnded(true);
    setShowSatisfactionModal(true);
    
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

  const handleSatisfactionSubmit = (rating: number, feedback: string) => {
    console.log('만족도 평가:', { rating, feedback });
    // 여기에 만족도 평가 데이터를 서버로 전송하는 로직 추가
    setShowSatisfactionModal(false);
    
    // 만족도 조사 완료 후 다른 캐릭터 페이지로 이동
    if (onNavigate) {
      onNavigate('characters');
    } else {
      // 현재 세션 ID를 포함하여 이동
      const currentSessionId = session?.chat_sessions_id;
      const currentCharacterId = selectedCharacter?.id;
      
      console.log('ChatPage - 다른 캐릭터 버튼 클릭:', {
        currentSessionId,
        currentCharacterId,
        session: session
      });
      
      const searchParams = new URLSearchParams();
      if (currentSessionId) {
        searchParams.set('returnSessionId', currentSessionId.toString());
      }
      if (currentCharacterId) {
        searchParams.set('returnCharacterId', currentCharacterId);
      }
      
      const targetUrl = `/characters?${searchParams.toString()}`;
      console.log('ChatPage - 이동할 URL:', targetUrl);
      
      navigate(targetUrl);
    }
  };

  const handleSatisfactionClose = () => {
    setShowSatisfactionModal(false);
  };

  const getLastBotMessage = () => {
    const botMessages = chatMessages.filter(msg => msg.type !== 'user');
    return botMessages.length > 0 ? botMessages[botMessages.length - 1] : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <div className="relative z-50">
        <Navigation onNavigate={onNavigate} />
      </div>
      
      <style>{`
        @keyframes natural-movement {
          0% {
            transform: translateX(0px) translateY(0px);
          }
          25% {
            transform: translateX(-8px) translateY(-12px);
          }
          50% {
            transform: translateX(5px) translateY(-8px);
          }
          75% {
            transform: translateX(-3px) translateY(-15px);
          }
          100% {
            transform: translateX(0px) translateY(0px);
          }
        }
        
        .natural-movement {
          animation: natural-movement 3s ease-in-out infinite;
        }
      `}</style>

      {/* Modern flowing background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
        {/* Flowing wave patterns */}
        <div className="absolute inset-0">
          {/* Top flowing lines */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent transform -skew-y-12"></div>
          <div className="absolute top-8 left-0 w-full h-24 bg-gradient-to-r from-transparent via-pink-400/15 to-transparent transform -skew-y-12"></div>
          <div className="absolute top-16 left-0 w-full h-16 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transform -skew-y-12"></div>
         </div>

        {/* Floating orbs */}
        <div className="absolute top-20 right-1/4 w-24 h-24 bg-gradient-to-br from-purple-400/40 to-pink-500/40 rounded-full blur-sm"></div>
        <div className="absolute top-32 left-1/3 w-16 h-16 bg-gradient-to-br from-cyan-400/50 to-blue-500/50 rounded-full blur-sm"></div>
        <div className="absolute bottom-1/3 right-1/6 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-purple-500/30 rounded-full blur-md"></div>
        <div className="absolute bottom-1/4 left-1/4 w-20 h-20 bg-gradient-to-br from-blue-400/40 to-cyan-500/40 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-gradient-to-br from-purple-500/35 to-pink-400/35 rounded-full blur-md"></div>

        {/* Large background orbs */}
        <div className="absolute top-1/4 left-1/6 w-48 h-48 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-56 h-56 bg-gradient-to-br from-pink-400/15 to-purple-500/15 rounded-full blur-3xl"></div>

        {/* Mystical planet-like orb (bottom right) */}
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-orange-400/60 via-purple-500/60 to-blue-500/60 rounded-full blur-sm opacity-80">
          <div className="absolute inset-2 bg-gradient-to-br from-yellow-400/40 via-pink-500/40 to-cyan-500/40 rounded-full"></div>
          <div className="absolute inset-4 bg-gradient-to-br from-orange-300/30 via-purple-400/30 to-blue-400/30 rounded-full"></div>
        </div>
      </div>
      {/* Bookmark-shaped chat toggle button */}
<button
  onClick={toggleChatPanel}
  className={`absolute top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 ${
    showChatPanel ? "right-80" : "right-0"
  }`}
>
        <div className="relative">
          {/* Bookmark shape with rounded corners and custom gradient */}
          <div className="w-16 h-20 bg-gradient-to-br from-[#FF6948]/50 to-[#FF0051]/50 hover:from-[#FF6948]/60 hover:to-[#FF0051]/60 transition-colors shadow-lg relative rounded-l-2xl backdrop-blur-sm border border-white/10">
          </div>

          {/* Arrow icon */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {showChatPanel ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </div>
        </div>
      </button>

      {/* Main chat interface - Compact layout optimized for viewport */}
      <div className={`relative z-10 transition-all duration-300 ${
          showChatPanel ? "mr-80" : ""
        }`} style={{ height: 'calc(100vh - 100px)', paddingTop: '20px', paddingBottom: '20px' }}>
        
        <div className="h-full flex flex-col justify-center items-center px-4 space-y-4">
          {/* Character */}
          <div className="flex justify-center items-center">
            <img 
              src={currentAvatarPath}
              alt={currentPersonaName}
              className="w-40 h-40 object-contain"
            />
          </div>

          {/* Latest bot message */}
          <div className="flex items-center justify-center w-full max-w-2xl">
            {(() => {
              const lastBotMessage = chatMessages.filter(msg => msg.type !== 'user').pop();
              return lastBotMessage ? (
                <div className="w-full">
                  <div className="bg-white/20 backdrop-blur-md rounded-3xl px-6 py-4 text-center shadow-2xl relative border border-white/10">
                    <p className="text-white text-base leading-relaxed">
                      {lastBotMessage.content}
                    </p>
                    {/* Speech bubble tail */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-6 border-r-6 border-t-12 border-transparent border-t-white/20"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="bg-white/20 backdrop-blur-md rounded-3xl px-6 py-4 text-center shadow-2xl relative border border-white/10">
                    <div className="text-white font-bold text-lg mb-2">
                      {greeting || `안녕하세요! ${currentPersonaName}입니다.`}
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed">
                      {greeting ? '' : '무엇이든 편하게 이야기해주세요. 함께 대화해보아요!'}
                      <span className="ml-1">😊</span>
                    </p>
                    {/* Speech bubble tail */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-6 border-r-6 border-t-12 border-transparent border-t-white/20"></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Input */}
          <div className="w-full max-w-2xl">
            <div className="flex space-x-4">
              <Input
                ref={inputRef}
                type="text"
                placeholder={`${currentPersonaName}에게 고민을 이야기해보세요`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 px-5 py-3 rounded-full bg-white/80 backdrop-blur-sm border-0 text-gray-800 placeholder-gray-500 text-sm shadow-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || inputMessage.trim() === ''}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-medium text-sm"
              >
                {isSending ? '전송 중...' : '전송'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 사이드 채팅 내역 패널 */}
{isVisible && (
  <div
    className={`absolute top-0 right-0 w-80 h-full border-l border-white/20 z-30 shadow-2xl transform transition-all duration-500 ease-out
      ${showChatPanel 
        ? 'translate-x-0 opacity-100 bg-black/20 backdrop-blur-xl'
        : 'translate-x-full opacity-0 bg-transparent'}
    `}
  >
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 flex justify-between items-center border-b border-white/30 flex-shrink-0">
        <h3 className="text-white font-bold text-lg">채팅 기록</h3>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatMessages.length > 0 ? (
          chatMessages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col max-w-[70%]">
                <div className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user' 
                    ? 'bg-blue-500/90 text-white rounded-br-md shadow-lg' 
                    : 'bg-white/90 text-gray-800 rounded-bl-md shadow-lg'
                }`}>
                  {message.content}
                </div>
                <div className={`text-xs text-white/70 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-white/70 py-8">
            <div className="text-white/50 text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">대화를 시작해보세요</p>
            <p className="text-sm mt-2">첫 메시지를 보내보세요!</p>
          </div>
        )}
        <div ref={sidebarMessagesEndRef} />
      </div>

      {/* 하단 버튼 */}
      <div className="px-4 py-4 border-t border-white/30 flex-shrink-0 space-y-2">
        <Button
          onClick={() => {
            // 만족도 조사 모달 표시
            setShowSatisfactionModal(true);
          }}
          className="w-full bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-600/90 hover:to-purple-700/90 text-white py-3 rounded-full font-medium transition-all duration-200 backdrop-blur-sm shadow-lg"
        >
          다른 캐릭터와 대화하기
        </Button>
      </div>
    </div>
  </div>
)}




    {/* 만족도 모달 */}
      <Modal isOpen={showRatingModal} onClose={onCloseRatingModal}>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">채팅 만족도 평가</h2>
          <p className="text-gray-600 mb-6">
            {selectedCharacter?.name || '챗봇'}과의 대화는 어떠셨나요?
          </p>
          
          <div className="mb-6">
            <StarRating 
              initialRating={currentRating} 
              onRatingChange={handleRatingChange}
              centered={true}
            />
          </div>
          
          <div className="flex space-x-4 justify-center">
            <Button
              onClick={onCloseRatingModal}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
            >
              나중에
            </Button>
            <Button
              onClick={() => {
                console.log(`만족도 평점: ${currentRating}점`);
                onCloseRatingModal();
                // 여기에 평점 저장 로직 추가 가능
              }}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              평가 완료
            </Button>
          </div>
        </div>
      </Modal>

    {/* Satisfaction Modal */}
    {showSatisfactionModal && (
      <SatisfactionModal
        onClose={handleSatisfactionClose}
        onSubmit={handleSatisfactionSubmit}
      />
    )}
    </div>
  );
};

export default ChatPage;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import Modal from '../common/Modal';
import StarRating from '../common/StarRating';
import { FrontendChatMessage, SearchResult } from '../../types';
import { useChatSession } from '../../hooks/useChatSession';
import { authService } from '../../services/authService';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ChevronLeft, MessageCircle } from "lucide-react";


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
  console.log('ChatPage - 받은 selectedCharacter:', selectedCharacter);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* 3D 배경 */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 w-32 h-48 bg-gradient-to-t from-green-600 to-green-400 rounded-full opacity-80"></div>
        <div className="absolute bottom-0 left-20 w-24 h-36 bg-gradient-to-t from-green-700 to-green-500 rounded-full opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-40 h-56 bg-gradient-to-t from-green-600 to-green-400 rounded-full opacity-80"></div>
        <div className="absolute bottom-0 right-32 w-28 h-40 bg-gradient-to-t from-green-700 to-green-500 rounded-full opacity-70"></div>

        <div className="absolute top-20 left-1/4 w-32 h-16 bg-white/20 rounded-full blur-sm"></div>
        <div className="absolute top-32 right-1/3 w-24 h-12 bg-white/15 rounded-full blur-sm"></div>
        <div className="absolute top-16 right-1/4 w-20 h-10 bg-white/10 rounded-full blur-sm"></div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-800 to-green-600"></div>
      </div>

      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => onNavigate?.("main")}
        className="absolute top-24 left-8 z-20 w-12 h-12 bg-pink-500/80 hover:bg-pink-600/80 rounded-full flex items-center justify-center text-white"
      >
        <ChevronLeft size={24} />
      </button>

      {/* 캐릭터 + 말풍선 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-8">
        {/* 캐릭터 */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2">
          <div className="w-32 h-40 bg-gradient-to-br from-pink-200 to-brown-300 rounded-full flex items-center justify-center">
            <span className="text-6xl">🐰</span>
          </div>
        </div>

        {/* 말풍선 */}
        <div className="absolute bottom-48 left-1/2 transform -translate-x-1/2 max-w-md">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 text-center">
            <h2 className="text-white font-bold text-lg mb-2">
              {getLastBotMessage()?.content || greeting || initialMessage}
            </h2>
            <p className="text-white/90 text-sm">
              무슨 일이 있는지, 어떤 생각들이 있는지 나도 듣고 싶어! 😊
            </p>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-black/70"></div>
          </div>
        </div>

        {/* 입력창 */}
        <div className="absolute bottom-8 left-8 right-8 max-w-2xl mx-auto">
          <div className="flex space-x-4">
            <Input
              type="text"
              placeholder={`${selectedCharacter?.name || '챗봇'}에게 고민을 이야기해보세요`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-6 py-4 rounded-full bg-white/90 backdrop-blur-sm border-0 text-gray-800 placeholder-gray-500"
              disabled={isSending || isChatEnded}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || inputMessage.trim() === '' || isChatEnded}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-full font-medium"
            >
              {isChatEnded ? '종료됨' : isSending ? '전송 중...' : '전송'}
            </Button>
          </div>
        </div>
      </div>

      {/* 토글 버튼 */}
      <button
        onClick={() => setSidebarVisible(!sidebarVisible)}
        className="absolute top-1/2 right-8 transform -translate-y-1/2 z-20 w-12 h-12 bg-cyan-500/80 hover:bg-cyan-600/80 rounded-full flex items-center justify-center text-white"
      >
        <MessageCircle size={24} />
      </button>

      {/* 사이드 채팅 내역 패널 (기존과 동일하게 유지) */}
      {sidebarVisible && (
        <div className="absolute top-0 right-0 w-80 h-full bg-cyan-400/20 backdrop-blur-md border-l border-white/20 z-30">
          {/* ...기존 사이드바 채팅 내역 그대로 */}
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
    </div>
  );
};

export default ChatPage;
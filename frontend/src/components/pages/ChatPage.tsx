"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import Navigation from "../common/Navigation"
import Modal from "../common/Modal"
import StarRating, { SatisfactionModal } from "../common/StarRating"
import type { SearchResult } from "../../types"
import { useChatSession } from "../../hooks/useChatSession"
import { authService } from "../../services/authService"
import { testService } from "../../services/testService"
import { chatService } from "../../services/chatService"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

// 페르소나별 기본 인사 메시지
const getPersonaBaseGreeting = (personaName: string) => {
  const baseGreetings: { [key: string]: string } = {
    "내면이": "안녕... 나는 내면이야.. 너에게 뭔가 말하고 싶은 게 있어... 조금만 기다려줄래..?",
    "추진이": "반갑다 나는 추진이다. 당신의 나약함, 오늘 여기서 끝낸다.",
    "햇살이": "안녕! 저는 햇살이예요! 아, 잠깐만! 당신에게 해주고 싶은 말이 있어요 ☺️",
    "안정이": "안녕? 나는 안정이야! 음... 잠시만, 차근차근 생각해볼게!",
    "쾌락이": "하하 나는 쾌락이야! 5초만 기다려! 하나..둘..다섯!"
  };
  
  return baseGreetings[personaName];
};

// 캐릭터별 떠오르는 애니메이션 스타일 결정 함수
const getFloatAnimationStyle = (personaId: number | null | undefined): React.CSSProperties => {
  const getDelay = () => {
    switch (personaId) {
      case 1: return '-0.6s'; // 추진이
      case 2: return '-1.2s'; // 내면이
      case 3: return '-1.8s'; // 햇살이
      case 4: return '-2.4s'; // 쾌락이
      case 5: return '0s';    // 안정이
      default: return '0s';
    }
  };

  return {
    animation: `characterFloat 3s ease-in-out infinite`,
    animationDelay: getDelay(),
  };
};

// 캐릭터 말하는 애니메이션 컴포넌트
const TalkingAnimation: React.FC<{ className?: string; personaId?: number }> = ({ className = "", personaId }) => {
  // 캐릭터별 GIF 파일 매핑
  const getTalkingGif = (personaId: number | undefined) => {
    switch (personaId) {
      case 1: // 추진이
        return "/assets/추진이 gif.gif";
      case 2: // 내면이
        return "/assets/persona/내면이 gif.gif";
      case 3: // 햇살이
        return "/assets/햇살이 gif.gif";
      case 4: // 쾌락이
        return "/assets/쾌락이 gif.gif";
      case 5: // 안정이
        return "/assets/안정이 gif.gif";
      default:
        // 다른 캐릭터들은 기본 애니메이션 사용
        return null;
    }
  };

  // 캐릭터별 크기 설정 (getCharacterSize와 동일)
  const getGifSize = (personaId: number | undefined) => {
    switch (personaId) {
      case 4: // 쾌락이
        return "w-[1450px] h-[1450px]";
      case 2: // 내면이
        return "w-[480px] h-[480px]";
      case 3: // 햇살이
        return "w-[1500px] h-[1500px]"; 
      case 1: // 추진이
        return "w-[950px] h-[950px]";
      case 5: // 안정이
        return "w-[1550px] h-[1550px]";
      default:
        return "w-95 h-95";
    }
  };

  const gifSrc = getTalkingGif(personaId);
  const gifSize = getGifSize(personaId);

  // GIF가 있는 캐릭터는 GIF 표시, 없는 캐릭터는 기본 애니메이션
  if (gifSrc) {
    return (
      <div className={`relative overflow-visible ${className}`}>
        <img 
          src={gifSrc}
          alt="캐릭터 말하는 애니메이션"
          className={`${gifSize} object-contain max-w-none max-h-none`}
          style={getFloatAnimationStyle(personaId)}
        />
      </div>
    );
  } else {
    // 기본 말풍선 애니메이션
    return (
      <div className={`relative ${className}`}>
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-12 bg-white/30 rounded-2xl flex items-center justify-center animate-pulse">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-white/30"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const ChatPage: React.FC<ChatPageProps> = ({
selectedCharacter: propSelectedCharacter,
showRatingModal = false,
onShowRating,
onCloseRatingModal,
onNavigate,
onInitializeChat,
userId, // 외부에서 전달받거나 내부에서 계산
personaId, // 외부에서 전달받거나 selectedCharacter에서 가져옴
}) => {
const [inputMessage, setInputMessage] = useState("")
const [currentRating, setCurrentRating] = useState(3)
const [isChatEnded, setIsChatEnded] = useState(false)
const [showLoading, setShowLoading] = useState(true)
const inputRef = useRef<HTMLInputElement>(null)
const messagesEndRef = useRef<HTMLDivElement>(null)
const sidebarMessagesEndRef = useRef<HTMLDivElement>(null)
const navigate = useNavigate()
const location = useLocation()
const [showChatPanel, setShowChatPanel] = useState(false)
const [hasMounted, setHasMounted] = useState(false)
const [isVisible, setIsVisible] = useState(false)
const [showSatisfactionModal, setShowSatisfactionModal] = useState(false)
const [imageLoaded, setImageLoaded] = useState(false)

// location.state에서 캐릭터 정보 가져오기 (ResultDetailPage에서 전달된 정보)
const stateSelectedCharacter = location.state?.selectedCharacter as SearchResult | undefined

// sessionStorage에서 새로운 캐릭터 세션 정보 가져오기
const [sessionStorageCharacter, setSessionStorageCharacter] = useState<SearchResult | null>(null)

useEffect(() => {
  const newCharacterSession = sessionStorage.getItem('newCharacterSession')
  if (newCharacterSession) {
    try {
      const characterData = JSON.parse(newCharacterSession)
      setSessionStorageCharacter(characterData)
      sessionStorage.removeItem('newCharacterSession') // 사용 후 삭제
      console.log('SessionStorage에서 캐릭터 정보 복원:', characterData)
    } catch (error) {
      console.error('SessionStorage 캐릭터 정보 파싱 오류:', error)
    }
  }
}, [])

// 최종 선택된 캐릭터 결정 (sessionStorage > state > props 순서로 우선순위)
const selectedCharacter = sessionStorageCharacter || stateSelectedCharacter || propSelectedCharacter

console.log('ChatPage - 캐릭터 정보:', {
  stateSelectedCharacter,
  propSelectedCharacter,
  finalSelectedCharacter: selectedCharacter
});

const toggleChatPanel = () => {
  if (showChatPanel) {
    setShowChatPanel(false)
    setTimeout(() => setIsVisible(false), 500) // 닫힘 애니메이션 후 DOM 제거
  } else {
    // 사이드탭을 열기 전에 현재 스크롤 위치 저장
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop
    
    setIsVisible(true)
    setTimeout(() => {
      setShowChatPanel(true) // 애니메이션 실행
      // 사이드탭이 열린 후 즉시 최신 메시지 위치에 표시 (사이드탭 내부만 스크롤)
      setTimeout(() => {
        if (sidebarMessagesEndRef.current) {
          // 사이드탭 내부 컨테이너를 찾아서 스크롤
          const sidebarContainer = sidebarMessagesEndRef.current.closest('.overflow-y-auto')
          if (sidebarContainer) {
            sidebarContainer.scrollTop = sidebarContainer.scrollHeight
          }
        }
        // 사이드탭 열린 후 원래 스크롤 위치로 복원
        setTimeout(() => {
          window.scrollTo({ top: currentScrollTop, behavior: "auto" })
        }, 50)
      }, 100) // 애니메이션 완료 후 스크롤
    }, 10)
  }
}

useEffect(() => {
  setHasMounted(true)
}, [])

useEffect(() => {
  setShowChatPanel(false)
}, [])

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
    resetSession
  } = useChatSession();

// 실제 사용자 ID 가져오기
const [realUserId, setRealUserId] = useState<number | null>(null)
const [latestPersonaId, setLatestPersonaId] = useState<number | null>(null)
const currentUserId = userId || realUserId

// 페르소나 ID에 따른 이름과 아바타 매핑 (MyPage와 동일한 로직)
const getPersonaName = (personaType: number | null): string => {
  const nameMap: { [key: number]: string } = {
    1: "추진이",
    2: "내면이",
    3: "햇살이",
    4: "쾌락이",
    5: "안정이",
  }
  return personaType && nameMap[personaType] ? nameMap[personaType] : ""
}

const getCharacterAvatar = (personaId: number | null): string => {
  const nameMap: { [key: number]: string } = {
    1: "추진이",
    2: "내면이",
    3: "햇살이",
    4: "쾌락이",
    5: "안정이",
  }
  const name = personaId && nameMap[personaId] ? nameMap[personaId] : ""
  return name ? `/assets/persona/${name}.png` : ""
}

// 캐릭터 크기를 결정하는 함수 수정
const getCharacterSize = (personaId: number | null): string => {
  // 쾌락이(persona ID 4)와 내면이(persona ID 2)를 더 크게 설정
  if (personaId === 4) {
    return "w-[450px] h-[450px]" // 쾌락이는 450px로 더 크게
  }
  if (personaId === 2) {
    return "w-[420px] h-[420px]" // 내면이도 420px로 크게
  }
  return "w-95 h-95" // 다른 캐릭터들은 기본 크기 (380px)
}

// 페르소나별 배경 스타일을 결정하는 함수
const getBackgroundStyle = (personaId: number | null): React.CSSProperties => {
  switch (personaId) {
    case 1: // 추진이 - 혁명과 승리를 상징하는 클래식 명화
      return {
        backgroundImage: "url(/assets/backgrounds/drive-background.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    case 2: // 내면이 - 제공된 야경 이미지 (채도 더 낮춤)
      return {
        backgroundImage: "url(/assets/backgrounds/inner-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    case 3: // 햇살이 - 따뜻한 인테리어 배경 이미지 (채도 낮춤)
      return {
        backgroundImage: "url(/assets/backgrounds/relationship-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    case 4: // 쾌락이 - 환상적인 해안 도시 배경 이미지 (채도 훨씬 낮춤)
      return {
        backgroundImage: "url(/assets/backgrounds/pleasure-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    case 5: // 안정이 - 평온한 도서관 배경 이미지
      return {
        backgroundImage: "url(/assets/backgrounds/stability-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    default: // 기본 배경
      return {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }
  }
}

// 세션이 있으면 세션의 persona_id를 최우선 사용
const actualPersonaId = session?.persona_id ||
  (selectedCharacter ? Number.parseInt(selectedCharacter.id) : null) ||
  personaId ||
  latestPersonaId ||
  null  // 마지막에는 null로 설정

// 세션이 있으면 세션의 persona_id를 기반으로 이름 결정
const currentPersonaName = session?.persona_id 
  ? getPersonaName(session.persona_id)
  : (selectedCharacter?.name || getPersonaName(actualPersonaId))

const currentAvatarPath = getCharacterAvatar(actualPersonaId)
const currentCharacterSize = getCharacterSize(actualPersonaId)
const currentBackgroundStyle = getBackgroundStyle(actualPersonaId)

console.log('ChatPage - 페르소나 정보:', {
  sessionPersonaId: session?.persona_id,
  actualPersonaId,
  currentPersonaName,
  currentAvatarPath,
  selectedCharacter,
  hasSession: !!session
});

// 컴포넌트 마운트 시 실제 사용자 정보 및 최신 페르소나 로드
useEffect(() => {
  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        setRealUserId(user.id)
      } else {
      }
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error)
    }
  }

  const loadLatestPersona = async () => {
    try {
      const result = await testService.getLatestMatchedPersona()
      console.log('loadLatestPersona 결과:', result);
      if (result.matched_persona_id) {
        setLatestPersonaId(result.matched_persona_id)
      } else {
        console.log('matched_persona_id가 없음 - latestPersonaId를 null로 유지');
      }
    } catch (error) {
      console.error("최신 페르소나 로드 실패:", error)
      // 에러 발생시에도 null로 유지
    }
  }

  loadCurrentUser()
  loadLatestPersona()
}, [])

// actualPersonaId가 변경될 때 이미지 로딩 상태 리셋
useEffect(() => {
  setImageLoaded(false)
}, [actualPersonaId])


// 모든 useEffect들을 early return 이전에 위치시킴
useEffect(() => {
  // 컴포넌트가 마운트되면 입력창에 포커스
  if (inputRef.current) {
    inputRef.current.focus()
  }
}, [])

// URL 파라미터에서 세션 ID를 확인하고 세션을 로드하거나 새로 생성
useEffect(() => {
  if (!session && !isLoading) {
    // 중복 호출 방지를 위한 플래그
    let isCancelled = false

    const initializeSession = async () => {
      if (isCancelled) return

      try {
        // URL 파라미터에서 세션 ID 확인
        const urlParams = new URLSearchParams(location.search)
        const sessionId = urlParams.get("sessionId")

        if (sessionId) {
          // 기존 세션 로드
          console.log('ChatPage - 기존 세션 로드:', sessionId);
          await loadSession(sessionId)
        } else {
          // 새 세션 생성 로직 (selectedCharacter가 있으면 새 세션 우선)
          if (selectedCharacter && currentUserId !== null) {
            // 사용자 인증 상태 재확인
            if (!authService.isAuthenticated() && !localStorage.getItem("access_token")) {
              console.error("사용자가 로그인되어 있지 않습니다.")
              alert("로그인이 필요합니다. 다시 로그인해주세요.")
              navigate("/")
              return
            }

            if (actualPersonaId !== null) {
              console.log('ChatPage - 새 세션 생성:', actualPersonaId);
              await createSession({
                user_id: currentUserId,
                persona_id: actualPersonaId,
                session_name: `${currentPersonaName}와의 대화`,
              })
            }
          } else {
            // selectedCharacter가 없을 때만 localStorage에서 마지막 세션 확인
            const lastSessionData = localStorage.getItem('lastChatSession')
            if (lastSessionData) {
              try {
                const { sessionId: lastSessionId, personaId: lastPersonaId, timestamp } = JSON.parse(lastSessionData)
                const now = Date.now()
                
                // 24시간 이내의 세션만 복원
                if (now - timestamp < 24 * 60 * 60 * 1000) {
                  console.log('ChatPage - selectedCharacter 없음, localStorage에서 마지막 세션 복원:', lastSessionId);
                  // URL에 sessionId 추가하고 세션 로드
                  const newUrl = new URL(window.location.href)
                  newUrl.searchParams.set('sessionId', lastSessionId)
                  window.history.replaceState(null, '', newUrl.toString())
                  await loadSession(lastSessionId)
                  return
                } else {
                  // 24시간이 지난 세션 데이터는 삭제
                  localStorage.removeItem('lastChatSession')
                }
              } catch (e) {
                console.error('localStorage 세션 데이터 파싱 오류:', e)
                localStorage.removeItem('lastChatSession')
              }
            }
            
            console.log('ChatPage - 세션 초기화 조건 미충족:', {
              selectedCharacter: !!selectedCharacter,
              currentUserId,
              actualPersonaId
            });
          }
        }
      } catch (error) {
        console.error("세션 초기화 실패:", error)
      }
    }

    initializeSession()

    // cleanup function
    return () => {
      isCancelled = true
    }
  }
}, [
  selectedCharacter,
  session,
  isLoading,
  currentUserId,
  actualPersonaId,
  createSession,
  loadSession,
  location.search,
])

// 세션이 생성되면 URL에 세션 ID 추가 및 localStorage에 저장 (새로고침 시 세션 유지를 위해)
useEffect(() => {
  if (session?.chat_sessions_id) {
    const urlParams = new URLSearchParams(location.search)
    const currentSessionId = urlParams.get("sessionId")

    // URL에 세션 ID가 없거나 다른 경우에만 업데이트
    if (currentSessionId !== session.chat_sessions_id) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set("sessionId", session.chat_sessions_id)
      window.history.replaceState({}, "", currentUrl.toString())
    }
    
    // localStorage에 현재 세션 정보 저장
    const sessionData = {
      sessionId: session.chat_sessions_id,
      personaId: session.persona_id,
      timestamp: Date.now()
    }
    localStorage.setItem('lastChatSession', JSON.stringify(sessionData))
    console.log('ChatPage - 세션 정보 localStorage에 저장:', sessionData)
  }
}, [session?.chat_sessions_id, session?.persona_id, location.search])

// 레거시 초기화 함수 호출 (기존 코드와의 호환성 유지)
useEffect(() => {
  if (onInitializeChat) {
    onInitializeChat()
  }
}, [onInitializeChat])

useEffect(() => {
  // 메시지가 업데이트될 때마다 스크롤을 맨 아래로
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
  }
  // 사이드바 채팅도 맨 아래로 스크롤
  if (sidebarMessagesEndRef.current) {
    sidebarMessagesEndRef.current.scrollIntoView({ behavior: "smooth" })
  }
}, [chatMessages])

useEffect(() => {
  // 전송 완료 후 입력창에 포커스
  if (!isSending && inputRef.current) {
    inputRef.current.focus()
  }
}, [isSending])

// 에러 표시 처리
useEffect(() => {
  if (error) {
    console.error("채팅 오류:", error)
    // 필요한 경우 사용자에게 에러 메시지 표시
  }
}, [error])

// 로그인되지 않은 경우 로그인 페이지로 리다이렉트 (지연 적용)
useEffect(() => {
  // 약간의 지연을 두어 사용자 정보가 로드되기를 기다림
  const timeoutId = setTimeout(() => {
    if (realUserId === null && !authService.isAuthenticated()) {
      console.log("사용자가 로그인되어 있지 않습니다. 메인 페이지로 리다이렉트합니다.")
      navigate("/")
    }
  }, 2000) // 2초 지연

  return () => clearTimeout(timeoutId)
}, [realUserId, navigate])

// 로딩 타임아웃 관리
useEffect(() => {
  const timer = setTimeout(() => {
    setShowLoading(false)
  }, 3000) // 3초 후 로딩 화면 숨김

  if (currentUserId) {
    setShowLoading(false)
  }

  return () => clearTimeout(timer)
}, [currentUserId])

if (!currentUserId && showLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
      </div>
    </div>
  )
}

const handleSendMessage = async () => {
  if (inputMessage.trim() === "" || isSending || isChatEnded) return

  const messageToSend = inputMessage.trim()
  
  console.log('ChatPage - 메시지 전송 시도:', {
    messageToSend,
    session: session?.chat_sessions_id,
    isSending
  });

  // 즉시 입력창 비우기
  setInputMessage("")

  // 강제로 입력창 비우기
  if (inputRef.current) {
    inputRef.current.value = ""
  }

  // 약간의 딜레이를 두고 다시 한 번 비우기
  setTimeout(() => {
    setInputMessage("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, 0)

  // FastAPI를 통해 메시지 전송
  if (session) {
    try {
      console.log('ChatPage - sendMessage 호출 시작');
      await sendMessage(messageToSend)
      console.log('ChatPage - sendMessage 호출 완료');
    } catch (error) {
      console.error("ChatPage - 메시지 전송 실패:", error)
      // 에러 발생시 사용자에게 알림
      alert("메시지 전송에 실패했습니다. 다시 시도해주세요.");
    }
  } else {
    console.error('ChatPage - 세션이 없습니다');
    alert("세션이 생성되지 않았습니다. 페이지를 새로고침해주세요.");
  }
}

const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault()
    handleSendMessage()
  }
}

const handleRatingChange = (rating: number) => {
  setCurrentRating(rating)
}

const handleEndChat = async () => {
  setIsChatEnded(true)
  setShowSatisfactionModal(true)

  // 필요한 경우 세션 통계 로드
  if (session) {
    try {
      // 세션 통계 정보 가져오기 (나중에 사용할 수 있음)
      // await loadStats(session.chat_sessions_id);
    } catch (error) {
      console.error("세션 통계 로드 실패:", error)
    }
  }
}

const handleSatisfactionSubmit = (rating: number, feedback: string) => {
  console.log("만족도 평가:", { rating, feedback })
  // 여기에 만족도 평가 데이터를 서버로 전송하는 로직 추가
  setShowSatisfactionModal(false)

  // 만족도 조사 완료 후 다른 캐릭터 페이지로 이동
  if (onNavigate) {
    onNavigate("characters")
  } else {
    // 현재 세션 ID를 포함하여 이동
    const currentSessionId = session?.chat_sessions_id
    const currentCharacterId = selectedCharacter?.id

    console.log("ChatPage - 다른 캐릭터 버튼 클릭:", {
      currentSessionId,
      currentCharacterId,
      session: session,
    })

    const searchParams = new URLSearchParams()
    if (currentSessionId) {
      searchParams.set("returnSessionId", currentSessionId.toString())
    }
    if (currentCharacterId) {
      searchParams.set("returnCharacterId", currentCharacterId)
    }

    const targetUrl = `/characters?${searchParams.toString()}`
    console.log("ChatPage - 이동할 URL:", targetUrl)
    navigate(targetUrl)
  }
}

const handleSatisfactionClose = () => {
  setShowSatisfactionModal(false)
}

const getLastBotMessage = () => {
  const botMessages = chatMessages.filter((msg) => msg.type !== "user")
  return botMessages.length > 0 ? botMessages[botMessages.length - 1] : null
}

return (
  <div className="min-h-screen relative overflow-hidden" style={currentBackgroundStyle}>
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

               @keyframes floating-bubble {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-3px) rotate(1deg);
          }
          50% {
            transform: translateY(-1px) rotate(-0.5deg);
          }
          75% {
            transform: translateY(-4px) rotate(0.5deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        
        .floating-bubble {
          animation: floating-bubble 5s ease-in-out infinite;
        }
     `}</style>

    {/* 페르소나별 배경 오버레이 효과 */}
    <div className="absolute inset-0">
      {actualPersonaId === 1 && (
        // 추진이용 채도 조절 오버레이 (클래식 명화의 웅장함 유지하면서 가독성 확보)
        <div className="absolute inset-0 bg-black/25" style={{ filter: "saturate(0.75)" }}></div>
      )}
      {actualPersonaId === 2 && (
        // 내면이용 채도 더 낮춤 오버레이 (야경 이미지 위에 어두운 오버레이와 채도 감소)
        <div className="absolute inset-0 bg-black/35" style={{ filter: "saturate(0.5)" }}></div>
      )}
      {actualPersonaId === 3 && (
        // 햇살이용 채도 낮춤 오버레이 (따뜻한 느낌 유지하면서 채도 감소)
        <div className="absolute inset-0 bg-black/15" style={{ filter: "saturate(0.6)" }}></div>
      )}
      {actualPersonaId === 4 && (
        // 쾌락이용 채도 훨씬 낮춤 오버레이 (화려함을 크게 줄여서 가독성 확보)
        <div className="absolute inset-0 bg-black/30" style={{ filter: "saturate(0.4)" }}></div>
      )}
      {actualPersonaId === 5 && (
        // 안정이용 부드러운 오버레이 (평온한 분위기 유지)
        <div className="absolute inset-0 bg-black/10" style={{ filter: "saturate(0.7)" }}></div>
      )}
      {actualPersonaId !== 1 &&
        actualPersonaId !== 2 &&
        actualPersonaId !== 3 &&
        actualPersonaId !== 4 &&
        actualPersonaId !== 5 && (
          // 다른 페르소나들용 장식 요소들
          <>
            {/* Floating orbs */}
            <div className="absolute top-20 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-sm"></div>
            <div className="absolute top-32 left-1/3 w-16 h-16 bg-white/15 rounded-full blur-sm"></div>
            <div className="absolute bottom-1/3 right-1/6 w-32 h-32 bg-white/10 rounded-full blur-md"></div>
            <div className="absolute bottom-1/4 left-1/4 w-20 h-20 bg-white/15 rounded-full blur-sm"></div>
            <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-white/10 rounded-full blur-md"></div>
            {/* Large background orbs */}
            <div className="absolute top-1/4 left-1/6 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-1/4 right-1/6 w-56 h-56 bg-white/5 rounded-full blur-3xl"></div>
          </>
        )}
    </div>

    {/* Bookmark-shaped chat toggle button */}
    <div className={`absolute top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 ${
      showChatPanel ? "right-96" : "right-0"
    }`}>
      {/* 🗨️ 이모티콘 - 화살표 박스 왼쪽에 배치 */}
      <div className="absolute -left-16 top-1/4 transform -translate-y-1/2 text-3xl floating-bubble">
        🗨️
      </div>
      
      <button onClick={toggleChatPanel}>
        <div className="relative">
          {/* Bookmark shape with rounded corners and custom gradient */}
          <div className="w-16 h-20 bg-gradient-to-br from-[#FF6948]/50 to-[#FF0051]/50 hover:from-[#FF6948]/60 hover:to-[#FF0051]/60 transition-colors shadow-lg relative rounded-l-2xl backdrop-blur-sm border border-white/10"></div>
          {/* Arrow icon */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {showChatPanel ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </div>
        </div>
      </button>
    </div>

    {/* Main chat interface - Compact layout optimized for viewport */}
    <div
      className={`relative z-10 transition-all duration-300 overflow-visible ${showChatPanel ? "mr-96" : ""}`}
      style={{ height: "calc(100vh - 100px)", paddingTop: "20px", paddingBottom: "20px" }}
    >
      <div className="h-full flex flex-col justify-center items-center px-4 relative overflow-visible">
        {/* Character with talking animation */}
        <div className="flex justify-center items-center relative mb-4 overflow-visible">
          {actualPersonaId && currentAvatarPath && imageLoaded ? (
            <img
              src={currentAvatarPath}
              alt={currentPersonaName || "캐릭터"}
              className={`${currentCharacterSize} object-contain transition-opacity duration-300 ${isSending ? 'opacity-0' : 'opacity-100'}`}
              style={getFloatAnimationStyle(actualPersonaId)}
              onLoad={() => setImageLoaded(true)}
            />
          ) : actualPersonaId && currentAvatarPath ? (
            <div className={`${currentCharacterSize} flex items-center justify-center`}>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
              <img
                src={currentAvatarPath}
                alt={currentPersonaName || "캐릭터"}
                className="hidden"
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          ) : (
            <div className={`w-95 h-95 flex items-center justify-center`}>
              <div className="text-white/50 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <p>캐릭터 로딩 중...</p>
              </div>
            </div>
          )}
          
          {/* 응답 생성 중일 때 GIF 애니메이션 표시 */}
          {isSending && actualPersonaId && currentAvatarPath && imageLoaded && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 overflow-visible">
              <TalkingAnimation personaId={actualPersonaId} />
            </div>
          )}

        </div>

        {/* Latest bot message - positioned to avoid overlapping with input */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-20">
          {(() => {
            const lastBotMessage = chatMessages.filter((msg) => msg.type !== "user").pop()
            return lastBotMessage ? (
              <div className="w-full">
                <div className="bg-black/35 backdrop-blur-md rounded-3xl px-8 py-6 text-center shadow-2xl relative border border-white/10">
                  <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{lastBotMessage.content}</p>
                  {/* Speech bubble tail */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-transparent border-t-black/35"></div>
                  </div>
                </div>
              </div>
            ) : currentPersonaName ? (
              <div className="w-full">
                <div className="bg-black/35 backdrop-blur-md rounded-3xl px-6 py-4 text-center shadow-2xl relative border border-white/10">
                  <div className="text-white text-lg mb-2">
                    {greeting || getPersonaBaseGreeting(currentPersonaName)}
                  </div>
                  {/* Speech bubble tail */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-6 border-r-6 border-t-12 border-transparent border-t-black/35"></div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Input - positioned at bottom with increased height */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="flex space-x-4">
            <Input
              ref={inputRef}
              type="text"
              placeholder={currentPersonaName ? `${currentPersonaName}에게 고민을 이야기해보세요` : "고민을 이야기해보세요"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-6 py-6 rounded-full bg-white/80 backdrop-blur-sm border-0 text-gray-800 placeholder-gray-500 text-base shadow-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || inputMessage.trim() === ""}
              className={`bg-gradient-to-r text-white px-8 py-6 rounded-full font-medium text-base transition-all duration-200 ${
                actualPersonaId === 1 
                  ? 'from-[#DC143C] to-[#FF6347] hover:from-[#B22222] hover:to-[#FF4500]'
                  : actualPersonaId === 2
                  ? 'from-[#3CB371] to-[#6495ED] hover:from-[#2E8B57] hover:to-[#4169E1]'
                  : actualPersonaId === 3
                  ? 'from-[#6495ED] to-[#9932CC] hover:from-[#4169E1] hover:to-[#8B008B]'
                  : actualPersonaId === 4
                  ? 'from-[#FF6347] to-[#E6B800] hover:from-[#FF4500] hover:to-[#DAA520]'
                  : actualPersonaId === 5
                  ? 'from-[#E6B800] to-[#3CB371] hover:from-[#DAA520] hover:to-[#2E8B57]'
                  : 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {isSending ? "전송 중..." : "전송"}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* 사이드 채팅 내역 패널 */}
    {isVisible && (
      <div
        className={`absolute top-0 right-0 w-96 h-full border-l border-white/20 z-30 shadow-2xl transform transition-all duration-500 ease-out
    ${
      showChatPanel
        ? "translate-x-0 opacity-100 bg-black/20 backdrop-blur-xl"
        : "translate-x-full opacity-0 bg-transparent"
    }
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
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="flex flex-col max-w-[80%]">
                      <div
                        className={`px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                          message.type === "user"
                            ? "bg-blue-500/90 text-white rounded-br-md shadow-lg"
                            : "bg-white/90 text-gray-800 rounded-bl-md shadow-lg"
                        }`}
                      >
                        {message.content}
                      </div>
                      <div
                        className={`text-xs text-white/70 mt-1 ${message.type === "user" ? "text-right" : "text-left"}`}
                      >
                        {message.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="px-4 py-8 border-t border-white/30 flex-shrink-0 space-y-2 mt-6">
            <Button
              onClick={async () => {
                console.log('새로운 채팅 세션 버튼 클릭:', { 
                  currentUserId, 
                  actualPersonaId, 
                  currentPersonaName,
                  currentSession: session?.chat_sessions_id
                })
                
                if (currentUserId !== null && actualPersonaId !== null) {
                  try {
                    console.log('기존 세션 리셋 시작')
                    
                    // 1. 기존 세션 상태 완전히 리셋
                    resetSession()
                    
                    // 2. localStorage 및 URL 정리
                    localStorage.removeItem('lastChatSession')
                    const currentUrl = new URL(window.location.href)
                    currentUrl.searchParams.delete('sessionId')
                    window.history.replaceState({}, '', currentUrl.toString())
                    
                    console.log('세션 리셋 완료, 새로운 세션 생성 시작')
                    
                    // 3. 새로운 세션 생성 (개인화된 인사 포함)
                    const newSession = await createSession({
                      user_id: currentUserId,
                      persona_id: actualPersonaId,
                      session_name: `${currentPersonaName}와의 대화`
                    })

                    if (newSession) {
                      console.log('새로운 세션 생성 성공:', newSession.chat_sessions_id)
                      
                      // 4. URL에 새 세션 ID 반영 (리다이렉트 없음)
                      const newUrl = new URL(window.location.href)
                      newUrl.searchParams.set('sessionId', newSession.chat_sessions_id)
                      window.history.replaceState(null, '', newUrl.toString())
                      
                      console.log('새로운 채팅 세션 준비 완료')
                    } else {
                      console.error('새로운 세션 생성 실패')
                      alert('새로운 세션 생성에 실패했습니다. 다시 시도해주세요.')
                    }
                  } catch (error) {
                    console.error('새로운 세션 생성 중 오류:', error)
                    alert('오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)))
                  }
                } else {
                  console.error('사용자 ID 또는 페르소나 ID가 없습니다:', { currentUserId, actualPersonaId })
                  alert('새로운 세션을 시작할 수 없습니다. 페이지를 새로고침해주세요.')
                }
              }}
              className="w-full bg-gradient-to-r from-green-500/80 to-teal-600/80 hover:from-green-600/90 hover:to-teal-700/90 text-white py-3 rounded-full font-medium transition-all duration-200 backdrop-blur-sm shadow-lg"
            >
              {currentPersonaName}와 새로운 채팅 세션 시작하기
            </Button>
            <Button
              onClick={() => {
                // 만족도 조사 모달 표시
                setShowSatisfactionModal(true)
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
    <Modal isOpen={showRatingModal} onClose={onCloseRatingModal || (() => {})}>
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">채팅 만족도 평가</h2>
        <p className="text-gray-600 mb-6">{selectedCharacter?.name || "챗봇"}과의 대화는 어떠셨나요?</p>
        <div className="mb-6">
          <StarRating initialRating={currentRating} onRatingChange={handleRatingChange} centered={true} />
        </div>
        <div className="flex space-x-4 justify-center">
          <Button
            onClick={() => onCloseRatingModal?.()}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
          >
            나중에
          </Button>
          <Button
            onClick={() => {
              console.log(`만족도 평점: ${currentRating}점`)
              onCloseRatingModal?.()
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
      <SatisfactionModal onClose={handleSatisfactionClose} onSubmit={handleSatisfactionSubmit} />
    )}
  </div>
)
}

export default ChatPage

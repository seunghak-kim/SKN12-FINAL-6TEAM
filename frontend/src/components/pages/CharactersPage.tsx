"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Navigation from "../common/Navigation"
import type { SearchResult } from "../../types"
import { Button } from "../../components/ui/button"
import { testService } from "../../services/testService"
import { chatService } from "../../services/chatService"
import { authService } from "../../services/authService"
import { personaService, type Persona } from "../../services/personaService"

// 확장된 캐릭터 타입 (UI용 추가 필드 포함)
interface ExtendedCharacter extends SearchResult {
  color: string
  emoji: string
  buttonText: string
  personality_type: string
  score: number
  badges?: string[]
}

interface CharactersPageProps {
  characters?: SearchResult[]
  selectedCharacter?: SearchResult | null
  onCharacterSelect: (character: SearchResult) => void
  onStartChat: () => void
  onNavigate?: (screen: string) => void
}

const CharactersPage: React.FC<CharactersPageProps> = ({
  characters: propCharacters,
  onCharacterSelect,
  onStartChat,
  onNavigate,
}) => {
  const navigate = useNavigate()
  const [hasTestRecords, setHasTestRecords] = useState<boolean>(true) // 기본값은 true로 설정하여 로딩 중에는 버튼이 활성화되도록
  const [matchedPersonaId, setMatchedPersonaId] = useState<number | null>(null)
  const [chattingPersonaId, setChattingPersonaId] = useState<number | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 페르소나별 스타일링 정보 (새로운 색상 코드 적용)
  const personaStyles: { [key: number]: { color: string; emoji: string } } = {
    1: { color: "from-[#DC143C] to-[#FF6347]", emoji: "/assets/persona/추진이.png" }, // 추진형
    2: { color: "from-[#3CB371] to-[#6495ED]", emoji: "/assets/persona/내면이.png" }, // 내면형
    3: { color: "from-[#6495ED] to-[#9932CC]", emoji: "/assets/persona/햇살이.png" }, // 관계형
    4: { color: "from-[#FF6347] to-[#E6B800]", emoji: "/assets/persona/쾌락이.png" }, // 쾌락형
    5: { color: "from-[#E6B800] to-[#3CB371]", emoji: "/assets/persona/안정이.png" }, // 안정형
  }

  // 기본 캐릭터 데이터 (새로운 색상 코드 적용)
  const defaultCharacters: ExtendedCharacter[] = [
    {
      id: "1",
      name: "추진이",
      description: "강한 추진력과 대문자T같은 말투로 실질적인 해결책을 드릴게요.",
      avatar: "/assets/persona/추진이.png",
      color: "from-[#DC143C] to-[#FF6347]", // 추진형
      emoji: "/assets/persona/추진이.png",
      buttonText: "추진이와 대화하기",
      personality_type: "추진형",
      score: 0.85,
    },
    {
      id: "2",
      name: "내면이",
      description: "아무도 모를 당신의 내면, 저한테 털어놓아주세요.",
      avatar: "/assets/persona/내면이.png",
      color: "from-[#3CB371] to-[#6495ED]", // 내면형
      emoji: "/assets/persona/내면이.png",
      buttonText: "내면이와 대화하기",
      personality_type: "내성형",
      score: 0.78,
    },
    {
      id: "3",
      name: "햇살이",
      description: "항상 긍정적이고 밝은 에너지로 당신의 기분을 좋게 해드릴게요!",
      avatar: "/assets/persona/햇살이.png",
      color: "from-[#6495ED] to-[#9932CC]", // 관계형
      emoji: "/assets/persona/햇살이.png",
      buttonText: "햇살이와 대화하기",
      personality_type: "관계형",
      score: 0.92,
    },
    {
      id: "4",
      name: "쾌락이",
      description: "일단 한 번 대화하면 제 매력에서 빠져나오기 어려우실텐데,,?",
      avatar: "/assets/persona/쾌락이.png",
      color: "from-[#FF6347] to-[#E6B800]", // 쾌락형
      emoji: "/assets/persona/쾌락이.png",
      buttonText: "쾌락이와 대화하기",
      personality_type: "활동형",
      score: 0.73,
    },
    {
      id: "5",
      name: "안정이",
      description: "저는 항상 당신 편이에요. 따뜻한 위로를 건네드릴게요.",
      avatar: "/assets/persona/안정이.png",
      color: "from-[#E6B800] to-[#3CB371]", // 안정형
      emoji: "/assets/persona/안정이.png",
      buttonText: "안정이와 대화하기",
      personality_type: "안정형",
      score: 0.88,
    },
  ]

  // SearchResult를 ExtendedCharacter로 변환하는 함수 (새로운 색상 코드 적용)
  const convertToExtendedCharacter = (character: SearchResult): ExtendedCharacter => {
    // 기본 스타일 매핑 (새로운 색상 코드)
    const styleMap: { [key: string]: { color: string; emoji: string; buttonText: string } } = {
      추진이: {
        color: "from-[#DC143C] to-[#FF6347]", // 추진형
        emoji: "/assets/persona/추진이.png",
        buttonText: "추진이와 대화하기",
      },
      햇살이: {
        color: "from-[#6495ED] to-[#9932CC]", // 관계형
        emoji: "/assets/persona/햇살이.png",
        buttonText: "햇살이와 대화하기",
      },
      내면이: {
        color: "from-[#3CB371] to-[#6495ED]", // 내면형
        emoji: "/assets/persona/내면이.png",
        buttonText: "내면이와 대화하기",
      },
      쾌락이: {
        color: "from-[#FF6347] to-[#E6B800]", // 쾌락형
        emoji: "/assets/persona/쾌락이.png",
        buttonText: "쾌락이와 대화하기",
      },
      안정이: {
        color: "from-[#E6B800] to-[#3CB371]", // 안정형
        emoji: "/assets/persona/안정이.png",
        buttonText: "안정이와 대화하기",
      },
    }

    const style = styleMap[character.name] || styleMap["내면이"]

    return {
      ...character,
      color: style.color,
      emoji: character.avatar || style.emoji,
      buttonText: style.buttonText,
      personality_type: character.name.replace("이", "형"),
      score: Math.random() * 0.3 + 0.7, // 0.7~1.0 사이 랜덤 점수
    }
  }

  // 컴포넌트 마운트 시 모든 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      try {
        console.log("🔍 캐릭터 페이지 - 데이터 로드 중...")

        // 1. 테스트 상태 확인 (최우선)
        const testStatus = await testService.getUserTestStatus()
        console.log("테스트 상태:", testStatus)
        setHasTestRecords(testStatus.hasTests)

        // 2. 페르소나 데이터 로드 (실패해도 테스트 상태에는 영향 없음)
        // try {
        //   const personasData = await personaService.getAllPersonas()
        //   console.log("페르소나 데이터:", personasData)
        //   setPersonas(personasData)
        // } catch (personaError) {
        //   console.error("페르소나 데이터 로드 실패 (기본 데이터 사용):", personaError)
        //   // 페르소나 데이터 로드 실패해도 기본 데이터 사용하므로 계속 진행
        // }

        if (testStatus.hasTests) {
          // 3. 가장 최근 매칭된 페르소나 조회
          try {
            const latestMatchedPersona = await testService.getLatestMatchedPersona()
            console.log("[API] 최근 매칭된 페르소나:", latestMatchedPersona)
            console.log("[API] matchedPersonaId 설정:", latestMatchedPersona.matched_persona_id)
            setMatchedPersonaId(latestMatchedPersona.matched_persona_id)
          } catch (matchedError) {
            console.error("[API] 매칭된 페르소나 조회 실패:", matchedError)
          }

          // 4. 현재 사용자의 가장 최근 채팅 세션 조회
          try {
            const currentUser = await authService.getCurrentUser()
            console.log("[API] 현재 사용자:", currentUser)
            if (currentUser) {
              const userSessions = await chatService.getUserSessions(currentUser.id)
              console.log("[API] 사용자 세션 목록:", userSessions)
              if (userSessions.length > 0) {
                // updated_at 기준으로 가장 최근 세션
                const latestSession = userSessions.sort(
                  (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
                )[0]
                console.log("[API] 최근 채팅 세션:", latestSession)
                console.log("[API] chattingPersonaId 설정:", latestSession.persona_id)
                setChattingPersonaId(latestSession.persona_id)
              } else {
                console.log("[API] 채팅 세션이 없음")
              }
            }
          } catch (chatError) {
            console.error("[API] 채팅 세션 조회 실패:", chatError)
          }
        } else {
          console.log("[API] 테스트 기록이 없어서 페르소나 조회 생략")
        }
      } catch (error) {
        console.error("❌ 테스트 상태 확인 실패:", error)
        setHasTestRecords(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 페르소나 ID에 따른 키워드 및 버튼 텍스트 결정
  const getPersonaStatus = (personaId: string) => {
    const id = Number.parseInt(personaId)
    const personaName =
      personas.find((p) => p.persona_id === id)?.name || defaultCharacters.find((c) => c.id === personaId)?.name || ""

    const badges: string[] = []
    let buttonText = ""

    // 디버깅: 상태 값들 확인
    console.log(`[DEBUG] 페르소나 ${id} (${personaName}) 상태 확인:`, {
      chattingPersonaId,
      matchedPersonaId,
      isChattingMatch: chattingPersonaId === id,
      isMatchedMatch: matchedPersonaId === id,
      personaId,
      id,
    })

    // 대화중과 매칭됨 모두 체크 (순서 중요: 대화중이 먼저)
    if (chattingPersonaId === id) {
      badges.push("대화중")
      buttonText = "이어서 대화하기"
      console.log(`[DEBUG] 페르소나 ${id}에 '대화중' 뱃지 할당`)
    }

    if (matchedPersonaId === id) {
      badges.push("매칭됨")
      if (!buttonText) {
        // 대화중이 아닐 때만 버튼 텍스트 설정
        buttonText = `${personaName}와 대화하기`
      }
      console.log(`[DEBUG] 페르소나 ${id}에 '매칭됨' 뱃지 할당`)
    }

    if (!buttonText) {
      buttonText = `${personaName}와 대화하기`
    }

    console.log(`[DEBUG] 페르소나 ${id} 최종 결과:`, { badges, buttonText })

    return { badges, buttonText }
  }

  // 백엔드 페르소나 데이터를 ExtendedCharacter로 변환
  const convertPersonaToExtendedCharacter = (persona: Persona): ExtendedCharacter => {
    const style = personaStyles[persona.persona_id] || personaStyles[2] // 기본값: 내면이 스타일
    const status = getPersonaStatus(persona.persona_id.toString())

    // 페르소나 이름에 따른 이미지 파일명 매핑
    const imageNameMap: { [key: string]: string } = {
      "추진이": "추진이.png",
      "내면이": "내면이.png", 
      "햇살이": "햇살이.png",
      "쾌락이": "쾌락이.png",
      "안정이": "안정이.png"
    }

    const imageName = imageNameMap[persona.name] || "내면이.png"

    return {
      id: persona.persona_id.toString(),
      name: persona.name,
      description: persona.description,
      avatar: `/assets/persona/${imageName}`,
      color: style.color,
      emoji: style.emoji,
      buttonText: status.buttonText,
      badges: status.badges,
      personality_type: `${persona.name.replace("이", "")}형`,
      score: Math.random() * 0.3 + 0.7, // 임시 점수
    }
  }

  // 최종 캐릭터 데이터: 상태 변경에 반응하도록 useMemo 사용
  const characters: ExtendedCharacter[] = useMemo(() => {
    console.log("[CHARACTERS] 캐릭터 데이터 계산:", {
      propCharacters: !!propCharacters,
      personasLength: personas.length,
      matchedPersonaId,
      chattingPersonaId,
    })

    if (propCharacters) {
      console.log("[CHARACTERS] propCharacters 사용")
      return propCharacters.map(convertToExtendedCharacter)
    } else if (personas.length > 0) {
      console.log("[CHARACTERS] 백엔드 personas 사용")
      return personas.map(convertPersonaToExtendedCharacter)
    } else {
      console.log("[CHARACTERS] defaultCharacters 사용")
      return defaultCharacters.map((char) => {
        const status = getPersonaStatus(char.id)
        console.log(`[CHARACTERS] ${char.name}(ID:${char.id}) 상태:`, status)
        return {
          ...char,
          badges: status.badges,
          buttonText: status.buttonText,
        }
      })
    }
  }, [propCharacters, personas, matchedPersonaId, chattingPersonaId])

  const handleCharacterClick = async (character: ExtendedCharacter) => {
    console.log("CharactersPage - 클릭된 캐릭터:", character)

    // '대화중' 페르소나인 경우 기존 세션으로 이동
    if (character.badges?.includes("대화중") && chattingPersonaId === Number.parseInt(character.id)) {
      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser) {
          const userSessions = await chatService.getUserSessions(currentUser.id)
          const latestSession = userSessions
            .filter((session) => session.persona_id === chattingPersonaId)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

          if (latestSession) {
            console.log("기존 세션으로 이동:", latestSession.chat_sessions_id)
            navigate(`/chat?sessionId=${latestSession.chat_sessions_id}`)
            return
          }
        }
      } catch (error) {
        console.error("기존 세션 찾기 실패:", error)
      }
    }

    // 새로운 채팅 시작
    const searchResult: SearchResult = {
      id: character.id,
      name: character.name,
      description: character.description,
      avatar: character.avatar,
    }
    onCharacterSelect(searchResult)
    // 새로운 캐릭터와의 대화 시작이므로 기존 세션 정보 삭제
    localStorage.removeItem('lastChatSession');
    onStartChat()
    navigate("/chat")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F103F] via-[#1a1b4a] via-[#2a2b5a] to-[#3a3b6a] relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Cosmic atmosphere layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-800/20 to-pink-900/30 blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-900/10 to-purple-900/20 blur-sm"></div>

      {/* Floating cosmic orbs with natural movement - moved inward */}
      <div className="absolute top-1/4 right-1/4 md:top-1/5 md:right-1/5 lg:top-1/4 lg:right-1/4">
        <div
          className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-cyan-400/50 via-blue-500/30 to-purple-600/50 rounded-full shadow-2xl opacity-60 animate-pulse blur-md"
          style={{ animationDuration: "3s" }}
        >
          <div className="absolute inset-2 bg-gradient-to-br from-white/15 via-cyan-300/20 to-transparent rounded-full blur-sm"></div>
        </div>
      </div>

      <div className="absolute bottom-1/3 left-1/4 md:bottom-2/5 md:left-1/5 lg:bottom-1/3 lg:left-1/4">
        <div
          className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-pink-400/40 via-purple-500/30 to-indigo-600/40 rounded-full shadow-2xl opacity-50 animate-pulse blur-md"
          style={{ animationDuration: "4s", animationDelay: "1.5s" }}
        >
          <div className="absolute inset-3 bg-gradient-to-br from-white/10 via-pink-300/15 to-transparent rounded-full blur-sm"></div>
        </div>
      </div>

      {/* Mystical crystal formations - moved inward */}
      <div className="absolute top-1/3 left-1/5 md:top-2/5 md:left-1/4 lg:top-1/3 lg:left-1/5 opacity-50">
        <div
          className="w-12 h-16 md:w-14 md:h-18 lg:w-16 lg:h-20 bg-gradient-to-br from-orange-400/50 via-pink-500/40 to-purple-600/50 transform rotate-12 shadow-2xl blur-sm"
          style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
        >
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
        </div>
      </div>

      <div className="absolute bottom-1/4 right-1/5 md:bottom-1/3 md:right-1/4 lg:bottom-1/4 lg:right-1/5 opacity-45">
        <div
          className="w-20 h-24 md:w-24 md:h-28 lg:w-28 lg:h-32 bg-gradient-to-br from-purple-400/40 via-pink-500/30 via-orange-500/25 to-yellow-400/30 transform rotate-[-15deg] shadow-2xl rounded-lg backdrop-blur-sm blur-sm"
          style={{ animationDelay: "0.8s" }}
        >
          <div className="absolute top-2 left-2 w-3 h-3 bg-white/25 rounded-full animate-pulse blur-sm"></div>
          <div
            className="absolute bottom-3 right-3 w-2 h-2 bg-cyan-300/30 rounded-full animate-pulse blur-sm"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse blur-sm"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>
      </div>

      {/* Center solid circles */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-32 h-32 border-2 border-white/15 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-cyan-300/20 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-purple-300/20 to-pink-300/15 rounded-full blur-sm"></div>
      </div>

      {/* Distributed circles across the screen - reduced count */}
      {/* Top right area */}
      <div className="absolute top-16 right-24">
        <div className="w-20 h-20 border border-orange-300/18 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-orange-300/12 to-yellow-300/8 rounded-full blur-sm"></div>
      </div>

      {/* Left side middle */}
      <div className="absolute top-1/2 left-16 transform -translate-y-1/2">
        <div className="w-14 h-14 border border-purple-300/20 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-purple-300/15 to-pink-300/10 rounded-full blur-sm"></div>
      </div>

      {/* Bottom left area */}
      <div className="absolute bottom-24 left-32">
        <div className="w-18 h-18 border border-pink-300/16 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-pink-300/12 to-purple-300/8 rounded-full blur-sm"></div>
      </div>

      {/* Additional scattered circle */}
      <div className="absolute top-1/4 right-1/3">
        <div className="w-12 h-12 border border-cyan-300/14 rounded-full blur-sm"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gradient-to-br from-cyan-300/10 to-blue-300/6 rounded-full blur-sm"></div>
      </div>

      {/* Subtle floating particles - moved inward */}
      <div
        className="absolute top-2/5 left-3/5 w-2 h-2 bg-gradient-to-br from-white/50 to-cyan-300/30 rounded-full opacity-60 animate-pulse shadow-lg blur-sm"
        style={{ animationDuration: "2s" }}
      ></div>
      <div
        className="absolute top-3/5 right-2/5 w-1.5 h-1.5 bg-gradient-to-br from-pink-300/60 to-purple-400/40 rounded-full opacity-50 animate-pulse shadow-md blur-sm"
        style={{ animationDuration: "2.5s", animationDelay: "1s" }}
      ></div>
      <div
        className="absolute bottom-2/5 left-2/5 w-1 h-1 bg-gradient-to-br from-cyan-400/70 to-blue-500/50 rounded-full opacity-40 animate-pulse blur-sm"
        style={{ animationDuration: "3s", animationDelay: "2s" }}
      ></div>

      {/* Orbital rings with gentle rotation - moved inward */}
      <div
        className="absolute top-2/5 left-1/3 w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 border border-purple-400/8 rounded-full animate-spin opacity-20 blur-sm"
        style={{ animationDuration: "45s" }}
      >
        <div className="absolute top-2 left-2 w-2 h-2 bg-purple-300/30 rounded-full blur-sm"></div>
      </div>
      <div
        className="absolute bottom-2/5 right-1/3 w-36 h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 border border-cyan-400/10 rounded-full animate-spin opacity-15 blur-sm"
        style={{ animationDuration: "35s", animationDirection: "reverse" }}
      >
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-cyan-300/40 rounded-full blur-sm"></div>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">페르소나와 대화해보기</h1>
          <p className="text-white/80 text-lg">대화하면서 당신과 맞는 캐릭터를 찾아가 보세요!</p>
        </div>

        {isLoading ? (
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">페르소나 정보를 불러오는 중...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {characters.map((character, index) => (
              <div
                key={character.id || index}
                className="bg-slate-600/40 backdrop-blur-sm rounded-3xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* 원형 컨테이너 제거하고 기본 크기로 복원 */}
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img
                        src={character.avatar}
                        alt={character.name}
                        className="w-20 h-20 object-contain"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-2xl font-bold text-white mr-3">{character.name}</h3>
                        {/* 실제 API 데이터 기반 뱃지 표시 - 여러 개 지원 */}
                        {character.badges && character.badges.length > 0 && (
                          <div className="flex space-x-2">
                            {character.badges.map((badge, index) => (
                              <span
                                key={index}
                                className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
                                  badge === "대화중"
                                    ? "bg-green-500/80 text-white backdrop-blur-sm border border-green-400/50"
                                    : badge === "매칭됨"
                                      ? "bg-orange-500/80 text-white backdrop-blur-sm border border-orange-400/50"
                                      : "bg-blue-500/80 text-white backdrop-blur-sm border border-blue-400/50"
                                }`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-white/90 text-sm leading-relaxed max-w-md">{character.description}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCharacterClick(character)}
                    disabled={!hasTestRecords}
                    className={`
                    ${
                      hasTestRecords
                        ? `bg-gradient-to-r ${character.color} hover:opacity-90 text-white`
                        : "bg-gray-500/50 text-gray-300 cursor-not-allowed"
                    } 
                    px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap
                    ${!hasTestRecords ? "opacity-50" : ""}
                  `}
                  >
                    {hasTestRecords ? character.buttonText : "그림검사 후 이용 가능"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CharactersPage

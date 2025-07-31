import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { SearchResult } from '../../types';
import { Button } from "../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { testService } from '../../services/testService';

// 확장된 캐릭터 타입 (UI용 추가 필드 포함)
interface ExtendedCharacter extends SearchResult {
  color: string;
  emoji: string;
  buttonText: string;
  personality_type: string;
  score: number;
  badge?: string;
}

interface CharactersPageProps {
  characters?: SearchResult[];
  selectedCharacter?: SearchResult | null;
  onCharacterSelect: (character: SearchResult) => void;
  onStartChat: () => void;
  onNavigate?: (screen: string) => void;
}

const CharactersPage: React.FC<CharactersPageProps> = ({
  characters: propCharacters,
  onCharacterSelect,
  onStartChat,
  onNavigate
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasTestRecords, setHasTestRecords] = useState<boolean>(true); // 기본값은 true로 설정하여 로딩 중에는 버튼이 활성화되도록

  // 기본 캐릭터 데이터 (props로 전달되지 않은 경우 사용)
  const defaultCharacters: ExtendedCharacter[] = [
    {
      id: "1",
      name: "추진이",
      description: "긍정적 생각 전환, 스트레스 해소, 자존감 향상 등을 통해 심리적인 해결책을 찾아 나갈 거예요.",
      avatar: "/assets/persona/추진이.png",
      color: "from-orange-500 to-red-600",
      emoji: "/assets/persona/추진이.png",
      buttonText: "추진이와 대화하기",
      personality_type: "추진형",
      score: 0.85
    },
    {
      id: "2",
      name: "관계이",
      description: "당신의 고민을 이해하고 함께 극복해나가는 방법을 찾아드립니다. 저와 함께 나아가봐요.",
      avatar: "/assets/persona/관계이.png",
      color: "from-blue-500 to-purple-600",
      emoji: "/assets/persona/관계이.png",
      buttonText: "관계이와 대화하기",
      badge: "매칭된 페르소나",
      personality_type: "관계형",
      score: 0.92
    },
    {
      id: "3",
      name: "내면이",
      description: "본질과 감정을 진정하게 표현하고 해소하는 방법을 알려드릴게요. 마음의 평화를 찾아봐요.",
      avatar: "/assets/persona/내면이.png",
      color: "from-gray-500 to-gray-700",
      emoji: "/assets/persona/내면이.png",
      buttonText: "내면이와 대화하기",
      badge: "대화 중",
      personality_type: "내성형",
      score: 0.78
    },
    {
      id: "4",
      name: "쾌락이",
      description: "불안과 두려움을 함께 극복해보아요. 누구보다 유쾌하고 재미있게 당신을 응원해드릴게요.",
      avatar: "/assets/persona/쾌락이.png",
      color: "from-pink-500 to-red-600",
      emoji: "/assets/persona/쾌락이.png",
      buttonText: "쾌락이와 대화하기",
      personality_type: "활동형",
      score: 0.73
    },
    {
      id: "5",
      name: "안정이",
      description: "저는 항상 당신 편이에요. 따뜻한 위로의 한마디로 당신의 마음이 평화로워지도록 도울게요.",
      avatar: "/assets/persona/안정이.png",
      color: "from-green-500 to-emerald-600",
      emoji: "/assets/persona/안정이.png",
      buttonText: "안정이와 대화하기",
      personality_type: "안정형",
      score: 0.88
    },
  ];

  // SearchResult를 ExtendedCharacter로 변환하는 함수
  const convertToExtendedCharacter = (character: SearchResult): ExtendedCharacter => {
    // 기본 스타일 매핑
    const styleMap: { [key: string]: { color: string; emoji: string; buttonText: string; } } = {
      '추진이': { color: 'from-orange-500 to-red-600', emoji: '/assets/persona/추진이.png', buttonText: '추진이와 대화하기' },
      '관계이': { color: 'from-blue-500 to-purple-600', emoji: '/assets/persona/관계이.png', buttonText: '관계이와 대화하기' },
      '내면이': { color: 'from-gray-500 to-gray-700', emoji: '/assets/persona/내면이.png', buttonText: '내면이와 대화하기' },
      '쾌락이': { color: 'from-pink-500 to-red-600', emoji: '/assets/persona/쾌락이.png', buttonText: '쾌락이와 대화하기' },
      '안정이': { color: 'from-green-500 to-emerald-600', emoji: '/assets/persona/안정이.png', buttonText: '안정이와 대화하기' },
    };

    const style = styleMap[character.name] || styleMap['내면이'];
    
    return {
      ...character,
      color: style.color,
      emoji: character.avatar || style.emoji,
      buttonText: style.buttonText,
      personality_type: character.name.replace('이', '형'),
      score: Math.random() * 0.3 + 0.7 // 0.7~1.0 사이 랜덤 점수
    };
  };

  // 컴포넌트 마운트 시 테스트 기록 확인
  useEffect(() => {
    const checkTestStatus = async () => {
      try {
        console.log('🔍 캐릭터 페이지 - 테스트 상태 확인 중...');
        const testStatus = await testService.getUserTestStatus();
        console.log('테스트 상태:', testStatus);
        setHasTestRecords(testStatus.hasTests);
      } catch (error) {
        console.error('❌ 테스트 상태 확인 실패:', error);
        // 에러 발생 시 안전하게 false로 설정
        setHasTestRecords(false);
      }
    };

    checkTestStatus();
  }, []);

  // props에서 받은 캐릭터 데이터가 있으면 변환해서 사용, 없으면 기본 데이터 사용
  const characters = propCharacters 
    ? propCharacters.map(convertToExtendedCharacter)
    : defaultCharacters;

  const handleCharacterClick = (character: ExtendedCharacter) => {
    console.log('CharactersPage - 클릭된 캐릭터:', character);
    // ExtendedCharacter를 SearchResult로 변환해서 전달
    const searchResult: SearchResult = {
      id: character.id,
      name: character.name,
      description: character.description,
      avatar: character.avatar
    };
    onCharacterSelect(searchResult);
    onStartChat();
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F103F] via-[#1a1b4a] via-[#2a2b5a] to-[#3a3b6a] relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Cosmic atmosphere layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-indigo-800/20 to-pink-900/30 blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-900/10 to-purple-900/20 blur-sm"></div>

      {/* Floating cosmic orbs with natural movement - moved inward */}
      <div className="absolute top-1/4 right-1/4 md:top-1/5 md:right-1/5 lg:top-1/4 lg:right-1/4">
        <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-cyan-400/50 via-blue-500/30 to-purple-600/50 rounded-full shadow-2xl opacity-60 animate-pulse blur-md"
             style={{ animationDuration: "3s" }}>
          <div className="absolute inset-2 bg-gradient-to-br from-white/15 via-cyan-300/20 to-transparent rounded-full blur-sm"></div>
        </div>
      </div>

      <div className="absolute bottom-1/3 left-1/4 md:bottom-2/5 md:left-1/5 lg:bottom-1/3 lg:left-1/4">
        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-pink-400/40 via-purple-500/30 to-indigo-600/40 rounded-full shadow-2xl opacity-50 animate-pulse blur-md"
             style={{ animationDuration: "4s", animationDelay: "1.5s" }}>
          <div className="absolute inset-3 bg-gradient-to-br from-white/10 via-pink-300/15 to-transparent rounded-full blur-sm"></div>
        </div>
      </div>

      {/* Mystical crystal formations - moved inward */}
      <div className="absolute top-1/3 left-1/5 md:top-2/5 md:left-1/4 lg:top-1/3 lg:left-1/5 opacity-50">
        <div className="w-12 h-16 md:w-14 md:h-18 lg:w-16 lg:h-20 bg-gradient-to-br from-orange-400/50 via-pink-500/40 to-purple-600/50 transform rotate-12 shadow-2xl blur-sm"
             style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}>
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white/30 rounded-full blur-sm"></div>
        </div>
      </div>

      <div className="absolute bottom-1/4 right-1/5 md:bottom-1/3 md:right-1/4 lg:bottom-1/4 lg:right-1/5 opacity-45">
        <div className="w-20 h-24 md:w-24 md:h-28 lg:w-28 lg:h-32 bg-gradient-to-br from-purple-400/40 via-pink-500/30 via-orange-500/25 to-yellow-400/30 transform rotate-[-15deg] shadow-2xl rounded-lg backdrop-blur-sm blur-sm"
             style={{ animationDelay: "0.8s" }}>
          <div className="absolute top-2 left-2 w-3 h-3 bg-white/25 rounded-full animate-pulse blur-sm"></div>
          <div className="absolute bottom-3 right-3 w-2 h-2 bg-cyan-300/30 rounded-full animate-pulse blur-sm" style={{ animationDelay: "1s" }}></div>
          <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse blur-sm" style={{ animationDelay: "2s" }}></div>
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
      <div className="absolute top-2/5 left-3/5 w-2 h-2 bg-gradient-to-br from-white/50 to-cyan-300/30 rounded-full opacity-60 animate-pulse shadow-lg blur-sm"
           style={{ animationDuration: "2s" }}></div>
      <div className="absolute top-3/5 right-2/5 w-1.5 h-1.5 bg-gradient-to-br from-pink-300/60 to-purple-400/40 rounded-full opacity-50 animate-pulse shadow-md blur-sm"
           style={{ animationDuration: "2.5s", animationDelay: "1s" }}></div>
      <div className="absolute bottom-2/5 left-2/5 w-1 h-1 bg-gradient-to-br from-cyan-400/70 to-blue-500/50 rounded-full opacity-40 animate-pulse blur-sm"
           style={{ animationDuration: "3s", animationDelay: "2s" }}></div>

      {/* Orbital rings with gentle rotation - moved inward */}
      <div className="absolute top-2/5 left-1/3 w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 border border-purple-400/8 rounded-full animate-spin opacity-20 blur-sm"
           style={{ animationDuration: "45s" }}>
        <div className="absolute top-2 left-2 w-2 h-2 bg-purple-300/30 rounded-full blur-sm"></div>
      </div>
      <div className="absolute bottom-2/5 right-1/3 w-36 h-36 md:w-40 md:h-40 lg:w-48 lg:h-48 border border-cyan-400/10 rounded-full animate-spin opacity-15 blur-sm"
           style={{ animationDuration: "35s", animationDirection: "reverse" }}>
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-cyan-300/40 rounded-full blur-sm"></div>
      </div>


      {/* Back button */}
      {/* <button
        onClick={() => {
          // URL에서 이전 세션 정보 확인
          const urlParams = new URLSearchParams(location.search);
          const returnSessionId = urlParams.get('returnSessionId');
          const returnCharacterId = urlParams.get('returnCharacterId');
          
          console.log('CharactersPage - 돌아가기 버튼 클릭:', {
            currentURL: location.search,
            returnSessionId,
            returnCharacterId,
            urlParams: Object.fromEntries(urlParams.entries())
          });
          
          if (returnSessionId && returnCharacterId) {
            // 이전 세션으로 돌아가기
            const targetUrl = `/chat?sessionId=${returnSessionId}&characterId=${returnCharacterId}`;
            console.log('CharactersPage - 세션으로 돌아가기:', targetUrl);
            navigate(targetUrl);
          } else {
            // 이전 세션 정보가 없으면 일반적인 뒤로가기
            console.log('CharactersPage - 일반 뒤로가기');
            navigate(-1);
          }
        }}
        className="absolute top-24 left-8 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium transition-colors flex items-center"
      >
        <ChevronLeft size={16} className="mr-1" />
        돌아가기
      </button> */}

      <div className="relative z-10 container mx-auto px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">페르소나 캐릭터와 대화해보기</h1>
          <p className="text-white/80 text-lg">대화하면서 당신과 맞는 캐릭터를 찾아가 보세요!</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {characters.map((character, index) => (
            <div key={character.id || index} className="bg-slate-600/40 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                    <img src={`/assets/persona/${character.name}.png`} alt={character.name} className="w-32 h-32 object-contain" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-2xl font-bold text-white mr-3">{character.name}</h3>
                      {character.badge && (
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white">
                          {character.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed max-w-md">{character.description}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleCharacterClick(character)}
                  disabled={!hasTestRecords}
                  className={`
                    ${hasTestRecords 
                      ? `bg-gradient-to-r ${character.color} hover:opacity-90 text-white` 
                      : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                    } 
                    px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap
                    ${!hasTestRecords ? 'opacity-50' : ''}
                  `}
                >
                  {hasTestRecords ? character.buttonText : '그림검사 후 이용 가능'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharactersPage;
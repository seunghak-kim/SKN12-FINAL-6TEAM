import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { SearchResult } from '../../types';
import { Button } from "../../components/ui/button";
import { ChevronLeft } from "lucide-react";

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

  // 기본 캐릭터 데이터 (props로 전달되지 않은 경우 사용)
  const defaultCharacters: ExtendedCharacter[] = [
    {
      id: "1",
      name: "추진이",
      description: "긍정적 생각 전환, 스트레스 해소, 자존감 향상 등을 통해 심리적인 해결책을 찾아 나갈 거예요.",
      avatar: "🦊",
      color: "from-orange-500 to-red-600",
      emoji: "🦊",
      buttonText: "추진이와 대화하기",
      personality_type: "추진형",
      score: 0.85
    },
    {
      id: "2",
      name: "관계이",
      description: "당신의 고민을 이해하고 함께 극복해나가는 방법을 찾아드립니다. 저와 함께 나아가봐요.",
      avatar: "🦝",
      color: "from-blue-500 to-purple-600",
      emoji: "🦝",
      buttonText: "관계이와 대화하기",
      badge: "매칭된 페르소나",
      personality_type: "관계형",
      score: 0.92
    },
    {
      id: "3",
      name: "내면이",
      description: "본질과 감정을 진정하게 표현하고 해소하는 방법을 알려드릴게요. 마음의 평화를 찾아봐요.",
      avatar: "🐰",
      color: "from-gray-500 to-gray-700",
      emoji: "🐰",
      buttonText: "내면이와 대화하기",
      badge: "대화 중",
      personality_type: "내성형",
      score: 0.78
    },
    {
      id: "4",
      name: "쾌락이",
      description: "불안과 두려움을 함께 극복해보아요. 누구보다 유쾌하고 재미있게 당신을 응원해드릴게요.",
      avatar: "🐱",
      color: "from-pink-500 to-red-600",
      emoji: "🐱",
      buttonText: "쾌락이와 대화하기",
      personality_type: "활동형",
      score: 0.73
    },
    {
      id: "5",
      name: "안정이",
      description: "저는 항상 당신 편이에요. 따뜻한 위로의 한마디로 당신의 마음이 평화로워지도록 도울게요.",
      avatar: "🐼",
      color: "from-green-500 to-emerald-600",
      emoji: "🐼",
      buttonText: "안정이와 대화하기",
      personality_type: "안정형",
      score: 0.88
    },
  ];

  // SearchResult를 ExtendedCharacter로 변환하는 함수
  const convertToExtendedCharacter = (character: SearchResult): ExtendedCharacter => {
    // 기본 스타일 매핑
    const styleMap: { [key: string]: { color: string; emoji: string; buttonText: string; } } = {
      '추진이': { color: 'from-orange-500 to-red-600', emoji: '🦊', buttonText: '추진이와 대화하기' },
      '관계이': { color: 'from-blue-500 to-purple-600', emoji: '🦝', buttonText: '관계이와 대화하기' },
      '내면이': { color: 'from-gray-500 to-gray-700', emoji: '🐰', buttonText: '내면이와 대화하기' },
      '쾌락이': { color: 'from-pink-500 to-red-600', emoji: '🐱', buttonText: '쾌락이와 대화하기' },
      '안정이': { color: 'from-green-500 to-emerald-600', emoji: '🐼', buttonText: '안정이와 대화하기' },
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      <Navigation onNavigate={onNavigate} />

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full opacity-40 blur-lg"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute bottom-32 right-32 w-48 h-64 bg-gradient-to-br from-pink-400 via-purple-500 to-orange-600 opacity-60 transform rotate-12 rounded-lg shadow-2xl"></div>

      {/* Back button */}
      <button
        onClick={() => onNavigate?.("main")}
        className="absolute top-24 left-8 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium transition-colors flex items-center"
      >
        <ChevronLeft size={16} className="mr-1" />
        메인으로 돌아가기
      </button>

      <div className="relative z-10 container mx-auto px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">다른 캐릭터와 대화해보기</h1>
          <p className="text-white/80 text-lg">각 캐릭터는 다른 접근과 상황에 특화되어 있어요</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {characters.map((character, index) => (
            <div key={character.id || index} className="bg-slate-600/40 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                    <span className="text-3xl">{character.emoji}</span>
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
                  className={`bg-gradient-to-r ${character.color} hover:opacity-90 text-white px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap`}
                >
                  {character.buttonText}
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
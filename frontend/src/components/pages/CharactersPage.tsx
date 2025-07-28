import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { ArrowLeft } from 'lucide-react';
import { SearchResult } from '../../types';
import { userService } from '../../services/userService';

interface CharactersPageProps {
  characters: SearchResult[];
  selectedCharacter?: SearchResult | null;
  onCharacterSelect: (character: SearchResult) => void;
  onStartChat: () => void;
  onNavigate?: (screen: string) => void;
}

const CharactersPage: React.FC<CharactersPageProps> = ({
  characters,
  selectedCharacter,
  onCharacterSelect,
  onStartChat,
  onNavigate
}) => {
  const navigate = useNavigate();
  const [matchedPersonaId, setMatchedPersonaId] = useState<number | null>(null);

  // 최근 매칭된 페르소나 조회
  useEffect(() => {
    const fetchMatchedPersona = async () => {
      try {
        const result = await userService.getLatestMatchedPersona();
        setMatchedPersonaId(result.matched_persona_id);
      } catch (error) {
        console.error('매칭된 페르소나 조회 실패:', error);
      }
    };

    fetchMatchedPersona();
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleCharacterClick = (character: any) => {
    console.log('CharactersPage - 클릭된 캐릭터:', character);
    onCharacterSelect(character);
    onStartChat();
    navigate('/chat');
  };

  // 실제 characters 데이터를 기반으로 UI 스타일 매핑
  const getCharacterStyle = (characterName: string) => {
    const styles: { [key: string]: { color: string; buttonColor: string; } } = {
      '추진이': {
        color: 'from-yellow-400 to-orange-500',
        buttonColor: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700'
      },
      '내면이': {
        color: 'from-red-400 to-pink-600', 
        buttonColor: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
      },
      '관계이': {
        color: 'from-blue-400 to-indigo-600',
        buttonColor: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
      },
      '쾌락이': {
        color: 'from-purple-400 to-violet-600',
        buttonColor: 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
      },
      '안정이': {
        color: 'from-gray-400 to-slate-600',
        buttonColor: 'bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700'
      }
    };
    return styles[characterName] || styles['내면이'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation onNavigate={onNavigate} />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>대화로 돌아가기</span>
            </button>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-800">다른 캐릭터와 대화해보기</h1>
            <p className="text-gray-600">각 캐릭터는 다른 감정과 상황에 특화되어 있어요</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {characters.map((character) => {
              const isSelected = selectedCharacter && selectedCharacter.id === character.id;
              const isDisabled = isSelected;
              const isMatched = matchedPersonaId === parseInt(character.id);
              const style = getCharacterStyle(character.name);
              
              return (
                <div 
                  key={character.id} 
                  className={`bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-xl p-6 transition-all duration-300 flex flex-col h-80 ${
                    isSelected ? 'ring-2 ring-green-400 ring-opacity-60 bg-green-50/50' : ''
                  } ${
                    isDisabled 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:shadow-2xl cursor-pointer'
                  }`}
                >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${style.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{character.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-gray-800">{character.name}</h3>
                      {isSelected && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          대화 중
                        </span>
                      )}
                      {isMatched && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          매칭됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">
                  {character.description}
                </p>
                
                <button
                  onClick={() => !isDisabled && handleCharacterClick(character)}
                  disabled={!!isDisabled}
                  className={`w-full py-3 rounded-full font-medium transition-all duration-300 shadow-lg mt-auto ${
                    isDisabled 
                      ? 'bg-gray-400 text-gray-100 cursor-not-allowed opacity-70' 
                      : `${style.buttonColor} text-white hover:shadow-xl`
                  }`}
                >
                  {isDisabled ? '현재 대화 중인 캐릭터' : `${character.name}와 대화하기`}
                </button>
              </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/mypage')}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              모든 결과 유형 보기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CharactersPage;
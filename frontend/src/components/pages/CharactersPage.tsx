import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { ArrowLeft } from 'lucide-react';
import { SearchResult } from '../../types';

interface CharactersPageProps {
  characters: SearchResult[];
  selectedCharacter?: SearchResult | null;
  onCharacterSelect: (character: SearchResult) => void;
  onStartChat: () => void;
  onNavigate?: (screen: string) => void;
}

const CharactersPage: React.FC<CharactersPageProps> = ({
  selectedCharacter,
  onCharacterSelect,
  onStartChat,
  onNavigate
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleCharacterClick = (character: any) => {
    onCharacterSelect(character);
    onStartChat();
    navigate('/chat');
  };

  // 참고 스크린샷과 동일한 캐릭터 목록
  const displayCharacters = [
    {
      id: '1',
      name: '추진이',
      description: '긍정적 생각 전환, 스트레스 해소, 자존감 향상 등을 통해 당신의 마음속 행복을 찾아줄 거예요. 안 되던 당신의 이야기를 듣고 함께 빛나는 해결책을 찾아 나갈 거예요.',
      avatar: '😊',
      color: 'from-yellow-400 to-orange-500',
      buttonColor: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700'
    },
    {
      id: '2',
      name: '내면이',
      description: '분노와 좌절감을 건전하게 표현하고 해소하는 방법을 알려드려요. 감정을 억누르지 말고 함께 이야기하며 마음의 평화를 찾아보세요.',
      avatar: '😖',
      color: 'from-red-400 to-pink-600',
      buttonColor: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
    },
    {
      id: '3',
      name: '관계이',
      description: '당신의 슬픔을 이해하고 함께 극복해나가는 방법을 찾아드립니다.',
      avatar: '😘',
      color: 'from-blue-400 to-indigo-600',
      buttonColor: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
      isRecommended: true
    },
    {
      id: '4',
      name: '쾌락이',
      description: '불안과 두려움을 극복하는 방법을 함께 찾아보아요. 작은 용기부터 시작해 정서적 자신감을 키워나가요.',
      avatar: '🤪',
      color: 'from-purple-400 to-violet-600',
      buttonColor: 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
    },
    {
      id: '5',
      name: '안정이',
      description: '솔직하고 직설적인 조언으로 현실적인 해결책을 제시해드려요. 때로는 쓴소리도 필요하니까요.',
      avatar: '🤭',
      color: 'from-gray-400 to-slate-600',
      buttonColor: 'bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700'
    }
  ];

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
            {displayCharacters.map((character) => {
              const isSelected = selectedCharacter && selectedCharacter.id === character.id;
              const isDisabled = isSelected;
              
              return (
                <div 
                  key={character.id} 
                  className={`bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-xl p-6 transition-all duration-300 flex flex-col h-80 ${
                    character.isRecommended ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                  } ${
                    isSelected ? 'ring-2 ring-green-400 ring-opacity-60 bg-green-50/50' : ''
                  } ${
                    isDisabled 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'hover:shadow-2xl cursor-pointer'
                  }`}
                >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${character.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl">{character.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-gray-800">{character.name}</h3>
                      {character.isRecommended && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          매칭된 페르소나
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          대화 중
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
                      : `${character.buttonColor} text-white hover:shadow-xl`
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
import { useState, useCallback } from 'react';
import { ScreenType, SearchResult, FrontendChatMessage, ChatHistory, TestResult, UserProfile, DrawingTest } from '../types';
import { characters } from '../data/characters';

export const useAppState = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing');
  const [selectedCharacter, setSelectedCharacter] = useState<SearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<FrontendChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentTestResult, setCurrentTestResult] = useState<string>('내면이'); // 현재 검사 결과
  const [isSending, setIsSending] = useState(false); // 메시지 전송 상태

  const handleGoogleLogin = useCallback(() => {
    setCurrentScreen('main');
  }, []);

  const handleStartDreamSearch = useCallback(() => {
    setCurrentScreen('results');
  }, []);

  const handleCharacterSelect = useCallback((character: SearchResult) => {
    setSelectedCharacter(character);
    setShowModal(true);
  }, []);

  const handleStartChat = useCallback(() => {
    setShowModal(false);
    setCurrentScreen('chat');
  }, []);

  const saveChatToHistory = useCallback((messages: FrontendChatMessage[]) => {
    if (!selectedCharacter || messages.length === 0) return;
    
    const existingChatIndex = chatHistory.findIndex(
      chat => chat.characterName === selectedCharacter.name && 
      chat.date === new Date().toISOString().split('T')[0]
    );
    
    const chatData: ChatHistory = {
      id: existingChatIndex >= 0 ? chatHistory[existingChatIndex].id : Date.now().toString(),
      characterId: selectedCharacter.id,
      characterName: selectedCharacter.name,
      characterAvatar: selectedCharacter.avatar,
      messages: messages,
      date: new Date().toISOString().split('T')[0],
      lastMessage: messages[messages.length - 1].content
    };
    
    if (existingChatIndex >= 0) {
      // 기존 채팅 업데이트
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[existingChatIndex] = chatData;
        return newHistory;
      });
    } else {
      // 새로운 채팅 추가
      setChatHistory(prev => [...prev, chatData]);
    }
  }, [selectedCharacter, chatHistory]);

  const handleInitializeChat = useCallback(() => {
    // 캐릭터가 선택되지 않은 경우 기본 캐릭터 선택
    if (!selectedCharacter) {
      const defaultCharacter = { id: '2', name: '내면이', description: '당신의 슬픔을 이해하고 함께 극복해나가는 방법을 찾아드립니다.', avatar: '😢' };
      setSelectedCharacter(defaultCharacter);
      
      // 기본 캐릭터 선택 후 바로 초기 메시지 생성
      const initialMessage = "안녕... 무엇이 너를 가장 슬프게 하니...?";
      const initialBotMessage: FrontendChatMessage = {
        id: 'initial-default-' + Date.now().toString(),
        type: 'assistant',
        content: initialMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages([initialBotMessage]);
      
      // 채팅 히스토리에 직접 추가
      const chatData: ChatHistory = {
        id: 'default-' + Date.now().toString(),
        characterId: defaultCharacter.id,
        characterName: defaultCharacter.name,
        characterAvatar: defaultCharacter.avatar,
        messages: [initialBotMessage],
        date: new Date().toISOString().split('T')[0],
        lastMessage: initialMessage
      };
      
      setChatHistory(prev => [...prev, chatData]);
      return;
    }
    
    if (selectedCharacter && chatMessages.length === 0) {
      const characterMessages: { [key: string]: string[] } = {
        '추진이': [
          "목표를 향해 나아가고 있나요? 함께 계획을 세워봐요!",
          "어떤 도전을 하고 계신가요? 성공 전략을 논의해봐요!",
          "효율적인 해결책을 찾아드릴게요!",
          "앞으로 나아갈 동력을 함께 만들어봐요!"
        ],
        '내면이': [
          "자신에 대해 깊이 생각해본 적이 있나요?",
          "내면의 소리에 귀 기울여봐요",
          "진정한 자아를 발견하는 여정을 함께해요",
          "마음속 깊은 이야기를 나눠봐요"
        ],
        '관계이': [
          "주변 사람들과의 관계는 어떠신가요?",
          "소통에서 어려움을 겪고 계신가요?",
          "더 깊은 인간관계를 만들어가봐요",
          "조화로운 관계 형성에 대해 이야기해봐요"
        ],
        '안정이': [
          "마음의 평화를 찾고 계신가요?",
          "안정적인 삶을 위한 조언을 드릴게요",
          "갈등 상황을 조화롭게 해결해봐요",
          "균형 잡힌 삶에 대해 함께 생각해봐요"
        ],
        '쾌락이': [
          "삶의 즐거움을 찾고 계신가요?",
          "새로운 경험에 대해 이야기해봐요!",
          "창의적인 관점으로 문제를 바라봐요",
          "흥미진진한 해결방안을 함께 찾아봐요!"
        ]
      };

      const characterName = selectedCharacter.name;
      const messages = characterMessages[characterName] || characterMessages['안정이'];
      const initialMessage = messages[Math.floor(Math.random() * messages.length)];
      
      const initialBotMessage: FrontendChatMessage = {
        id: 'initial-' + Date.now().toString(),
        type: 'assistant',
        content: initialMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages([initialBotMessage]);
      // 초기 메시지도 채팅 기록에 저장
      saveChatToHistory([initialBotMessage]);
    }
  }, [selectedCharacter, chatMessages.length, saveChatToHistory]);

  // 캐릭터별 응답 메시지 생성 함수
  const generateBotResponse = useCallback((_userMessage: string) => {
    const characterName = selectedCharacter?.name || '안정이';
    
    const responses: { [key: string]: string[] } = {
      '추진이': [
        "좋아요! 그 목표를 달성하기 위한 구체적인 계획이 있나요?",
        "성공을 위해서는 체계적인 접근이 필요해요. 어떻게 진행하실 건가요?",
        "효율적인 방법을 찾아보죠. 우선순위는 어떻게 정하셨나요?",
        "도전적이네요! 그 과정에서 예상되는 어려움은 무엇인가요?",
        "실행력이 중요해요. 언제까지 완료하실 계획인가요?",
        "성과를 측정할 수 있는 지표가 있다면 더 좋겠어요!",
        "훌륭한 추진력이에요! 다음 단계는 무엇인가요?"
      ],
      '내면이': [
        "깊이 있는 생각이네요. 그 감정의 근원을 더 탐구해볼까요?",
        "자신을 되돌아보는 시간은 정말 소중해요. 어떤 깨달음이 있었나요?",
        "내면의 목소리에 귀 기울이고 계시는군요. 무엇을 말하고 있나요?",
        "자아 성찰의 과정은 쉽지 않죠. 어떤 부분이 가장 어려우신가요?",
        "진정한 자신을 발견하는 여정이군요. 어떤 변화를 느끼시나요?",
        "내면의 평화를 찾아가는 과정은 어떠신가요?",
        "마음 깊은 곳의 이야기를 더 들어보고 싶어요."
      ],
      '관계이': [
        "인간관계에서 가장 중요한 건 서로를 이해하는 거예요. 어떻게 생각하세요?",
        "상대방의 입장에서 생각해보신 적이 있나요?",
        "소통에서 어려움을 느끼실 때는 어떻게 해결하시나요?",
        "좋은 관계를 유지하기 위해 어떤 노력을 하고 계신가요?",
        "갈등이 있을 때는 어떻게 해결하는 게 좋을까요?",
        "상대방과 더 깊은 유대감을 형성하고 싶으시군요!",
        "조화로운 관계를 만들어가는 과정은 정말 의미 있어요."
      ],
      '안정이': [
        "마음의 평화가 가장 중요해요. 지금 어떤 기분이신가요?",
        "균형 잡힌 삶을 위해 어떤 것들을 우선시하고 계신가요?",
        "갈등 상황에서는 차분하게 접근하는 것이 좋아요.",
        "안정감을 찾기 위해 어떤 방법을 사용하시나요?",
        "평온한 마음 상태를 유지하는 비결이 있다면?",
        "조화로운 해결책을 함께 찾아보아요.",
        "내면의 안정을 찾아가는 과정은 어떠신가요?"
      ],
      '쾌락이': [
        "와! 정말 흥미로운 아이디어네요! 더 발전시켜볼까요?",
        "새로운 관점으로 보니까 완전히 다르게 보이네요!",
        "창의적인 해결방법이 있을 것 같은데요?",
        "즐거운 경험에서 어떤 인사이트를 얻으셨나요?",
        "삶의 재미있는 부분들을 더 탐구해봐요!",
        "혁신적인 접근 방식이 필요할 것 같아요!",
        "다양한 가능성을 열어두고 생각해보는 건 어떨까요?"
      ]
    };

    const characterResponses = responses[characterName] || responses['안정이'];
    return characterResponses[Math.floor(Math.random() * characterResponses.length)];
  }, [selectedCharacter]);

  const handleSendMessage = useCallback((message: string) => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    
    const newMessage: FrontendChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, newMessage]);

    // 캐릭터별 AI 응답
    setTimeout(() => {
      const aiResponse: FrontendChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateBotResponse(message),
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => {
        const updatedMessages = [...prev, aiResponse];
        // 채팅 기록 저장
        saveChatToHistory(updatedMessages);
        return updatedMessages;
      });
      setIsSending(false);
    }, 1000);
  }, [isSending, generateBotResponse, saveChatToHistory]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleShowRating = useCallback(() => {
    setShowRatingModal(true);
  }, []);

  const handleCloseRatingModal = useCallback(() => {
    setShowRatingModal(false);
  }, []);

  const handleGoToMyPage = useCallback(() => {
    setCurrentScreen('mypage');
  }, []);

  const handleNewChat = useCallback(() => {
    setChatMessages([]); // 새로운 채팅 시작 시 메시지 초기화
    setSelectedCharacter(null);
    setCurrentScreen('main');
  }, []);

  const handleDeleteAccount = useCallback(() => {
    if (window.confirm('정말로 회원 탈퇴를 하시겠습니까?')) {
      // 실제로는 서버에 탈퇴 요청을 보내야 함
      alert('회원 탈퇴가 완료되었습니다.');
      setCurrentScreen('landing');
      setUserProfile(null);
    }
  }, []);

  // 현재 검사 결과에 따라 이용 가능한 캐릭터 필터링
  const getAvailableCharacters = useCallback(() => {
    // characters 페이지에서는 항상 모든 캐릭터를 보여줌
    // 다른 페이지에서도 일단 모든 캐릭터 이용 가능하도록 변경
    return characters;
  }, []);

  const handleContinueChat = useCallback((chatId: string, characterName: string) => {
    // 해당 채팅 기록을 찾아서 메시지를 복원
    const targetChat = chatHistory.find(chat => chat.id === chatId);
    if (targetChat) {
      // 캐릭터 설정
      const character = getAvailableCharacters().find(char => char.name === characterName);
      if (character) {
        setSelectedCharacter(character);
      }
      // 메시지 기록 복원
      setChatMessages(targetChat.messages);
    }
  }, [chatHistory, getAvailableCharacters]);

  const handleUpdateProfile = useCallback((updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    // 실제 애플리케이션에서는 여기서 서버에 프로필 업데이트 요청을 보내야 함
  }, []);

  const updateTestResult = useCallback((newTestResult: string) => {
    setCurrentTestResult(newTestResult);
  }, []);

  // 최신 테스트 결과에 따라 캐릭터 설정
  const setCharacterFromTestResult = useCallback((testResult: DrawingTest) => {
    if (testResult.result?.persona_info) {
      const personaName = testResult.result.persona_info.persona_name;
      console.log(`🎭 테스트 결과에서 캐릭터 이름: ${personaName}`);
      
      // 캐릭터 매핑 (이제 유형 이름이 캐릭터 이름과 동일)
      const character = getAvailableCharacters().find(char => char.name === personaName);
      
      if (character) {
        console.log(`✅ 캐릭터 설정 완료: ${personaName}`);
        setSelectedCharacter(character);
      } else {
        console.log(`❌ 캐릭터를 찾을 수 없음: ${personaName}, 기본 캐릭터(안정이) 사용`);
        const defaultCharacter = getAvailableCharacters().find(char => char.name === '안정이');
        if (defaultCharacter) {
          setSelectedCharacter(defaultCharacter);
        }
      }
    }
  }, [getAvailableCharacters]);

  return {
    currentScreen,
    selectedCharacter,
    chatMessages,
    chatHistory,
    testResults,
    userProfile,
    showModal,
    showRatingModal,
    currentTestResult,
    isSending,
    getAvailableCharacters,
    handleGoogleLogin,
    handleStartDreamSearch,
    handleCharacterSelect,
    handleStartChat,
    handleSendMessage,
    handleCloseModal,
    handleShowRating,
    handleCloseRatingModal,
    handleGoToMyPage,
    handleNewChat,
    handleDeleteAccount,
    handleContinueChat,
    handleUpdateProfile,
    handleInitializeChat,
    updateTestResult,
    setCharacterFromTestResult
  };
};
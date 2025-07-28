import { useState, useCallback } from 'react';
import { ScreenType, SearchResult, FrontendChatMessage, ChatHistory, TestResult, UserProfile } from '../types';
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
        '기쁨이': [
          "안녕! 오늘 뭔가 좋은 일이 있을 것 같은데?",
          "하이~ 기분 좋은 하루 보내고 있어?",
          "웃어봐! 세상이 더 밝아 보일 거야!",
          "오늘은 특별한 날이야. 뭔가 신나는 일을 해볼까?"
        ],
        '버럭이': [
          "뭐가 그렇게 짜증나는 거야? 말해봐!",
          "화났어? 속시원하게 털어놔!",
          "답답한 게 있으면 다 말해! 내가 들어줄게!",
          "억울한 일이라도 있었나? 화내도 괜찮아!"
        ],
        '슬픔이': [
          "안녕... 무엇이 너를 가장 슬프게 하니...?",
          "힘든 하루였나? 천천히 말해줘...",
          "슬픈 일이 있었구나... 함께 이야기해보자",
          "괜찮아... 여기서는 마음껏 울어도 돼"
        ],
        '무서미': [
          "걱정되는 일이 있어? 천천히 말해봐",
          "무서운 게 있다면 함께 해결해보자",
          "불안하지? 괜찮아, 내가 옆에 있어",
          "두려운 마음, 충분히 이해해... 어떤 기분이야?"
        ],
        '까칠이': [
          "뭔 일이야? 솔직히 말해봐",
          "또 무슨 일로 고민이야? 현실적으로 생각해보자",
          "쓸데없는 걱정 말고, 정확히 뭐가 문제인지 말해",
          "그만 우울해하고, 뭐가 진짜 문제인지 파악해보자"
        ]
      };

      const characterName = selectedCharacter.name;
      const messages = characterMessages[characterName] || characterMessages['슬픔이'];
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
    const characterName = selectedCharacter?.name || '슬픔이';
    
    const responses: { [key: string]: string[] } = {
      '기쁨이': [
        "와! 정말 좋은 이야기네요! 더 들어보고 싶어요!",
        "그런 일이 있었군요! 기분이 어떠셨나요?",
        "정말 흥미로워요! 그래서 어떻게 되었나요?",
        "오~ 그런 경험을 하셨군요! 저도 함께 기뻐해요!",
        "멋진 일이네요! 그때 기분을 더 자세히 말해주세요!",
        "우와! 듣기만 해도 기분이 좋아져요!",
        "정말 좋은 경험이었겠어요! 다른 이야기도 있나요?"
      ],
      '버럭이': [
        "진짜 화나는 일이었겠네! 나도 같이 화나!",
        "그런 건 당연히 짜증날 만해! 더 말해봐!",
        "아, 정말 답답했겠다! 그래서 어떻게 했어?",
        "말도 안 되는 일이네! 정말 화가 치밀어 올라!",
        "그런 상황이면 누구라도 화날 거야! 속 터져!",
        "정말 이해 안 가는 상황이다! 더 털어놔!",
        "그런 일로 스트레스받지 마! 다 말해봐!"
      ],
      '슬픔이': [
        "정말 힘들었겠어요... 괜찮으시나요?",
        "그런 일이 있었군요... 많이 슬프셨을 것 같아요",
        "마음이 아프네요... 혼자 견디기 힘들었죠?",
        "이해해요... 그럴 때는 정말 외롭죠",
        "정말 안타까워요... 지금은 어떤 기분이세요?",
        "힘든 시간을 보내셨군요... 함께 이야기해요",
        "그런 마음 충분히 이해해요... 더 말해주세요"
      ],
      '무서미': [
        "걱정이 많으시겠어요... 불안하셨죠?",
        "그런 상황이면 무섭기도 하고 걱정되기도 했을 거예요",
        "혼자 감당하기 어려웠을 것 같아요... 괜찮으세요?",
        "두려운 마음 충분히 이해해요... 어떤 기분이었나요?",
        "그럴 때는 정말 불안하죠... 지금은 어떠세요?",
        "마음이 편하지 않으셨을 거예요... 함께 이야기해요",
        "걱정이 클 때는 정말 힘들죠... 더 말해주세요"
      ],
      '까칠이': [
        "그래서 결론이 뭐야? 정확히 말해봐",
        "솔직히 말하면, 그건 당연한 결과 아니야?",
        "뭘 기대했던 거야? 현실적으로 생각해봐",
        "그런 식으로 하면 당연히 그렇게 되지",
        "정신 차리고 제대로 접근해야지",
        "감정적으로 생각하지 말고 논리적으로 판단해",
        "그래서 이제 어떻게 할 계획이야?"
      ]
    };

    const characterResponses = responses[characterName] || responses['슬픔이'];
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
    updateTestResult
  };
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../common/Navigation';
import { ChatHistory, TestResult, UserProfile } from '../../types';
import { MessageCircle, FileText, User, Calendar, Edit2, Camera, Check, X, Loader } from 'lucide-react';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { chatService } from '../../services/chatService';
import { testService } from '../../services/testService';
import { Button } from "../../components/ui/button";

interface MyPageProps {
  onNewChat: () => void;
  onDeleteAccount: () => void;
  onNavigate?: (screen: string) => void;
  onContinueChat?: (chatId: string, characterName: string) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const MyPage: React.FC<MyPageProps> = ({
  onNewChat,
  onDeleteAccount,
  onNavigate,
  onContinueChat,
  onUpdateProfile
}) => {
  const navigate = useNavigate();
  
  // API에서 가져온 실제 데이터 상태
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState(userProfile?.name || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameCheckResult, setNicknameCheckResult] = useState<'available' | 'taken' | 'error' | null>(null);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 현재 로그인된 사용자 ID 상태
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // 실제 사용자 정보 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // authService에서 직접 userId 가져오기 (더 효율적)
        const userId = authService.getCurrentUserId();
        
        if (userId) {
          setCurrentUserId(userId);
          console.log('마이페이지 - 현재 로그인된 사용자 ID:', userId);
        } else {
          // API를 통해 사용자 정보 확인
          const user = await authService.getCurrentUser();
          if (user) {
            setCurrentUserId(user.id);
            console.log('마이페이지 - API에서 사용자 ID 복구:', user.id);
          } else {
            console.error('사용자가 로그인되어 있지 않습니다.');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        navigate('/');
      }
    };
    
    loadCurrentUser();
  }, [navigate]);
  
  // 디바운스 타이머 레퍼런스
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 무한 스크롤 관련 상태
  const [displayedChats, setDisplayedChats] = useState<ChatHistory[]>([]);
  const [displayedTests, setDisplayedTests] = useState<TestResult[]>([]);
  const [chatPage, setChatPage] = useState(0);
  const [testPage, setTestPage] = useState(0);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [hasMoreTests, setHasMoreTests] = useState(true);
  const chatObserverRef = useRef<HTMLDivElement>(null);
  const testObserverRef = useRef<HTMLDivElement>(null);
  
  const ITEMS_PER_PAGE = 5;

  // 캐릭터 ID에 따른 아바타 매핑
  const getCharacterAvatar = (friendsId: number | null): string => {
    switch (friendsId) {
      case 1: return '😊'; // 기쁨이
      case 2: return '😤'; // 버럭이  
      case 3: return '😢'; // 슬픔이
      case 4: return '😱'; // 무서미
      case 5: return '😒'; // 까칠이
      default: return '🤖'; // 기본 AI
    }
  };

  // 채팅 히스토리 초기 로드
  const loadInitialChats = useCallback(() => {
    const sortedChats = [...chatHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDisplayedChats(sortedChats.slice(0, ITEMS_PER_PAGE));
    setChatPage(0);
    setHasMoreChats(sortedChats.length > ITEMS_PER_PAGE);
  }, [chatHistory]);

  // 검사 결과 초기 로드
  const loadInitialTests = useCallback(() => {
    const sortedTests = [...testResults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDisplayedTests(sortedTests.slice(0, ITEMS_PER_PAGE));
    setTestPage(0);
    setHasMoreTests(sortedTests.length > ITEMS_PER_PAGE);
  }, [testResults]);

  // 실제 사용자 데이터 로드
  const loadUserData = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      setIsLoadingProfile(true);
      
      // 사용자 프로필 로드
      const profile = await userService.getUserProfile(currentUserId);
      setUserProfile(profile);
      setEditingName(profile.name);
      
      // 채팅 히스토리 로드 (실제 채팅 API 사용)
      console.log('마이페이지에서 사용자 ID:', currentUserId);
      console.log('localStorage access_token:', localStorage.getItem('access_token'));
      const sessions = await chatService.getUserSessions(currentUserId);
      console.log('불러온 세션 개수:', sessions.length);
      console.log('세션 데이터:', sessions);
      const chatHistoryData: (ChatHistory | null)[] = await Promise.all(
        sessions.map(async (session) => {
          try {
            // 각 세션의 상세 정보와 메시지를 가져옴
            const sessionDetail = await chatService.getSessionDetail(session.chat_sessions_id);
            const lastMessage = sessionDetail.messages && sessionDetail.messages.length > 0 
              ? sessionDetail.messages[sessionDetail.messages.length - 1].content 
              : '대화가 시작되지 않았습니다.';
            
            return {
              id: session.chat_sessions_id,
              characterId: session.friends_id?.toString() || '',
              characterName: session.session_name || 'AI 상담사',
              characterAvatar: getCharacterAvatar(session.friends_id),
              date: session.created_at.split('T')[0],
              lastMessage,
              messages: sessionDetail.messages?.map(msg => ({
                id: msg.chat_messages_id,
                type: msg.sender_type as 'user' | 'assistant',
                content: msg.content,
                timestamp: msg.created_at
              })) || []
            };
          } catch (error) {
            console.error('세션 상세 정보 로드 실패:', error);
            return null; // 에러 발생 시 null 반환
          }
        })
      );
      
      // null이 아니고 메시지가 있는 세션만 필터링
      const validChatHistory = chatHistoryData.filter(chat => 
        chat !== null && chat.messages && chat.messages.length > 0
      ) as ChatHistory[];
      
      setChatHistory(validChatHistory);
      
      // 테스트 결과 로드
      const tests = await testService.getMyTestResults();
      setTestResults(tests.map(test => ({
        id: test.test_id.toString(),
        testType: 'Drawing' as const,
        result: test.result?.summary_text || '결과 분석 중입니다.',
        characterMatch: test.result?.friend_info?.friends_name || '분석 중',
        date: test.submitted_at,
        description: test.result?.summary_text || '자세한 내용은 결과보기를 확인하세요.',
        images: [test.image_url]
      })));
      
    } catch (error: any) {
      console.error('사용자 데이터 로드 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      console.error('전체 에러 객체:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [currentUserId]);

  // API에서 실제 데이터 로드
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // 채팅 히스토리 초기화
  useEffect(() => {
    if (chatHistory.length > 0) {
      loadInitialChats();
    }
  }, [chatHistory, loadInitialChats]);

  // 테스트 결과 초기화
  useEffect(() => {
    if (testResults.length > 0) {
      loadInitialTests();
    }
  }, [testResults, loadInitialTests]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 더 많은 채팅 로드
  const loadMoreChats = useCallback(async () => {
    if (isLoadingChats || !hasMoreChats) return;
    
    setIsLoadingChats(true);
    
    // 실제 구현에서는 API 호출
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const sortedChats = [...chatHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const nextPage = chatPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newChats = sortedChats.slice(startIndex, endIndex);
    
    setDisplayedChats(prev => [...prev, ...newChats]);
    setChatPage(nextPage);
    setHasMoreChats(endIndex < sortedChats.length);
    setIsLoadingChats(false);
  }, [chatHistory, chatPage, isLoadingChats, hasMoreChats]);

  // 더 많은 검사 결과 로드
  const loadMoreTests = useCallback(async () => {
    if (isLoadingTests || !hasMoreTests) return;
    
    setIsLoadingTests(true);
    
    // 실제 구현에서는 API 호출
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const sortedTests = [...testResults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const nextPage = testPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newTests = sortedTests.slice(startIndex, endIndex);
    
    setDisplayedTests(prev => [...prev, ...newTests]);
    setTestPage(nextPage);
    setHasMoreTests(endIndex < sortedTests.length);
    setIsLoadingTests(false);
  }, [testResults, testPage, isLoadingTests, hasMoreTests]);

  // Intersection Observer 설정
  useEffect(() => {
    const chatObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreChats && !isLoadingChats) {
          loadMoreChats();
        }
      },
      { threshold: 0.1 }
    );

    const testObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreTests && !isLoadingTests) {
          loadMoreTests();
        }
      },
      { threshold: 0.1 }
    );

    if (chatObserverRef.current) {
      chatObserver.observe(chatObserverRef.current);
    }
    if (testObserverRef.current) {
      testObserver.observe(testObserverRef.current);
    }

    return () => {
      chatObserver.disconnect();
      testObserver.disconnect();
    };
  }, [hasMoreChats, hasMoreTests, isLoadingChats, isLoadingTests, loadMoreChats, loadMoreTests]);

  const handleNewChat = () => {
    onNewChat();
    navigate('/main');
  };

  const handleContinueChat = (chat: ChatHistory) => {
    if (onContinueChat) {
      onContinueChat(chat.id, chat.characterName);
    }
    // 채팅 세션 ID를 URL 파라미터로 전달하여 채팅 페이지로 이동
    navigate(`/chat?sessionId=${chat.id}`);
  };

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
    setEditingName(userProfile?.name || '');
    setNicknameCheckResult(null);
    setIsNicknameChecked(false);
    setNameError(null);
  };

  const validateNickname = (name: string): string | null => {
    if (name.length < 2) return '닉네임은 2자 이상이어야 합니다.';
    if (name.length > 20) return '닉네임은 20자 이하여야 합니다.';
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(name)) return '닉네임은 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.';
    return null;
  };

  // 디바운스된 닉네임 검사
  const debouncedNicknameCheck = useCallback(async (nickname: string) => {
    if (!currentUserId) return;
    
    const error = validateNickname(nickname);
    if (error) {
      setNameError(error);
      setNicknameCheckResult(null);
      setIsNicknameChecked(false);
      return;
    }

    if (nickname === userProfile?.name) {
      setNicknameCheckResult('available');
      setIsNicknameChecked(true);
      setNameError(null);
      return;
    }

    setIsCheckingNickname(true);
    setNameError(null);
    
    try {
      const result = await userService.checkNickname(currentUserId, nickname);
      setNicknameCheckResult(result.available ? 'available' : 'taken');
      setIsNicknameChecked(true);
    } catch (error) {
      console.error('닉네임 확인 실패:', error);
      setNicknameCheckResult('error');
      setIsNicknameChecked(false);
    } finally {
      setIsCheckingNickname(false);
    }
  }, [currentUserId, userProfile?.name]);

  const handleNicknameCheck = useCallback(() => {
    debouncedNicknameCheck(editingName);
  }, [debouncedNicknameCheck, editingName]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setEditingName(newName);
    setNicknameCheckResult(null);
    setIsNicknameChecked(false);
    setNameError(null);
    
    // 디바운스된 자동 닉네임 검사 (800ms 후)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (newName.trim() && newName !== userProfile?.name) {
        debouncedNicknameCheck(newName);
      }
    }, 800);
  }, [debouncedNicknameCheck, userProfile?.name]);

  const handleProfileSave = useCallback(async () => {
    if (!currentUserId) return;
    
    // 닉네임이 기존과 동일하지 않은 경우에만 중복검사 확인
    if (editingName !== userProfile?.name && (!isNicknameChecked || nicknameCheckResult !== 'available')) {
      setNameError('닉네임 중복 검사를 완료해주세요.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Optimistic Update: UI를 먼저 업데이트
    const originalProfile = userProfile;
    if (userProfile) {
      const optimisticProfile: UserProfile = {
        ...userProfile,
        name: editingName,
      };
      setUserProfile(optimisticProfile);
      if (onUpdateProfile) {
        onUpdateProfile(optimisticProfile);
      }
    }

    try {
      // 백엔드 업데이트
      await userService.updateUser(currentUserId, { nickname: editingName });
      
      setSaveSuccess(true);
      // 성공 딜레이 단축: 1.5초 → 0.8초
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveSuccess(false);
      }, 800);
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setSaveError('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      
      // 실패 시 원래 상태로 롤백
      if (originalProfile) {
        setUserProfile(originalProfile);
        if (onUpdateProfile) {
          onUpdateProfile(originalProfile);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [currentUserId, editingName, userProfile, isNicknameChecked, nicknameCheckResult, onUpdateProfile]);

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setEditingName(userProfile?.name || '');
    setProfileImage(null);
    setNicknameCheckResult(null);
    setIsNicknameChecked(false);
    setNameError(null);
    setImageError(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const validateImageFile = (file: File): string | null => {
    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return '이미지 파일은 5MB 이하여야 합니다.';
    }

    // 파일 형식 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'JPG, PNG, GIF 형식의 이미지 파일만 업로드 가능합니다.';
    }

    return null;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      event.target.value = ''; // 입력 필드 초기화
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupByDate = (items: any[]) => {
    return items.reduce((groups: { [key: string]: any[] }, item) => {
      const date = item.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {});
  };

  const chatsByDate = groupByDate(displayedChats);
  const testsByDate = groupByDate(displayedTests);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation onNavigate={onNavigate} />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-800">마이페이지</h1>
            <p className="text-gray-600">당신의 검사 기록과 대화 내역을 확인하세요</p>
          </div>

          {/* User Profile Card */}
          <div className="bg-slate-700/50 backdrop-blur-sm border border-white/20 shadow-xl rounded-3xl p-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                {isEditingProfile && (
                  <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4 text-gray-600" />
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                {isEditingProfile ? (
                  <div className="space-y-3">
                    {/* 닉네임 입력 */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">닉네임</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={handleNameChange}
                          className={`flex-1 px-3 py-2 border rounded-md bg-white/90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            nameError ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="닉네임을 입력하세요"
                        />
                        <button
                          onClick={handleNicknameCheck}
                          disabled={isCheckingNickname || !editingName.trim()}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${
                            isCheckingNickname || !editingName.trim()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isCheckingNickname ? '확인 중...' : '중복 확인'}
                        </button>
                      </div>

                      {/* 닉네임 검사 결과 */}
                      {nicknameCheckResult && (
                        <div className={`mt-2 flex items-center space-x-1 text-sm ${
                          nicknameCheckResult === 'available' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {nicknameCheckResult === 'available' ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>사용 가능한 닉네임입니다.</span>
                            </>
                          ) : nicknameCheckResult === 'taken' ? (
                            <>
                              <X className="w-4 h-4" />
                              <span>이미 사용 중인 닉네임입니다.</span>
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              <span>중복 확인 중 오류가 발생했습니다.</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* 에러 메시지 */}
                      {nameError && (
                        <div className="mt-2 flex items-center space-x-1 text-sm text-red-400">
                          <X className="w-4 h-4" />
                          <span>{nameError}</span>
                        </div>
                      )}
                    </div>

                    {/* 이미지 업로드 에러 */}
                    {imageError && (
                      <div className="flex items-center space-x-1 text-sm text-red-400">
                        <X className="w-4 h-4" />
                        <span>{imageError}</span>
                      </div>
                    )}

                    {/* 저장 성공/실패 메시지 */}
                    {saveError && (
                      <div className="flex items-center space-x-1 text-sm text-red-400">
                        <X className="w-4 h-4" />
                        <span>{saveError}</span>
                      </div>
                    )}
                    {saveSuccess && (
                      <div className="flex items-center space-x-1 text-sm text-green-400">
                        <Check className="w-4 h-4" />
                        <span>프로필이 성공적으로 저장되었습니다.</span>
                      </div>
                    )}

                    {/* 저장/취소 버튼 */}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleProfileSave}
                        disabled={
                          (editingName !== userProfile?.name && (!isNicknameChecked || nicknameCheckResult !== 'available')) || 
                          isSaving
                        }
                        className={`px-4 py-2 rounded-md text-sm transition-colors ${
                          (editingName !== userProfile?.name && (!isNicknameChecked || nicknameCheckResult !== 'available')) || 
                          isSaving
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={handleProfileCancel}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-md text-sm transition-colors ${
                          isSaving
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isLoadingProfile ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="w-5 h-5 animate-spin text-white" />
                        <span className="text-white/70">프로필 로딩 중...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-xl font-bold text-white">{userProfile?.name || '사용자'}</h2>
                          <button
                            onClick={handleProfileEdit}
                            className="p-1 text-white/60 hover:text-white transition-colors"
                            title="프로필 편집"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-white/70">{userProfile?.email}</p>
                        <div className="flex items-center space-x-6 mt-2 text-sm text-white/50">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>가입일: {userProfile?.joinDate && formatDate(userProfile.joinDate)}</span>
                          </span>
                          <span>총 검사: {userProfile?.totalTests}회</span>
                          <span>총 채팅: {userProfile?.totalChats}회</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="bg-slate-700/50 backdrop-blur-sm border border-white/20 shadow-xl rounded-3xl">
            <div className="p-6 border-b border-white/20">
              <h3 className="flex items-center space-x-2 text-xl font-bold text-white">
                <MessageCircle className="w-5 h-5 text-white" />
                <span>채팅 히스토리</span>
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {displayedChats.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p>아직 채팅 기록이 없습니다.</p>
                </div>
              ) : (
                <>
                  {Object.entries(chatsByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, chats]) => (
                      <div key={date} className="space-y-2">
                        <h4 className="text-sm font-medium text-white/60">{formatDate(date)}</h4>
                        {chats.map((chat: ChatHistory) => (
                          <div
                            key={chat.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-600/30 rounded-xl transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-xl">
                                {chat.characterAvatar}
                              </div>
                              <div>
                                <p className="font-medium text-white">{chat.characterName}와의 대화</p>
                                <p className="text-sm text-white/60">
                                  {chat.messages && chat.messages.length > 0 && chat.messages[chat.messages.length - 1]?.timestamp 
                                    ? formatTime(chat.messages[chat.messages.length - 1].timestamp) 
                                    : '시간 정보 없음'} · 메시지 {chat.messages?.length || 0}개
                                </p>
                              </div>
                            </div>
                            <button 
                              className="px-3 py-1 text-sm border border-white/30 text-white hover:bg-white/10 rounded-full transition-colors"
                              onClick={() => handleContinueChat(chat)}
                            >
                              이어서 대화하기
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}

                  {isLoadingChats && (
                    <div className="flex justify-center py-4">
                      <Loader className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}

                  {hasMoreChats && <div ref={chatObserverRef} className="h-4" />}

                  {!hasMoreChats && displayedChats.length > 0 && (
                    <div className="text-center py-4 text-white/50 text-sm">
                      모든 채팅 기록을 불러왔습니다.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-slate-700/50 backdrop-blur-sm border border-white/20 shadow-xl rounded-3xl">
            <div className="p-6 border-b border-white/20">
              <h3 className="flex items-center space-x-2 text-xl font-bold text-white">
                <FileText className="w-5 h-5 text-white" />
                <span>그림 검사 결과</span>
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {displayedTests.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p>아직 검사 결과가 없습니다.</p>
                </div>
              ) : (
                <>
                  {Object.entries(testsByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, tests]) => (
                      <div key={date} className="space-y-2">
                        <h4 className="text-sm font-medium text-white/60">{formatDate(date)}</h4>
                        {tests.map((test: TestResult) => (
                          <div
                            key={test.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-600/30 rounded-xl transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              {test.images && test.images[0] && (
                                <img
                                  src={testService.getImageUrl(test.images[0])}
                                  alt="Test Result"
                                  className="w-16 h-16 rounded-lg object-cover border border-white/20"
                                />
                              )}
                              <div>
                                <p className="font-medium text-white">{formatDate(test.date)} 결과</p>
                                <p className="text-sm text-purple-200">페르소나: {test.characterMatch}</p>
                                {test.images && (
                                  <p className="text-xs text-white/40">첨부된 이미지: {test.images.length}개</p>
                                )}
                              </div>
                            </div>
                            <button
                              className="px-3 py-1 text-sm border border-white/30 text-white hover:bg-white/10 rounded-full transition-colors"
                              onClick={() => navigate(`/result-detail/${test.id}`)}
                            >
                              자세히 보기
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}

                  {isLoadingTests && (
                    <div className="flex justify-center py-4">
                      <Loader className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}

                  {hasMoreTests && <div ref={testObserverRef} className="h-4" />}

                  {!hasMoreTests && displayedTests.length > 0 && (
                    <div className="text-center py-4 text-white/50 text-sm">
                      모든 검사 결과를 불러왔습니다.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Account Management */}
          <div className="text-center">
            <Button
              onClick={() => onNavigate?.("welcome")}
              className="bg-slate-600/50 hover:bg-slate-600/70 text-white px-6 py-3 rounded-full font-medium"
            >
              회원탈퇴
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPage;
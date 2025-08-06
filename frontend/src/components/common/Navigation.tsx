import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { testService } from '../../services/testService';
import { chatService } from '../../services/chatService';

interface NavigationProps {
  activeTab?: string;
  onNavigate?: (screen: string) => void;
  onSetCharacterFromTest?: (testResult: any) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onNavigate, onSetCharacterFromTest }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { name: "MY MOODY", screen: "main", route: "/main" },
    { name: "그림검사", screen: "test", route: "/test" },
    { name: "페르소나 소개 ", screen: "characters", route: "/characters" },
    { name: "챗봇", screen: "chat", route: "/chat" },
    { name: "마이페이지", screen: "mypage", route: "/mypage" },
    { name: "로그아웃", screen: "logout", route: "/", isLogout: true },
  ];
  
  // URL 기반으로 활성 탭 결정
  const getActiveTab = () => {
    if (activeTab) return activeTab; // 명시적으로 전달된 activeTab이 있으면 사용
    
    switch (location.pathname) {
      case '/main':
        return 'main';
      case '/test':
      case '/test-instruction':
        return 'test';
      case '/results':
        return 'results';
      case '/chat':
        return 'chat';
      case '/characters':
        return 'characters'; 
      case '/mypage':
        return 'mypage';
      default:
        return 'main';
    }
  };

  const currentActiveTab = getActiveTab();

  const handleLogout = async () => {
    try {
      console.log('Navigation: Starting logout...');
      await authService.signOut();
      console.log('Navigation: Logout successful, redirecting...');
      
      // 강제로 홈페이지로 이동 (완전한 페이지 리로드)
      window.location.href = '/';
      
    } catch (error) {
      console.error('Navigation: Logout failed:', error);
      // 에러가 발생해도 로그아웃 처리 (강제 리다이렉션)
      window.location.href = '/';
    }
  };

  // onNavigate prop이 있으면 사용하고, 없으면 React Router 사용
  const handleNavigation = (screen: string, route: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigate(route);
    }
  };

  // 챗봇 클릭 시 가장 최근 세션으로 이동
  const handleChatClick = async () => {
    try {
      console.log('🔍 챗봇 클릭 - 사용자 정보 및 세션 확인 중...');
      
      // 먼저 사용자 정보 확인
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        console.log('❌ 사용자 정보 없음 - 로그인 필요');
        navigate('/');
        return;
      }
      
      // 테스트 상태 확인
      const testStatus = await testService.getUserTestStatus();
      
      if (!testStatus.hasTests) {
        console.log('📝 테스트 기록 없음 - BeforeTest 페이지로 이동');
        handleNavigation('before-test', '/before-test');
        return;
      }
      
      // 사용자의 채팅 세션 목록 조회
      const userSessions = await chatService.getUserSessions(currentUser.id);
      
      if (userSessions.length > 0) {
        // 가장 최근 방문한 세션으로 이동 (updated_at 기준 정렬 - 마지막 메시지 시간)
        const latestVisitedSession = userSessions.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        
        console.log('✅ 가장 최근 방문한 세션으로 이동:', latestVisitedSession.chat_sessions_id);
        navigate(`/chat?sessionId=${latestVisitedSession.chat_sessions_id}`);
      } else {
        console.log('📝 채팅 세션 없음 - 새 채팅 시작');
        // 최신 테스트 결과에 따라 캐릭터 설정
        if (testStatus.latestResult && onSetCharacterFromTest) {
          onSetCharacterFromTest(testStatus.latestResult);
        }
        handleNavigation('chat', '/chat');
      }
    } catch (error) {
      console.error('❌ 챗봇 세션 확인 실패:', error);
      // 에러 발생 시 기본적으로 BeforeTest 페이지로 이동
      handleNavigation('before-test', '/before-test');
    }
  };

  // 네비게이션 아이템 클릭 처리
  const handleItemClick = (item: typeof navItems[0]) => {
    if (item.isLogout) {
      handleLogout();
    } else if (item.screen === 'chat') {
      handleChatClick();
    } else if (item.route) {
      handleNavigation(item.screen, item.route);
    }
  };


  return (
    <nav className="relative z-20 flex justify-center items-center py-6">
      <div className="flex space-x-8">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              currentActiveTab === item.screen || 
              (item.screen === 'test' && currentActiveTab === 'results')
                ? "bg-white text-gray-800 shadow-lg"
                : item.isLogout
                ? "text-white/70 hover:text-red-300 hover:bg-red-500/10"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
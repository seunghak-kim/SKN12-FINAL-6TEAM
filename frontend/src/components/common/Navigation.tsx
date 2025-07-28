import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';

interface NavigationProps {
  activeTab?: string;
  onNavigate?: (screen: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onNavigate }) => {
  const location = useLocation();
  
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

  return (
    <nav className="bg-white py-4 shadow-md">
      <div className="flex justify-center gap-10 max-w-6xl mx-auto">
        <Link
          to="/main"
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            currentActiveTab === 'main' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          메인
        </Link>
        <Link
          to="/test"
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            currentActiveTab === 'test' || currentActiveTab === 'results'
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          그림검사
        </Link>
        <Link
          to="/chat"
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            currentActiveTab === 'chat' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          챗봇
        </Link>
        <Link
          to="/mypage"
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            currentActiveTab === 'mypage' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          마이페이지
        </Link>
        <button
          onClick={handleLogout}
          className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            currentActiveTab === 'logout' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
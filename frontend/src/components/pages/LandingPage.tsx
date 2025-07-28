import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface LandingPageProps {
  onGoogleLogin?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoogleLogin }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 토큰 확인 (Google OAuth 콜백에서 전달됨)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // 토큰을 로컬스토리지에 저장하고 리다이렉션
      localStorage.setItem('access_token', token);
      
      // URL에서 토큰 제거
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // 사용자 정보 확인 후 적절한 페이지로 이동
      const checkAuthAndRedirect = async () => {
        const user = await authService.getCurrentUser();
        if (user) {
          if (user.is_first_login) {
            navigate('/nickname');
          } else {
            navigate('/main');
          }
        }
      };
      
      checkAuthAndRedirect();
      return;
    }
    
    // 새로고침 vs 새 접속 구분하여 자동 로그인 처리
    const checkAuth = async () => {
      // 새로고침인지 확인 (performance.navigation API 사용)
      const isReload = performance.navigation && 
        performance.navigation.type === performance.navigation.TYPE_RELOAD;
      
      // 또는 performance.getEntriesByType 사용 (더 호환성 좋음)
      const navigationEntries = performance.getEntriesByType('navigation');
      const isReloadCompat = navigationEntries.length > 0 && 
        (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload';
      
      const isPageReload = isReload || isReloadCompat;
      
      // 새로고침이거나 브라우저 뒤로가기인 경우에만 자동 로그인 시도
      if (isPageReload) {
        const user = await authService.getCurrentUser();
        if (user) {
          if (user.is_first_login) {
            navigate('/nickname');
          } else {
            navigate('/main');
          }
        }
      }
      // 새 접속(프론트 서버 재시작 등)인 경우 랜딩페이지 유지
    };
    
    checkAuth();
  }, [navigate]);

  const handleGoogleLogin = () => {
    try {
      console.log('Starting Google OAuth redirect...');
      
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '689738363605-i65c3ar97vnts2jeh648dj3v9b23njq4.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent('http://localhost:8000/auth/google/callback');
      const scope = encodeURIComponent('openid email profile');
      
      // 올바른 Google OAuth URL
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `prompt=select_account`;
      
      console.log('Redirecting to Google OAuth:', googleAuthUrl);
      
      // Google OAuth 페이지로 리다이렉션
      window.location.href = googleAuthUrl;
      
    } catch (error) {
      console.error('OAuth redirect failed:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-black to-gray-800 min-h-screen flex items-center justify-center text-white text-center">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold mb-10 leading-tight">
          그림을 그리고<br />
          당신의 심리를 확인해보세요
        </h1>
        <div className="flex justify-center gap-5 my-10 flex-wrap">
          <div className="text-6xl mx-2 bounce-animation">🧸</div>
          <div className="text-6xl mx-2 bounce-animation">😊</div>
          <div className="text-6xl mx-2 bounce-animation">😤</div>
          <div className="text-6xl mx-2 bounce-animation">😢</div>
          <div className="text-6xl mx-2 bounce-animation">😱</div>
          <div className="text-6xl mx-2 bounce-animation">🤢</div>
          <div className="text-6xl mx-2 bounce-animation">💚</div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button 
            className="bg-white text-gray-800 border-none py-4 px-8 rounded-full text-lg font-semibold cursor-pointer flex items-center gap-3 mx-auto mt-10 hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            onClick={handleGoogleLogin}
          >
            <span className="text-blue-600 font-bold">G</span>
            구글 로그인으로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
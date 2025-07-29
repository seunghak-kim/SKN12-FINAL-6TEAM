import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/button';


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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-30 blur-lg"></div>

      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 border border-cyan-400/20 rounded-full"></div>
        <div className="absolute w-[500px] h-[500px] border border-purple-400/10 rounded-full"></div>
        <div className="absolute w-[600px] h-[600px] border border-pink-400/10 rounded-full"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">그림을 그리고</h1>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">당신의 심리를 확인해보세요</h2>
        </div>

        {/* Animal characters */}
        <div className="flex items-center justify-center mb-12 space-x-4">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">🦊</span>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
            <span className="text-2xl">🦝</span>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">🐰</span>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center">
            <span className="text-2xl">🐼</span>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-pink-200 to-gray-300 rounded-full flex items-center justify-center">
            <span className="text-2xl">🐰</span>
          </div>
        </div>

        {/* Google login button */}
        <Button
          onClick={onGoogleLogin}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-12 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <span className="mr-3 text-xl">G</span>
          구글 로그인으로 시작하기
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
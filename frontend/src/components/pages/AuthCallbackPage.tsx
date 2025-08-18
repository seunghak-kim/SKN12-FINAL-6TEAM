import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded');
        
        const isNew = searchParams.get('is_new') === 'true';
        const sessionId = searchParams.get('session');
        
        console.log('Auth callback params:', { isNew, sessionId });
        
        // 쿠키에서 토큰을 가져오기 위해 백엔드 API 호출
        const getApiUrl = () => {
          if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
          }
          // 현재 도메인이 EC2라면 EC2 주소 사용
          if (window.location.hostname.includes('ec2') || window.location.hostname.includes('amazonaws.com')) {
            return 'http://ec2-3-34-245-132.ap-northeast-2.compute.amazonaws.com/api';
          }
          return 'http://localhost:8000';
        };
        
        const response = await fetch(`${getApiUrl()}/auth/get-token`, {
          method: 'GET',
          credentials: 'include', // 쿠키 포함
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // 토큰을 localStorage에 저장
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user_info', JSON.stringify({
            id: data.user_id,
            is_first_login: isNew
          }));
          
          console.log('Token stored, redirecting...');
          
          // 적절한 페이지로 리다이렉션
          if (isNew) {
            navigate('/nickname');
          } else {
            navigate('/main');
          }
        } else {
          console.error('Failed to get token from cookie');
          navigate('/');
        }
        
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
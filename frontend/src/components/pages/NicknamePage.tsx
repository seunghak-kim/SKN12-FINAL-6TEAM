import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Loader } from 'lucide-react';
import { authService } from '../../services/authService';
import { Input } from "../../components/ui/input"

interface NicknamePageProps {
  onComplete?: (nickname: string) => void;
}

const NicknamePage: React.FC<NicknamePageProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameCheckResult, setNicknameCheckResult] = useState<'available' | 'taken' | 'error' | null>(null);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const maxLength = 12;

  useEffect(() => {
    // URL에서 토큰 확인 (Google OAuth 콜백에서 전달됨)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('Token found in URL, saving to localStorage');
      localStorage.setItem('access_token', token);
      
      // URL에서 토큰 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);


  const validateNickname = (name: string): string | null => {
    if (name.length < 2) return '닉네임은 2자 이상이어야 합니다.';
    if (name.length > maxLength) return `닉네임은 ${maxLength}자 이하여야 합니다.`;
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(name)) return '닉네임은 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.';
    return null;
  };

  const handleNicknameCheck = async () => {
    const error = validateNickname(nickname);
    if (error) {
      setNameError(error);
      return;
    }

    setIsCheckingNickname(true);
    setNameError(null);
    
    try {
      // 백엔드 API로 닉네임 중복 검사
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/check-nickname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
      });

      if (response.ok) {
        const result = await response.json();
        setNicknameCheckResult(result.available ? 'available' : 'taken');
        setIsNicknameChecked(true);
      } else {
        setNicknameCheckResult('error');
        setIsNicknameChecked(false);
      }
    } catch (error) {
      console.error('Nickname check failed:', error);
      setNicknameCheckResult('error');
      setIsNicknameChecked(false);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setNickname(value);
      setNicknameCheckResult(null);
      setIsNicknameChecked(false);
      setNameError(null);
    }
  };

  const handleNext = async () => {
    try {
      console.log('Starting nickname completion...');
      console.log('Current token:', localStorage.getItem('access_token'));
      
      const result = await authService.completeSignup(nickname);
      if (result) {
        console.log('Nickname completion successful:', result);
        if (onComplete) {
          onComplete(nickname);
        }
        // 회원가입 완료 후 메인 페이지로 이동
        navigate('/main');
      } else {
        console.error('Nickname completion returned null');
        alert('닉네임 설정에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Signup completion failed:', error);
      alert('닉네임 설정 중 오류가 발생했습니다.');
    }
  };

  const canProceed = nickname.trim() && isNicknameChecked && nicknameCheckResult === 'available';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60 blur-sm"></div>
      <div className="absolute top-40 left-40 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-40 blur-sm"></div>
      <div className="absolute bottom-32 left-32 w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-50 blur-sm"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full opacity-30 blur-lg"></div>
      <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-60"></div>

      {/* Stars */}
      <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-cyan-400 rounded-full opacity-80"></div>
      <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-pink-400 rounded-full opacity-60"></div>
      <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-70"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">당신의 닉네임을 알려주세요</h2>
        </div>

        <div className="w-full max-w-md mx-auto mb-2 flex gap-3 items-center">
          <Input
            type="text"
            placeholder="AI 캐릭터가 당신을 부르는 이름을 설정해주세요"
            value={nickname}
            onChange={handleNicknameChange}
            className="flex-1 px-6 py-5 rounded-full bg-white/90 backdrop-blur-sm border-0 text-gray-800 placeholder-gray-500 text-center text-lg focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={handleNicknameCheck}
            disabled={isCheckingNickname || !nickname.trim()}
            className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-5 rounded-full text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
          >
            {isCheckingNickname ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span>확인 중</span>
              </div>
            ) : (
              '중복 확인'
            )}
          </button>
        </div>
          

        {/* 닉네임 검사 결과 */}
        {nicknameCheckResult && (
          <div className="max-w-md mx-auto mb-2">
            <div className="flex items-center justify-center space-x-2 p-2">
              {nicknameCheckResult === 'available' ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-white">사용 가능한 닉네임입니다!</span>
                </>
              ) : nicknameCheckResult === 'taken' ? (
                <>
                  <X className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-white">이미 사용 중인 닉네임입니다.</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-white">중복 확인 중 오류가 발생했습니다.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {nameError && (
          <div className="max-w-md mx-auto mb-2">
            <div className="flex items-center justify-center space-x-2 p-2">
              <X className="w-5 h-5 text-red-500" />
              <span className="font-medium text-white">{nameError}</span>
            </div>
          </div>
        )}

        {/* Bottom Button */}
        <div className="mt-8 w-full max-w-md mx-auto">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full h-14 text-lg font-medium rounded-full transition-all ${
              canProceed
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            완료
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-white/70 text-center text-sm mt-4 mb-8">
          마이페이지 - 프로필 수정에서 언제든 다시 바꿀 수 있어요
        </p>
      </div>
    </div>
  );
};

export default NicknamePage;
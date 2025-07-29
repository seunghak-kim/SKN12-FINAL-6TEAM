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

  const clearInput = () => {
    setNickname('');
    setNicknameCheckResult(null);
    setIsNicknameChecked(false);
    setNameError(null);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 px-6 py-16">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">닉네임을 알려주세요</h1>
          <p className="text-gray-600">AI 상담사가 당신을 부르는 이름이에요</p>
        </div>

        <div className="w-full max-w-md mx-auto mb-8 relative">
          <Input
            type="text"
            placeholder="AI 캐릭터가 당신을 부르는 이름을 설정해주세요"
            value={nickname}
            onChange={handleNicknameChange}
            className="w-full px-6 py-4 rounded-full bg-white/90 backdrop-blur-sm border-0 text-gray-800 placeholder-gray-500 text-center text-lg focus:ring-2 focus:ring-purple-400"
          />
          {nickname && (
            <button
              onClick={clearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
            
            {/* <div className="flex justify-between items-center">
              <button
                onClick={handleGenerateNickname}
                className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                랜덤 닉네임 생성
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('access_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNzU1MjQzOTY3fQ.O3SpbQT50lWtkQDo9y8WfirnbztQPE3tYqRibxveWb0');
                  alert('테스트 토큰 설정됨');
                }}
                className="text-xs text-red-600 hover:text-red-700 transition-colors"
              >
                테스트토큰설정
              </button>
              <span className="text-sm text-gray-500">
                {nickname.length}/{maxLength}
              </span>
            </div> */}

        {/* 중복 확인 버튼 */}
        {nickname.trim() && !isNicknameChecked && (
          <div className="text-center mb-6">
            <button
              onClick={handleNicknameCheck}
              disabled={isCheckingNickname}
              className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isCheckingNickname ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>확인 중...</span>
                </div>
              ) : (
                '닉네임 중복 확인'
              )}
            </button>
          </div>
        )}

        {/* 닉네임 검사 결과 */}
        {nicknameCheckResult && (
          <div className="max-w-md mx-auto mb-6">
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              nicknameCheckResult === 'available' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {nicknameCheckResult === 'available' ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="font-medium">사용 가능한 닉네임입니다!</span>
                </>
              ) : nicknameCheckResult === 'taken' ? (
                <>
                  <X className="w-5 h-5" />
                  <span className="font-medium">이미 사용 중인 닉네임입니다.</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5" />
                  <span className="font-medium">중복 확인 중 오류가 발생했습니다.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {nameError && (
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 text-red-700">
              <X className="w-5 h-5" />
              <span className="font-medium">{nameError}</span>
            </div>
          </div>
        )}

        {/* Profile Preview */}
        <div className="max-w-md mx-auto bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-white/20 rounded transform rotate-12"></div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900 text-lg text-left">
                {nickname || "닉네임을 입력하세요"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">타고난 입담꾼</span>
                <div className="w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-xs">🎯</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-gray-600 text-center text-sm mb-6">
          마이페이지 - 프로필 수정에서 언제든 다시 바꿀 수 있어요
        </p>
      </div>

      {/* Bottom Button */}
      <div className="p-6">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full h-14 text-lg font-medium rounded-xl transition-all ${
            canProceed
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          완료
        </button>
      </div>
    </div>
  );
};

export default NicknamePage;
"use client"

import type React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { authService } from "../../services/authService"
import { Button } from "../../components/ui/button"

type LandingPageProps = {}

const LandingPage: React.FC<LandingPageProps> = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // URL에서 토큰 확인 (Google OAuth 콜백에서 전달됨)
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")

    if (token) {
      // 토큰을 로컬스토리지에 저장하고 리다이렉션
      localStorage.setItem("access_token", token)

      // URL에서 토큰 제거
      window.history.replaceState({}, document.title, window.location.pathname)

      // 사용자 정보 확인 후 적절한 페이지로 이동
      const checkAuthAndRedirect = async () => {
        const user = await authService.getCurrentUser()
        if (user) {
          if (user.is_first_login) {
            navigate("/nickname")
          } else {
            navigate("/main")
          }
        }
      }

      checkAuthAndRedirect()
      return
    }

    // 새로고침 vs 새 접속 구분하여 자동 로그인 처리
    const checkAuth = async () => {
      // 새로고침인지 확인 (performance.navigation API 사용)
      const isReload = performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD

      // 또는 performance.getEntriesByType 사용 (더 호환성 좋음)
      const navigationEntries = performance.getEntriesByType("navigation")
      const isReloadCompat =
        navigationEntries.length > 0 && (navigationEntries[0] as PerformanceNavigationTiming).type === "reload"

      const isPageReload = isReload || isReloadCompat

      // 새로고침이거나 브라우저 뒤로가기인 경우에만 자동 로그인 시도
      if (isPageReload) {
        const user = await authService.getCurrentUser()
        if (user) {
          if (user.is_first_login) {
            navigate("/nickname")
          } else {
            navigate("/main")
          }
        }
      }
      // 새 접속(프론트 서버 재시작 등)인 경우 랜딩페이지 유지
    }

    checkAuth()
  }, [navigate])

  const handleGoogleLogin = async () => {
    try {
      console.log("구글 로그인 버튼 클릭됨!")
      console.log("Starting Google OAuth redirect...")

      const clientId =
        process.env.REACT_APP_GOOGLE_CLIENT_ID ||
        "689738363605-i65c3ar97vnts2jeh648dj3v9b23njq4.apps.googleusercontent.com"
        
      const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI || "http://ec2-3-34-245-132.ap-northeast-2.compute.amazonaws.com/auth/google/callback"

      const scope = "openid email profile"

      // 올바른 Google OAuth URL
      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `prompt=select_account`

      console.log("Redirecting to Google OAuth:", googleAuthUrl)
      console.log("Client ID:", clientId)
      console.log("Redirect URI:", redirectUri)

      // Google OAuth 페이지로 리다이렉션
      window.location.href = googleAuthUrl
    } catch (error) {
      console.error("OAuth redirect failed:", error)
      alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Custom floating animation styles */}
      <style>
        {`
          @keyframes float1 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          @keyframes float2 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float3 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes float4 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-18px); }
          }
          @keyframes float5 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-16px); }
          }
          
          .float-1 {
            animation: float1 3s ease-in-out infinite;
            animation-delay: 0s;
          }
          .float-2 {
            animation: float2 2.5s ease-in-out infinite;
            animation-delay: 0.5s;
          }
          .float-3 {
            animation: float3 3.5s ease-in-out infinite;
            animation-delay: 1s;
          }
          .float-4 {
            animation: float4 2.8s ease-in-out infinite;
            animation-delay: 1.5s;
          }
          .float-5 {
            animation: float5 3.2s ease-in-out infinite;
            animation-delay: 2s;
          }
        `}
      </style>

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-pink-400 to-orange-500 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-30 blur-lg"></div>

      {/* Orbital rings
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 border border-cyan-400/20 rounded-full"></div>
        <div className="absolute w-96 h-96 border border-purple-400/10 rounded-full"></div>
        <div className="absolute w-96 h-96 border border-pink-400/10 rounded-full"></div>
      </div> */}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">그림을 그리고</h1>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">당신의 심리를 확인해보세요</h2>
        </div>

        {/* Animal characters with floating animation */}
        <div className="flex items-center justify-center mb-12 space-x-6">
          <div className="w-[210px] h-[210px] flex-shrink-0 flex items-center justify-center float-1">
            <img
              src="/assets/persona/추진이.png"
              alt="추진이"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="w-[210px] h-[210px] flex-shrink-0 flex items-center justify-center float-2">
            <img
              src="/assets/persona/쾌락이.png"
              alt="쾌락이"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="w-[210px] h-[210px] flex-shrink-0 flex items-center justify-center float-3">
            <img
              src="/assets/persona/안정이.png"
              alt="안정이"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="w-[210px] h-[210px] flex-shrink-0 flex items-center justify-center float-4">
            <img
              src="/assets/persona/내면이.png"
              alt="내면이"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          <div className="w-[210px] h-[210px] flex-shrink-0 flex items-center justify-center float-5">
            <img
              src="/assets/persona/햇살이.png"
              alt="햇살이"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Google login button */}
        <Button
          onClick={handleGoogleLogin}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-12 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
        >
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center mr-3">
            <img src="/assets/google-logo.jpg" alt="Google" className="w-4 h-4 object-contain" />
          </div>
          구글 로그인으로 시작하기
        </Button>
      </div>
    </div>
  )
}

export default LandingPage

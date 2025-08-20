<<<<<<< HEAD
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import MainPage from './components/pages/MainPage';
import TestPage from './components/pages/TestPage';
import TestInstructionPage from './components/pages/TestInstructionPage';
import ResultsPage from './components/pages/ResultsPage';
import ResultDetailPage from './components/pages/ResultDetailPage';
import CharactersPage from './components/pages/CharactersPage';
import ChatPage from './components/pages/ChatPage';
import BeforeTest from './components/pages/BeforeTest';
import MyPage from './components/pages/MyPage';
import LandingPage from './components/pages/LandingPage';
import NicknamePage from './components/pages/NicknamePage';
import AuthCallbackPage from './components/pages/AuthCallbackPage';
// import FloatingChatBot from './components/common/FloatingChatBot';
import { useAppState } from './hooks/useAppState';
import { authService } from './services/authService';
import { testService } from './services/testService';
import './App.css';
import './components/DreamSearchApp.css';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedCharacter,
    showRatingModal,
    currentTestResult,
    getAvailableCharacters,
    handleStartDreamSearch,
    handleCharacterSelect,
    handleStartChat,
    handleShowRating,
    handleCloseRatingModal,
    handleNewChat,
    handleDeleteAccount,
    handleContinueChat,
    handleUpdateProfile,
    handleInitializeChat,
    updateTestResult,
    setCharacterFromTestResult
  } = useAppState();

  // URL에서 토큰 처리 (보안 이슈 해결용 임시 처리)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.warn('Security Warning: Token detected in URL - cleaning up...');
      
      // 토큰을 localStorage에 저장 (임시 처리)
      localStorage.setItem('access_token', token);
      
      // URL에서 토큰 제거
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // 페이지 새로고침으로 완전한 초기화
      window.location.reload();
    }
  }, [location.search]);

  // 로그인 상태 확인 및 리다이렉션
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const isAuthenticated = authService.isAuthenticated();
      const protectedRoutes = [
        '/main',
        '/test',
        '/test-instruction',
        '/results',
        '/chat',
        '/mypage',
        '/result-detail',
        '/characters',
        '/nickname',
      ];

      // Check if the current path starts with any of the protected routes
      const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));

      if (isProtectedRoute && !isAuthenticated) {
        navigate('/');
      }
    };

    checkAuthAndRedirect();

    // location.pathname이 변경될 때마다 다시 확인
    const unlisten = () => {}; // Placeholder for cleanup if needed
    return () => unlisten();
  }, [location.pathname, navigate]);

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'main':
        navigate('/main');
        break;
      case 'test':
        navigate('/test-instruction');
        break;
      case 'test-instruction':
        navigate('/test-instruction');
        break;
      case 'mypage':
        navigate('/mypage');
        break;
      case 'landing':
        navigate('/');
        break;
      case 'results':
        navigate('/results');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'before-test':
        navigate('/before-test');
        break;
      case 'characters':
        navigate('/characters');
        break;
      case 'nickname':
        navigate('/nickname');
        break;
      default:
        break;
    }
  };

  const handleStartAnalysis = async (imageFile: File | null, description: string) => {
    if (!imageFile) {
      console.error('이미지 파일이 없습니다.');
      return;
    }

    try {
      console.log('실제 분석 시작:', { imageFile, description });
      
      // 실제 분석 API 호출
      const result = await testService.uploadDrawingImage(imageFile);
      console.log('분석 완료:', result);
      
      // 분석 완료 후 결과 페이지로 이동
      handleStartDreamSearch();
    } catch (error) {
      console.error('분석 실패:', error);
      // 에러 발생 시에도 결과 페이지로 이동 (기존 동작 유지)
      handleStartDreamSearch();
    }
  };

  return (
    <div className="App font-sans min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/main" 
          element={
            <MainPage 
              onStartDreamSearch={handleStartDreamSearch} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/test" 
          element={
            <TestPage 
              onStartAnalysis={handleStartAnalysis} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/test-instruction" 
          element={
            <TestInstructionPage 
              onStartAnalysis={handleStartAnalysis} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/results" 
          element={
            <ResultsPage
              characters={getAvailableCharacters()}
              selectedCharacter={selectedCharacter}
              showModal={false}
              onCharacterSelect={handleCharacterSelect}
              onCloseModal={() => {}}
              onStartChat={handleStartChat}
              onNavigate={handleNavigate}
              currentTestResult={currentTestResult}
              updateTestResult={updateTestResult}
            />
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ChatPage
              selectedCharacter={selectedCharacter}
              showRatingModal={showRatingModal}
              onShowRating={handleShowRating}
              onCloseRatingModal={handleCloseRatingModal}
              onNavigate={handleNavigate}
              onInitializeChat={handleInitializeChat}
              // userId prop 제거 - ChatPage에서 내부적으로 로그인된 사용자 ID를 가져옴
              personaId={selectedCharacter ? parseInt(selectedCharacter.id) : 1}
            />
          } 
        />
        <Route 
          path="/mypage" 
          element={
            <MyPage
              onNewChat={handleNewChat}
              onDeleteAccount={handleDeleteAccount}
              onNavigate={handleNavigate}
              onContinueChat={handleContinueChat}
              onUpdateProfile={handleUpdateProfile}
            />
          } 
        />
        <Route 
          path="/result-detail/:id" 
          element={
            <ResultDetailPage
              testResults={[]}
              onNavigate={handleNavigate}
              onStartChat={handleStartChat}
            />
          } 
        />
        <Route 
          path="/characters" 
          element={
            <CharactersPage
              selectedCharacter={selectedCharacter}
              onCharacterSelect={handleCharacterSelect}
              onStartChat={handleStartChat}
              onNavigate={handleNavigate}
            />
          } 
        />
        <Route 
          path="/before-test" 
          element={
            <BeforeTest
              onNavigate={handleNavigate}
            />
          } 
        />
        <Route 
          path="/nickname" 
          element={
            <NicknamePage
              onComplete={(nickname) => {
                console.log('Nickname set:', nickname);
                // 여기서 닉네임을 저장하거나 처리할 수 있습니다
              }}
            />
          } 
        />
        <Route 
          path="/auth-callback" 
          element={<AuthCallbackPage />} 
        />
      </Routes>
      {/* <FloatingChatBot /> */}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

=======
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import MainPage from './components/pages/MainPage';
import TestPage from './components/pages/TestPage';
import TestInstructionPage from './components/pages/TestInstructionPage';
import ResultsPage from './components/pages/ResultsPage';
import ResultDetailPage from './components/pages/ResultDetailPage';
import CharactersPage from './components/pages/CharactersPage';
import ChatPage from './components/pages/ChatPage';
import BeforeTest from './components/pages/BeforeTest';
import MyPage from './components/pages/MyPage';
import LandingPage from './components/pages/LandingPage';
import NicknamePage from './components/pages/NicknamePage';
import AuthCallbackPage from './components/pages/AuthCallbackPage';
// import FloatingChatBot from './components/common/FloatingChatBot';
import { useAppState } from './hooks/useAppState';
import { authService } from './services/authService';
import { testService } from './services/testService';
import './App.css';
import './components/DreamSearchApp.css';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedCharacter,
    showRatingModal,
    currentTestResult,
    getAvailableCharacters,
    handleStartDreamSearch,
    handleCharacterSelect,
    handleStartChat,
    handleShowRating,
    handleCloseRatingModal,
    handleNewChat,
    handleDeleteAccount,
    handleContinueChat,
    handleUpdateProfile,
    handleInitializeChat,
    updateTestResult,
    setCharacterFromTestResult
  } = useAppState();

  // URL에서 토큰 처리 (보안 이슈 해결용 임시 처리)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.warn('Security Warning: Token detected in URL - cleaning up...');
      
      // 토큰을 localStorage에 저장 (임시 처리)
      localStorage.setItem('access_token', token);
      
      // URL에서 토큰 제거
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // 페이지 새로고침으로 완전한 초기화
      window.location.reload();
    }
  }, [location.search]);

  // 로그인 상태 확인 및 리다이렉션
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const isAuthenticated = authService.isAuthenticated();
      const protectedRoutes = [
        '/main',
        '/test',
        '/test-instruction',
        '/results',
        '/chat',
        '/mypage',
        '/result-detail',
        '/characters',
        '/nickname',
      ];

      // Check if the current path starts with any of the protected routes
      const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));

      if (isProtectedRoute && !isAuthenticated) {
        navigate('/');
      }
    };

    checkAuthAndRedirect();

    // location.pathname이 변경될 때마다 다시 확인
    const unlisten = () => {}; // Placeholder for cleanup if needed
    return () => unlisten();
  }, [location.pathname, navigate]);

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'main':
        navigate('/main');
        break;
      case 'test':
        navigate('/test-instruction');
        break;
      case 'test-instruction':
        navigate('/test-instruction');
        break;
      case 'mypage':
        navigate('/mypage');
        break;
      case 'landing':
        navigate('/');
        break;
      case 'results':
        navigate('/results');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'before-test':
        navigate('/before-test');
        break;
      case 'characters':
        navigate('/characters');
        break;
      case 'nickname':
        navigate('/nickname');
        break;
      default:
        break;
    }
  };

  const handleStartAnalysis = async (imageFile: File | null, description: string) => {
    if (!imageFile) {
      console.error('이미지 파일이 없습니다.');
      return;
    }

    try {
      console.log('실제 분석 시작:', { imageFile, description });
      
      // 실제 분석 API 호출
      const result = await testService.uploadDrawingImage(imageFile);
      console.log('분석 완료:', result);
      
      // 분석 완료 후 결과 페이지로 이동
      handleStartDreamSearch();
    } catch (error) {
      console.error('분석 실패:', error);
      // 에러 발생 시에도 결과 페이지로 이동 (기존 동작 유지)
      handleStartDreamSearch();
    }
  };

  return (
    <div className="App font-sans min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/main" 
          element={
            <MainPage 
              onStartDreamSearch={handleStartDreamSearch} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/test" 
          element={
            <TestPage 
              onStartAnalysis={handleStartAnalysis} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/test-instruction" 
          element={
            <TestInstructionPage 
              onStartAnalysis={handleStartAnalysis} 
              onNavigate={handleNavigate} 
            />
          } 
        />
        <Route 
          path="/results" 
          element={
            <ResultsPage
              characters={getAvailableCharacters()}
              selectedCharacter={selectedCharacter}
              showModal={false}
              onCharacterSelect={handleCharacterSelect}
              onCloseModal={() => {}}
              onStartChat={handleStartChat}
              onNavigate={handleNavigate}
              currentTestResult={currentTestResult}
              updateTestResult={updateTestResult}
            />
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ChatPage
              selectedCharacter={selectedCharacter}
              showRatingModal={showRatingModal}
              onShowRating={handleShowRating}
              onCloseRatingModal={handleCloseRatingModal}
              onNavigate={handleNavigate}
              onInitializeChat={handleInitializeChat}
              // userId prop 제거 - ChatPage에서 내부적으로 로그인된 사용자 ID를 가져옴
              personaId={selectedCharacter ? parseInt(selectedCharacter.id) : 1}
            />
          } 
        />
        <Route 
          path="/mypage" 
          element={
            <MyPage
              onNewChat={handleNewChat}
              onDeleteAccount={handleDeleteAccount}
              onNavigate={handleNavigate}
              onContinueChat={handleContinueChat}
              onUpdateProfile={handleUpdateProfile}
            />
          } 
        />
        <Route 
          path="/result-detail/:id" 
          element={
            <ResultDetailPage
              testResults={[]}
              onNavigate={handleNavigate}
              onStartChat={handleStartChat}
            />
          } 
        />
        <Route 
          path="/characters" 
          element={
            <CharactersPage
              selectedCharacter={selectedCharacter}
              onCharacterSelect={handleCharacterSelect}
              onStartChat={handleStartChat}
              onNavigate={handleNavigate}
            />
          } 
        />
        <Route 
          path="/before-test" 
          element={
            <BeforeTest
              onNavigate={handleNavigate}
            />
          } 
        />
        <Route 
          path="/nickname" 
          element={
            <NicknamePage
              onComplete={(nickname) => {
                console.log('Nickname set:', nickname);
                // 여기서 닉네임을 저장하거나 처리할 수 있습니다
              }}
            />
          } 
        />
        <Route 
          path="/auth-callback" 
          element={<AuthCallbackPage />} 
        />
      </Routes>
      {/* <FloatingChatBot /> */}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

>>>>>>> origin/docker
export default App;
import React from 'react';
import LandingPage from './pages/LandingPage';
import MainPage from './pages/MainPage';
import ResultsPage from './pages/ResultsPage';
import ChatPage from './pages/ChatPage';
import MyPage from './pages/MyPage';
import FloatingChatBot from './common/FloatingChatBot';
import { useAppState } from '../hooks/useAppState';
import { characters } from '../data/characters';
import './DreamSearchApp.css';

const DreamSearchApp: React.FC = () => {
  const {
    currentScreen,
    selectedCharacter,
    showModal,
    showRatingModal,
    currentTestResult,
    getAvailableCharacters,
    handleGoogleLogin,
    handleStartDreamSearch,
    handleCharacterSelect,
    handleStartChat,
    handleCloseModal,
    handleShowRating,
    handleCloseRatingModal,
    handleGoToMyPage,
    handleNewChat,
    handleDeleteAccount,
    updateTestResult
  } = useAppState();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'main':
        handleStartDreamSearch();
        break;
      case 'mypage':
        handleGoToMyPage();
        break;
      case 'landing':
        handleGoogleLogin();
        break;
      default:
        break;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return <LandingPage onGoogleLogin={handleGoogleLogin} />;
      case 'main':
        return <MainPage onStartDreamSearch={handleStartDreamSearch} onNavigate={handleNavigate} />;
      case 'results':
        return (
          <ResultsPage
            characters={getAvailableCharacters()}
            selectedCharacter={selectedCharacter}
            showModal={showModal}
            onCharacterSelect={handleCharacterSelect}
            onCloseModal={handleCloseModal}
            onStartChat={handleStartChat}
            onNavigate={handleNavigate}
            currentTestResult={currentTestResult}
            updateTestResult={updateTestResult}
          />
        );
      case 'chat':
        return (
          <ChatPage
            selectedCharacter={selectedCharacter}
            showRatingModal={showRatingModal}
            onShowRating={handleShowRating}
            onCloseRatingModal={handleCloseRatingModal}
            onNavigate={handleNavigate}
            userId={1} // 실제로는 로그인한 사용자 ID
            friendsId={selectedCharacter ? parseInt(selectedCharacter.id) : 1}
          />
        );
      case 'mypage':
        return (
          <MyPage
            onNewChat={handleNewChat}
            onDeleteAccount={handleDeleteAccount}
            onNavigate={handleNavigate}
          />
        );
      default:
        return <LandingPage onGoogleLogin={handleGoogleLogin} />;
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-100">
      {renderScreen()}
      <FloatingChatBot />
    </div>
  );
};

export default DreamSearchApp;
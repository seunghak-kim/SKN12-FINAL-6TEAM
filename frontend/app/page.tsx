"use client"

import { useState } from "react"
import WelcomeScreen from "../src/components/pages/LandingPage"
import SignupScreen from "../src/components/pages/NicknamePage"
import MainScreen from "../src/components/pages/MainPage"
import DrawingTestIntro from "../src/components/pages/TestInstructionPage"
import TermsModal from "../src/components/terms-modal"
import DrawingUpload from "../src/components/pages/TestPage"
import LoadingScreen from "../src/components/loading-screen"
import ResultsScreen from "../src/components/pages/ResultsPage"
import ChatbotScreen from "../src/components/pages/ChatPage"
import CharacterSelectionScreen from "../src/components/pages/CharactersPage"
import MyPageScreen from "../src/components/pages/MyPage"
import TestDetailScreen from "../src/components/pages/ResultDetailPage"
import PersonalityAnalysisScreen from "../src/components/personality-analysis-screen"
import SatisfactionModal from "../src/components/satisfaction-modal"

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("welcome")
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState("내면이")

  const renderScreen = () => {
    switch (currentScreen) {
      case "welcome":
        return <WelcomeScreen onNext={() => setCurrentScreen("signup")} />
      case "signup":
        return <SignupScreen onNext={() => setCurrentScreen("main")} />
      case "main":
        return <MainScreen onNavigate={setCurrentScreen} />
      case "drawing-test-intro":
        return <DrawingTestIntro onNext={() => setShowTermsModal(true)} onNavigate={setCurrentScreen} />
      case "drawing-upload":
        return <DrawingUpload onNext={() => setCurrentScreen("loading")} onNavigate={setCurrentScreen} />
      case "loading":
        return <LoadingScreen onNext={() => setCurrentScreen("results")} />
      case "results":
        return <ResultsScreen onNavigate={setCurrentScreen} />
      case "chatbot":
        return <ChatbotScreen onNavigate={setCurrentScreen} onShowSatisfaction={() => setShowSatisfactionModal(true)} />
      case "character-selection":
        return <CharacterSelectionScreen onNavigate={setCurrentScreen} onSelectCharacter={setSelectedCharacter} />
      case "mypage":
        return <MyPageScreen onNavigate={setCurrentScreen} />
      case "test-detail":
        return <TestDetailScreen onNavigate={setCurrentScreen} />
      case "personality-analysis":
        return <PersonalityAnalysisScreen onNavigate={setCurrentScreen} />
      default:
        return <WelcomeScreen onNext={() => setCurrentScreen("signup")} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {renderScreen()}
      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setShowTermsModal(false)
            setCurrentScreen("drawing-upload")
          }}
        />
      )}
      {showSatisfactionModal && (
        <SatisfactionModal
          onClose={() => setShowSatisfactionModal(false)}
          onSubmit={() => {
            setShowSatisfactionModal(false)
            setCurrentScreen("character-selection")
          }}
        />
      )}
    </div>
  )
}

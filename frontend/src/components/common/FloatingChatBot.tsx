import React, { useState } from 'react';
import GeneralChatBot from './GeneralChatBot';

const FloatingChatBot: React.FC = () => {
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);

  const handleChatBotToggle = () => {
    setIsChatBotOpen(!isChatBotOpen);
  };

  const handleCloseChatBot = () => {
    setIsChatBotOpen(false);
  };

  return (
    <>
      <button 
        className="fixed bottom-8 right-8 w-16 h-16 bg-yellow-400 hover:bg-yellow-300 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all duration-300 z-50 border-none"
        onClick={handleChatBotToggle}
      >
        <div className="text-2xl">🤖</div>
      </button>
      
      <GeneralChatBot 
        isOpen={isChatBotOpen} 
        onClose={handleCloseChatBot}
      />
    </>
  );
};

export default FloatingChatBot;
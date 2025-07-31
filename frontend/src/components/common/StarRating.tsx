"use client"

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";

interface StarRatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  centered?: boolean;
}

interface SatisfactionModalProps {
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  initialRating = 3, 
  onRatingChange,
  centered = false
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (starNumber: number) => {
    setRating(starNumber);
    if (onRatingChange) {
      onRatingChange(starNumber);
    }
  };

  const handleStarHover = (starNumber: number) => {
    setHoverRating(starNumber);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const getStarProps = (starNumber: number) => {
    const currentRating = hoverRating || rating;
    const isSelected = starNumber <= currentRating;
    return {
      fill: isSelected ? '#FCD34D' : '#D1D5DB', // yellow-300 : gray-300
      color: isSelected ? '#FCD34D' : '#D1D5DB',
      className: `w-8 h-8 cursor-pointer transition-all duration-200 hover:scale-110 transform ${
        isSelected ? 'text-yellow-400' : 'text-gray-300'
      }`
    };
  };

  return (
    <div className={`flex gap-1 ${centered ? 'justify-center' : ''}`}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <Star
          key={starNumber}
          {...getStarProps(starNumber)}
          onClick={() => handleStarClick(starNumber)}
          onMouseEnter={() => handleStarHover(starNumber)}
          onMouseLeave={handleStarLeave}
        />
      ))}
    </div>
  );
};

export const SatisfactionModal: React.FC<SatisfactionModalProps> = ({ onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    onSubmit(rating, feedback);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">만족도 조사</h2>

        {/* Star rating */}
        <div className="flex justify-center mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)} className="p-1">
              <Star
                size={32}
                className={`${
                  star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-300 text-gray-300"
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        <div className="text-center mb-6">
          <h3 className="font-bold text-gray-800 mb-2">기타 의견(선택)</h3>
        </div>

        <Textarea
          placeholder="이 캐릭터는 제 취향과 맞지않아요. 저에게 더 맞는 해결책을 제시해주세요 등 챗봇에 대한 의견을 자유롭게 작성하세요"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full h-24 mb-6 resize-none"
        />

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white"
          >
            제출
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StarRating;
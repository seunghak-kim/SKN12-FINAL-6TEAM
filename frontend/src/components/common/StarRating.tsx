import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  centered?: boolean;
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
    <div className={`flex space-x-1 ${centered ? 'justify-center' : ''}`}>
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const starProps = getStarProps(starNumber);
        return (
          <Star
            key={starNumber}
            {...starProps}
            onClick={() => handleStarClick(starNumber)}
            onMouseEnter={() => handleStarHover(starNumber)}
            onMouseLeave={handleStarLeave}
          />
        );
      })}
    </div>
  );
};

export default StarRating;
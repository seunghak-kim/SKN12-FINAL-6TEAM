import React from 'react';
import { SearchResult } from '../../types';

interface CharacterCardProps {
  character: SearchResult;
  onClick: (character: SearchResult) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onClick }) => {
  return (
    <div className="character-card" onClick={() => onClick(character)}>
      <div className="character-avatar">{character.avatar}</div>
      <h4>{character.name}</h4>
      <p>{character.description}</p>
    </div>
  );
  
};

export default CharacterCard;
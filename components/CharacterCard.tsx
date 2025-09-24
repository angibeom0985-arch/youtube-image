
import React, { useState } from 'react';
import { Character } from '../types';
import Spinner from './Spinner';

interface CharacterCardProps {
  character: Character;
  onRegenerate: (characterId: string, description: string, name: string) => void;
}

const RefreshIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-3.181-3.183l-3.181-3.183a8.25 8.25 0 00-11.664 0l-3.181 3.183" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);


const CharacterCard: React.FC<CharacterCardProps> = ({ character, onRegenerate }) => {
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerateClick = async () => {
        setIsRegenerating(true);
        await onRegenerate(character.id, character.description, character.name);
        setIsRegenerating(false);
    };

    const handleDownloadClick = () => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${character.image}`;
        link.download = `${character.name.replace(/ /g, '_')}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="relative group">
                <img
                    src={`data:image/jpeg;base64,${character.image}`}
                    alt={character.name}
                    className="w-full h-72 object-cover"
                />
                {isRegenerating && (
                     <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <Spinner />
                    </div>
                )}
                {!isRegenerating && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={handleDownloadClick}
                            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            aria-label={`Download image for ${character.name}`}
                        >
                           <DownloadIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleRegenerateClick}
                            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            aria-label={`Regenerate image for ${character.name}`}
                        >
                           <RefreshIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-xl font-bold text-indigo-300">{character.name}</h3>
                <p className="text-gray-400 mt-2 text-sm">{character.description}</p>
            </div>
        </div>
    );
};

export default CharacterCard;

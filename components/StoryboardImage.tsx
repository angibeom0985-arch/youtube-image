
import React, { useState } from 'react';
import { StoryboardImage as StoryboardImageType } from '../types';
import Spinner from './Spinner';

interface StoryboardImageProps {
  item: StoryboardImageType;
  onRegenerate: (storyboardItemId: string) => void;
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


const StoryboardImage: React.FC<StoryboardImageProps> = ({ item, onRegenerate }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerateClick = async () => {
    setIsRegenerating(true);
    await onRegenerate(item.id);
    setIsRegenerating(false);
  };
  
  const handleDownloadClick = () => {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${item.image}`;
    const safeDescription = item.sceneDescription.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '_').substring(0, 30);
    link.download = `scene_${safeDescription}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg group">
      <img
        src={`data:image/jpeg;base64,${item.image}`}
        alt={item.sceneDescription}
        className="w-full h-full object-cover aspect-video transition-transform duration-300 group-hover:scale-105"
      />
      {isRegenerating && (
           <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
              <Spinner />
          </div>
      )}
      {!isRegenerating && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              <button
                  onClick={handleDownloadClick}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={`Download image for scene: ${item.sceneDescription}`}
              >
                 <DownloadIcon className="w-5 h-5" />
              </button>
              <button
                  onClick={handleRegenerateClick}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={`Regenerate image for scene: ${item.sceneDescription}`}
              >
                 <RefreshIcon className="w-5 h-5" />
              </button>
          </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
      <p className="absolute bottom-0 left-0 p-4 text-white text-sm font-semibold z-10">
        {item.sceneDescription}
      </p>
    </div>
  );
};

export default StoryboardImage;

'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ShieldCheck, Heart } from 'lucide-react';

interface StoryItem {
  id: string;
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
  hasViewed?: boolean;
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyGroup: {
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
      isVerified?: boolean;
    };
    stories: StoryItem[];
  } | null;
  onStoryViewed?: (storyId: string) => void;
}

export function StoryViewerModal({
  isOpen,
  onClose,
  storyGroup,
  onStoryViewed,
}: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [storyGroup]);

  // Mark current story as viewed
  useEffect(() => {
    if (!isOpen || !storyGroup || !storyGroup.stories[currentIndex]) return;
    const currentStory = storyGroup.stories[currentIndex];

    // Fire view API call
    fetch(`/api/v1/stories/${currentStory.id}/view`, { method: 'POST' })
      .then((res) => {
        if (res.ok && onStoryViewed) {
          onStoryViewed(currentStory.id);
        }
      })
      .catch((err) => console.error('Failed to log story view:', err));
  }, [isOpen, storyGroup, currentIndex]);

  if (!isOpen || !storyGroup || storyGroup.stories.length === 0) return null;

  const currentStory = storyGroup.stories[currentIndex];
  const totalStories = storyGroup.stories.length;

  const handleNext = () => {
    if (currentIndex < totalStories - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm h-[680px] max-h-[92vh] rounded-3xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between border border-gray-800">
        {/* Story Progress Indicators */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
          {storyGroup.stories.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  i < currentIndex
                    ? 'w-full bg-white'
                    : i === currentIndex
                    ? 'w-full bg-[#F43F5E]'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Top Author Bar */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#F43F5E] shadow-md">
              <img
                src={
                  storyGroup.author.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'
                }
                alt={storyGroup.author.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white shadow-sm">
                  {storyGroup.author.displayName}
                </span>
                {storyGroup.author.isVerified && (
                  <ShieldCheck className="w-3.5 h-3.5 fill-[#38BDF8] text-black" />
                )}
              </div>
              <span className="text-[10px] text-gray-300">
                @{storyGroup.author.username}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Media Background */}
        <div className="relative w-full h-full">
          <img
            src={currentStory.mediaUrl}
            alt="Story content"
            className="w-full h-full object-cover"
          />

          {/* Left / Right Tap Zones */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
            title="Previous"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer"
            title="Next"
          />
        </div>

        {/* Bottom Caption Overlay */}
        {currentStory.caption && (
          <div className="absolute inset-x-0 bottom-4 z-30 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center">
            <p className="text-sm font-medium text-white drop-shadow-md">
              {currentStory.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


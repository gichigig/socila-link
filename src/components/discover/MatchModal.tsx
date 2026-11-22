'use client';

import React from 'react';
import { X, Heart, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: {
    id?: string;
    matchedAt?: string;
    partner?: {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  } | null;
  onStartConversation?: (partnerId: string) => void;
}

export function MatchModal({
  isOpen,
  onClose,
  matchData,
  onStartConversation,
}: MatchModalProps) {
  const { user } = useAuth();

  if (!isOpen || !matchData || !matchData.partner) return null;

  const partner = matchData.partner;
  const userAvatar =
    user?.profile?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
  const partnerAvatar =
    partner.avatarUrl ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] text-white rounded-3xl border border-rose-500/30 shadow-2xl p-6 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-[#E11D48]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#9333EA]/30 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Match Header */}
        <div className="relative z-10 pt-2">
          <div className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#F43F5E]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mutual Connection</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#F43F5E] via-rose-300 to-[#E11D48] bg-clip-text text-transparent">
            It&apos;s a Match!
          </h2>

          <p className="text-xs text-gray-300 mt-1 max-w-[240px] mx-auto leading-relaxed">
            You and <span className="font-bold text-white">{partner.displayName}</span> have liked
            each other.
          </p>
        </div>

        {/* Intersecting Paired Avatars */}
        <div className="relative z-10 my-6 flex items-center justify-center">
          <div className="relative flex items-center -space-x-4">
            {/* User Avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#0B0E14] shadow-2xl">
              <img
                src={userAvatar}
                alt={user?.profile?.displayName || 'You'}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Glowing Intersecting Heart Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full gradient-pink shadow-lg shadow-rose-900/60 border-2 border-white flex items-center justify-center animate-bounce">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>

            {/* Partner Avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#0B0E14] shadow-2xl">
              <img
                src={partnerAvatar}
                alt={partner.displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 space-y-2.5 pt-2">
          <button
            onClick={() => {
              if (onStartConversation) {
                onStartConversation(partner.userId);
              }
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl gradient-pink text-white text-sm font-bold shadow-xl shadow-rose-900/50 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send a Message</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold transition cursor-pointer border border-gray-700/60"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}


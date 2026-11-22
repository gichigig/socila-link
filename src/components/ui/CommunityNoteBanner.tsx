'use client';

import React, { useState } from 'react';
import { AlertTriangle, ThumbsUp, ThumbsDown, Info, ShieldAlert, Check } from 'lucide-react';

export interface CommunityNoteData {
  id: string;
  category: string;
  content: string;
  helpfulCount: number;
  notHelpfulCount: number;
  userRating?: boolean | null;
  createdAt?: string;
}

interface CommunityNoteBannerProps {
  note: CommunityNoteData;
  className?: string;
  onRate?: (noteId: string, isHelpful: boolean) => void;
}

export function CommunityNoteBanner({
  note,
  className = '',
  onRate,
}: CommunityNoteBannerProps) {
  const [helpfulCount, setHelpfulCount] = useState(note.helpfulCount || 0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(note.notHelpfulCount || 0);
  const [userRating, setUserRating] = useState<boolean | null>(note.userRating ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'IDENTITY_MISMATCH':
        return {
          label: 'Identity Context',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'BAIT_AND_SWITCH':
        return {
          label: 'Companion Authenticity Alert',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'STOLEN_MEDIA':
        return {
          label: 'Content Attribution Notice',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Info className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'MISLEADING_PROFILE':
      default:
        return {
          label: 'Community Context',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: <Info className="w-3.5 h-3.5 text-blue-400" />,
        };
    }
  };

  const details = getCategoryDetails(note.category);

  const handleVote = async (isHelpful: boolean) => {
    if (isSubmitting) return;

    // Optimistic rating update
    const prevRating = userRating;
    if (prevRating === isHelpful) return; // already voted this option

    if (prevRating === null) {
      if (isHelpful) setHelpfulCount((c) => c + 1);
      else setNotHelpfulCount((c) => c + 1);
    } else {
      if (isHelpful) {
        setHelpfulCount((c) => c + 1);
        setNotHelpfulCount((c) => Math.max(0, c - 1));
      } else {
        setNotHelpfulCount((c) => c + 1);
        setHelpfulCount((c) => Math.max(0, c - 1));
      }
    }
    setUserRating(isHelpful);
    if (onRate) onRate(note.id, isHelpful);

    setIsSubmitting(true);
    try {
      await fetch(`/api/v1/safety/community-notes/${note.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful }),
      });
    } catch (err) {
      console.error('Failed to submit community note rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl glass-panel p-3 border border-amber-500/30 bg-amber-950/20 backdrop-blur-xl shadow-lg space-y-2 text-left ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-lg bg-amber-500/15 text-amber-400">
            {details.icon}
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
            Community Note
          </span>
        </div>
        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${details.badgeColor}`}
        >
          {details.label}
        </span>
      </div>

      {/* Note Body */}
      <p className="text-xs text-slate-200 leading-relaxed font-normal">
        <span className="font-semibold text-white">Readers added context: </span>
        {note.content}
      </p>

      {/* Footer & Voting Row */}
      <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
        <span className="text-[10px]">Rated by verified members</span>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 mr-0.5">Helpful?</span>
          <button
            onClick={() => handleVote(true)}
            className={`px-2 py-0.8 rounded-lg flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              userRating === true
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>{helpfulCount}</span>
          </button>

          <button
            onClick={() => handleVote(false)}
            className={`px-2 py-0.8 rounded-lg flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              userRating === false
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10'
            }`}
          >
            <ThumbsDown className="w-3 h-3" />
            <span>{notHelpfulCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


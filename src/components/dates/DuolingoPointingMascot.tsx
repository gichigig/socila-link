'use client';

import React from 'react';
import { KeyRound, Sparkles } from 'lucide-react';

interface DuolingoPointingMascotProps {
  isInviter?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DuolingoPointingMascot({
  isInviter = true,
  onClick,
  className = '',
}: DuolingoPointingMascotProps) {
  const titleText = isInviter
    ? 'Tap to view 6-digit code'
    : 'Tap to enter code & unlock payout';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center justify-center cursor-pointer group select-none transition-transform active:scale-98 pb-1 ${className}`}
      title={titleText}
    >
      {/* Duolingo-Style Floating Speech Bubble (Centered above Mascot) */}
      <div className="relative mb-1">
        <div className="relative bg-[#1E293B] border border-rose-500/40 group-hover:border-rose-400 rounded-full px-3 py-1 shadow-md shadow-rose-500/10 transition-all transform group-hover:-translate-y-0.5 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-white tracking-wide whitespace-nowrap flex items-center gap-1.5">
            {isInviter ? (
              <>
                <span>Tap to view 6-digit code!</span>
                <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </>
            ) : (
              <>
                <span>Tap to enter code & unlock payout!</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </>
            )}
          </span>
          {/* Speech bubble downward pointer tail */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[#1E293B]" />
        </div>
      </div>

      {/* Chibi Anime Mascot - Centered and Pointing Straight Down into Button */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Soft Ambient Neon Glow */}
        <div className="absolute w-12 h-12 bg-rose-500/20 rounded-full blur-md pointer-events-none group-hover:bg-rose-500/35 transition-colors" />

        <svg
          viewBox="0 0 100 95"
          className="w-16 h-16 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF1EB" />
              <stop offset="100%" stopColor="#FED7AA" />
            </linearGradient>

            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>

            <linearGradient id="gloveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>

            <filter id="cheekGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>

          <style>
            {`
              @keyframes mascotFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
              }
              @keyframes animeEyeBlink {
                0%, 90%, 100% { transform: scaleY(1); }
                95% { transform: scaleY(0.08); }
              }
              @keyframes fingerPointDown {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(6px); }
              }
              .mascot-container {
                animation: mascotFloat 2.4s ease-in-out infinite;
                transform-origin: center bottom;
              }
              .anime-eyes {
                animation: animeEyeBlink 3.6s ease-in-out infinite;
                transform-origin: 50px 38px;
              }
              .pointing-finger {
                animation: fingerPointDown 1.0s ease-in-out infinite;
              }
            `}
          </style>

          <g className="mascot-container">
            {/* Chibi Body / Hoodie */}
            <path
              d="M 36 60 Q 50 56 64 60 L 67 76 Q 50 80 33 76 Z"
              fill="url(#outfitGrad)"
              stroke="#0369A1"
              strokeWidth="1.8"
            />
            {/* Zipper */}
            <path d="M 50 58 L 50 72" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

            {/* Left Arm (Resting on side) */}
            <path
              d="M 36 60 Q 28 66 31 72"
              fill="none"
              stroke="url(#outfitGrad)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="31" cy="73" r="3" fill="url(#gloveGrad)" stroke="#CBD5E1" strokeWidth="0.8" />

            {/* Anime Head Base */}
            <circle
              cx="50"
              cy="38"
              r="20"
              fill="url(#skinGrad)"
              stroke="#FDBA74"
              strokeWidth="1.2"
            />

            {/* Back Hair */}
            <path
              d="M 30 38 C 26 20, 74 20, 70 38 C 72 48, 68 50, 68 50 C 68 50, 62 46, 60 46 C 40 46, 32 50, 32 50 Z"
              fill="url(#hairGrad)"
            />

            {/* Front Anime Bangs */}
            <path
              d="M 31 34 Q 40 26 50 32 Q 60 26 69 34 Q 61 30 50 30 Q 39 30 31 34 Z"
              fill="#FB7185"
            />
            <path d="M 45 28 Q 48 37 50 38 Q 52 37 55 28 Z" fill="url(#hairGrad)" />

            {/* Cute Anime Hair Tuft */}
            <path
              d="M 50 18 Q 54 8 60 12 Q 54 14 51 18 Z"
              fill="#FB7185"
            />

            {/* Anime Eyes with Blinking */}
            <g className="anime-eyes">
              {/* Left Eye */}
              <ellipse cx="43" cy="37" rx="4" ry="5.5" fill="#0F172A" />
              <ellipse cx="43" cy="38" rx="3" ry="4" fill="#E11D48" />
              <circle cx="41.5" cy="35.5" r="1.5" fill="#FFFFFF" />
              <circle cx="44.2" cy="39" r="0.8" fill="#FFFFFF" />
              <path d="M 39 34 Q 43 31 47 34" fill="none" stroke="#0F172A" strokeWidth="1.3" strokeLinecap="round" />

              {/* Right Eye */}
              <ellipse cx="57" cy="37" rx="4" ry="5.5" fill="#0F172A" />
              <ellipse cx="57" cy="38" rx="3" ry="4" fill="#E11D48" />
              <circle cx="55.5" cy="35.5" r="1.5" fill="#FFFFFF" />
              <circle cx="58.2" cy="39" r="0.8" fill="#FFFFFF" />
              <path d="M 53 34 Q 57 31 61 34" fill="none" stroke="#0F172A" strokeWidth="1.3" strokeLinecap="round" />
            </g>

            {/* Rosy Cheeks */}
            <ellipse cx="37" cy="43" rx="3.2" ry="1.8" fill="#F43F5E" opacity="0.6" filter="url(#cheekGlow)" />
            <ellipse cx="63" cy="43" rx="3.2" ry="1.8" fill="#F43F5E" opacity="0.6" filter="url(#cheekGlow)" />

            {/* Cute Happy Smile */}
            <path
              d="M 46 44 Q 50 48 54 44"
              fill="none"
              stroke="#BE123C"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Right Arm: Angling down and pointing DEAD CENTER */}
            <path
              d="M 64 60 Q 66 68 55 70"
              fill="none"
              stroke="url(#outfitGrad)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Pointing Hand & Arrow: Placed directly at horizontal center (cx=50), pointing straight down */}
          <g className="pointing-finger" transform="translate(50, 72)">
            {/* Glove Palm */}
            <circle cx="0" cy="0" r="4.2" fill="url(#gloveGrad)" stroke="#94A3B8" strokeWidth="0.8" />

            {/* Index Finger pointing straight down at x=0 */}
            <path
              d="M -1.2 0 L -1.2 12 Q 0 14 1.2 12 L 1.2 0 Z"
              fill="url(#gloveGrad)"
              stroke="#94A3B8"
              strokeWidth="0.8"
            />

            {/* Glowing Arrow Pointing Down Directly into the Button */}
            <path
              d="M 0 16 L 0 22 M -3.5 19 L 0 22.5 L 3.5 19"
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

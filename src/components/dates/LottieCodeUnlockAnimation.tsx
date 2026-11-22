'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Lock, Unlock, Sparkles, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';

interface LottieCodeUnlockAnimationProps {
  code?: string;
  activeDigitsCount?: number;
  mode?: 'display' | 'input' | 'success';
  payoutAmountKes?: number;
  className?: string;
}

export function LottieCodeUnlockAnimation({
  code = '739201',
  activeDigitsCount,
  mode = 'display',
  payoutAmountKes = 4500,
  className = '',
}: LottieCodeUnlockAnimationProps) {
  // If activeDigitsCount is explicitly provided (e.g. during user typing), use it.
  // Otherwise, run an automatic demo loop showing sequential 6-digit input -> unlock -> release.
  const [animatedStep, setAnimatedStep] = useState(0); // 0 to 7: 0=empty, 1..6=digits, 7=unlocked
  const isInteractive = typeof activeDigitsCount === 'number';

  useEffect(() => {
    if (isInteractive || mode === 'success') return;

    // Automatic 4.5s loop: types 1-6 digits, unlocks, shows coins, then resets
    const stepIntervals = [300, 300, 300, 300, 300, 300, 1600, 600]; // delays at each step
    let current = 0;
    let timer: NodeJS.Timeout;

    const runStep = () => {
      current = (current + 1) % 8;
      setAnimatedStep(current);
      timer = setTimeout(runStep, stepIntervals[current]);
    };

    timer = setTimeout(runStep, stepIntervals[0]);
    return () => clearTimeout(timer);
  }, [isInteractive, mode]);

  const effectiveStep = mode === 'success' ? 7 : isInteractive ? activeDigitsCount! : animatedStep;
  const isUnlocked = effectiveStep >= 6;

  // Split code into 6 digits for display
  const digits = (code || '739201').slice(0, 6).padEnd(6, '•').split('');

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Background Radial Glow */}
      <div
        className={`absolute w-44 h-44 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isUnlocked
            ? 'bg-emerald-500/25 scale-110'
            : 'bg-rose-500/20 scale-95'
        }`}
      />

      {/* Main Lottie-Style SVG Stage */}
      <div className="relative w-full max-w-[280px] h-[140px] flex items-center justify-center">
        <svg
          viewBox="0 0 280 140"
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>

            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Vault Padlock Body & Shackle */}
          <g transform="translate(140, 42)">
            {/* Shackle: pops open when unlocked */}
            <g
              className="transition-transform duration-500 ease-out origin-top-left"
              style={{
                transform: isUnlocked
                  ? 'translateY(-14px) rotate(-35deg)'
                  : 'translateY(0px) rotate(0deg)',
              }}
            >
              <path
                d="M -16 2 L -16 -16 C -16 -28, 16 -28, 16 -16 L 16 2"
                fill="none"
                stroke={isUnlocked ? 'url(#emeraldGradient)' : 'url(#roseGradient)'}
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />
            </g>

            {/* Lock Body Base */}
            <rect
              x="-26"
              y="0"
              width="52"
              height="44"
              rx="12"
              fill="#161D2A"
              stroke={isUnlocked ? '#10B981' : '#E11D48'}
              strokeWidth="2.5"
              className="transition-colors duration-500"
            />

            {/* Lock Keyhole / Status Indicator */}
            {isUnlocked ? (
              <g className="animate-in zoom-in duration-300">
                <circle cx="0" cy="20" r="10" fill="#059669" opacity="0.3" />
                <path
                  d="M -5 20 L -1 24 L 6 15"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : (
              <g>
                <circle cx="0" cy="18" r="4.5" fill="#FB7185" />
                <path d="M -2 20 L 2 20 L 3 28 L -3 28 Z" fill="#FB7185" />
              </g>
            )}
          </g>

          {/* 2. Floating Escrow Money Burst (When Unlocked) */}
          {isUnlocked && (
            <g className="animate-in fade-in zoom-in duration-500">
              {/* Coin 1 Left */}
              <g transform="translate(65, 30)" className="animate-bounce" style={{ animationDuration: '1.4s' }}>
                <circle cx="0" cy="0" r="11" fill="url(#goldGradient)" filter="url(#neonGlow)" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#78350F"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  KES
                </text>
              </g>

              {/* Coin 2 Right */}
              <g transform="translate(215, 30)" className="animate-bounce" style={{ animationDuration: '1.2s' }}>
                <circle cx="0" cy="0" r="11" fill="url(#goldGradient)" filter="url(#neonGlow)" />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#78350F"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  KES
                </text>
              </g>

              {/* Sparkle Stars */}
              <path
                d="M 100 18 Q 104 18 104 14 Q 104 18 108 18 Q 104 18 104 22 Q 104 18 100 18 Z"
                fill="#FDE68A"
              />
              <path
                d="M 180 18 Q 184 18 184 14 Q 184 18 188 18 Q 184 18 184 22 Q 184 18 180 18 Z"
                fill="#FDE68A"
              />
            </g>
          )}

          {/* 3. The 6-Digit Code Input Tray */}
          <g transform="translate(140, 110)">
            {/* Tray Background */}
            <rect
              x="-125"
              y="-18"
              width="250"
              height="36"
              rx="10"
              fill="#0F141F"
              stroke={isUnlocked ? '#10B981' : '#334155'}
              strokeWidth="1.5"
              className="transition-colors duration-500"
            />

            {/* 6 Digit Slots */}
            {[-100, -60, -20, 20, 60, 100].map((posX, idx) => {
              const isFilled = idx < effectiveStep;
              const isCurrent = idx === effectiveStep && !isUnlocked;
              const digitVal = digits[idx] || (idx + 1).toString();

              return (
                <g key={idx} transform={`translate(${posX}, 0)`}>
                  {/* Slot Frame */}
                  <rect
                    x="-15"
                    y="-13"
                    width="30"
                    height="26"
                    rx="6"
                    fill={isFilled ? (isUnlocked ? '#064E3B' : '#881337') : '#1E293B'}
                    stroke={
                      isUnlocked
                        ? '#34D399'
                        : isFilled
                        ? '#FB7185'
                        : isCurrent
                        ? '#F43F5E'
                        : '#475569'
                    }
                    strokeWidth={isFilled || isCurrent ? '2' : '1'}
                    className="transition-all duration-300"
                  />

                  {/* Digit Character or Dot */}
                  {isFilled ? (
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fill={isUnlocked ? '#A7F3D0' : '#FECDD3'}
                      fontSize="14"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="animate-in zoom-in-75 duration-200"
                    >
                      {mode === 'display' ? digitVal : digitVal === '•' ? '•' : digitVal}
                    </text>
                  ) : (
                    <circle cx="0" cy="0" r="2.5" fill="#64748B" opacity="0.6" />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Dynamic Status Caption */}
      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide">
        {isUnlocked ? (
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-md animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>6-Digit Code Verified • Payout Released</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-rose-300 bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full text-[11px]">
            <KeyRound className="w-3 h-3 text-rose-400" />
            <span>
              {mode === 'input'
                ? `Enter 6 digits to unlock (${effectiveStep}/6 entered)`
                : 'Enter in-person 6-digit code to release escrow'}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

import React from 'react';

interface SociLinkLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  badge?: string;
}

export function SociLinkLogo({
  size = 'md',
  showText = true,
  className = '',
  badge,
}: SociLinkLogoProps) {
  const iconDimensions = {
    xs: 20,
    sm: 26,
    md: 36,
    lg: 48,
    xl: 64,
  }[size];

  const textClasses = {
    xs: 'text-sm font-bold',
    sm: 'text-base font-extrabold',
    md: 'text-xl font-black',
    lg: 'text-2xl font-black',
    xl: 'text-4xl font-black',
  }[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Modern SociLaLink Iconic Mark */}
      <div className="relative flex items-center justify-center">
        <svg
          width={iconDimensions}
          height={iconDimensions}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0 drop-shadow-[0_4px_16px_rgba(255,51,102,0.45)] transition-transform hover:scale-105"
        >
          <defs>
            <linearGradient id="socilalinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF3366" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#9333EA" />
            </linearGradient>
            <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          {/* Continuous Interconnected Heart Ribbon */}
          <path
            d="M32 55C32 55 9 39 9 23C9 14.5 15.5 8 24 8C29 8 32 11 32 11C32 11 35 8 40 8C48.5 8 55 14.5 55 23C55 39 32 55 32 55Z"
            stroke="url(#socilalinkGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Central Connection Infinity Node / Link Loop */}
          <path
            d="M24 30C24 25.5 28 22 32 26C36 30 40 25.5 40 25.5"
            stroke="url(#socilalinkGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Sparkle of Chemistry in Upper Right */}
          <path
            d="M48 14L49.5 10.5L53 9L49.5 7.5L48 4L46.5 7.5L43 9L46.5 10.5L48 14Z"
            fill="url(#sparkleGrad)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span className={`tracking-tight text-white leading-none ${textClasses}`}>
            Soci<span className="gradient-text">LaLink</span>
          </span>
          {badge && (
            <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 leading-none">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { SociLinkLogo as SociLaLinkLogo };

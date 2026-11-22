import React from 'react';
import { SociLinkLogo } from '../ui/SociLinkLogo';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onGetStarted: () => void;
  onLoginClick: () => void;
}

export function SplashScreen({ onGetStarted, onLoginClick }: SplashScreenProps) {
  return (
    <div className="relative flex flex-col justify-between items-center min-h-[680px] h-full w-full max-w-sm mx-auto p-6 bg-[#0B0E14] text-white rounded-3xl overflow-hidden shadow-2xl border border-gray-800/40">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 pointer-events-none gradient-glow opacity-80" />

      {/* Top Header Placeholder */}
      <div className="w-full flex justify-between items-center pt-2 z-10">
        <span className="text-xs text-gray-500 font-mono tracking-widest uppercase">9:41</span>
        <div className="flex items-center gap-1.5 text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] tracking-wide text-gray-400">Kenya • Safe & Verified</span>
        </div>
      </div>

      {/* Center Branding Hero */}
      <div className="flex flex-col items-center text-center my-auto z-10 space-y-4">
        <div className="p-4 rounded-3xl bg-[#1A202C]/60 backdrop-blur-md border border-gray-800 shadow-[0_10px_30px_rgba(225,29,72,0.2)]">
          <SociLinkLogo size="xl" showText={false} />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">
            Soci<span className="gradient-text">LaLink</span>
          </h1>
          <p className="text-sm font-medium tracking-wide text-slate-300">
            Meet <span className="text-rose-500">•</span> Connect <span className="text-rose-500">•</span> Share
          </p>
        </div>

        <div className="pt-2 px-6">
          <p className="text-xs text-gray-400 leading-relaxed">
            Real people. Real moments. Exclusive dating discovery, companion dates, and verified creator connections.
          </p>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="w-full space-y-3.5 z-10 pb-4">
        <button
          onClick={onGetStarted}
          className="w-full py-3.5 px-6 rounded-full font-semibold text-sm gradient-pink shadow-[0_6px_20px_rgba(225,29,72,0.35)] hover:shadow-[0_8px_25px_rgba(225,29,72,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <button
            onClick={onLoginClick}
            className="font-semibold text-[#F43F5E] hover:underline cursor-pointer ml-1"
          >
            Log in
          </button>
        </p>

        <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-gray-500">
          <Sparkles className="w-3 h-3 text-[#F43F5E]" />
          <span>Strict 18+ policy • M-PESA Protected</span>
        </div>
      </div>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, Sparkles, Loader2, AlertCircle, CheckCircle2, PhoneCall } from 'lucide-react';
import { LottieCodeUnlockAnimation } from './LottieCodeUnlockAnimation';

interface MeetingVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateItem: any;
  onVerified: () => void;
}

export function MeetingVerificationModal({
  isOpen,
  onClose,
  dateItem,
  onVerified,
}: MeetingVerificationModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  if (!isOpen || !dateItem) return null;

  const isInviter = dateItem.isInviter; // Client sees code; Companion enters code

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/dates/${dateItem.id}/verify-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setSuccessData(data.data);
      onVerified();
    } catch (err: any) {
      console.error('Error verifying meeting:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] rounded-3xl border border-rose-500/30 p-6 shadow-2xl text-white text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#E11D48]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-gray-800 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Screen 9 Success State */}
        {successData ? (
          <div className="py-2 space-y-3 animate-fade-in">
            <LottieCodeUnlockAnimation
              mode="success"
              payoutAmountKes={successData.payoutAmountKes}
            />

            <h3 className="text-base font-bold text-white">Meeting Verified!</h3>
            <p className="text-xs text-gray-300">
              Payment of <span className="font-bold text-emerald-400">KES {successData.payoutAmountKes}</span> has been safely released to your wallet.
            </p>

            <button
              onClick={() => {
                onClose();
              }}
              className="mt-4 w-full py-2.5 rounded-xl gradient-pink text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Continue to Wallet
            </button>
          </div>
        ) : isInviter ? (
          /* CLIENT VIEW: Displays 6-digit code for companion */
          <div className="space-y-3.5">
            {/* Lottie Animation Showing 6-Digit Code & Fund Release */}
            <LottieCodeUnlockAnimation
              code={dateItem.verificationCode?.code}
              mode="display"
              payoutAmountKes={dateItem.escrowAmountKes}
            />

            <div>
              <h3 className="text-sm font-bold text-white">Meeting Verification Code</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Show this 6-digit code to your date companion in person to verify the meeting and release escrow payment.
              </p>
            </div>

            {/* 6-Digit Display */}
            <div className="flex items-center justify-center gap-2 my-2">
              {(dateItem.verificationCode?.code || '------')
                .split('')
                .map((char: string, idx: number) => (
                  <div
                    key={idx}
                    className="w-10 h-12 rounded-xl bg-[#1A202C] border-2 border-rose-500/50 flex items-center justify-center text-lg font-mono font-bold text-rose-400 shadow-md"
                  >
                    {char}
                  </div>
                ))}
            </div>

            <div className="p-3 rounded-xl bg-[#1A202C] border border-gray-700 text-left space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Escrow Hold:</span>
                <span className="font-semibold text-white">KES {dateItem.escrowAmountKes}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Venue:</span>
                <span className="font-semibold text-white truncate max-w-[170px]">{dateItem.locationName}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-500">
              Only reveal this code once you are safely together at the agreed location.
            </p>
          </div>
        ) : (
          /* COMPANION VIEW: Enters the 6-digit code */
          <form onSubmit={handleVerify} className="space-y-3.5">
            {/* Interactive Lottie Animation syncing with entered digits */}
            <LottieCodeUnlockAnimation
              activeDigitsCount={code.length}
              code={code}
              mode="input"
              payoutAmountKes={Math.round(dateItem.escrowAmountKes * 0.8)}
            />

            <div>
              <h3 className="text-sm font-bold text-white">Confirm In-Person Meeting</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Ask your date client for their 6-digit verification code and enter it below to unlock your payout.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full bg-[#1A202C] border-2 border-rose-500/40 focus:border-rose-500 rounded-2xl py-3 text-center text-xl font-mono font-bold tracking-[0.5em] text-white focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Expected Payout (80%):</span>
                <span className="font-bold text-emerald-400">
                  KES {Math.round(dateItem.escrowAmountKes * 0.8).toLocaleString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-lg bg-red-500/10 text-left">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full py-2.5 rounded-xl gradient-pink text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Meeting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verify & Release Payout</span>
                </>
              )}
            </button>
          </form>
        )}

        {dateItem?.partner?.phone && !successData && (
          <div className="mt-4 pt-3 border-t border-gray-800 text-center">
            <a
              href={`tel:${dateItem.partner.phone}`}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition cursor-pointer"
              onClick={(e) => {
                if (!confirm(`Call @${dateItem.partner.username} on mobile (${dateItem.partner.phone})? This will start a normal phone call.`)) {
                  e.preventDefault();
                }
              }}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Can't spot your partner? Call @{dateItem.partner.username} on mobile</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


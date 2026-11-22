'use client';

import React, { useState } from 'react';
import { X, ArrowUpRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalanceKes: number;
  onSuccess: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalanceKes,
  onSuccess,
}: WithdrawModalProps) {
  const [phone, setPhone] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanPhone = phone.trim();
  const numAmount = parseInt(amountStr, 10) || 0;
  const isPhoneValid = cleanPhone.length >= 9;
  const isAmountValid = numAmount >= 10 && numAmount <= availableBalanceKes;
  const canSubmit = !loading && isPhoneValid && isAmountValid;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: cleanPhone, amountKes: numAmount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process withdrawal');
      }

      setSuccessMessage(`Payout of KES ${numAmount.toLocaleString()} sent to ${cleanPhone}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setError(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] rounded-3xl border border-gray-800 p-5 shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Withdraw</h3>
              <p className="text-[11px] text-gray-400">
                Available: <span className="font-bold text-emerald-400 font-mono">KES {availableBalanceKes.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleWithdraw} className="space-y-3.5 mt-3.5">
          {/* Phone Input */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-mono transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Amount (KES)
            </label>
            <input
              type="number"
              min="10"
              max={availableBalanceKes}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-full bg-[#1A202C] border border-gray-700 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-bold transition-colors"
              required
            />
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Feedback */}
          {successMessage && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2 ${
              canSubmit
                ? 'gradient-pink shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-98 cursor-pointer'
                : 'bg-gray-800 text-gray-500 border border-gray-700/60 cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : numAmount > 0 ? (
              <span>Withdraw KES {numAmount.toLocaleString()}</span>
            ) : (
              <span>Withdraw</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Smartphone, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MpesaDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MpesaDepositModal({ isOpen, onClose, onSuccess }: MpesaDepositModalProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '0712345678');
  const [amountKes, setAmountKes] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  if (!isOpen) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/wallet/deposit-mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amountKes: Number(amountKes) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate M-PESA payment');
      }

      setPendingPrompt(data.data);
    } catch (err: any) {
      console.error('M-PESA deposit error:', err);
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDevConfirm = async () => {
    if (!pendingPrompt?.checkoutRequestId) return;
    setSimulating(true);

    try {
      const res = await fetch('/api/v1/mpesa/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId: pendingPrompt.checkoutRequestId,
          amountKes: Number(amountKes),
          success: true,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to simulate callback:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] rounded-3xl border border-rose-500/30 p-5 shadow-2xl text-white overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#E11D48]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-gray-800 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {pendingPrompt ? (
          /* Waiting for M-PESA PIN confirmation */
          <div className="text-center py-3 space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
              <Smartphone className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-sm text-white">M-PESA Prompt Dispatched</h3>
            <p className="text-xs text-gray-300 leading-relaxed px-2">
              A payment request for <span className="font-bold text-emerald-400">KES {amountKes}</span> has been sent to <span className="font-mono text-white">{phone}</span>.
            </p>
            <p className="text-[11px] text-gray-400">
              Please enter your M-PESA PIN on your mobile phone to complete the transaction.
            </p>

            {/* Sandbox Simulation Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulateDevConfirm}
                disabled={simulating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simulate Successful M-PESA PIN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Deposit Input Form */
          <form onSubmit={handleInitiate} className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
              <div className="w-8 h-8 rounded-full gradient-pink flex items-center justify-center text-white shadow-md">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Deposit via M-PESA</h3>
                <p className="text-[10px] text-gray-400">Instant STK Push top-up to your wallet</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                M-PESA Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full bg-[#1A202C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                min="10"
                step="1"
                value={amountKes}
                onChange={(e) => setAmountKes(Number(e.target.value))}
                className="w-full bg-[#1A202C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                required
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="block text-[10px] text-gray-400 mb-1">Quick Select</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountKes(amt)}
                    className={`py-1.5 text-xs rounded-xl border ${
                      amountKes === amt
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-[#1A202C] border-gray-700 text-gray-400'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl gradient-pink text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Prompt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Deposit KES {amountKes.toLocaleString()}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


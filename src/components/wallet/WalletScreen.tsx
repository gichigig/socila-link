'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { WithdrawModal } from './WithdrawModal';

interface TransactionItem {
  id: string;
  type: string;
  amountKes: number;
  status: string;
  reference: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface WalletData {
  walletId: string;
  userId: string;
  balanceKes: number;
  escrowBalanceKes: number;
  totalBalanceKes: number;
  currency: string;
  isFrozen: boolean;
  transactions: TransactionItem[];
}

export function WalletScreen() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch('/api/v1/wallet', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const getTxVisuals = (type: string) => {
    switch (type) {
      case 'DEPOSIT_MPESA':
        return {
          icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
          color: 'text-emerald-400',
          sign: '+',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
        };
      case 'WITHDRAWAL_MPESA':
        return {
          icon: <ArrowUpRight className="w-4 h-4 text-blue-400" />,
          color: 'text-gray-300',
          sign: '-',
          bg: 'bg-blue-500/10 border-blue-500/30',
        };
      case 'ESCROW_LOCK':
        return {
          icon: <Lock className="w-4 h-4 text-amber-400" />,
          color: 'text-amber-400',
          sign: 'Hold: ',
          bg: 'bg-amber-500/10 border-amber-500/30',
        };
      case 'ESCROW_RELEASE':
        return {
          icon: <Sparkles className="w-4 h-4 text-rose-400" />,
          color: 'text-rose-400',
          sign: '+',
          bg: 'bg-rose-500/10 border-rose-500/30',
        };
      case 'ESCROW_REFUND':
        return {
          icon: <RotateCcw className="w-4 h-4 text-purple-400" />,
          color: 'text-purple-400',
          sign: '+',
          bg: 'bg-purple-500/10 border-purple-500/30',
        };
      default:
        return {
          icon: <WalletIcon className="w-4 h-4 text-gray-400" />,
          color: 'text-gray-200',
          sign: '',
          bg: 'bg-gray-800 border-gray-700',
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full text-white">
      {/* Header */}
      <div className="p-3.5 pb-2.5 border-b border-white/[0.08] glass-panel rounded-t-3xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
            <WalletIcon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-white tracking-wide">SociLaLink Wallet & Ledger</h2>
        </div>
        <button
          onClick={fetchWallet}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading financial balances...</span>
          </div>
        ) : wallet ? (
          <>
            {/* Screen 10 Balance Card */}
            <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#1E2533] to-[#121721] border border-gray-800 shadow-xl overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#E11D48]/15 rounded-full blur-2xl pointer-events-none" />

              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Total Balance
              </span>

              <div className="flex items-baseline gap-1 mt-1 mb-3">
                <span className="text-2xl font-bold font-mono text-white">
                  KES {wallet.totalBalanceKes.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 font-mono">KES</span>
              </div>

              {/* Balance Breakdown Pills */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <span className="text-[10px] text-emerald-400 block font-semibold">Available</span>
                  <span className="font-mono font-bold text-emerald-300">
                    KES {wallet.balanceKes.toLocaleString()}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="text-[10px] text-amber-400 block font-semibold">In Escrow Hold</span>
                  <span className="font-mono font-bold text-amber-300">
                    KES {wallet.escrowBalanceKes.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  onClick={() => setIsWithdrawOpen(true)}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Withdraw Earnings to M-PESA</span>
                </button>
              </div>
            </div>

            {/* Transaction Ledger Statement Stream */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block px-1">
                Recent Transactions
              </span>

              {wallet.transactions.length === 0 ? (
                <div className="p-6 text-center text-gray-500 rounded-2xl bg-[#161D2A] border border-gray-800 text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                  <p>No transactions yet</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Deposits, companion escrows, and payouts will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {wallet.transactions.map((tx) => {
                    const visuals = getTxVisuals(tx.type);
                    const timeStr = new Date(tx.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[#161D2A] border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${visuals.bg}`}
                          >
                            {visuals.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-200 text-xs truncate max-w-[150px]">
                              {tx.description}
                            </p>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {timeStr} • {tx.reference.slice(0, 14)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`font-mono font-bold text-xs ${visuals.color}`}>
                            {visuals.sign}KES {tx.amountKes.toLocaleString()}
                          </span>
                          <span
                            className={`block text-[9px] font-semibold ${
                              tx.status === 'COMPLETED'
                                ? 'text-emerald-400'
                                : tx.status === 'PENDING'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Withdrawal Modal */}
      {wallet && (
        <WithdrawModal
          isOpen={isWithdrawOpen}
          availableBalanceKes={wallet.balanceKes}
          onClose={() => setIsWithdrawOpen(false)}
          onSuccess={() => fetchWallet()}
        />
      )}
    </div>
  );
}


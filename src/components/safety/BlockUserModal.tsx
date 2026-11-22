'use client';

import React, { useState } from 'react';
import { X, UserX, Loader2, AlertCircle } from 'lucide-react';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}

export function BlockUserModal({
  isOpen,
  onClose,
  targetUserId,
  targetName,
  onBlocked,
}: BlockUserModalProps) {
  const [reason, setReason] = useState('Harassment or spam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/safety/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to block user');
      }

      if (onBlocked) onBlocked();
      onClose();
    } catch (err: any) {
      console.error('Error blocking user:', err);
      setError(err.message || 'Error blocking user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121721] rounded-3xl border border-gray-800 p-5 shadow-2xl text-white text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-gray-800 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-3">
          <UserX className="w-7 h-7" />
        </div>

        <h3 className="font-bold text-sm text-white">Block {targetName}?</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed mx-auto">
          They will not be able to message you, view your profile, see your stories, or match with you. Any existing matches will be terminated.
        </p>

        <form onSubmit={handleBlock} className="mt-4 space-y-3 text-left">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unwanted messages"
              className="w-full bg-[#1A202C] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


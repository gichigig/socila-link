'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  Coins,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface CompanionPartner {
  id?: string;
  userId?: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  companionRateKes?: number | null;
}

export interface RebookInitialValues {
  locationName?: string;
  locationAddress?: string | null;
  durationHours?: number;
  escrowAmountKes?: number;
  notes?: string | null;
  rebookDateId?: string;
}

interface CreateDateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: CompanionPartner | null;
  onSuccess?: (date: any) => void;
  initialValues?: RebookInitialValues | null;
}

export function CreateDateInviteModal({
  isOpen,
  onClose,
  partner,
  onSuccess,
  initialValues,
}: CreateDateInviteModalProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [locationName, setLocationName] = useState('Villa Rosa Kempinski, Nairobi');
  const [dateStr, setDateStr] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [durationHours, setDurationHours] = useState(3);
  const [escrowAmountKes, setEscrowAmountKes] = useState(3500);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesaPromptPending, setMpesaPromptPending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);

  // Advanced real-time payment tracking
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [activeCheckoutRequestId, setActiveCheckoutRequestId] = useState<string | null>(null);
  const [pollElapsedSeconds, setPollElapsedSeconds] = useState(0);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [isPollTimedOut, setIsPollTimedOut] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time WebSocket listener for instant payment confirmation
  useEffect(() => {
    if (!socket || !activeDateId) return;

    const handlePaymentConfirmed = (data: any) => {
      if (data?.dateInviteId === activeDateId && data.status === 'ESCROW_FUNDED') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsVerified(true);
        setVerifiedCode(data.code || null);
        setMpesaPromptPending(false);
        if (onSuccess) onSuccess({ id: activeDateId, status: 'ESCROW_FUNDED' });
      }
    };

    socket.on('payment:confirmed', handlePaymentConfirmed);
    return () => {
      socket.off('payment:confirmed', handlePaymentConfirmed);
    };
  }, [socket, activeDateId, onSuccess]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      if (initialValues.locationName) setLocationName(initialValues.locationName);
      if (initialValues.durationHours) setDurationHours(initialValues.durationHours);
      if (initialValues.escrowAmountKes) setEscrowAmountKes(initialValues.escrowAmountKes);
      if (initialValues.notes !== undefined) setNotes(initialValues.notes || '');
    } else if (partner?.companionRateKes != null && partner.companionRateKes > 0) {
      setEscrowAmountKes(Math.max(10, partner.companionRateKes));
    }
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [partner, user, initialValues, isOpen]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isOpen || !partner) return null;

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setMpesaPromptPending(false);
    setIsVerified(false);
    setVerifiedCode(null);
    setError(null);
    setIsPollTimedOut(false);
    setPollElapsedSeconds(0);
    onClose();
  };

  const checkStatusOnDemand = async (dateId: string, checkoutId?: string | null) => {
    try {
      const statusRes = await fetch(
        `/api/v1/dates/${dateId}/mpesa-status${checkoutId ? `?checkoutRequestId=${checkoutId}` : ''}`
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.isFunded || statusData.status === 'ESCROW_FUNDED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsVerified(true);
          setVerifiedCode(statusData.code || null);
          setMpesaPromptPending(false);
          if (onSuccess) onSuccess({ id: dateId, status: 'ESCROW_FUNDED' });
          return true;
        } else if (statusData.failed || statusData.daraja?.success === false) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setMpesaPromptPending(false);
          const reason =
            statusData.failureReason ||
            statusData.daraja?.message ||
            'M-PESA transaction failed';
          setError(reason);
          return true;
        }
      }
    } catch (e) {
      console.warn('Status check warning:', e);
    }
    return false;
  };

  const handleManualCheck = async () => {
    if (!activeDateId || isManualChecking) return;
    setIsManualChecking(true);
    await checkStatusOnDemand(activeDateId, activeCheckoutRequestId);
    setIsManualChecking(false);
  };

  const startMpesaPolling = (dateId: string, checkoutId?: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setActiveDateId(dateId);
    setActiveCheckoutRequestId(checkoutId || null);
    setPollElapsedSeconds(0);
    setIsPollTimedOut(false);
    setMpesaPromptPending(true);

    let seconds = 0;
    const maxSeconds = 120; // 120 seconds (2 full minutes!)

    pollIntervalRef.current = setInterval(async () => {
      seconds += 2;
      setPollElapsedSeconds(seconds);

      const done = await checkStatusOnDemand(dateId, checkoutId);
      if (done) return;

      if (seconds >= maxSeconds) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsPollTimedOut(true);
      }
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (!cleanPhone) {
      setError('Please enter a Safaricom or Airtel phone number for the M-PESA prompt');
      return;
    }
    if (!/^(?:254|\+254|0)?([17]\d{8})$/.test(cleanPhone)) {
      setError('Invalid Kenyan phone number format (use e.g. 0712345678 or 0112345678)');
      return;
    }

    const targetInviteeId = partner.id || partner.userId;
    if (!targetInviteeId) {
      setError('Invalid companion selected');
      return;
    }

    if (user && (targetInviteeId === user.id || partner.username === user.username)) {
      setError('You cannot book a companion date with your own account');
      return;
    }

    if (!dateStr || isNaN(new Date(dateStr).getTime())) {
      setError('Please select a valid meeting date and time');
      return;
    }

    const numericEscrow = Number(escrowAmountKes);
    if (isNaN(numericEscrow) || numericEscrow < 10) {
      setError('Minimum escrow amount is 10 KES');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduledAtIso = new Date(dateStr).toISOString();

      const isRebook = Boolean(initialValues?.rebookDateId);
      const url = isRebook ? `/api/v1/dates/${initialValues!.rebookDateId}/rebook` : '/api/v1/dates';

      const payload: any = isRebook
        ? {
            locationName,
            scheduledAt: scheduledAtIso,
            durationHours: Number(durationHours),
            escrowAmountKes: numericEscrow,
            notes: notes.trim() || undefined,
            directMpesaPhone: cleanPhone,
          }
        : {
            inviteeId: targetInviteeId,
            locationName,
            scheduledAt: scheduledAtIso,
            durationHours: Number(durationHours),
            escrowAmountKes: numericEscrow,
            notes: notes.trim() || undefined,
            directMpesaPhone: cleanPhone,
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        let errorMsg = data.error || (isRebook ? 'Failed to rebook date' : 'Failed to send date invitation');
        if (Array.isArray(data.details) && data.details.length > 0) {
          errorMsg = data.details.map((d: any) => d.message).join('. ');
        }
        throw new Error(errorMsg);
      }

      const dateId = data.data?.id;
      const checkoutRequestId = data.data?.mpesaPrompt?.checkoutRequestId;

      if (dateId) {
        startMpesaPolling(dateId, checkoutRequestId);
      }
    } catch (err: any) {
      console.error('Error creating date invitation:', err);
      setError(err.message || 'Error creating invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-6 bg-[#111622] rounded-3xl border border-gray-800 p-5 shadow-2xl text-white">
        {/* State 1: Verified / Escrow Locked */}
        {isVerified ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Escrow Locked</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                KES {escrowAmountKes.toLocaleString()} is safely held in escrow.
              </p>
            </div>

            {verifiedCode && (
              <div className="p-3.5 rounded-2xl bg-[#0B0E14] border border-gray-800 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">
                  Meeting Verification Code
                </span>
                <span className="text-2xl font-mono font-black tracking-widest text-emerald-400 block">
                  {verifiedCode}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  Reveal to {partner.displayName} in person to release funds.
                </span>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : mpesaPromptPending ? (
          /* State 2: Waiting for M-PESA PIN (Replaces the entire form cleanly!) */
          <div className="py-6 text-center space-y-4">
            <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative z-10 text-emerald-400">
                <Smartphone className="w-7 h-7" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Check Your Phone</h3>
              <p className="text-xs text-gray-300">
                STK Prompt sent to <span className="font-bold text-emerald-400">{phone}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                Enter your M-PESA PIN to lock KES {escrowAmountKes.toLocaleString()} into escrow.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>
                {isPollTimedOut
                  ? 'Awaiting Safaricom confirmation...'
                  : `Waiting for PIN confirmation... (${pollElapsedSeconds}s / 120s)`}
              </span>
            </div>

            {/* Quick On-Demand Status Verification */}
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isManualChecking}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isManualChecking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>I've Entered My PIN — Check Status Now</span>
            </button>

            {isPollTimedOut && (
              <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mt-2 text-center">
                If you entered your PIN, tap 'Check Status Now' above to confirm your payment without refreshing.
              </p>
            )}

            <button
              onClick={handleClose}
              className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition cursor-pointer mt-2"
            >
              Dismiss & Check Later
            </button>
          </div>
        ) : (
          /* State 3: Clean, Minimal Form */
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={
                    partner.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                  }
                  alt={partner.displayName}
                  className="w-9 h-9 rounded-full object-cover border border-rose-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white truncate">
                      {initialValues?.rebookDateId ? 'Rebook with ' : ''}{partner.displayName}
                    </span>
                    {partner.isVerified && (
                      <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 truncate block">
                      @{partner.username}
                    </span>
                    {initialValues?.rebookDateId && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold flex items-center gap-0.5">
                        <RotateCcw className="w-2.5 h-2.5" /> Rebook
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  KES {escrowAmountKes.toLocaleString()}
                </span>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-3.5 space-y-3 text-xs">
              {/* Venue */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" /> Venue / Location
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Sankara Hotel, Westlands"
                  className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/60"
                  required
                />
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" /> Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500/60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                    Duration
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-rose-500/60"
                  >
                    {[1, 2, 3, 4, 6, 8].map((h) => (
                      <option key={h} value={h}>
                        {h} {h === 1 ? 'hr' : 'hrs'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Escrow Amount (KES) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Companion Escrow (KES)
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">Min KES 10</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-500">
                    KES
                  </span>
                  <input
                    type="number"
                    min="10"
                    max="200000"
                    step="10"
                    value={escrowAmountKes || ''}
                    onChange={(e) => setEscrowAmountKes(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 3500"
                    className="w-full bg-[#161B26] border border-gray-800 rounded-xl pl-12 pr-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500/60"
                    required
                  />
                </div>
              </div>

              {/* M-PESA Phone Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-emerald-400" /> M-PESA Phone Number
                  </label>
                  <span className="text-[10px] text-gray-500">Safaricom / Airtel</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX or 01XXXXXXXX"
                  className="w-full bg-[#161B26] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-wider focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Optional Note */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add optional note or preference..."
                  className="w-full bg-[#161B26] border border-gray-800/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-700"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {initialValues?.rebookDateId ? 'Dispatching Rebook Prompt...' : 'Dispatching M-PESA Prompt...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {initialValues?.rebookDateId ? 'Rebook & Pre-Fund' : 'Pay'} KES {escrowAmountKes.toLocaleString()} via M-PESA STK
                    </span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

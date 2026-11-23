'use client';

// DatesScreen - Companion Dates & Escrow Management
import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarHeart,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Loader2,
  Lock,
  Smartphone,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  PhoneCall,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { CreateDateInviteModal, RebookInitialValues } from './CreateDateInviteModal';
import { MeetingVerificationModal } from './MeetingVerificationModal';
import { ScheduleDateModal } from './ScheduleDateModal';
import { DuolingoPointingMascot } from './DuolingoPointingMascot';

interface DateItem {
  id: string;
  isInviter: boolean;
  role: 'CLIENT' | 'COMPANION';
  status: string;
  locationName: string;
  locationAddress?: string | null;
  scheduledAt: string;
  durationHours: number;
  escrowAmountKes: number;
  notes?: string | null;
  cancellationReason?: string | null;
  cancellationRequestedById?: string | null;
  rescheduleRequestedById?: string | null;
  proposedScheduledAt?: string | null;
  proposedDurationHours?: number | null;
  proposedLocationName?: string | null;
  proposedLocationAddress?: string | null;
  proposedNotes?: string | null;
  wasEscrowFunded?: boolean;
  refundStatus?: 'COMPLETED' | 'QUEUED' | 'NONE' | null;
  refundReceipt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  partner: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
    phone?: string | null;
  };
  verificationCode?: {
    isVerified: boolean;
    verifiedAt?: string | null;
    expiresAt: string;
    code?: string;
  } | null;
}

interface DatesScreenProps {
  onOpenWallet?: () => void;
}

export function DatesScreen({ onOpenWallet }: DatesScreenProps) {
  const { user, refreshActiveDatesCount, setActiveDatesCount } = useAuth();
  const [dates, setDates] = useState<DateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedDateForVerify, setSelectedDateForVerify] = useState<DateItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [stkNotice, setStkNotice] = useState<{ dateId: string; message: string } | null>(null);

  // Rebook past date state
  const [rebookPartner, setRebookPartner] = useState<DateItem['partner'] | null>(null);
  const [rebookInitialValues, setRebookInitialValues] = useState<RebookInitialValues | null>(null);

  // Companion scheduling & rescheduling modal state
  const [scheduleModalDate, setScheduleModalDate] = useState<DateItem | null>(null);
  const [scheduleModalMode, setScheduleModalMode] = useState<'accept_and_schedule' | 'reschedule'>('accept_and_schedule');

  // M-PESA STK Payment Sheet state
  const { socket } = useSocket();
  const [payingDate, setPayingDate] = useState<DateItem | null>(null);
  const [payingPhone, setPayingPhone] = useState(user?.phone || '');
  const [payingLoading, setPayingLoading] = useState(false);
  const [payingWaitingPin, setPayingWaitingPin] = useState(false);
  const [payingSuccess, setPayingSuccess] = useState(false);
  const [payingError, setPayingError] = useState<string | null>(null);

  // Advanced real-time payment tracking
  const [payingElapsedSeconds, setPayingElapsedSeconds] = useState(0);
  const [payingIsTimedOut, setPayingIsTimedOut] = useState(false);
  const [payingCheckoutRequestId, setPayingCheckoutRequestId] = useState<string | null>(null);
  const [isManualCheckingPayment, setIsManualCheckingPayment] = useState(false);
  const payingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide top header on scroll down, reveal on scroll up
  const [isDatesHeaderVisible, setIsDatesHeaderVisible] = useState(true);
  const lastDatesScrollRef = useRef(0);

  const handleDatesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScroll = e.currentTarget.scrollTop;
    const lastScroll = lastDatesScrollRef.current;
    const delta = currentScroll - lastScroll;

    if (currentScroll <= 15) {
      setIsDatesHeaderVisible(true);
      lastDatesScrollRef.current = currentScroll;
      return;
    }

    if (currentScroll + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 5) {
      return;
    }

    if (Math.abs(delta) > 8) {
      if (delta > 0 && currentScroll > 50) {
        setIsDatesHeaderVisible(false);
      } else if (delta < 0) {
        setIsDatesHeaderVisible(true);
      }
      lastDatesScrollRef.current = currentScroll;
    }
  };

  // 1. Real-time WebSocket listener: reload dates on payment confirmation OR date schedule change
  useEffect(() => {
    if (!socket) return;
    const handlePaymentConfirmed = () => {
      fetchDates();
    };
    const handleDateUpdated = () => {
      fetchDates();
    };
    socket.on('payment:confirmed', handlePaymentConfirmed);
    socket.on('date:updated', handleDateUpdated);
    return () => {
      socket.off('payment:confirmed', handlePaymentConfirmed);
      socket.off('date:updated', handleDateUpdated);
    };
  }, [socket]);

  // 2. Background Polling: auto-refreshes dates every 4s while ANY date is PENDING
  useEffect(() => {
    const hasPendingDates = dates.some((d) => d.status === 'PENDING');
    if (!hasPendingDates) return;

    const interval = setInterval(() => {
      fetchDates();
    }, 4000);

    return () => clearInterval(interval);
  }, [dates]);

  // Cleanup paying interval on unmount
  useEffect(() => {
    return () => {
      if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
    };
  }, []);

  const openMpesaPayModal = (date: DateItem) => {
    if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
    setPayingDate(date);
    setPayingPhone(user?.phone || '');
    setPayingLoading(false);
    setPayingWaitingPin(false);
    setPayingSuccess(false);
    setPayingError(null);
    setPayingElapsedSeconds(0);
    setPayingIsTimedOut(false);
    setPayingCheckoutRequestId(null);
  };

  const checkPayingStatusNow = async (dateId: string, checkoutId?: string | null) => {
    try {
      const statusRes = await fetch(
        `/api/v1/dates/${dateId}/mpesa-status${checkoutId ? `?checkoutRequestId=${checkoutId}` : ''}`
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.isFunded || statusData.status === 'ESCROW_FUNDED') {
          if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
          setPayingSuccess(true);
          setPayingWaitingPin(false);
          fetchDates();
          setTimeout(() => {
            setPayingDate(null);
          }, 2500);
          return true;
        } else if (statusData.failed || statusData.daraja?.success === false) {
          if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
          setPayingWaitingPin(false);
          const reason =
            statusData.failureReason ||
            statusData.daraja?.message ||
            'M-PESA transaction failed';
          setPayingError(reason);
          return true;
        }
      }
    } catch {
      // Keep trying
    }
    return false;
  };

  const handleManualCheckPaying = async () => {
    if (!payingDate || isManualCheckingPayment) return;
    setIsManualCheckingPayment(true);
    await checkPayingStatusNow(payingDate.id, payingCheckoutRequestId);
    setIsManualCheckingPayment(false);
  };

  const handleSendMpesaStk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDate) return;

    const cleanPhone = payingPhone.replace(/[\s\-()]/g, '');
    if (!cleanPhone) {
      setPayingError('Please enter your Safaricom M-PESA phone number');
      return;
    }
    if (!/^(?:254|\+254|0)?([17]\d{8})$/.test(cleanPhone)) {
      setPayingError('Invalid Kenyan phone number format (use e.g. 0712345678 or 0112345678)');
      return;
    }

    setPayingLoading(true);
    setPayingError(null);

    try {
      const res = await fetch(`/api/v1/dates/${payingDate.id}/pay-mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch M-PESA STK prompt');
      }

      setPayingWaitingPin(true);

      const checkoutRequestId = data.data?.checkoutRequestId;
      setPayingCheckoutRequestId(checkoutRequestId || null);
      setPayingElapsedSeconds(0);
      setPayingIsTimedOut(false);

      let seconds = 0;
      const maxSeconds = 120; // 120 seconds (2 full minutes!)

      if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
      payingIntervalRef.current = setInterval(async () => {
        seconds += 2;
        setPayingElapsedSeconds(seconds);

        const done = await checkPayingStatusNow(payingDate.id, checkoutRequestId);
        if (done) return;

        if (seconds >= maxSeconds) {
          if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
          setPayingIsTimedOut(true);
        }
      }, 2000);
    } catch (err: any) {
      setPayingError(err.message || 'Error initiating M-PESA payment');
    } finally {
      setPayingLoading(false);
    }
  };

  const fetchDates = async () => {
    try {
      const res = await fetch('/api/v1/dates');
      if (res.ok) {
        const data = await res.json();
        const dateList: DateItem[] = data.data || [];
        setDates(dateList);

        // Instantly synchronize active badge counter
        const activeCount = dateList.filter((d) =>
          ['PENDING', 'ACCEPTED', 'ESCROW_FUNDED'].includes(d.status)
        ).length;
        if (setActiveDatesCount) {
          setActiveDatesCount(activeCount);
        }
        if (refreshActiveDatesCount) {
          refreshActiveDatesCount();
        }
      }
    } catch (err) {
      console.error('Failed to fetch dates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, []);

  const handleAcceptDate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/v1/dates/${id}/accept`, { method: 'POST' });
      if (res.ok) {
        fetchDates();
      }
    } catch (err) {
      console.error('Failed to accept date:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineDate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/v1/dates/${id}/decline`, { method: 'POST' });
      if (res.ok) {
        fetchDates();
      }
    } catch (err) {
      console.error('Failed to decline date:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFundEscrowMpesa = async (date: DateItem) => {
    setActionLoadingId(date.id);
    setStkNotice(null);
    try {
      const res = await fetch(`/api/v1/dates/${date.id}/pay-mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user?.phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch M-PESA STK prompt');
      }
      setStkNotice({
        dateId: date.id,
        message: `M-PESA STK prompt dispatched to ${user?.phone || 'your phone'}! Enter your PIN on your phone to lock KES ${date.escrowAmountKes.toLocaleString()} in escrow.`,
      });
      setTimeout(() => {
        fetchDates();
      }, 5000);
    } catch (err: any) {
      alert(err.message || 'Error initiating M-PESA STK payment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelDate = async (date: DateItem) => {
    const hours = (new Date(date.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
    const isInsideProtectionWindow = date.status === 'ESCROW_FUNDED' && hours < 2.0;

    const confirmMsg = isInsideProtectionWindow
      ? `This date is scheduled within 2 hours. To protect both parties from last-minute cancellation scams, a cancellation request will be sent to @${date.partner.username} to confirm.\n\nUpon approval, funds can take up to 72 hrs for reimbursement to the number that paid.\n\nDo you want to send this cancellation request?`
      : 'Are you sure you want to cancel this date? Funds can take up to 72 hrs for reimbursement to the number that paid.';

    if (!confirm(confirmMsg)) return;

    setActionLoadingId(date.id);
    try {
      const res = await fetch(`/api/v1/dates/${date.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.data?.requiresApproval) {
          alert(`Cancellation request submitted. Awaiting confirmation from @${date.partner.username}.\n\nNotice: Funds can take up to 72 hrs for reimbursement to the number that paid.`);
        } else {
          alert(data.data?.message || 'Date cancelled. Funds can take up to 72 hrs for reimbursement to the number that paid.');
        }
        fetchDates();
      } else {
        alert(data.error || 'Failed to cancel date');
      }
    } catch (err) {
      console.error('Failed to cancel date:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelResponse = async (date: DateItem, action: 'APPROVE' | 'REJECT') => {
    const confirmPrompt =
      action === 'APPROVE'
        ? `Approve cancellation of this date? Funds can take up to 72 hrs for reimbursement to the number that paid.`
        : `Decline cancellation? If you are already at the venue or this cancellation is fraudulent, this will escalate the booking to a Dispute for Admin review with funds frozen in escrow.`;

    if (!confirm(confirmPrompt)) return;

    setActionLoadingId(date.id);
    try {
      const res = await fetch(`/api/v1/dates/${date.id}/cancel-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.data?.message || `Cancellation ${action === 'APPROVE' ? 'approved. Funds can take up to 72 hrs for reimbursement to the number that paid.' : 'contested'}`);
        fetchDates();
      } else {
        alert(data.error || 'Failed to process cancellation response');
      }
    } catch (err) {
      console.error('Error responding to cancellation:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRescheduleResponse = async (date: DateItem, action: 'ACCEPT' | 'DECLINE' | 'WITHDRAW') => {
    const confirmPrompt =
      action === 'ACCEPT'
        ? `Agree to move this meeting to the newly proposed time and venue?`
        : action === 'WITHDRAW'
        ? `Withdraw your reschedule proposal?`
        : `Decline this reschedule request and keep the current meeting schedule?`;

    if (!confirm(confirmPrompt)) return;

    setActionLoadingId(date.id);
    try {
      const res = await fetch(`/api/v1/dates/${date.id}/reschedule-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.data?.message || 'Reschedule response recorded');
        fetchDates();
      } else {
        alert(data.error || 'Failed to process reschedule response');
      }
    } catch (err) {
      console.error('Error responding to reschedule:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRebookClick = (date: DateItem) => {
    setRebookPartner(date.partner);
    setRebookInitialValues({
      rebookDateId: date.id,
      locationName: date.locationName,
      locationAddress: date.locationAddress,
      durationHours: date.durationHours,
      escrowAmountKes: date.escrowAmountKes,
      notes: date.notes,
    });
    setIsCreateModalOpen(true);
  };

  const activeDates = dates.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'DECLINED');
  const pastDates = dates.filter((d) => d.status === 'COMPLETED' || d.status === 'CANCELLED' || d.status === 'DECLINED');

  const displayedDates = activeTab === 'active' ? activeDates : pastDates;

  // Real-time conflict detection: checks if another active date is scheduled within duration window
  const getScheduleConflict = (targetDate: DateItem) => {
    if (targetDate.status === 'CANCELLED' || targetDate.status === 'DECLINED' || targetDate.status === 'COMPLETED') return null;
    const targetStart = new Date(targetDate.scheduledAt).getTime();
    const targetEnd = targetStart + (targetDate.durationHours || 2) * 3600 * 1000;

    return activeDates.find((other) => {
      if (other.id === targetDate.id) return false;
      const otherStart = new Date(other.scheduledAt).getTime();
      const otherEnd = otherStart + (other.durationHours || 2) * 3600 * 1000;
      return targetStart < otherEnd && targetEnd > otherStart;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full text-white">
      {/* Header */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isDatesHeaderVisible
            ? 'max-h-36 opacity-100 p-3.5 pb-2.5 border-b border-white/[0.08] glass-panel rounded-t-3xl'
            : 'max-h-0 opacity-0 p-0 border-b-transparent pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
              <CalendarHeart className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">Companion Dates & Escrow</h2>
          </div>
          <button
            onClick={fetchDates}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Meetings ({activeDates.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Past History ({pastDates.length})
          </button>
        </div>
      </div>

      {/* Date Cards List */}
      <div
        onScroll={handleDatesScroll}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading companion dates...</span>
          </div>
        ) : displayedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <CalendarHeart className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-white">No {activeTab} dates found</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              Companion dates with M-PESA escrow protection and 6-digit meeting codes will appear here.
            </p>
          </div>
        ) : (
          displayedDates.map((date) => {
            const dateObj = new Date(date.scheduledAt);
            const dateFormatted = dateObj.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeFormatted = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const conflict = getScheduleConflict(date);

            return (
              <div
                key={date.id}
                className="p-3.5 rounded-2xl bg-[#161D2A] border border-gray-800 shadow-lg text-xs space-y-2.5"
              >
                {/* Partner Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        date.partner.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                      }
                      alt={date.partner.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-rose-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white text-xs">
                          {date.partner.displayName}
                        </span>
                        {date.partner.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {date.isInviter ? 'Companion' : 'Client'} • @{date.partner.username}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      date.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : date.status === 'CANCELLATION_REQUESTED'
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 animate-pulse'
                        : date.status === 'DISPUTED'
                        ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                        : date.status === 'ESCROW_FUNDED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : date.status === 'ACCEPTED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : date.status === 'CANCELLED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {date.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Conflict Alert (if overlapping active date exists) */}
                {conflict && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-300 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-200">Schedule Alert</span>
                      <span>
                        You have another date scheduled with @{conflict.partner.username} around this time (
                        {new Date(conflict.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                      </span>
                    </div>
                  </div>
                )}

                {/* Meeting Venue & Schedule */}
                <div className="p-2.5 rounded-xl bg-[#121721] space-y-1.5 border border-gray-800">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="font-semibold text-white truncate">{date.locationName}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-400" />
                      <span>
                        {dateFormatted} at {timeFormatted} ({date.durationHours}h)
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-emerald-400 font-bold">
                        <Lock className="w-3 h-3" />
                        <span>KES {date.escrowAmountKes.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block font-medium">
                        {date.isInviter
                          ? 'Escrow Deposit'
                          : `Payout: KES ${Math.round(date.escrowAmountKes * 0.8).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {date.notes && (
                    <div className="mt-1 pt-1.5 border-t border-gray-800/80 text-[11px] text-gray-300 flex items-start gap-1">
                      <span className="text-gray-400 font-medium shrink-0">Note:</span>
                      <span className="italic truncate">{date.notes}</span>
                    </div>
                  )}
                </div>

                {/* Pending Reschedule Proposal Banner (Mutual Agreement) */}
                {date.rescheduleRequestedById && date.proposedScheduledAt && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#181a2e] to-indigo-950/40 border border-purple-500/40 text-xs space-y-2">
                    {date.rescheduleRequestedById === user?.id ? (
                      // Case A: You proposed the reschedule
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-purple-200">
                            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Reschedule Proposed (Awaiting @{date.partner.username})</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                            Pending Response
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-300 leading-relaxed space-y-0.5 pl-5">
                          <div>
                            <span className="text-gray-400">Proposed: </span>
                            <span className="text-white font-medium">
                              {new Date(date.proposedScheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(date.proposedScheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({date.proposedDurationHours || date.durationHours}h)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Venue: </span>
                            <span className="text-white font-medium">{date.proposedLocationName || date.locationName}</span>
                          </div>
                          {date.proposedNotes && (
                            <div className="text-gray-400 italic">"{date.proposedNotes}"</div>
                          )}
                        </div>
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleRescheduleResponse(date, 'WITHDRAW')}
                            disabled={actionLoadingId === date.id}
                            className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            Withdraw Proposal
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Case B: Partner proposed the reschedule -> Ask user to Agree or Decline!
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Reschedule Request from @{date.partner.username}</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                            Action Required
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          @{date.partner.username} proposed moving this meeting to:
                        </p>
                        <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/30 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <Clock className="w-3.5 h-3.5 text-rose-400" />
                            <span>
                              {new Date(date.proposedScheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(date.proposedScheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({date.proposedDurationHours || date.durationHours}h)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            <span className="truncate">{date.proposedLocationName || date.locationName}</span>
                          </div>
                          {date.proposedNotes && (
                            <div className="text-gray-400 italic pt-0.5 text-[10px]">
                              Note: "{date.proposedNotes}"
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleRescheduleResponse(date, 'ACCEPT')}
                            disabled={actionLoadingId === date.id}
                            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Agree & Update</span>
                          </button>
                          <button
                            onClick={() => handleRescheduleResponse(date, 'DECLINE')}
                            disabled={actionLoadingId === date.id}
                            className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-rose-400 border border-gray-700 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons based on status and role */}
                <div className="pt-1">
                  {/* PENDING: Companion Accept as requested, Schedule & Accept on own terms, or Decline */}
                  {date.status === 'PENDING' && !date.isInviter && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAcceptDate(date.id)}
                          disabled={actionLoadingId === date.id}
                          className="py-2 rounded-xl gradient-pink text-white font-bold text-xs shadow-md hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          Quick Accept
                        </button>
                        <button
                          onClick={() => {
                            setScheduleModalDate(date);
                            setScheduleModalMode('accept_and_schedule');
                          }}
                          className="py-2 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs hover:bg-purple-600/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Schedule Time</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeclineDate(date.id)}
                        disabled={actionLoadingId === date.id}
                        className="w-full py-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 font-semibold text-[11px] hover:bg-gray-700 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        Decline Invitation
                      </button>
                    </div>
                  )}

                  {/* PENDING: Client waiting for companion response, can pre-fund or reschedule */}
                  {date.status === 'PENDING' && date.isInviter && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMpesaPayModal(date)}
                          disabled={actionLoadingId === date.id}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === date.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                          <span>Pre-Fund KES {date.escrowAmountKes.toLocaleString()} via M-PESA</span>
                        </button>
                        <button
                          onClick={() => {
                            setScheduleModalDate(date);
                            setScheduleModalMode('reschedule');
                          }}
                          className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs flex items-center gap-1"
                          title="Change Time / Reschedule"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelDate(date)}
                          disabled={actionLoadingId === date.id}
                          className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ACCEPTED: Client direct M-PESA STK Escrow Funding */}
                  {date.status === 'ACCEPTED' && date.isInviter && (
                    <div className="space-y-2">
                      {stkNotice && stkNotice.dateId === date.id && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{stkNotice.message}</span>
                        </div>
                      )}
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>@{date.partner.username} accepted! Fund escrow to receive meeting code.</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMpesaPayModal(date)}
                          disabled={actionLoadingId === date.id}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === date.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                          <span>Pay KES {date.escrowAmountKes.toLocaleString()} via M-PESA STK</span>
                        </button>
                        <button
                          onClick={() => {
                            setScheduleModalDate(date);
                            setScheduleModalMode('reschedule');
                          }}
                          className="px-3 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs flex items-center gap-1"
                          title="Reschedule Date Meeting"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelDate(date)}
                          disabled={actionLoadingId === date.id}
                          className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ACCEPTED: Companion view - waiting for escrow deposit, can reschedule or cancel */}
                  {date.status === 'ACCEPTED' && !date.isInviter && (
                    <div className="space-y-2">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>You accepted this date! Awaiting client escrow deposit.</span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {date.partner.phone && (
                          <a
                            href={`tel:${date.partner.phone}`}
                            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs flex items-center gap-1.5 shrink-0 transition font-bold"
                            title={`Call @${date.partner.username} directly on their phone`}
                            onClick={(e) => {
                              if (!confirm(`Call @${date.partner.username} directly via phone dialer (${date.partner.phone})? This will start a regular cellular phone call.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Call Phone</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setScheduleModalDate(date);
                            setScheduleModalMode('reschedule');
                          }}
                          className="flex-1 py-2 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs hover:bg-purple-600/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Reschedule Date</span>
                        </button>
                        <button
                          onClick={() => handleCancelDate(date)}
                          disabled={actionLoadingId === date.id}
                          className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 font-semibold text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ESCROW_FUNDED: In-person 6-digit meeting verification (Screen 9) */}
                  {date.status === 'ESCROW_FUNDED' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 flex flex-col items-center">
                          {/* Duolingo-style anime mascot centered directly over the View Code button */}
                          <DuolingoPointingMascot
                            isInviter={date.isInviter}
                            onClick={() => setSelectedDateForVerify(date)}
                          />
                          <button
                            onClick={() => setSelectedDateForVerify(date)}
                            className="w-full py-2.5 rounded-xl gradient-pink text-white font-bold text-xs shadow-md shadow-rose-500/20 hover:opacity-95 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{date.isInviter ? 'View 6-Digit Code' : 'Enter 6-Digit Code to Unlock Payout'}</span>
                          </button>
                        </div>
                        {date.partner.phone && (
                          <a
                            href={`tel:${date.partner.phone}`}
                            className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs flex items-center gap-1.5 shrink-0 transition font-bold"
                            title={`Call @${date.partner.username} directly on their phone`}
                            onClick={(e) => {
                              if (!confirm(`Call @${date.partner.username} directly via phone dialer (${date.partner.phone})? This will start a regular cellular phone call.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Call Phone</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setScheduleModalDate(date);
                            setScheduleModalMode('reschedule');
                          }}
                          className="px-3 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs flex items-center gap-1 shrink-0"
                          title="Reschedule Date Meeting"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancelDate(date)}
                          disabled={actionLoadingId === date.id}
                          className="px-3 py-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 text-xs shrink-0"
                          title="Cancel & Refund Escrow"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CANCELLATION_REQUESTED State: Mutual approval required to prevent scamming */}
                  {date.status === 'CANCELLATION_REQUESTED' && (
                    <div className="space-y-2 pt-1">
                      {date.cancellationRequestedById === user?.id ? (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-200">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Cancellation Requested (Pending Confirmation)</span>
                          </div>
                          <p className="text-[11px] text-amber-300/90 leading-relaxed">
                            You submitted a cancellation request for this booking. Because the date is within 2 hours or in progress, awaiting confirmation from @{date.partner.username}. Upon approval, funds can take up to 72 hrs for reimbursement to the number that paid.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Cancellation Request from @{date.partner.username}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            @{date.partner.username} requested to cancel this date
                            {date.cancellationReason ? ` (Reason: "${date.cancellationReason}")` : ''}.
                            If the date did not happen, click Approve to refund escrow. Funds can take up to 72 hrs for reimbursement to the number that paid. If you are already at the venue or this cancellation is fraudulent, click Decline to dispute.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => handleCancelResponse(date, 'APPROVE')}
                              disabled={actionLoadingId === date.id}
                              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Refund</span>
                            </button>
                            <button
                              onClick={() => handleCancelResponse(date, 'REJECT')}
                              disabled={actionLoadingId === date.id}
                              className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Decline & Dispute</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CANCELLED State */}
                  {date.status === 'CANCELLED' && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-2xl bg-gray-800/60 border border-gray-700/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-rose-400">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Date Cancelled</span>
                          </span>

                          {/* Dynamic Refund Badge */}
                          {date.refundStatus === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              KES {date.escrowAmountKes.toLocaleString()} Refunded
                            </span>
                          ) : date.refundStatus === 'QUEUED' || (date.wasEscrowFunded && date.escrowAmountKes > 0) ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              KES {date.escrowAmountKes.toLocaleString()} Refund Queued
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px] font-medium">
                              Unfunded (No Deposit)
                            </span>
                          )}
                        </div>

                        {/* Refund Details */}
                        {date.refundStatus === 'COMPLETED' ? (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-0.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span>Reimbursement Successful</span>
                              {date.refundReceipt && (
                                <span className="font-mono text-[10px] text-emerald-400">
                                  Ref: {date.refundReceipt}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-emerald-300/80 leading-tight">
                              KES {date.escrowAmountKes.toLocaleString()} was successfully refunded to your wallet / M-PESA number.
                            </p>
                          </div>
                        ) : date.refundStatus === 'QUEUED' || (date.wasEscrowFunded && date.escrowAmountKes > 0) ? (
                          <p className="text-[11px] text-amber-300/80 leading-relaxed font-medium">
                            Notice: Funds can take up to 72 hrs for reimbursement to the number that paid.
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            Invitation was cancelled before escrow funds were deposited.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRebookClick(date)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rebook Date with @{date.partner.username}</span>
                      </button>
                    </div>
                  )}

                  {/* DECLINED State */}
                  {date.status === 'DECLINED' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-between text-gray-400 text-xs">
                        <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Date Declined</span>
                        </span>
                      </div>
                      <button
                        onClick={() => handleRebookClick(date)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rebook Date with @{date.partner.username}</span>
                      </button>
                    </div>
                  )}

                  {/* DISPUTED State: Escrow frozen under Admin review */}
                  {date.status === 'DISPUTED' && (
                    <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-purple-200">
                        <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Dispute Under Admin Review</span>
                      </div>
                      <p className="text-[11px] text-purple-300/90 leading-relaxed">
                        This meeting was contested. Escrow funds (KES {date.escrowAmountKes.toLocaleString()}) are securely frozen while an administrator reviews chat logs and evidence.
                      </p>
                    </div>
                  )}

                  {/* COMPLETED State */}
                  {date.status === 'COMPLETED' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-400 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Meeting Verified
                        </span>
                        <span className="text-[11px] font-bold text-emerald-300">Payment Released</span>
                      </div>
                      <button
                        onClick={() => handleRebookClick(date)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rebook Date with @{date.partner.username}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Screen 9 6-Digit Meeting Code Modal */}
      {selectedDateForVerify && (
        <MeetingVerificationModal
          isOpen={!!selectedDateForVerify}
          dateItem={selectedDateForVerify}
          onClose={() => setSelectedDateForVerify(null)}
          onVerified={() => {
            fetchDates();
            if (onOpenWallet) onOpenWallet();
          }}
        />
      )}

      {/* Screen 8 Date Invite Modal (Rebooking past date or new date) */}
      <CreateDateInviteModal
        isOpen={isCreateModalOpen}
        partner={rebookPartner}
        initialValues={rebookInitialValues}
        onClose={() => {
          setIsCreateModalOpen(false);
          setRebookPartner(null);
          setRebookInitialValues(null);
        }}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setRebookPartner(null);
          setRebookInitialValues(null);
          fetchDates();
          refreshActiveDatesCount();
          setActiveTab('active');
        }}
      />

      {/* Direct Safaricom M-PESA STK Escrow Payment Sheet */}
      {payingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-sm my-6 bg-[#111622] rounded-3xl border border-gray-800 p-5 shadow-2xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={
                    payingDate.partner.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
                  }
                  alt={payingDate.partner.displayName}
                  className="w-9 h-9 rounded-full object-cover border border-rose-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-bold text-xs text-white truncate block">
                    {payingDate.partner.displayName}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate block">
                    {payingDate.locationName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                  KES {payingDate.escrowAmountKes.toLocaleString()}
                </span>
                <button
                  onClick={() => setPayingDate(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {payingSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white">Escrow Funded</h4>
                <p className="text-xs text-gray-400">
                  KES {payingDate.escrowAmountKes.toLocaleString()} is locked in safe escrow. Meeting code unlocked!
                </p>
              </div>
            ) : payingWaitingPin ? (
              <div className="py-6 text-center space-y-4">
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative z-10 text-emerald-400">
                    <Smartphone className="w-7 h-7" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">Check Your Phone</h4>
                  <p className="text-xs text-gray-300">
                    STK prompt sent to <span className="font-bold text-emerald-400">{payingPhone}</span>
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Enter your M-PESA PIN to lock KES {payingDate.escrowAmountKes.toLocaleString()} into escrow.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>
                    {payingIsTimedOut
                      ? 'Awaiting Safaricom confirmation...'
                      : `Waiting for PIN confirmation... (${payingElapsedSeconds}s / 120s)`}
                  </span>
                </div>

                {/* Instant Check Now Button */}
                <button
                  type="button"
                  onClick={handleManualCheckPaying}
                  disabled={isManualCheckingPayment}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                >
                  {isManualCheckingPayment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>I've Entered My PIN — Check Status Now</span>
                </button>

                {payingIsTimedOut && (
                  <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mt-2 text-center">
                    If you entered your PIN, tap 'Check Status Now' above to confirm your payment without refreshing.
                  </p>
                )}

                <button
                  onClick={() => {
                    if (payingIntervalRef.current) clearInterval(payingIntervalRef.current);
                    setPayingWaitingPin(false);
                    setPayingDate(null);
                    fetchDates();
                  }}
                  className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition cursor-pointer mt-2"
                >
                  Dismiss & Check Later
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMpesaStk} className="mt-3.5 space-y-3">
                {/* Phone Input */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-emerald-400" /> M-PESA Phone Number
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Instant STK</span>
                  </label>
                  <input
                    type="tel"
                    value={payingPhone}
                    onChange={(e) => setPayingPhone(e.target.value)}
                    placeholder="07XXXXXXXX or 01XXXXXXXX"
                    required
                    className="w-full bg-[#161B26] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-wider focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Subtle Escrow Notice */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Held safely in escrow until in-person verification.</span>
                </div>

                {payingError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400 p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{payingError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={payingLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {payingLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Prompt...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Pay KES {payingDate.escrowAmountKes.toLocaleString()} via M-PESA</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Companion & Client Scheduling / Rescheduling Modal */}
      {scheduleModalDate && (
        <ScheduleDateModal
          isOpen={!!scheduleModalDate}
          onClose={() => setScheduleModalDate(null)}
          dateItem={scheduleModalDate}
          mode={scheduleModalMode}
          existingDates={dates}
          onSuccess={() => fetchDates()}
        />
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Eye,
  Sparkles,
  Loader2,
  AlertCircle,
  PlusCircle,
  Flame,
  Clock,
  ShieldAlert,
  X,
  Send,
  Smartphone,
  CheckCircle2,
  Film,
  Video,
  Play,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isVideoMedia } from '@/utils/media';
import { formatVideoDuration } from '@/utils/duration';

interface LockedMediaProps {
  messageId: string;
  isMine: boolean;
  lockedMedia: {
    id: string;
    previewUrl: string;
    fullMediaUrl?: string | null;
    priceKes: number;
    title?: string | null;
    isUnlocked: boolean;
    isViewOnce?: boolean;
    durationSeconds?: number;
    viewStatus?: string; // PENDING, OPENED, BURNED
  };
  onUnlocked?: (fullMediaUrl: string) => void;
  onOpenDeposit?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export function LockedMediaBubble({
  messageId,
  isMine,
  lockedMedia,
  onUnlocked,
  onOpenDeposit,
  onStatusChange,
}: LockedMediaProps) {
  const { user, refreshUser } = useAuth();
  const [unlocked, setUnlocked] = useState(lockedMedia.isUnlocked || isMine);
  const [fullUrl, setFullUrl] = useState<string | null>(lockedMedia.fullMediaUrl || null);
  const [viewStatus, setViewStatus] = useState<string>(lockedMedia.viewStatus || 'PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stkNotice, setStkNotice] = useState<string | null>(null);
  const [isPollingMpesa, setIsPollingMpesa] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  // Ephemeral view-once viewing state
  const [isViewing, setIsViewing] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(lockedMedia.durationSeconds || 10);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize prop changes
  useEffect(() => {
    setUnlocked(lockedMedia.isUnlocked || isMine);
    if (lockedMedia.fullMediaUrl) {
      setFullUrl(lockedMedia.fullMediaUrl);
    }
    if (lockedMedia.viewStatus) {
      setViewStatus(lockedMedia.viewStatus);
    }
  }, [lockedMedia.isUnlocked, isMine, lockedMedia.fullMediaUrl, lockedMedia.viewStatus]);

  // Synchronize user phone changes
  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  // Clean up timer and polling on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Comprehensive Screenshot & Capture Defense (Blur, Visibility, Print, Keystrokes)
  useEffect(() => {
    if (!isViewing && !unlocked) return;

    const triggerBlackout = (e?: Event) => {
      if (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}
      }
      setIsBlackedOut(true);
      if (lockedMedia.isViewOnce && isViewing && !isMine) {
        handleRecipientBurn();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Windows / Linux PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        triggerBlackout(e);
        return;
      }

      // 2. Mac & Windows screenshot shortcuts: Any Cmd + Shift combo (Mac shortcut prefix for 3, 4, 5, 6) or Windows Win/Ctrl + Shift
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey || e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        triggerBlackout(e);
        return;
      }

      // 3. Shift pressed first then Meta/Ctrl pressed
      if (e.shiftKey && (e.metaKey || e.ctrlKey || e.key === 'Meta' || e.key === 'Control' || e.code === 'MetaLeft' || e.code === 'MetaRight')) {
        triggerBlackout(e);
        return;
      }

      // 4. Print dialog capture: Cmd/Ctrl + P
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        triggerBlackout(e);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        ((e.metaKey || e.ctrlKey) && (e.shiftKey || e.key === 'Shift')) ||
        (e.shiftKey && (e.metaKey || e.ctrlKey))
      ) {
        triggerBlackout(e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerBlackout();
      }
    };

    const handleBlur = () => {
      // When OS screenshot tool activates or window loses focus
      triggerBlackout();
    };

    const handleMouseLeave = () => {
      // When mouse leaves browser viewport
      triggerBlackout();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('beforeprint', triggerBlackout);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('beforeprint', triggerBlackout);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isViewing, isMine, unlocked, lockedMedia.isViewOnce]);

  const walletBalance = user?.wallet?.balanceKes || 0;
  const isInsufficient = !isMine && !unlocked && walletBalance < lockedMedia.priceKes;
  const isBurned = lockedMedia.isViewOnce && viewStatus === 'BURNED';

  // Handle financial unlock
  const handleUnlock = async () => {
    if (unlocked || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/messages/${messageId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.code === 'INSUFFICIENT_FUNDS') {
          setError(
            `Insufficient balance (KES ${walletBalance}). You need KES ${lockedMedia.priceKes} to unlock.`
          );
        } else {
          setError(data.error || 'Failed to unlock media');
        }
        return;
      }

      setUnlocked(true);
      setFullUrl(data.data.fullMediaUrl);
      if (data.data.viewStatus) {
        setViewStatus(data.data.viewStatus);
      }
      if (onUnlocked) {
        onUnlocked(data.data.fullMediaUrl);
      }

      // Refresh global wallet balance
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to unlock media:', err);
      setError(err.message || 'Error processing unlock payment');
    } finally {
      setLoading(false);
    }
  };

  const startMpesaPolling = (checkoutReqId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setIsPollingMpesa(true);
    let attempts = 0;
    const maxAttempts = 60; // 60 * 2s = 120 seconds timeout

    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsPollingMpesa(false);
        setStkNotice(null);
        setError('M-PESA prompt verification timed out. If you entered your PIN, the image will unlock automatically.');
        return;
      }

      try {
        const res = await fetch(
          `/api/v1/messages/${messageId}/mpesa-status?checkoutRequestId=${encodeURIComponent(checkoutReqId)}`
        );
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.isUnlocked && statusData.fullMediaUrl) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsPollingMpesa(false);
            setStkNotice(null);
            setUnlocked(true);
            setFullUrl(statusData.fullMediaUrl);
            if (statusData.viewStatus) {
              setViewStatus(statusData.viewStatus);
            }
            if (onUnlocked) {
              onUnlocked(statusData.fullMediaUrl);
            }
            await refreshUser();
          } else if (statusData.failed) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsPollingMpesa(false);
            setStkNotice(null);
            setError(statusData.failureReason || 'M-PESA payment failed or cancelled');
          }
        }
      } catch (pollErr) {
        console.warn('Error polling message M-PESA status:', pollErr);
      }
    }, 2000);
  };

  const handleUnlockMpesa = async () => {
    if (unlocked || loading || isPollingMpesa) return;
    setError(null);
    setStkNotice(null);

    const targetPhone = (phone || user?.phone || '').trim();
    if (!targetPhone) {
      setShowPhoneInput(true);
      setError('Please enter your Safaricom M-PESA number to receive the prompt.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/v1/messages/${messageId}/unlock-mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch M-PESA STK prompt');
      }

      const checkoutReqId = data.data?.checkoutRequestId;
      setStkNotice(
        `M-PESA prompt dispatched to ${targetPhone}! Enter your PIN on your phone to unlock this photo.`
      );

      if (checkoutReqId) {
        startMpesaPolling(checkoutReqId);
      }
    } catch (err: any) {
      setError(err.message || 'Error triggering M-PESA unlock prompt');
    } finally {
      setLoading(false);
    }
  };

  // Open photo viewer
  const handleOpenViewer = async () => {
    if (isBurned || loading) return;

    // If it's a regular unlocked photo (not view-once), open directly
    if (!lockedMedia.isViewOnce) {
      setIsViewing(true);
      return;
    }

    // View-once handling:
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/messages/${messageId}/view-once-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setViewStatus('BURNED');
          setFullUrl(null);
          if (onStatusChange) onStatusChange('BURNED');
        }
        throw new Error(data.error || 'Failed to open photo');
      }

      setFullUrl(data.data.mediaUrl);
      setIsViewing(true);

      // Senders viewing their own sent view-once photo don't start countdown
      if (isMine) return;

      // Recipient countdown
      setViewStatus('OPENED');
      const totalSeconds = data.data.durationSeconds || lockedMedia.durationSeconds || 10;
      setRemainingTime(totalSeconds);
      if (onStatusChange) onStatusChange('OPENED');

      let timeLeft = totalSeconds;
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setRemainingTime(timeLeft);
        if (timeLeft <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleRecipientBurn();
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error opening view-once photo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientBurn = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsViewing(false);
    setViewStatus('BURNED');
    setFullUrl(null);
    if (onStatusChange) onStatusChange('BURNED');

    try {
      await fetch(`/api/v1/messages/${messageId}/view-once-burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Error burning locked view-once media:', err);
    }
  };

  const isVideo = isVideoMedia(lockedMedia.previewUrl || lockedMedia.fullMediaUrl);

  return (
    <div className="w-full max-w-xs rounded-2xl overflow-hidden bg-[#1E2533] border border-gray-700/60 shadow-lg my-1 select-none">
      {/* Media Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        {!isBlackedOut ? (
          isVideo ? (
            <video
              src={unlocked && fullUrl && !isBurned ? fullUrl : lockedMedia.previewUrl}
              preload="metadata"
              onLoadedMetadata={(e) => {
                if (e.currentTarget.duration) {
                  setVideoDuration(Math.round(e.currentTarget.duration));
                }
              }}
              muted
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              className={`w-full h-full object-cover object-top transition-all duration-300 pointer-events-none select-none ${
                unlocked && !isBurned && !lockedMedia.isViewOnce
                  ? 'filter-none cursor-pointer'
                  : 'blur-xl scale-105'
              }`}
              onClick={() => unlocked && !isBurned && handleOpenViewer()}
            />
          ) : (
            <img
              src={unlocked && fullUrl && !isBurned ? fullUrl : lockedMedia.previewUrl}
              alt={lockedMedia.title || 'Locked media preview'}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              className={`w-full h-full object-cover object-top transition-all duration-300 pointer-events-none select-none ${
                unlocked && !isBurned && !lockedMedia.isViewOnce
                  ? 'filter-none cursor-pointer'
                  : 'blur-xl scale-105'
              }`}
              onClick={() => unlocked && !isBurned && handleOpenViewer()}
            />
          )
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center select-none" />
        )}

        {/* Video Duration Badge on Top of Blurred Screen */}
        {!unlocked && isVideo && (
          <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1 shadow-md border border-white/20 select-none animate-fade-in">
            <Play className="w-2.5 h-2.5 fill-white text-white" />
            <span>{formatVideoDuration(videoDuration || lockedMedia.durationSeconds)}</span>
          </div>
        )}

        {/* In-bubble Blackout overlay for screenshot prevention on unlocked media */}
        {isBlackedOut && unlocked && !lockedMedia.isViewOnce && (
          <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-4 text-center select-none animate-fade-in">
            <ShieldAlert className="w-8 h-8 text-rose-500 mb-1.5 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Screenshot Blocked</span>
            <span className="text-[10px] text-gray-400 mt-0.5">Screen capture prohibited</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBlackedOut(false);
              }}
              className="mt-2.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-200 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* State A: Locked (Not Purchased Yet) */}
        {!unlocked && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <div className="w-10 h-10 rounded-full gradient-pink flex items-center justify-center text-white shadow-lg shadow-rose-500/30 mb-2">
              <Lock className="w-5 h-5" />
            </div>

            <span className="text-xs font-bold text-white tracking-wide uppercase truncate max-w-[200px]">
              {lockedMedia.title || 'Exclusive Media'}
            </span>

            {/* Price, Video Duration & View-Once badge */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap justify-center">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                KES {lockedMedia.priceKes}
              </span>
              {isVideo && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                  <Film className="w-3 h-3 text-cyan-300" />
                  <span>Video ({formatVideoDuration(videoDuration || lockedMedia.durationSeconds)})</span>
                </span>
              )}
              {lockedMedia.isViewOnce && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  <span>View Once ({lockedMedia.durationSeconds || 10}s)</span>
                </span>
              )}
            </div>

            <span className="text-[10px] text-gray-400 mt-1">
              Wallet: KES {walletBalance}
            </span>

            {/* Safaricom Phone Input / Unlock Button Flow */}
            {isPollingMpesa ? (
              <div className="mt-2.5 w-full p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex flex-col items-center gap-1.5 animate-pulse">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Listening for M-PESA PIN...</span>
                </div>
                <span className="text-[10px] text-emerald-300/80 text-center leading-tight">
                  Prompt sent to {phone || user?.phone || 'handset'} • Enter PIN on handset
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setIsPollingMpesa(false);
                    setStkNotice(null);
                  }}
                  className="mt-0.5 text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                >
                  Cancel waiting
                </button>
              </div>
            ) : showPhoneInput ? (
              /* Phone text field revealed upon clicking the Unlock button */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUnlockMpesa();
                }}
                className="w-full mt-2.5 px-0.5 animate-fade-in flex flex-col items-center"
              >
                <div className="relative w-full flex items-center">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="tel"
                    autoFocus
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="07XXXXXXXX or +254..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#121721] border border-emerald-500/40 focus:border-emerald-400 text-xs text-white placeholder-gray-500 outline-none text-left transition-colors"
                  />
                </div>

                <div className="mt-2 flex items-center gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhoneInput(false);
                      setError(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-300 font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending STK...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Send KES {lockedMedia.priceKes} STK</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Clean Minimalist Unlock Button shown initially */
              <div className="flex flex-col items-center w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhoneInput(true);
                    setError(null);
                  }}
                  disabled={loading}
                  className="mt-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Unlock via M-PESA STK (KES {lockedMedia.priceKes})</span>
                </button>

                {walletBalance >= lockedMedia.priceKes && (
                  <button
                    type="button"
                    onClick={handleUnlock}
                    disabled={loading}
                    className="mt-1.5 text-[10px] text-gray-400 hover:text-emerald-400 underline cursor-pointer"
                  >
                    Or unlock with wallet (KES {lockedMedia.priceKes})
                  </button>
                )}
              </div>
            )}

            {stkNotice && !isPollingMpesa && (
              <div className="mt-2 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1.5 animate-fade-in text-left">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{stkNotice}</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-1 text-[10px] text-rose-400 mt-2 px-1">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State B: Unlocked and Burned */}
        {unlocked && isBurned && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-800 text-rose-400 flex items-center justify-center mb-2 shadow-inner">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Unlocked & Burned</span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {isMine ? 'Viewed and burned by recipient' : 'Your one-time view expired and was destroyed'}
            </span>
          </div>
        )}

        {/* State C: Unlocked and Ready to View Once */}
        {unlocked && lockedMedia.isViewOnce && !isBurned && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <div className="w-10 h-10 rounded-full gradient-pink flex items-center justify-center text-white mb-2 shadow-lg shadow-rose-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">
              {isMine ? 'Sent View-Once Photo' : 'Unlocked • Ready to View'}
            </span>
            <span className="text-[10px] text-rose-200 mt-0.5">
              {isMine
                ? 'Sender Preview Available'
                : `1-time view (${lockedMedia.durationSeconds || 10} seconds)`}
            </span>

            <button
              onClick={handleOpenViewer}
              disabled={loading}
              className="mt-2.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{isMine ? 'Preview Photo' : 'Start 1-Time View'}</span>
            </button>
          </div>
        )}

        {/* Top Badges */}
        {unlocked && !lockedMedia.isViewOnce && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm">
            <Unlock className="w-3 h-3" />
            <span>Unlocked</span>
          </div>
        )}

        {isVideo && unlocked && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1 shadow-sm border border-white/20">
            <Film className="w-3 h-3 text-amber-400" />
            <span>Video ({formatVideoDuration(videoDuration || lockedMedia.durationSeconds)})</span>
          </div>
        )}

        {lockedMedia.isViewOnce && !isBurned && !unlocked && (
          <div className={`absolute top-2 ${isVideoMedia(lockedMedia.previewUrl || lockedMedia.fullMediaUrl) ? 'left-18' : 'left-2'} px-2 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1 shadow-sm`}>
            <Flame className="w-3 h-3" />
            <span>View Once</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 flex items-center justify-between text-xs bg-[#1A202C]">
        <div className="flex flex-col min-w-0 pr-2">
          <span className="font-semibold text-gray-200 text-xs truncate max-w-[170px]">
            {lockedMedia.title || 'Private Media Item'}
          </span>
          <span className="text-[10px] text-gray-400">
            {isMine
              ? `You charge KES ${lockedMedia.priceKes}${lockedMedia.isViewOnce ? ' (View Once)' : ''}`
              : isBurned
              ? 'Permanently destroyed'
              : unlocked
              ? lockedMedia.isViewOnce
                ? 'Unlocked • 1-time ephemeral glance'
                : 'Unlocked & Paid'
              : `KES ${lockedMedia.priceKes} • ${lockedMedia.isViewOnce ? 'Burns after view' : 'Permanent access'}`}
          </span>
        </div>

        {unlocked && !isBurned && (
          <button
            onClick={handleOpenViewer}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer flex-shrink-0"
            title={lockedMedia.isViewOnce ? 'View once' : 'Expand photo'}
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Fullscreen Ephemeral / Regular Viewer Modal */}
      {isViewing && fullUrl && (
        <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-between p-4 animate-fade-in select-none">
          {/* Blackout overlay for recipient screenshot deterrent */}
          {!isMine && isBlackedOut && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-3 animate-pulse" />
              <h4 className="text-white font-extrabold text-base tracking-wide uppercase">
                Screenshot Blocked
              </h4>
              <p className="text-xs text-rose-300/80 mt-1 max-w-xs leading-relaxed">
                {lockedMedia.isViewOnce
                  ? 'Screen capture is strictly prohibited. Ephemeral media has been permanently destroyed.'
                  : 'Screen capture is strictly prohibited on exclusive paid creator media.'}
              </p>
              {!lockedMedia.isViewOnce && (
                <button
                  type="button"
                  onClick={() => setIsBlackedOut(false)}
                  className="mt-5 px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white border border-gray-700 transition cursor-pointer"
                >
                  Dismiss Blackout
                </button>
              )}
            </div>
          )}

          {/* Top Header */}
          <div className="w-full max-w-md pt-2">
            {lockedMedia.isViewOnce && !isMine ? (
              <>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full gradient-pink transition-all duration-1000 ease-linear rounded-full"
                    style={{
                      width: `${(remainingTime / (lockedMedia.durationSeconds || 10)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between px-2 text-white">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-mono font-bold">{remainingTime}s</span>
                  </div>

                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" /> Paid View Once
                  </span>

                  <button
                    onClick={handleRecipientBurn}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between px-2 py-1 text-white border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    {isMine ? <Send className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {lockedMedia.title || 'Unlocked Media'}
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      {isMine
                        ? 'Sender Preview'
                        : lockedMedia.isViewOnce
                        ? '1-Time View Photo'
                        : 'High Resolution Photo'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsViewing(false)}
                  className="px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-medium text-white transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Image with Hold-to-Reveal if View-Once */}
          <div
            onPointerDown={() => lockedMedia.isViewOnce && setIsHolding(true)}
            onPointerUp={() => lockedMedia.isViewOnce && setIsHolding(false)}
            onPointerCancel={() => lockedMedia.isViewOnce && setIsHolding(false)}
            onPointerLeave={() => lockedMedia.isViewOnce && setIsHolding(false)}
            className="relative flex-1 w-full max-w-md flex items-center justify-center p-2 my-auto overflow-hidden select-none cursor-pointer"
          >
            {/* Hold-to-reveal dark overlay for View-Once */}
            {lockedMedia.isViewOnce && !isHolding && !isBlackedOut && (
              <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-150">
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border-2 border-rose-500/60 flex items-center justify-center text-rose-400 mb-3 animate-pulse shadow-lg shadow-rose-500/20">
                  <Eye className="w-8 h-8" />
                </div>
                <h4 className="text-white font-extrabold text-sm tracking-wide">
                  Press & Hold to Reveal
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                  Screen recording & capture protected. Photo conceals instantly if you release the mouse or attempt a screenshot.
                </p>
                <div className="mt-3.5 px-3.5 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[10px] font-mono text-rose-300">
                  Hold mouse or finger down to view
                </div>
              </div>
            )}

            {!isBlackedOut && (
              <>
                {isVideoMedia(fullUrl) ? (
                  <video
                    src={fullUrl}
                    controls={!lockedMedia.isViewOnce}
                    autoPlay
                    loop
                    playsInline
                    className={`max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl select-none transition-all duration-150 ${
                      lockedMedia.isViewOnce
                        ? isHolding
                          ? 'filter-none scale-100 opacity-100'
                          : 'filter blur-2xl scale-95 opacity-0'
                        : 'filter-none'
                    }`}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <img
                    src={fullUrl}
                    alt="Unlocked media"
                    className={`max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl pointer-events-none select-none transition-all duration-150 ${
                      lockedMedia.isViewOnce
                        ? isHolding
                          ? 'filter-none scale-100 opacity-100'
                          : 'filter blur-2xl scale-95 opacity-0'
                        : 'filter-none'
                    }`}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                )}

                {/* Forensic Anti-Leak Dynamic Watermark */}
                <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-around overflow-hidden opacity-25 select-none">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="whitespace-nowrap text-[11px] font-mono font-bold text-white/50 transform -rotate-12 select-none tracking-widest text-center"
                    >
                      CONFIDENTIAL • @{user?.username || 'member'} • PROTECTED • {user?.id?.slice(0, 8)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bottom Security / Status Note */}
          <div className="w-full max-w-md pb-4 text-center">
            {lockedMedia.isViewOnce && !isMine ? (
              <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                This photo will be permanently destroyed when time expires.
              </p>
            ) : lockedMedia.isViewOnce && isMine ? (
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Protected: The recipient can only open and view this photo once.
              </p>
            ) : (
              <p className="text-[11px] text-gray-500">Unlocked and available in your private chat history.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

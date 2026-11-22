'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, Flame, Clock, ShieldAlert, X, Loader2, Send, Film } from 'lucide-react';
import { isVideoMedia } from '@/utils/media';

interface ViewOnceProps {
  messageId: string;
  isMine: boolean;
  viewOnceMedia: {
    id: string;
    mediaUrl?: string | null;
    status: string; // PENDING, OPENED, BURNED
    durationSeconds: number;
  };
  onStatusChange?: (newStatus: string) => void;
}

export function ViewOnceBubble({
  messageId,
  isMine,
  viewOnceMedia,
  onStatusChange,
}: ViewOnceProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>(viewOnceMedia.status);
  const [isViewing, setIsViewing] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(viewOnceMedia.mediaUrl || null);
  const [remainingTime, setRemainingTime] = useState<number>(viewOnceMedia.durationSeconds || 10);
  const [loading, setLoading] = useState(false);
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync prop changes
  useEffect(() => {
    setStatus(viewOnceMedia.status);
    if (viewOnceMedia.mediaUrl) {
      setMediaUrl(viewOnceMedia.mediaUrl);
    }
  }, [viewOnceMedia.status, viewOnceMedia.mediaUrl]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Comprehensive Screenshot & Capture Defense (Blur, Visibility, Print, Keystrokes)
  useEffect(() => {
    if (!isViewing) return;

    const triggerBlackout = (e?: Event) => {
      if (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {}
      }
      setIsBlackedOut(true);
      if (!isMine) {
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
  }, [isViewing, isMine]);

  const handleOpen = async () => {
    // If recipient and already burned, do nothing
    if (!isMine && status === 'BURNED') return;
    if (loading || isViewing) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/messages/${messageId}/view-once-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setStatus('BURNED');
          if (onStatusChange) onStatusChange('BURNED');
        }
        throw new Error(data.error || 'Failed to open photo');
      }

      setMediaUrl(data.data.mediaUrl);
      setIsViewing(true);

      if (isMine) {
        // Sender mode: do NOT start countdown, do NOT burn.
        return;
      }

      // Recipient mode: start countdown and transition status to OPENED
      setStatus('OPENED');
      const totalSeconds = data.data.durationSeconds || viewOnceMedia.durationSeconds || 10;
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
    } catch (err) {
      console.error('Error opening view-once media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientBurn = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsViewing(false);
    setStatus('BURNED');
    setMediaUrl(null);
    if (onStatusChange) onStatusChange('BURNED');

    try {
      await fetch(`/api/v1/messages/${messageId}/view-once-burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Error burning media on server:', err);
    }
  };

  const handleSenderClose = () => {
    setIsViewing(false);
  };

  const isBurned = status === 'BURNED';

  // Sender subtitle label based on recipient status
  const getSenderSubtitle = () => {
    if (status === 'BURNED') return 'Burned by recipient';
    if (status === 'OPENED') return 'Opened by recipient';
    return 'Delivered • Tap to preview';
  };

  return (
    <>
      <div
        onClick={handleOpen}
        className={`my-1 flex items-center gap-3 p-3 rounded-2xl border transition-all select-none ${
          !isMine && isBurned
            ? 'bg-gray-900/60 border-gray-800 text-gray-500 cursor-not-allowed'
            : isMine
            ? 'bg-[#1A2234] border-rose-500/30 text-white hover:border-rose-500/60 cursor-pointer shadow-sm'
            : 'bg-[#1E2533] border-rose-500/40 text-white hover:border-rose-500 hover:shadow-md hover:shadow-rose-500/10 cursor-pointer'
        }`}
      >
        {/* Status Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            !isMine && isBurned
              ? 'bg-gray-800 text-gray-500'
              : status === 'BURNED'
              ? 'bg-gray-800 text-rose-400'
              : 'gradient-pink text-white shadow-md shadow-rose-500/30'
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !isMine && isBurned ? (
            <Flame className="w-5 h-5" />
          ) : status === 'BURNED' ? (
            <Flame className="w-5 h-5 text-rose-400" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </div>

        {/* Content details */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-bold tracking-wide truncate ${
                !isMine && isBurned ? 'text-gray-500 line-through' : 'text-gray-100'
              }`}
            >
              {isVideoMedia(viewOnceMedia.mediaUrl) ? 'Video (View once)' : 'Photo (View once)'}
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
              {viewOnceMedia.durationSeconds || 10}s
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-0.5">
            {isMine
              ? getSenderSubtitle()
              : isBurned
              ? 'Opened and burned'
              : 'Tap to view once'}
          </span>
        </div>
      </div>

      {/* Fullscreen Viewer Modal */}
      {isViewing && mediaUrl && (
        <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-between p-4 animate-fade-in select-none">
          {/* Blackout overlay for recipient screenshot deterrent */}
          {!isMine && isBlackedOut && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-3 animate-pulse" />
              <h4 className="text-white font-extrabold text-base tracking-wide uppercase">
                Screenshot Blocked
              </h4>
              <p className="text-xs text-rose-300/80 mt-1 max-w-xs leading-relaxed">
                Screen capture is strictly prohibited. Ephemeral media has been permanently destroyed.
              </p>
            </div>
          )}

          {/* Top Header / Progress Bar */}
          <div className="w-full max-w-md pt-2">
            {!isMine ? (
              <>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full gradient-pink transition-all duration-1000 ease-linear rounded-full"
                    style={{
                      width: `${(remainingTime / (viewOnceMedia.durationSeconds || 10)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between px-2 text-white">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-mono font-bold">{remainingTime}s</span>
                  </div>

                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-rose-400" /> View Once
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
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Sent View-Once Photo</h4>
                    <p className="text-[10px] text-gray-400">Sender Preview • {getSenderSubtitle()}</p>
                  </div>
                </div>

                <button
                  onClick={handleSenderClose}
                  className="px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs font-medium text-white transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Photo Container with Press & Hold protection */}
          <div
            onPointerDown={() => setIsHolding(true)}
            onPointerUp={() => setIsHolding(false)}
            onPointerCancel={() => setIsHolding(false)}
            onPointerLeave={() => setIsHolding(false)}
            className="relative flex-1 w-full max-w-md flex items-center justify-center p-2 my-auto overflow-hidden select-none cursor-pointer"
          >
            {/* Hold-to-reveal dark overlay */}
            {!isHolding && !isBlackedOut && (
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
                {isVideoMedia(mediaUrl) ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    playsInline
                    controls={false}
                    className={`max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl select-none transition-all duration-150 ${
                      isHolding ? 'filter-none scale-100 opacity-100' : 'filter blur-2xl scale-95 opacity-0'
                    }`}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="View once media"
                    className={`max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl pointer-events-none select-none transition-all duration-150 ${
                      isHolding ? 'filter-none scale-100 opacity-100' : 'filter blur-2xl scale-95 opacity-0'
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
                      CONFIDENTIAL VIEW ONCE • @{user?.username || 'member'} • PROTECTED • {user?.id?.slice(0, 8)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bottom Security / Status Notice */}
          <div className="w-full max-w-md pb-4 text-center">
            {!isMine ? (
              <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                This photo will be permanently destroyed when time expires.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Protected: The recipient can only open and view this photo once.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

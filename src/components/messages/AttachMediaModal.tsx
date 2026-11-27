'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Eye,
  Send,
  Flame,
  Film,
  Sparkles,
  Loader2,
  AlertCircle,
  Coins,
  Play,
} from 'lucide-react';
import { DeviceImagePicker } from '@/components/common/DeviceImagePicker';
import { isVideoMedia } from '@/utils/media';
import { formatVideoDuration, getVideoDuration } from '@/utils/duration';

interface AttachMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: any) => Promise<void>;
}

type AttachmentMode = 'regular' | 'locked' | 'view_once';

const QUICK_PRICES = [50, 100, 250, 500, 1000];
const QUICK_DURATIONS = [5, 10, 15, 30];

export function AttachMediaModal({ isOpen, onClose, onSend }: AttachMediaModalProps) {
  const [mode, setMode] = useState<AttachmentMode>('regular');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [priceKes, setPriceKes] = useState(100);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [lockedIsViewOnce, setLockedIsViewOnce] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setMediaUrl('');
    setCaption('');
    setVideoDuration(null);
    setError(null);
    onClose();
  };

  const isVideo = isVideoMedia(mediaUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      setError('Please select a photo or video first');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'regular') {
        await onSend({
          type: isVideo ? 'VIDEO' : 'IMAGE',
          mediaUrl,
          content: caption.trim() || undefined,
        });
      } else if (mode === 'locked') {
        await onSend({
          type: 'LOCKED_MEDIA',
          content: caption.trim() || undefined,
          lockedMedia: {
            title: isVideo ? 'Exclusive Video Clip' : 'Exclusive Photo',
            previewUrl: mediaUrl,
            fullMediaUrl: mediaUrl,
            priceKes: Math.max(10, Number(priceKes) || 100),
            isViewOnce: lockedIsViewOnce,
            durationSeconds: videoDuration || Number(durationSeconds) || 10,
          },
        });
      } else if (mode === 'view_once') {
        await onSend({
          type: 'VIEW_ONCE_MEDIA',
          content: caption.trim() || undefined,
          viewOnceMedia: {
            mediaUrl,
            durationSeconds: Number(durationSeconds) || 10,
          },
        });
      }
      handleReset();
    } catch (err: any) {
      setError(err?.message || 'Failed to send attachment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-auto bg-[#111622] rounded-t-3xl sm:rounded-3xl border border-gray-800 p-4 sm:p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">Send Media</h3>
              <p className="text-[10px] text-gray-400">Share photo, video, or locked moment</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Mode Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#182030] rounded-2xl my-3 border border-gray-800/60">
          <button
            type="button"
            onClick={() => setMode('regular')}
            className={`py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'regular'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Regular</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('locked')}
            className={`py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'locked'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Locked</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('view_once')}
            className={`py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'view_once'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>View Once</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Shared Media Picker (Compact Landscape) */}
          <div>
            <DeviceImagePicker
              value={mediaUrl}
              onChange={(url) => {
                setMediaUrl(url);
                setError(null);
                if (url && isVideoMedia(url)) {
                  getVideoDuration(url).then((dur) => {
                    if (dur > 0) {
                      setVideoDuration(dur);
                      setDurationSeconds(dur);
                    }
                  });
                } else {
                  setVideoDuration(null);
                }
              }}
              onUploadingChange={setIsUploading}
              folder="messages"
              aspectRatio="landscape"
              acceptVideo={true}
              label="Select Photo or Video"
            />
          </div>

          {/* Contextual Mode Settings */}
          {mode === 'locked' && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-[#161D2A] border border-gray-800/80 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> Unlock Price
                </span>
                <div className="relative flex items-center w-28">
                  <span className="absolute left-2.5 text-[10px] font-mono text-gray-400 font-bold">KES</span>
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    value={priceKes}
                    onChange={(e) => setPriceKes(Number(e.target.value))}
                    className="w-full pl-9 pr-2 py-1 rounded-xl bg-[#10141D] border border-gray-700 text-xs font-bold text-amber-300 text-right focus:border-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Quick Price Pills */}
              <div className="flex gap-1.5">
                {QUICK_PRICES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceKes(p)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      priceKes === p
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-[#10141D] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Creator Earnings Breakdown */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                <span className="text-emerald-400 font-semibold">You earn: KES {Math.round(priceKes * 0.8).toLocaleString()} (80%)</span>
                <span>Platform fee: KES {Math.round(priceKes * 0.2).toLocaleString()} (20%)</span>
              </div>

              {/* Video Duration Badge */}
              {isVideo && (
                <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-medium">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Play className="w-3 h-3 fill-cyan-300" /> Video Duration
                  </span>
                  <span className="font-mono font-bold text-xs">{formatVideoDuration(videoDuration || durationSeconds)}</span>
                </div>
              )}

              {/* Ephemeral toggle */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" /> Burn after 1-time view
                </span>
                <input
                  type="checkbox"
                  checked={lockedIsViewOnce}
                  onChange={(e) => setLockedIsViewOnce(e.target.checked)}
                  className="w-4 h-4 accent-[#F43F5E] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {mode === 'view_once' && (
            <div className="space-y-2 p-3 rounded-2xl bg-[#161D2A] border border-gray-800/80 animate-fade-in">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> Burn Countdown Timer
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_DURATIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDurationSeconds(sec)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      durationSeconds === sec
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-[#10141D] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clean Caption Input */}
          <div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                mode === 'locked'
                  ? 'Note for recipient (optional)...'
                  : mode === 'view_once'
                  ? 'One-time glance note (optional)...'
                  : 'Add a message or caption (optional)...'
              }
              className="w-full bg-[#182030] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {/* Action Send Button */}
          <button
            type="submit"
            disabled={submitting || isUploading || !mediaUrl}
            className="w-full py-2.5 rounded-2xl gradient-pink text-white text-xs font-bold shadow-lg shadow-rose-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:brightness-100"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading {isVideo ? 'Video' : 'Photo'}...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>
                  {mode === 'locked'
                    ? `Send Locked Media • KES ${priceKes}`
                    : mode === 'view_once'
                    ? `Send View Once • ${durationSeconds}s`
                    : `Send ${isVideo ? 'Video' : 'Photo'}`}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  MapPin,
  Sparkles,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Lock,
  Unlock,
  Video,
  Image as ImageIcon,
  UploadCloud,
  Clock,
  Flame,
} from 'lucide-react';
import { uploadMediaFile } from '@/utils/upload';
import { formatDuration } from '@/utils/duration';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState(user?.profile?.locationCity || 'Nairobi, Kenya');

  useEffect(() => {
    if (isOpen && user?.profile?.locationCity) {
      setLocationName(user.profile.locationCity);
    }
  }, [isOpen, user?.profile?.locationCity]);
  const [isLocked, setIsLocked] = useState(false);
  const [priceKes, setPriceKes] = useState(50);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0); // 0 = permanent / forever
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationVal, setCustomDurationVal] = useState(15);
  const [customDurationUnit, setCustomDurationUnit] = useState<'MINUTES' | 'HOURS'>('MINUTES');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      setError('Please choose a valid photo (JPEG, PNG, WebP) or video (MP4, WebM)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25MB');
      return;
    }

    setError(null);
    setIsUploading(true);
    setMediaType(isVideo ? 'VIDEO' : 'IMAGE');

    // Instant local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const res = await uploadMediaFile(file, 'posts');
      if (res.success && res.publicUrl) {
        setMediaUrl(res.publicUrl);
      } else {
        setError(res.error || 'Failed to upload media. Please try again.');
        setMediaUrl('');
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Upload error');
      setMediaUrl('');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      setError('Please wait until media upload completes');
      return;
    }
    if (!mediaUrl.trim() || mediaUrl.startsWith('blob:')) {
      setError('Please select or upload media to publish');
      return;
    }

    if (isLocked && (!priceKes || priceKes < 1)) {
      setError('Please enter a valid unlock price of at least KES 1');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: caption.trim() || undefined,
          locationName: locationName.trim() || undefined,
          isLocked,
          priceKes: isLocked ? Math.round(Number(priceKes)) : 0,
          isViewOnce,
          durationSeconds: durationSeconds ? Math.round(Number(durationSeconds)) : 0,
          media: [
            {
              mediaUrl: mediaUrl.trim(),
              mediaType,
              orderIndex: 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const detailMsg = data?.details?.[0]?.message;
        throw new Error(detailMsg || data.error || 'Failed to publish moment');
      }

      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto select-none">
      <div className="relative w-full max-w-md my-6 bg-[#0E121B] text-white rounded-[28px] border border-white/10 shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Upload Moment</h3>
              <p className="text-[10px] text-slate-400">Share photo or video with the community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1 text-[11px] leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />

          {/* Media Dropzone or Preview */}
          {!mediaUrl && !previewUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative w-full aspect-[16/10] rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center p-5 text-center cursor-pointer ${
                isDragOver
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
                  <span className="text-xs font-semibold text-white">Uploading media...</span>
                  <span className="text-[10px] text-slate-400">Processing to high-speed storage</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Drop photo or video, or browse</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP, MP4 up to 25MB</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-medium text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-rose-400" /> Photo
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-medium text-slate-300 flex items-center gap-1">
                      <Video className="w-3 h-3 text-cyan-400" /> Video
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-black border border-white/10 group">
              {mediaType === 'VIDEO' ? (
                <video
                  src={previewUrl || mediaUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted
                  className={`w-full h-full object-cover object-top ${isLocked ? 'filter blur-sm scale-105' : ''}`}
                />
              ) : (
                <img
                  src={previewUrl || mediaUrl}
                  alt="Selected Moment"
                  className={`w-full h-full object-cover object-top ${isLocked ? 'filter blur-sm scale-105' : ''}`}
                />
              )}

              {/* Status & Change Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-auto">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white flex items-center gap-1">
                  {mediaType === 'VIDEO' ? (
                    <>
                      <Video className="w-3 h-3 text-cyan-400" /> Video
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3 text-rose-400" /> Photo
                    </>
                  )}
                </span>
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-md text-[10px] font-extrabold text-white flex items-center gap-1">
                    <Lock className="w-3 h-3" /> KES {priceKes}
                  </span>
                )}
                {(isViewOnce || durationSeconds > 0) && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/80 backdrop-blur-md text-[10px] font-extrabold text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {durationSeconds}s
                  </span>
                )}
              </div>

              <div className="absolute top-2.5 right-2.5 pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white transition cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl('');
                    setPreviewUrl(null);
                  }}
                  className="w-6 h-6 rounded-full bg-black/60 hover:bg-rose-500/80 backdrop-blur-md border border-white/10 text-white transition cursor-pointer flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                  <span className="text-xs font-semibold">Uploading to Cloud...</span>
                </div>
              )}
            </div>
          )}

          {/* Web URL fallback toggle */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showUrlInput ? 'Hide link input' : 'Or paste web link'}</span>
            </button>
          </div>

          {showUrlInput && (
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => {
                setMediaUrl(e.target.value);
                setPreviewUrl(null);
                if (e.target.value.includes('.mp4') || e.target.value.includes('.webm')) {
                  setMediaType('VIDEO');
                }
              }}
              placeholder="Paste direct media URL (https://...)"
              className="w-full py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition"
            />
          )}

          {/* Caption & Location Card */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] focus-within:border-white/15 transition space-y-2">
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2000}
              placeholder="Write a caption... (optional)"
              className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0 resize-none"
            />
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5 flex-1 mr-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Location"
                  className="bg-transparent border-0 p-0 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-0 w-full"
                />
              </div>
              <span className="shrink-0">{caption.length}/2000</span>
            </div>
          </div>

          {/* Minimal Lock Moment Toggle & Price */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                  isLocked ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.05] text-slate-400'
                }`}>
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Lock Moment</span>
                    {isLocked && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        KES {priceKes}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {isLocked ? 'Viewers pay to unlock (80% creator payout • 20% platform fee)' : 'Free for everyone to view'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isLocked ? 'bg-rose-500' : 'bg-white/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isLocked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Price Selector (when locked) */}
            {isLocked && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2 animate-fade-in">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="relative flex items-center w-28 shrink-0">
                    <span className="absolute left-2.5 text-[11px] font-bold text-rose-400">KES</span>
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      step={1}
                      value={priceKes}
                      onChange={(e) => setPriceKes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-1.5 pl-10 pr-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {[10, 20, 50, 100, 200].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setPriceKes(amt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          priceKes === amt
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Creator Earnings Breakdown */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/[0.04]">
                  <span className="text-emerald-400 font-semibold">You earn: KES {Math.round(priceKes * 0.8).toLocaleString()} (80%)</span>
                  <span>Platform fee: KES {Math.round(priceKes * 0.2).toLocaleString()} (20%)</span>
                </div>
              </div>
            )}
          </div>

          {/* Viewing Duration Selector */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                  durationSeconds > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.05] text-slate-400'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Viewing Duration</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                      durationSeconds > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(durationSeconds)}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {durationSeconds > 0
                      ? `Viewer has ${formatDuration(durationSeconds)} to view after unlocking`
                      : 'Permanent — viewer can view without time limits after unlock'}
                  </p>
                </div>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Forever', sec: 0, viewOnce: false },
                  { label: '5m', sec: 300, viewOnce: true },
                  { label: '15m', sec: 900, viewOnce: true },
                  { label: '30m', sec: 1800, viewOnce: true },
                  { label: '1h', sec: 3600, viewOnce: true },
                ].map((opt) => {
                  const active = !isCustomDuration && durationSeconds === opt.sec;
                  return (
                    <button
                      type="button"
                      key={opt.label}
                      onClick={() => {
                        setIsCustomDuration(false);
                        setDurationSeconds(opt.sec);
                        setIsViewOnce(opt.viewOnce);
                      }}
                      className={`py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        active
                          ? 'gradient-brand text-white shadow-sm'
                          : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
                      }`}
                    >
                      {opt.sec > 0 && <Clock className="w-3 h-3 text-amber-300" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: '2h', sec: 7200, viewOnce: true },
                  { label: '6h', sec: 21600, viewOnce: true },
                  { label: '12h', sec: 43200, viewOnce: true },
                  { label: '24h', sec: 86400, viewOnce: true },
                ].map((opt) => {
                  const active = !isCustomDuration && durationSeconds === opt.sec;
                  return (
                    <button
                      type="button"
                      key={opt.label}
                      onClick={() => {
                        setIsCustomDuration(false);
                        setDurationSeconds(opt.sec);
                        setIsViewOnce(opt.viewOnce);
                      }}
                      className={`py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        active
                          ? 'gradient-brand text-white shadow-sm'
                          : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-amber-300" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}

                {/* Custom Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDuration(true);
                    setIsViewOnce(true);
                    const total = customDurationUnit === 'HOURS' ? customDurationVal * 3600 : customDurationVal * 60;
                    setDurationSeconds(total);
                  }}
                  className={`py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    isCustomDuration
                      ? 'gradient-brand text-white shadow-sm'
                      : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.09]'
                  }`}
                >
                  <span>Custom...</span>
                </button>
              </div>

              {/* Custom Duration Input when selected */}
              {isCustomDuration && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 animate-fade-in">
                  <div className="relative flex items-center flex-1">
                    <input
                      type="number"
                      min={1}
                      max={customDurationUnit === 'HOURS' ? 168 : 10000}
                      value={customDurationVal}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setCustomDurationVal(val);
                        const total = customDurationUnit === 'HOURS' ? val * 3600 : val * 60;
                        setDurationSeconds(total);
                        setIsViewOnce(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDurationUnit('MINUTES');
                        setDurationSeconds(customDurationVal * 60);
                        setIsViewOnce(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        customDurationUnit === 'MINUTES'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDurationUnit('HOURS');
                        setDurationSeconds(customDurationVal * 3600);
                        setIsViewOnce(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        customDurationUnit === 'HOURS'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hours
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploading || (!mediaUrl.trim() && !previewUrl) || mediaUrl.startsWith('blob:')}
              className="flex-[2] py-2.5 rounded-2xl gradient-brand text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUploading ? 'Uploading...' : 'Publishing...'}</span>
                </>
              ) : (
                <span>Upload Moment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { DeviceImagePicker } from '@/components/common/DeviceImagePicker';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const SAMPLE_STORY_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
];

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      setError('Please wait until photo upload completes');
      return;
    }
    if (!mediaUrl.trim() || mediaUrl.startsWith('blob:')) {
      setError('Please select a photo and wait for upload to complete');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: mediaUrl.trim(),
          mediaType: 'IMAGE',
          caption: caption.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const detailMsg = data?.details?.[0]?.message;
        throw new Error(detailMsg || data.error || 'Failed to post story');
      }

      onStoryCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-6 bg-[#1A202C] text-white rounded-3xl border border-gray-700/60 shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add to Your Story</h3>
              <p className="text-[10px] text-gray-400">Visible to connections for 24 hours</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Story Photo Picker from Device */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-gray-300">
                Select Story Photo from Device
              </label>
              <div className="px-2 py-0.5 rounded-full bg-black/60 border border-gray-700 text-[10px] text-rose-300 font-mono">
                24h Expiry
              </div>
            </div>
            <DeviceImagePicker
              value={mediaUrl}
              onChange={(url) => setMediaUrl(url)}
              onUploadingChange={setIsUploading}
              folder="stories"
              aspectRatio="portrait"
              label="Choose Story Photo from Device"
            />
          </div>

          {/* Quick Preset Photos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-gray-400">
                Or choose sample story:
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[10px] text-[#F43F5E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="w-3 h-3" />
                <span>{showUrlInput ? 'Hide link' : 'Paste link'}</span>
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SAMPLE_STORY_PHOTOS.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setMediaUrl(url)}
                  className={`relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                    mediaUrl === url ? 'border-[#F43F5E] scale-105 shadow-sm shadow-[#F43F5E]' : 'border-gray-700 opacity-60'
                  }`}
                >
                  <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Optional Direct URL Input */}
          {showUrlInput && (
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Direct Photo URL</label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full py-1.5 px-3 rounded-xl bg-gray-800/80 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
              />
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="text-[11px] font-semibold text-gray-300 block mb-1">
              Caption (Optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="What's happening right now?"
              className="w-full py-2 px-3 rounded-xl bg-gray-800/80 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F43F5E]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploading || !mediaUrl.trim() || mediaUrl.startsWith('blob:')}
              className="flex-1 py-2.5 rounded-full gradient-pink font-semibold text-xs text-white shadow-[0_4px_15px_rgba(244,63,94,0.3)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.4)] active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading || isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isUploading ? 'Uploading...' : 'Posting...'}</span>
                </>
              ) : (
                <span>Post Story</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

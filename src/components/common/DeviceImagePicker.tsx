'use client';

import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, Loader2, AlertCircle, Film, Play } from 'lucide-react';
import { uploadMediaFile } from '@/utils/upload';
import { isVideoMedia } from '@/utils/media';

interface DeviceImagePickerProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: 'avatars' | 'photos' | 'posts' | 'stories' | 'messages' | 'general';
  label?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'banner';
  compact?: boolean;
  className?: string;
  onUploadingChange?: (uploading: boolean) => void;
  acceptVideo?: boolean;
}

export function DeviceImagePicker({
  value,
  onChange,
  folder = 'general',
  label = 'Choose from Device',
  aspectRatio = 'portrait',
  compact = false,
  className = '',
  onUploadingChange,
  acceptVideo = false,
}: DeviceImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [tempPreviewUrl, setTempPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = acceptVideo && file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrorMessage(
        acceptVideo
          ? 'Please select a valid image (JPEG, PNG, WebP) or video (MP4, WebM, MOV)'
          : 'Please select a valid image file (JPEG, PNG, WebP, GIF)'
      );
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    onUploadingChange?.(true);

    // Instant local preview for immediate visual feedback
    const localUrl = URL.createObjectURL(file);
    setTempPreviewUrl(localUrl);

    try {
      const result = await uploadMediaFile(file, folder);
      if (result.success && result.publicUrl) {
        onChange(result.publicUrl);
        setTempPreviewUrl(null);
      } else {
        setErrorMessage(result.error || 'Failed to upload media from device');
        setTempPreviewUrl(null);
        onChange('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error uploading media from device');
      setTempPreviewUrl(null);
      onChange('');
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const displayImage = tempPreviewUrl || value;

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'portrait'
      ? 'aspect-[4/5]'
      : aspectRatio === 'landscape'
      ? 'aspect-video'
      : 'aspect-[3/1]';

  const acceptedTypes = acceptVideo ? 'image/*,video/*' : 'image/*';

  if (compact) {
    return (
      <div className={className}>
        <input
          type="file"
          ref={fileInputRef}
          accept={acceptedTypes}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-xs text-white font-medium border border-gray-700 transition cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F43F5E]" />
          ) : acceptVideo ? (
            <Film className="w-3.5 h-3.5 text-[#F43F5E]" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-[#F43F5E]" />
          )}
          <span>{isUploading ? 'Uploading...' : label}</span>
        </button>
        {errorMessage && (
          <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>
    );
  }

  const isVideo = isVideoMedia(displayImage);

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        accept={acceptedTypes}
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden border-2 border-dashed transition flex flex-col items-center justify-center cursor-pointer group ${
          isDragOver
            ? 'border-[#F43F5E] bg-[#F43F5E]/10'
            : displayImage
            ? 'border-gray-700/60 bg-black/40 hover:border-[#F43F5E]/60'
            : 'border-gray-700/70 bg-[#121721] hover:border-[#F43F5E] hover:bg-[#1A202C]'
        }`}
      >
        {displayImage ? (
          <>
            {isVideo ? (
              <video
                src={displayImage}
                className="w-full h-full object-cover object-top"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img src={displayImage} alt="Selected preview" className="w-full h-full object-cover object-top" />
            )}

            {isVideo && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 shadow-md">
                <Film className="w-3 h-3 text-rose-400" />
                <span>Video Clip</span>
              </div>
            )}

            {!isUploading && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                <Camera className="w-6 h-6 text-white drop-shadow" />
                <span className="text-xs font-semibold text-white drop-shadow">Change Media</span>
                <span className="text-[10px] text-gray-300">Tap to select a different photo or video</span>
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 z-10">
                <Loader2 className="w-8 h-8 text-[#F43F5E] animate-spin" />
                <span className="text-xs font-semibold text-white">Uploading to storage...</span>
                <span className="text-[10px] text-gray-300">Saving media file</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-[#F43F5E] animate-spin mb-2" />
                <span className="text-xs font-medium text-white">Uploading image...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#F43F5E]/10 text-[#F43F5E] flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-white mb-0.5">{label}</span>
                <span className="text-[10px] text-gray-400">
                  Tap to browse gallery or take a photo with camera
                </span>
                <span className="text-[9px] text-gray-500 mt-1">PNG, JPG, WebP up to 20MB</span>
              </>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

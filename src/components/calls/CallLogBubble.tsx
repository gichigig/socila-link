'use client';

import React from 'react';
import { Phone, PhoneMissed, PhoneOff, Video, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface CallLogData {
  callType: 'AUDIO' | 'VIDEO';
  status: 'COMPLETED' | 'MISSED' | 'DECLINED';
  durationSeconds: number;
  timestamp?: string;
}

interface CallLogBubbleProps {
  content?: string | null;
  isMine: boolean;
  createdAt: string;
  onCallBack: (isVideo: boolean) => void;
}

export function CallLogBubble({
  content,
  isMine,
  createdAt,
  onCallBack,
}: CallLogBubbleProps) {
  let log: CallLogData = {
    callType: 'AUDIO',
    status: 'COMPLETED',
    durationSeconds: 0,
  };

  try {
    if (content) {
      log = JSON.parse(content);
    }
  } catch {
    // If plaintext fallback
    if (content?.toLowerCase().includes('video')) {
      log.callType = 'VIDEO';
    }
  }

  const isVideo = log.callType === 'VIDEO';
  const isMissed = log.status === 'MISSED';
  const isDeclined = log.status === 'DECLINED';
  const isCompleted = log.status === 'COMPLETED';

  const formatDuration = (totalSecs: number) => {
    if (totalSecs <= 0) return '';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formattedTime = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full flex justify-center my-2">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-lg text-xs backdrop-blur-md">
        {/* Status Icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isMissed
              ? 'bg-rose-500/15 text-rose-400'
              : isDeclined
              ? 'bg-gray-800 text-gray-400'
              : isVideo
              ? 'bg-pink-500/15 text-pink-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          {isMissed ? (
            <PhoneMissed className="w-4 h-4" />
          ) : isDeclined ? (
            <PhoneOff className="w-4 h-4" />
          ) : isVideo ? (
            <Video className="w-4 h-4" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
        </div>

        {/* Call Description */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white text-xs">
            <span>{isVideo ? 'Video Call' : 'Voice Call'}</span>
            <span className="text-[10px] text-gray-400">({formattedTime})</span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {isMine ? (
              <ArrowUpRight className="w-3 h-3 text-gray-400 shrink-0" />
            ) : (
              <ArrowDownLeft
                className={`w-3 h-3 shrink-0 ${
                  isMissed ? 'text-rose-400' : 'text-gray-400'
                }`}
              />
            )}
            <span
              className={
                isMissed
                  ? 'text-rose-400 font-medium'
                  : isDeclined
                  ? 'text-gray-400'
                  : 'text-gray-300'
              }
            >
              {isMissed
                ? isMine
                  ? 'No Answer'
                  : 'Missed Call'
                : isDeclined
                ? 'Declined'
                : formatDuration(log.durationSeconds) || 'Call Ended'}
            </span>
          </div>
        </div>

        {/* Quick Call Back Button */}
        <button
          onClick={() => onCallBack(isVideo)}
          className={`ml-2 px-3 py-1.5 rounded-xl font-bold text-[11px] transition active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer ${
            isVideo
              ? 'bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 border border-pink-500/30'
              : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30'
          }`}
        >
          {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
          <span>Call Back</span>
        </button>
      </div>
    </div>
  );
}

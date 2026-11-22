'use client';

import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { ringtone } from '@/utils/ringtone';

export interface IncomingCallData {
  roomName: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  isVideo: boolean;
  conversationId: string;
}

interface IncomingCallModalProps {
  call: IncomingCallData;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
  // Play melodious incoming call ringtone chime
  useEffect(() => {
    const stopRingtone = ringtone.playIncoming();
    return () => {
      stopRingtone();
    };
  }, []);

  // Auto-dismiss incoming call modal if unanswered after 45 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onReject();
    }, 45000);
    return () => clearTimeout(timer);
  }, [onReject]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-pink-500/30 p-6 flex flex-col items-center text-center shadow-2xl shadow-pink-500/20 overflow-hidden">
        {/* Neon Ambient Background glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Caller Avatar with Pulse Ring */}
        <div className="relative mb-4 mt-2">
          <div className="absolute inset-0 rounded-full bg-pink-500/40 animate-ping opacity-75" />
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-pink-500 shadow-lg bg-gray-800 flex items-center justify-center">
            {call.callerAvatar ? (
              <img
                src={call.callerAvatar}
                alt={call.callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-black text-pink-400">
                {call.callerName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gray-900 border border-gray-700 shadow">
            {call.isVideo ? (
              <Video className="w-4 h-4 text-pink-400" />
            ) : (
              <Phone className="w-4 h-4 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white mb-1">{call.callerName}</h3>
        <p className="text-xs text-pink-300/80 mb-6 font-medium animate-pulse">
          Incoming {call.isVideo ? 'Live Video' : 'Audio'} Call...
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-lg shadow-rose-600/40 flex items-center justify-center transition cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-[11px] font-medium text-rose-300">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 text-white shadow-lg shadow-emerald-500/40 flex items-center justify-center transition cursor-pointer animate-bounce"
              title="Accept Call"
            >
              {call.isVideo ? (
                <Video className="w-7 h-7" />
              ) : (
                <Phone className="w-7 h-7" />
              )}
            </button>
            <span className="text-[11px] font-medium text-emerald-300">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useRoomContext,
  useRemoteParticipants,
  useLocalParticipant,
  useTracks,
  useTrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { isTrackReference } from '@livekit/components-core';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RotateCcw,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  User,
  Volume2,
} from 'lucide-react';
import { ringtone } from '@/utils/ringtone';

interface LiveKitCallRoomProps {
  roomName: string;
  isVideo: boolean;
  partnerName?: string;
  partnerAvatar?: string | null;
  isInitiator?: boolean;
  onDisconnected: () => void;
}

function CallRoomInner({
  partnerName = 'Partner',
  partnerAvatar,
  isVideoCall,
  isInitiator,
  onDisconnected,
}: {
  partnerName?: string;
  partnerAvatar?: string | null;
  isVideoCall: boolean;
  isInitiator?: boolean;
  onDisconnected: () => void;
}) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  const isConnected = remoteParticipants.length > 0;
  const hasHadRemoteRef = useRef(false);

  const [seconds, setSeconds] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  // Microphones & Camera Toggles via standard LiveKit hooks
  const { toggle: toggleMic, enabled: isMicEnabled } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { toggle: toggleCam, enabled: isCamEnabled } = useTrackToggle({
    source: Track.Source.Camera,
  });

  // Query camera tracks
  const rawCameraTracks = useTracks([Track.Source.Camera]);
  const cameraTracks = rawCameraTracks.filter(isTrackReference);

  const remoteCameraTrack = cameraTracks.find(
    (t) => !t.participant.isLocal && t.source === Track.Source.Camera
  );
  const localCameraTrack = cameraTracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

  const remoteParticipant = remoteParticipants[0] || null;
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

  useEffect(() => {
    if (!remoteParticipant) {
      setIsRemoteSpeaking(false);
      return;
    }

    setIsRemoteSpeaking(Boolean(remoteParticipant.isSpeaking));

    const handleSpeakingChange = (speaking: boolean) => {
      setIsRemoteSpeaking(speaking);
    };

    remoteParticipant.on('isSpeakingChanged', handleSpeakingChange);
    return () => {
      remoteParticipant.off('isSpeakingChanged', handleSpeakingChange);
    };
  }, [remoteParticipant]);

  // 1. As soon as remote participant arrives, stop any ringtones & begin duration counter
  useEffect(() => {
    if (isConnected) {
      ringtone.stop();
      hasHadRemoteRef.current = true;
    } else if (hasHadRemoteRef.current) {
      // Remote participant hung up or left
      ringtone.stop();
      try {
        room.disconnect();
      } catch {}
      onDisconnected();
    }
  }, [isConnected, room, onDisconnected]);

  // 2. Call duration timer (only starts when connected)
  useEffect(() => {
    if (!isConnected) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  // 3. Outgoing Call Timeout: If initiator is waiting > 45s without answer, cancel
  useEffect(() => {
    if (isConnected || !isInitiator) return;
    const timeout = setTimeout(() => {
      ringtone.stop();
      try {
        room.disconnect();
      } catch {}
      alert(`No answer from ${partnerName}.`);
      onDisconnected();
    }, 45000);

    return () => clearTimeout(timeout);
  }, [isConnected, isInitiator, partnerName, room, onDisconnected]);

  // 4. Enumerate video cameras for mobile camera flipping
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(videoDevs);
        })
        .catch(() => {});
    }
  }, []);

  const flipCamera = async () => {
    if (videoDevices.length < 2) return;
    const nextIdx = (currentDeviceIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIdx];
    try {
      await room.switchActiveDevice('videoinput', nextDevice.deviceId);
      setCurrentDeviceIndex(nextIdx);
    } catch (err) {
      console.warn('[Camera Flip Error]:', err);
    }
  };

  const handleEndCall = () => {
    ringtone.stop();
    try {
      room.disconnect();
    } catch {}
    onDisconnected();
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine main video track vs PiP track
  const mainTrack = isSwapped ? localCameraTrack : remoteCameraTrack;
  const pipTrack = isSwapped ? remoteCameraTrack : localCameraTrack;
  const isMainTrackActive = mainTrack && !mainTrack.publication?.isMuted;
  const isPipTrackActive = pipTrack && !pipTrack.publication?.isMuted;

  return (
    <div className="relative w-full h-full bg-gray-950 text-white overflow-hidden select-none">
      {/* Background WebRTC Audio Player */}
      <RoomAudioRenderer />

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. OUTGOING CALL / RINGING SCREEN (Waiting for partner to answer)       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {!isConnected ? (
        <div className="relative w-full h-full flex flex-col items-center justify-between p-6 sm:p-10 z-20">
          {/* Top Encrypted Privacy Pill */}
          <div className="pt-safe flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-900/80 border border-gray-800 text-[11px] font-medium text-gray-400 backdrop-blur-md shadow-lg">
            <Lock className="w-3.5 h-3.5 text-pink-400" />
            <span>End-to-End Encrypted Call</span>
          </div>

          {/* Centered Calling Avatar with Pulsing Waves */}
          <div className="flex flex-col items-center text-center my-auto">
            <div className="relative flex items-center justify-center mb-6">
              {/* Radar pulse ripples */}
              <div className="absolute w-44 h-44 rounded-full bg-pink-500/15 animate-ping duration-1000" />
              <div className="absolute w-36 h-36 rounded-full bg-pink-500/25 animate-pulse" />

              {/* Avatar circle */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-pink-500/80 shadow-2xl bg-gray-900 flex items-center justify-center">
                {partnerAvatar ? (
                  <img
                    src={partnerAvatar}
                    alt={partnerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-extrabold text-pink-400">
                    {partnerName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-1.5 tracking-tight">
              {partnerName}
            </h2>

            <div className="flex items-center gap-2 text-xs font-semibold text-pink-300/90 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              <span>
                {isInitiator
                  ? `Calling ${partnerName}... (Ringing)`
                  : `Connecting to ${partnerName}...`}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              {isVideoCall ? 'SociLaLink HD Video Call' : 'SociLaLink Voice Call'}
            </p>
          </div>

          {/* Self Camera Preview (Caller sees self in small box while waiting if video call) */}
          {isVideoCall && localCameraTrack && (
            <div className="absolute top-20 right-4 sm:right-8 w-28 h-36 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 z-30">
              <VideoTrack
                trackRef={localCameraTrack}
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-gray-300 backdrop-blur-sm">
                You
              </div>
            </div>
          )}

          {/* Bottom Cancel Call Action */}
          <div className="pb-safe w-full flex flex-col items-center gap-2">
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-xl shadow-rose-600/40 flex items-center justify-center transition cursor-pointer"
              title="Cancel Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-medium text-gray-400">Cancel</span>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────── */
        /* 2. CONNECTED 1-ON-1 ACTIVE CALL SCREEN                             */
        /* ────────────────────────────────────────────────────────────────── */
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
          {/* Main Stage View (Remote User by default) */}
          <div className="absolute inset-0 w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
            {isVideoCall && isMainTrackActive && mainTrack ? (
              <VideoTrack
                trackRef={mainTrack}
                className={`w-full h-full object-cover ${
                  isSwapped ? 'transform -scale-x-100' : ''
                }`}
              />
            ) : (
              /* Audio-Only / Camera Off Fallback Display */
              <div className="relative flex flex-col items-center justify-center p-6 text-center z-10">
                {/* Speaking waveform pulse */}
                <div
                  className={`relative w-32 h-32 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 ${
                    isRemoteSpeaking ? 'scale-110' : 'scale-100'
                  }`}
                >
                  {isRemoteSpeaking && (
                    <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping duration-700" />
                  )}
                  <div
                    className={`w-full h-full rounded-full overflow-hidden border-4 shadow-2xl flex items-center justify-center bg-gray-900 transition-colors ${
                      isRemoteSpeaking
                        ? 'border-emerald-400 shadow-emerald-500/30'
                        : 'border-pink-500/60 shadow-pink-500/20'
                    }`}
                  >
                    {partnerAvatar ? (
                      <img
                        src={partnerAvatar}
                        alt={partnerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-black text-pink-400">
                        {partnerName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{partnerName}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  {isRemoteSpeaking ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-emerald-300 font-semibold">Speaking...</span>
                    </>
                  ) : (
                    <span>Connected</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top Header Overlay Bar */}
          <div className="pt-safe relative z-30 px-4 sm:px-6 pt-3 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-gray-950/75 border border-white/10 backdrop-blur-xl shadow-2xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                {partnerName}
              </span>
              <span className="text-xs text-gray-400 font-mono font-medium">
                {formatDuration(seconds)}
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-950/70 border border-white/10 backdrop-blur-xl text-[10px] font-semibold text-gray-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Encrypted HD</span>
            </div>
          </div>

          {/* Floating Picture-in-Picture (PiP) Window (Self Camera / Swapped view) */}
          {isVideoCall && (
            <div
              onClick={() => setIsSwapped(!isSwapped)}
              className="absolute top-16 right-4 sm:top-20 sm:right-6 z-40 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900 cursor-pointer active:scale-95 transition-all group"
              title="Click to swap camera views"
            >
              {isPipTrackActive && pipTrack ? (
                <VideoTrack
                  trackRef={pipTrack}
                  className={`w-full h-full object-cover ${
                    !isSwapped ? 'transform -scale-x-100' : ''
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gray-900">
                  <VideoOff className="w-6 h-6 text-gray-500 mb-1" />
                  <span className="text-[10px] text-gray-400 font-medium">
                    {isSwapped ? partnerName : 'You'} (Off)
                  </span>
                </div>
              )}

              {/* PiP Badge */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
                <span>{isSwapped ? partnerName : 'You'}</span>
              </div>
            </div>
          )}

          {/* Bottom Floating Control Dock */}
          <div className="pb-safe relative z-30 pb-6 flex items-center justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 rounded-full bg-gray-950/85 border border-white/15 backdrop-blur-2xl shadow-2xl">
              {/* Mic Mute/Unmute */}
              <button
                type="button"
                onClick={() => toggleMic()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                  isMicEnabled
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                }`}
                title={isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Video Camera Toggle (If Video Call) */}
              {isVideoCall && (
                <button
                  type="button"
                  onClick={() => toggleCam()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    isCamEnabled
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  }`}
                  title={isCamEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              )}

              {/* Mobile Camera Flip Button (If 2+ cameras available) */}
              {isVideoCall && videoDevices.length > 1 && (
                <button
                  type="button"
                  onClick={flipCamera}
                  className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 active:scale-90 text-white flex items-center justify-center transition cursor-pointer"
                  title="Flip Camera (Front/Rear)"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="w-14 h-12 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-xl shadow-rose-600/40 flex items-center justify-center transition cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveKitCallRoom({
  roomName,
  isVideo,
  partnerName,
  partnerAvatar,
  isInitiator,
  onDisconnected,
}: LiveKitCallRoomProps) {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchToken() {
      try {
        setLoading(true);
        const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://socilalink-api-ab186685252b.herokuapp.com';

        const res = await fetch(`${apiUrl}/api/v1/calls/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ roomName, isVideo }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch calling token (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setToken(data.data.token);
          setServerUrl(data.data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://livekit.ishinadwelly.com');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[LiveKit Call Token Fetch Error]:', err);
        if (isMounted) {
          setError(err.message || 'Could not connect to secure calling server.');
          setLoading(false);
        }
      }
    }

    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [roomName, isVideo]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
          <PhoneOff className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-rose-300">Call Connection Failed</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-6">{error}</p>
        <button
          onClick={onDisconnected}
          className="px-6 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs transition cursor-pointer"
        >
          Close
        </button>
      </div>
    );
  }

  if (loading || !token || !serverUrl) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-4" />
        <h3 className="text-base font-semibold text-gray-200">
          Connecting to secure call server...
        </h3>
        <p className="text-xs text-gray-500 mt-1">LiveKit WebRTC · End-to-End Encrypted</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col overflow-hidden">
      <LiveKitRoom
        video={isVideo}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        style={{ height: '100dvh' }}
        onDisconnected={onDisconnected}
      >
        <CallRoomInner
          partnerName={partnerName}
          partnerAvatar={partnerAvatar}
          isVideoCall={isVideo}
          isInitiator={isInitiator}
          onDisconnected={onDisconnected}
        />
      </LiveKitRoom>
    </div>
  );
}

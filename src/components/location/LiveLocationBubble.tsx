'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Footprints,
  Radio,
  ExternalLink,
  Square,
} from 'lucide-react';
import {
  calculateRealDistanceKm,
  getRealDevicePosition,
} from '@/utils/location';
import { LiveDirectionTrackingModal, LiveLocationData } from './LiveDirectionTrackingModal';
import { useSocket } from '@/context/SocketContext';

// Helper to compute official free OpenStreetMap tile URL (Zero API key needed)
function getOsmTileUrl(lat: number, lon: number, zoom = 15) {
  const safeLat = isNaN(lat) ? -1.2864 : lat;
  const safeLon = isNaN(lon) ? 36.8172 : lon;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((safeLon + 180) / 360) * n);
  const latRad = (safeLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

interface LiveLocationBubbleProps {
  messageId: string;
  conversationId: string;
  content?: string | null;
  isMine: boolean;
  partnerName: string;
  partnerAvatar?: string | null;
  createdAt: string;
  onStopSharing?: (messageId: string) => void;
}

export function LiveLocationBubble({
  messageId,
  conversationId,
  content,
  isMine,
  partnerName,
  partnerAvatar,
  createdAt,
  onStopSharing,
}: LiveLocationBubbleProps) {
  const { socket } = useSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);

  let initialData: LiveLocationData = {
    latitude: -1.2864,
    longitude: 36.8172,
    isLive: true,
  };

  try {
    if (content) {
      initialData = JSON.parse(content);
    }
  } catch {}

  const [locationData, setLocationData] = useState<LiveLocationData>(initialData);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Check if live sharing has expired or is pinned
  const isPinned = Boolean(locationData.isPinned);
  const isExpired = locationData.sharingUntil
    ? new Date() > new Date(locationData.sharingUntil)
    : false;
  const isCurrentlyLive = !isPinned && Boolean(locationData.isLive) && !isExpired;

  // Auto-expire when duration ends
  useEffect(() => {
    if (!locationData.sharingUntil || isPinned || isExpired) return;
    const checkExpiry = () => {
      if (new Date() > new Date(locationData.sharingUntil!)) {
        setLocationData((prev) => ({ ...prev, isLive: false }));
      }
    };
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, [locationData.sharingUntil, isPinned, isExpired]);

  // Listen to live socket updates for this message
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: any) => {
      if (data.conversationId === conversationId && (data.messageId === messageId || !data.messageId)) {
        setLocationData((prev) => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          accuracy: data.accuracy,
        }));
      }
    };

    const handleStop = (data: any) => {
      if (data.conversationId === conversationId && (data.messageId === messageId || !data.messageId)) {
        setLocationData((prev) => ({
          ...prev,
          isLive: false,
        }));
      }
    };

    socket.on('location:updated', handleUpdate);
    socket.on('location:stopped', handleStop);

    return () => {
      socket.off('location:updated', handleUpdate);
      socket.off('location:stopped', handleStop);
    };
  }, [socket, conversationId, messageId]);

  // Calculate distance from viewer
  useEffect(() => {
    getRealDevicePosition()
      .then((pos) => {
        const d = calculateRealDistanceKm(
          pos.latitude,
          pos.longitude,
          locationData.latitude,
          locationData.longitude
        );
        setDistanceKm(d);
      })
      .catch(() => {});
  }, [locationData.latitude, locationData.longitude]);

  const handleStopSharing = () => {
    if (socket) {
      socket.emit('location:stop', {
        conversationId,
        messageId,
      });
    }
    setLocationData((prev) => ({ ...prev, isLive: false }));
    if (onStopSharing) {
      onStopSharing(messageId);
    }
  };

  const formattedTime = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <div
        className={`w-full max-w-sm rounded-2xl overflow-hidden border shadow-xl my-1 transition-all ${
          isMine
            ? 'bg-gray-900 border-pink-500/40 rounded-br-xs'
            : 'bg-[#182030] border-gray-700/60 rounded-bl-xs'
        }`}
      >
        {/* Top Mini Map Snapshot Preview */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="relative w-full h-32 bg-gray-950 overflow-hidden cursor-pointer group"
        >
          {/* Static Map Tile Snapshot - 100% Free OpenStreetMap dark tiles */}
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{
              backgroundImage: `url(${getOsmTileUrl(locationData.latitude, locationData.longitude)})`,
              backgroundColor: '#0f172a',
              filter: 'brightness(0.68) invert(1) contrast(1.9) hue-rotate(200deg) saturate(0.35)',
            }}
          />

          {/* Dark Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-black/30" />

          {/* Center Pulsing Beacon Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            {isCurrentlyLive && (
              <div className="absolute w-10 h-10 rounded-full bg-pink-500/40 animate-ping" />
            )}
            <div className="relative w-8 h-8 rounded-full gradient-pink p-0.5 shadow-xl flex items-center justify-center border-2 border-white">
              <MapPin className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {isPinned ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-600/90 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1.5 backdrop-blur-md border border-rose-400/40">
                <MapPin className="w-3 h-3 text-white" />
                Pinned Place
              </span>
            ) : isCurrentlyLive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                Live Location
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-gray-800/90 text-gray-300 font-semibold text-[10px] tracking-wider uppercase shadow-md backdrop-blur-md">
                Location Shared
              </span>
            )}
          </div>

          {/* Tap to Track Hint */}
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 text-pink-300 text-[10px] font-bold shadow flex items-center gap-1 backdrop-blur-md">
              <Compass className="w-3 h-3" />
              <span>{isPinned ? 'Follow Directions' : 'Track Direction'}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white text-xs">
                {locationData.locationName || (isPinned ? 'Pinned Place' : 'Live GPS Coordinates')}
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                {locationData.latitude.toFixed(4)}°, {locationData.longitude.toFixed(4)}°
              </p>
            </div>

            {distanceKm !== null && (
              <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 font-extrabold text-[11px] shrink-0">
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`} away
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-1 flex items-center justify-between gap-2 border-t border-gray-800/80">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-1.5 px-3 rounded-xl gradient-pink text-white font-bold text-[11px] shadow-md shadow-pink-500/20 hover:opacity-95 active:scale-95 flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <Navigation className="w-3 h-3" />
              <span>{isPinned ? 'Follow Directions' : 'Track & Directions'}</span>
            </button>

            {isMine && isCurrentlyLive && (
              <button
                onClick={handleStopSharing}
                className="py-1.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-rose-400 font-semibold text-[11px] border border-gray-700 active:scale-95 flex items-center gap-1 cursor-pointer transition"
                title="Stop sharing live location"
              >
                <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Direction & Live Map Tracking Modal */}
      {isModalOpen && (
        <LiveDirectionTrackingModal
          isOpen={isModalOpen}
          conversationId={conversationId}
          messageId={messageId}
          partnerName={partnerName}
          partnerAvatar={partnerAvatar}
          initialTargetLocation={locationData}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

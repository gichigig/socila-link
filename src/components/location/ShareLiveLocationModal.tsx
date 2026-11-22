'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Navigation,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  getRealDevicePosition,
  reverseGeocodeRealCoords,
} from '@/utils/location';
import { useSocket } from '@/context/SocketContext';
import { OpenStreetMapPicker } from './OpenStreetMapPicker';

interface ShareLiveLocationModalProps {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
  onSendLiveLocation: (payload: {
    type: 'LIVE_LOCATION' | 'PINNED_LOCATION';
    content: string;
  }) => Promise<void>;
}

const DURATIONS = [
  { label: '15 Minutes', minutes: 15 },
  { label: '1 Hour', minutes: 60 },
  { label: '8 Hours', minutes: 480 },
];

export function ShareLiveLocationModal({
  isOpen,
  conversationId,
  onClose,
  onSendLiveLocation,
}: ShareLiveLocationModalProps) {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'PIN' | 'LIVE'>('PIN');
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // 1 hour default
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [addressLabel, setAddressLabel] = useState<string>('Detecting location...');
  const [locating, setLocating] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocating(true);
    setError(null);

    getRealDevicePosition()
      .then(async (pos) => {
        setCoords({
          lat: pos.latitude,
          lon: pos.longitude,
          accuracy: Math.round(pos.accuracy),
        });
        setLocating(false);

        try {
          const rev = await reverseGeocodeRealCoords(pos.latitude, pos.longitude);
          setAddressLabel(rev.displayLabel || 'Your Current Location');
        } catch {
          setAddressLabel(`${pos.latitude.toFixed(4)}°, ${pos.longitude.toFixed(4)}°`);
        }
      })
      .catch((err) => {
        console.error('[Share Location Error]:', err);
        setError('Location access required to share your live location. Please allow GPS permission in your browser.');
        setLocating(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShareLive = async () => {
    if (!coords) return;
    setSubmitting(true);
    setError(null);

    const sharingUntil = new Date(Date.now() + selectedDuration * 60 * 1000).toISOString();

    const payloadContent = JSON.stringify({
      latitude: coords.lat,
      longitude: coords.lon,
      accuracy: coords.accuracy || 20,
      heading: null,
      speed: null,
      sharingUntil,
      isLive: true,
      isPinned: false,
      locationName: addressLabel,
      startedAt: new Date().toISOString(),
    });

    try {
      await onSendLiveLocation({
        type: 'LIVE_LOCATION',
        content: payloadContent,
      });

      // Start watching device GPS and stream updates via socket
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator && socket) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            socket.emit('location:update', {
              conversationId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );

        // Auto-stop watch when time expires
        setTimeout(() => {
          navigator.geolocation.clearWatch(watchId);
          socket.emit('location:stop', { conversationId });
        }, selectedDuration * 60 * 1000);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to share live location');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          activeTab === 'PIN' ? 'max-w-xl' : 'max-w-sm'
        } rounded-3xl bg-gray-900 border border-pink-500/30 p-5 flex flex-col shadow-2xl shadow-pink-500/20 overflow-hidden transition-all duration-300 max-h-[92vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-pink flex items-center justify-center border border-white/20">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share Location</h3>
              <p className="text-[11px] text-gray-400">
                {activeTab === 'PIN'
                  ? 'Pin a place for your partner to follow directions'
                  : 'Real-time moving GPS direction tracking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-gray-800/80 rounded-2xl border border-gray-700/60 my-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('PIN')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PIN'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-300" />
            <span>Pin a Place</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LIVE')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'LIVE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Live GPS Stream</span>
          </button>
        </div>

        {/* Tab 1: Pinned Location on Map */}
        {activeTab === 'PIN' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <OpenStreetMapPicker
              initialLat={coords?.lat || -1.2864}
              initialLon={coords?.lon || 36.8172}
              initialCity={addressLabel !== 'Detecting location...' ? addressLabel : 'Nairobi, Kenya'}
              confirmButtonText="Send Pinned Location"
              onConfirmLocation={async (res) => {
                const payloadContent = JSON.stringify({
                  latitude: res.latitude,
                  longitude: res.longitude,
                  locationName: res.locationCity,
                  isPinned: true,
                  isLive: false,
                  sentAt: new Date().toISOString(),
                });
                await onSendLiveLocation({
                  type: 'PINNED_LOCATION',
                  content: payloadContent,
                });
                onClose();
              }}
              onCancel={onClose}
            />
          </div>
        )}

        {/* Tab 2: Live GPS Duration Broadcast */}
        {activeTab === 'LIVE' && (
          <div className="flex flex-col">
            {/* Location Preview Card */}
            <div className="my-3 p-3.5 rounded-2xl bg-gray-800/80 border border-gray-700/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-pink flex items-center justify-center text-white shrink-0 shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                {locating ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 text-pink-500 animate-spin" />
                    <span>Acquiring GPS fix...</span>
                  </div>
                ) : error ? (
                  <p className="text-[11px] text-rose-400 leading-tight">{error}</p>
                ) : (
                  <>
                    <p className="font-bold text-white text-xs truncate">{addressLabel}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {coords?.lat.toFixed(4)}°, {coords?.lon.toFixed(4)}° (±{coords?.accuracy}m)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-pink-400" />
                <span>Share moving location for:</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((dur) => {
                  const isSelected = selectedDuration === dur.minutes;
                  return (
                    <button
                      key={dur.minutes}
                      type="button"
                      onClick={() => setSelectedDuration(dur.minutes)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sharing Notice */}
            <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
              Both you and the recipient can see each other's live direction, distance, and turn-by-turn route on the live map. You can stop sharing at any time.
            </p>

            {/* Submit Button */}
            <button
              onClick={handleShareLive}
              disabled={!coords || locating || submitting}
              className="w-full py-3 rounded-2xl gradient-pink text-white font-bold text-xs shadow-lg shadow-pink-500/30 hover:opacity-95 active:scale-95 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Live Stream...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Start Sharing Live Location</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getRealDevicePosition,
  reverseGeocodeRealCoords,
  getApproximateIpLocation,
  geocodeCityOrAddress,
  POPULAR_KENYA_HUBS,
} from '@/utils/location';
import {
  Navigation,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Loader2,
  X,
  Compass,
  CheckCircle2,
  HelpCircle,
  Wifi,
  Edit3,
  Search,
  Check,
  Layers,
} from 'lucide-react';
import { OpenStreetMapPicker } from './OpenStreetMapPicker';

export interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSuccess: (result: {
    latitude: number;
    longitude: number;
    locationCity?: string;
    locationCountry?: string;
    accuracyMeters?: number;
    method: 'GPS' | 'IP';
  }) => void;
  activeCity?: string;
  triggerReason?: 'initial' | 'under_4km' | 'manual';
}

export function LocationPromptModal({
  isOpen,
  onClose,
  onLocationSuccess,
  activeCity,
  triggerReason = 'manual',
}: LocationPromptModalProps) {
  const { syncLocation } = useAuth();
  const [status, setStatus] = useState<'prompt' | 'requesting' | 'success' | 'denied'>('prompt');
  const [modalTab, setModalTab] = useState<'detect' | 'manual' | 'map'>(
    triggerReason === 'manual' ? 'map' : 'detect'
  );
  const [isIpResolving, setIsIpResolving] = useState(false);
  const [manualInput, setManualInput] = useState(activeCity || '');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<{
    city: string;
    method: 'GPS' | 'IP';
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('prompt');
      setIsIpResolving(false);
      setErrorMessage(null);
      setDetectedLocation(null);
      setManualInput(activeCity || '');
      setModalTab(triggerReason === 'manual' ? 'map' : 'detect');
    }
  }, [isOpen, activeCity, triggerReason]);

  if (!isOpen) return null;

  const handleRequestGps = async () => {
    setIsIpResolving(false);
    setStatus('requesting');
    setErrorMessage(null);

    try {
      // 1. Query real live device GPS hardware (no cache, high accuracy)
      const position = await getRealDevicePosition();
      const lat = position.latitude;
      const lon = position.longitude;
      const accuracy = Math.round(position.accuracy);

      // 2. Real reverse-geocoding of coordinates to extract actual town/neighborhood
      const geocoded = await reverseGeocodeRealCoords(lat, lon);
      const cityName = geocoded.displayLabel;
      const countryName = geocoded.country;

      setDetectedLocation({
        city: cityName,
        method: 'GPS',
        latitude: lat,
        longitude: lon,
        accuracyMeters: accuracy,
      });
      setStatus('success');

      // 3. Sync real coordinates & real city with backend
      try {
        await syncLocation({
          latitude: lat,
          longitude: lon,
        });
      } catch (err) {
        console.warn('Location sync to backend warning:', err);
      }

      onLocationSuccess({
        latitude: lat,
        longitude: lon,
        locationCity: cityName,
        locationCountry: countryName,
        accuracyMeters: accuracy,
        method: 'GPS',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('socilalink_gps_permission', 'granted');
        localStorage.setItem(
          'socilalink_real_gps',
          JSON.stringify({ latitude: lat, longitude: lon, cityName, accuracy })
        );
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.warn('[Geolocation Real GPS Failed]:', err);
      if (err.code === 1 || err.name === 'NotAllowedError') {
        setErrorMessage(
          'Device location permission was blocked. Please tap "Allow" in your browser address bar, or use approximate network IP below.'
        );
      } else if (err.code === 3) {
        setErrorMessage('Device GPS timed out waiting for satellite fix. You can try again or use network IP.');
      } else {
        setErrorMessage(
          'Device location permission was not granted. You can point your exact spot on OpenStreetMap or use approximate network IP.'
        );
      }
      setStatus('denied');
    }
  };

  const handleUseIpLocation = async () => {
    setIsIpResolving(true);
    setStatus('requesting');
    setErrorMessage(null);

    try {
      const res = await syncLocation();
      let cityName = 'Nairobi, Kenya';
      let lat = -1.2864;
      let lon = 36.8172;

      if (res && res.success && res.data) {
        cityName = res.data.locationCity || cityName;
        lat = res.data.latitude || lat;
        lon = res.data.longitude || lon;
      } else {
        const clientIp = await getApproximateIpLocation();
        cityName = clientIp.locationCity;
        lat = clientIp.latitude;
        lon = clientIp.longitude;
      }

      setDetectedLocation({
        city: cityName,
        method: 'IP',
        latitude: lat,
        longitude: lon,
        accuracyMeters: 5000,
      });
      setStatus('success');

      onLocationSuccess({
        latitude: lat,
        longitude: lon,
        locationCity: cityName,
        accuracyMeters: 5000,
        method: 'IP',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('socilalink_gps_permission', 'ip_fallback');
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      const clientIp = await getApproximateIpLocation();
      setDetectedLocation({
        city: clientIp.locationCity,
        method: 'IP',
        latitude: clientIp.latitude,
        longitude: clientIp.longitude,
        accuracyMeters: 5000,
      });
      setStatus('success');

      onLocationSuccess({
        latitude: clientIp.latitude,
        longitude: clientIp.longitude,
        locationCity: clientIp.locationCity,
        accuracyMeters: 5000,
        method: 'IP',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('socilalink_gps_permission', 'ip_fallback');
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleSaveManualLocation = async (chosenCity?: string) => {
    const city = (chosenCity || manualInput).trim();
    if (!city) return;

    setIsSubmittingManual(true);
    setStatus('requesting');
    setErrorMessage(null);

    try {
      const geocoded = await geocodeCityOrAddress(city);
      const lat = geocoded.latitude;
      const lon = geocoded.longitude;
      const cityName = geocoded.locationCity;
      const countryName = geocoded.locationCountry;

      setDetectedLocation({
        city: cityName,
        method: 'GPS',
        latitude: lat,
        longitude: lon,
        accuracyMeters: 50,
      });
      setStatus('success');

      try {
        await syncLocation({
          latitude: lat,
          longitude: lon,
          locationCity: cityName,
          locationCountry: countryName,
        });
      } catch (err) {
        console.warn('Manual location sync warning:', err);
      }

      onLocationSuccess({
        latitude: lat,
        longitude: lon,
        locationCity: cityName,
        locationCountry: countryName,
        accuracyMeters: 50,
        method: 'GPS',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('socilalink_gps_permission', 'manual');
        localStorage.setItem(
          'socilalink_real_gps',
          JSON.stringify({ latitude: lat, longitude: lon, cityName, accuracy: 50 })
        );
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[Manual Location Failed]:', err);
      setErrorMessage('Could not resolve location. Please try another neighborhood name.');
      setStatus('prompt');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-[32px] glass-card border border-white/10 bg-[#0C101B]/95 shadow-2xl p-6 text-center space-y-4 relative overflow-hidden">
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition border border-white/[0.08] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ======================================================== */}
        {/* STATE 1: PROMPT                                          */}
        {/* ======================================================== */}
        {status === 'prompt' && (
          <div className="space-y-3 pt-1">
            {/* 3-Way Segmented Control */}
            <div className="flex p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalTab('detect')}
                className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                  modalTab === 'detect'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Auto</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('map')}
                className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                  modalTab === 'map'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-300" />
                <span>OSM Map</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('manual')}
                className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                  modalTab === 'manual'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>

            {/* TAB 1: AUTO DETECT (GPS / IP) */}
            {modalTab === 'detect' && (
              <div className="space-y-3.5 pt-1 animate-fade-in">
                {/* Animated Radar Beacon */}
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping opacity-75" />
                  <div className="absolute inset-1.5 rounded-full bg-rose-500/30 animate-pulse" />
                  <div className="relative w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white shadow-xl shadow-rose-500/40">
                    <Navigation className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white tracking-tight">
                    {triggerReason === 'under_4km' ? 'Set Location for Under 4 km' : 'Enable Real GPS Location'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {triggerReason === 'under_4km'
                      ? 'SociLaLink needs your location to calculate exact proximity and show singles within 4 km of you.'
                      : 'Get live coordinates to find singles in your actual town and neighborhood.'}
                  </p>
                </div>

                {/* Value Highlights */}
                <div className="w-full glass-card rounded-2xl p-3 text-left space-y-2 text-xs text-slate-300 border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-medium">
                      <strong>Live Proximity:</strong> Accurately calculates real distance (e.g. 0.8 km) from you.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-[11px] font-medium">
                      <strong>Under 4 km Singles:</strong> Unlocks all nearby candidates active right now.
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleRequestGps}
                    className="w-full py-3 rounded-2xl font-bold text-xs gradient-brand text-white shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{triggerReason === 'under_4km' ? 'Allow GPS & Unlock Under 4 km' : 'Allow Real GPS Access'}</span>
                  </button>

                  <button
                    onClick={handleUseIpLocation}
                    className="w-full py-2.5 rounded-2xl font-semibold text-xs text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition border border-white/[0.08] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Wifi className="w-3.5 h-3.5 text-purple-400" />
                    <span>Use Approximate Network IP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTab('map')}
                    className="w-full py-2.5 rounded-2xl font-bold text-xs text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 transition border border-rose-500/30 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Point on OpenStreetMap Pin</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: OPENSTREETMAP PIN PICKER */}
            {modalTab === 'map' && (
              <div className="pt-0.5 animate-fade-in">
                <OpenStreetMapPicker
                  initialLat={detectedLocation?.latitude || -1.2864}
                  initialLon={detectedLocation?.longitude || 36.8172}
                  initialCity={activeCity || 'Nairobi, Kenya'}
                  autoLocateOnMount={true}
                  onConfirmLocation={({ latitude, longitude, locationCity, locationCountry }) => {
                    setDetectedLocation({
                      city: locationCity,
                      method: 'GPS',
                      latitude,
                      longitude,
                      accuracyMeters: 25,
                    });
                    setStatus('success');

                    syncLocation({
                      latitude,
                      longitude,
                      locationCity,
                      locationCountry,
                    }).catch(() => {});

                    onLocationSuccess({
                      latitude,
                      longitude,
                      locationCity,
                      locationCountry,
                      accuracyMeters: 25,
                      method: 'GPS',
                    });

                    if (typeof window !== 'undefined') {
                      localStorage.setItem('socilalink_gps_permission', 'manual_osm');
                      localStorage.setItem(
                        'socilalink_real_gps',
                        JSON.stringify({ latitude, longitude, cityName: locationCity, accuracy: 25 })
                      );
                    }

                    setTimeout(() => {
                      onClose();
                    }, 1200);
                  }}
                  onCancel={onClose}
                />
              </div>
            )}

            {/* TAB 3: MANUAL SET / SEARCH LOCATION */}
            {modalTab === 'manual' && (
              <div className="space-y-3.5 pt-1 text-left animate-fade-in">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-white">Search Location</h3>
                  <p className="text-xs text-slate-400">
                    Type your neighborhood or pick from popular areas below.
                  </p>
                </div>

                {/* Search & Set Input */}
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-rose-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveManualLocation();
                      }
                    }}
                    placeholder="e.g. Westlands, Kilimani, Karen, Mombasa..."
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-9 pr-20 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveManualLocation()}
                    disabled={!manualInput.trim() || isSubmittingManual}
                    className="absolute right-1.5 px-3 py-1.5 rounded-xl gradient-brand text-white font-bold text-[11px] hover:brightness-110 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                  >
                    {isSubmittingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    <span>{isSubmittingManual ? 'Saving...' : 'Set'}</span>
                  </button>
                </div>

                {/* Popular Area Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tap to Select Area
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalTab('map')}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      <span>Switch to OSM Map</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar py-0.5">
                    {[
                      'Westlands, Nairobi',
                      'Kilimani, Nairobi',
                      'Karen, Nairobi',
                      'Lavington, Nairobi',
                      'Nairobi CBD',
                      'Parklands, Nairobi',
                      'South B / South C',
                      'Runda / Gigiri',
                      'Mombasa',
                      'Nyali, Mombasa',
                      'Nakuru',
                      'Kisumu',
                      'Eldoret',
                      'Diani Beach',
                      'Thika',
                    ].map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => handleSaveManualLocation(hub)}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/[0.08] text-[11px] text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1"
                      >
                        <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                        <span>{hub.split(',')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 2: REQUESTING / WAITING                            */}
        {/* ======================================================== */}
        {status === 'requesting' && (
          <div className="py-8 space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/40 border-t-rose-500 animate-spin" />
              {isIpResolving ? (
                <Wifi className="w-7 h-7 text-purple-400 animate-pulse" />
              ) : (
                <Compass className="w-7 h-7 text-rose-400 animate-pulse" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                {isIpResolving ? 'Connecting via Network IP...' : 'Connecting to Device GPS...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {isIpResolving
                  ? 'Estimating your approximate regional city and coordinates from your connection...'
                  : 'Please tap "Allow" on your browser location prompt to share your real coordinates.'}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-rose-400 shrink-0" />
              <span>
                {isIpResolving ? 'Resolving approximate regional location...' : 'Locking live satellite & network fix...'}
              </span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 3: SUCCESS                                         */}
        {/* ======================================================== */}
        {status === 'success' && (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                {detectedLocation?.method === 'IP' ? 'Network Location Connected!' : 'Real Location Connected!'}
              </h3>
              <p className="text-xs text-emerald-300 font-bold flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {detectedLocation?.city} {detectedLocation?.method === 'IP' ? '(Network IP)' : ''}
                </span>
              </p>
              {detectedLocation?.latitude != null && detectedLocation?.longitude != null && (
                <p className="text-[10px] font-mono text-slate-400 pt-0.5">
                  {detectedLocation.latitude.toFixed(4)}°, {detectedLocation.longitude.toFixed(4)}°
                  {detectedLocation.accuracyMeters ? ` • ±${detectedLocation.accuracyMeters}m accuracy` : ''}
                </p>
              )}
              <p className="text-[11px] text-slate-400 pt-1">
                Recalculating real distances to all singles now...
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 4: DENIED / BLOCKED                                */}
        {/* ======================================================== */}
        {status === 'denied' && (
          <div className="space-y-4 pt-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Location Access Denied</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {errorMessage &&
                !errorMessage.toLowerCase().includes('endpoint') &&
                !errorMessage.toLowerCase().includes('not found') &&
                !errorMessage.toLowerCase().includes('failed') &&
                !errorMessage.toLowerCase().includes('error') &&
                !errorMessage.toLowerCase().includes('404')
                  ? errorMessage
                  : 'Device location permission was blocked. You can still point your exact spot on OpenStreetMap or use approximate network IP.'}
              </p>
            </div>

            {/* Tip on how to unblock */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to enable GPS in browser:</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-tight">
                Tap the <strong>lock</strong> or <strong>tune</strong> icon in your browser URL address bar, toggle{' '}
                <strong>Location</strong> to "Allow", and reload.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleUseIpLocation}
                className="w-full py-3.5 rounded-2xl font-bold text-xs gradient-brand text-white shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                <span>Use Approximate Network IP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus('prompt');
                  setModalTab('map');
                }}
                className="w-full py-2.5 rounded-2xl font-bold text-xs text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 transition border border-rose-500/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Point Exact Spot on OpenStreetMap</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus('prompt');
                  setModalTab('manual');
                }}
                className="w-full py-2 rounded-2xl font-semibold text-xs text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition border border-white/[0.08] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Search Neighborhood List</span>
              </button>

              <button
                onClick={handleRequestGps}
                className="w-full py-2.5 rounded-2xl font-semibold text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-slate-400" />
                <span>Try GPS Again</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

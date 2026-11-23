'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  User,
  MapPin,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Phone,
  Lock,
  Heart,
} from 'lucide-react';
import { uploadMediaFile } from '@/utils/upload';
import {
  geocodeCityOrAddress,
  reverseGeocodeRealCoords,
  getApproximateIpLocation,
  searchClientKenyanLocations,
  KenyaLocation,
} from '@/utils/location';
import { OpenStreetMapPicker } from '@/components/location/OpenStreetMapPicker';

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditorModal({ isOpen, onClose }: ProfileEditorModalProps) {
  const { user, updateProfile, syncLocation, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [locationCity, setLocationCity] = useState(user?.profile?.locationCity || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl || '');
  const [companionRateKes, setCompanionRateKes] = useState<number | null>(
    user?.profile?.companionRateKes !== undefined ? user?.profile?.companionRateKes : null
  );
  const [vibeTag, setVibeTag] = useState<string | null>(
    user?.profile?.vibeTag !== undefined ? user?.profile?.vibeTag : null
  );
  const [interestedInGenders, setInterestedInGenders] = useState<string>(
    user?.preferences?.interestedInGenders || 'ALL'
  );

  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({
    lat: user?.profile?.latitude ?? undefined,
    lon: user?.profile?.longitude ?? undefined,
  });
  const [showMapModal, setShowMapModal] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<KenyaLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationInputChange = (val: string) => {
    setLocationCity(val);
    if (val.trim().length >= 2) {
      const results = searchClientKenyanLocations(val, 6);
      setLocationSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectLocationSuggestion = (loc: KenyaLocation) => {
    setLocationCity(loc.name);
    setCoords({ lat: loc.lat, lon: loc.lon });
    setShowSuggestions(false);
    setStatusMessage({ type: 'success', text: `Selected: ${loc.name}` });
  };

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photos, setPhotos] = useState<Array<{ id: string; photoUrl: string; isPrimary: boolean; orderIndex: number }>>(
    user?.profile?.photos || []
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone(user?.phone || '');
      setUsername(user?.username || '');
      if (user?.profile) {
        setDisplayName(user.profile.displayName || '');
        setBio(user.profile.bio || '');
        setLocationCity(user.profile.locationCity || '');
        setAvatarUrl(user.profile.avatarUrl || '');
        setPhotos(user.profile.photos || []);
        setCompanionRateKes(
          user.profile.companionRateKes !== undefined ? user.profile.companionRateKes : null
        );
        setVibeTag(
          user.profile.vibeTag !== undefined ? user.profile.vibeTag : null
        );
        setInterestedInGenders(user.preferences?.interestedInGenders || 'ALL');
        setCoords({
          lat: user.profile.latitude ?? undefined,
          lon: user.profile.longitude ?? undefined,
        });

        // Fetch fresh photos directly from profile endpoint to ensure latest gallery data
        fetch('/api/v1/profiles/me')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.data?.photos)) {
              setPhotos(data.data.photos);
            }
          })
          .catch((err) => console.warn('Could not fetch fresh photos:', err));
      }
    }
  }, [isOpen, user?.profile, user?.phone]);

  if (!isOpen) return null;

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    setAvatarUploading(true);
    setStatusMessage(null);

    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);

    try {
      const uploadRes = await uploadMediaFile(file, 'avatars');
      if (!uploadRes.success || !uploadRes.publicUrl) {
        throw new Error(uploadRes.error || 'Failed to upload avatar');
      }

      setAvatarUrl(uploadRes.publicUrl);
      const updateRes = await updateProfile({ avatarUrl: uploadRes.publicUrl });
      if (updateRes.success) {
        setStatusMessage({ type: 'success', text: 'Avatar updated' });
        await refreshUser();
      } else {
        setStatusMessage({ type: 'error', text: updateRes.error || 'Failed to save avatar' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Avatar upload failed' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleGalleryFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (photos.length >= 6) {
      setStatusMessage({ type: 'error', text: 'Maximum 6 photos allowed' });
      return;
    }

    setGalleryUploading(true);
    setStatusMessage(null);

    try {
      const uploadRes = await uploadMediaFile(file, 'photos');
      if (!uploadRes.success || !uploadRes.publicUrl) {
        throw new Error(uploadRes.error || 'Failed to upload photo');
      }

      const res = await fetch('/api/v1/profiles/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: uploadRes.publicUrl,
          isPrimary: false, // Never force-override avatar on gallery uploads
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save photo');
      }

      const savedPhoto = data.data;
      if (savedPhoto) {
        setPhotos((prev) => [...prev, savedPhoto]);
      }

      setStatusMessage({ type: 'success', text: 'Gallery photo added' });
      await refreshUser();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Photo upload failed' });
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/v1/profiles/photos/${photoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete photo');
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setStatusMessage({ type: 'success', text: 'Photo removed' });
      await refreshUser();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete photo' });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleAutoDetectLocation = async () => {
    setDetectingLocation(true);
    setStatusMessage(null);

    const applyRealCoords = async (lat: number, lon: number) => {
      setCoords({ lat, lon });

      // 1. Reverse geocode directly with real satellite/GIS data (exact town/neighborhood)
      let resolvedCity = '';
      try {
        const geocoded = await reverseGeocodeRealCoords(lat, lon);
        if (geocoded && geocoded.displayLabel && geocoded.displayLabel !== 'Your Location') {
          resolvedCity = geocoded.displayLabel;
        }
      } catch (err) {
        console.warn('Reverse geocode error:', err);
      }

      if (resolvedCity) {
        setLocationCity(resolvedCity);
      }

      // 2. Synchronize with backend with the real city name
      const res = await syncLocation({
        latitude: lat,
        longitude: lon,
        locationCity: resolvedCity || undefined,
      });

      setDetectingLocation(false);
      const finalCity = resolvedCity || res.data?.locationCity;
      if (finalCity) {
        if (!resolvedCity) setLocationCity(finalCity);
        setStatusMessage({ type: 'success', text: `Real location: ${finalCity} (GPS)` });
      } else {
        setStatusMessage({ type: 'success', text: `GPS coordinates updated (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)` });
      }
    };

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await applyRealCoords(position.coords.latitude, position.coords.longitude);
        },
        async (err) => {
          console.warn('Browser GPS read error or rejected:', err);
          // If browser GPS is blocked, don't overwrite if user already has a city typed!
          if (locationCity) {
            setDetectingLocation(false);
            setStatusMessage({ type: 'error', text: 'GPS not available. Keeping current location.' });
            return;
          }
          try {
            const ipLoc = await getApproximateIpLocation();
            setLocationCity(ipLoc.locationCity);
            setCoords({ lat: ipLoc.latitude, lon: ipLoc.longitude });
            await syncLocation({
              latitude: ipLoc.latitude,
              longitude: ipLoc.longitude,
              locationCity: ipLoc.locationCity,
            });
            setStatusMessage({ type: 'success', text: `Approximate location: ${ipLoc.locationCity}` });
          } catch {
            setStatusMessage({ type: 'error', text: 'Could not detect location. Please type your city above.' });
          } finally {
            setDetectingLocation(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setDetectingLocation(false);
      setStatusMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    let coordsToSave: { latitude?: number; longitude?: number } = {};
    const trimmedCity = locationCity.trim();

    if (coords.lat != null && coords.lon != null) {
      coordsToSave = {
        latitude: coords.lat,
        longitude: coords.lon,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'socilalink_real_gps',
          JSON.stringify({
            latitude: coords.lat,
            longitude: coords.lon,
            cityName: trimmedCity,
            accuracy: 25,
          })
        );
      }
    } else if (trimmedCity) {
      try {
        const geocoded = await geocodeCityOrAddress(trimmedCity);
        coordsToSave = {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'socilalink_real_gps',
            JSON.stringify({
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
              cityName: trimmedCity,
              accuracy: 50,
            })
          );
        }
      } catch (err) {
        console.warn('Geocoding location in profile editor warning:', err);
      }
    }

    if (!username.trim()) {
      setStatusMessage({ type: 'error', text: 'Username is required' });
      setLoading(false);
      return;
    }

    if (username.trim().length < 3) {
      setStatusMessage({ type: 'error', text: 'Username must be at least 3 characters' });
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setStatusMessage({ type: 'error', text: 'Username can only contain letters, numbers, and underscores' });
      setLoading(false);
      return;
    }

    const result = await updateProfile({
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      locationCity: trimmedCity,
      ...coordsToSave,
      avatarUrl: avatarUrl || undefined,
      companionRateKes,
      vibeTag: vibeTag?.trim() || null,
      phone: phone.trim() ? phone.trim() : null,
      interestedInGenders: interestedInGenders || 'ALL',
    });

    setLoading(false);
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Profile saved' });
      await refreshUser();
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 800);
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to update profile' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-6 bg-[#111622] rounded-3xl border border-gray-800 p-5 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
          <h3 className="text-sm font-bold tracking-tight text-white">Edit Profile</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`my-2.5 p-2 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="mt-3.5 space-y-3 text-xs">
          {/* Top Section: Avatar & Names Side-by-Side (Ultra Minimalist) */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />
            <div
              onClick={() => !avatarUploading && avatarInputRef.current?.click()}
              className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-900 border border-rose-500/40 shrink-0 cursor-pointer group"
              title="Change avatar"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                required
                className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500/60"
              />
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs text-rose-400 font-mono font-bold">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  maxLength={30}
                  required
                  className="w-full bg-[#161B26] border border-gray-800 rounded-xl pl-6 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500/60 font-mono"
                />
              </div>
              <div className="relative">
                <div className="relative flex items-center">
                  <MapPin className="absolute left-2.5 w-3 h-3 text-gray-500" />
                  <input
                    type="text"
                    value={locationCity}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    onFocus={() => {
                      if (locationCity.trim().length >= 2 && locationSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="City / Location (e.g. Kilimani, Ruiru, Nyali)"
                    className="w-full bg-[#161B26] border border-gray-800 rounded-xl pl-7 pr-20 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500/60"
                  />
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={detectingLocation}
                    className="absolute right-1 px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Auto-detect location via GPS or network IP"
                  >
                    <Sparkles className={`w-2.5 h-2.5 ${detectingLocation ? 'animate-spin' : ''}`} />
                    <span>{detectingLocation ? '...' : 'Auto'}</span>
                  </button>
                </div>

                {/* Autocomplete Suggestions Dropdown (1,450 Kenya Locations) */}
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1A1F2C] border border-gray-700/80 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {locationSuggestions.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => selectLocationSuggestion(loc)}
                        className="w-full text-left px-3 py-2 text-[11px] text-gray-200 hover:bg-white/[0.08] hover:text-white transition flex items-center justify-between border-b border-gray-800/50 last:border-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="font-semibold text-white truncate">{loc.name}</span>
                          {loc.constituency && (
                            <span className="text-[10px] text-gray-400 shrink-0">({loc.constituency})</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{loc.county}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Area Chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { label: 'Ruiru', city: 'Ruiru, Kenya', lat: -1.1466, lon: 36.9600 },
                  { label: 'Westlands', city: 'Westlands, Nairobi', lat: -1.2675, lon: 36.8118 },
                  { label: 'Kilimani', city: 'Kilimani, Nairobi', lat: -1.2917, lon: 36.7865 },
                  { label: 'Karen', city: 'Karen, Nairobi', lat: -1.3211, lon: 36.7119 },
                  { label: 'Nairobi CBD', city: 'Nairobi CBD', lat: -1.2864, lon: 36.8172 },
                  { label: 'Kasarani', city: 'Kasarani, Nairobi', lat: -1.2227, lon: 36.8971 },
                  { label: 'Kiambu', city: 'Kiambu Town', lat: -1.1714, lon: 36.8356 },
                  { label: 'Mombasa', city: 'Mombasa, Kenya', lat: -4.0435, lon: 39.6682 },
                  { label: 'Nakuru', city: 'Nakuru, Kenya', lat: -0.3031, lon: 36.0800 },
                ].map((hub) => (
                  <button
                    key={hub.label}
                    type="button"
                    onClick={() => {
                      setLocationCity(hub.city);
                      setCoords({ lat: hub.lat, lon: hub.lon });
                    }}
                    className="text-[9px] py-0.5 px-2 rounded-md bg-[#161B26] hover:bg-rose-500/20 hover:border-rose-500/40 border border-gray-800 text-gray-400 hover:text-rose-300 transition whitespace-nowrap cursor-pointer"
                  >
                    {hub.label}
                  </button>
                ))}
              </div>

              {/* OpenStreetMap Pin Point Button & Coordinate Status */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500/15 to-purple-600/15 hover:from-rose-500/25 hover:to-purple-600/25 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold transition cursor-pointer"
                  title="Point exact street or venue on OpenStreetMap for Discover & Match pairing"
                >
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>Point on OpenStreetMap</span>
                </button>

                {coords.lat != null && coords.lon != null ? (
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 truncate max-w-[130px]">
                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                    <span>{coords.lat.toFixed(3)}°, {coords.lon.toFixed(3)}°</span>
                  </span>
                ) : (
                  <span className="text-[9px] text-gray-500">For Discover matching</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Bio (passions, relationship goals...)"
              className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/60 resize-none"
            />
          </div>

          {/* Phone Number (Contact & M-PESA) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>Phone Number</span>
              </label>
              <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-400" /> Private (Confirmed dates only)
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/60 font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">
              Used for M-PESA payouts and direct cellular calling when a date is mutually confirmed.
            </p>
          </div>

          {/* Dating Interest (Feed & Discovery Matching) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-300 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Interested in Meeting
              </span>
              <span className="text-[10px] text-gray-500">Curates feed & discovery</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Women', value: 'FEMALE' },
                { label: 'Men', value: 'MALE' },
                { label: 'Everyone', value: 'ALL' },
              ].map((opt) => {
                const isSelected = interestedInGenders === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInterestedInGenders(opt.value)}
                    className={`text-[11px] py-1.5 px-2 rounded-xl border text-center font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-[0_2px_8px_rgba(244,63,94,0.2)]'
                        : 'bg-[#161B26] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tonight's Vibe / Availability Pill */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" /> Tonight&apos;s Vibe & Status
              </span>
              <span className="text-[10px] text-gray-500">Pill next to price on card</span>
            </div>

            {/* Custom Vibe Input with Clear Button */}
            <div className="relative flex items-center">
              <input
                type="text"
                maxLength={45}
                value={vibeTag || ''}
                onChange={(e) => setVibeTag(e.target.value.trim() === '' ? null : e.target.value)}
                placeholder="e.g. Spontaneous Drinks, Free Tonight..."
                className="w-full bg-[#161B26] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/60"
              />
              {vibeTag && (
                <button
                  type="button"
                  onClick={() => setVibeTag(null)}
                  className="absolute right-2.5 text-[10px] font-medium text-gray-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Preset Vibe Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                'Spontaneous Drinks',
                'Free Tonight',
                'Dinner & Wine',
                'Late Night Banter',
                'Discreet & Chill',
                'Coffee & Walk',
                'Open to Ideas',
              ].map((preset) => {
                const isSelected = vibeTag === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVibeTag(isSelected ? null : preset)}
                    className={`text-[10px] py-1 px-2.5 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-[#161B26] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Companion Rendezvous Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Companion Fee
              </span>
              <span className="text-[10px] text-gray-500">Shown on card</span>
            </div>

            {/* Custom Amount Input with step="1" to allow any number like 10 KES */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[11px] font-mono font-bold text-gray-400">KES</span>
              <input
                type="number"
                min={0}
                max={500000}
                step={1}
                value={companionRateKes !== null ? companionRateKes : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setCompanionRateKes(val === null || isNaN(val) ? null : val);
                }}
                placeholder="0 (Open to offers)"
                className="w-full bg-[#161B26] border border-gray-800 rounded-xl pl-11 pr-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-500/60"
              />
            </div>

            {/* Quick preset chips in a single clean row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                { label: 'Free / Offers', value: null },
                { label: '10', value: 10 },
                { label: '2,000', value: 2000 },
                { label: '3,500', value: 3500 },
                { label: '5,000', value: 5000 },
              ].map((chip) => {
                const isSelected = companionRateKes === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setCompanionRateKes(chip.value)}
                    className={`text-[10px] py-1 px-2.5 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-[#161B26] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gallery Thumbnails (Compact Strip) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-300">
                Gallery Photos <span className="text-[10px] text-gray-500">({photos.length}/6)</span>
              </span>
              <span className="text-[10px] text-gray-500">Discovery feed</span>
            </div>

            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleGalleryFileSelected}
              className="hidden"
            />

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shrink-0 group"
                >
                  <img src={photo.photoUrl} alt="Gallery" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={deletingPhotoId === photo.id}
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer disabled:opacity-50"
                  >
                    {deletingPhotoId === photo.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 text-rose-400" />
                    )}
                  </button>
                </div>
              ))}

              {photos.length < 6 && (
                <button
                  type="button"
                  disabled={galleryUploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border border-dashed border-gray-700 hover:border-rose-500/60 bg-[#161B26] flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="Add photo"
                >
                  {galleryUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Profile</span>}
          </button>
        </form>

        {/* OpenStreetMap Pin Picker Modal for Profile */}
        {showMapModal && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in select-none">
            <div className="relative w-full max-w-sm bg-[#0E131F] rounded-3xl border border-white/10 p-5 shadow-2xl text-white space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Point Profile Location</h4>
                    <p className="text-[10px] text-slate-400">Used for Discover & Match pairings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition border border-white/[0.08] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <OpenStreetMapPicker
                initialLat={coords.lat ?? user?.profile?.latitude ?? -1.2864}
                initialLon={coords.lon ?? user?.profile?.longitude ?? 36.8172}
                initialCity={locationCity || user?.profile?.locationCity || 'Nairobi, Kenya'}
                autoLocateOnMount={true}
                onConfirmLocation={async ({ latitude, longitude, locationCity: cityName, locationCountry }) => {
                  setLocationCity(cityName);
                  setCoords({ lat: latitude, lon: longitude });
                  setShowMapModal(false);

                  // 1. Persist immediately to user profile via updateProfile (persists to backend & localStorage cache)
                  try {
                    await updateProfile({
                      locationCity: cityName,
                      latitude,
                      longitude,
                      locationCountry,
                    });
                  } catch (e) {
                    console.warn('Profile update warning:', e);
                  }

                  // 2. Also notify dedicated map-location API
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                    if (token) {
                      await fetch('/api/v1/profiles/map-location', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          latitude,
                          longitude,
                          locationCity: cityName,
                          locationCountry,
                        }),
                      });
                    }
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(
                        'socilalink_real_gps',
                        JSON.stringify({ latitude, longitude, cityName, accuracy: 25 })
                      );
                    }
                    setStatusMessage({ type: 'success', text: `Location pinned to ${cityName} on map!` });
                    await refreshUser();
                  } catch (err) {
                    console.warn('Map location API error:', err);
                  }
                }}
                onCancel={() => setShowMapModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

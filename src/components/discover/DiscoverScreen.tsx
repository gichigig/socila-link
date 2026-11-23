'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FilterModal } from './FilterModal';
import { LocationPromptModal } from '../location/LocationPromptModal';
import {
  calculateRealDistanceKm,
  getRealDevicePosition,
  reverseGeocodeRealCoords,
  getApproximateIpLocation,
} from '@/utils/location';
import { CommunityNoteBanner, CommunityNoteData } from '../ui/CommunityNoteBanner';
import { SuggestCommunityNoteModal } from '../safety/SuggestCommunityNoteModal';
import {
  SlidersHorizontal,
  Search,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MapPin,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Calendar,
  Flame,
  Wine,
  Clock,
  Send,
  Zap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Eye,
  Check,
  X,
} from 'lucide-react';

export interface CandidateCard {
  userId: string;
  username: string;
  displayName: string;
  age: number;
  gender: string;
  bio?: string | null;
  avatarUrl: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm: number | null;
  isVerified: boolean;
  profileCompleteness: number;
  photos: {
    id: string;
    photoUrl: string;
    isPrimary: boolean;
    orderIndex: number;
  }[];
  communityNote?: CommunityNoteData | null;
  vibeTag?: string;
  casualPrompt?: string;
  favoriteSpot?: string;
  availabilitySlot?: string;
  companionRateKes?: number;
}

interface DiscoverScreenProps {
  onMatch: (matchData: any) => void;
  isGuest?: boolean;
  onRequestAuth?: () => void;
  showEmbeddedHeader?: boolean;
  onNavigateToDates?: (candidate?: CandidateCard) => void;
  onStartChat?: (partnerId: string, partnerName?: string) => void;
  onOpenProfile?: (userId: string) => void;
}

// Curated social feed profiles in Kenya with real coordinates for dynamic Haversine distance calculations
const PREVIEW_CANDIDATES: CandidateCard[] = [
  {
    userId: 'preview-1',
    username: 'aisha_m',
    displayName: 'Aisha Al-Mansoor',
    age: 26,
    gender: 'FEMALE',
    vibeTag: 'Spontaneous Drinks',
    casualPrompt: 'Out in Westlands tonight. Looking for someone fun for rooftop cocktails, good banters & zero drama',
    favoriteSpot: 'Sarit Rooftop, Westlands',
    availabilitySlot: 'Free Tonight • Westlands',
    companionRateKes: 4500,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900',
    locationCity: 'Westlands, Nairobi',
    locationCountry: 'Kenya',
    latitude: -1.2675,
    longitude: 36.8118,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 100,
    photos: [
      { id: 'p1', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900', isPrimary: true, orderIndex: 0 },
      { id: 'p2', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900', isPrimary: false, orderIndex: 1 },
      { id: 'p3', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900', isPrimary: false, orderIndex: 2 },
    ],
  },
  {
    userId: 'preview-2',
    username: 'chloe_w',
    displayName: 'Chloe Wanjiru',
    age: 25,
    gender: 'FEMALE',
    vibeTag: 'Active Tonight',
    casualPrompt: 'Who wants to grab a late dinner and drinks in Kilimani? Spontaneous, fun energy only',
    favoriteSpot: 'Sierra Brasserie, Yaya',
    availabilitySlot: 'Active Now • Kilimani',
    companionRateKes: 5000,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900',
    locationCity: 'Kilimani, Nairobi',
    locationCountry: 'Kenya',
    latitude: -1.2917,
    longitude: 36.7865,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 95,
    photos: [
      { id: 'p4', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900', isPrimary: true, orderIndex: 0 },
      { id: 'p5', photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=900', isPrimary: false, orderIndex: 1 },
    ],
    communityNote: {
      id: 'cn-preview-1',
      category: 'IDENTITY_MISMATCH',
      content: 'Readers noted: Previous attendees mentioned appearance differs slightly from photo #1 taken 3 years ago. Verify current look on live video before meeting.',
      helpfulCount: 42,
      notHelpfulCount: 3,
      userRating: null,
    },
  },
  {
    userId: 'preview-3',
    username: 'brian_k',
    displayName: 'Brian Otieno',
    age: 29,
    gender: 'MALE',
    vibeTag: 'Late Night Banter',
    casualPrompt: 'Hosting a private lounge session in Lavington. Down for good music, deep talks, and spontaneous chemistry.',
    favoriteSpot: 'Brew Bistro, Ngong Rd',
    availabilitySlot: 'Available Tonight',
    companionRateKes: 4000,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900',
    locationCity: 'Lavington, Nairobi',
    locationCountry: 'Kenya',
    latitude: -1.2806,
    longitude: 36.7686,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 100,
    photos: [
      { id: 'p6', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900', isPrimary: true, orderIndex: 0 },
      { id: 'p7', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900', isPrimary: false, orderIndex: 1 },
    ],
  },
  {
    userId: 'preview-4',
    username: 'sarah_m',
    displayName: 'Sarah Mwangi',
    age: 24,
    gender: 'FEMALE',
    vibeTag: 'Discreet & Chill',
    casualPrompt: 'Cozy night in or a quiet patio drink in Karen. Looking for genuine vibes and someone easy to talk to',
    favoriteSpot: 'Pallet Cafe, Karen',
    availabilitySlot: 'Free This Weekend',
    companionRateKes: 3500,
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
    locationCity: 'Karen, Nairobi',
    locationCountry: 'Kenya',
    latitude: -1.3211,
    longitude: 36.7119,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 90,
    photos: [
      { id: 'p8', photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900', isPrimary: true, orderIndex: 0 },
    ],
  },
  {
    userId: 'preview-5',
    username: 'wendy_k',
    displayName: 'Wendy Kimani',
    age: 25,
    gender: 'FEMALE',
    vibeTag: 'Spontaneous Meetup',
    casualPrompt: 'Chilling in Nakuru tonight. Down for evening drive, sundowner drinks or quiet dinner by the lake.',
    favoriteSpot: 'Java House, Westside Mall, Nakuru',
    availabilitySlot: 'Free Tonight • Nakuru',
    companionRateKes: 3500,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900',
    locationCity: 'Milimani, Nakuru',
    locationCountry: 'Kenya',
    latitude: -0.3031,
    longitude: 36.0800,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 95,
    photos: [
      { id: 'p9', photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900', isPrimary: true, orderIndex: 0 },
    ],
  },
  {
    userId: 'preview-6',
    username: 'neema_h',
    displayName: 'Neema Hassan',
    age: 26,
    gender: 'FEMALE',
    vibeTag: 'Coastal Vibes',
    casualPrompt: 'Beach walk and seafood cocktails in Nyali. Looking for fun, mature companion for dinner.',
    favoriteSpot: 'Tamarind Dhow, Mombasa',
    availabilitySlot: 'Active Now • Mombasa',
    companionRateKes: 4500,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900',
    locationCity: 'Nyali, Mombasa',
    locationCountry: 'Kenya',
    latitude: -4.0435,
    longitude: 39.6682,
    distanceKm: null,
    isVerified: true,
    profileCompleteness: 90,
    photos: [
      { id: 'p10', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900', isPrimary: true, orderIndex: 0 },
    ],
  },
];

/**
 * Calculates exact real-world Haversine distances to each candidate from the user's actual GPS position.
 */
function enrichWithRealDistances(
  candidatesList: CandidateCard[],
  userLat?: number | null,
  userLon?: number | null
): CandidateCard[] {
  if (userLat == null || userLon == null) return candidatesList;

  return candidatesList.map((cand) => {
    let cLat = cand.latitude;
    let cLon = cand.longitude;

    if (cLat == null || cLon == null) {
      const city = (cand.locationCity || '').toLowerCase();
      if (city.includes('westlands')) { cLat = -1.2675; cLon = 36.8118; }
      else if (city.includes('kilimani')) { cLat = -1.2917; cLon = 36.7865; }
      else if (city.includes('lavington')) { cLat = -1.2806; cLon = 36.7686; }
      else if (city.includes('karen')) { cLat = -1.3211; cLon = 36.7119; }
      else if (city.includes('parklands')) { cLat = -1.2612; cLon = 36.8197; }
      else if (city.includes('mombasa') || city.includes('nyali')) { cLat = -4.0435; cLon = 39.6682; }
      else if (city.includes('kisumu')) { cLat = -0.0917; cLon = 34.7680; }
      else if (city.includes('nakuru')) { cLat = -0.3031; cLon = 36.0800; }
      else if (city.includes('eldoret')) { cLat = 0.5143; cLon = 35.2698; }
      else if (city.includes('thika')) { cLat = -1.0333; cLon = 37.0694; }
      else { cLat = -1.2864; cLon = 36.8172; }
    }

    const realDist = calculateRealDistanceKm(userLat, userLon, cLat, cLon);
    return {
      ...cand,
      latitude: cLat,
      longitude: cLon,
      distanceKm: realDist,
    };
  });
}

export function DiscoverScreen({
  onMatch,
  isGuest = false,
  onRequestAuth,
  onNavigateToDates,
  onStartChat,
  onOpenProfile,
}: DiscoverScreenProps) {
  const { user, syncLocation } = useAuth();
  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tonight' | 'nearby' | 'drinks' | 'shortlist'>('all');

  // Restore sub-filter tab from local cache on mount so user stays on same filter tab on refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('socilalink_discover_filter') as any;
      if (savedFilter && ['all', 'tonight', 'nearby', 'drinks', 'shortlist'].includes(savedFilter)) {
        setActiveFilter(savedFilter);
      }
    }
  }, []);

  // Persist discover sub-filter tab to local cache
  useEffect(() => {
    if (typeof window !== 'undefined' && activeFilter) {
      localStorage.setItem('socilalink_discover_filter', activeFilter);
    }
  }, [activeFilter]);

  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [suggestNoteTarget, setSuggestNoteTarget] = useState<CandidateCard | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set());
  const [savedUserIds, setSavedUserIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('socilalink_shortlist_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch (err) {
        console.warn('Error reading shortlist from storage:', err);
      }
    }
    return new Set();
  });

  // Persist shortlist IDs whenever modified
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'socilalink_shortlist_ids',
          JSON.stringify(Array.from(savedUserIds))
        );
      } catch (err) {
        console.warn('Error saving shortlist to storage:', err);
      }
    }
  }, [savedUserIds]);
  const [candidatePhotoIndices, setCandidatePhotoIndices] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-hide top filter pills on scroll down, reveal on scroll up
  const [isDiscoverHeaderVisible, setIsDiscoverHeaderVisible] = useState(true);
  const lastDiscoverScrollRef = useRef(0);

  const handleDiscoverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScroll = e.currentTarget.scrollTop;
    const lastScroll = lastDiscoverScrollRef.current;
    const delta = currentScroll - lastScroll;

    // Do not hide if user is near top
    if (currentScroll <= 15) {
      setIsDiscoverHeaderVisible(true);
      lastDiscoverScrollRef.current = currentScroll;
      return;
    }

    // Guard against iOS elastic bounce at bottom
    if (currentScroll + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 5) {
      return;
    }

    if (Math.abs(delta) > 8) {
      if (delta > 0 && currentScroll > 50) {
        setIsDiscoverHeaderVisible(false);
      } else if (delta < 0) {
        setIsDiscoverHeaderVisible(true);
      }
      lastDiscoverScrollRef.current = currentScroll;
    }
  };

  // Location State & Calibration
  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationPromptReason, setLocationPromptReason] = useState<'initial' | 'under_4km' | 'manual'>('manual');
  const [hasDismissedLocationBanner, setHasDismissedLocationBanner] = useState(false);
  const [activeUserCoords, setActiveUserCoords] = useState<{ lat: number; lon: number } | null>(
    user?.profile?.latitude != null && user?.profile?.longitude != null
      ? { lat: user.profile.latitude, lon: user.profile.longitude }
      : null
  );
  const [locationMethod, setLocationMethod] = useState<'GPS' | 'IP' | null>(
    user?.profile?.latitude != null ? 'GPS' : null
  );
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>(
    user?.profile?.locationCity || 'Nairobi'
  );

  // Filters State
  const [filters, setFilters] = useState<{
    gender?: string;
    minAge?: number;
    maxAge?: number;
    maxDistanceKm?: number;
  }>({
    minAge: 18,
    maxAge: 45,
    maxDistanceKm: 50,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchCandidates = async (overrideCoords?: { lat: number; lon: number }) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.gender) queryParams.set('gender', filters.gender);
      if (filters.minAge) queryParams.set('minAge', String(filters.minAge));
      if (filters.maxAge) queryParams.set('maxAge', String(filters.maxAge));
      if (filters.maxDistanceKm) queryParams.set('maxDistanceKm', String(filters.maxDistanceKm));

      const lat = overrideCoords?.lat ?? activeUserCoords?.lat ?? user?.profile?.latitude;
      const lon = overrideCoords?.lon ?? activeUserCoords?.lon ?? user?.profile?.longitude;
      if (lat != null && lon != null) {
        queryParams.set('lat', String(lat));
        queryParams.set('lon', String(lon));
      }
      queryParams.set('limit', '30');

      const res = await fetch(`/api/v1/discover/feed?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
          const enriched = data.candidates.map((c: any, idx: number) => ({
            ...c,
            vibeTag: c.vibeTag !== undefined ? (c.vibeTag || null) : PREVIEW_CANDIDATES[idx % PREVIEW_CANDIDATES.length].vibeTag,
            casualPrompt: c.casualPrompt || c.bio || PREVIEW_CANDIDATES[idx % PREVIEW_CANDIDATES.length].casualPrompt,
            favoriteSpot: c.favoriteSpot || PREVIEW_CANDIDATES[idx % PREVIEW_CANDIDATES.length].favoriteSpot,
            availabilitySlot: c.availabilitySlot || PREVIEW_CANDIDATES[idx % PREVIEW_CANDIDATES.length].availabilitySlot,
            companionRateKes: c.companionRateKes || PREVIEW_CANDIDATES[idx % PREVIEW_CANDIDATES.length].companionRateKes,
          }));
          setCandidates(enrichWithRealDistances(enriched, lat, lon));
          return;
        }
      }
      setCandidates(enrichWithRealDistances(PREVIEW_CANDIDATES, lat, lon));
    } catch {
      const effectiveLat = overrideCoords?.lat ?? activeUserCoords?.lat;
      const effectiveLon = overrideCoords?.lon ?? activeUserCoords?.lon;
      setCandidates(enrichWithRealDistances(PREVIEW_CANDIDATES, effectiveLat, effectiveLon));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (userInitiated = false) => {
    setLocating(true);

    try {
      // 1. Get real device position with zero cache & high accuracy
      const pos = await getRealDevicePosition();
      const geocoded = await reverseGeocodeRealCoords(pos.latitude, pos.longitude);
      const cityName = geocoded.displayLabel;

      setLocationMethod('GPS');
      setActiveLocationLabel(cityName);
      setActiveUserCoords({ lat: pos.latitude, lon: pos.longitude });

      if (user && syncLocation) {
        await syncLocation({ latitude: pos.latitude, longitude: pos.longitude });
      }

      if (userInitiated) {
        showToast(`Real GPS active: ${cityName} (±${Math.round(pos.accuracy)}m)`);
      }

      setCandidates((prev) => enrichWithRealDistances(prev, pos.latitude, pos.longitude));
      fetchCandidates({ lat: pos.latitude, lon: pos.longitude });
      setLocating(false);
    } catch (err: any) {
      console.warn('[Geolocation Real GPS Failed]:', err);
      setLocationMethod('IP');

      if (user && syncLocation) {
        const res = await syncLocation();
        if (res.success && res.data) {
          const ipCity = res.data.locationCity || 'Nairobi';
          setActiveLocationLabel(ipCity);
          if (userInitiated) {
            showToast(`Approximate location active: ${ipCity}`);
          }
        }
      } else if (userInitiated) {
        showToast('Approximate location active via network IP');
      }

      fetchCandidates();
      setLocating(false);
    }
  };

  const handleLocationSuccess = (result: {
    latitude: number;
    longitude: number;
    locationCity?: string;
    locationCountry?: string;
    accuracyMeters?: number;
    method: 'GPS' | 'IP';
  }) => {
    setLocationMethod(result.method);
    setActiveUserCoords({ lat: result.latitude, lon: result.longitude });
    if (result.locationCity) {
      setActiveLocationLabel(result.locationCity);
    }
    // Recompute real distances immediately on current candidate cards
    setCandidates((prev) => enrichWithRealDistances(prev, result.latitude, result.longitude));
    fetchCandidates({ lat: result.latitude, lon: result.longitude });

    // If modal was prompted because user tapped Under 4 km, automatically activate Under 4 km tab!
    if (locationPromptReason === 'under_4km') {
      setActiveFilter('nearby');
    }

    showToast(
      result.method === 'GPS'
        ? `Real GPS active: ${result.locationCity || 'Nearby'}${result.accuracyMeters ? ` (±${result.accuracyMeters}m)` : ''}`
        : `Approximate location active: ${result.locationCity || 'Nairobi'}`
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = sessionStorage.getItem('socilalink_location_banner_dismissed') === 'true';
    if (dismissed) setHasDismissedLocationBanner(true);

    const initializeLocation = async () => {
      // 1. Check if user already has verified real GPS saved in localStorage
      const cachedGpsStr = localStorage.getItem('socilalink_real_gps');
      if (cachedGpsStr) {
        try {
          const cached = JSON.parse(cachedGpsStr);
          if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number') {
            setLocationMethod('GPS');
            setActiveUserCoords({ lat: cached.latitude, lon: cached.longitude });
            if (cached.cityName) setActiveLocationLabel(cached.cityName);
            setCandidates((prev) => enrichWithRealDistances(prev, cached.latitude, cached.longitude));
            fetchCandidates({ lat: cached.latitude, lon: cached.longitude });
            return;
          }
        } catch {
          // ignore parsing error
        }
      }

      // 2. Check if browser geolocation permission is already granted for silent GPS fix
      if ('permissions' in navigator) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (perm.state === 'granted') {
            try {
              const pos = await getRealDevicePosition();
              const geocoded = await reverseGeocodeRealCoords(pos.latitude, pos.longitude);
              setLocationMethod('GPS');
              setActiveLocationLabel(geocoded.displayLabel);
              setActiveUserCoords({ lat: pos.latitude, lon: pos.longitude });
              setCandidates((prev) => enrichWithRealDistances(prev, pos.latitude, pos.longitude));
              fetchCandidates({ lat: pos.latitude, lon: pos.longitude });
              return;
            } catch (gpsErr) {
              console.warn('[Silent GPS Read Error]:', gpsErr);
            }
          }
        } catch {
          // navigator.permissions query not supported
        }
      }

      // 3. User has NOT granted GPS -> Silently auto-detect approximate IP location on page load
      if (!user?.profile?.latitude || !user?.profile?.longitude) {
        try {
          const ipLoc = await getApproximateIpLocation();
          setLocationMethod('IP');
          setActiveLocationLabel(user?.profile?.locationCity || ipLoc.locationCity);
          setActiveUserCoords({ lat: ipLoc.latitude, lon: ipLoc.longitude });
          setCandidates((prev) => enrichWithRealDistances(prev, ipLoc.latitude, ipLoc.longitude));
          fetchCandidates({ lat: ipLoc.latitude, lon: ipLoc.longitude });

          // If logged in, quietly synchronize with backend profile ONLY if user has no location set yet
          if (user && syncLocation && !user?.profile?.locationCity) {
            syncLocation({
              latitude: ipLoc.latitude,
              longitude: ipLoc.longitude,
              locationCity: ipLoc.locationCity,
              locationCountry: ipLoc.locationCountry,
            }).catch(() => {});
          }
        } catch (ipErr) {
          console.warn('[Auto IP Geolocation failed]:', ipErr);
        }
      }
    };

    initializeLocation();
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [filters, user?.profile?.latitude]);

  const handleToggleLike = async (candidate: CandidateCard) => {
    if (isGuest) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Sign up in 30 seconds to like and text!');
      return;
    }

    const hasLiked = likedUserIds.has(candidate.userId);
    setLikedUserIds((prev) => {
      const next = new Set(prev);
      if (hasLiked) {
        next.delete(candidate.userId);
        showToast('Like removed');
      } else {
        next.add(candidate.userId);
        showToast(`Sent a spark to ${candidate.displayName}!`);
      }
      return next;
    });

    if (!hasLiked) {
      try {
        const res = await fetch('/api/v1/discover/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: candidate.userId }),
        });
        const data = await res.json();
        if (res.ok && data.isMutualMatch) {
          onMatch(data);
        }
      } catch (err) {
        console.error('Like failed:', err);
      }
    }
  };

  const handleToggleBookmark = (candidateId: string) => {
    setSavedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
        showToast('Removed from saved profiles');
      } else {
        next.add(candidateId);
        showToast('Saved to your private shortlist!');
      }
      return next;
    });
  };

  const handleTextUser = (candidate: CandidateCard) => {
    if (isGuest) {
      if (onRequestAuth) onRequestAuth();
      else showToast('Create an account to start texting right away!');
      return;
    }

    if (onStartChat) {
      onStartChat(candidate.userId, candidate.displayName);
    } else {
      showToast(`Opening chat with ${candidate.displayName}...`);
    }
  };

  const handleFlipPhoto = (candidateId: string, totalPhotos: number, direction: 'next' | 'prev') => {
    setCandidatePhotoIndices((prev) => {
      const current = prev[candidateId] || 0;
      const next = direction === 'next' ? (current + 1) % totalPhotos : (current === 0 ? totalPhotos - 1 : current - 1);
      return { ...prev, [candidateId]: next };
    });
  };

  // ----------------------------------------------------
  // Dynamic Tab Matching Logic (Free Tonight, Under 4km, Drinks)
  // ----------------------------------------------------
  const matchesTonight = (c: CandidateCard): boolean => {
    const text = [
      c.vibeTag || '',
      c.availabilitySlot || '',
      c.casualPrompt || '',
      c.bio || '',
    ].join(' ').toLowerCase();

    const tonightKeywords = [
      'tonight',
      'today',
      'active now',
      'free tonight',
      'available tonight',
      'spontaneous',
      'evening',
      'late night',
      'right now',
      'night out',
      'after work',
    ];

    return tonightKeywords.some((kw) => text.includes(kw));
  };

  const matchesNearby = (c: CandidateCard): boolean => {
    return c.distanceKm != null && c.distanceKm <= 4.0;
  };

  const matchesDrinks = (c: CandidateCard): boolean => {
    const text = [
      c.vibeTag || '',
      c.casualPrompt || '',
      c.favoriteSpot || '',
      c.bio || '',
    ].join(' ').toLowerCase();

    const drinksKeywords = [
      'drink',
      'cocktail',
      'wine',
      'beer',
      'bar',
      'lounge',
      'rooftop',
      'bistro',
      'brew',
      'pub',
      'brasserie',
      'sip',
      'martini',
      'whiskey',
      'gin',
      'tequila',
      'mocktail',
      'club',
    ];

    return drinksKeywords.some((kw) => text.includes(kw));
  };

  // Exclude current authenticated user's own profile card from discovery candidate cards
  const availableCandidates = React.useMemo(() => {
    if (!user?.id) return candidates;
    return candidates.filter((c) => c.userId !== user.id);
  }, [candidates, user?.id]);

  // Tab counts for reactive badges
  const countAll = availableCandidates.length;
  const countTonight = availableCandidates.filter(matchesTonight).length;
  const countNearby = availableCandidates.filter(matchesNearby).length;
  const countDrinks = availableCandidates.filter(matchesDrinks).length;
  const countShortlist = availableCandidates.filter((c) => savedUserIds.has(c.userId)).length;

  const hasUserLocation =
    locationMethod === 'GPS' ||
    locationMethod === 'IP' ||
    activeUserCoords != null ||
    (user?.profile?.latitude != null && user?.profile?.longitude != null);

  const handleFilterTab = (tab: 'all' | 'tonight' | 'nearby' | 'drinks' | 'shortlist') => {
    if (tab === 'shortlist') {
      setActiveFilter('shortlist');
      if (countShortlist > 0) {
        showToast(`Shortlist: Showing ${countShortlist} saved profile${countShortlist > 1 ? 's' : ''}`);
      } else {
        showToast('Your shortlist is currently empty');
      }
      return;
    }

    if (tab === 'nearby') {
      if (!hasUserLocation) {
        setLocationPromptReason('under_4km');
        setIsLocationModalOpen(true);
        showToast('Please set your location to view singles under 4 km');
        return;
      }
      setActiveFilter('nearby');
      if (countNearby > 0) {
        showToast(`Under 4 km: ${countNearby} singles closest to your location`);
      } else {
        showToast('Showing closest singles sorted by proximity');
      }
      return;
    }

    setActiveFilter(tab);
    if (tab === 'all') {
      showToast(`Showing all singles (${candidates.length})`);
    } else if (tab === 'tonight') {
      showToast(`Free Tonight: ${countTonight} singles ready for spontaneous plans`);
    } else if (tab === 'drinks') {
      showToast(`Drinks & Lounges: ${countDrinks} singles down for cocktails & drinks`);
    }
  };

  const filteredCandidates = React.useMemo(() => {
    let list = [...availableCandidates];
    if (activeFilter === 'shortlist') {
      list = list.filter((c) => savedUserIds.has(c.userId));
    } else if (activeFilter === 'tonight') {
      list = list.filter(matchesTonight);
    } else if (activeFilter === 'drinks') {
      list = list.filter(matchesDrinks);
    } else if (activeFilter === 'nearby') {
      const strictlyNearby = list.filter(matchesNearby);
      if (strictlyNearby.length > 0) {
        list = strictlyNearby;
      } else {
        // Fallback: if no candidate is <= 4km, show candidates with known distance
        list = list.filter((c) => c.distanceKm != null);
      }
      // Strictly sort ascending by proximity (closest at top)
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }
    return list;
  }, [availableCandidates, activeFilter, savedUserIds]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col h-full w-full select-none overflow-hidden">
      {/* 1. TOP FEED BAR: Filter pills & Search */}
      <div
        className={`flex items-center justify-between px-1 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isDiscoverHeaderVisible
            ? 'max-h-20 opacity-100 py-1 mb-2'
            : 'max-h-0 opacity-0 py-0 mb-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'all'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>All Singles</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {countAll}
            </span>
          </button>

          <button
            onClick={() => handleFilterTab('tonight')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'tonight'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Free Tonight</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeFilter === 'tonight' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {countTonight}
            </span>
          </button>

          <button
            onClick={() => handleFilterTab('nearby')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'nearby'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
            title={!hasUserLocation ? 'Set location to filter singles under 4 km' : 'Singles within 4 km'}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Under 4 km</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeFilter === 'nearby' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {hasUserLocation ? countNearby : 'Set'}
            </span>
          </button>

          <button
            onClick={() => handleFilterTab('drinks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'drinks'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wine className="w-3.5 h-3.5 text-purple-400" />
            <span>Drinks</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeFilter === 'drinks' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {countDrinks}
            </span>
          </button>

          <button
            onClick={() => handleFilterTab('shortlist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'shortlist'
                ? 'gradient-brand text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
            title="View your privately shortlisted singles"
          >
            <Bookmark className={`w-3.5 h-3.5 ${countShortlist > 0 ? 'text-amber-400 fill-amber-400/20' : 'text-slate-400'}`} />
            <span>Shortlist</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeFilter === 'shortlist' ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {countShortlist}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="w-9 h-9 rounded-2xl bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 flex items-center justify-center transition border border-white/[0.08] cursor-pointer"
            title="Discovery Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent GPS Permission Prompt Banner if not high-accuracy GPS */}
      {locationMethod !== 'GPS' && !hasDismissedLocationBanner && (
        <div className="flex items-center justify-between p-3 mb-2 rounded-2xl bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-transparent border border-rose-500/30 text-xs shrink-0 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-sm">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
            <div className="truncate">
              <p className="font-bold text-white truncate">Enable GPS for Under 4 km & Nearby Singles</p>
              <p className="text-[11px] text-slate-300 truncate">Pair with singles in Westlands, Kilimani & your neighborhood.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={() => {
                setLocationPromptReason('initial');
                setIsLocationModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl gradient-brand text-white font-bold text-[11px] shadow-md shadow-rose-500/25 hover:brightness-110 active:scale-95 transition cursor-pointer whitespace-nowrap"
            >
              Allow GPS
            </button>
            <button
              onClick={() => {
                setHasDismissedLocationBanner(true);
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('socilalink_location_banner_dismissed', 'true');
                }
              }}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Location Status Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[220px]">
            {activeLocationLabel}
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            {locationMethod === 'GPS'
              ? '• High-Accuracy GPS'
              : locationMethod === 'IP'
              ? '• IP Geolocation'
              : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleUpdateLocation(true)}
            disabled={locating}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500/15 to-purple-500/15 hover:from-rose-500/25 hover:to-purple-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold transition cursor-pointer disabled:opacity-50"
            title="Detect and synchronize location via GPS"
          >
            <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Locating...' : 'GPS'}</span>
          </button>
        </div>
      </div>

      {/* Active Tab Filter Context Strip */}
      {activeFilter !== 'all' && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            {activeFilter === 'tonight' && <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            {activeFilter === 'nearby' && <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            {activeFilter === 'drinks' && <Wine className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
            <span className="font-semibold truncate">
              {activeFilter === 'tonight' && `Free Tonight: ${filteredCandidates.length} singles available for spontaneous plans`}
              {activeFilter === 'nearby' && (
                countNearby > 0
                  ? `Under 4 km: ${filteredCandidates.length} singles within 4 km (closest first)`
                  : `Closest Available: ${filteredCandidates.length} singles sorted by proximity`
              )}
              {activeFilter === 'drinks' && `Drinks & Lounges: ${filteredCandidates.length} singles looking for drinks & cocktails`}
            </span>
          </div>
          <button
            onClick={() => handleFilterTab('all')}
            className="text-[10px] text-rose-300 hover:text-white underline font-bold cursor-pointer shrink-0 ml-2"
          >
            Show All
          </button>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="absolute top-12 left-4 right-4 z-40 p-3 rounded-2xl glass-panel text-xs text-white text-center shadow-xl animate-fade-in flex items-center justify-center gap-2 border border-rose-500/30">
          <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SOCIAL MEDIA STYLE SCROLLING FEED                     */}
      {/* ======================================================== */}
      <div
        onScroll={handleDiscoverScroll}
        className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-10 no-scrollbar"
      >
        {loading ? (
          <div className="space-y-4 max-w-lg mx-auto">
            {[1, 2].map((i) => (
              <div key={i} className="w-full rounded-[28px] glass-card border border-white/10 p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/10" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-32 h-4 bg-white/10 rounded-md" />
                    <div className="w-20 h-3 bg-white/10 rounded-md" />
                  </div>
                </div>
                <div className="w-full h-80 bg-white/10 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="max-w-md mx-auto py-16 text-center space-y-3">
            {activeFilter === 'tonight' ? (
              <>
                <Flame className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No singles marked free tonight</h3>
                <p className="text-xs text-slate-400">Be the first to set your availability or explore all singles.</p>
              </>
            ) : activeFilter === 'nearby' ? (
              <>
                <MapPin className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No singles within 4 km</h3>
                <p className="text-xs text-slate-400">Refine your GPS location or browse all nearby singles.</p>
              </>
            ) : activeFilter === 'drinks' ? (
              <>
                <Wine className="w-12 h-12 text-purple-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No drinks dates found</h3>
                <p className="text-xs text-slate-400">Check 'Free Tonight' or browse all singles looking for meetups.</p>
              </>
            ) : activeFilter === 'shortlist' ? (
              <>
                <Bookmark className="w-12 h-12 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Your shortlist is empty</h3>
                <p className="text-xs text-slate-400">Tap the bookmark button on any candidate card to save them to your private list.</p>
              </>
            ) : (
              <>
                <Flame className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No one nearby right now</h3>
                <p className="text-xs text-slate-400">Expand your distance or age filters to meet more people.</p>
              </>
            )}
            <button
              onClick={() => handleFilterTab('all')}
              className="py-2 px-4 rounded-xl gradient-brand text-white text-xs font-bold transition cursor-pointer"
            >
              View All Singles ({countAll})
            </button>
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const allPhotos = [
              ...(candidate.avatarUrl ? [candidate.avatarUrl] : []),
              ...candidate.photos.map((p) => p.photoUrl),
            ];
            const currentPhotoIdx = candidatePhotoIndices[candidate.userId] || 0;
            const activePhoto = allPhotos[currentPhotoIdx] || candidate.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900';
            const isLiked = likedUserIds.has(candidate.userId);
            const isSaved = savedUserIds.has(candidate.userId);

            return (
              <article
                key={candidate.userId}
                className="w-full max-w-lg mx-auto rounded-[28px] glass-card border border-white/10 overflow-hidden shadow-2xl transition hover:border-white/20"
              >
                {/* 1. Header: Avatar, Name, Proximity, Context Button */}
                <div className="p-3.5 flex items-center justify-between">
                  <div
                    onClick={() => onOpenProfile && onOpenProfile(candidate.userId)}
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group"
                    title={`View ${candidate.displayName}'s profile & photos`}
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-rose-500/50 shadow-md group-hover:border-rose-400 transition">
                      <img
                        src={candidate.avatarUrl || activePhoto}
                        alt={candidate.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white tracking-tight group-hover:text-rose-300 transition">
                          {candidate.displayName}, {candidate.age}
                        </span>
                        {candidate.isVerified && (
                          <div title="Verified Profile">
                            <ShieldCheck className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{candidate.locationCity || 'Nairobi'}</span>
                        {candidate.distanceKm != null && (
                          candidate.distanceKm <= 2.0 ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{candidate.distanceKm} km away</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">• {candidate.distanceKm} km away</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View Profile Button */}
                    <button
                      onClick={() => onOpenProfile && onOpenProfile(candidate.userId)}
                      className="py-1 px-2.5 rounded-full bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-white text-[10px] font-bold border border-white/10 transition cursor-pointer"
                      title="View full profile & photos"
                    >
                      Profile
                    </button>
                    {/* Companion Rendezvous Rate Badge */}
                    <button
                      onClick={() => onNavigateToDates && onNavigateToDates(candidate)}
                      className="py-1 px-2.5 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer"
                      title="Book date & fund escrow directly"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{candidate.companionRateKes ? `KES ${candidate.companionRateKes.toLocaleString()}` : 'Open to Offers'}</span>
                    </button>

                    {/* Status Pill */}
                    {candidate.vibeTag && (
                      <span className="py-1 px-2.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                        {candidate.vibeTag}
                      </span>
                    )}

                    <button
                      onClick={() => setSuggestNoteTarget(candidate)}
                      className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                      title="Suggest Community Note / Authenticity Context"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Photo Media (Edge to edge, full-bleed dating card with top-weighted framing) */}
                <div
                  onDoubleClick={() => handleToggleLike(candidate)}
                  className="relative w-full aspect-[4/5] bg-slate-950 overflow-hidden cursor-pointer group"
                >
                  <img
                    src={activePhoto}
                    alt={candidate.displayName}
                    className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-[1.01]"
                  />

                  {/* Multi-photo Navigation Indicator */}
                  {allPhotos.length > 1 && (
                    <div className="absolute top-3 inset-x-3 flex gap-1 z-20">
                      {allPhotos.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i === currentPhotoIdx ? 'bg-white shadow-sm' : 'bg-white/30 backdrop-blur-sm'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Invisible Left / Right tap zones to flip photos */}
                  {allPhotos.length > 1 && (
                    <div className="absolute inset-0 z-10 flex">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFlipPhoto(candidate.userId, allPhotos.length, 'prev');
                        }}
                        className="w-1/2 h-full hover:bg-white/[0.01] transition"
                        title="Previous photo"
                      />
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFlipPhoto(candidate.userId, allPhotos.length, 'next');
                        }}
                        className="w-1/2 h-full hover:bg-white/[0.01] transition"
                        title="Next photo"
                      />
                    </div>
                  )}

                  {/* Photo Counter Pill in bottom right */}
                  {allPhotos.length > 1 && (
                    <div className="absolute bottom-3 right-3 z-20 py-1 px-2.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-mono border border-white/15">
                      {currentPhotoIdx + 1}/{allPhotos.length}
                    </div>
                  )}
                </div>

                {/* 3. Direct Engagement Bar: LIKE + ONE-TAP TEXT BUTTON */}
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Heart / Spark Button */}
                      <button
                        onClick={() => handleToggleLike(candidate)}
                        className={`p-2 rounded-2xl transition cursor-pointer flex items-center gap-1.5 ${
                          isLiked ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.06] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400'
                        }`}
                        title="Send Spark"
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* THE HERO ACTION: ONE-TAP TEXT BUTTON */}
                      <button
                        onClick={() => handleTextUser(candidate)}
                        className="py-2 px-4 rounded-2xl gradient-brand text-white text-xs font-black transition shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 flex items-center gap-2 cursor-pointer"
                        title={`Text ${candidate.displayName}`}
                      >
                        <MessageCircle className="w-4 h-4 fill-white/20" />
                        <span>Text {candidate.displayName.split(' ')[0]}</span>
                      </button>

                      {/* Date / Rendezvous Button with Direct Rate */}
                      {onNavigateToDates && (
                        <button
                          onClick={() => onNavigateToDates(candidate)}
                          className="py-2 px-3.5 rounded-2xl bg-gradient-to-r from-rose-500/20 to-purple-600/20 hover:from-rose-500/30 hover:to-purple-600/30 text-rose-200 text-xs font-bold transition border border-rose-500/30 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title={`Book date & fund escrow for ${candidate.displayName}`}
                        >
                          <Wine className="w-3.5 h-3.5 text-rose-400" />
                          <span>{candidate.companionRateKes ? `Meet • KES ${candidate.companionRateKes.toLocaleString()}` : 'Meet Up'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBookmark(candidate.userId)}
                        className="p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-rose-400 transition cursor-pointer"
                        title="Bookmark"
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* 4. Casual Prompt & Vibe */}
                  {candidate.casualPrompt && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-200 leading-relaxed font-normal">
                        <span className="font-bold text-white mr-1.5">@{candidate.username}</span>
                        {candidate.casualPrompt}
                      </p>
                    </div>
                  )}

                  {/* Favorite hangout spot chip */}
                  {candidate.favoriteSpot && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Wine className="w-3.5 h-3.5 text-rose-400" />
                      <span>Rendezvous Spot: <strong className="text-slate-200">{candidate.favoriteSpot}</strong></span>
                    </div>
                  )}

                  {/* 5. Community Authenticity Note Banner (if present) */}
                  {candidate.communityNote && (
                    <div className="pt-1">
                      <CommunityNoteBanner note={candidate.communityNote} />
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialFilters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setIsFilterOpen(false);
        }}
      />

      {/* Suggest Community Note Modal */}
      {suggestNoteTarget && (
        <SuggestCommunityNoteModal
          isOpen={!!suggestNoteTarget}
          onClose={() => setSuggestNoteTarget(null)}
          targetType="PROFILE"
          targetId={suggestNoteTarget.userId}
          targetName={suggestNoteTarget.displayName}
          onSuccess={() => {
            showToast('Authenticity note submitted for review');
          }}
        />
      )}
      {/* Location Permission Prompt Modal */}
      <LocationPromptModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSuccess={handleLocationSuccess}
        activeCity={activeLocationLabel}
        triggerReason={locationPromptReason}
      />
    </div>
  );
}

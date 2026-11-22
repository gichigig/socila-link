'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getApproximateIpLocation } from '@/utils/location';

export interface UserProfile {
  id: string;
  displayName: string;
  dateOfBirth: string;
  gender: string;
  bio?: string | null;
  avatarUrl?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerified: boolean;
  dobConfirmed?: boolean;
  profileCompleteness: number;
  discoveryVisible: boolean;
  companionRateKes?: number | null;
  vibeTag?: string | null;
  photos?: Array<{ id: string; photoUrl: string; isPrimary: boolean; orderIndex: number }>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: UserProfile | null;
  wallet?: { balanceKes: number; escrowBalanceKes?: number } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (payload: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile> & { phone?: string | null }) => Promise<{ success: boolean; error?: string }>;
  syncLocation: (coords?: {
    latitude?: number;
    longitude?: number;
    locationCity?: string;
    locationCountry?: string;
  }) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
  confirmAge: (data: {
    dateOfBirth: string;
    gender: string;
    interestedInGenders?: string;
    relationshipIntentions?: string;
    bio?: string;
    companionRateKes?: number | null;
  }) => Promise<{ success: boolean; error?: string }>;
  unreadMessagesCount: number;
  refreshUnreadCount: () => Promise<void>;
  activeDatesCount: number;
  refreshActiveDatesCount: () => Promise<void>;
  setActiveDatesCount: React.Dispatch<React.SetStateAction<number>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [activeDatesCount, setActiveDatesCount] = useState<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/v1/conversations/unread-count', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.count === 'number') {
          setUnreadMessagesCount(data.count);
        }
      } else if (res.status === 401) {
        setUnreadMessagesCount(0);
      }
    } catch {
      // background polling error ignored
    }
  }, []);

  const refreshActiveDatesCount = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/v1/dates/active-count', {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.count === 'number') {
          setActiveDatesCount(data.count);
        }
      } else if (res.status === 401) {
        setActiveDatesCount(0);
      }
    } catch {
      // background polling error ignored
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      setActiveDatesCount(0);
      return;
    }

    refreshUnreadCount();
    refreshActiveDatesCount();

    // Relaxed 30-second fallback interval (real-time updates are pushed instantaneously via WebSockets)
    const interval = setInterval(() => {
      refreshUnreadCount();
      refreshActiveDatesCount();
    }, 30000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshUnreadCount();
        refreshActiveDatesCount();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      }
    };
  }, [user, refreshUnreadCount, refreshActiveDatesCount]);

  const refreshUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/v1/auth/me', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          // Restore cached profile data (e.g. locationCity & coordinates) if server omitted them
          let cachedProfile: any = null;
          if (typeof window !== 'undefined') {
            try {
              const cachedStr = localStorage.getItem('socilalink_cached_profile');
              if (cachedStr) cachedProfile = JSON.parse(cachedStr);
            } catch {}
          }

          const serverProfile = data.data.profile || {};
          const mergedProfile: UserProfile = {
            ...cachedProfile,
            ...serverProfile,
            locationCity: serverProfile.locationCity || cachedProfile?.locationCity || null,
            locationCountry: serverProfile.locationCountry || cachedProfile?.locationCountry || null,
            latitude: serverProfile.latitude ?? cachedProfile?.latitude ?? null,
            longitude: serverProfile.longitude ?? cachedProfile?.longitude ?? null,
          };

          setUser({
            ...data.data.user,
            profile: mergedProfile,
          });

          if (typeof window !== 'undefined' && mergedProfile.locationCity) {
            localStorage.setItem('socilalink_cached_profile', JSON.stringify(mergedProfile));
          }
          return;
        }
      }
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('socilalink_cached_profile');
      }
      setUser(null);
    } catch (err) {
      console.error('Failed to fetch auth state', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string, rememberMe = true) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.data.token);
        document.cookie = `auth_token=${data.data.token}; path=/; max-age=2592000; SameSite=Lax`;
      }
      setUser({
        ...data.data.user,
        profile: data.data.profile,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Network connection error' };
    }
  };

  const register = async (payload: any) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const detail = data.details ? data.details.map((d: any) => d.message).join('. ') : data.error;
        return { success: false, error: detail || 'Registration failed' };
      }
      if (data.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.data.token);
        document.cookie = `auth_token=${data.data.token}; path=/; max-age=2592000; SameSite=Lax`;
      }
      setUser({
        ...data.data.user,
        profile: data.data.profile,
      });
      return { success: true };
    } catch {
      return { success: false, error: 'Network connection error' };
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<UserProfile> & { phone?: string | null }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/profiles/me', {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to update profile' };
      }

      const updatedProfile = resData.data;
      if (user) {
        setUser({
          ...user,
          phone: resData.phone !== undefined ? resData.phone : data.phone !== undefined ? (data.phone || '') : user.phone,
          profile: updatedProfile,
        });
      }

      // Persist to local cache so page refresh immediately retains location & profile info
      if (typeof window !== 'undefined') {
        localStorage.setItem('socilalink_cached_profile', JSON.stringify(updatedProfile));
        if (updatedProfile.latitude != null && updatedProfile.longitude != null) {
          localStorage.setItem(
            'socilalink_real_gps',
            JSON.stringify({
              latitude: updatedProfile.latitude,
              longitude: updatedProfile.longitude,
              cityName: updatedProfile.locationCity,
              accuracy: 25,
            })
          );
        }
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Network connection error' };
    }
  };

  const confirmAge = async (data: {
    dateOfBirth: string;
    gender: string;
    interestedInGenders?: string;
    relationshipIntentions?: string;
    bio?: string;
    companionRateKes?: number | null;
  }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/profiles/confirm-age', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Failed to confirm age' };
      }
      if (resData.data?.user) {
        setUser({
          ...resData.data.user,
          profile: resData.data.profile,
        });
        if (typeof window !== 'undefined' && resData.data.profile) {
          localStorage.setItem('socilalink_cached_profile', JSON.stringify(resData.data.profile));
        }
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network connection error' };
    }
  };

  const syncLocation = async (coords?: {
    latitude?: number;
    longitude?: number;
    locationCity?: string;
    locationCountry?: string;
  }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. First try /api/v1/profiles/detect-location (the deployed endpoint on Heroku)
      let res = await fetch('/api/v1/profiles/detect-location', {
        method: 'POST',
        headers,
        body: JSON.stringify(coords || {}),
      });

      // 2. If 404, fallback to /api/v1/discover/resolve-location
      if (res.status === 404) {
        res = await fetch('/api/v1/discover/resolve-location', {
          method: 'POST',
          headers,
          body: JSON.stringify(coords || {}),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (user && user.profile) {
            setUser((prev) => {
              if (!prev || !prev.profile) return prev;
              const mergedCity = coords?.locationCity || data.data.locationCity || prev.profile.locationCity;
              const updatedProfile = {
                ...prev.profile,
                latitude: data.data.latitude ?? prev.profile.latitude,
                longitude: data.data.longitude ?? prev.profile.longitude,
                locationCity: mergedCity,
                locationCountry: data.data.locationCountry || prev.profile.locationCountry,
              };
              if (typeof window !== 'undefined' && mergedCity) {
                localStorage.setItem('socilalink_cached_profile', JSON.stringify(updatedProfile));
              }
              return {
                ...prev,
                profile: updatedProfile,
              };
            });
          }
          return { success: true, data: data.data };
        }
      }

      // 3. Fallback: Browser direct IP resolution if server endpoint is unreachable
      const clientIpLoc = await getApproximateIpLocation();
      const fallbackData = {
        latitude: coords?.latitude ?? clientIpLoc.latitude,
        longitude: coords?.longitude ?? clientIpLoc.longitude,
        locationCity: coords?.locationCity ?? clientIpLoc.locationCity,
        locationCountry: coords?.locationCountry ?? clientIpLoc.locationCountry,
        method: coords?.latitude ? ('GPS' as const) : ('IP' as const),
      };

      if (user && user.profile) {
        setUser((prev) => {
          if (!prev || !prev.profile) return prev;
          const mergedCity = coords?.locationCity || prev.profile.locationCity || fallbackData.locationCity;
          const updatedProfile = {
            ...prev.profile,
            latitude: fallbackData.latitude,
            longitude: fallbackData.longitude,
            locationCity: mergedCity,
            locationCountry: coords?.locationCountry || prev.profile.locationCountry || fallbackData.locationCountry,
          };
          if (typeof window !== 'undefined' && mergedCity) {
            localStorage.setItem('socilalink_cached_profile', JSON.stringify(updatedProfile));
          }
          return {
            ...prev,
            profile: updatedProfile,
          };
        });
      }
      return { success: true, data: fallbackData };
    } catch {
      // 4. Ultimate graceful fallback
      const clientIpLoc = await getApproximateIpLocation();
      return {
        success: true,
        data: {
          latitude: clientIpLoc.latitude,
          longitude: clientIpLoc.longitude,
          locationCity: clientIpLoc.locationCity,
          locationCountry: clientIpLoc.locationCountry,
          method: 'IP' as const,
        },
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        syncLocation,
        confirmAge,
        unreadMessagesCount,
        refreshUnreadCount,
        activeDatesCount,
        refreshActiveDatesCount,
        setActiveDatesCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


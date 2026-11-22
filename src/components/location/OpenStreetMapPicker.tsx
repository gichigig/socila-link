'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Loader2,
  Check,
  Search,
  Sparkles,
  Compass,
  Layers,
  Crosshair,
  LocateFixed,
} from 'lucide-react';
import {
  reverseGeocodeRealCoords,
  POPULAR_KENYA_HUBS,
  geocodeCityOrAddress,
  getRealDevicePosition,
  getApproximateIpLocation,
} from '@/utils/location';

export interface OpenStreetMapPickerProps {
  initialLat?: number;
  initialLon?: number;
  initialCity?: string;
  autoLocateOnMount?: boolean;
  confirmButtonText?: string;
  onConfirmLocation: (result: {
    latitude: number;
    longitude: number;
    locationCity: string;
    locationCountry: string;
  }) => void;
  onCancel?: () => void;
}

export function OpenStreetMapPicker({
  initialLat = -1.2864,
  initialLon = 36.8172,
  initialCity = 'Nairobi, Kenya',
  autoLocateOnMount = true,
  confirmButtonText,
  onConfirmLocation,
  onCancel,
}: OpenStreetMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const userGpsMarkerRef = useRef<any>(null);
  const userToPinPathRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: initialLat,
    lon: initialLon,
  });
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [resolvedCity, setResolvedCity] = useState<string>(initialCity);
  const [isResolvingName, setIsResolvingName] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'IP' | 'MANUAL' | 'INITIAL'>('INITIAL');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapTheme, setMapTheme] = useState<'dark' | 'standard'>('dark');

  // Reverse geocodes coordinates to street/neighborhood name
  const updateAddressForCoords = async (lat: number, lon: number) => {
    setIsResolvingName(true);
    try {
      const res = await reverseGeocodeRealCoords(lat, lon);
      setResolvedCity(res.displayLabel || 'Custom Pin Location');
    } catch {
      setResolvedCity(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    } finally {
      setIsResolvingName(false);
    }
  };

  // Queries device location, flies to user's tile, and repositions the pin
  const locateUserAndFly = async (animate = true) => {
    setIsLocatingUser(true);

    try {
      // 1. Try real hardware GPS first (fresh fix)
      const pos = await getRealDevicePosition();
      const lat = pos.latitude;
      const lon = pos.longitude;
      const accuracy = Math.round(pos.accuracy);

      setGpsAccuracy(accuracy);
      setLocationSource('GPS');
      setCurrentCoords({ lat, lon });
      setUserGpsCoords({ lat, lon });

      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      const L = (window as any).L;

      if (map && marker) {
        if (animate) {
          map.flyTo([lat, lon], 16, { duration: 1.2 });
        } else {
          map.setView([lat, lon], 16);
        }
        marker.setLatLng([lat, lon]);

        // Draw or update the accuracy halo circle
        if (L) {
          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
            accuracyCircleRef.current = null;
          }
          const circle = L.circle([lat, lon], {
            radius: Math.max(accuracy, 20),
            color: '#f43f5e',
            weight: 1.5,
            opacity: 0.8,
            fillColor: '#f43f5e',
            fillOpacity: 0.12,
          }).addTo(map);
          accuracyCircleRef.current = circle;
        }
      }

      await updateAddressForCoords(lat, lon);
    } catch (gpsErr) {
      console.warn('[Map Geolocation Notice]: Device GPS not available, trying network IP fallback:', gpsErr);

      // 2. Fallback to approximate network IP
      try {
        const ipLoc = await getApproximateIpLocation();
        setLocationSource('IP');
        setCurrentCoords({ lat: ipLoc.latitude, lon: ipLoc.longitude });
        setResolvedCity(ipLoc.locationCity);

        const map = mapInstanceRef.current;
        const marker = markerRef.current;
        if (map && marker) {
          if (animate) {
            map.flyTo([ipLoc.latitude, ipLoc.longitude], 14, { duration: 1.0 });
          } else {
            map.setView([ipLoc.latitude, ipLoc.longitude], 14);
          }
          marker.setLatLng([ipLoc.latitude, ipLoc.longitude]);
        }
      } catch (ipErr) {
        console.warn('[Map IP Fallback Failed]:', ipErr);
      }
    } finally {
      setIsLocatingUser(false);
    }
  };

  // 1. Dynamically load Leaflet styles & scripts once in the browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const loadLeafletAssets = async () => {
      // Check if Leaflet L is already available globally
      if ((window as any).L) {
        if (isMounted) initMap((window as any).L);
        return;
      }

      // Add CSS if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }

      // Add JS if not present
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.async = true;
        script.onload = () => {
          if (isMounted && (window as any).L) {
            initMap((window as any).L);
          }
        };
        script.onerror = () => {
          if (isMounted) setLoadError('Could not load OpenStreetMap library. Please check your internet connection.');
        };
        document.body.appendChild(script);
      } else {
        const checkTimer = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkTimer);
            if (isMounted) initMap((window as any).L);
          }
        }, 100);
      }
    };

    const initMap = (L: any) => {
      if (!containerRef.current) return;
      if (mapInstanceRef.current) return; // already initialized

      try {
        // Determine start coordinates: check cached GPS in localStorage first if initial is default
        let startLat = initialLat;
        let startLon = initialLon;
        const cachedGpsStr = localStorage.getItem('socilalink_real_gps');
        if (cachedGpsStr && initialLat === -1.2864 && initialLon === 36.8172) {
          try {
            const parsed = JSON.parse(cachedGpsStr);
            if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
              startLat = parsed.latitude;
              startLon = parsed.longitude;
            }
          } catch {
            // ignore
          }
        }

        const map = L.map(containerRef.current, {
          center: [startLat, startLon],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        // Add 100% free official OpenStreetMap tile layer (Zero API key required, zero watermarks)
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          className: mapTheme === 'dark' ? 'osm-dark-tiles' : '',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        (map as any)._tileLayer = tileLayer;

        // Custom Glowing Pin Marker
        const customPinIcon = L.divIcon({
          className: 'osm-custom-pin-icon',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-100%);">
              <div style="position:absolute;width:32px;height:32px;background:rgba(244,63,94,0.35);border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="position:relative;width:36px;height:36px;background:linear-gradient(135deg,#f43f5e,#e11d48);border:2.5px solid #ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(244,63,94,0.6);color:#ffffff;cursor:grab;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        const marker = L.marker([startLat, startLon], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);

        markerRef.current = marker;
        mapInstanceRef.current = map;

        // On Click on the map -> move pin smoothly
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng]);
          setCurrentCoords({ lat, lon: lng });
          setLocationSource('MANUAL');
          updateAddressForCoords(lat, lng);
        });

        // On Drag start
        marker.on('dragstart', () => {
          setIsDragging(true);
        });

        // On Drag end -> update coordinates
        marker.on('dragend', () => {
          setIsDragging(false);
          const pos = marker.getLatLng();
          setCurrentCoords({ lat: pos.lat, lon: pos.lng });
          setLocationSource('MANUAL');
          updateAddressForCoords(pos.lat, pos.lng);
        });

        setMapLoaded(true);

        // Invalidate size once after render to ensure tiles fill container
        setTimeout(() => {
          map.invalidateSize();
        }, 250);

        // Auto-locate user on mount and fly to current location tile
        if (autoLocateOnMount) {
          setTimeout(() => {
            locateUserAndFly(true);
          }, 350);
        }
      } catch (err: any) {
        console.error('Failed to init Leaflet OSM:', err);
        setLoadError('Failed to initialize map display.');
      }
    };

    loadLeafletAssets();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Track viewer's live GPS movement while map is open
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Show "Your Location" marker and connecting path when pin is moved elsewhere
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !userGpsCoords) return;

    // Calculate distance between user and pin
    const distKm = Math.hypot(
      (userGpsCoords.lat - currentCoords.lat) * 111,
      (userGpsCoords.lon - currentCoords.lon) * 111 * Math.cos((userGpsCoords.lat * Math.PI) / 180)
    );

    // If pin is more than 30 meters from user GPS, display user location & connecting path
    if (distKm > 0.03) {
      if (!userGpsMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-gps-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:24px;height:24px;background:rgba(59,130,246,0.35);border-radius:50%;animation:ping 2s infinite;"></div>
              <div style="width:14px;height:14px;background:#3b82f6;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.8);"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        userGpsMarkerRef.current = L.marker([userGpsCoords.lat, userGpsCoords.lon], {
          icon: userIcon,
        }).addTo(map);
      } else {
        userGpsMarkerRef.current.setLatLng([userGpsCoords.lat, userGpsCoords.lon]);
      }

      // Connecting dashed line
      const pathLine = [
        [userGpsCoords.lat, userGpsCoords.lon],
        [currentCoords.lat, currentCoords.lon],
      ];
      if (!userToPinPathRef.current) {
        userToPinPathRef.current = L.polyline(pathLine, {
          color: '#f43f5e',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '6, 6',
        }).addTo(map);
      } else {
        userToPinPathRef.current.setLatLngs(pathLine);
      }
    } else {
      // If pin is at user's location, remove separate user marker and line
      if (userGpsMarkerRef.current) {
        map.removeLayer(userGpsMarkerRef.current);
        userGpsMarkerRef.current = null;
      }
      if (userToPinPathRef.current) {
        map.removeLayer(userToPinPathRef.current);
        userToPinPathRef.current = null;
      }
    }
  }, [userGpsCoords, currentCoords, mapLoaded]);

  // Update theme when toggled
  const handleToggleTheme = () => {
    const nextTheme = mapTheme === 'dark' ? 'standard' : 'dark';
    setMapTheme(nextTheme);

    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (map && L) {
      if ((map as any)._tileLayer) {
        map.removeLayer((map as any)._tileLayer);
      }
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        className: nextTheme === 'dark' ? 'osm-dark-tiles' : '',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      (map as any)._tileLayer = tileLayer;
    }
  };

  // Fly to a specific hub on the map
  const handleFlyToHub = (lat: number, lon: number, name: string) => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLatLng([lat, lon]);
      map.flyTo([lat, lon], 14, { duration: 1.2 });
      setCurrentCoords({ lat, lon });
      setLocationSource('MANUAL');
      setResolvedCity(name);
    }
  };

  // Search input handler to fly to any place
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    try {
      const geocoded = await geocodeCityOrAddress(searchInput.trim());
      handleFlyToHub(geocoded.latitude, geocoded.longitude, geocoded.locationCity);
    } catch (err) {
      console.warn('Map search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      latitude: currentCoords.lat,
      longitude: currentCoords.lon,
      locationCity: resolvedCity,
      locationCountry: 'Kenya',
    });
  };

  return (
    <div className="flex flex-col h-full w-full space-y-3 select-none text-left">
      {/* Search & Area Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search neighborhood (e.g. Westlands, Kilimani, Karen)..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
        <button
          type="submit"
          disabled={!searchInput.trim() || isSearching}
          className="px-3 py-1.5 rounded-xl gradient-brand text-white font-bold text-xs disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shrink-0"
        >
          {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          <span>Fly</span>
        </button>
      </form>

      {/* Quick Preset Hub Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
        {POPULAR_KENYA_HUBS.slice(0, 8).map((hub) => (
          <button
            key={hub.name}
            type="button"
            onClick={() => handleFlyToHub(hub.lat, hub.lon, hub.name)}
            className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/[0.08] text-[10px] text-slate-300 hover:text-white transition whitespace-nowrap cursor-pointer"
          >
            {hub.name.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Map Canvas Container */}
      <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-white/10 bg-[#0B0E17] shadow-inner shrink-0">
        {/* The Leaflet Mount DOM Node */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {!mapLoaded && !loadError && (
          <div className="absolute inset-0 bg-[#0B0E17]/90 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p className="text-[11px] text-slate-400 font-medium">Loading OpenStreetMap tiles...</p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 bg-[#0B0E17] p-4 flex flex-col items-center justify-center text-center gap-2 z-10">
            <p className="text-xs text-rose-400 font-bold">{loadError}</p>
            <p className="text-[10px] text-slate-400">You can still enter your neighborhood name manually.</p>
          </div>
        )}

        {/* Floating Top Bar Controls: Locate Me Button & Theme Toggle */}
        <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
          {/* Floating 'Locate Me' Button (Animates and drags pin to current user location) */}
          <button
            type="button"
            onClick={() => locateUserAndFly(true)}
            disabled={isLocatingUser}
            className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-rose-500/40 hover:border-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition shadow-lg shadow-black/50 cursor-pointer disabled:opacity-60 active:scale-95"
            title="Detect current device location and fly pin to this spot"
          >
            {isLocatingUser ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{isLocatingUser ? 'Finding you...' : 'Current Spot'}</span>
            {locationSource === 'GPS' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live GPS active" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="pointer-events-auto px-2 py-1 rounded-lg bg-black/75 hover:bg-black/90 border border-white/20 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition shadow-md cursor-pointer"
            title="Toggle Dark / Standard OpenStreetMap tiles"
          >
            <Layers className="w-3 h-3 text-rose-400" />
            <span>{mapTheme === 'dark' ? 'Dark OSM' : 'Standard'}</span>
          </button>
        </div>

        {/* Pin Dragging Status Overlay */}
        {isDragging && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-extrabold shadow-xl shadow-rose-500/40 pointer-events-none animate-bounce flex items-center gap-1.5">
            <span>Release pin to set spot</span>
            <MapPin className="w-3.5 h-3.5 shrink-0" />
          </div>
        )}

        {/* Pin Helper Tag Overlay */}
        <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 text-slate-300 text-[10px] font-medium backdrop-blur-md shadow-md pointer-events-none flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
          <span>
            {locationSource === 'GPS' && gpsAccuracy
              ? `GPS accurate (±${gpsAccuracy}m) • Drag pin to fine-tune`
              : 'Tap or drag pin to fine-tune exact spot'}
          </span>
        </div>
      </div>

      {/* Selected Coordinates & Neighborhood Banner */}
      <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Selected Pin Location
            </span>
            {locationSource === 'GPS' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                Live GPS
              </span>
            )}
            {locationSource === 'IP' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                Approx IP
              </span>
            )}
            {locationSource === 'MANUAL' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                Custom Pin
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-white truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{resolvedCity}</span>
            {isResolvingName && <Loader2 className="w-2.5 h-2.5 animate-spin text-rose-400" />}
          </p>
          <p className="text-[10px] font-mono text-slate-400">
            {currentCoords.lat.toFixed(4)}°, {currentCoords.lon.toFixed(4)}°
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-2.5 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>{confirmButtonText || 'Set Pin'}</span>
        </button>
      </div>

      {/* Luxury Dark Mode Leaflet Filter */}
      <style>{`
        .osm-dark-tiles img.leaflet-tile {
          filter: brightness(0.68) invert(1) contrast(1.9) hue-rotate(200deg) saturate(0.35) !important;
        }
        .leaflet-container {
          background: #0B0E17 !important;
        }
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}

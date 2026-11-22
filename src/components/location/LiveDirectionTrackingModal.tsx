'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Compass,
  Navigation,
  Footprints,
  Car,
  ExternalLink,
  Loader2,
  Crosshair,
  User,
  Radio,
  Share2,
  LocateFixed,
} from 'lucide-react';
import {
  calculateRealDistanceKm,
  calculateBearing,
  getBearingCardinal,
  calculateETA,
  getRealDevicePosition,
} from '@/utils/location';
import { useSocket } from '@/context/SocketContext';

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  sharingUntil?: string;
  isLive?: boolean;
  isPinned?: boolean;
  locationName?: string;
  senderName?: string;
}

interface LiveDirectionTrackingModalProps {
  isOpen: boolean;
  conversationId: string;
  messageId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  initialTargetLocation: LiveLocationData;
  onClose: () => void;
}

export function LiveDirectionTrackingModal({
  isOpen,
  conversationId,
  messageId,
  partnerName,
  partnerAvatar,
  initialTargetLocation,
  onClose,
}: LiveDirectionTrackingModalProps) {
  const { socket } = useSocket();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);
  const targetCircleRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const myCircleRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const routeGlowRef = useRef<any>(null);
  const breadcrumbsLineRef = useRef<any>(null);

  const [targetCoords, setTargetCoords] = useState<{ lat: number; lon: number }>({
    lat: initialTargetLocation.latitude,
    lon: initialTargetLocation.longitude,
  });
  const [targetHeading, setTargetHeading] = useState<number | null>(initialTargetLocation.heading || null);
  const [targetAccuracy, setTargetAccuracy] = useState<number>(initialTargetLocation.accuracy || 20);
  const isPinned = Boolean(initialTargetLocation.isPinned);
  const isInitiallyExpired = initialTargetLocation.sharingUntil
    ? new Date() > new Date(initialTargetLocation.sharingUntil)
    : false;
  const [isStillLive, setIsStillLive] = useState<boolean>(
    isPinned ? true : Boolean(initialTargetLocation.isLive) && !isInitiallyExpired
  );

  // Auto-expire when duration ends while modal is open
  useEffect(() => {
    if (!initialTargetLocation.sharingUntil || isPinned) return;
    const checkExpiry = () => {
      if (new Date() > new Date(initialTargetLocation.sharingUntil!)) {
        setIsStillLive(false);
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, [initialTargetLocation.sharingUntil, isPinned]);

  const [myCoords, setMyCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [myAccuracy, setMyAccuracy] = useState<number>(15);
  const [myHeading, setMyHeading] = useState<number | null>(null);
  const [mySpeed, setMySpeed] = useState<number | null>(null);
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const [movementTrail, setMovementTrail] = useState<[number, number][]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('walking');
  const [hasAutoFitted, setHasAutoFitted] = useState<boolean>(false);

  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [bearingDeg, setBearingDeg] = useState<number>(0);
  const [cardinalDir, setCardinalDir] = useState<string>('N');
  const [eta, setEta] = useState<{ walkingMinutes: number; drivingMinutes: number }>({
    walkingMinutes: 0,
    drivingMinutes: 0,
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [locatingSelf, setLocatingSelf] = useState(false);

  // 1. Listen for real-time location updates on socket
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleLocationUpdate = (data: any) => {
      if (data.conversationId === conversationId && (data.messageId === messageId || !data.messageId)) {
        setTargetCoords({ lat: data.latitude, lon: data.longitude });
        if (typeof data.heading === 'number') setTargetHeading(data.heading);
        if (typeof data.accuracy === 'number') setTargetAccuracy(data.accuracy);
      }
    };

    const handleLocationStop = (data: any) => {
      if (data.conversationId === conversationId && (data.messageId === messageId || !data.messageId)) {
        setIsStillLive(false);
      }
    };

    socket.on('location:updated', handleLocationUpdate);
    socket.on('location:stopped', handleLocationStop);

    return () => {
      socket.off('location:updated', handleLocationUpdate);
      socket.off('location:stopped', handleLocationStop);
    };
  }, [socket, isOpen, conversationId, messageId]);

  // 2. Obtain viewer's own GPS position and watch movement in real time
  useEffect(() => {
    if (!isOpen) return;
    let watchId: number | null = null;
    setLocatingSelf(true);

    getRealDevicePosition()
      .then((pos) => {
        setMyCoords({ lat: pos.latitude, lon: pos.longitude });
        setMyAccuracy(Math.round(pos.accuracy || 15));
        setLocatingSelf(false);
        setMovementTrail([[pos.latitude, pos.longitude]]);
      })
      .catch((err) => {
        console.warn('[Viewer GPS Warning]: Could not fetch initial GPS:', err);
        setLocatingSelf(false);
      });

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setMyCoords({ lat, lon });
          if (typeof pos.coords.accuracy === 'number') setMyAccuracy(Math.round(pos.coords.accuracy));
          if (typeof pos.coords.heading === 'number') setMyHeading(pos.coords.heading);
          if (typeof pos.coords.speed === 'number') setMySpeed(pos.coords.speed);

          // Append to movement trail if moved > 3 meters
          setMovementTrail((prev) => {
            if (prev.length === 0) return [[lat, lon]];
            const last = prev[prev.length - 1];
            const movedDist = calculateRealDistanceKm(last[0], last[1], lat, lon);
            if (movedDist > 0.003) {
              return [...prev.slice(-120), [lat, lon]];
            }
            return prev;
          });
        },
        (err) => {
          console.warn('[WatchPosition Error]:', err);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen]);

  // 3. Fetch real road/street route from OSRM (with fallback to direct path)
  useEffect(() => {
    if (!myCoords || !targetCoords) return;

    let isSubscribed = true;
    const profile = travelMode === 'driving' ? 'driving' : 'foot';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${myCoords.lon},${myCoords.lat};${targetCoords.lon},${targetCoords.lat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isSubscribed) return;
        if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
          );
          setRouteCoordinates(coords);
        } else {
          setRouteCoordinates([
            [myCoords.lat, myCoords.lon],
            [targetCoords.lat, targetCoords.lon],
          ]);
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setRouteCoordinates([
          [myCoords.lat, myCoords.lon],
          [targetCoords.lat, targetCoords.lon],
        ]);
      });

    return () => {
      isSubscribed = false;
    };
  }, [myCoords?.lat, myCoords?.lon, targetCoords.lat, targetCoords.lon, travelMode]);

  // 3. Compute bearing, distance, and ETA whenever either coordinates change
  useEffect(() => {
    if (myCoords && targetCoords) {
      const dist = calculateRealDistanceKm(
        myCoords.lat,
        myCoords.lon,
        targetCoords.lat,
        targetCoords.lon
      );
      setDistanceKm(dist);

      const bearing = calculateBearing(
        myCoords.lat,
        myCoords.lon,
        targetCoords.lat,
        targetCoords.lon
      );
      setBearingDeg(bearing);
      setCardinalDir(getBearingCardinal(bearing));
      setEta(calculateETA(dist));
    }
  }, [myCoords, targetCoords]);

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen) return;

    let checkInterval: NodeJS.Timeout | null = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      // Clean existing
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Initialize map centered at target
      const map = L.map(mapContainerRef.current, {
        center: [targetCoords.lat, targetCoords.lon],
        zoom: 15,
        zoomControl: false,
      });

      // 100% Free Official OpenStreetMap Tiles (Zero API Key Required, Zero Watermarks)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        className: 'osm-dark-tiles',
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Custom Partner or Pinned Destination Pulse Marker
      const isPinnedMarker = Boolean(initialTargetLocation.isPinned);
      const partnerIcon = L.divIcon({
        className: 'partner-live-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 rounded-full ${isPinnedMarker ? 'bg-rose-500/30' : 'bg-pink-500/30'} animate-ping"></div>
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 p-0.5 shadow-xl flex items-center justify-center border-2 border-white">
              ${
                isPinnedMarker
                  ? '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>'
                  : `<span class="text-white text-xs font-black">${partnerName.slice(0, 1).toUpperCase()}</span>`
              }
            </div>
            ${
              targetHeading !== null && !isPinnedMarker
                ? `<div class="absolute -top-2 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-pink-500 transform" style="transform: rotate(${targetHeading}deg)"></div>`
                : ''
            }
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const targetMarker = L.marker([targetCoords.lat, targetCoords.lon], {
        icon: partnerIcon,
      }).addTo(map);

      const targetCircle = L.circle([targetCoords.lat, targetCoords.lon], {
        radius: Math.max(targetAccuracy, 25),
        color: '#ec4899',
        weight: 1.5,
        fillColor: '#ec4899',
        fillOpacity: 0.15,
      }).addTo(map);

      targetMarkerRef.current = targetMarker;
      targetCircleRef.current = targetCircle;
      mapRef.current = map;
      setMapLoaded(true);
    };

    if ((window as any).L) {
      initMap();
    } else {
      // Load Leaflet CSS and JS dynamically if not yet on page
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else {
        checkInterval = setInterval(() => {
          if ((window as any).L) {
            initMap();
            if (checkInterval) clearInterval(checkInterval);
          }
        }, 100);
      }
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapRef.current) {
        try {
          mapRef.current.stop();
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
      targetMarkerRef.current = null;
      targetCircleRef.current = null;
      myMarkerRef.current = null;
      myCircleRef.current = null;
      routeLineRef.current = null;
      routeGlowRef.current = null;
      breadcrumbsLineRef.current = null;
      setMapLoaded(false);
    };
  }, [isOpen]);

  // 5. Update Target Marker on Real-Time Movement
  useEffect(() => {
    const map = mapRef.current;
    const targetMarker = targetMarkerRef.current;
    const targetCircle = targetCircleRef.current;
    if (map && targetMarker && (targetMarker as any)._map) {
      try {
        targetMarker.setLatLng([targetCoords.lat, targetCoords.lon]);
        if (targetCircle && (targetCircle as any)._map) {
          targetCircle.setLatLng([targetCoords.lat, targetCoords.lon]);
          targetCircle.setRadius(Math.max(targetAccuracy, 25));
        }
      } catch {}
    }
  }, [targetCoords, targetAccuracy]);

  // 6. Update Viewer Marker, Accuracy Circle, Breadcrumbs Trail and Street Route Path
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L || !myCoords) return;

    try {
      // Update / create "YOU" Live Marker
      if (!myMarkerRef.current || !(myMarkerRef.current as any)._map) {
        const myIcon = L.divIcon({
          className: 'my-live-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-12 h-12 rounded-full bg-blue-500/25 animate-ping"></div>
              <div class="relative w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 border-2 border-white shadow-xl flex items-center justify-center">
                <span class="text-[9px] font-black text-white tracking-tighter">YOU</span>
              </div>
              ${
                myHeading !== null
                  ? `<div class="absolute -top-3 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-cyan-400" style="transform: rotate(${myHeading}deg)"></div>`
                  : ''
              }
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        myMarkerRef.current = L.marker([myCoords.lat, myCoords.lon], {
          icon: myIcon,
        }).addTo(map);

        // Add Accuracy circle
        myCircleRef.current = L.circle([myCoords.lat, myCoords.lon], {
          radius: Math.max(myAccuracy, 15),
          color: '#3b82f6',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        myMarkerRef.current.setLatLng([myCoords.lat, myCoords.lon]);
        if (myCircleRef.current && (myCircleRef.current as any)._map) {
          myCircleRef.current.setLatLng([myCoords.lat, myCoords.lon]);
          myCircleRef.current.setRadius(Math.max(myAccuracy, 15));
        }
      }

      // Determine the route path: use calculated street route or fallback to direct line
      const activeRoutePath =
        routeCoordinates.length > 0
          ? routeCoordinates
          : [
              [myCoords.lat, myCoords.lon],
              [targetCoords.lat, targetCoords.lon],
            ];

      // 1. Neon Route Outer Glow Line
      if (!routeGlowRef.current || !(routeGlowRef.current as any)._map) {
        routeGlowRef.current = L.polyline(activeRoutePath, {
          color: '#f43f5e',
          weight: 9,
          opacity: 0.28,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } else {
        routeGlowRef.current.setLatLngs(activeRoutePath);
      }

      // 2. Neon Route Foreground Dashed Line
      if (!routeLineRef.current || !(routeLineRef.current as any)._map) {
        routeLineRef.current = L.polyline(activeRoutePath, {
          color: '#ff2d60',
          weight: 4.5,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(activeRoutePath);
      }

      // 3. Movement Trail (Breadcrumbs of where you have moved)
      if (movementTrail.length > 1) {
        if (!breadcrumbsLineRef.current || !(breadcrumbsLineRef.current as any)._map) {
          breadcrumbsLineRef.current = L.polyline(movementTrail, {
            color: '#06b6d4',
            weight: 3.5,
            opacity: 0.7,
            dashArray: '4, 4',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        } else {
          breadcrumbsLineRef.current.setLatLngs(movementTrail);
        }
      }
    } catch (err) {
      // Ignore leaflet render race during unmount
    }
  }, [myCoords, targetCoords, routeCoordinates, movementTrail, myAccuracy, myHeading]);

  // 7. Auto-fit both markers on initial load so both the user and destination are visible immediately
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (map && L && myCoords && !hasAutoFitted) {
      try {
        const bounds = L.latLngBounds([
          [myCoords.lat, myCoords.lon],
          [targetCoords.lat, targetCoords.lon],
        ]);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });
        setHasAutoFitted(true);
      } catch {}
    }
  }, [mapLoaded, myCoords, targetCoords, hasAutoFitted]);

  // 8. Auto-Follow: center on user smoothly when moving
  useEffect(() => {
    const map = mapRef.current;
    if (map && isAutoFollow && myCoords && hasAutoFitted) {
      try {
        map.setView([myCoords.lat, myCoords.lon], map.getZoom(), { animate: false });
      } catch {}
    }
  }, [myCoords, isAutoFollow, hasAutoFitted]);

  // Controls: Fit both markers
  const fitBothInView = () => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    if (myCoords) {
      const bounds = L.latLngBounds([
        [myCoords.lat, myCoords.lon],
        [targetCoords.lat, targetCoords.lon],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } else {
      map.setView([targetCoords.lat, targetCoords.lon], 16);
    }
  };

  const centerOnTarget = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([targetCoords.lat, targetCoords.lon], 16, { duration: 1 });
    }
  };

  const centerOnMe = () => {
    if (mapRef.current && myCoords) {
      mapRef.current.flyTo([myCoords.lat, myCoords.lon], 16, { duration: 1 });
    }
  };

  const openInExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetCoords.lat},${targetCoords.lon}&travelmode=walking`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-[90vh] max-h-[750px] rounded-3xl bg-gray-900 border border-pink-500/30 overflow-hidden flex flex-col shadow-2xl shadow-pink-500/20">
        {/* Top Header Card */}
        <div className="shrink-0 p-4 bg-gray-900/95 border-b border-gray-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isPinned ? (
                <div className="w-10 h-10 rounded-full gradient-pink p-0.5 shadow flex items-center justify-center border-2 border-white/40">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border-2 border-pink-500 flex items-center justify-center">
                  {partnerAvatar ? (
                    <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-pink-400 font-bold">{partnerName.slice(0, 1)}</span>
                  )}
                </div>
              )}
              {!isPinned && isStillLive && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-900 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {isPinned
                    ? initialTargetLocation.locationName || 'Pinned Place'
                    : `${partnerName}'s Live Location`}
                </h3>
                {isPinned ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold flex items-center gap-1 border border-rose-500/30">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    PINNED PLACE
                  </span>
                ) : isStillLive ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-[10px] font-semibold">
                    Ended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate max-w-xs">
                {isPinned
                  ? `Shared by ${partnerName} • ${targetCoords.lat.toFixed(4)}°, ${targetCoords.lon.toFixed(4)}°`
                  : (initialTargetLocation.locationName || `${targetCoords.lat.toFixed(4)}°, ${targetCoords.lon.toFixed(4)}°`)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direction & Distance Floating Dashboard */}
        {myCoords && (
          <div className="shrink-0 p-3 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900 border-b border-gray-800 flex items-center justify-around text-center text-xs z-20">
            {/* Distance */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-medium">Distance</span>
              <span className="text-sm font-extrabold text-pink-400">
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`}
              </span>
            </div>

            <div className="w-px h-7 bg-gray-800" />

            {/* Direction Bearing with Rotating Compass Needle */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-medium">Direction</span>
              <div className="flex items-center gap-1 font-bold text-white text-xs">
                <Navigation
                  className="w-3.5 h-3.5 text-pink-400 transition-transform duration-300"
                  style={{ transform: `rotate(${bearingDeg}deg)` }}
                />
                <span>
                  {cardinalDir} ({bearingDeg}°)
                </span>
              </div>
            </div>

            <div className="w-px h-7 bg-gray-800" />

            {/* Walking ETA */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                <Footprints className="w-3 h-3 text-emerald-400" /> Walk
              </span>
              <span className="text-xs font-bold text-emerald-300">
                ~{eta.walkingMinutes} min{eta.walkingMinutes > 1 ? 's' : ''}
              </span>
            </div>

            <div className="w-px h-7 bg-gray-800" />

            {/* Driving ETA */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                <Car className="w-3 h-3 text-cyan-400" /> Drive
              </span>
              <span className="text-xs font-bold text-cyan-300">
                ~{eta.drivingMinutes} min{eta.drivingMinutes > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* The Leaflet Map Viewport */}
        <div className="relative flex-1 w-full bg-gray-950 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Top Floating Path & Route Status Pill */}
          <div className="absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="px-3 py-1.5 rounded-full bg-gray-900/90 border border-gray-700/80 text-white text-[11px] font-bold shadow-lg backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Path: {routeCoordinates.length > 2 ? 'Street Navigation' : 'Direct Line'}</span>
              {myAccuracy && (
                <span className="text-gray-400 font-mono text-[10px]">±{myAccuracy}m</span>
              )}
            </div>

            {/* Travel Mode Switcher */}
            <div className="p-0.5 rounded-full bg-gray-900/90 border border-gray-700/80 flex items-center backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  travelMode === 'walking'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Walking Street Path"
              >
                <Footprints className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  travelMode === 'driving'
                    ? 'bg-cyan-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Driving Road Path"
              >
                <Car className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floating Action Controls on Map */}
          <div className="absolute right-3 bottom-4 z-[500] flex flex-col gap-2">
            {/* Auto-Follow Toggle */}
            {myCoords && (
              <button
                onClick={() => setIsAutoFollow(!isAutoFollow)}
                className={`px-3 py-2 rounded-2xl border text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition ${
                  isAutoFollow
                    ? 'bg-cyan-600/90 text-white border-cyan-400 shadow-cyan-500/20'
                    : 'bg-gray-900/90 hover:bg-gray-800 text-gray-300 border-gray-700/80'
                }`}
                title={isAutoFollow ? 'Camera following your movement' : 'Camera free'}
              >
                <Navigation className={`w-3.5 h-3.5 ${isAutoFollow ? 'text-white' : 'text-gray-400'}`} />
                <span>{isAutoFollow ? 'Tracking Me' : 'Free Map'}</span>
              </button>
            )}

            <button
              onClick={fitBothInView}
              className="px-3 py-2 rounded-2xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-white text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              title="Fit Both Users in View"
            >
              <Crosshair className="w-3.5 h-3.5 text-pink-400" />
              <span>Fit Route</span>
            </button>

            <button
              onClick={centerOnTarget}
              className="p-2.5 rounded-2xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-white text-xs shadow-lg backdrop-blur-md flex items-center justify-center cursor-pointer active:scale-95 transition"
              title={`Focus on ${partnerName}`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-pink-500 animate-pulse" />
            </button>

            {myCoords && (
              <button
                onClick={centerOnMe}
                className="p-2.5 rounded-2xl bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-white text-xs shadow-lg backdrop-blur-md flex items-center justify-center cursor-pointer active:scale-95 transition"
                title="Focus on My Location"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="shrink-0 p-3.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Live Path Active</span>
            <span className="text-gray-500 text-[11px] hidden sm:inline">• Updates live as you move</span>
          </div>

          <button
            onClick={openInExternalMaps}
            className="px-4 py-2 rounded-xl gradient-pink text-white font-bold text-xs shadow-md shadow-pink-500/20 hover:opacity-95 active:scale-95 flex items-center gap-1.5 cursor-pointer transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Turn-by-Turn Navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
}

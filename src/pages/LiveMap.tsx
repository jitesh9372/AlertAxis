import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { motion } from 'motion/react';
import { Shield, MapPin, Navigation, ArrowLeft, Loader2, Camera, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { uploadFile } from '../lib/storage';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 80px)'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      "featureType": "all",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#ffffff" }, { "weight": "0.20" }, { "lightness": "0.00" }, { "gamma": "1.00" }]
    },
    {
      "featureType": "all",
      "elementType": "labels.text.stroke",
      "stylers": [{ "visibility": "on" }, { "color": "#242f3e" }, { "lightness": 16 }]
    },
    {
      "featureType": "all",
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#000000" }, { "lightness": 20 }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#000000" }, { "lightness": 17 }, { "weight": 1.2 }]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#1f2835" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "road.local",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{ "color": "#2f3948" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#17263c" }]
    }
  ]
};

export default function LiveMap() {
  const navigate = useNavigate();
  const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // Default to India center
  const [userLocation, setUserLocation] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCJxnNrOSPk-WROL3KJHynYMObiCatsIjY'
  });

  useEffect(() => {
    // Get initial position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          setUserLocation(loc);
        },
        (err) => {
          const errorMsg = err.code === 1 ? "Permission denied" : err.code === 2 ? "Position unavailable" : err.code === 3 ? "Timeout" : "Unknown error";
          console.error(`Geolocation error: ${errorMsg} (${err.message})`);
        }
      );
    }

    // Subscribe to active alerts
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('users_detail')
        .select('*')
        .eq('feature_type', 'alert')
        .eq('status', 'active');
      
      if (data) {
        const parsedAlerts = data.map(alert => {
          const locMatch = alert.location?.match(/\(([^,]+),\s*([^)]+)\)/);
          if (locMatch) {
            return {
              ...alert,
              lat: parseFloat(locMatch[1]),
              lng: parseFloat(locMatch[2])
            };
          }
          return null;
        }).filter(Boolean);
        setActiveAlerts(parsedAlerts);
      }
    };

    fetchAlerts();

    const subscription = supabase
      .channel('live-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_detail' }, fetchAlerts)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const handleSaveSnapshot = async () => {
    if (!userLocation) return;
    
    setIsSavingSnapshot(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const snapshotData = {
        timestamp: new Date().toISOString(),
        location: userLocation,
        userAgent: navigator.userAgent,
        accuracy: "high"
      };

      const blob = new Blob([JSON.stringify(snapshotData, null, 2)], { type: 'application/json' });
      
      await uploadFile({
        featureName: 'location-snapshots',
        itemId: 'snapshot-' + Date.now(),
        file: blob,
        userId: user.id
      });

      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save snapshot:", err);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Loading Live Map...</h2>
        <p className="text-slate-400 text-sm max-w-md">
          If this takes too long, ensure the <span className="text-primary font-mono">Maps JavaScript API</span> is enabled in your Google Cloud Console.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="h-auto min-h-[5rem] py-4 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">Live Mapping</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold">Emergency monitoring</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={handleSaveSnapshot}
            disabled={isSavingSnapshot || !userLocation}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 transition-all disabled:opacity-50 text-sm"
          >
            {isSavingSnapshot ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : snapshotSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span className="hidden xs:inline">{snapshotSuccess ? "Saved" : "Snapshot"}</span>
            <span className="xs:hidden">{snapshotSuccess ? "Saved" : "Snap"}</span>
          </button>

          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold text-red-500">{activeAlerts.length} Active</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions as any}
        >
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#3b82f6",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
              }}
              title="Your Location"
            />
          )}

          {/* Active Alert Markers */}
          {activeAlerts.map((alert) => (
            <Marker
              key={alert.id}
              position={{ lat: alert.lat, lng: alert.lng }}
              onClick={() => setSelectedAlert(alert)}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(40, 40)
              }}
            />
          ))}

          {selectedAlert && (
            <InfoWindow
              position={{ lat: selectedAlert.lat, lng: selectedAlert.lng }}
              onCloseClick={() => setSelectedAlert(null)}
            >
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-slate-900">{selectedAlert.name}</h3>
                <p className="text-xs text-slate-600 mt-1">{selectedAlert.message}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-black text-red-500 bg-red-50 px-2 py-1 rounded">
                    SOS Active
                  </span>
                  <button 
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                    onClick={() => setCenter({ lat: selectedAlert.lat, lng: selectedAlert.lng })}
                  >
                    Focus
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Floating Controls */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (userLocation) setCenter(userLocation);
            }}
            className="w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Navigation className="w-6 h-6" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

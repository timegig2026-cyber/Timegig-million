import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, Plus, Minus, Navigation, Globe, Map as MapIcon, 
  Home, Users, Briefcase, Search as SearchIcon, User,
  LayoutGrid, Compass, Copy, TrendingUp, Settings, Volume2, VolumeX, ChevronRight, LogOut, Mail, UserCircle
} from 'lucide-react';

// Fix for default marker icon in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function LocationMarker({ isSoundEnabled }: { isSoundEnabled: boolean }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const map = useMap();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const userLocationIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative flex items-center justify-center">
             <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-25"></div>
             <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
           </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const findLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const { latitude, longitude } = pos.coords;
        const newPos = new L.LatLng(latitude, longitude);
        setPosition(newPos);
        try {
          map.flyTo(newPos, 15);
        } catch (e) {
          console.warn("Could not fly to location:", e);
        }
        setError(null);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err.message);
        console.warn("Location error:", err.message);
      },
      { enableHighAccuracy: true }
    );
  }, [map]);

  useEffect(() => {
    findLocation();
  }, [findLocation]);

  if (error) {
    return (
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1001] bg-red-500 text-white px-4 py-2 rounded-full shadow-lg text-sm animate-bounce">
        Location access: {error}
      </div>
    );
  }

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>
        <div className="text-center font-medium">You are here</div>
      </Popup>
    </Marker>
  );
}

function SearchHandler({ searchResult }: { searchResult: L.LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (searchResult) {
      map.flyTo(searchResult, 15);
    }
  }, [searchResult, map]);
  return null;
}

interface ZoomControlsProps {
  mapMode: 'standard' | 'satellite';
  setMapMode: (mode: 'standard' | 'satellite') => void;
  playClickSound: () => void;
}

function ZoomControls({ mapMode, setMapMode, playClickSound }: ZoomControlsProps) {
  const map = useMap();

  const handleRecenter = () => {
    playClickSound();
    map.locate({ setView: true, maxZoom: 15 });
  };

  return (
    <div className="absolute bottom-24 right-6 z-[1000] flex flex-col gap-3 animate-in fade-in zoom-in duration-300">
      <button
        onClick={() => {
          playClickSound();
          setMapMode(mapMode === 'standard' ? 'satellite' : 'standard');
        }}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all border border-white/20 active:scale-95 mb-2 ${
          mapMode === 'satellite' 
            ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title={mapMode === 'standard' ? "Switch to Satellite" : "Switch to Map"}
      >
        {mapMode === 'standard' ? <Globe size={24} /> : <MapIcon size={24} />}
      </button>

      <button
        onClick={handleRecenter}
        className="w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-600 active:scale-95 transition-all mb-2 shadow-blue-500/20"
        title="My Location"
      >
        <Navigation size={22} fill="currentColor" />
      </button>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => { playClickSound(); map.zoomIn(); }}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
          title="Zoom In"
        >
          <Plus size={24} />
        </button>
        <button
          onClick={() => { playClickSound(); map.zoomOut(); }}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
          title="Zoom Out"
        >
          <Minus size={24} />
        </button>
      </div>
    </div>
  );
}

type Tab = 'Tenant' | 'Referrals' | 'GiGs' | 'Seekers' | 'Profile';

interface ReferralApp {
  id: string;
  name: string;
  email: string;
  subscription: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<L.LatLng | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mapMode, setMapMode] = useState<'standard' | 'satellite'>('standard');
  const [activeTab, setActiveTab] = useState<Tab>('GiGs');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Click sound effect
  const playClickSound = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio context failed:", e);
    }
  }, [isSoundEnabled]);

  // Referral Applications State
  const [referralApps, setReferralApps] = useState<ReferralApp[]>([
    { id: '1', name: 'Thabo Mokoena', email: 'thabo@example.com', subscription: 'Premium GIG', status: 'Pending', date: '2023-10-24' },
    { id: '2', name: 'Sarah Jacobs', email: 'sarah.j@test.com', subscription: 'Standard GIG', status: 'Pending', date: '2023-10-25' },
    { id: '3', name: 'Lerato Sethole', email: 'lerato@web.com', subscription: 'Premium GIG', status: 'Approved', date: '2023-10-22' },
  ]);

  const handleAction = (id: string, newStatus: 'Approved' | 'Rejected') => {
    playClickSound();
    setReferralApps(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
          );
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Suggestion error:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion: any) => {
    const { lat, lon, display_name } = suggestion;
    setSearchResult(new L.LatLng(parseFloat(lat), parseFloat(lon)));
    setSearchQuery(display_name);
    setShowSuggestions(false);
    if (activeTab !== 'GiGs') {
      setActiveTab('GiGs');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        selectSuggestion(data[0]);
      } else {
        alert('Location not found.');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const navItems: { label: Tab; icon: any }[] = [
    { label: 'Tenant', icon: Home },
    { label: 'Referrals', icon: Users },
    { label: 'GiGs', icon: Compass },
    { label: 'Seekers', icon: SearchIcon },
    { label: 'Profile', icon: User },
  ];

  const SearchBarOverlay = () => (
    <div ref={searchRef} className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          placeholder={activeTab === 'Referrals' ? "Search Referrals..." : activeTab === 'Seekers' ? "Search Seekers..." : "Search location..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
          className="w-full h-14 pl-14 pr-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 outline-hidden text-lg text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
          <Search size={22} />
        </div>
        {isSearching && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-16 left-0 w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[1002]">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                playClickSound();
                selectSuggestion(item);
              }}
              className="w-full text-left px-6 py-3 hover:bg-blue-50/50 transition-colors text-gray-700 border-b border-gray-100 last:border-0 flex items-start gap-3"
            >
              <Navigation size={18} className="mt-1 text-gray-400 shrink-0" />
              <span className="truncate leading-tight text-[15px]">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-[100dvh] font-sans overflow-hidden bg-slate-900 flex flex-col">
      {/* Background Map Wallpaper (Blurred when not on GiGs) */}
      <div className={`absolute inset-0 transition-all duration-700 ease-in-out ${activeTab !== 'GiGs' ? 'blur-xl scale-110 opacity-60 grayscale-[30%]' : 'blur-0 scale-100 opacity-100'}`}>
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          scrollWheelZoom={activeTab === 'GiGs'} 
          className="h-full w-full"
          attributionControl={false}
          zoomControl={false}
          dragging={activeTab === 'GiGs'}
          touchZoom={activeTab === 'GiGs'}
          doubleClickZoom={activeTab === 'GiGs'}
        >
          {mapMode === 'standard' ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          ) : (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          )}
          <LocationMarker isSoundEnabled={isSoundEnabled} />
          <SearchHandler searchResult={searchResult} />
          {searchResult && (
            <Marker position={searchResult}>
              <Popup>
                <div className="font-medium text-sm max-w-[200px]">{searchQuery}</div>
              </Popup>
            </Marker>
          )}
          {activeTab === 'GiGs' && <ZoomControls mapMode={mapMode} setMapMode={setMapMode} playClickSound={playClickSound} />}
        </MapContainer>
      </div>

      {/* Main Content Overlay */}
      <div className="flex-1 relative overflow-hidden pb-20">
        {activeTab === 'GiGs' && <SearchBarOverlay />}

        {activeTab === 'Tenant' && (
          <div className="h-full w-full bg-white/80 backdrop-blur-md px-6 py-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 mt-4">Tenant Overview</h1>
            <div className="bg-blue-600/90 backdrop-blur-sm rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20 mb-10">
              <div className="flex items-center gap-3 opacity-90 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm font-medium uppercase tracking-wider">Total Profit Balance</span>
              </div>
              <div className="text-5xl font-black mb-6 tracking-tight">R0.00</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-xs opacity-70 mb-1">Sub Profit</div>
                  <div className="text-xl font-bold">R0.00</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-xs opacity-70 mb-1">User Sub Profit</div>
                  <div className="text-xl font-bold">R0.00</div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Referral Link</h3>
                <div className="flex items-center gap-3 bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex-1 font-mono text-sm text-gray-600 truncate">https://gig-map.app/ref/user_9921</div>
                  <button 
                    onClick={() => { playClickSound(); alert("Copied to clipboard!"); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Referrals' && (
          <div className="h-full w-full bg-white/80 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative h-28 w-full z-[1000] px-4 pt-4">
              <SearchBarOverlay />
            </div>
            <div className="flex-1 px-6 overflow-y-auto pb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Referral Applications</h2>
              <div className="space-y-4">
                {referralApps.map((app) => (
                  <div key={app.id} className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{app.name}</h3>
                        <p className="text-sm text-gray-500">{app.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.status === 'Approved' ? 'bg-green-100/80 text-green-700' : 
                        app.status === 'Rejected' ? 'bg-red-100/80 text-red-700' : 
                        'bg-yellow-100/80 text-yellow-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-5">
                      <span>Subscription: <span className="font-semibold text-gray-700">{app.subscription}</span></span>
                      <span>{app.date}</span>
                    </div>
                    {app.status === 'Pending' && (
                      <div className="flex gap-3">
                        <button onClick={() => handleAction(app.id, 'Approved')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">Approve</button>
                        <button onClick={() => handleAction(app.id, 'Rejected')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Seekers' && (
          <div className="h-full w-full bg-white/80 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative h-28 w-full z-[1000] px-4 pt-4">
              <SearchBarOverlay />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block p-4 rounded-full bg-white/60 backdrop-blur-sm mb-4 border border-white/20 shadow-sm">
                  <SearchIcon size={48} className="text-black" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Seekers</h2>
                <p className="text-gray-500 mt-2">Search to find seekers on the map.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Profile' && (
          <div className="h-full w-full bg-white/80 backdrop-blur-md flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => { playClickSound(); setShowSettings(!showSettings); }}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-gray-700 hover:bg-white transition-colors border border-white/20 shadow-sm"
              >
                <Settings size={24} />
              </button>
            </div>
            
            <div className="flex-1 px-8 py-12 flex flex-col items-center">
              <div className="relative mb-8">
                <div className="w-40 h-40 bg-white/90 backdrop-blur-lg rounded-[40px] flex items-center justify-center border-4 border-white shadow-2xl">
                  <UserCircle size={100} className="text-blue-600" strokeWidth={1.2} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
              </div>
              
              <div className="text-center mb-10 w-full">
                <h1 className="text-3xl font-black text-gray-900 mb-1">Mokoena, Thabo</h1>
                <p className="text-gray-500 font-medium flex items-center justify-center gap-2">
                  <Mail size={16} />
                  thabo.mokoena@service.co.za
                </p>
              </div>

              {showSettings ? (
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">App Settings</h3>
                  <div className="bg-white/60 backdrop-blur-md rounded-3xl p-2 border border-white/20">
                    <button 
                      onClick={() => { setIsSoundEnabled(!isSoundEnabled); playClickSound(); }}
                      className="w-full flex items-center justify-between p-5 bg-white/90 rounded-2xl shadow-sm border border-white/20 hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isSoundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                          {isSoundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">App Sounds</div>
                          <div className="text-xs text-gray-500">{isSoundEnabled ? 'Sound is on' : 'Sound is off'}</div>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isSoundEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isSoundEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-3">
                   <button className="w-full flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-2xl hover:bg-white/80 transition-all group border border-white/20">
                    <div className="flex items-center gap-4 text-gray-700">
                      <User size={22} />
                      <span className="font-bold">Account Details</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-2xl hover:bg-white/80 transition-all group border border-white/20">
                    <div className="flex items-center gap-4 text-gray-700">
                      <Mail size={22} />
                      <span className="font-bold">Contact Support</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full flex items-center gap-4 p-5 text-red-500 font-bold hover:bg-red-50/80 rounded-2xl transition-all mt-4">
                    <LogOut size={22} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-lg border-t border-white/20 flex items-center justify-around px-4 pb-safe z-[1001] shadow-[0_-4px_30px_-10px_rgba(0,0,0,0.2)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.label;
          const isGigs = item.label === 'GiGs';
          return (
            <button
              key={item.label}
              onClick={() => { playClickSound(); setActiveTab(item.label); }}
              className={`flex flex-col items-center gap-1 transition-all flex-1 py-2 outline-none ${isActive ? 'text-blue-600' : 'text-black'}`}
            >
              <div className={`transition-all ${isActive ? 'bg-blue-50/80 rounded-xl p-1' : ''}`}>
                <Icon size={isGigs ? 42 : 24} className={isGigs ? 'mb-0.5' : ''} />
              </div>
              <span className="text-[11px] font-bold tracking-wide">{item.label}</span>
              {isActive && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

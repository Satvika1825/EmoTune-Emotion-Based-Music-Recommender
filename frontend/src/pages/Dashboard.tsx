import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Upload, Link2, Play, Pause, Heart,
  SkipBack, SkipForward, Search, Volume2, Loader2,
  LogOut, Shuffle, SlidersHorizontal, Share2, X, Grid3x3,
  List as ListIcon, User, Home, Library, Plus, Menu, ChevronLeft, Bell
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BACKEND_URL = "http://localhost:5000";

interface Song {
  name: string;
  artist: string;
  audio: string;
  image: string;
  genre: string;
  source: string;
}

interface RecentMood {
  emotion: string;
  timestamp: Date;
  confidence: number;
}

const emotionEmojis = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprise: "😲",
  neutral: "😐",
  fear: "😨",
  disgust: "🤢"
};

const Dashboard = () => {
  const [currentEmotion, setCurrentEmotion] = useState<string>("happy");
  const [confidence, setConfidence] = useState<number>(0);
  const [songs, setSongs] = useState<Song[]>([]);
  const [trendingMusic, setTrendingMusic] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showDetection, setShowDetection] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [detectedImageUrl, setDetectedImageUrl] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [userEmail, setUserEmail] = useState<string>("");
  const [moodDetectorVisible, setMoodDetectorVisible] = useState(false);

  // Sidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  const toggleMoodDetector = () => {
    const newVisibility = !moodDetectorVisible;
    setMoodDetectorVisible(newVisibility);
    if (newVisibility) {
      setShowDetection(true);
      setDetectedImageUrl(null);
    }
  };

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) setUserEmail(email);

    // Fetch Trending Jamendo Data
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/jamendo/browse`);
        const data = await res.json();
        if (data.success && data.data.items) {
          setTrendingMusic(data.data.items);
        }
      } catch (e) { console.error("Jamendo fetch error", e); }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  const addRecentMood = (emotion: string, conf: number) => {
    setRecentMoods(prev => [
      { emotion, timestamp: new Date(), confidence: conf },
      ...prev.slice(0, 4)
    ]);
  };

  const handleSignOut = () => {
    setCurrentEmotion("happy");
    setConfidence(0);
    setSongs([]);
    setCurrentSong(null);
    setIsPlaying(false);
    setDetectedImageUrl(null);
    setShowDetection(true);
    toast({ title: "Signed out successfully", description: "See you next time!" });
  };

  const shuffleSongs = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setSongs(shuffled);
    toast({ title: "Playlist shuffled", description: "Songs are now in random order" });
  };

  const shareSong = (song: Song) => {
    const shareText = `Check out "${song.name}" by ${song.artist} on EmoTune!`;
    if (navigator.share) {
      navigator.share({ title: song.name, text: shareText, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard!", description: "Share this song with your friends" });
    }
  };

  const skipCurrentSong = () => {
    if (currentSong) {
      const currentIndex = songs.findIndex(s => s.name === currentSong.name);
      const nextIndex = (currentIndex + 1) % songs.length;
      playSong(songs[nextIndex]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        toast({ title: "Camera activated", description: "Position your face and capture!" });
      }
    } catch (error) {
      toast({ title: "Camera access denied", description: "Please allow camera permissions", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setIsLoading(true);
      stopCamera();
      try {
        const formData = new FormData();
        formData.append('input_type', 'camera');
        formData.append('image_data', imageData);
        const response = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          setCurrentEmotion(data.emotion.toLowerCase());
          setConfidence(data.confidence);
          setSongs(data.tracks);
          setDetectedImageUrl(imageData);
          setShowDetection(false);
          addRecentMood(data.emotion.toLowerCase(), data.confidence);
          toast({ title: "Emotion detected!", description: `You're feeling ${data.emotion} (${data.confidence}% confidence)` });
          setMoodDetectorVisible(false);
        } else throw new Error(data.error || 'Detection failed');
      } catch (error) {
        toast({ title: "Detection failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      } finally { setIsLoading(false); }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('input_type', 'file');
      formData.append('file', file);
      const response = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setConfidence(data.confidence);
        setSongs(data.tracks);
        const reader = new FileReader();
        reader.onload = (e) => setDetectedImageUrl(e.target?.result as string);
        reader.readAsDataURL(file);
        setShowDetection(false);
        addRecentMood(data.emotion.toLowerCase(), data.confidence);
        toast({ title: "Image uploaded!", description: `Emotion detected: ${data.emotion} (${data.confidence}% confidence)` });
        setMoodDetectorVisible(false);
      } else throw new Error(data.error || 'Detection failed');
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      toast({ title: "No URL provided", description: "Please enter an image URL", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('input_type', 'url');
      formData.append('image_url', imageUrl);
      const response = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setConfidence(data.confidence);
        setSongs(data.tracks);
        setDetectedImageUrl(imageUrl);
        setShowDetection(false);
        addRecentMood(data.emotion.toLowerCase(), data.confidence);
        toast({ title: "Image loaded!", description: `Emotion detected: ${data.emotion} (${data.confidence}% confidence)` });
        setMoodDetectorVisible(false);
      } else throw new Error(data.error || 'Detection failed');
    } catch (error) {
      toast({ title: "Failed to load image", description: error instanceof Error ? error.message : "Please check the URL", variant: "destructive" });
    } finally { setIsLoading(false); setImageUrl(""); }
  };

  const changeEmotion = async (newEmotion: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/change-emotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion: newEmotion }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setSongs(data.tracks);
        toast({ title: "Emotion changed!", description: `Now showing ${data.emotion} songs` });
      }
    } catch (error) {
      toast({ title: "Failed to change emotion", description: "Please try again", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const toggleFavorite = (index: number) => {
    setFavorites(prev => prev.includes(index) ? prev.filter(id => id !== index) : [...prev, index]);
  };

  const playSong = (song: Song) => { setCurrentSong(song); setIsPlaying(true); setProgress(0); };
  const togglePlayPause = () => setIsPlaying(!isPlaying);

  const getSortedAndFilteredSongs = () => {
    let filtered = songs.filter(song => {
      const matchesSearch = song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterBy === "favorites") return matchesSearch && favorites.includes(songs.indexOf(song));
      return matchesSearch;
    });
    if (sortBy === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "artist") filtered.sort((a, b) => a.artist.localeCompare(b.artist));
    return filtered;
  };

  const filteredSongs = getSortedAndFilteredSongs();

  const emotionColors = {
    happy: "from-yellow-400 via-orange-400 to-yellow-500",
    sad: "from-blue-400 via-purple-400 to-blue-500",
    angry: "from-red-400 via-pink-400 to-red-500",
    surprise: "from-pink-400 via-purple-400 to-pink-500",
    neutral: "from-gray-400 via-slate-400 to-gray-500",
    fear: "from-purple-400 via-indigo-400 to-purple-500",
    disgust: "from-green-400 via-emerald-400 to-green-500",
  };

  const emotionGlows = {
    happy: "shadow-yellow-500/50",
    sad: "shadow-blue-500/50",
    angry: "shadow-red-500/50",
    surprise: "shadow-pink-500/50",
    neutral: "shadow-gray-500/50",
    fear: "shadow-purple-500/50",
    disgust: "shadow-green-500/50",
  };

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "search", icon: Search, label: "Search" },
    { id: "library", icon: Library, label: "Your Library" },
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br ${emotionColors[currentEmotion as keyof typeof emotionColors]} transition-all duration-1000`}>
      {currentSong && (
        <audio ref={audioRef} src={currentSong.audio}
          onError={() => toast({ title: "Playback error", description: "Could not play this track", variant: "destructive" })}
        />
      )}

      {/* Floating Emojis Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute text-6xl opacity-5"
            initial={{ x: Math.random() * 1000, y: -100 }}
            animate={{ y: 1000, x: Math.random() * 1000 }}
            transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, delay: i * 2 }}
          >
            {emotionEmojis[currentEmotion as keyof typeof emotionEmojis]}
          </motion.div>
        ))}
      </div>

      <div className="flex h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarExpanded ? 240 : 72 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-background/30 backdrop-blur-xl border-r border-white/10 flex flex-col z-50 fixed left-0 top-0"
        >
          {/* Logo & Toggle */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <AnimatePresence mode="wait">
              {sidebarExpanded && (
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
                >

                </motion.h1>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="text-black/70 hover:text-black hover:bg-black/10"
            >
              {sidebarExpanded ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Navigation */}
              <nav className="p-3 space-y-1">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${activeNav === item.id
                      ? "bg-black/20 text-black"
                      : "text-black/60 hover:text-black hover:bg-black/10"
                      }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {sidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}

                {/* Create Playlist */}
                <motion.button
                  onClick={() => toast({ title: "Create Playlist", description: "Feature coming soon!" })}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-lg text-black/60 hover:text-black hover:bg-black/10 transition-all mt-4"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {sidebarExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        Create Playlist
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </nav>

              {/* Recent Moods */}
              <AnimatePresence>
                {sidebarExpanded && recentMoods.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10 p-4"
                  >
                    <h3 className="text-xs font-semibold text-black/40 uppercase tracking-wider mb-3">
                      Recent Moods
                    </h3>
                    <div className="space-y-2">
                      {recentMoods.map((mood, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => changeEmotion(mood.emotion)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                        >
                          <span className="text-2xl">
                            {emotionEmojis[mood.emotion as keyof typeof emotionEmojis]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-black capitalize truncate">{mood.emotion}</p>
                            <p className="text-xs text-black/40">{mood.confidence}% confident</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed Recent Moods Icons */}
              {!sidebarExpanded && recentMoods.length > 0 && (
                <div className="border-t border-white/10 p-3 space-y-2">
                  {recentMoods.slice(0, 3).map((mood, i) => (
                    <motion.button
                      key={i}
                      onClick={() => changeEmotion(mood.emotion)}
                      className="w-full flex justify-center py-2 rounded-lg hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      title={mood.emotion}
                    >
                      <span className="text-xl">
                        {emotionEmojis[mood.emotion as keyof typeof emotionEmojis]}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Logout Button at bottom */}
            <div className="p-3 border-t border-white/10">
              <motion.button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-3 py-2 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span
                      className="font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          animate={{ marginLeft: sidebarExpanded ? 240 : 72 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 overflow-y-auto"
        >
          {/* Top Nav */}
          <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="sticky top-0 z-40 backdrop-blur-xl bg-background/30 border-b border-white/10"
          >
            <div className="px-6 py-4 flex items-center justify-between gap-6">
              {/* Left: Logo */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="text-3xl"
                >
                  🎵
                </motion.div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                  EmoTune
                </h1>
              </div>

              {/* Center: Home icon + Search Bar and Detect Mood Button */}
              <div className="flex-1 flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="relative">
                  <Home className="w-5 h-5" />
                </Button>
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="What do you want to play?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 placeholder:text-muted-foreground focus:bg-white/20"
                  />
                </div>
                <Button onClick={toggleMoodDetector} variant="outline" className="backdrop-blur-md bg-white/10 border-white/20">Detect Mood</Button>
              </div>

              {/* Right: Notification, Profile, Logout */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border border-white/20">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-sm font-semibold">Profile</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail || "User"}</p>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" onClick={handleSignOut} className="relative text-red-400 border-red-400/50 hover:bg-red-400/10 hover:text-red-300">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.nav>

          <AnimatePresence>
            {moodDetectorVisible && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pt-4 overflow-hidden"
              >
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                  <h3 className="text-lg font-semibold mb-3">Detect Your Mood</h3>
                  {cameraActive ? (
                    <div className="space-y-3">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto rounded-lg" />
                      <div className="flex gap-3 justify-center">
                        <Button onClick={capturePhoto} disabled={isLoading} size="sm">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                          Capture
                        </Button>
                        <Button onClick={stopCamera} variant="outline" size="sm">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={startCamera} size="sm" disabled={isLoading}>
                        <Camera className="w-4 h-4 mr-2" />Webcam
                      </Button>
                      <Button variant="outline" size="sm" disabled={isLoading} onClick={() => document.getElementById('file-upload')?.click()}>
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload
                      </Button>
                      <input id="file-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      <div className="flex gap-2 flex-1 min-w-[200px]">
                        <Input placeholder="Image URL..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                          className="backdrop-blur-md bg-white/10 border-white/20 h-9" disabled={isLoading} />
                        <Button variant="secondary" onClick={handleUrlSubmit} disabled={isLoading} size="sm">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <div className="px-6 py-6 pb-32 space-y-8">

            {/* Quick Access & Mood Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Liked Songs */}
              <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-md flex items-center overflow-hidden cursor-pointer group h-20">
                <div className="w-20 h-full bg-gradient-to-br from-purple-700 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-8 h-8 text-white fill-white" />
                </div>
                <span className="font-bold px-4 truncate">Liked Songs</span>
                <div className="ml-auto mr-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl bg-green-500 rounded-full p-3 scale-90 group-hover:scale-100">
                  <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                </div>
              </div>

              {/* Detected Emotion Card */}
              {songs.length > 0 && (
                <div className="bg-white/5 rounded-md flex items-center p-4 gap-4 h-20">
                  <span className="text-4xl">
                    {emotionEmojis[currentEmotion as keyof typeof emotionEmojis]}
                  </span>
                  <div className="overflow-hidden">
                    <p className={`text-sm ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'}`}>Current Vibe</p>
                    <p className="font-bold capitalize truncate">{currentEmotion}</p>
                    <p className={`text-xs ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'}`}>{confidence}% confidence</p>
                  </div>
                </div>
              )}

              {/* Change Mood Card */}
              <div className="bg-white/5 rounded-md p-3 flex flex-col justify-center h-20">
                <p className={`text-xs font-semibold mb-2 text-center ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'}`}>Change Mood</p>
                <div className="grid grid-cols-7 gap-1">
                  {Object.keys(emotionEmojis).map((emotion) => (
                    <Button key={emotion} onClick={() => changeEmotion(emotion)}
                      variant={currentEmotion === emotion ? "secondary" : "ghost"}
                      className="h-8 w-8 p-0"
                      size="icon"
                      disabled={isLoading}
                      title={emotion}
                    >
                      <span className="text-lg">{emotionEmojis[emotion as keyof typeof emotionEmojis]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Emotion-based Playlist Section */}
            {songs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-2xl font-bold mb-4 capitalize">{currentEmotion} Playlist</h2>
                <div className="bg-black/20 backdrop-blur-sm rounded-lg">
                  <div className={`grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} text-sm uppercase`}>
                    <span>#</span>
                    <span>Title</span>
                    <span><Volume2 className="w-4 h-4" /></span>
                  </div>
                  {songs.map((song, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 hover:bg-white/10 rounded-md group transition cursor-pointer ${currentSong?.name === song.name ? 'text-green-500' : ''}`}
                      onClick={() => playSong(song)}
                    >
                      <div className={`flex items-center justify-center w-4 ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} group-hover:text-white`}>
                        {currentSong?.name === song.name && isPlaying ? (
                          <img src="https://open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2ef4.gif" className="w-3" />
                        ) : (
                          <span className="group-hover:hidden">{i + 1}</span>
                        )}
                        <Play className="w-3 h-3 hidden group-hover:block text-white" fill="currentColor" />
                      </div>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={song.image || "https://via.placeholder.com/40"} className="w-10 h-10 rounded" />
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-white truncate">{song.name}</span>
                          <span className={`text-xs ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} truncate`}>{song.artist}</span>
                        </div>
                      </div>
                      <div className={`${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} text-xs text-right`}>
                        {Math.floor(Math.random() * 3) + 2}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Made For You Section */}
            <section>
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-2xl font-bold hover:underline cursor-pointer">Made For You</h2>
                <span className={`text-sm ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} font-bold hover:underline cursor-pointer uppercase tracking-wider`}>Show all</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {trendingMusic.length > 0 ? trendingMusic.map((item, i) => (
                  <div key={i} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition duration-300 group cursor-pointer">
                    <div className="relative mb-4 shadow-lg rounded-md overflow-hidden">
                      <img src={item.image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"} alt={item.name} className="w-full aspect-square object-cover" />
                      <Button
                        className="absolute bottom-2 right-2 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 w-12 h-12"
                        size="icon"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </Button>
                    </div>
                    <h3 className="font-bold truncate mb-1">{item.name}</h3>
                    <p className={`text-sm ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} truncate line-clamp-2`}>{item.artist}</p>
                  </div>
                )) : (
                  // Placeholders if no data
                  [1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition duration-300 group cursor-pointer">
                      <div className="relative mb-4 shadow-lg rounded-md overflow-hidden bg-[#282828] aspect-square flex items-center justify-center">
                        <span className="text-4xl opacity-20">🎵</span>
                      </div>
                      <div className="h-4 bg-[#282828] rounded w-3/4 mb-2" />
                      <div className="h-3 bg-[#282828] rounded w-1/2" />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </motion.main>
      </div>

      {/* Persistent Player Bar */}
      <AnimatePresence>
        {currentSong && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 h-20 bg-black/40 backdrop-blur-xl border-t border-white/10 z-50 px-3 flex items-center justify-between"
          >
            {/* Song Info */}
            <div className="flex items-center gap-3 w-[30%]">
              <img src={currentSong.image || "https://via.placeholder.com/60"} alt={currentSong.name} className="w-12 h-12 rounded-md shadow-lg" />
              <div className="overflow-hidden">
                <h4 className="font-bold text-white truncate">{currentSong.name}</h4>
                <p className={`text-xs ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} truncate`}>{currentSong.artist}</p>
              </div>
              <Button variant="ghost" size="icon" className={`${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} hover:text-white hidden md:flex`}>
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Player Controls */}
            <div className="flex flex-col items-center w-[40%] gap-1">
              <div className="flex items-center gap-5">
                <Button variant="ghost" size="icon" className={`${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} hover:text-white`} onClick={shuffleSongs}>
                  <Shuffle className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:scale-110 transition" onClick={() => {
                  const currentIndex = songs.findIndex(s => s.name === currentSong.name);
                  const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
                  playSong(songs[prevIndex]);
                }}>
                  <SkipBack className="w-4 h-4 fill-current" />
                </Button>
                <Button
                  size="icon"
                  className="w-8 h-8 rounded-full bg-white text-black hover:scale-105 transition shadow-lg hover:bg-gray-200"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:scale-110 transition" onClick={skipCurrentSong}>
                  <SkipForward className="w-4 h-4 fill-current" />
                </Button>
                <Button variant="ghost" size="icon" className={`${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} hover:text-white`}>
                  <Link2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full max-w-md">
                <span className={`text-xs ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} font-mono`}>
                  {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}
                </span>
                <div className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
                  onClick={(e) => {
                    if (audioRef.current) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = percent * audioRef.current.duration;
                    }
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <span className={`text-xs ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} font-mono`}>
                  {audioRef.current && !isNaN(audioRef.current.duration) ? formatTime(audioRef.current.duration) : "0:00"}
                </span>
              </div>
            </div>

            {/* Volume & Extras */}
            <div className="flex items-center justify-end gap-2 w-[30%]">
              <Button variant="ghost" size="icon" className={`${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'} hover:text-white`} onClick={() => shareSong(currentSong)}>
                <Share2 className="w-3 h-3" />
              </Button>
              <div className="flex items-center gap-2 w-28 group">
                <Volume2 className={`w-4 h-4 ${currentEmotion === 'happy' ? 'text-white/80' : 'text-gray-400'}`} />
                <div className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-3/4 bg-white group-hover:bg-green-500 transition-colors" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper for time formatting
const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default Dashboard;
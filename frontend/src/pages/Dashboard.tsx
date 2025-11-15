import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, Upload, Link2, Play, Pause, Heart, 
  SkipBack, SkipForward, Search, Volume2, Loader2,
  LogOut, Shuffle, SlidersHorizontal, Share2, X, Grid3x3, List as ListIcon
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();

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
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong]);

  const handleSignOut = () => {
    // Reset all state
    setCurrentEmotion("happy");
    setConfidence(0);
    setSongs([]);
    setCurrentSong(null);
    setIsPlaying(false);
    setDetectedImageUrl(null);
    setShowDetection(true);
    
    toast({
      title: "Signed out successfully",
      description: "See you next time!",
    });
  };

  const shuffleSongs = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setSongs(shuffled);
    toast({
      title: "Playlist shuffled",
      description: "Songs are now in random order",
    });
  };

  const shareSong = (song: Song) => {
    const shareText = `Check out "${song.name}" by ${song.artist} on EmoTune!`;
    
    if (navigator.share) {
      navigator.share({
        title: song.name,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard!",
        description: "Share this song with your friends",
      });
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
        toast({
          title: "Camera activated",
          description: "Position your face and capture!",
        });
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera permissions",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
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

        const response = await fetch(`${BACKEND_URL}/predict`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setCurrentEmotion(data.emotion.toLowerCase());
          setConfidence(data.confidence);
          setSongs(data.tracks);
          setDetectedImageUrl(imageData);
          setShowDetection(false);
          
          toast({
            title: "Emotion detected!",
            description: `You're feeling ${data.emotion} (${data.confidence}% confidence)`,
          });
        } else {
          throw new Error(data.error || 'Detection failed');
        }
      } catch (error) {
        console.error("Capture error:", error);
        toast({
          title: "Detection failed",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
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

      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setConfidence(data.confidence);
        setSongs(data.tracks);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setDetectedImageUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        setShowDetection(false);
        
        toast({
          title: "Image uploaded!",
          description: `Emotion detected: ${data.emotion} (${data.confidence}% confidence)`,
        });
      } else {
        throw new Error(data.error || 'Detection failed');
      }
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "No URL provided",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('input_type', 'url');
      formData.append('image_url', imageUrl);

      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setConfidence(data.confidence);
        setSongs(data.tracks);
        setDetectedImageUrl(imageUrl);
        setShowDetection(false);
        
        toast({
          title: "Image loaded!",
          description: `Emotion detected: ${data.emotion} (${data.confidence}% confidence)`,
        });
      } else {
        throw new Error(data.error || 'Detection failed');
      }
      
    } catch (error) {
      console.error("URL error:", error);
      toast({
        title: "Failed to load image",
        description: error instanceof Error ? error.message : "Please check the URL and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setImageUrl("");
    }
  };

  const changeEmotion = async (newEmotion: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/change-emotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emotion: newEmotion }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentEmotion(data.emotion.toLowerCase());
        setSongs(data.tracks);
        
        toast({
          title: "Emotion changed!",
          description: `Now showing ${data.emotion} songs`,
        });
      }
    } catch (error) {
      console.error("Change emotion error:", error);
      toast({
        title: "Failed to change emotion",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = (index: number) => {
    setFavorites(prev => 
      prev.includes(index) 
        ? prev.filter(id => id !== index)
        : [...prev, index]
    );
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const getSortedAndFilteredSongs = () => {
    let filtered = songs.filter(song => {
      const matchesSearch = song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           song.artist.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filterBy === "favorites") {
        return matchesSearch && favorites.includes(songs.indexOf(song));
      }
      
      return matchesSearch;
    });

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "artist") {
      filtered.sort((a, b) => a.artist.localeCompare(b.artist));
    }

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

  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br ${emotionColors[currentEmotion as keyof typeof emotionColors]} transition-all duration-1000`}>
      {currentSong && (
        <audio
          ref={audioRef}
          src={currentSong.audio}
          onError={(e) => {
            console.error("Audio error:", e);
            toast({
              title: "Playback error",
              description: "Could not play this track",
              variant: "destructive",
            });
          }}
        />
      )}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-5"
            initial={{ x: Math.random() * 1000, y: -100 }}
            animate={{
              y: 1000,
              x: Math.random() * 1000,
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 2,
            }}
          >
            {emotionEmojis[currentEmotion as keyof typeof emotionEmojis]}
          </motion.div>
        ))}
      </div>

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/30 border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetection(!showDetection)}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Detect Mood
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-black-400 hover:text-black-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.nav>

      <div className="container mx-auto px-6 py-8 pb-32">
        <div className="flex items-start gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-6xl mb-3 inline-block"
              >
                {emotionEmojis[currentEmotion as keyof typeof emotionEmojis]}
              </motion.div>
              <h2 className="text-3xl font-bold mb-1 capitalize">
                Feeling {currentEmotion}
              </h2>
              <p className="text-muted-foreground">
                Your personalized playlist
              </p>
              {confidence > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Confidence: {confidence}%
                </div>
              )}
            </motion.div>

            {detectedImageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex justify-center"
              >
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-2 max-w-xs">
                  <img
                    src={detectedImageUrl}
                    alt="Detected emotion"
                    className="w-20 rounded-lg shadow-lg"
                  />
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {showDetection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                    <h3 className="text-lg font-semibold mb-3">Detect Your Mood</h3>
                    
                    {cameraActive ? (
                      <div className="space-y-3">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full max-w-md mx-auto rounded-lg"
                        />
                        <div className="flex gap-3 justify-center">
                          <Button onClick={capturePhoto} disabled={isLoading} size="sm">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            Capture
                          </Button>
                          <Button onClick={stopCamera} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={startCamera} size="sm" disabled={isLoading}>
                          <Camera className="w-4 h-4 mr-2" />
                          Webcam
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                          Upload
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        
                        <div className="flex gap-2 flex-1 min-w-[200px]">
                          <Input
                            placeholder="Image URL..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="backdrop-blur-md bg-white/10 border-white/20 h-9"
                            disabled={isLoading}
                          />
                          <Button 
                            variant="secondary" 
                            onClick={handleUrlSubmit}
                            disabled={isLoading}
                            size="sm"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {songs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-3 mb-6 flex items-center gap-3 flex-wrap"
              >
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 backdrop-blur-md bg-white/10 border-white/20 h-9"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shuffleSongs}
                  className="gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </Button>

                {/* View Toggle Buttons */}
                <div className="flex gap-1 border border-white/20 rounded-lg p-1 bg-white/5">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="gap-1"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="gap-1"
                  >
                    <ListIcon className="w-4 h-4" />
                  </Button>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 h-9 backdrop-blur-md bg-white/10 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="artist">By Artist</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-32 h-9 backdrop-blur-md bg-white/10 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Songs</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            {filteredSongs.length > 0 ? (
              viewMode === "grid" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              >
                {filteredSongs.map((song, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg ${
                      currentSong?.name === song.name ? emotionGlows[currentEmotion as keyof typeof emotionGlows] : ""
                    }`}
                  >
                    <div className="relative mb-3 group">
                      <img
                        src={song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                        alt={song.name}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      
                      {currentSong?.name === song.name && isPlaying ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skipCurrentSong}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <X className="w-5 h-5 text-white" />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => playSong(song)}
                          className="absolute inset-0 m-auto w-14 h-14 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                        >
                          <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                        </motion.button>
                      )}
                      
                      {currentSong?.name === song.name && isPlaying && (
                        <div className="absolute bottom-2 left-2 right-2 flex items-end gap-1 h-6">
                          {[...Array(10)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="flex-1 bg-white rounded-full"
                              animate={{
                                height: ["20%", "100%", "20%"],
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.1,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold truncate text-xs">{song.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{song.genre}</p>
                      
                      {/* Centered Control Buttons */}
                      <div className="flex items-center justify-center gap-3 py-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => skipCurrentSong()}
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                          title="Previous"
                        >
                          <SkipBack className="w-4 h-4" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => playSong(song)}
                          className="p-2 bg-primary hover:bg-primary/90 rounded-full transition-colors"
                          title="Play"
                        >
                          {currentSong?.name === song.name && isPlaying ? (
                            <Pause className="w-5 h-5 text-primary-foreground" fill="currentColor" />
                          ) : (
                            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                          )}
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => skipCurrentSong()}
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                          title="Next"
                        >
                          <SkipForward className="w-4 h-4" />
                        </motion.button>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">{song.source}</span>
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => shareSong(song)}
                            className="text-blue-400 p-1"
                          >
                            <Share2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleFavorite(index)}
                            className="text-pink-500 p-1"
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={favorites.includes(index) ? "currentColor" : "none"}
                            />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              ) : (
              // List View
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {filteredSongs.map((song, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, x: 5 }}
                    className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg flex items-center gap-4 ${
                      currentSong?.name === song.name ? emotionGlows[currentEmotion as keyof typeof emotionGlows] : ""
                    }`}
                  >
                    {/* Album Art */}
                    <div className="relative w-16 h-16 flex-shrink-0 group">
                      <img
                        src={song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                        alt={song.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {currentSong?.name === song.name && isPlaying ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skipCurrentSong}
                          className="absolute inset-0 m-auto w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <X className="w-4 h-4 text-white" />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => playSong(song)}
                          className="absolute inset-0 m-auto w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
                        </motion.button>
                      )}
                    </div>

                    {/* Song Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm">{song.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      <p className="text-xs text-muted-foreground">{song.genre} • {song.source}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => shareSong(song)}
                        className="text-blue-400 p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleFavorite(index)}
                        className="text-pink-500 p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Heart
                          className="w-5 h-5"
                          fill={favorites.includes(index) ? "currentColor" : "none"}
                        />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              )
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {songs.length === 0 
                    ? "Detect your mood to get personalized music recommendations!"
                    : "No songs found matching your search."}
                </p>
              </div>
            )}
          </div>

          {/* Compact Mood Selector Sidebar */}
          {songs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={viewMode === "list" ? "w-64 sticky top-24 space-y-4" : "w-20 sticky top-24"}
            >
              {/* Detected Image (List View Only) */}
              {viewMode === "list" && detectedImageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-2"
                >
                  <img
                    src={detectedImageUrl}
                    alt="Your detected emotion"
                    className="w-full rounded-lg shadow-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">Your Mood</p>
                </motion.div>
              )}

              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-3">
                <h3 className="text-xs font-semibold mb-3 text-center">Mood</h3>
                <div className={viewMode === "list" ? "grid grid-cols-4 gap-2" : "space-y-2"}>
                  {Object.keys(emotionEmojis).map((emotion) => (
                    <Button
                      key={emotion}
                      onClick={() => changeEmotion(emotion)}
                      variant={currentEmotion === emotion ? "default" : "ghost"}
                      className={viewMode === "list" ? "h-auto py-2 flex flex-col gap-1" : "w-full h-auto py-2 flex flex-col gap-1"}
                      disabled={isLoading}
                      size="sm"
                    >
                      <span className="text-xl">{emotionEmojis[emotion as keyof typeof emotionEmojis]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {currentSong && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 backdrop-blur-2xl bg-background/80 border-t border-white/20 p-4 z-50"
          >
            <div className="container mx-auto">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={currentSong.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                    alt={currentSong.name}
                    className="w-14 h-14 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{currentSong.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {currentSong.artist}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="hover:bg-white/20">
                      <SkipBack className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={togglePlayPause}
                      className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" fill="currentColor" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hover:bg-white/20"
                      onClick={skipCurrentSong}
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="w-full max-w-md">
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${emotionColors[currentEmotion as keyof typeof emotionColors]}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => currentSong && shareSong(currentSong)}
                    className="hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
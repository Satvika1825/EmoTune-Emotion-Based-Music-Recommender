import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, Upload, Link as LinkIcon, Play, Pause, Heart, 
  SkipBack, SkipForward, Search, Volume2, Loader2
} from "lucide-react";

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
        
        // Create preview URL for uploaded image
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

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         song.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
              MoodTune
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
          </div>
        </div>
      </motion.nav>

      <div className="container mx-auto px-6 py-8 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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
            className="text-8xl mb-4 inline-block"
          >
            {emotionEmojis[currentEmotion as keyof typeof emotionEmojis]}
          </motion.div>
          <h2 className="text-4xl font-bold mb-2 capitalize">
            Feeling {currentEmotion}
          </h2>
          <p className="text-muted-foreground text-lg">
            Here's your personalized playlist
          </p>
          {confidence > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Confidence: {confidence}%</span>
            </div>
          )}
        </motion.div>

        {/* Detected Image Display */}
        {detectedImageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 flex justify-center"
          >
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-4 max-w-md">
              <img
                src={detectedImageUrl}
                alt="Detected emotion"
                className="w-full rounded-2xl shadow-2xl"
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
              className="mb-8 overflow-hidden"
            >
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                <h3 className="text-xl font-semibold mb-4">Detect Your Mood</h3>
                
                {cameraActive ? (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md mx-auto rounded-lg"
                    />
                    <div className="flex gap-4 justify-center">
                      <Button onClick={capturePhoto} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={startCamera}
                      className="gap-2"
                      disabled={isLoading}
                    >
                      <Camera className="w-4 h-4" />
                      Use Webcam
                    </Button>
                    
                    <label>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('file-upload')?.click();
                        }}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Image
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    
                    <div className="flex gap-2 flex-1 min-w-[200px]">
                      <Input
                        placeholder="Or paste image URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="backdrop-blur-md bg-white/10 border-white/20"
                        disabled={isLoading}
                      />
                      <Button 
                        variant="secondary" 
                        onClick={handleUrlSubmit}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
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
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-8"
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Change Your Mood</h3>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {Object.keys(emotionEmojis).map((emotion) => (
                <Button
                  key={emotion}
                  onClick={() => changeEmotion(emotion)}
                  variant={currentEmotion === emotion ? "default" : "outline"}
                  className="flex flex-col gap-1 h-auto py-3"
                  disabled={isLoading}
                >
                  <span className="text-2xl">{emotionEmojis[emotion as keyof typeof emotionEmojis]}</span>
                  <span className="text-xs capitalize">{emotion}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {songs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 mb-8"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 backdrop-blur-md bg-white/10 border-white/20"
              />
            </div>
          </motion.div>
        )}

        {filteredSongs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredSongs.map((song, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-2xl ${
                  currentSong?.name === song.name ? emotionGlows[currentEmotion as keyof typeof emotionGlows] : ""
                }`}
              >
                <div className="relative mb-4 group">
                  <img
                    src={song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                    alt={song.name}
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => playSong(song)}
                    className="absolute inset-0 m-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                  >
                    <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                  </motion.button>
                  
                  {currentSong?.name === song.name && isPlaying && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-end gap-1 h-8">
                      {[...Array(12)].map((_, i) => (
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
                  <h3 className="font-semibold truncate">{song.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  <p className="text-xs text-muted-foreground">{song.genre}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{song.source}</span>
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleFavorite(index)}
                      className="text-pink-500"
                    >
                      <Heart
                        className="w-5 h-5"
                        fill={favorites.includes(index) ? "currentColor" : "none"}
                      />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
                    <Button variant="ghost" size="icon" className="hover:bg-white/20">
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
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, Upload, Link2, Loader2, Search, Shuffle,
  Grid3x3, List
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Song {
  name: string;
  artist: string;
  audio: string;
  image: string;
  genre: string;
  source: string;
}

interface MainContentProps {
  currentEmotion: string;
  confidence: number;
  emotionEmojis: Record<string, string>;
  detectedImageUrl: string | null;
  showDetection: boolean;
  cameraActive: boolean;
  isLoading: boolean;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filterBy: string;
  setFilterBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  songs: Song[];
  filteredSongs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  favorites: number[];
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => void;
  stopCamera: () => void;
  capturePhoto: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUrlSubmit: () => void;
  shuffleSongs: () => void;
  playSong: (song: Song) => void;
  skipCurrentSong: () => void;
  togglePlayPause: () => void;
  shareSong: (song: Song) => void;
  toggleFavorite: (index: number) => void;
  SongCard: any;
  SongListItem: any;
  emotionGlows: Record<string, string>;
  emotionColors: Record<string, string>;
}

const MainContent = ({
  currentEmotion,
  confidence,
  emotionEmojis,
  detectedImageUrl,
  showDetection,
  cameraActive,
  isLoading,
  imageUrl,
  setImageUrl,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  filterBy,
  setFilterBy,
  viewMode,
  setViewMode,
  songs,
  filteredSongs,
  currentSong,
  isPlaying,
  progress,
  favorites,
  videoRef,
  startCamera,
  stopCamera,
  capturePhoto,
  handleFileUpload,
  handleUrlSubmit,
  shuffleSongs,
  playSong,
  skipCurrentSong,
  togglePlayPause,
  shareSong,
  toggleFavorite,
  SongCard,
  SongListItem,
  emotionGlows,
  emotionColors,
}: MainContentProps) => {
  return (
    <>
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
              <List className="w-4 h-4" />
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
              <SongCard 
                key={index}
                song={song}
                index={index}
                currentSong={currentSong}
                isPlaying={isPlaying}
                favorites={favorites}
                currentEmotion={currentEmotion}
                emotionGlows={emotionGlows}
                emotionColors={emotionColors}
                progress={progress}
                playSong={playSong}
                skipCurrentSong={skipCurrentSong}
                togglePlayPause={togglePlayPause}
                shareSong={shareSong}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredSongs.map((song, index) => (
              <SongListItem
                key={index}
                song={song}
                index={index}
                currentSong={currentSong}
                isPlaying={isPlaying}
                favorites={favorites}
                currentEmotion={currentEmotion}
                emotionGlows={emotionGlows}
                playSong={playSong}
                skipCurrentSong={skipCurrentSong}
                shareSong={shareSong}
                toggleFavorite={toggleFavorite}
              />
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
    </>
  );
};

export default MainContent;
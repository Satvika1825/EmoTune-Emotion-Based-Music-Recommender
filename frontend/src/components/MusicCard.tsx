import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MusicCardProps {
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  index: number;
}

export const MusicCard = ({ title, artist, album, coverUrl, index }: MusicCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 45 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.1, type: "spring" }}
      whileHover={{ scale: 1.05, y: -10 }}
      className="group relative"
    >
      <div className="backdrop-blur-xl bg-glass-bg border border-glass-border rounded-2xl p-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-emotion-surprise/20">
        <div className="relative mb-4 overflow-hidden rounded-xl">
          <motion.img
            src={coverUrl}
            alt={album}
            className="w-full aspect-square object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Overlay on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center"
          >
            <Button
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-full w-16 h-16 bg-emotion-happy hover:bg-emotion-happy-glow"
            >
              <motion.div
                animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.5, repeat: isPlaying ? Infinity : 0 }}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </motion.div>
            </Button>
          </motion.div>

          {/* Audio visualization when playing */}
          {isPlaying && (
            <div className="absolute bottom-2 left-2 right-2 flex items-end gap-1 h-8">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-emotion-happy rounded-full"
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
        
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground truncate">{title}</h4>
          <p className="text-sm text-muted-foreground truncate">{artist}</p>
          <p className="text-xs text-muted-foreground/60 truncate">{album}</p>
        </div>
      </div>
    </motion.div>
  );
};

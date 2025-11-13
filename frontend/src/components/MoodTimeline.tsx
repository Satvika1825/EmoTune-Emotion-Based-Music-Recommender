import { motion } from "framer-motion";

interface MoodEntry {
  emotion: string;
  timestamp: string;
  emoji: string;
}

interface MoodTimelineProps {
  history: MoodEntry[];
}

export const MoodTimeline = ({ history }: MoodTimelineProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="backdrop-blur-xl bg-glass-bg border border-glass-border rounded-2xl p-6 shadow-xl"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🕐</span>
        Mood History
      </h3>
      
      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No mood history yet. Start detecting!
          </p>
        ) : (
          history.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/30 hover:bg-background/50 transition-colors"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
                className="text-2xl"
              >
                {entry.emoji}
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">{entry.emotion}</p>
                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
              <div className="w-2 h-2 bg-emotion-surprise rounded-full" />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

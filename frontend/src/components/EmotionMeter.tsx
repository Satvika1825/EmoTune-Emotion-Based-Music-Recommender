import { motion } from "framer-motion";

interface EmotionMeterProps {
  emotion: string;
  confidence: number;
  model: string;
}

const emotionEmojis = {
  happy: "😄",
  sad: "😢",
  angry: "😡",
  surprise: "😲",
  neutral: "😐",
  fear: "😰",
  disgust: "🤢",
};

export const EmotionMeter = ({ emotion, confidence, model }: EmotionMeterProps) => {
  const emoji = emotionEmojis[emotion as keyof typeof emotionEmojis] || "😐";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="backdrop-blur-xl bg-glass-bg border border-glass-border rounded-3xl p-6 shadow-2xl"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-6xl mb-4"
        >
          {emoji}
        </motion.div>
        
        <h3 className="text-2xl font-bold mb-2 capitalize">{emotion}</h3>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Confidence</span>
            <span>{Math.round(confidence)}%</span>
          </div>
          
          <div className="relative h-3 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emotion-happy to-emotion-surprise rounded-full"
            />
          </div>
        </div>

        {/* Particle effects around the meter */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-emotion-surprise rounded-full"
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
            }}
            animate={{
              x: Math.cos((i / 8) * Math.PI * 2) * 60,
              y: Math.sin((i / 8) * Math.PI * 2) * 60,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
        
        <p className="text-xs text-muted-foreground">
          Detected by {model}
        </p>
      </div>
    </motion.div>
  );
};

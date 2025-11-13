import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface EmotionBackgroundProps {
  emotion: string;
}

const emotionGradients = {
  happy: "from-emotion-happy via-emotion-happy-glow to-emotion-surprise",
  sad: "from-emotion-sad via-emotion-sad-secondary to-emotion-neutral",
  angry: "from-emotion-angry via-emotion-angry-glow to-destructive",
  surprise: "from-emotion-surprise via-emotion-surprise-glow to-emotion-happy",
  neutral: "from-emotion-neutral via-emotion-neutral-secondary to-muted",
  fear: "from-emotion-fear via-emotion-sad to-emotion-neutral",
  disgust: "from-emotion-disgust via-emotion-neutral to-muted",
};

export const EmotionBackground = ({ emotion }: EmotionBackgroundProps) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 30 }, (_, i) => i));
  }, []);

  const gradient = emotionGradients[emotion as keyof typeof emotionGradients] || emotionGradients.neutral;

  return (
    <motion.div
      key={emotion}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className={`fixed inset-0 bg-gradient-to-br ${gradient} -z-10`}
    >
      {/* Animated gradient overlay */}
      <motion.div
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute inset-0 bg-gradient-to-br from-transparent via-background/10 to-transparent"
        style={{ backgroundSize: "200% 200%" }}
      />

      {/* Floating particles */}
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-foreground/20 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </motion.div>
  );
};

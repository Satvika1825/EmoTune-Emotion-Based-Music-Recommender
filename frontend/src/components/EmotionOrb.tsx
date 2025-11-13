import { motion } from "framer-motion";

interface EmotionOrbProps {
  emotion: string;
}

const emotionColors = {
  happy: "bg-emotion-happy",
  sad: "bg-emotion-sad",
  angry: "bg-emotion-angry",
  surprise: "bg-emotion-surprise",
  neutral: "bg-emotion-neutral",
  fear: "bg-emotion-fear",
  disgust: "bg-emotion-disgust",
};

const emotionAnimations: any = {
  happy: {
    y: [0, -20, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
  sad: {
    y: [0, 5, 0],
    scale: [1, 0.95, 1],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  angry: {
    scale: [1, 1.2, 1],
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.5, repeat: Infinity },
  },
  surprise: {
    scale: [1, 1.3, 1],
    rotate: [0, 360],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  neutral: {
    y: [0, -10, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
  fear: {
    x: [-5, 5, -5],
    scale: [1, 0.9, 1],
    transition: { duration: 0.3, repeat: Infinity },
  },
  disgust: {
    rotate: [0, -10, 10, 0],
    transition: { duration: 1, repeat: Infinity },
  },
};

export const EmotionOrb = ({ emotion }: EmotionOrbProps) => {
  const color = emotionColors[emotion as keyof typeof emotionColors] || emotionColors.neutral;
  const animation = emotionAnimations[emotion as keyof typeof emotionAnimations] || emotionAnimations.neutral;

  return (
    <div className="flex justify-center items-center py-8">
      <motion.div
        animate={animation}
        className="relative"
      >
        <div className={`w-32 h-32 ${color} rounded-full blur-3xl opacity-60 absolute inset-0`} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={`w-32 h-32 ${color} rounded-full relative`}
        >
          <div className="absolute inset-2 bg-background/20 rounded-full" />
          <div className="absolute inset-4 bg-background/40 rounded-full" />
          <div className="absolute inset-6 bg-background/60 rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
};

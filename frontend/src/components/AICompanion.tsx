import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

interface AICompanionProps {
  emotion: string;
  message: string;
}

const companionMessages = {
  happy: "You look cheerful today 😄 Want to keep the vibe going?",
  sad: "Hey, you seem a bit low. Let's brighten things up 💛",
  angry: "I sense some intensity. Let's find calming tunes 🌊",
  surprise: "Wow! That's exciting energy! ✨",
  neutral: "Looking chill today. What's your mood? 🎵",
  fear: "Everything's okay. Let me find something soothing 🕊️",
  disgust: "Not feeling it? Let's switch the vibe 🔄",
};

export const AICompanion = ({ emotion }: AICompanionProps) => {
  const message = companionMessages[emotion as keyof typeof companionMessages] || companionMessages.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-6 left-6 z-50"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={emotion}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="backdrop-blur-xl bg-glass-bg border border-glass-border rounded-2xl p-4 shadow-xl max-w-xs"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex-shrink-0"
            >
              <Bot className="w-8 h-8 text-emotion-surprise" />
            </motion.div>
            <div className="flex-1">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-foreground"
              >
                {message}
              </motion.p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ArrowRight, Brain, Music } from "lucide-react";
import musicBackground from "@/assets/music-background.jpg";

// TypeScript declarations for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

// Google Sign-In Script Loader
const loadGoogleScript = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve(window.google);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Your Google OAuth Client ID from Google Cloud Console
  // Replace with your actual Client ID
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "441326508191-b9d8druejk8t2c60dl4f2ie8lt672mp1.apps.googleusercontent.com";

  useEffect(() => {
    // Initialize Google Sign-In
    loadGoogleScript()
      .then(() => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
          });
          
          // Render the Google button
          const buttonDiv = document.getElementById("googleSignInButton");
          if (buttonDiv) {
            window.google.accounts.id.renderButton(buttonDiv, {
              theme: "filled_black",
              size: "large",
              width: 350,
              text: "continue_with",
              shape: "rectangular",
            });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load Google Sign-In:", err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleCallback = async (response: any) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
      } else {
        // Store tokens in localStorage
        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        alert(`Welcome ${data.user.name || data.user.email}!`);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = isSignUp
        ? "http://localhost:5000/register"
        : "http://localhost:5000/login";

      const body = isSignUp
        ? { email, password, confirmPassword }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
      } else {
        if (data.session) {
          // Store tokens in localStorage
          localStorage.setItem("access_token", data.session.access_token);
          localStorage.setItem("refresh_token", data.session.refresh_token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        
        alert(data.message);
        
        if (!isSignUp) {
          navigate("/dashboard");
        } else {
          alert("Please check your email to verify your account!");
        }
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const musicalNotes = ["♪", "♫", "♬", "♩", "♭", "♮", "♯", "𝄞"];
  const bokehColors = [
    "bg-pink-500/30",
    "bg-fuchsia-500/30",
    "bg-purple-500/30",
    "bg-violet-500/30",
    "bg-rose-500/30",
    "bg-magenta-500/30",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Music background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${musicBackground})` }}
      />
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Subtle bokeh effect */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`bokeh-${i}`}
            className={`absolute rounded-full blur-3xl ${
              bokehColors[i % bokehColors.length]
            }`}
            style={{
              width: Math.random() * 300 + 150,
              height: Math.random() * 300 + 150,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          <div className="bg-black/20 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            {/* Header */}
            <div className="p-8 pb-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-pink-400/30">
                  <Brain className="w-8 h-8 text-pink-400" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2 text-center text-white"
              >
                {isSignUp ? "Sign Up" : "Login"}
              </motion.h1>
            </div>

            {/* Form */}
            <div className="px-8 pb-8">
              <motion.div
                key={isSignUp ? "signup" : "signin"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-pink-400/50 focus:ring-pink-400/20 backdrop-blur-sm"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Input
                      type="password"
                      placeholder={isSignUp ? "Create a password" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-pink-400/50 focus:ring-pink-400/20 backdrop-blur-sm"
                      required
                      disabled={loading}
                    />
                  </div>

                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-pink-400/50 focus:ring-pink-400/20 backdrop-blur-sm"
                        required
                        disabled={loading}
                      />
                    </motion.div>
                  )}

                  {!isSignUp && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="remember"
                          className="w-4 h-4 text-pink-500 border-white/20 rounded focus:ring-pink-500/50 bg-white/5"
                          disabled={loading}
                        />
                        <label htmlFor="remember" className="ml-2 text-gray-300">
                          Remember me
                        </label>
                      </div>
                      <button
                        type="button"
                        className="text-pink-400 hover:text-pink-300 transition-colors"
                        disabled={loading}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-white/90 hover:bg-white text-gray-900 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border-0 mt-6"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log in"}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 text-gray-400 bg-black/20 backdrop-blur-sm">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <div className="flex justify-center">
                  <div id="googleSignInButton"></div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-300">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-pink-400 hover:text-pink-300 transition-colors font-semibold"
                      disabled={loading}
                    >
                      {isSignUp ? "Sign in" : "Register"}
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Tech footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
              <Music className="w-3 h-3 text-pink-400" />
              <span>Powered by AI</span>
              <span>•</span>
              <span>EmoTune</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
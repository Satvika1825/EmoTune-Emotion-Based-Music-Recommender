import { useState } from "react";
import { motion } from "framer-motion";

interface HomeSectionProps {
  currentEmotion: string;
  onPlaylistClick?: (playlistId: string) => void;
}

const emotionColors: Record<string, string> = {
  happy: "from-yellow-400 via-orange-400 to-yellow-500",
  sad: "from-blue-400 via-purple-400 to-blue-500",
  angry: "from-red-400 via-pink-400 to-red-500",
  surprise: "from-pink-400 via-purple-400 to-pink-500",
  neutral: "from-gray-400 via-slate-400 to-gray-500",
  fear: "from-purple-400 via-indigo-400 to-purple-500",
  disgust: "from-green-400 via-emerald-400 to-green-500",
};

const HomeSection = ({ currentEmotion, onPlaylistClick }: HomeSectionProps) => {
  const [activeTab, setActiveTab] = useState("All");

  const tabs = ["All", "Music", "Podcasts"];

  const quickAccessPlaylists = [
    {
      id: "liked",
      name: "Liked Songs",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
    {
      id: "happy",
      name: "Happy Mood Mix",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
      color: "bg-gradient-to-br from-yellow-500 to-orange-500",
    },
    {
      id: "calm",
      name: "Calm & Relaxed",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400",
      color: "bg-gradient-to-br from-blue-400 to-cyan-500",
    },
    {
      id: "energetic",
      name: "Energetic Vibes",
      image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400",
      color: "bg-gradient-to-br from-red-500 to-pink-500",
    },
  ];

  const madeForYou = [
    {
      id: "discover",
      name: "Discover Weekly",
      description: "Your weekly mixtape of fresh music",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      type: "special",
    },
    {
      id: "daily1",
      name: "Daily Mix 1",
      description: "Personalized playlist",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
      number: "01",
    },
    {
      id: "daily2",
      name: "Daily Mix 2",
      description: "Personalized playlist",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400",
      number: "02",
    },
    {
      id: "daily3",
      name: "Daily Mix 3",
      description: "Personalized playlist",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400",
      number: "03",
    },
    {
      id: "daily4",
      name: "Daily Mix 4",
      description: "Personalized playlist",
      image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400",
      number: "04",
    },
  ];

  const popularAlbums = [
    {
      id: "album1",
      name: "Midnight Dreams",
      artist: "The Dreamers",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
    },
    {
      id: "album2",
      name: "Summer Vibes",
      artist: "Coastal Band",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400",
    },
    {
      id: "album3",
      name: "Urban Nights",
      artist: "City Lights",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400",
    },
    {
      id: "album4",
      name: "Acoustic Sessions",
      artist: "Solo Artist",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
    },
    {
      id: "album5",
      name: "Electric Dreams",
      artist: "Synth Wave",
      image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400",
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${emotionColors[currentEmotion] || emotionColors.happy} transition-all duration-1000 pb-24`}>
      <div className="container mx-auto px-6 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-3 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Quick Access Playlists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {quickAccessPlaylists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onPlaylistClick?.(playlist.id)}
              className="backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-lg p-3 flex items-center gap-4 cursor-pointer transition-all group"
            >
              <div className="relative">
                <img
                  src={playlist.image}
                  alt={playlist.name}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div className="absolute inset-0 bg-black/20 rounded-md" />
              </div>
              <h3 className="font-semibold text-white text-sm">{playlist.name}</h3>
            </motion.div>
          ))}
        </div>

        {/* Made For You Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Made For You</h2>
            <button className="text-sm text-white hover:underline font-medium">
              Show all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {madeForYou.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => onPlaylistClick?.(item.id)}
                className="backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-lg p-4 cursor-pointer transition-all group"
              >
                <div className="relative mb-4">
                  {item.type === "special" ? (
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">DISCOVER<br/>WEEKLY</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      {item.number && (
                        <div className="absolute bottom-2 left-2 text-4xl font-bold text-green-400">
                          {item.number}
                        </div>
                      )}
                    </>
                  )}
                  {/* Play button overlay */}
                  <div className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm">{item.name}</h3>
                <p className="text-xs text-gray-200">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Popular Albums Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Popular albums and singles</h2>
            <button className="text-sm text-white hover:underline font-medium">
              Show all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {popularAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => onPlaylistClick?.(album.id)}
                className="backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-lg p-4 cursor-pointer transition-all group"
              >
                <div className="relative mb-4">
                  <img
                    src={album.image}
                    alt={album.name}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {/* Play button overlay */}
                  <div className="absolute bottom-2 right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm truncate">{album.name}</h3>
                <p className="text-xs text-gray-200 truncate">{album.artist}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSection;
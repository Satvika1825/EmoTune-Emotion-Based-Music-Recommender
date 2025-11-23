import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Home,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Bell,
  User,
  LogOut,
  Radar,
  Music,
  Settings,
  Crown
} from "lucide-react";

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleGoHome: () => void;
  handleOpenDetection: () => void;
  handleSignOut: () => void;
  handleSearch?: () => void;
  userEmail: string;
}

const Navbar = ({
  searchQuery,
  setSearchQuery,
  handleGoHome,
  handleOpenDetection,
  handleSignOut,
  handleSearch,
  userEmail
}: NavbarProps) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(3);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && handleSearch) {
      handleSearch();
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleForward = () => {
    window.history.forward();
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#121212] border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* LEFT SECTION: Navigation Arrows + Home */}
        <div className="flex items-center gap-2">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Forward Button */}
          <button
            onClick={handleForward}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            title="Go forward"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Home Button */}
          <button
            onClick={handleGoHome}
            className="w-10 h-10 rounded-full bg-[#1f1f1f] hover:bg-[#2a2a2a] flex items-center justify-center transition-colors ml-2"
            title="Home"
          >
            <Home className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* CENTER SECTION: Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            <div className="relative flex-1 flex items-center bg-[#2a2a2a] rounded-full hover:bg-[#3a3a3a] transition-colors border border-transparent focus-within:border-white/20">
              <Search className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="What do you want to play?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full py-3 pl-12 pr-12 bg-transparent text-white placeholder:text-gray-400 focus:outline-none rounded-full text-sm"
              />
              {/* Divider and Detect Mood button inside search */}
              <div className="absolute right-3 flex items-center gap-2">
                <div className="w-px h-6 bg-gray-600" />
                <button
                  onClick={handleOpenDetection}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                  title="Detect Mood"
                >
                  <Radar className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Cart, Premium, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Cart Button */}
          <button
            className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Cart"
          >
            <ShoppingCart className="w-5 h-5 text-gray-400 hover:text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>

          {/* Explore Premium Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-colors text-sm"
            title="Explore Premium"
          >
            <Crown className="w-4 h-4" />
            Explore Premium
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-400 hover:text-white" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#1DB954] text-black text-xs rounded-full flex items-center justify-center font-bold">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-72 bg-[#282828] rounded-lg shadow-xl border border-white/10 overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5">
                    <p className="text-sm text-white">New songs added to your mood playlist!</p>
                    <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                  </div>
                  <div className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5">
                    <p className="text-sm text-white">Your mood detection is ready</p>
                    <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                  </div>
                  <div className="p-3 hover:bg-white/5 cursor-pointer">
                    <p className="text-sm text-white">Welcome to EmoTune! 🎵</p>
                    <p className="text-xs text-gray-400 mt-1">Today</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-full bg-[#1DB954] hover:scale-105 flex items-center justify-center transition-transform text-black font-bold text-sm"
              title="Profile"
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-52 bg-[#282828] rounded-lg shadow-xl border border-white/10 overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <p className="font-semibold text-white text-sm">Profile</p>
                  <p className="text-xs text-gray-400 truncate">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleGoHome}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Account
                  </button>
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleOpenDetection}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                  >
                    <Radar className="w-4 h-4" />
                    Detect Mood
                  </button>
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Click outside to close dropdowns */}
      {(showProfileMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowProfileMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;
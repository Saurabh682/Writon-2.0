import React, { useState } from 'react';
import { Feather, Sun, Moon, Search, PenTool, User as UserIcon, LogOut, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onNavigateWrite: () => void;
  onNavigateProfile: (penName: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  onOpenAuth,
  onNavigateHome,
  onNavigateWrite,
  onNavigateProfile,
  searchQuery,
  setSearchQuery
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-editorial-border dark:border-darkEditorial-border glass-nav transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#B83A24] to-amber-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-gray-900 dark:text-white block leading-none">
                WritOn
              </span>
              <span className="text-[10px] tracking-widest uppercase font-mono text-editorial-accent dark:text-darkEditorial-accent font-semibold">
                Editorial 2.0
              </span>
            </div>
          </button>
        </div>

        {/* Center: Search Input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search essays, poetry, ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm rounded-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-editorial-accent/30 dark:focus:border-darkEditorial-accent/40 focus:bg-white dark:focus:bg-[#1A1C20] focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          
          {/* Write CTA */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                onNavigateWrite();
              } else {
                onOpenAuth();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full bg-editorial-accent hover:bg-editorial-accentHover dark:bg-darkEditorial-accent dark:hover:bg-darkEditorial-accentHover text-white shadow-sm transition-all hover:shadow"
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">Write</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Auth or Menu */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-editorial-accent/20 transition-all focus:outline-none"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.penName}`}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-editorial-border dark:border-darkEditorial-border"
                />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1A1C20] border border-editorial-border dark:border-darkEditorial-border shadow-lift py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-editorial-border dark:border-darkEditorial-border">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.fullName}</p>
                    <p className="text-xs text-gray-500 font-mono">@{user.penName}</p>
                  </div>

                  <button
                    onClick={() => onNavigateProfile(user.penName)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 text-left"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Profile & Stories
                  </button>

                  <button
                    onClick={() => onNavigateProfile(user.penName)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 text-left"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    Bookmarks
                  </button>

                  <div className="border-t border-editorial-border dark:border-darkEditorial-border my-1" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Sign In
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

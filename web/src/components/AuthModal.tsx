import React, { useState } from 'react';
import { X, Feather, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [penName, setPenName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(identifier, password);
      } else {
        await register({
          penName,
          fullName,
          email,
          password,
          bio
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#1A1C20] rounded-3xl p-8 border border-editorial-border dark:border-darkEditorial-border shadow-lift text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#B83A24] to-amber-600 flex items-center justify-center text-white shadow-md mb-3">
            <Feather className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold">
            {isLoginMode ? 'Welcome back to WritOn' : 'Join the Literary Circle'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isLoginMode
              ? 'Enter your pen name or email to continue reading and writing.'
              : 'Claim your author pen name and publish with timeless typography.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLoginMode ? (
            <>
              <div>
                <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Email or Pen Name
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. mayalin or author@writon.dev"
                  className="w-full px-4 py-2.5 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30 transition-all"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Pen Name
                  </label>
                  <input
                    type="text"
                    required
                    value={penName}
                    onChange={(e) => setPenName(e.target.value)}
                    placeholder="e.g. virginiastein"
                    className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Virginia Stein"
                    className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="w-full px-4 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Short Bio (Optional)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Writer, thinker, and explorer of quiet spaces..."
                  className="w-full px-3.5 py-2 rounded-xl border border-editorial-border dark:border-darkEditorial-border bg-gray-50 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 dark:focus:ring-darkEditorial-accent/30 resize-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-editorial-accent hover:bg-editorial-accentHover dark:bg-darkEditorial-accent dark:hover:bg-darkEditorial-accentHover text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLoginMode ? 'Sign In' : 'Create Author Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-6 text-center text-sm text-gray-500">
          {isLoginMode ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setError(null);
                  setIsLoginMode(false);
                }}
                className="font-semibold text-editorial-accent dark:text-darkEditorial-accent hover:underline"
              >
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Already an author?{' '}
              <button
                onClick={() => {
                  setError(null);
                  setIsLoginMode(true);
                }}
                className="font-semibold text-editorial-accent dark:text-darkEditorial-accent hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

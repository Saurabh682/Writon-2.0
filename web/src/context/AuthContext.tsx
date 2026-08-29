import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { User } from '../types';
import { fetchMyProfile, registerMyProfile } from '../lib/authApi';
import { getWritOnFirebaseAuth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { penName: string; fullName: string; email: string; password: string; bio?: string }) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('writon_token');
    setToken(null);
    setUser(null);
  };

  const syncFirebaseUser = async (firebaseUser: FirebaseUser): Promise<void> => {
    const idToken = await firebaseUser.getIdToken();
    const profile = await fetchMyProfile(idToken);
    localStorage.setItem('writon_token', idToken);
    setToken(idToken);
    setUser(profile);
  };

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onIdTokenChanged(getWritOnFirebaseAuth(), async (firebaseUser) => {
        try {
          if (firebaseUser) await syncFirebaseUser(firebaseUser);
          else clearSession();
        } catch (error) {
          console.error('Failed to synchronize the Firebase session:', error);
          clearSession();
        } finally {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error(error);
      clearSession();
      setIsLoading(false);
    }
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(
      getWritOnFirebaseAuth(),
      email.trim(),
      password,
    );
    await syncFirebaseUser(credential.user);
  };

  const register = async (data: { penName: string; fullName: string; email: string; password: string; bio?: string }) => {
    const credential = await createUserWithEmailAndPassword(
      getWritOnFirebaseAuth(),
      data.email.trim(),
      data.password,
    );
    try {
      const idToken = await credential.user.getIdToken();
      const profile = await registerMyProfile(idToken, {
        penName: data.penName,
        fullName: data.fullName,
        bio: data.bio,
      });
      localStorage.setItem('writon_token', idToken);
      setToken(idToken);
      setUser(profile);
    } catch (error) {
      await deleteUser(credential.user).catch(() => undefined);
      throw error;
    }
  };

  const logout = () => {
    signOut(getWritOnFirebaseAuth()).catch((error) => {
      console.error('Firebase sign-out failed:', error);
    }).finally(clearSession);
  };

  const updateCurrentUser = (userData: Partial<User>) => {
    setUser((current) => current ? { ...current, ...userData } : current);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateCurrentUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

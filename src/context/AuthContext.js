import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../config/firebase';
import { ref, get } from 'firebase/database';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userSnapshot = await get(ref(database, `users/${user.uid}`));
          const data = userSnapshot.val();

          setCurrentUser(user);
          setUserData(data);
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, userInfo) => {
    try {
      setError(null);
      const result = await authService.registerUser(email, password, userInfo);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const result = await authService.loginUser(email, password);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authService.logoutUser();
      setCurrentUser(null);
      setUserData(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      if (!currentUser) throw new Error('No user logged in');

      await authService.updateUserProfile(currentUser.uid, profileData);

      // Refresh user data
      const userSnapshot = await get(ref(database, `users/${currentUser.uid}`));
      setUserData(userSnapshot.val());
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    user: currentUser,
    userData,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!currentUser,
    userRole: userData?.role,
    userStatus: userData?.status
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

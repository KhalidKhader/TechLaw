import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * User Service - Fetch and manage user data
 */

/**
 * Get user data from database by UID
 */
export const getUserData = async (uid) => {
  if (!uid) return null;
  
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

/**
 * Get user's full name
 */
export const getUserFullName = async (uid) => {
  const userData = await getUserData(uid);
  if (!userData) return 'Unknown User';
  
  const firstName = userData.firstName || '';
  const lastName = userData.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || userData.email || 'Unknown User';
};

/**
 * Get user's initials for avatar
 */
export const getUserInitials = (firstName, lastName, email) => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
};

/**
 * Get multiple users data at once
 */
export const getUsersData = async (uids) => {
  if (!uids || uids.length === 0) return {};
  
  try {
    const usersData = {};
    await Promise.all(
      uids.map(async (uid) => {
        const userData = await getUserData(uid);
        if (userData) {
          usersData[uid] = userData;
        }
      })
    );
    return usersData;
  } catch (error) {
    console.error('Error fetching users data:', error);
    return {};
  }
};

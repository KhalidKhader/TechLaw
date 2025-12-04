import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, database } from "../config/firebase";

const USERS_PATH = "users";
const USER_ROLES = {
  VIEWER: "viewer",
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "superAdmin"
};

export const authService = {
  /**
   * Register a new user (Status: pending approval by admin)
   */
  async registerUser(email, password, userInfo) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Realtime Database
      const userData = {
        uid: user.uid,
        email: user.email,
        firstName: userInfo.firstName || "",
        lastName: userInfo.lastName || "",
        role: USER_ROLES.VIEWER, // New users start as VIEWER
        status: "pending", // Requires admin approval
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          bio: "",
          education: [],
          skills: [],
          experience: [],
          phone: userInfo.phone || "",
          address: ""
        },
        permissions: {
          canCreateTasks: false,
          canSubmitIdeas: false,
          canViewDashboard: false,
          canMessage: false,
          canCreateEvents: false,
          canCreateOrganizations: false
        },
        settings: {
          emailNotifications: true,
          taskNotifications: true,
          ideaNotifications: true,
          messageNotifications: true
        }
      };

      await set(ref(database, `${USERS_PATH}/${user.uid}`), userData);

      // Set display name
      const firstName = userInfo.firstName || "";
      const lastName = userInfo.lastName || "";
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`.trim()
      });

      return { success: true, uid: user.uid, user: userData };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Login existing user
   */
  async loginUser(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from database
      const userSnapshot = await get(ref(database, `${USERS_PATH}/${user.uid}`));
      const userData = userSnapshot.val();

      if (!userData) {
        // If user exists in Auth but not in DB, create a default profile or throw specific error
        // For now, we'll treat it as a pending user or create a basic profile
        return {
           success: true,
           uid: user.uid,
           user: { role: 'user', status: 'pending' }, // Default fallback
           authToken: await user.getIdToken()
        };
      }

      if (userData.status === "rejected") {
        throw new Error("Your account has been rejected. Please contact administration.");
      }

      if (userData.status === "pending") {
        return {
          success: true,
          uid: user.uid,
          status: "pending",
          message: "Your account is pending approval. You will receive an email once approved."
        };
      }

      if (userData.status === "suspended") {
        throw new Error("Your account has been suspended. Please contact administration.");
      }

      return {
        success: true,
        uid: user.uid,
        user: userData,
        authToken: await user.getIdToken()
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Logout current user
   */
  async logoutUser() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Get current user data
   */
  async getCurrentUser(uid) {
    try {
      const userSnapshot = await get(ref(database, `${USERS_PATH}/${uid}`));
      return userSnapshot.val();
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Update user profile
   */
  async updateUserProfile(uid, profileData) {
    try {
      const updateData = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };

      await update(ref(database, `${USERS_PATH}/${uid}`), updateData);
      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Request profile edit (creates pending edit request)
   */
  async requestProfileEdit(uid, editData) {
    try {
      const editRequest = {
        uid,
        editData,
        status: "pending",
        createdAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        comments: ""
      };

      const editRequestId = `${uid}_${Date.now()}`;
      await set(ref(database, `editRequests/${editRequestId}`), editRequest);

      return { success: true, editRequestId };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Get all users (Admin/SuperAdmin only)
   */
  async getAllUsers() {
    try {
      const usersSnapshot = await get(ref(database, USERS_PATH));
      const users = [];

      usersSnapshot.forEach((child) => {
        users.push({
          uid: child.key,
          ...child.val()
        });
      });

      return users;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Approve pending user (Admin/SuperAdmin)
   */
  async approvePendingUser(uid, role = USER_ROLES.USER) {
    try {
      await update(ref(database, `${USERS_PATH}/${uid}`), {
        status: "approved",
        role: role,
        permissions: {
          canCreateTasks: role !== USER_ROLES.VIEWER,
          canSubmitIdeas: role !== USER_ROLES.VIEWER,
          canViewDashboard: role !== USER_ROLES.VIEWER,
          canMessage: true,
          canCreateEvents: role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN,
          canCreateOrganizations: role !== USER_ROLES.VIEWER
        },
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Reject pending user (Admin/SuperAdmin)
   */
  async rejectPendingUser(uid, reason = "") {
    try {
      await update(ref(database, `${USERS_PATH}/${uid}`), {
        status: "rejected",
        rejectReason: reason,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Suspend/Unsuspend user (Admin/SuperAdmin)
   */
  async toggleUserSuspension(uid, suspended = true) {
    try {
      await update(ref(database, `${USERS_PATH}/${uid}`), {
        status: suspended ? "suspended" : "approved",
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Change user role (SuperAdmin only)
   */
  async changeUserRole(uid, newRole) {
    try {
      await update(ref(database, `${USERS_PATH}/${uid}`), {
        role: newRole,
        permissions: this.getPermissionsForRole(newRole),
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Get permissions based on role
   */
  getPermissionsForRole(role) {
    const permissions = {
      canCreateTasks: false,
      canSubmitIdeas: false,
      canViewDashboard: false,
      canMessage: false,
      canCreateEvents: false,
      canCreateOrganizations: false,
      canApproveUsers: false,
      canManageAdmins: false,
      canDeleteUsers: false,
      canSuspendUsers: false,
      canRejectIdeas: false,
      canEditOtherProfiles: false
    };

    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return {
          ...permissions,
          canCreateTasks: true,
          canSubmitIdeas: true,
          canViewDashboard: true,
          canMessage: true,
          canCreateEvents: true,
          canCreateOrganizations: true,
          canApproveUsers: true,
          canManageAdmins: true,
          canDeleteUsers: true,
          canSuspendUsers: true,
          canRejectIdeas: true,
          canEditOtherProfiles: true
        };

      case USER_ROLES.ADMIN:
        return {
          ...permissions,
          canCreateTasks: true,
          canSubmitIdeas: true,
          canViewDashboard: true,
          canMessage: true,
          canCreateEvents: true,
          canCreateOrganizations: true,
          canApproveUsers: true,
          canDeleteUsers: true,
          canSuspendUsers: true,
          canRejectIdeas: true,
          canEditOtherProfiles: true
        };

      case USER_ROLES.USER:
        return {
          ...permissions,
          canCreateTasks: true,
          canSubmitIdeas: true,
          canViewDashboard: true,
          canMessage: true,
          canCreateEvents: true,
          canCreateOrganizations: true
        };

      case USER_ROLES.VIEWER:
      default:
        return {
          ...permissions,
          canMessage: true,
          canViewDashboard: true
        };
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  USER_ROLES
};

export default authService;

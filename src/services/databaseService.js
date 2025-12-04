import { ref, set, get, update, remove, push, onValue } from "firebase/database";
import { database } from "../config/firebase";

export const databaseService = {
  /**
   * Generic read operations
   */
  async getDocument(path) {
    try {
      const snapshot = await get(ref(database, path));
      return snapshot.val();
    } catch (error) {
      throw new Error(`Error reading from ${path}: ${error.message}`);
    }
  },

  /**
   * Generic create operation
   */
  async createDocument(path, data) {
    try {
      const docId = push(ref(database, path)).key;
      const fullData = {
        id: docId,
        ...data,
        createdAt: new Date().toISOString()
      };

      await set(ref(database, `${path}/${docId}`), fullData);
      return { id: docId, ...fullData };
    } catch (error) {
      throw new Error(`Error creating document: ${error.message}`);
    }
  },

  /**
   * Generic update operation
   */
  async updateDocument(path, data) {
    try {
      await update(ref(database, path), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  },

  /**
   * Generic delete operation
   */
  async deleteDocument(path) {
    try {
      await remove(ref(database, path));
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  },

  /**
   * Real-time listener
   */
  onSnapshot(path, callback) {
    const dbRef = ref(database, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    });

    return unsubscribe;
  },

  /**
   * Tasks Management
   */
  async createTask(taskData) {
    return this.createDocument("tasks", taskData);
  },

  async getTask(taskId) {
    return this.getDocument(`tasks/${taskId}`);
  },

  async updateTask(taskId, taskData) {
    return this.updateDocument(`tasks/${taskId}`, taskData);
  },

  async deleteTask(taskId) {
    return this.deleteDocument(`tasks/${taskId}`);
  },

  async getTasksByUser(userId) {
    try {
      const snapshot = await get(ref(database, "tasks"));
      const tasks = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const task = child.val();
          if (task.assignedTo.includes(userId)) {
            tasks.push({
              id: child.key,
              ...task
            });
          }
        });
      }

      return tasks;
    } catch (error) {
      throw new Error(`Error fetching user tasks: ${error.message}`);
    }
  },

  /**
   * Ideas Management
   */
  async submitIdea(ideaData) {
    return this.createDocument("ideas", ideaData);
  },

  async getIdea(ideaId) {
    return this.getDocument(`ideas/${ideaId}`);
  },

  async updateIdea(ideaId, ideaData) {
    return this.updateDocument(`ideas/${ideaId}`, ideaData);
  },

  async getAllIdeas() {
    return this.getDocument("ideas");
  },

  async approveIdea(ideaId, approvedBy) {
    return this.updateDocument(`ideas/${ideaId}`, {
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString()
    });
  },

  /**
   * Requests Management
   */
  async submitRequest(requestData) {
    return this.createDocument("requests", requestData);
  },

  async getRequest(requestId) {
    return this.getDocument(`requests/${requestId}`);
  },

  async getAllRequests() {
    return this.getDocument("requests");
  },

  async updateRequestStatus(requestId, status, reviewedBy, comments = "") {
    return this.updateDocument(`requests/${requestId}`, {
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      comments
    });
  },

  /**
   * Organization Management
   */
  async createOrganization(orgData) {
    return this.createDocument("organizations", orgData);
  },

  async getOrganization(orgId) {
    return this.getDocument(`organizations/${orgId}`);
  },

  async getAllOrganizations() {
    return this.getDocument("organizations");
  },

  async approveOrganization(orgId, approvedBy) {
    return this.updateDocument(`organizations/${orgId}`, {
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString()
    });
  },

  /**
   * Calendar and Events Management
   */
  async createEvent(eventData) {
    return this.createDocument("events", eventData);
  },

  async getEvent(eventId) {
    return this.getDocument(`events/${eventId}`);
  },

  async getUserEvents(userId) {
    try {
      const snapshot = await get(ref(database, "events"));
      const events = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const event = child.val();
          if (
            event.createdBy === userId ||
            event.attendees?.includes(userId) ||
            event.visibility === "public"
          ) {
            events.push({
              id: child.key,
              ...event
            });
          }
        });
      }

      return events;
    } catch (error) {
      throw new Error(`Error fetching user events: ${error.message}`);
    }
  },

  /**
   * Messaging System
   */
  async sendMessage(conversationId, messageData) {
    try {
      const messageId = push(ref(database, `messages/${conversationId}`)).key;
      const fullMessage = {
        id: messageId,
        ...messageData,
        timestamp: new Date().toISOString()
      };

      await set(ref(database, `messages/${conversationId}/${messageId}`), fullMessage);
      return fullMessage;
    } catch (error) {
      throw new Error(`Error sending message: ${error.message}`);
    }
  },

  async getConversation(conversationId) {
    return this.getDocument(`messages/${conversationId}`);
  },

  async getUserConversations(userId) {
    try {
      const snapshot = await get(ref(database, "conversations"));
      const conversations = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const conv = child.val();
          if (conv.participants.includes(userId)) {
            conversations.push({
              id: child.key,
              ...conv
            });
          }
        });
      }

      return conversations;
    } catch (error) {
      throw new Error(`Error fetching conversations: ${error.message}`);
    }
  },

  /**
   * Forms Management
   */
  async createForm(formData) {
    return this.createDocument("forms", formData);
  },

  async getForm(formId) {
    return this.getDocument(`forms/${formId}`);
  },

  async getAllForms() {
    return this.getDocument("forms");
  },

  async approveForm(formId, approvedBy) {
    return this.updateDocument(`forms/${formId}`, {
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString()
    });
  },

  /**
   * Posts and News
   */
  async createPost(postData) {
    return this.createDocument("posts", postData);
  },

  async getPost(postId) {
    return this.getDocument(`posts/${postId}`);
  },

  async getAllPosts() {
    return this.getDocument("posts");
  },

  async addComment(postId, commentData) {
    try {
      const commentId = push(ref(database, `posts/${postId}/comments`)).key;
      const fullComment = {
        id: commentId,
        ...commentData,
        createdAt: new Date().toISOString()
      };

      await set(ref(database, `posts/${postId}/comments/${commentId}`), fullComment);
      return fullComment;
    } catch (error) {
      throw new Error(`Error adding comment: ${error.message}`);
    }
  },

  /**
   * Analytics and Dashboard
   */
  async getDashboardStats() {
    try {
      const [users, tasks, ideas, events, posts] = await Promise.all([
        this.getDocument("users"),
        this.getDocument("tasks"),
        this.getDocument("ideas"),
        this.getDocument("events"),
        this.getDocument("posts")
      ]);

      return {
        totalUsers: Object.keys(users || {}).length,
        totalTasks: Object.keys(tasks || {}).length,
        totalIdeas: Object.keys(ideas || {}).length,
        totalEvents: Object.keys(events || {}).length,
        totalPosts: Object.keys(posts || {}).length,
        pendingApprovals: this.countPendingItems(users, tasks, ideas)
      };
    } catch (error) {
      throw new Error(`Error fetching dashboard stats: ${error.message}`);
    }
  },

  countPendingItems(users, tasks, ideas) {
    let count = 0;

    if (users) {
      Object.values(users).forEach((user) => {
        if (user.status === "pending") count++;
      });
    }

    if (ideas) {
      Object.values(ideas).forEach((idea) => {
        if (idea.status === "pending") count++;
      });
    }

    return count;
  },

  /**
   * Profile Management - Education, Skills, Experience
   */
  async addEducation(userId, educationData) {
    try {
      const eduId = push(ref(database, `users/${userId}/education`)).key;
      const fullData = {
        id: eduId,
        ...educationData,
        createdAt: new Date().toISOString()
      };
      await set(ref(database, `users/${userId}/education/${eduId}`), fullData);
      return fullData;
    } catch (error) {
      throw new Error(`Error adding education: ${error.message}`);
    }
  },

  async updateEducation(userId, eduId, educationData) {
    try {
      await update(ref(database, `users/${userId}/education/${eduId}`), {
        ...educationData,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error updating education: ${error.message}`);
    }
  },

  async deleteEducation(userId, eduId) {
    try {
      await remove(ref(database, `users/${userId}/education/${eduId}`));
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting education: ${error.message}`);
    }
  },

  async getEducation(userId) {
    try {
      const snapshot = await get(ref(database, `users/${userId}/education`));
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      throw new Error(`Error fetching education: ${error.message}`);
    }
  },

  async addSkill(userId, skillData) {
    try {
      const skillId = push(ref(database, `users/${userId}/skills`)).key;
      const fullData = {
        id: skillId,
        ...skillData,
        createdAt: new Date().toISOString()
      };
      await set(ref(database, `users/${userId}/skills/${skillId}`), fullData);
      return fullData;
    } catch (error) {
      throw new Error(`Error adding skill: ${error.message}`);
    }
  },

  async updateSkill(userId, skillId, skillData) {
    try {
      await update(ref(database, `users/${userId}/skills/${skillId}`), {
        ...skillData,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error updating skill: ${error.message}`);
    }
  },

  async deleteSkill(userId, skillId) {
    try {
      await remove(ref(database, `users/${userId}/skills/${skillId}`));
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting skill: ${error.message}`);
    }
  },

  async getSkills(userId) {
    try {
      const snapshot = await get(ref(database, `users/${userId}/skills`));
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      throw new Error(`Error fetching skills: ${error.message}`);
    }
  },

  async addExperience(userId, experienceData) {
    try {
      const expId = push(ref(database, `users/${userId}/experience`)).key;
      const fullData = {
        id: expId,
        ...experienceData,
        createdAt: new Date().toISOString()
      };
      await set(ref(database, `users/${userId}/experience/${expId}`), fullData);
      return fullData;
    } catch (error) {
      throw new Error(`Error adding experience: ${error.message}`);
    }
  },

  async updateExperience(userId, expId, experienceData) {
    try {
      await update(ref(database, `users/${userId}/experience/${expId}`), {
        ...experienceData,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error updating experience: ${error.message}`);
    }
  },

  async deleteExperience(userId, expId) {
    try {
      await remove(ref(database, `users/${userId}/experience/${expId}`));
      return { success: true };
    } catch (error) {
      throw new Error(`Error deleting experience: ${error.message}`);
    }
  },

  async getExperience(userId) {
    try {
      const snapshot = await get(ref(database, `users/${userId}/experience`));
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    } catch (error) {
      throw new Error(`Error fetching experience: ${error.message}`);
    }
  },

  async updateProfile(userId, profileData) {
    try {
      await update(ref(database, `users/${userId}`), {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      throw new Error(`Error updating profile: ${error.message}`);
    }
  }
};

export default databaseService;

import { ref, push, set, onValue, update } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Notification Service
 * Handles creating and managing notifications for users
 */

export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_COMMENT: 'task_comment',
  IDEA_APPROVED: 'idea_approved',
  IDEA_REJECTED: 'idea_rejected',
  IDEA_COMMENT: 'idea_comment',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  EVENT_CREATED: 'event_created',
  EVENT_REMINDER: 'event_reminder',
  EVENT_UPDATED: 'event_updated',
  MESSAGE_RECEIVED: 'message_received',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  ORGANIZATION_APPROVED: 'organization_approved',
  USER_MENTIONED: 'user_mentioned',
  FORM_RESPONSE: 'form_response',
};

/**
 * Create a notification for a user
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification data
 */
export const createNotification = async (userId, notification) => {
  try {
    const notificationId = push(ref(database, `notifications/${userId}`)).key;
    
    const notificationData = {
      id: notificationId,
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await set(ref(database, `notifications/${userId}/${notificationId}`), notificationData);
    
    // Update unread count
    await updateUnreadCount(userId);
    
    return notificationId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 */
export const markAsRead = async (userId, notificationId) => {
  try {
    await update(ref(database, `notifications/${userId}/${notificationId}`), {
      read: true,
      readAt: new Date().toISOString(),
    });
    
    await updateUnreadCount(userId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 */
export const markAllAsRead = async (userId) => {
  try {
    const notificationsRef = ref(database, `notifications/${userId}`);
    const snapshot = await new Promise((resolve) => {
      onValue(notificationsRef, resolve, { onlyOnce: true });
    });

    const data = snapshot.val();
    if (!data) return;

    const updates = {};
    Object.keys(data).forEach((notificationId) => {
      if (!data[notificationId].read) {
        updates[`notifications/${userId}/${notificationId}/read`] = true;
        updates[`notifications/${userId}/${notificationId}/readAt`] = new Date().toISOString();
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
      await updateUnreadCount(userId);
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Update unread count for a user
 * @param {string} userId - User ID
 */
const updateUnreadCount = async (userId) => {
  try {
    const notificationsRef = ref(database, `notifications/${userId}`);
    const snapshot = await new Promise((resolve) => {
      onValue(notificationsRef, resolve, { onlyOnce: true });
    });

    const data = snapshot.val();
    let unreadCount = 0;
    
    if (data) {
      unreadCount = Object.values(data).filter(n => !n.read).length;
    }

    await set(ref(database, `users/${userId}/unreadNotifications`), unreadCount);
  } catch (error) {
    console.error('Error updating unread count:', error);
  }
};

/**
 * Subscribe to notifications for a user
 * @param {string} userId - User ID
 * @param {function} callback - Callback function to handle notifications
 */
export const subscribeToNotifications = (userId, callback) => {
  const notificationsRef = ref(database, `notifications/${userId}`);
  return onValue(notificationsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const notifications = Object.entries(data)
        .map(([id, notification]) => ({ id, ...notification }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(notifications);
    } else {
      callback([]);
    }
  });
};

/**
 * Notification helper functions for specific actions
 */

export const notifyTaskAssigned = async (taskId, taskTitle, assignedToId, assignedById, assignedByName) => {
  return createNotification(assignedToId, {
    type: NotificationType.TASK_ASSIGNED,
    title: 'New Task Assigned',
    message: `${assignedByName} assigned you a new task: ${taskTitle}`,
    actionUrl: `/tasks`,
    relatedId: taskId,
    triggeredBy: assignedById,
  });
};

export const notifyTaskCompleted = async (taskId, taskTitle, assignedById, completedById, completedByName) => {
  return createNotification(assignedById, {
    type: NotificationType.TASK_COMPLETED,
    title: 'Task Completed',
    message: `${completedByName} completed the task: ${taskTitle}`,
    actionUrl: `/tasks`,
    relatedId: taskId,
    triggeredBy: completedById,
  });
};

export const notifyIdeaApproved = async (ideaId, ideaTitle, userId, approvedByName) => {
  return createNotification(userId, {
    type: NotificationType.IDEA_APPROVED,
    title: 'Idea Approved',
    message: `Your idea "${ideaTitle}" has been approved by ${approvedByName}`,
    actionUrl: `/ideas`,
    relatedId: ideaId,
  });
};

export const notifyIdeaRejected = async (ideaId, ideaTitle, userId, rejectedByName, reason) => {
  return createNotification(userId, {
    type: NotificationType.IDEA_REJECTED,
    title: 'Idea Rejected',
    message: `Your idea "${ideaTitle}" was rejected. Reason: ${reason}`,
    actionUrl: `/ideas`,
    relatedId: ideaId,
  });
};

export const notifyEventCreated = async (eventId, eventTitle, eventDate, userIds) => {
  const promises = userIds.map(userId =>
    createNotification(userId, {
      type: NotificationType.EVENT_CREATED,
      title: 'New Event Created',
      message: `A new event "${eventTitle}" has been scheduled for ${eventDate}`,
      actionUrl: `/calendar`,
      relatedId: eventId,
    })
  );
  return Promise.all(promises);
};

export const notifyEventReminder = async (eventId, eventTitle, eventDate, userIds) => {
  const promises = userIds.map(userId =>
    createNotification(userId, {
      type: NotificationType.EVENT_REMINDER,
      title: 'Event Reminder',
      message: `Reminder: "${eventTitle}" is scheduled for ${eventDate}`,
      actionUrl: `/calendar`,
      relatedId: eventId,
    })
  );
  return Promise.all(promises);
};

export const notifyNewMessage = async (receiverId, senderId, senderName) => {
  return createNotification(receiverId, {
    type: NotificationType.MESSAGE_RECEIVED,
    title: 'New Message',
    message: `${senderName} sent you a message`,
    actionUrl: `/messages`,
    triggeredBy: senderId,
  });
};

export const notifyPostComment = async (postId, postTitle, postOwnerId, commenterId, commenterName) => {
  return createNotification(postOwnerId, {
    type: NotificationType.POST_COMMENT,
    title: 'New Comment',
    message: `${commenterName} commented on your post: ${postTitle}`,
    actionUrl: `/posts`,
    relatedId: postId,
    triggeredBy: commenterId,
  });
};

export const notifyPostLike = async (postId, postTitle, postOwnerId, likerId, likerName) => {
  return createNotification(postOwnerId, {
    type: NotificationType.POST_LIKE,
    title: 'New Like',
    message: `${likerName} liked your post: ${postTitle}`,
    actionUrl: `/posts`,
    relatedId: postId,
    triggeredBy: likerId,
  });
};

export const notifyRequestApproved = async (requestId, requestType, userId, approvedByName) => {
  return createNotification(userId, {
    type: NotificationType.REQUEST_APPROVED,
    title: 'Request Approved',
    message: `Your ${requestType} request has been approved by ${approvedByName}`,
    actionUrl: `/requests`,
    relatedId: requestId,
  });
};

export const notifyRequestRejected = async (requestId, requestType, userId, rejectedByName, reason) => {
  return createNotification(userId, {
    type: NotificationType.REQUEST_REJECTED,
    title: 'Request Rejected',
    message: `Your ${requestType} request was rejected. Reason: ${reason}`,
    actionUrl: `/requests`,
    relatedId: requestId,
  });
};

export const notifyOrganizationApproved = async (orgId, orgName, userId, approvedByName) => {
  return createNotification(userId, {
    type: NotificationType.ORGANIZATION_APPROVED,
    title: 'Organization Approved',
    message: `Your organization "${orgName}" has been approved by ${approvedByName}`,
    actionUrl: `/organizations`,
    relatedId: orgId,
  });
};

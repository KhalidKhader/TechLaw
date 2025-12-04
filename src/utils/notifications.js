import { ref, push, set } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Send a notification to a specific user
 * @param {string} userId - The recipient's user ID
 * @param {object} notification - Notification object with type, title, and message
 */
export const sendNotification = async (userId, notification) => {
  try {
    const notificationId = push(ref(database, `notifications/${userId}`)).key;
    await set(ref(database, `notifications/${userId}/${notificationId}`), {
      id: notificationId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

/**
 * Send notifications to multiple users
 * @param {string[]} userIds - Array of recipient user IDs
 * @param {object} notification - Notification object with type, title, and message
 */
export const sendBulkNotifications = async (userIds, notification) => {
  try {
    const promises = userIds.map(userId => sendNotification(userId, notification));
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to send bulk notifications:', error);
  }
};

/**
 * Notification types and their templates
 */
export const NotificationTypes = {
  // User related
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  NEW_USER: 'new_user',
  
  // Task related
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_OVERDUE: 'task_overdue',
  
  // Idea related
  IDEA_APPROVED: 'idea_approved',
  IDEA_REJECTED: 'idea_rejected',
  NEW_IDEA: 'new_idea',
  
  // Message related
  MESSAGE_RECEIVED: 'message_received',
  
  // Event related
  EVENT_APPROVED: 'event_approved',
  EVENT_REJECTED: 'event_rejected',
  EVENT_REMINDER: 'event_reminder',
  
  // Profile edit related
  PROFILE_EDIT_APPROVED: 'profile_edit_approved',
  PROFILE_EDIT_REJECTED: 'profile_edit_rejected',
  PROFILE_EDIT_REQUEST: 'profile_edit_request',
  
  // Organization related
  ORG_APPROVED: 'org_approved',
  ORG_REJECTED: 'org_rejected',
  NEW_ORG: 'new_org',
  
  // Post related
  POST_LIKED: 'post_liked',
  POST_COMMENTED: 'post_commented',
};

/**
 * Create notification templates
 */
export const createNotificationTemplate = {
  userApproved: () => ({
    type: NotificationTypes.USER_APPROVED,
    title: 'Account Approved',
    message: 'Your account has been approved. You can now access all features.',
  }),
  
  userRejected: () => ({
    type: NotificationTypes.USER_REJECTED,
    title: 'Account Rejected',
    message: 'Your account request has been rejected. Please contact support for more information.',
  }),
  
  newUser: (userName) => ({
    type: NotificationTypes.NEW_USER,
    title: 'New User Registration',
    message: `${userName} has registered and is waiting for approval.`,
  }),
  
  taskAssigned: (taskTitle, assignerName) => ({
    type: NotificationTypes.TASK_ASSIGNED,
    title: 'New Task Assigned',
    message: `${assignerName} assigned you the task: ${taskTitle}`,
  }),
  
  ideaApproved: (ideaTitle) => ({
    type: NotificationTypes.IDEA_APPROVED,
    title: 'Idea Approved',
    message: `Your idea "${ideaTitle}" has been approved!`,
  }),
  
  ideaRejected: (ideaTitle) => ({
    type: NotificationTypes.IDEA_REJECTED,
    title: 'Idea Rejected',
    message: `Your idea "${ideaTitle}" has been rejected.`,
  }),
  
  newIdea: (ideaTitle, submitterName) => ({
    type: NotificationTypes.NEW_IDEA,
    title: 'New Idea Submitted',
    message: `${submitterName} submitted a new idea: ${ideaTitle}`,
  }),
  
  messageReceived: (senderName) => ({
    type: NotificationTypes.MESSAGE_RECEIVED,
    title: 'New Message',
    message: `You have a new message from ${senderName}`,
  }),
  
  eventApproved: (eventTitle) => ({
    type: NotificationTypes.EVENT_APPROVED,
    title: 'Event Approved',
    message: `Your event "${eventTitle}" has been approved.`,
  }),
  
  eventRejected: (eventTitle) => ({
    type: NotificationTypes.EVENT_REJECTED,
    title: 'Event Rejected',
    message: `Your event "${eventTitle}" has been rejected.`,
  }),
  
  profileEditApproved: () => ({
    type: NotificationTypes.PROFILE_EDIT_APPROVED,
    title: 'Profile Edit Approved',
    message: 'Your profile changes have been approved.',
  }),
  
  profileEditRejected: () => ({
    type: NotificationTypes.PROFILE_EDIT_REJECTED,
    title: 'Profile Edit Rejected',
    message: 'Your profile change request has been rejected.',
  }),
  
  profileEditRequest: (userName) => ({
    type: NotificationTypes.PROFILE_EDIT_REQUEST,
    title: 'Profile Edit Request',
    message: `${userName} has requested to edit their profile.`,
  }),
  
  orgApproved: (orgName) => ({
    type: NotificationTypes.ORG_APPROVED,
    title: 'Organization Approved',
    message: `The organization "${orgName}" has been approved.`,
  }),
  
  orgRejected: (orgName) => ({
    type: NotificationTypes.ORG_REJECTED,
    title: 'Organization Rejected',
    message: `The organization "${orgName}" has been rejected.`,
  }),
  
  newOrg: (orgName, submitterName) => ({
    type: NotificationTypes.NEW_ORG,
    title: 'New Organization Submitted',
    message: `${submitterName} submitted a new organization: ${orgName}`,
  }),
  
  postLiked: (userName, postTitle) => ({
    type: NotificationTypes.POST_LIKED,
    title: 'Post Liked',
    message: `${userName} liked your post: ${postTitle}`,
  }),
  
  postCommented: (userName, postTitle) => ({
    type: NotificationTypes.POST_COMMENTED,
    title: 'New Comment',
    message: `${userName} commented on your post: ${postTitle}`,
  }),
};

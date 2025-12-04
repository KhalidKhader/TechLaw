import { ref, push } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Send a notification to a user
 * @param {string} userId - Target user ID
 * @param {object} notification - Notification data
 */
export const sendNotification = async (userId, notification) => {
  if (!userId || !notification) return;

  try {
    const notificationRef = ref(database, `notifications/${userId}`);
    await push(notificationRef, {
      ...notification,
      timestamp: Date.now(),
      read: false,
      deleted: false
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Send notifications to multiple users
 * @param {array} userIds - Array of user IDs
 * @param {object} notification - Notification data
 */
export const sendBulkNotifications = async (userIds, notification) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return;

  try {
    const promises = userIds.map(userId => sendNotification(userId, notification));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
  }
};

/**
 * Notification templates
 */
export const NotificationTemplates = {
  // Task notifications
  taskAssigned: (taskTitle, assignerName) => ({
    type: 'task',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you a task: "${taskTitle}"`,
    link: '/tasks'
  }),

  taskCompleted: (taskTitle, userName) => ({
    type: 'task',
    title: 'Task Completed',
    message: `${userName} completed the task: "${taskTitle}"`,
    link: '/tasks'
  }),

  taskCommented: (taskTitle, userName) => ({
    type: 'comment',
    title: 'New Comment on Task',
    message: `${userName} commented on: "${taskTitle}"`,
    link: '/tasks'
  }),

  // Idea notifications
  ideaSubmitted: (ideaTitle, userName) => ({
    type: 'idea',
    title: 'New Idea Submitted',
    message: `${userName} submitted an idea: "${ideaTitle}"`,
    link: '/ideas'
  }),

  ideaApproved: (ideaTitle) => ({
    type: 'approval',
    title: 'Idea Approved',
    message: `Your idea "${ideaTitle}" has been approved!`,
    link: '/ideas'
  }),

  ideaRejected: (ideaTitle) => ({
    type: 'approval',
    title: 'Idea Status Update',
    message: `Your idea "${ideaTitle}" was not approved.`,
    link: '/ideas'
  }),

  ideaCommented: (ideaTitle, userName) => ({
    type: 'comment',
    title: 'New Comment on Idea',
    message: `${userName} commented on your idea: "${ideaTitle}"`,
    link: '/ideas'
  }),

  // Post notifications
  postCreated: (postTitle, userName) => ({
    type: 'post',
    title: 'New Post',
    message: `${userName} created a new post: "${postTitle}"`,
    link: '/posts'
  }),

  postCommented: (postTitle, userName) => ({
    type: 'comment',
    title: 'New Comment on Post',
    message: `${userName} commented on: "${postTitle}"`,
    link: '/posts'
  }),

  postLiked: (postTitle, userName) => ({
    type: 'post',
    title: 'Post Liked',
    message: `${userName} liked your post: "${postTitle}"`,
    link: '/posts'
  }),

  // Event/Calendar notifications
  eventCreated: (eventTitle, userName) => ({
    type: 'event',
    title: 'New Event',
    message: `${userName} created an event: "${eventTitle}"`,
    link: '/calendar'
  }),

  eventPendingApproval: (eventTitle, userName) => ({
    type: 'approval',
    title: 'Event Pending Approval',
    message: `${userName} submitted an event for approval: "${eventTitle}"`,
    link: '/calendar'
  }),

  eventApproved: (eventTitle) => ({
    type: 'approval',
    title: 'Event Approved',
    message: `Your event "${eventTitle}" has been approved!`,
    link: '/calendar'
  }),

  eventRejected: (eventTitle) => ({
    type: 'approval',
    title: 'Event Status Update',
    message: `Your event "${eventTitle}" was not approved.`,
    link: '/calendar'
  }),

  eventReminder: (eventTitle, timeUntil) => ({
    type: 'event',
    title: 'Event Reminder',
    message: `"${eventTitle}" starts in ${timeUntil}`,
    link: '/calendar'
  }),

  // Message notifications
  newMessage: (senderName) => ({
    type: 'message',
    title: 'New Message',
    message: `${senderName} sent you a message`,
    link: '/messages'
  }),

  // Request notifications
  requestSubmitted: (requestType, userName) => ({
    type: 'approval',
    title: 'New Request',
    message: `${userName} submitted a ${requestType} request`,
    link: '/requests'
  }),

  requestApproved: (requestType) => ({
    type: 'approval',
    title: 'Request Approved',
    message: `Your ${requestType} request has been approved!`,
    link: '/requests'
  }),

  requestRejected: (requestType) => ({
    type: 'approval',
    title: 'Request Status Update',
    message: `Your ${requestType} request was not approved.`,
    link: '/requests'
  }),

  // User approval notifications
  userApproved: () => ({
    type: 'approval',
    title: 'Account Approved',
    message: 'Your account has been approved! You can now access all features.',
    link: '/dashboard'
  }),

  userRejected: () => ({
    type: 'approval',
    title: 'Account Status',
    message: 'Your account registration was not approved.',
    link: '/dashboard'
  }),

  // Organization notifications
  organizationApproved: (orgName) => ({
    type: 'approval',
    title: 'Organization Approved',
    message: `"${orgName}" has been approved!`,
    link: '/organizations'
  }),

  organizationRejected: (orgName) => ({
    type: 'approval',
    title: 'Organization Status',
    message: `"${orgName}" was not approved.`,
    link: '/organizations'
  }),

  // Profile edit request
  profileEditRequested: (userName) => ({
    type: 'approval',
    title: 'Profile Edit Request',
    message: `${userName} requested to edit their profile`,
    link: '/admin/user-management'
  }),

  profileEditApproved: () => ({
    type: 'approval',
    title: 'Profile Edit Approved',
    message: 'Your profile edit request has been approved!',
    link: '/profile'
  }),

  profileEditRejected: () => ({
    type: 'approval',
    title: 'Profile Edit Status',
    message: 'Your profile edit request was not approved.',
    link: '/profile'
  }),

  // Message notifications
  messageReceived: (senderName, messagePreview) => ({
    type: 'message',
    title: 'New Message',
    message: `${senderName}: ${messagePreview}`,
    link: '/messages'
  })
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${formatDate(d)} ${time}`;
};

export const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diff = now - past;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return formatDate(date);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase();
};

export const getUserFullName = (user) => {
  if (!user) return 'Unknown User';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  return user.displayName || user.email || 'Unknown User';
};

export const getRoleLabel = (role) => {
  const roleMap = {
    viewer: 'Viewer',
    user: 'User',
    admin: 'Admin',
    superAdmin: 'Super Admin'
  };
  return roleMap[role] || role;
};

export const getStatusColor = (status) => {
  const statusMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    suspended: 'error',
    active: 'success'
  };
  return statusMap[status] || 'default';
};

export const getPriorityColor = (priority) => {
  const priorityMap = {
    high: 'error',
    medium: 'warning',
    low: 'info'
  };
  return priorityMap[priority] || 'default';
};

export const sortByDate = (array, dateField = 'createdAt', ascending = false) => {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateField]);
    const dateB = new Date(b[dateField]);
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

export const filterByStatus = (array, status) => {
  return array.filter((item) => item.status === status);
};

export const filterByUserId = (array, userId) => {
  return array.filter((item) => item.createdBy === userId || item.assignedTo?.includes(userId));
};

export const isExpired = (date) => {
  return new Date(date) < new Date();
};

export const getDaysUntil = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Task as TaskIcon,
  Message as MessageIcon,
  PersonAdd as UserIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Lightbulb as IdeaIcon,
  Comment as CommentIcon,
  ThumbUp as LikeIcon,
} from '@mui/icons-material';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeToNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../services/notificationService';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const notificationsRef = ref(database, `notifications/${user.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationsList = Object.entries(data)
          .map(([id, notif]) => ({ id, ...notif }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10); // Show last 10 notifications
        
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await update(ref(database, `notifications/${user.uid}/${notification.id}`), {
        read: true,
      });
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'user_approved':
      case 'user_rejected':
        navigate('/profile');
        break;
      case 'task_assigned':
        navigate('/tasks');
        break;
      case 'idea_approved':
      case 'idea_rejected':
        navigate('/ideas');
        break;
      case 'message_received':
        navigate('/messages');
        break;
      case 'event_approved':
      case 'event_rejected':
        navigate('/calendar');
        break;
      case 'profile_edit_approved':
      case 'profile_edit_rejected':
        navigate('/profile');
        break;
      default:
        break;
    }

    handleClose();
  };

  const markAllAsRead = async () => {
    const updates = {};
    notifications.forEach(notif => {
      if (!notif.read) {
        updates[`notifications/${user.uid}/${notif.id}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'user_approved':
        return <ApprovedIcon color="success" />;
      case 'user_rejected':
        return <RejectedIcon color="error" />;
      case 'task_assigned':
        return <TaskIcon color="primary" />;
      case 'idea_approved':
        return <ApprovedIcon color="success" />;
      case 'idea_rejected':
        return <RejectedIcon color="error" />;
      case 'message_received':
        return <MessageIcon color="info" />;
      case 'event_approved':
        return <ApprovedIcon color="success" />;
      case 'event_rejected':
        return <RejectedIcon color="error" />;
      case 'profile_edit_approved':
        return <EditIcon color="success" />;
      case 'profile_edit_rejected':
        return <EditIcon color="error" />;
      case 'new_user':
        return <UserIcon color="primary" />;
      default:
        return <NotificationsIcon />;
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 360, maxHeight: 480 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="600">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                bgcolor: notification.read ? 'transparent' : 'action.hover',
                py: 1.5,
                whiteSpace: 'normal',
              }}
            >
              <ListItemIcon>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={notification.title}
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {new Date(notification.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{ fontWeight: notification.read ? 400 : 600 }}
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;

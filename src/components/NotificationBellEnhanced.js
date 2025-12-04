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
  Stack,
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
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';
import { 
  subscribeToNotifications, 
  markAsRead as markNotificationAsRead, 
  markAllAsRead as markAllNotificationsAsRead
} from '../services/notificationService';

const NotificationBellEnhanced = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToNotifications(user.uid, (notificationsList) => {
      setNotifications(notificationsList.slice(0, 10));
      setUnreadCount(notificationsList.filter(n => !n.read).length);
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
    if (!notification.read && user?.uid) {
      await markNotificationAsRead(user.uid, notification.id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }

    handleClose();
  };

  const handleMarkAllAsRead = async () => {
    if (user?.uid) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      task_assigned: <TaskIcon color="primary" />,
      task_completed: <ApprovedIcon color="success" />,
      task_comment: <CommentIcon color="info" />,
      idea_approved: <ApprovedIcon color="success" />,
      idea_rejected: <RejectedIcon color="error" />,
      idea_comment: <CommentIcon color="info" />,
      post_like: <LikeIcon color="primary" />,
      post_comment: <CommentIcon color="info" />,
      event_created: <EventIcon color="primary" />,
      event_reminder: <EventIcon color="warning" />,
      event_updated: <EventIcon color="info" />,
      message_received: <MessageIcon color="info" />,
      request_approved: <ApprovedIcon color="success" />,
      request_rejected: <RejectedIcon color="error" />,
      organization_approved: <ApprovedIcon color="success" />,
      user_mentioned: <UserIcon color="primary" />,
      form_response: <EditIcon color="info" />,
      user_approved: <ApprovedIcon color="success" />,
      user_rejected: <RejectedIcon color="error" />,
      profile_edit_approved: <EditIcon color="success" />,
      profile_edit_rejected: <EditIcon color="error" />,
      new_user: <UserIcon color="primary" />,
    };
    
    return iconMap[type] || <NotificationsIcon />;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now - date) / 1000;
    
    if (diffInSeconds < 60) return t('notification.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('notification.minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('notification.hoursAgo')}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t('notification.daysAgo')}`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleOpen}
        sx={{
          '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.1),
          },
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.9,
                },
                '100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
              },
            },
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { 
            width: 380, 
            maxHeight: 520,
            borderRadius: 2,
            mt: 1,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box 
          sx={{ 
            p: 2.5, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          }}
        >
          <Typography variant="h6" fontWeight="700">
            {t('common.notifications')}
          </Typography>
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={handleMarkAllAsRead}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('notification.markAllRead')}
            </Button>
          )}
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon 
              sx={{ 
                fontSize: 60, 
                color: 'text.disabled',
                mb: 2,
              }} 
            />
            <Typography color="text.secondary" variant="body1">
              {t('notification.noNotifications')}
            </Typography>
          </Box>
        ) : (
          <Stack 
            sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
            }}
          >
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  bgcolor: notification.read 
                    ? 'transparent' 
                    : alpha(theme.palette.primary.main, 0.08),
                  py: 1.5,
                  px: 2,
                  whiteSpace: 'normal',
                  borderLeft: 3,
                  borderColor: notification.read 
                    ? 'transparent' 
                    : theme.palette.primary.main,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography 
                      variant="subtitle2" 
                      fontWeight={notification.read ? 500 : 700}
                      sx={{ mb: 0.5 }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatTime(notification.createdAt)}
                      </Typography>
                    </Stack>
                  }
                />
                {!notification.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: theme.palette.primary.main,
                      ml: 1,
                    }}
                  />
                )}
              </MenuItem>
            ))}
          </Stack>
        )}
      </Menu>
    </>
  );
};

export default NotificationBellEnhanced;

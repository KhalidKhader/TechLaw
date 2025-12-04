import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Task as TaskIcon,
  Lightbulb as IdeaIcon,
  Message as MessageIcon,
  Event as EventIcon,
  Comment as CommentIcon,
  CheckCircle as ApprovalIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNotifications } from '../context/NotificationContext';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';

const NotificationBellFull = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { t } = useI18n();
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.link) {
      navigate(notification.link);
    } else {
      switch (notification.type) {
        case 'task':
          navigate('/tasks');
          break;
        case 'idea':
          navigate('/ideas');
          break;
        case 'message':
          navigate('/messages');
          break;
        case 'event':
          navigate('/calendar');
          break;
        case 'post':
          navigate('/posts');
          break;
        case 'comment':
          // Navigate to the specific item based on targetType
          navigate(notification.targetLink || '/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    }
    handleClose();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDelete = (e, notificationId) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task':
        return <TaskIcon />;
      case 'idea':
        return <IdeaIcon />;
      case 'message':
        return <MessageIcon />;
      case 'event':
        return <EventIcon />;
      case 'comment':
        return <CommentIcon />;
      case 'approval':
        return <ApprovalIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task':
        return theme.palette.primary.main;
      case 'idea':
        return theme.palette.warning.main;
      case 'message':
        return theme.palette.info.main;
      case 'event':
        return theme.palette.success.main;
      case 'comment':
        return theme.palette.secondary.main;
      case 'approval':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('notification.justNow');
    if (minutes < 60) return `${minutes} ${t('notification.minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('notification.hoursAgo')}`;
    return `${days} ${t('notification.daysAgo')}`;
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          position: 'relative',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1)
          }
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              right: -3,
              top: 3,
              border: `2px solid ${theme.palette.background.paper}`,
              padding: '0 4px',
              fontWeight: 700
            }
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="700">
              {t('common.notifications')}
            </Typography>
            {unreadCount > 0 && (
              <Chip 
                label={unreadCount} 
                size="small" 
                color="error"
                sx={{ fontWeight: 700, minWidth: 24, height: 24 }}
              />
            )}
          </Box>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              sx={{ mt: 1, textTransform: 'none' }}
            >
              {t('notification.markAllRead')}
            </Button>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              <NotificationsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2">
                {t('notification.noNotifications')}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read 
                      ? 'transparent' 
                      : alpha(theme.palette.primary.main, 0.08),
                    borderLeft: !notification.read 
                      ? `4px solid ${theme.palette.primary.main}` 
                      : '4px solid transparent',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12)
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: alpha(getNotificationColor(notification.type), 0.15),
                        color: getNotificationColor(notification.type)
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        fontWeight={notification.read ? 400 : 600}
                        sx={{ pr: 4 }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.disabled"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {getTimeAgo(notification.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(e, notification.id)}
                    sx={{ 
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      opacity: 0.6,
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBellFull;

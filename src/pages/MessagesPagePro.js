import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  CircularProgress,
  Badge,
  Stack,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Circle as OnlineIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { ref, onValue, push, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showError, showSuccess } from '../utils/toast';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';

const MessagesPagePro = () => {
  const { user, userData } = useAuth();
  const { t } = useI18n();
  const theme = useTheme();
  const location = useLocation();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [conversations, setConversations] = useState({});

  // Auto-select user from navigation state
  useEffect(() => {
    if (location.state?.selectedUser && users.length > 0) {
      const targetUser = users.find(u => u.uid === location.state.selectedUser);
      if (targetUser) {
        setSelectedUser(targetUser);
      }
    }
  }, [location.state, users]);

  useEffect(() => {
    if (!user?.uid) return;

    // Load approved users
    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data)
          .map(([uid, userData]) => ({ uid, ...userData }))
          .filter(u => u.status === 'approved' && u.uid !== user.uid);
        setUsers(usersList);
      }
      setLoading(false);
    });

    // Load conversations
    const conversationsRef = ref(database, 'conversations');
    const unsubscribeConversations = onValue(conversationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userConversations = {};
        Object.entries(data).forEach(([convId, conv]) => {
          if (conv.participants && conv.participants[user.uid]) {
            const otherUserId = Object.keys(conv.participants).find(uid => uid !== user.uid);
            if (otherUserId) {
              userConversations[otherUserId] = {
                id: convId,
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastMessageTime,
                unreadCount: conv.unreadCount?.[user.uid] || 0
              };
            }
          }
        });
        setConversations(userConversations);
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeConversations();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (selectedUser?.uid) {
      const conversationId = getConversationId(user.uid, selectedUser.uid);
      const messagesRef = ref(database, `messages/${conversationId}`);
      
      const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesList = Object.entries(data)
            .map(([id, message]) => ({ id, ...message }))
            .sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesList);
          
          // Mark messages as read
          markMessagesAsRead(conversationId);
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribeMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.uid, user?.uid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await update(ref(database, `conversations/${conversationId}/unreadCount`), {
        [user.uid]: 0
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedUser) return;

    try {
      const conversationId = getConversationId(user.uid, selectedUser.uid);
      const message = {
        text: messageText,
        senderId: user.uid,
        senderName: userData?.firstName && userData?.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : userData?.displayName || user.email,
        timestamp: Date.now(),
        read: false
      };

      // Add message
      await push(ref(database, `messages/${conversationId}`), message);

      // Update or create conversation metadata
      const conversationData = {
        participants: {
          [user.uid]: true,
          [selectedUser.uid]: true
        },
        lastMessage: messageText,
        lastMessageTime: Date.now(),
        [`unreadCount/${selectedUser.uid}`]: (conversations[selectedUser.uid]?.unreadCount || 0) + 1,
        [`unreadCount/${user.uid}`]: 0
      };

      await update(ref(database, `conversations/${conversationId}`), conversationData);

      // Send notification to recipient
      await sendNotification(
        selectedUser.uid,
        NotificationTemplates.newMessage(message.senderName)
      );

      setMessageText('');
      showSuccess('Message sent');
    } catch (error) {
      showError('Failed to send message: ' + error.message);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getUserDisplayName = (user) => {
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.displayName || user.email;
  };

  const getUserInitials = (user) => {
    const name = getUserDisplayName(user);
    return name.split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper 
        elevation={0}
        sx={{ 
          height: '80vh',
          display: 'flex',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: isDarkMode ? 'grey.900' : 'background.paper'
        }}
      >
        {/* Users List */}
        <Box
          sx={{
            width: 350,
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDarkMode ? alpha(theme.palette.background.paper, 0.02) : 'grey.50'
          }}
        >
          {/* Search Header */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight="700" gutterBottom>
              {t('common.messages')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: isDarkMode ? 'background.paper' : 'background.paper',
                  borderRadius: 2
                }
              }}
            />
          </Box>

          {/* Users List */}
          <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
            {filteredUsers.map((userItem) => {
              const conversation = conversations[userItem.uid];
              const hasUnread = conversation?.unreadCount > 0;
              
              return (
                <ListItem
                  key={userItem.uid}
                  button
                  selected={selectedUser?.uid === userItem.uid}
                  onClick={() => setSelectedUser(userItem)}
                  sx={{
                    py: 2,
                    px: 2,
                    borderRadius: 0,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      borderRight: `3px solid ${theme.palette.primary.main}`,
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08)
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="error"
                      badgeContent={hasUnread ? conversation.unreadCount : 0}
                      max={99}
                    >
                      <Avatar
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          width: 48,
                          height: 48,
                          fontSize: '1.1rem',
                          fontWeight: 600
                        }}
                      >
                        {getUserInitials(userItem)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="subtitle2" 
                        fontWeight={hasUnread ? 700 : 500}
                        sx={{ mb: 0.5 }}
                      >
                        {getUserDisplayName(userItem)}
                      </Typography>
                    }
                    secondary={
                      conversation?.lastMessage ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              fontWeight: hasUnread ? 600 : 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {conversation.lastMessage}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Start a conversation
                        </Typography>
                      )
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  bgcolor: isDarkMode ? 'background.paper' : 'primary.main',
                  color: isDarkMode ? 'text.primary' : 'primary.contrastText'
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      bgcolor: isDarkMode ? 'primary.main' : alpha('#fff', 0.2),
                      color: isDarkMode ? 'primary.contrastText' : '#fff',
                      fontWeight: 600
                    }}
                  >
                    {getUserInitials(selectedUser)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {getUserDisplayName(selectedUser)}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <OnlineIcon sx={{ fontSize: 8, color: 'success.main' }} />
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {selectedUser.role === 'admin' ? 'Administrator' : 'Online'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: isDarkMode ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.02)
                }}
              >
                {messages.length === 0 ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    color="text.secondary"
                  >
                    <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      Start a conversation
                    </Typography>
                    <Typography variant="body2" textAlign="center">
                      Send a message to {getUserDisplayName(selectedUser)}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {messages.map((message) => {
                      const isOwn = message.senderId === user.uid;
                      return (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start',
                            mb: 1
                          }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              bgcolor: isOwn 
                                ? theme.palette.primary.main
                                : (isDarkMode ? 'background.paper' : '#fff'),
                              color: isOwn 
                                ? theme.palette.primary.contrastText 
                                : 'text.primary',
                              borderRadius: isOwn 
                                ? '18px 18px 4px 18px'
                                : '18px 18px 18px 4px',
                              boxShadow: isDarkMode ? 1 : 2
                            }}
                          >
                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                              {message.text}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                textAlign: 'right',
                                mt: 0.5,
                                opacity: 0.7,
                                fontSize: '0.65rem'
                              }}
                            >
                              {formatMessageTime(message.timestamp)}
                            </Typography>
                          </Paper>
                        </Box>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </Stack>
                )}
              </Box>

              {/* Message Input */}
              <Box
                sx={{
                  p: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper'
                }}
              >
                <Box display="flex" gap={1} alignItems="flex-end">
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: isDarkMode ? alpha(theme.palette.background.paper, 0.5) : 'grey.50'
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!messageText.trim()}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'action.disabled',
                        color: 'action.disabled'
                      }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
            >
              <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h5" gutterBottom>
                Select a conversation
              </Typography>
              <Typography variant="body2" textAlign="center">
                Choose a user from the list to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MessagesPagePro;
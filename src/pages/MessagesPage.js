import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  InputAdornment,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/toast';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';
import { useTheme, alpha } from '@mui/material/styles';

const MessagesPage = () => {
  const { user, userData } = useAuth();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Load all users
  useEffect(() => {
    if (!user?.uid) return;

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data)
          .map(([uid, userData]) => ({ uid, ...userData }))
          .filter(u => u.uid !== user?.uid && u.status === 'approved');
        setUsers(usersList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedUser || !user?.uid) return;

    const conversationId = getConversationId(user.uid, selectedUser.uid);
    const messagesRef = ref(database, `messages/${conversationId}`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedUser, user?.uid]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const handleSendMessage = async () => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!messageText.trim() || !selectedUser) return;

    try {
      const conversationId = getConversationId(user.uid, selectedUser.uid);
      const messageId = push(ref(database, `messages/${conversationId}`)).key;
      const senderName = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : user.email;
      
      await set(ref(database, `messages/${conversationId}/${messageId}`), {
        id: messageId,
        text: messageText,
        senderId: user.uid,
        senderName,
        receiverId: selectedUser.uid,
        timestamp: new Date().toISOString(),
        read: false,
      });

      // Update conversation metadata using a participant map for secure access checks
      await update(ref(database, `conversations/${conversationId}`), {
        participants: {
          [user.uid]: true,
          [selectedUser.uid]: true,
        },
        createdBy: user.uid,
        lastMessage: messageText,
        lastMessageTime: new Date().toISOString(),
        lastMessageSender: user.uid,
        updatedAt: new Date().toISOString(),
      });

      // Send notification to receiver
      await sendNotification(
        selectedUser.uid,
        NotificationTemplates.messageReceived(senderName, messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText)
      );

      setMessageText('');
    } catch (error) {
      showError('Failed to send message: ' + error.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="700" gutterBottom>
        Messages
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Connect with colleagues and administrators
      </Typography>

      <Paper
        elevation={2}
        sx={{
          height: '70vh',
          display: 'flex',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* Users List */}
        <Box
          sx={{
            width: 320,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDarkMode ? alpha(theme.palette.background.default, 0.7) : theme.palette.grey[50],
          }}
        >
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Divider />
          <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
            {filteredUsers.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  No users found
                </Typography>
              </Box>
            ) : (
              filteredUsers.map((u) => (
                <ListItem
                  key={u.uid}
                  button
                  selected={selectedUser?.uid === u.uid}
                  onClick={() => setSelectedUser(u)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.18),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.28),
                      },
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: 'success.main',
                        },
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {(() => {
                          const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User';
                          return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                        })()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                    secondary={u.role}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Box>

        {/* Chat Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.background.default,
          }}
        >
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: isDarkMode
                    ? alpha(theme.palette.primary.main, 0.25)
                    : theme.palette.primary.main,
                  color: isDarkMode
                    ? theme.palette.primary.contrastText
                    : theme.palette.common.white,
                  borderBottom: 1,
                  borderColor: alpha(theme.palette.common.black, 0.12),
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'background.paper', color: 'primary.main', border: 2, borderColor: 'primary.light' }}>
                    {(() => {
                      const name = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email || 'User';
                      return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                    })()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="600" color={isDarkMode ? 'text.primary' : 'common.white'}>
                      {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email}
                    </Typography>
                    <Typography variant="body2" color={isDarkMode ? 'text.secondary' : alpha(theme.palette.common.white, 0.8)}>
                      {selectedUser.role}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: isDarkMode
                    ? alpha(theme.palette.background.paper, 0.4)
                    : theme.palette.grey[50],
                }}
              >
                {messages.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {messages.map((msg) => {
                      const isMine = msg.senderId === user.uid;
                      return (
                        <Box
                          key={msg.id}
                          sx={{
                            display: 'flex',
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Paper
                            elevation={isMine ? 2 : 1}
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              bgcolor: isMine
                                ? theme.palette.primary.main
                                : isDarkMode 
                                  ? alpha(theme.palette.background.paper, 0.8)
                                  : theme.palette.grey[200],
                              color: isMine
                                ? theme.palette.primary.contrastText
                                : theme.palette.text.primary,
                              borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              border: isMine ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            }}
                          >
                            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                              {msg.text}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: isMine ? 0.9 : 0.7,
                                fontSize: '0.7rem',
                              }}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Paper>
                        </Box>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </Box>
                )}
              </Box>

              {/* Message Input */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: theme.palette.background.paper,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    multiline
                    maxRows={3}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                      '&:disabled': {
                        bgcolor: alpha(theme.palette.text.primary, 0.12),
                        color: alpha(theme.palette.text.primary, 0.4),
                      },
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="text.secondary" variant="h6">
                Select a user to start messaging
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MessagesPage;

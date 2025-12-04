import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  InputAdornment,
  CircularProgress,
  Badge,
  Chip,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showError } from '../utils/toast';
import UserAvatar from '../components/common/UserAvatar';

const MessagesPageEnhanced = () => {
  const { user, userData } = useAuth();
  const { t, language } = useI18n();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isRTL = language === 'ar';
  
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
      showError(t('errors.sessionExpired'));
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

      setMessageText('');
    } catch (error) {
      showError(t('errors.sendMessageFailed') + error.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now - date) / 1000;
    
    if (diffInSeconds < 60) return t('message.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('message.minutesAgo')}`;
    if (diffInSeconds < 86400) return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="700" gutterBottom>
          {t('message.messages')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('message.subtitle')}
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          height: '75vh',
          display: 'flex',
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: theme.palette.background.paper,
        }}
      >
        {/* Users List */}
        <Box
          sx={{
            width: 340,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: isDarkMode 
              ? alpha(theme.palette.background.default, 0.4) 
              : alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Box sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight="700" gutterBottom>
              {t('message.conversations')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={t('message.searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: theme.palette.background.paper,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Divider />
          <List sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
            {filteredUsers.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  {t('message.noUsers')}
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
                    py: 1.5,
                    px: 2,
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                      },
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: 'translateX(4px)',
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
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          border: `2px solid ${theme.palette.background.paper}`,
                        },
                      }}
                    >
                      <UserAvatar user={u} size={48} />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight="600">
                        {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                      </Typography>
                    }
                    secondary={
                      <Chip 
                        label={u.role} 
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          mt: 0.5,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        }}
                      />
                    }
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
            bgcolor: isDarkMode 
              ? alpha(theme.palette.background.default, 0.2)
              : '#FAFAFA',
          }}
        >
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2.5,
                  background: isDarkMode
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.dark, 0.3)} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: theme.palette.primary.contrastText,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <UserAvatar user={selectedUser} size={50} />
                    <Box>
                      <Typography variant="h6" fontWeight="700">
                        {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'success.main' 
                          }} 
                        />
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {t('message.online')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <IconButton 
                    sx={{ color: 'inherit' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {messages.length === 0 ? (
                  <Box 
                    display="flex" 
                    flexDirection="column"
                    justifyContent="center" 
                    alignItems="center" 
                    height="100%"
                    gap={2}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SendIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Box>
                    <Typography color="text.secondary" variant="h6">
                      {t('message.noMessages')}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {t('message.startConversation')}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {messages.map((msg) => {
                      const isMine = msg.senderId === user.uid;
                      return (
                        <Box
                          key={msg.id}
                          sx={{
                            display: 'flex',
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-end',
                            gap: 1,
                          }}
                        >
                          {!isMine && (
                            <UserAvatar user={selectedUser} size={32} />
                          )}
                          <Box
                            sx={{
                              maxWidth: '70%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMine ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1.5,
                                px: 2,
                                bgcolor: isMine
                                  ? theme.palette.primary.main
                                  : theme.palette.background.paper,
                                color: isMine
                                  ? theme.palette.primary.contrastText
                                  : theme.palette.text.primary,
                                borderRadius: isMine 
                                  ? '18px 18px 4px 18px'
                                  : '18px 18px 18px 4px',
                                boxShadow: isMine
                                  ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                                  : theme.shadows[1],
                                border: isMine 
                                  ? 'none'
                                  : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                              }}
                            >
                              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                                {msg.text}
                              </Typography>
                            </Paper>
                            <Typography
                              variant="caption"
                              sx={{
                                mt: 0.5,
                                px: 1,
                                color: 'text.secondary',
                              }}
                            >
                              {formatTime(msg.timestamp)}
                            </Typography>
                          </Box>
                          {isMine && (
                            <UserAvatar user={userData} size={32} />
                          )}
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
                  p: 2.5,
                  bgcolor: theme.palette.background.paper,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box display="flex" gap={1} alignItems="flex-end">
                  <IconButton
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <EmojiIcon />
                  </IconButton>
                  <IconButton
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    placeholder={t('message.typeMessage')}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    multiline
                    maxRows={4}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: isDarkMode 
                          ? alpha(theme.palette.background.default, 0.4)
                          : theme.palette.grey[50],
                      },
                    }}
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                        transform: 'scale(1.05)',
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
            <Box 
              display="flex" 
              flexDirection="column"
              justifyContent="center" 
              alignItems="center" 
              height="100%"
              gap={2}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SendIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              </Box>
              <Typography color="text.secondary" variant="h5" fontWeight="600">
                {t('message.selectUser')}
              </Typography>
              <Typography color="text.secondary" variant="body1">
                {t('message.selectUserDescription')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MessagesPageEnhanced;

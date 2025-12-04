import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Grid,
  Card,
  Badge,
  Chip
} from '@mui/material';
import {
  Send,
  Search,
  Message
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { database } from '../config/firebase';
import { ref, push, onValue, query, orderByChild } from 'firebase/database';
import { toast } from 'react-hot-toast';

const MessagesPage = () => {
  const { userData, currentUser, userRole } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    // Load users for starting new conversations
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data)
          .map(([key, value]) => ({
            uid: key,
            ...value
          }))
          .filter(u => u.uid !== currentUser?.uid && u.status === 'approved');
        setUsers(usersList);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    // Load conversations
    const conversationsRef = ref(database, 'conversations');
    const unsubscribe = onValue(conversationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const convList = Object.entries(data)
          .map(([key, value]) => ({
            id: key,
            ...value
          }))
          .filter(conv => 
            conv.participants?.includes(currentUser?.uid) || isAdmin
          );
        setConversations(convList);
      }
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (selectedConversation) {
      const messagesRef = ref(database, `messages/${selectedConversation.id}`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesList = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
          })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setMessages(messagesList);
        } else {
          setMessages([]);
        }
      });

      return () => unsubscribe();
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const messageData = {
        senderId: currentUser.uid,
        senderName: `${userData.firstName} ${userData.lastName}`,
        text: newMessage,
        timestamp: new Date().toISOString(),
        read: false
      };

      await push(ref(database, `messages/${selectedConversation.id}`), messageData);
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const startConversation = async (user) => {
    // Check if conversation already exists
    const existing = conversations.find(conv => 
      conv.participants?.includes(user.uid) && conv.participants?.includes(currentUser.uid)
    );

    if (existing) {
      setSelectedConversation(existing);
      return;
    }

    // Create new conversation
    try {
      const conversationData = {
        participants: [currentUser.uid, user.uid],
        participantNames: {
          [currentUser.uid]: `${userData.firstName} ${userData.lastName}`,
          [user.uid]: `${user.firstName} ${user.lastName}`
        },
        createdAt: new Date().toISOString(),
        lastMessage: '',
        lastMessageTime: new Date().toISOString()
      };

      const newConvRef = await push(ref(database, 'conversations'), conversationData);
      setSelectedConversation({ id: newConvRef.key, ...conversationData });
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const filteredUsers = users.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Messages
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2, height: 'calc(100vh - 200px)' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Box>
            <Divider />
            
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {searchQuery ? (
                // Show users when searching
                filteredUsers.map((user) => (
                  <ListItem 
                    button 
                    key={user.uid}
                    onClick={() => startConversation(user)}
                  >
                    <ListItemAvatar>
                      <Avatar>{user.firstName?.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${user.firstName} ${user.lastName}`}
                      secondary={user.role}
                    />
                  </ListItem>
                ))
              ) : (
                // Show conversations
                conversations.map((conv) => {
                  const otherParticipantId = conv.participants?.find(p => p !== currentUser?.uid);
                  const otherParticipantName = conv.participantNames?.[otherParticipantId] || 'Unknown';
                  
                  return (
                    <ListItem 
                      button 
                      key={conv.id}
                      selected={selectedConversation?.id === conv.id}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <ListItemAvatar>
                        <Badge color="primary" variant="dot" invisible={true}>
                          <Avatar>{otherParticipantName.charAt(0)}</Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={otherParticipantName}
                        secondary={conv.lastMessage || 'No messages yet'}
                      />
                    </ListItem>
                  );
                })
              )}
              
              {conversations.length === 0 && !searchQuery && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Message sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="textSecondary">
                    No conversations yet. Search for users to start chatting!
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Messages Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">
                    {selectedConversation.participantNames?.[
                      selectedConversation.participants?.find(p => p !== currentUser?.uid)
                    ] || 'Conversation'}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((message) => {
                    const isMe = message.senderId === currentUser?.uid;
                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          mb: 2
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            bgcolor: isMe ? 'primary.main' : 'grey.200',
                            color: isMe ? 'white' : 'text.primary',
                            borderRadius: 2,
                            p: 1.5
                          }}
                        >
                          {!isMe && (
                            <Typography variant="caption" fontWeight="bold" display="block">
                              {message.senderName}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            {message.text}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <IconButton 
                    color="primary" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                flexDirection: 'column',
                gap: 2
              }}>
                <Message sx={{ fontSize: 80, color: 'text.secondary' }} />
                <Typography variant="h6" color="textSecondary">
                  Select a conversation to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MessagesPage;

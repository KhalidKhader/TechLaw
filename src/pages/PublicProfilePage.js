import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Assignment as TaskIcon,
  Lightbulb as IdeaIcon,
  Event as EventIcon,
  Message as MessageIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  useI18n();
  const theme = useTheme();
  
  const [profileUser, setProfileUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [userIdeas, setUserIdeas] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    // Load user profile data
    const userRef = ref(database, `users/${userId}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData && userData.status === 'approved') {
        setProfileUser({ uid: userId, ...userData });
      } else {
        setError('User not found or not approved');
      }
      setLoading(false);
    });

    // Load user's tasks
    const tasksRef = ref(database, 'tasks');
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksList = Object.entries(data)
          .map(([id, task]) => ({ id, ...task }))
          .filter(task => 
            task.createdBy === userId || 
            (Array.isArray(task.assignedTo) ? task.assignedTo.includes(userId) : task.assignedTo === userId)
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setUserTasks(tasksList);
      }
    });

    // Load user's ideas
    const ideasRef = ref(database, 'ideas');
    const unsubscribeIdeas = onValue(ideasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ideasList = Object.entries(data)
          .map(([id, idea]) => ({ id, ...idea }))
          .filter(idea => idea.submittedBy === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setUserIdeas(ideasList);
      }
    });

    // Load user's events
    const eventsRef = ref(database, 'events');
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList = Object.entries(data)
          .map(([id, event]) => ({ id, ...event }))
          .filter(event => event.createdBy === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setUserEvents(eventsList);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeTasks();
      unsubscribeIdeas();
      unsubscribeEvents();
    };
  }, [userId]);

  const handleSendMessage = () => {
    // Navigate to messages with the user selected
    navigate('/messages', { state: { selectedUser: userId } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profileUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'User profile not found'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  const fullName = profileUser.firstName && profileUser.lastName
    ? `${profileUser.firstName} ${profileUser.lastName}`
    : profileUser.displayName || profileUser.email;

  const initials = fullName.split(' ')
    .map(n => n.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        
        <Paper
          sx={{
            p: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${alpha(theme.palette.secondary.main, 0.8)} 100%)`,
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                fontSize: '2.5rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.background.paper, 0.2),
                color: 'white',
                border: '4px solid rgba(255,255,255,0.3)'
              }}
            >
              {initials}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h4" fontWeight="700" gutterBottom>
                {fullName}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                {profileUser.role === 'superAdmin' ? 'Super Administrator' :
                 profileUser.role === 'admin' ? 'Administrator' :
                 profileUser.role === 'user' ? 'User' : 'Viewer'}
              </Typography>
              
              <Box display="flex" gap={2} flexWrap="wrap">
                {profileUser.email && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmailIcon fontSize="small" />
                    <Typography variant="body2">{profileUser.email}</Typography>
                  </Box>
                )}
                {profileUser.profile?.phone && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon fontSize="small" />
                    <Typography variant="body2">{profileUser.profile.phone}</Typography>
                  </Box>
                )}
                {profileUser.profile?.address && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationIcon fontSize="small" />
                    <Typography variant="body2">{profileUser.profile.address}</Typography>
                  </Box>
                )}
              </Box>

              {currentUser?.uid !== userId && (
                <Button
                  variant="contained"
                  startIcon={<MessageIcon />}
                  onClick={handleSendMessage}
                  sx={{
                    mt: 2,
                    bgcolor: alpha(theme.palette.background.paper, 0.2),
                    color: 'white',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.background.paper, 0.3)
                    }
                  }}
                >
                  Send Message
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Profile Content */}
      <Grid container spacing={3}>
        {/* Left Column - Profile Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              About
            </Typography>
            
            {profileUser.profile?.bio ? (
              <Typography variant="body2" color="text.secondary" paragraph>
                {profileUser.profile.bio}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled" paragraph>
                No bio available
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Member Since
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {new Date(profileUser.createdAt).toLocaleDateString()}
            </Typography>

            {/* Activity Stats */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Activity Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                    <TaskIcon />
                    <Typography variant="h6" fontWeight="600">{userTasks.length}</Typography>
                    <Typography variant="caption">Tasks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1, color: 'secondary.contrastText' }}>
                    <IdeaIcon />
                    <Typography variant="h6" fontWeight="600">{userIdeas.length}</Typography>
                    <Typography variant="caption">Ideas</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box textAlign="center" sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                    <EventIcon />
                    <Typography variant="h6" fontWeight="600">{userEvents.length}</Typography>
                    <Typography variant="caption">Events Created</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Activity Tabs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 2 }}>
            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{ px: 3, pt: 2 }}
            >
              <Tab label={`Tasks (${userTasks.length})`} />
              <Tab label={`Ideas (${userIdeas.length})`} />
              <Tab label={`Events (${userEvents.length})`} />
            </Tabs>

            {/* Tasks Tab */}
            <TabPanel value={tabValue} index={0}>
              {userTasks.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <TaskIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No tasks found
                  </Typography>
                </Box>
              ) : (
                <List>
                  {userTasks.slice(0, 10).map((task, index) => (
                    <React.Fragment key={task.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <TaskIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight="600">
                                {task.title}
                              </Typography>
                              <Chip
                                label={task.status}
                                size="small"
                                color={task.status === 'completed' ? 'success' : 'default'}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary" component="div">
                                {task.description}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {new Date(task.createdAt).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < userTasks.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>

            {/* Ideas Tab */}
            <TabPanel value={tabValue} index={1}>
              {userIdeas.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <IdeaIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No ideas submitted
                  </Typography>
                </Box>
              ) : (
                <List>
                  {userIdeas.slice(0, 10).map((idea, index) => (
                    <React.Fragment key={idea.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            <IdeaIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight="600">
                                {idea.title}
                              </Typography>
                              <Chip
                                label={idea.status || 'pending'}
                                size="small"
                                color={
                                  idea.status === 'approved' ? 'success' :
                                  idea.status === 'rejected' ? 'error' : 'warning'
                                }
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary" component="div">
                                {idea.description}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {new Date(idea.createdAt).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < userIdeas.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>

            {/* Events Tab */}
            <TabPanel value={tabValue} index={2}>
              {userEvents.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No events created
                  </Typography>
                </Box>
              ) : (
                <List>
                  {userEvents.slice(0, 10).map((event, index) => (
                    <React.Fragment key={event.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main' }}>
                            <EventIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight="600">
                                {event.title}
                              </Typography>
                              <Chip
                                label={event.status || 'pending'}
                                size="small"
                                color={
                                  event.status === 'approved' ? 'success' :
                                  event.status === 'rejected' ? 'error' : 'warning'
                                }
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary" component="div">
                                {event.description}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {new Date(event.startDate).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < userEvents.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PublicProfilePage;

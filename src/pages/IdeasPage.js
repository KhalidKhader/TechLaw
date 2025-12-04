import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Share as ShareIcon,
  ThumbUp as LikeIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import { getUserData } from '../services/userService';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';

const IdeasPage = () => {
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [ideaDialog, setIdeaDialog] = useState(false);
  const [usersData, setUsersData] = useState({});
  
  const [ideaForm, setIdeaForm] = useState({
    title: '',
    description: '',
    category: 'general',
    visibility: 'admin',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const ideasRef = ref(database, 'ideas');
    const unsubscribe = onValue(ideasRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ideasList = Object.entries(data).map(([id, idea]) => ({ id, ...idea }));
        setIdeas(ideasList);
        
        // Fetch user data for all idea submitters
        const uniqueUserIds = [...new Set(ideasList.map(idea => idea.submittedBy))];
        const usersDataMap = {};
        
        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            const userData = await getUserData(uid);
            if (userData) {
              usersDataMap[uid] = userData;
            }
          })
        );
        
        setUsersData(usersDataMap);
      } else {
        setIdeas([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitIdea = async () => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!ideaForm.title || !ideaForm.description) {
      showError('Please fill all required fields');
      return;
    }

    try {
      // Get user data from database
      const userData = await getUserData(user.uid);
      const submitterName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.email || user.email;

      const ideaId = push(ref(database, 'ideas')).key;
      await set(ref(database, `ideas/${ideaId}`), {
        id: ideaId,
        ...ideaForm,
        submittedBy: user.uid,
        submitterName: submitterName,
        status: 'pending',
        likes: 0,
        likedBy: {},
        createdAt: new Date().toISOString(),
      });

      // Send notification to admins
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      if (usersSnapshot.exists()) {
        const users = usersSnapshot.val();
        const adminUsers = Object.entries(users)
          .filter(([uid, userData]) => 
            userData.role === 'admin' || userData.role === 'superAdmin'
          );
        
        for (const [adminUid] of adminUsers) {
          await sendNotification(
            adminUid,
            NotificationTemplates.ideaSubmitted(ideaForm.title, submitterName)
          );
        }
      }

      showSuccess('Idea submitted successfully');
      setIdeaDialog(false);
      resetForm();
    } catch (error) {
      showError('Failed to submit idea: ' + error.message);
    }
  };

  const handleApproveIdea = async (ideaId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const ideaToApprove = ideas.find(i => i.id === ideaId);
      
      await update(ref(database, `ideas/${ideaId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });

      // Send notification to idea submitter
      if (ideaToApprove?.submittedBy) {
        await sendNotification(
          ideaToApprove.submittedBy,
          NotificationTemplates.ideaApproved(ideaToApprove.title)
        );
      }

      showSuccess('Idea approved successfully');
    } catch (error) {
      showError('Failed to approve idea: ' + error.message);
    }
  };

  const handleRejectIdea = async (ideaId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const ideaToReject = ideas.find(i => i.id === ideaId);
      
      await update(ref(database, `ideas/${ideaId}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.uid,
      });

      // Send notification to idea submitter
      if (ideaToReject?.submittedBy) {
        await sendNotification(
          ideaToReject.submittedBy,
          NotificationTemplates.ideaRejected(ideaToReject.title)
        );
      }

      showSuccess('Idea rejected');
    } catch (error) {
      showError('Failed to reject idea: ' + error.message);
    }
  };

  const handleLikeIdea = async (idea) => {
    if (!user?.uid) {
      showError('Please sign in to like ideas');
      return;
    }

    try {
      const likedBy = idea.likedBy || {};
      const hasLiked = likedBy[user.uid];

      if (hasLiked) {
        // Unlike - remove user from likedBy
        delete likedBy[user.uid];
      } else {
        // Like - add user to likedBy
        likedBy[user.uid] = true;
      }

      const likesCount = Object.keys(likedBy).length;

      // Update only the likes section using the specific path
      await set(ref(database, `ideas/${idea.id}/likes`), likesCount);
      await set(ref(database, `ideas/${idea.id}/likedBy`), likedBy);
    } catch (error) {
      showError('Failed to like idea: ' + error.message);
    }
  };

  const resetForm = () => {
    setIdeaForm({
      title: '',
      description: '',
      category: 'general',
      visibility: 'admin',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const filterIdeas = () => {
    if (!user?.uid) return ideas;
    
    let filtered = ideas;

    if (activeTab === 1) {
      filtered = filtered.filter(i => i.submittedBy === user.uid);
    } else if (activeTab === 2) {
      filtered = filtered.filter(i => i.status === 'pending');
    } else if (activeTab === 3) {
      filtered = filtered.filter(i => i.status === 'approved');
    }

    return filtered;
  };

  const filteredIdeas = filterIdeas();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {t('ideas.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('ideas.description')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIdeaDialog(true)}
          size="large"
        >
          {t('ideas.submitIdea')}
        </Button>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${t('ideas.allIdeas')} (${ideas.length})`} />
          <Tab label={`${t('ideas.myIdeas')} (${user?.uid ? ideas.filter(i => i.submittedBy === user.uid).length : 0})`} />
          <Tab label={`${t('ideas.pending')} (${ideas.filter(i => i.status === 'pending').length})`} />
          <Tab label={`${t('ideas.approved')} (${ideas.filter(i => i.status === 'approved').length})`} />
        </Tabs>
      </Paper>

      {/* Ideas Grid */}
      {filteredIdeas.length === 0 ? (
        <Alert severity="info">{t('ideas.noIdeas')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredIdeas.map((idea) => (
            <Grid item xs={12} md={6} lg={4} key={idea.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" fontWeight="600">
                      {idea.title}
                    </Typography>
                    <Chip
                      label={idea.status}
                      color={getStatusColor(idea.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {idea.description}
                  </Typography>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip label={idea.category} size="small" variant="outlined" />
                    <Chip
                      icon={<ShareIcon fontSize="small" />}
                      label={idea.visibility}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {(() => {
                          const userData = usersData[idea.submittedBy];
                          const name = userData?.firstName && userData?.lastName
                            ? `${userData.firstName} ${userData.lastName}`
                            : idea.submitterName || 'User';
                          return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
                        })()}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {usersData[idea.submittedBy]?.firstName && usersData[idea.submittedBy]?.lastName
                          ? `${usersData[idea.submittedBy].firstName} ${usersData[idea.submittedBy].lastName}`
                          : idea.submitterName || 'Unknown User'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(idea.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<LikeIcon />}
                    onClick={() => handleLikeIdea(idea)}
                    color={idea.likedBy?.[user?.uid] ? 'primary' : 'inherit'}
                    variant={idea.likedBy?.[user?.uid] ? 'contained' : 'text'}
                  >
                    {idea.likes || 0} {idea.likes === 1 ? t('ideas.like') : t('ideas.likes')}
                  </Button>

                  {isAdmin && idea.status === 'pending' && (
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApproveIdea(idea.id)}
                      >
                        <ApproveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRejectIdea(idea.id)}
                      >
                        <RejectIcon />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Submit Idea Dialog */}
      <Dialog open={ideaDialog} onClose={() => setIdeaDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('ideas.submitNewIdea')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('ideas.ideaTitle') + ' *'}
                value={ideaForm.title}
                onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('ideas.description') + ' *'}
                multiline
                rows={4}
                value={ideaForm.description}
                onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                placeholder={t('ideas.describeIdea')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('ideas.category')}
                value={ideaForm.category}
                onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
              >
                <MenuItem value="general">{t('ideas.categoryGeneral')}</MenuItem>
                <MenuItem value="technology">{t('ideas.categoryTechnology')}</MenuItem>
                <MenuItem value="process">{t('ideas.categoryProcess')}</MenuItem>
                <MenuItem value="education">{t('ideas.categoryEducation')}</MenuItem>
                <MenuItem value="other">{t('ideas.categoryOther')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('ideas.visibility')}
                value={ideaForm.visibility}
                onChange={(e) => setIdeaForm({ ...ideaForm, visibility: e.target.value })}
              >
                <MenuItem value="admin">{t('ideas.visibilityAdmin')}</MenuItem>
                <MenuItem value="all">{t('ideas.visibilityAll')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIdeaDialog(false);
            resetForm();
          }}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleSubmitIdea}>
            {t('ideas.submitIdea')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IdeasPage;

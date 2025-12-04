import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  Lightbulb,
  CheckCircle,
  Cancel,
  Visibility,
  Public,
  Lock,
  Close
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { database } from '../config/firebase';
import { ref, push, onValue, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

const IdeasPage = () => {
  const { userData, currentUser, userRole } = useAuth();
  const { t } = useI18n();
  const [ideas, setIdeas] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    category: 'general',
    visibility: 'public'
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const ideasRef = ref(database, 'ideas');
    const unsubscribe = onValue(ideasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ideasList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setIdeas(ideasList);
      } else {
        setIdeas([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitIdea = async () => {
    try {
      const ideaData = {
        ...newIdea,
        createdBy: currentUser.uid,
        createdByName: `${userData.firstName} ${userData.lastName}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
        votes: 0,
        comments: []
      };

      await push(ref(database, 'ideas'), ideaData);
      toast.success('Idea submitted successfully! Waiting for admin approval.');
      
      setOpenDialog(false);
      setNewIdea({
        title: '',
        description: '',
        category: 'general',
        visibility: 'public'
      });
    } catch (error) {
      toast.error('Failed to submit idea');
    }
  };

  const handleApproveIdea = async (ideaId) => {
    try {
      await update(ref(database, `ideas/${ideaId}`), {
        status: 'approved',
        approvedBy: currentUser.uid,
        approvedAt: new Date().toISOString()
      });
      toast.success('Idea approved!');
    } catch (error) {
      toast.error('Failed to approve idea');
    }
  };

  const handleRejectIdea = async (ideaId) => {
    try {
      await update(ref(database, `ideas/${ideaId}`), {
        status: 'rejected',
        rejectedBy: currentUser.uid,
        rejectedAt: new Date().toISOString()
      });
      toast.success('Idea rejected');
    } catch (error) {
      toast.error('Failed to reject idea');
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    if (tabValue === 0) { // My Ideas
      return idea.createdBy === currentUser?.uid;
    } else if (tabValue === 1) { // Public Ideas
      return idea.visibility === 'public' && idea.status === 'approved';
    } else if (tabValue === 2 && isAdmin) { // Pending Approval
      return idea.status === 'pending';
    }
    return false;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">Ideas & Innovation</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Submit New Idea
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="My Ideas" />
          <Tab label="Public Ideas" />
          {isAdmin && <Tab label="Pending Approval" />}
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {filteredIdeas.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Lightbulb sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No ideas found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {tabValue === 0 
                  ? "Submit your first idea to get started!" 
                  : tabValue === 1 
                  ? "No approved public ideas yet"
                  : "No ideas pending approval"}
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredIdeas.map((idea) => (
            <Grid item xs={12} md={6} lg={4} key={idea.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Chip 
                      label={idea.status} 
                      size="small" 
                      color={getStatusColor(idea.status)}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {idea.visibility === 'public' ? (
                        <Public fontSize="small" color="action" />
                      ) : (
                        <Lock fontSize="small" color="action" />
                      )}
                    </Box>
                  </Box>

                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {idea.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    sx={{ 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {idea.description}
                  </Typography>

                  <Chip 
                    label={idea.category} 
                    size="small" 
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                      {idea.createdByName?.charAt(0)}
                    </Avatar>
                    <Typography variant="caption" color="textSecondary">
                      {idea.createdByName} • {new Date(idea.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>

                {isAdmin && idea.status === 'pending' && (
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <Button 
                      size="small" 
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleRejectIdea(idea.id)}
                    >
                      Reject
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleApproveIdea(idea.id)}
                    >
                      Approve
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Submit Idea Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Submit New Idea
          <IconButton
            onClick={() => setOpenDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Idea Title"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                required
                placeholder="e.g. Legal Tech Innovation Platform"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={5}
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                required
                placeholder="Describe your idea in detail..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Category"
                value={newIdea.category}
                onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="technology">Technology</MenuItem>
                <MenuItem value="legal">Legal Innovation</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="process">Process Improvement</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Visibility"
                value={newIdea.visibility}
                onChange={(e) => setNewIdea({ ...newIdea, visibility: e.target.value })}
              >
                <MenuItem value="public">Public (Share with all users)</MenuItem>
                <MenuItem value="private">Private (Only me & admins)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitIdea}
            disabled={!newIdea.title || !newIdea.description}
            startIcon={<Lightbulb />}
          >
            Submit Idea
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IdeasPage;

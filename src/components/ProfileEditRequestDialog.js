import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Avatar,
  Alert
} from '@mui/material';
import { Edit as EditIcon, Send as SendIcon } from '@mui/icons-material';
import { ref, push, onValue, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';

const ProfileEditRequestDialog = ({ open, onClose }) => {
  const { user, userData } = useAuth();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    address: '',
    reason: ''
  });
  const [existingRequests, setExistingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userData) {
      // Pre-fill with current data
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.profile?.phone || '',
        bio: userData.profile?.bio || '',
        address: userData.profile?.address || '',
        reason: ''
      });

      // Load existing requests
      const requestsRef = ref(database, 'profileEditRequests');
      const unsubscribe = onValue(requestsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userRequests = Object.entries(data)
            .map(([id, request]) => ({ id, ...request }))
            .filter(request => request.userId === user?.uid && request.status === 'pending');
          setExistingRequests(userRequests);
        }
      });

      return () => unsubscribe();
    }
  }, [open, userData, user?.uid]);

  const handleSubmit = async () => {
    if (!formData.reason.trim()) {
      showError('Please provide a reason for the profile edit request');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.firstName && userData?.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : userData?.displayName || user.email,
        currentData: {
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          phone: userData?.profile?.phone || '',
          bio: userData?.profile?.bio || '',
          address: userData?.profile?.address || ''
        },
        requestedData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          bio: formData.bio,
          address: formData.address
        },
        reason: formData.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Save request
      await push(ref(database, 'profileEditRequests'), requestData);

      // Send notification to all admins
      const usersRef = ref(database, 'users');
      onValue(usersRef, async (snapshot) => {
        const users = snapshot.val();
        if (users) {
          const adminIds = Object.entries(users)
            .filter(([, user]) => user.role === 'admin' || user.role === 'superAdmin')
            .map(([uid]) => uid);
          
          for (const adminId of adminIds) {
            await sendNotification(
              adminId,
              NotificationTemplates.profileEditRequested(requestData.userName)
            );
          }
        }
      }, { onlyOnce: true });

      showSuccess('Profile edit request submitted successfully');
      onClose();
    } catch (error) {
      showError('Failed to submit request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.firstName !== (userData?.firstName || '') ||
      formData.lastName !== (userData?.lastName || '') ||
      formData.phone !== (userData?.profile?.phone || '') ||
      formData.bio !== (userData?.profile?.bio || '') ||
      formData.address !== (userData?.profile?.address || '')
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EditIcon color="primary" />
          <Typography variant="h6">Request Profile Changes</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {existingRequests.length > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have {existingRequests.length} pending profile edit request(s). 
            Please wait for admin approval before submitting new requests.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('user.firstName')}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              helperText={`Current: ${userData?.firstName || 'Not set'}`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('user.lastName')}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              helperText={`Current: ${userData?.lastName || 'Not set'}`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('user.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              helperText={`Current: ${userData?.profile?.phone || 'Not set'}`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              helperText={`Current: ${userData?.profile?.address || 'Not set'}`}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              multiline
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              helperText={`Current: ${userData?.profile?.bio || 'Not set'}`}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reason for Changes *"
              multiline
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please explain why you need to make these changes..."
              required
            />
          </Grid>
        </Grid>

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Requests
            </Typography>
            {existingRequests.map((request) => (
              <Card key={request.id} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="subtitle2">
                      Request submitted on {new Date(request.createdAt).toLocaleDateString()}
                    </Typography>
                    <Chip label="Pending" color="warning" size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Reason: {request.reason}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!hasChanges() || !formData.reason.trim() || loading}
          startIcon={<SendIcon />}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditRequestDialog;
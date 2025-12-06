import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, query, orderByChild, equalTo, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';
import { getUserData } from '../services/userService';

const RequestsPage = () => {
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDialog, setRequestDialog] = useState(false);
  const [usersData, setUsersData] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  
  const [requestForm, setRequestForm] = useState({
    type: 'profile_edit',
    title: '',
    description: '',
    changes: {},
    targetUser: null,
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const usersRef = ref(database, 'users');
    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const users = [];
        snapshot.forEach((child) => {
          const u = child.val();
          users.push({
            uid: child.key,
            name: `${u.firstName} ${u.lastName}`,
            email: u.email
          });
        });
        setAllUsers(users);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const baseRef = ref(database, 'editRequests');
    const requestsRef = isAdmin
      ? baseRef
      : query(baseRef, orderByChild('requestedBy'), equalTo(user.uid));

    const unsubscribe = onValue(requestsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data)
          .map(([id, req]) => ({ id, ...req }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRequests(requestsList);
        
        // Fetch user data for all request creators
        const uniqueUserIds = [...new Set(requestsList.map(req => req.requestedBy))];
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
        setRequests([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, user?.uid]);

  const handleSubmitRequest = async () => {
    if (!user?.uid) {
      showError(t('requests.sessionExpired'));
      return;
    }

    if (!requestForm.title || !requestForm.description) {
      showError(t('requests.fillRequired'));
      return;
    }

    try {
      // Get user data from database
      const userData = await getUserData(user.uid);
      const requesterName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.email || user.email;

      const requestId = push(ref(database, 'editRequests')).key;
      await set(ref(database, `editRequests/${requestId}`), {
        id: requestId,
        ...requestForm,
        targetUser: requestForm.targetUser ? requestForm.targetUser.uid : null,
        requestedBy: user.uid,
        requesterName: requesterName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Notify admins
      const usersSnapshot = await new Promise((resolve) => {
        onValue(ref(database, 'users'), (snapshot) => resolve(snapshot), { onlyOnce: true });
      });
      
      const users = usersSnapshot.val();
      const adminIds = Object.keys(users || {}).filter(
        uid => users[uid].role === 'admin' || users[uid].role === 'superAdmin'
      );

      for (const adminId of adminIds) {
        await sendNotification(
          adminId,
          NotificationTemplates.profileEditRequested(user.displayName || user.email)
        );
      }

      showSuccess(t('requests.submitSuccess'));
      setRequestDialog(false);
      setRequestForm({
        type: 'profile_edit',
        title: '',
        description: '',
        changes: {},
        targetUser: null,
      });
    } catch (error) {
      showError(t('requests.submitError') + ': ' + error.message);
    }
  };

  const handleApproveRequest = async (request) => {
    if (!user?.uid) {
      showError(t('requests.sessionExpired'));
      return;
    }

    try {
      await update(ref(database, `editRequests/${request.id}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });

      // Apply changes if profile edit
      if (request.type === 'profile_edit' && request.changes) {
        await update(ref(database, `users/${request.requestedBy}`), request.changes);
      }

      // Notify user
      await sendNotification(
        request.requestedBy,
        NotificationTemplates.requestApproved('profile edit')
      );

      showSuccess(t('requests.approveSuccess'));
    } catch (error) {
      showError(t('requests.approveError') + ': ' + error.message);
    }
  };

  const handleRejectRequest = async (request) => {
    if (!user?.uid) {
      showError(t('requests.sessionExpired'));
      return;
    }

    try {
      await update(ref(database, `editRequests/${request.id}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.uid,
      });

      // Notify user
      await sendNotification(
        request.requestedBy,
        NotificationTemplates.requestRejected('profile edit')
      );

      showSuccess(t('requests.rejectSuccess'));
    } catch (error) {
      showError(t('requests.rejectError') + ': ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const filterRequests = () => {
    if (!user?.uid) return requests;
    
    let filtered = requests;

    if (!isAdmin) {
      // Regular users see only their requests
      filtered = filtered.filter(r => r.requestedBy === user.uid);
    }

    if (activeTab === 1) {
      filtered = filtered.filter(r => r.status === 'pending');
    } else if (activeTab === 2) {
      filtered = filtered.filter(r => r.status === 'approved');
    } else if (activeTab === 3) {
      filtered = filtered.filter(r => r.status === 'rejected');
    }

    return filtered;
  };

  const filteredRequests = filterRequests();

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
            {t('dashboard.requests')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.requestsDescription')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => {
            setSelectedRequest(null);
            setRequestForm({
              type: 'profile_edit',
              title: '',
              description: '',
              changes: {},
              targetUser: null,
            });
            setRequestDialog(true);
          }}
          size="large"
        >
          {t('requests.newRequest')}
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
          <Tab label={`${t('requests.allRequests')} (${requests.length})`} />
          <Tab label={`${t('requests.myRequests')} (${user?.uid ? requests.filter(r => r.requestedBy === user.uid).length : 0})`} />
          <Tab label={`${t('common.pending')} (${requests.filter(r => r.status === 'pending').length})`} />
          <Tab label={`${t('common.approved')} (${requests.filter(r => r.status === 'approved').length})`} />
        </Tabs>
      </Paper>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <Alert severity="info">{t('common.noData')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredRequests.map((req) => (
            <Grid item xs={12} md={6} lg={4} key={req.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="600">
                        {req.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(`requests.${req.type}`) || req.type}
                      </Typography>
                    </Box>
                    <Chip
                      label={t(`common.${req.status}`) || req.status}
                      color={getStatusColor(req.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {req.description}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      {t('requests.requestedBy')}:
                    </Typography>
                    <Typography variant="caption" fontWeight="600">
                      {usersData[req.requestedBy]?.firstName 
                        ? `${usersData[req.requestedBy].firstName} ${usersData[req.requestedBy].lastName}`
                        : t('requests.user')}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedRequest(req);
                      setViewDialog(true);
                    }}
                  >
                    {t('common.view')}
                  </Button>
                  
                  {isAdmin && req.status === 'pending' && (
                    <Box display="flex" gap={1} ml={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApproveRequest(req.id)}
                      >
                        <ApproveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRejectRequest(req.id)}
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

      {/* Create Request Dialog */}
      <Dialog open={requestDialog} onClose={() => setRequestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('requests.newRequest')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={t('requests.requestTitle')}
              value={requestForm.title}
              onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
              placeholder={t('requests.requestTitlePlaceholder')}
            />
            <TextField
              fullWidth
              label={t('requests.description')}
              multiline
              rows={4}
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              placeholder={t('requests.descriptionPlaceholder')}
            />
            <Autocomplete
              options={allUsers}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField {...params} label={t('requests.targetUser')} placeholder={t('requests.selectTargetUser')} />
              )}
              value={requestForm.targetUser}
              onChange={(event, newValue) => {
                setRequestForm({ ...requestForm, targetUser: newValue });
              }}
              isOptionEqualToValue={(option, value) => option.uid === value.uid}
            />
            <Alert severity="info">
              {t('requests.adminReviewInfo')}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSubmitRequest}>
            {t('requests.submitRequest')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('requests.requestDetails')}</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedRequest.title}
              </Typography>
              <Chip
                label={t(`common.${selectedRequest.status}`) || selectedRequest.status}
                color={getStatusColor(selectedRequest.status)}
                size="small"
                sx={{ mb: 2 }}
              />
              <Typography variant="body1" paragraph color="text.primary">
                {selectedRequest.description}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.primary" display="block" sx={{ mb: 1 }}>
                  <strong>{t('requests.type')}:</strong> {selectedRequest.type.replace('_', ' ')}
                </Typography>
                <Typography variant="body2" color="text.primary" display="block" sx={{ mb: 1 }}>
                  <strong>{t('requests.requestedBy')}:</strong> {usersData[selectedRequest.requestedBy]?.firstName && usersData[selectedRequest.requestedBy]?.lastName
                    ? `${usersData[selectedRequest.requestedBy].firstName} ${usersData[selectedRequest.requestedBy].lastName}`
                    : selectedRequest.requesterName || t('requests.unknownUser')}
                </Typography>
                <Typography variant="body2" color="text.primary" display="block" sx={{ mb: 1 }}>
                  <strong>{t('common.date')}:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}
                </Typography>
                {selectedRequest.approvedAt && (
                  <Typography variant="body2" color="success.main" display="block" sx={{ mb: 1 }}>
                    <strong>{t('requests.approved')}:</strong> {new Date(selectedRequest.approvedAt).toLocaleString()}
                  </Typography>
                )}
                {selectedRequest.rejectedAt && (
                  <Typography variant="body2" color="error.main" display="block">
                    <strong>{t('requests.rejected')}:</strong> {new Date(selectedRequest.rejectedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RequestsPage;

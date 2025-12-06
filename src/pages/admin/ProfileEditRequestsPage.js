import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../hooks/useI18n';
import { showSuccess, showError } from '../../utils/toast';
import { sendNotification, NotificationTemplates } from '../../utils/notificationHelpers';

const ProfileEditRequestsPage = () => {
  const { userRole } = useAuth();
  useI18n();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    if (!isAdmin) return;

    const requestsRef = ref(database, 'profileEditRequests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.entries(data)
          .map(([id, request]) => ({ id, ...request }))
          .sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (b.status === 'pending' && a.status !== 'pending') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
        setRequests(requestsList);
      } else {
        setRequests([]);
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleApproveRequest = async (request) => {
    setLoading(true);
    try {
      // Update user profile
      const updates = {};
      updates[`users/${request.userId}/firstName`] = request.requestedData.firstName;
      updates[`users/${request.userId}/lastName`] = request.requestedData.lastName;
      updates[`users/${request.userId}/profile/phone`] = request.requestedData.phone;
      updates[`users/${request.userId}/profile/bio`] = request.requestedData.bio;
      updates[`users/${request.userId}/profile/address`] = request.requestedData.address;
      updates[`users/${request.userId}/updatedAt`] = new Date().toISOString();
      
      // Update request status
      updates[`profileEditRequests/${request.id}/status`] = 'approved';
      updates[`profileEditRequests/${request.id}/approvedAt`] = new Date().toISOString();

      await update(ref(database), updates);

      // Send notification to user
      await sendNotification(
        request.userId,
        NotificationTemplates.profileEditApproved()
      );

      showSuccess('Profile edit request approved and user profile updated');
      setViewDialog(false);
    } catch (error) {
      showError('Failed to approve request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (request) => {
    setLoading(true);
    try {
      await update(ref(database, `profileEditRequests/${request.id}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      // Send notification to user
      await sendNotification(
        request.userId,
        NotificationTemplates.profileEditRejected()
      );

      showSuccess('Profile edit request rejected');
      setViewDialog(false);
    } catch (error) {
      showError('Failed to reject request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const ComparisonTable = ({ current, requested, title }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Field</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>Changed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(requested).map((field) => {
              const isChanged = current[field] !== requested[field];
              return (
                <TableRow key={field} sx={{ bgcolor: isChanged ? 'warning.light' : 'inherit' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </TableCell>
                  <TableCell>{current[field] || 'Not set'}</TableCell>
                  <TableCell sx={{ fontWeight: isChanged ? 600 : 400 }}>
                    {requested[field] || 'Not set'}
                  </TableCell>
                  <TableCell>
                    {isChanged ? (
                      <Chip label="Yes" color="warning" size="small" />
                    ) : (
                      <Chip label="No" variant="outlined" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Profile Edit Requests Management
      </Typography>

      <Grid container spacing={3}>
        {requests.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <EditIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No profile edit requests found
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          requests.map((request) => (
            <Grid item xs={12} md={6} lg={4} key={request.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {request.userName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          {request.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {request.userEmail}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={request.status.toUpperCase()}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Reason:</strong> {request.reason}
                  </Typography>

                  <Typography variant="caption" color="text.disabled">
                    Submitted: {new Date(request.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedRequest(request);
                      setViewDialog(true);
                    }}
                  >
                    View Details
                  </Button>
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => handleApproveRequest(request)}
                        disabled={loading}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => handleRejectRequest(request)}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* View Request Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="lg" fullWidth>
        {selectedRequest && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar>{selectedRequest.userName.charAt(0).toUpperCase()}</Avatar>
                  <Box>
                    <Typography variant="h6">{selectedRequest.userName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedRequest.userEmail}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={selectedRequest.status.toUpperCase()}
                  color={getStatusColor(selectedRequest.status)}
                />
              </Box>
            </DialogTitle>

            <DialogContent>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Reason for changes:</strong> {selectedRequest.reason}
              </Alert>

              <ComparisonTable
                current={selectedRequest.currentData}
                requested={selectedRequest.requestedData}
                title="Requested Profile Changes"
              />

              <Typography variant="caption" color="text.disabled">
                Request submitted: {new Date(selectedRequest.createdAt).toLocaleString()}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setViewDialog(false)}>Close</Button>
              {selectedRequest.status === 'pending' && (
                <>
                  <Button
                    color="error"
                    startIcon={<RejectIcon />}
                    onClick={() => handleRejectRequest(selectedRequest)}
                    disabled={loading}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApproveRequest(selectedRequest)}
                    disabled={loading}
                  >
                    Approve & Apply Changes
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ProfileEditRequestsPage;
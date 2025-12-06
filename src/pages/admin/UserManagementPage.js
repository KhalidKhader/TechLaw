import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Block as SuspendIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as RoleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../config/firebase';
import { useI18n } from '../../hooks/useI18n';
import { showSuccess, showError } from '../../utils/toast';
import { sendNotification, createNotificationTemplate } from '../../utils/notifications';

const UserManagementPage = () => {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialog, setRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data).map(([uid, userData]) => ({
          uid,
          ...userData,
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    }, (error) => {
      showError('Failed to load users: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (uid) => {
    try {
      await update(ref(database, `users/${uid}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });
      
      // Send notification to user
      await sendNotification(uid, createNotificationTemplate.userApproved());
      
      showSuccess('User approved successfully');
    } catch (error) {
      showError('Failed to approve user: ' + error.message);
    }
  };

  const handleReject = async (uid) => {
    try {
      await update(ref(database, `users/${uid}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
      });
      
      // Send notification to user
      await sendNotification(uid, createNotificationTemplate.userRejected());
      
      showSuccess('User rejected');
    } catch (error) {
      showError('Failed to reject user: ' + error.message);
    }
  };

  const handleSuspend = async (uid) => {
    try {
      await update(ref(database, `users/${uid}`), {
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
      });
      showSuccess('User suspended');
    } catch (error) {
      showError('Failed to suspend user: ' + error.message);
    }
  };

  const handleUnsuspend = async (uid) => {
    try {
      await update(ref(database, `users/${uid}`), {
        status: 'approved',
        unsuspendedAt: new Date().toISOString(),
      });
      showSuccess('User unsuspended');
    } catch (error) {
      showError('Failed to unsuspend user: ' + error.message);
    }
  };



  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    
    try {
      await update(ref(database, `users/${selectedUser.uid}`), {
        role: newRole,
        roleUpdatedAt: new Date().toISOString(),
      });
      showSuccess(`User role updated to ${newRole}`);
      setRoleDialog(false);
      setSelectedUser(null);
      setNewRole('');
    } catch (error) {
      showError('Failed to update role: ' + error.message);
    }
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || 'viewer');
    setRoleDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'suspended': return 'default';
      default: return 'info';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superAdmin': return 'error';
      case 'admin': return 'secondary';
      case 'user': return 'primary';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const filterUsers = (status) => {
    let filtered = users;
    
    if (status !== 'all') {
      filtered = filtered.filter(u => u.status === status);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };


  const tabStatuses = ['all', 'pending', 'approved', 'suspended', 'rejected'];
  const currentStatus = tabStatuses[activeTab];
  const filteredUsers = filterUsers(currentStatus);

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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="700" gutterBottom>
          {t('admin.userManagement')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.userManagementDesc')}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4" fontWeight="700">
                    {users.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PersonIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {users.filter(u => u.status === 'pending').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <EmailIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Approved
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {users.filter(u => u.status === 'approved').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <ApproveIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Suspended
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="error.main">
                    {users.filter(u => u.status === 'suspended').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <SuspendIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper elevation={0} sx={{ borderRadius: 3 }}>
        {/* Search Bar */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${t('admin.allUsers')} (${users.length})`} />
          <Tab label={`${t('common.pending')} (${users.filter(u => u.status === 'pending').length})`} />
          <Tab label={`${t('common.approved')} (${users.filter(u => u.status === 'approved').length})`} />
          <Tab label={`${t('common.rejected')} (${users.filter(u => u.status === 'rejected').length})`} />
        </Tabs>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="info">{t('common.noData')}</Alert>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.user')}</TableCell>
                  <TableCell>{t('common.email')}</TableCell>
                  <TableCell>{t('admin.role')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="right">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar src={user.photoURL}>
                          {user.displayName?.charAt(0) || user.email?.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" fontWeight="600">
                          {user.displayName || 'No Name'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`common.${user.role || 'viewer'}`)}
                        color={getRoleColor(user.role)}
                        size="small"
                        onClick={() => openRoleDialog(user)}
                        icon={<RoleIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`common.${user.status}`) || user.status}
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" gap={1}>
                        {user.status === 'pending' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(user.uid)}
                              title={t('common.approve')}
                            >
                              <ApproveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(user.uid)}
                              title={t('common.reject')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setRoleDialog(true);
                          }}
                          title={t('admin.changeRole')}
                        >
                          <RoleIcon />
                        </IconButton>
                        {user.status === 'suspended' ? (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleUnsuspend(user.uid)}
                            title={t('common.unsuspend')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleSuspend(user.uid)}
                            title={t('common.suspend')}
                          >
                            <SuspendIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Role Change Dialog */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.changeRole')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              User: <strong>{selectedUser?.displayName || selectedUser?.email}</strong>
            </Typography>
            <TextField
              fullWidth
              select
              label={t('admin.role')}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="viewer">{t('common.viewer')}</MenuItem>
              <MenuItem value="user">{t('common.user')}</MenuItem>
              <MenuItem value="admin">{t('common.admin')}</MenuItem>
              <MenuItem value="superAdmin">{t('common.superAdmin')}</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleChangeRole}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagementPage;

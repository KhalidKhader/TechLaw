import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Business as OrgIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';

const OrganizationsPage = () => {
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [orgDialog, setOrgDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, orgId: null });
  const [allUsers, setAllUsers] = useState([]);
  
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: '',
    type: 'university',
    website: '',
    email: '',
    phone: '',
    members: [],
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
    const orgsRef = ref(database, 'organizations');
    const unsubscribe = onValue(orgsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orgsList = Object.entries(data).map(([id, org]) => ({ id, ...org }));
        setOrganizations(orgsList);
      } else {
        setOrganizations([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitOrg = async () => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!orgForm.name) {
      showError('Organization name is required');
      return;
    }

    try {
      const orgData = {
        ...orgForm,
        members: orgForm.members.map(m => m.uid),
      };

      if (selectedOrg) {
        // Update existing
        await update(ref(database, `organizations/${selectedOrg.id}`), {
          ...orgData,
          updatedAt: new Date().toISOString(),
        });
        showSuccess('Organization updated successfully');
      } else {
        // Create new
        const orgId = push(ref(database, 'organizations')).key;
        await set(ref(database, `organizations/${orgId}`), {
          id: orgId,
          ...orgData,
          submittedBy: user.uid,
          submitterName: user.displayName || user.email,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        // Notify admins about new organization submission
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const adminUsers = Object.entries(users)
            .filter(([uid, userData]) => 
              userData.role === 'admin' || userData.role === 'superAdmin'
            );
          
          const submitterName = user.displayName || user.email;
          for (const [adminUid] of adminUsers) {
            await sendNotification(
              adminUid,
              {
                type: 'approval',
                title: 'New Organization Submitted',
                message: `${submitterName} submitted "${orgForm.name}" for approval`,
                link: '/organizations'
              }
            );
          }
        }

        showSuccess('Organization submitted for approval');
      }
      
      setOrgDialog(false);
      setSelectedOrg(null);
      resetForm();
    } catch (error) {
      showError('Failed to submit organization: ' + error.message);
    }
  };

  const handleApproveOrg = async (orgId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const orgToApprove = organizations.find(o => o.id === orgId);
      
      await update(ref(database, `organizations/${orgId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });

      // Send notification to organization submitter
      if (orgToApprove?.submittedBy) {
        await sendNotification(
          orgToApprove.submittedBy,
          NotificationTemplates.organizationApproved(orgToApprove.name)
        );
      }

      showSuccess('Organization approved successfully');
    } catch (error) {
      showError('Failed to approve organization: ' + error.message);
    }
  };

  const handleRejectOrg = async (orgId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const orgToReject = organizations.find(o => o.id === orgId);
      
      await update(ref(database, `organizations/${orgId}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.uid,
      });

      // Send notification to organization submitter
      if (orgToReject?.submittedBy) {
        await sendNotification(
          orgToReject.submittedBy,
          NotificationTemplates.organizationRejected(orgToReject.name)
        );
      }

      showSuccess('Organization rejected');
    } catch (error) {
      showError('Failed to reject organization: ' + error.message);
    }
  };

  const handleDeleteOrg = async (orgId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      await remove(ref(database, `organizations/${orgId}`));
      showSuccess('Organization deleted successfully');
    } catch (error) {
      showError('Failed to delete organization: ' + error.message);
    }
  };

  const resetForm = () => {
    setOrgForm({
      name: '',
      description: '',
      type: 'university',
      website: '',
      email: '',
      phone: '',
      members: [],
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

  const filterOrgs = () => {
    if (!user?.uid) return organizations;
    
    let filtered = organizations;

    if (activeTab === 1) {
      filtered = filtered.filter(o => o.submittedBy === user.uid);
    } else if (activeTab === 2) {
      filtered = filtered.filter(o => o.status === 'pending');
    } else if (activeTab === 3) {
      filtered = filtered.filter(o => o.status === 'approved');
    }

    return filtered;
  };

  const filteredOrgs = filterOrgs();

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
            {t('organization.organizations')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.organizationsDescription')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedOrg(null);
            setOrgForm({
              name: '',
              description: '',
              type: 'university',
              website: '',
              email: '',
              phone: '',
            });
            setOrgDialog(true);
          }}
          size="large"
        >
          {t('organization.addOrganization')}
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
          <Tab label={`${t('organization.allOrganizations')} (${organizations.length})`} />
          <Tab label={`${t('organization.myOrganizations')} (${user?.uid ? organizations.filter(o => o.submittedBy === user.uid).length : 0})`} />
          <Tab label={`${t('common.pending')} (${organizations.filter(o => o.status === 'pending').length})`} />
          <Tab label={`${t('common.approved')} (${organizations.filter(o => o.status === 'approved').length})`} />
        </Tabs>
      </Paper>

      {/* Organizations Grid */}
      {filteredOrgs.length === 0 ? (
        <Alert severity="info">{t('common.noData')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredOrgs.map((org) => (
            <Grid item xs={12} md={6} lg={4} key={org.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <OrgIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t(`organization.${org.type}`) || org.type}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={t(`common.${org.status}`) || org.status}
                      color={getStatusColor(org.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {org.description}
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={1}>
                    {org.website && (
                      <Typography variant="caption" color="primary" component="a" href={org.website} target="_blank">
                        {org.website}
                      </Typography>
                    )}
                    {org.email && (
                      <Typography variant="caption" color="text.secondary">
                        {org.email}
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  {(isAdmin || org.submittedBy === user?.uid) && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedOrg(org);
                          setOrgForm({
                            name: org.name,
                            description: org.description,
                            type: org.type,
                            website: org.website || '',
                            email: org.email || '',
                            phone: org.phone || '',
                            members: org.members ? allUsers.filter(u => org.members.includes(u.uid)) : [],
                          });
                          setOrgDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setConfirmDialog({ open: true, orgId: org.id })}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  
                  {isAdmin && org.status === 'pending' && (
                    <Box display="flex" gap={1} ml={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApproveOrg(org.id)}
                      >
                        <ApproveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRejectOrg(org.id)}
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

      {/* Organization Dialog */}
      <Dialog open={orgDialog} onClose={() => setOrgDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedOrg ? t('organization.editOrganization') : t('organization.addNewOrganization')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('organization.organizationName') + ' *'}
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('organization.organizationDescription')}
                multiline
                rows={3}
                value={orgForm.description}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('organization.type')}
                value={orgForm.type}
                onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="university">{t('organization.types.university')}</option>
                <option value="law-firm">{t('organization.types.lawFirm')}</option>
                <option value="government">{t('organization.types.government')}</option>
                <option value="ngo">{t('organization.types.ngo')}</option>
                <option value="other">{t('organization.types.other')}</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('organization.website')}
                value={orgForm.website}
                onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                placeholder="https://example.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('organization.email')}
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('organization.phone')}
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={allUsers}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField {...params} label={t('organization.members')} placeholder={t('organization.addMembers')} />
                )}
                value={orgForm.members}
                onChange={(event, newValue) => {
                  setOrgForm({ ...orgForm, members: newValue });
                }}
                isOptionEqualToValue={(option, value) => option.uid === value.uid}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOrgDialog(false);
            setSelectedOrg(null);
            resetForm();
          }}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleSubmitOrg}>
            {selectedOrg ? t('common.update') : t('common.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, orgId: null })}
        onConfirm={() => {
          handleDeleteOrg(confirmDialog.orgId);
          setConfirmDialog({ open: false, orgId: null });
        }}
        title={t('organization.deleteOrganization')}
        message={t('organization.deleteConfirmation')}
        confirmText={t('common.delete')}
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default OrganizationsPage;

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
  IconButton,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assignment as FormIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import { sendNotification } from '../utils/notificationHelpers';
import ConfirmDialog from '../components/common/ConfirmDialog';

const FormsPage = () => {
  const { user, userRole, userData } = useAuth();
  const { t } = useI18n();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [formDialog, setFormDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, formId: null });
  const [selectedForm, setSelectedForm] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    fields: [],
  });

  const [fieldData, setFieldData] = useState({
    label: '',
    type: 'text',
    required: false,
    options: '',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const formsRef = ref(database, 'forms');
    const unsubscribe = onValue(formsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formsList = Object.entries(data).map(([id, form]) => ({ id, ...form }));
        setForms(formsList);
      } else {
        setForms([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddField = () => {
    if (!fieldData.label) {
      showError('Field label is required');
      return;
    }

    const newField = {
      id: Date.now().toString(),
      label: fieldData.label,
      type: fieldData.type,
      required: fieldData.required,
      options: fieldData.type === 'select' || fieldData.type === 'radio' 
        ? fieldData.options.split(',').map(o => o.trim()) 
        : [],
    };

    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    });

    setFieldData({
      label: '',
      type: 'text',
      required: false,
      options: '',
    });
  };

  const handleRemoveField = (fieldId) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.id !== fieldId),
    });
  };

  const handleSubmitForm = async () => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!formData.title || formData.fields.length === 0) {
      showError('Form title and at least one field are required');
      return;
    }

    try {
      if (selectedForm) {
        // Update existing form
        await update(ref(database, `forms/${selectedForm.id}`), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        showSuccess('Form updated successfully');
      } else {
        // Create new form
        const formId = push(ref(database, 'forms')).key;
        const creatorName = userData?.firstName && userData?.lastName 
          ? `${userData.firstName} ${userData.lastName}` 
          : user.email;
        await set(ref(database, `forms/${formId}`), {
          id: formId,
          ...formData,
          createdBy: user.uid,
          creatorName,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        // Notify admins about new form submission
        const usersSnapshot = await get(ref(database, 'users'));
        const users = usersSnapshot.val();
        const adminIds = Object.keys(users || {}).filter(
          uid => users[uid].role === 'admin' || users[uid].role === 'superAdmin'
        );

        for (const adminId of adminIds) {
          await sendNotification(
            adminId,
            {
              type: 'form',
              title: 'New Form Submitted',
              message: `${creatorName} submitted a new form: "${formData.title}"`,
              link: '/forms'
            }
          );
        }

        showSuccess('Form submitted for approval');
      }
      
      handleCloseDialog();
    } catch (error) {
      showError('Failed to submit form: ' + error.message);
    }
  };

  const handleApproveForm = async (formId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const formToApprove = forms.find(f => f.id === formId);
      if (!formToApprove) return;

      await update(ref(database, `forms/${formId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });

      // Notify form creator
      await sendNotification(
        formToApprove.createdBy,
        {
          type: 'form',
          title: 'Form Approved',
          message: `Your form "${formToApprove.title}" has been approved!`,
          link: '/forms'
        }
      );

      showSuccess('Form approved successfully');
    } catch (error) {
      showError('Failed to approve form: ' + error.message);
    }
  };

  const handleRejectForm = async (formId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      const formToReject = forms.find(f => f.id === formId);
      if (!formToReject) return;

      await update(ref(database, `forms/${formId}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.uid,
      });

      // Notify form creator
      await sendNotification(
        formToReject.createdBy,
        {
          type: 'form',
          title: 'Form Status Update',
          message: `Your form "${formToReject.title}" was not approved.`,
          link: '/forms'
        }
      );

      showSuccess('Form rejected');
    } catch (error) {
      showError('Failed to reject form: ' + error.message);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      await remove(ref(database, `forms/${formId}`));
      showSuccess('Form deleted successfully');
    } catch (error) {
      showError('Failed to delete form: ' + error.message);
    }
  };

  const handleCloseDialog = () => {
    setFormDialog(false);
    setSelectedForm(null);
    setFormData({
      title: '',
      description: '',
      category: 'general',
      fields: [],
    });
    setFieldData({
      label: '',
      type: 'text',
      required: false,
      options: '',
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

  const filterForms = () => {
    if (!user?.uid) return forms;
    
    let filtered = forms;

    if (activeTab === 1) {
      filtered = filtered.filter(f => f.createdBy === user.uid);
    } else if (activeTab === 2) {
      filtered = filtered.filter(f => f.status === 'pending');
    } else if (activeTab === 3) {
      filtered = filtered.filter(f => f.status === 'approved');
    }

    return filtered;
  };

  const filteredForms = filterForms();

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
            {t('dashboard.forms')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.formsDescription')}
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedForm(null);
              setFormData({
                title: '',
                description: '',
                category: 'general',
                fields: [],
              });
              setFormDialog(true);
            }}
            size="large"
          >
            {t('forms.createForm')}
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${t('forms.allForms')} (${forms.length})`} />
          <Tab label={`${t('forms.myForms')} (${user?.uid ? forms.filter(f => f.createdBy === user.uid).length : 0})`} />
          <Tab label={`${t('common.pending')} (${forms.filter(f => f.status === 'pending').length})`} />
          <Tab label={`${t('common.approved')} (${forms.filter(f => f.status === 'approved').length})`} />
        </Tabs>
      </Paper>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <Alert severity="info">{t('common.noData')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredForms.map((form) => (
            <Grid item xs={12} md={6} lg={4} key={form.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <FormIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {form.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t(`ideas.${form.category}`) || form.category}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={t(`common.${form.status}`) || form.status}
                      color={getStatusColor(form.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {form.description}
                  </Typography>

                  <Box display="flex" gap={1}>
                    <Chip 
                      label={`${form.fields?.length || 0} ${t('forms.fields')}`} 
                      size="small" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`${form.responses?.length || 0} ${t('forms.responses')}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      setSelectedForm(form);
                      setViewDialog(true);
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                  
                  {(isAdmin || form.createdBy === user?.uid) && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedForm(form);
                          setFormData({
                            title: form.title,
                            description: form.description,
                            category: form.category,
                            fields: form.fields || [],
                          });
                          setFormDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setConfirmDialog({ open: true, formId: form.id })}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  
                  {isAdmin && form.status === 'pending' && (
                    <Box display="flex" gap={1} ml={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleApproveForm(form.id)}
                      >
                        <ApproveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRejectForm(form.id)}
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

      {/* Form Builder Dialog */}
      <Dialog open={formDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedForm ? t('forms.editForm') : t('forms.createFormTitle')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('forms.formTitle') + ' *'}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('forms.description')}
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label={t('forms.category')}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="general">{t('forms.categories.general')}</option>
                <option value="event">{t('forms.categories.event')}</option>
                <option value="survey">{t('forms.categories.survey')}</option>
                <option value="application">{t('forms.categories.application')}</option>
                <option value="feedback">{t('forms.categories.feedback')}</option>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>{t('forms.formFields')}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('forms.fieldLabel')}
                value={fieldData.label}
                onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('forms.fieldType')}
                value={fieldData.type}
                onChange={(e) => setFieldData({ ...fieldData, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="text">{t('forms.text')}</option>
                <option value="email">{t('forms.email')}</option>
                <option value="number">{t('forms.number')}</option>
                <option value="date">{t('forms.date')}</option>
                <option value="textarea">{t('forms.textarea')}</option>
                <option value="select">{t('forms.select')}</option>
                <option value="radio">{t('forms.radio')}</option>
                <option value="checkbox">{t('forms.checkbox')}</option>
              </TextField>
            </Grid>

            {(fieldData.type === 'select' || fieldData.type === 'radio') && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('forms.optionsPlaceholder')}
                  value={fieldData.options}
                  onChange={(e) => setFieldData({ ...fieldData, options: e.target.value })}
                  placeholder={t('forms.optionsPlaceholder')}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddField}>
                {t('forms.addField')}
              </Button>
            </Grid>

            {formData.fields.length > 0 && (
              <Grid item xs={12}>
                <List>
                  {formData.fields.map((field, index) => (
                    <ListItem
                      key={field.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveField(field.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${index + 1}. ${field.label}`}
                        secondary={`Type: ${field.type} ${field.required ? '(Required)' : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSubmitForm}>
            {selectedForm ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Form Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('forms.formPreview')}: {selectedForm?.title}</DialogTitle>
        <DialogContent>
          {selectedForm && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedForm.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              {selectedForm.fields?.map((field, index) => (
                <Box key={field.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="600">
                    {index + 1}. {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('forms.fieldType')}: {field.type}
                  </Typography>
                  {field.options && field.options.length > 0 && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {t('forms.options')}: {field.options.join(', ')}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, formId: null })}
        onConfirm={() => {
          handleDeleteForm(confirmDialog.formId);
          setConfirmDialog({ open: false, formId: null });
        }}
        title={t('forms.deleteForm')}
        message={t('forms.deleteConfirmation')}
        confirmText={t('common.delete')}
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default FormsPage;

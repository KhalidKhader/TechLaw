import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  Divider,
  Grid,
  Avatar,
  IconButton,
  Card,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Person,
  Notifications,
  Security,
  Language,
  Palette,
  PhotoCamera,
  Save,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useI18n } from '../hooks/useI18n';
import { toast } from 'react-hot-toast';
import ProfileEditRequestDialog from '../components/ProfileEditRequestDialog';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const SettingsPage = () => {
  const { userData, currentUser } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useI18n();
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskUpdates: true,
    ideaApprovals: true,
    eventReminders: true
  });
  const [editRequestDialog, setEditRequestDialog] = useState(false);

  const handleSaveNotifications = () => {
    // Save to Firebase
    toast.success('Notification settings saved');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {t('common.settings')}
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.href = '/analytics'}
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          📊 {t('common.analytics')}
        </Button>
      </Box>

      <Paper sx={{ mt: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Person />} label={t('common.profile')} iconPosition="start" />
          <Tab icon={<Notifications />} label={t('common.notifications')} iconPosition="start" />
          <Tab icon={<Palette />} label={t('settings.appearance')} iconPosition="start" />
          <Tab icon={<Security />} label={t('settings.security')} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
                  src={userData?.photoURL}
                >
                  {userData?.firstName?.charAt(0)}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                  component="label"
                >
                  <input hidden accept="image/*" type="file" />
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Box>
              <Box>
                <Typography variant="h6">{userData?.firstName} {userData?.lastName}</Typography>
                <Typography variant="body2" color="textSecondary">{currentUser?.email}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('user.firstName')}
                value={userData?.firstName || ''}
                disabled
                placeholder={t('user.firstName')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('user.lastName')}
                value={userData?.lastName || ''}
                disabled
                placeholder={t('user.lastName')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('common.email')}
                value={currentUser?.email || ''}
                disabled
                placeholder={t('common.email')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('user.phone')}
                value={userData?.phone || ''}
                disabled
                placeholder={t('user.phone')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="textSecondary">
                  {t('settings.profileUpdateInfo')}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setEditRequestDialog(true)}
                  sx={{ ml: 2 }}
                >
                  {t('settings.requestProfileEdit')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>{t('settings.notificationPreferences')}</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            {t('settings.notificationPreferencesDesc')}
          </Typography>

          <List>
            <ListItem>
              <ListItemText 
                primary={t('settings.emailNotifications')}
                secondary={t('settings.emailNotificationsDesc')}
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemText 
                primary={t('settings.pushNotifications')}
                secondary={t('settings.pushNotificationsDesc')}
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemText 
                primary={t('settings.taskUpdates')}
                secondary={t('settings.taskUpdatesDesc')}
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={notifications.taskUpdates}
                  onChange={(e) => setNotifications({ ...notifications, taskUpdates: e.target.checked })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemText 
                primary={t('settings.ideaApprovals')}
                secondary={t('settings.ideaApprovalsDesc')}
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={notifications.ideaApprovals}
                  onChange={(e) => setNotifications({ ...notifications, ideaApprovals: e.target.checked })}
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />

            <ListItem>
              <ListItemText 
                primary={t('settings.eventReminders')}
                secondary={t('settings.eventRemindersDesc')}
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={notifications.eventReminders}
                  onChange={(e) => setNotifications({ ...notifications, eventReminders: e.target.checked })}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              startIcon={<Save />}
              onClick={handleSaveNotifications}
            >
              {t('settings.savePreferences')}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>{t('settings.appearanceSettings')}</Typography>
          
          <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">{t('settings.darkMode')}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('settings.darkModeDesc')}
                </Typography>
              </Box>
              <Switch 
                checked={mode === 'dark'}
                onChange={toggleTheme}
              />
            </Box>
          </Card>

          <Card variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">{t('settings.languageSettings')}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('settings.currentLanguage', { lang: language === 'en' ? 'English' : 'العربية' })}
                </Typography>
              </Box>
              <Button 
                variant="outlined"
                onClick={toggleLanguage}
                startIcon={<Language />}
              >
                {t('settings.switchLanguage', { lang: language === 'en' ? 'Arabic' : 'English' })}
              </Button>
            </Box>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>{t('settings.security')}</Typography>
          
          <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {t('settings.changePassword')}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('settings.currentPassword')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('settings.newPassword')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('settings.confirmNewPassword')}
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained">{t('settings.updatePassword')}</Button>
              </Grid>
            </Grid>
          </Card>

          <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {t('settings.accountStatus')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('settings.role')}: <strong>{userData?.role?.toUpperCase()}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('settings.status')}: <strong>{userData?.status?.toUpperCase()}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('settings.memberSince')}: {new Date(userData?.createdAt || Date.now()).toLocaleDateString()}
            </Typography>
          </Card>
        </TabPanel>
      </Paper>

      <ProfileEditRequestDialog
        open={editRequestDialog}
        onClose={() => setEditRequestDialog(false)}
      />
    </Box>
  );
};

export default SettingsPage;

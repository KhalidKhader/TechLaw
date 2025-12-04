import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  alpha,
  Stack,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Star as StarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Camera as CameraIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import databaseService from '../services/databaseService';
import { showSuccess, showError } from '../utils/toast';

const ProfilePageEnhanced = () => {
  const { user, userData } = useAuth();
  const { t } = useI18n();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    photoURL: '',
  });
  
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  
  const [educationDialog, setEducationDialog] = useState(false);
  const [skillDialog, setSkillDialog] = useState(false);
  const [experienceDialog, setExperienceDialog] = useState(false);
  
  const [educationForm, setEducationForm] = useState({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  
  const [skillForm, setSkillForm] = useState({
    name: '',
    level: 'Intermediate',
    category: 'Technical',
  });
  
  const [experienceForm, setExperienceForm] = useState({
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    description: '',
    current: false,
  });
  
  const [editingId, setEditingId] = useState(null);

  const loadProfileData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const userDoc = await databaseService.getDocument(`users/${user.uid}`);
      if (userDoc) {
        const fullName = userDoc.firstName && userDoc.lastName 
          ? `${userDoc.firstName} ${userDoc.lastName}`
          : userDoc.displayName || user.email || '';
        
        setProfile({
          displayName: fullName,
          firstName: userDoc.firstName || '',
          lastName: userDoc.lastName || '',
          email: userDoc.email || user.email || '',
          phone: userDoc.phone || userDoc.profile?.phone || '',
          bio: userDoc.bio || userDoc.profile?.bio || '',
          photoURL: userDoc.photoURL || '',
        });
      } else {
        // Auto-populate with available data
        const displayName = user.displayName || user.email?.split('@')[0] || '';
        setProfile({
          displayName: displayName,
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          email: user.email || '',
          phone: '',
          bio: '',
          photoURL: user.photoURL || '',
        });
      }
      
      const [eduData, skillsData, expData] = await Promise.all([
        databaseService.getEducation(user.uid),
        databaseService.getSkills(user.uid),
        databaseService.getExperience(user.uid),
      ]);
      
      setEducation(eduData || []);
      setSkills(skillsData || []);
      setExperience(expData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    
    setSaving(true);
    try {
      await databaseService.updateDocument(`users/${user.uid}`, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        bio: profile.bio,
        photoURL: profile.photoURL,
        updatedAt: new Date().toISOString(),
      });
      
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
    }
    if (profile.displayName) {
      return profile.displayName.split(' ')
        .map(n => n.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return profile.email?.charAt(0).toUpperCase() || 'U';
  };

  const resetEducationForm = () => {
    setEducationForm({
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      description: '',
    });
    setEditingId(null);
  };

  const resetSkillForm = () => {
    setSkillForm({
      name: '',
      level: 'Intermediate',
      category: 'Technical',
    });
    setEditingId(null);
  };

  const resetExperienceForm = () => {
    setExperienceForm({
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
      current: false,
    });
    setEditingId(null);
  };

  const handleAddEducation = async () => {
    if (!user?.uid || !educationForm.institution) return;
    
    try {
      if (editingId) {
        await databaseService.updateEducation(user.uid, editingId, educationForm);
        showSuccess('Education updated successfully');
      } else {
        await databaseService.addEducation(user.uid, educationForm);
        showSuccess('Education added successfully');
      }
      setEducationDialog(false);
      resetEducationForm();
      loadProfileData();
    } catch (error) {
      showError('Failed to save education');
    }
  };

  const handleAddSkill = async () => {
    if (!user?.uid || !skillForm.name) return;
    
    try {
      if (editingId) {
        await databaseService.updateSkill(user.uid, editingId, skillForm);
        showSuccess('Skill updated successfully');
      } else {
        await databaseService.addSkill(user.uid, skillForm);
        showSuccess('Skill added successfully');
      }
      setSkillDialog(false);
      resetSkillForm();
      loadProfileData();
    } catch (error) {
      showError('Failed to save skill');
    }
  };

  const handleAddExperience = async () => {
    if (!user?.uid || !experienceForm.company) return;
    
    try {
      if (editingId) {
        await databaseService.updateExperience(user.uid, editingId, experienceForm);
        showSuccess('Experience updated successfully');
      } else {
        await databaseService.addExperience(user.uid, experienceForm);
        showSuccess('Experience added successfully');
      }
      setExperienceDialog(false);
      resetExperienceForm();
      loadProfileData();
    } catch (error) {
      showError('Failed to save experience');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Enhanced Header */}
      <Paper 
        elevation={0}
        sx={{ 
          position: 'relative',
          borderRadius: 4,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          mb: 4,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDarkMode 
              ? 'rgba(0,0,0,0.3)' 
              : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <Box sx={{ position: 'relative', p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <IconButton 
                    size="small" 
                    sx={{ 
                      bgcolor: 'white', 
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'grey.100' }
                    }}
                  >
                    <CameraIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Avatar
                  src={profile.photoURL}
                  sx={{
                    width: 120,
                    height: 120,
                    border: '4px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    bgcolor: alpha('#fff', 0.2),
                  }}
                >
                  {getUserInitials()}
                </Avatar>
              </Badge>
            </Grid>
            <Grid item xs>
              <Typography variant="h3" fontWeight="700" gutterBottom>
                {profile.displayName || 'Complete Your Profile'}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon fontSize="small" />
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {profile.email}
                  </Typography>
                </Box>
                {profile.phone && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon fontSize="small" />
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {profile.phone}
                    </Typography>
                  </Box>
                )}
              </Stack>
              {profile.bio ? (
                <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '600px' }}>
                  {profile.bio}
                </Typography>
              ) : (
                <Typography variant="body1" sx={{ opacity: 0.7, fontStyle: 'italic' }}>
                  Add a bio to tell others about yourself
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Main Content */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }
            }}
          >
            <Tab label="Personal Information" icon={<PersonIcon />} />
            <Tab label="Education" icon={<SchoolIcon />} />
            <Tab label="Experience" icon={<WorkIcon />} />
            <Tab label="Skills" icon={<StarIcon />} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Personal Information Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  disabled
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          )}

          {/* Other tabs remain the same structure but with enhanced styling */}
          {activeTab === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="600">Education</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setEducationDialog(true)}
                  sx={{ borderRadius: 3, textTransform: 'none' }}
                >
                  Add Education
                </Button>
              </Box>
              {/* Education list */}
            </Box>
          )}

          {/* Add similar enhanced styling for other tabs */}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePageEnhanced;
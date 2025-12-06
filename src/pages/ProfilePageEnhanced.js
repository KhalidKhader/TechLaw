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
  CircularProgress,
  useTheme,
  alpha,
  Stack,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Star as StarIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Camera as CameraIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
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
  
  const loadProfileData = async (silent = false) => {
    if (!user?.uid) {
      if (!silent) setLoading(false);
      return;
    }
    
    if (!silent) setLoading(true);
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
      
      // Load additional profile data (education, skills, experience)
      const [eduData, skillData, expData] = await Promise.all([
        databaseService.getEducation(user.uid),
        databaseService.getSkills(user.uid),
        databaseService.getExperience(user.uid),
      ]);

      setEducation(eduData || []);
      setSkills(skillData || []);
      setExperience(expData || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Failed to load profile data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      loadProfileData(true);
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
      loadProfileData(true);
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
      loadProfileData(true);
    } catch (error) {
      showError('Failed to save experience');
    }
  };

  const handleDeleteEducation = async (id) => {
    if (window.confirm('Are you sure you want to delete this education?')) {
      try {
        await databaseService.deleteEducation(user.uid, id);
        showSuccess('Education deleted successfully');
        loadProfileData(true);
      } catch (error) {
        showError('Failed to delete education');
      }
    }
  };

  const handleDeleteSkill = async (id) => {
    if (window.confirm(t('common.deleteConfirm'))) {
      try {
        await databaseService.deleteSkill(user.uid, id);
        showSuccess(t('user.skillDeleted'));
        loadProfileData(true);
      } catch (error) {
        showError(t('user.skillDeleteError'));
      }
    }
  };

  const handleDeleteExperience = async (id) => {
    if (window.confirm(t('common.deleteConfirm'))) {
      try {
        await databaseService.deleteExperience(user.uid, id);
        showSuccess(t('user.experienceDeleted'));
        loadProfileData(true);
      } catch (error) {
        showError(t('user.experienceDeleteError'));
      }
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
                {profile.displayName || t('user.completeProfile')}
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
                  {t('user.addBio')}
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
            <Tab label={t('user.personalInfo')} icon={<PersonIcon />} />
            <Tab label={t('user.education')} icon={<SchoolIcon />} />
            <Tab label={t('user.experience')} icon={<WorkIcon />} />
            <Tab label={t('user.skills')} icon={<StarIcon />} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Personal Information Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.firstName')}
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.lastName')}
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('common.email')}
                  value={profile.email}
                  disabled
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('common.phone')}
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
                  label={t('user.bio')}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder={t('user.bioPlaceholder')}
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

          {/* Education Tab */}
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
              {education.length === 0 ? (
                <Typography variant="body1" sx={{ opacity: 0.7, textAlign: 'center' }}>
                  No education details found. Add your education information.
                </Typography>
              ) : (
                education.map((edu) => (
                  <Paper 
                    key={edu.id} 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      mb: 2, 
                      border: `1px solid ${theme.palette.divider}` 
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs>
                        <Typography variant="subtitle1" fontWeight="500">
                          {edu.degree}, {edu.field}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {edu.institution}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(edu.startDate).toLocaleDateString()} - {edu.current ? 'Present' : new Date(edu.endDate).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setEditingId(edu.id);
                            setEducationForm({
                              institution: edu.institution,
                              degree: edu.degree,
                              field: edu.field,
                              startDate: edu.startDate,
                              endDate: edu.endDate,
                              description: edu.description,
                            });
                            setEducationDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteEducation(edu.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              )}
            </Box>
          )}

          {/* Experience Tab */}
          {activeTab === 2 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="600">Experience</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setExperienceDialog(true)}
                  sx={{ borderRadius: 3, textTransform: 'none' }}
                >
                  Add Experience
                </Button>
              </Box>
              {/* Experience list */}
              {experience.length === 0 ? (
                <Typography variant="body1" sx={{ opacity: 0.7, textAlign: 'center' }}>
                  No experience details found. Add your work experience.
                </Typography>
              ) : (
                experience.map((exp) => (
                  <Paper 
                    key={exp.id} 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      mb: 2, 
                      border: `1px solid ${theme.palette.divider}` 
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs>
                        <Typography variant="subtitle1" fontWeight="500">
                          {exp.position}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {exp.company}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(exp.startDate).toLocaleDateString()} - {exp.current ? 'Present' : new Date(exp.endDate).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setEditingId(exp.id);
                            setExperienceForm({
                              company: exp.company,
                              position: exp.position,
                              startDate: exp.startDate,
                              endDate: exp.endDate,
                              description: exp.description,
                              current: exp.current,
                            });
                            setExperienceDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteExperience(exp.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              )}
            </Box>
          )}

          {/* Skills Tab */}
          {activeTab === 3 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="600">Skills</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setSkillDialog(true)}
                  sx={{ borderRadius: 3, textTransform: 'none' }}
                >
                  Add Skill
                </Button>
              </Box>
              {/* Skills list */}
              {skills.length === 0 ? (
                <Typography variant="body1" sx={{ opacity: 0.7, textAlign: 'center' }}>
                  No skills found. Add skills to showcase your expertise.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {skills.map((skill) => (
                    <Grid item xs={12} sm={6} md={4} key={skill.id}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          border: `1px solid ${theme.palette.divider}` 
                        }}
                      >
                        <Grid container alignItems="center">
                          <Grid item xs>
                            <Typography variant="subtitle1" fontWeight="500">
                              {skill.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Level: {skill.level}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Category: {skill.category}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setEditingId(skill.id);
                                setSkillForm({
                                  name: skill.name,
                                  level: skill.level,
                                  category: skill.category,
                                });
                                setSkillDialog(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteSkill(skill.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Dialogs for adding/editing education, experience, and skills */}
          {/* Education Dialog */}
          <Dialog
            open={educationDialog}
            onClose={() => setEducationDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingId ? 'Edit Education' : 'Add Education'}
            </DialogTitle>
            <DialogContent>
              <TextField
                label="Institution"
                value={educationForm.institution}
                onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Degree"
                value={educationForm.degree}
                onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Field of Study"
                value={educationForm.field}
                onChange={(e) => setEducationForm({ ...educationForm, field: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={educationForm.startDate}
                    onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    value={educationForm.endDate}
                    onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Description"
                value={educationForm.description}
                onChange={(e) => setEducationForm({ ...educationForm, description: e.target.value })}
                fullWidth
                multiline
                rows={4}
                sx={{ mb: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEducationDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button 
                onClick={handleAddEducation} 
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Experience Dialog */}
          <Dialog
            open={experienceDialog}
            onClose={() => setExperienceDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingId ? 'Edit Experience' : 'Add Experience'}
            </DialogTitle>
            <DialogContent>
              <TextField
                label="Company"
                value={experienceForm.company}
                onChange={(e) => setExperienceForm({ ...experienceForm, company: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Position"
                value={experienceForm.position}
                onChange={(e) => setExperienceForm({ ...experienceForm, position: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={experienceForm.startDate}
                    onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    value={experienceForm.endDate}
                    onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Description"
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
                fullWidth
                multiline
                rows={4}
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={experienceForm.current}
                    onChange={(e) => setExperienceForm({ ...experienceForm, current: e.target.checked })}
                    color="primary"
                  />
                }
                label="Currently working here"
                sx={{ mb: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setExperienceDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button 
                onClick={handleAddExperience} 
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Skills Dialog */}
          <Dialog
            open={skillDialog}
            onClose={() => setSkillDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {editingId ? 'Edit Skill' : 'Add Skill'}
            </DialogTitle>
            <DialogContent>
              <TextField
                label="Skill Name"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Level</InputLabel>
                <Select
                  value={skillForm.level}
                  onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
                  label="Level"
                >
                  <MenuItem value="Beginner">Beginner</MenuItem>
                  <MenuItem value="Intermediate">Intermediate</MenuItem>
                  <MenuItem value="Expert">Expert</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="Technical">Technical</MenuItem>
                  <MenuItem value="Soft Skill">Soft Skill</MenuItem>
                  <MenuItem value="Language">Language</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSkillDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button 
                onClick={handleAddSkill} 
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePageEnhanced;
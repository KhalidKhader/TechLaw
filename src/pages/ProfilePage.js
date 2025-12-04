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
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import databaseService from '../services/databaseService';
import { showSuccess, showError } from '../utils/toast';

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    displayName: '',
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
      const userData = await databaseService.getDocument(`users/${user.uid}`);
      if (userData) {
        const fullName = userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}`
          : userData.displayName || user.email || '';
        setProfile({
          displayName: fullName,
          email: userData.email || user.email || '',
          phone: userData.phone || userData.profile?.phone || '',
          bio: userData.bio || userData.profile?.bio || '',
          photoURL: userData.photoURL || '',
        });
      } else {
        // If no userData found, use Firebase auth data and create basic profile
        const displayName = user.displayName || user.email || '';
        setProfile({
          displayName: displayName,
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
      
      setEducation(eduData);
      setSkills(skillsData);
      setExperience(expData);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await databaseService.updateProfile(user.uid, profile);
      showSuccess(t('profile.updateSuccess'));
    } catch (error) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEducation = async () => {
    try {
      const newEdu = await databaseService.addEducation(user.uid, educationForm);
      setEducation([...education, newEdu]);
      setEducationDialog(false);
      resetEducationForm();
      showSuccess('Education added successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleUpdateEducation = async () => {
    try {
      await databaseService.updateEducation(user.uid, editingId, educationForm);
      setEducation(education.map(e => e.id === editingId ? { ...e, ...educationForm } : e));
      setEducationDialog(false);
      resetEducationForm();
      showSuccess('Education updated successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDeleteEducation = async (eduId) => {
    try {
      await databaseService.deleteEducation(user.uid, eduId);
      setEducation(education.filter(e => e.id !== eduId));
      showSuccess('Education deleted successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAddSkill = async () => {
    try {
      const newSkill = await databaseService.addSkill(user.uid, skillForm);
      setSkills([...skills, newSkill]);
      setSkillDialog(false);
      resetSkillForm();
      showSuccess('Skill added successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      await databaseService.deleteSkill(user.uid, skillId);
      setSkills(skills.filter(s => s.id !== skillId));
      showSuccess('Skill deleted successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleAddExperience = async () => {
    try {
      const newExp = await databaseService.addExperience(user.uid, experienceForm);
      setExperience([...experience, newExp]);
      setExperienceDialog(false);
      resetExperienceForm();
      showSuccess('Experience added successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleUpdateExperience = async () => {
    try {
      await databaseService.updateExperience(user.uid, editingId, experienceForm);
      setExperience(experience.map(e => e.id === editingId ? { ...e, ...experienceForm } : e));
      setExperienceDialog(false);
      resetExperienceForm();
      showSuccess('Experience updated successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDeleteExperience = async (expId) => {
    try {
      await databaseService.deleteExperience(user.uid, expId);
      setExperience(experience.filter(e => e.id !== expId));
      showSuccess('Experience deleted successfully');
    } catch (error) {
      showError(error.message);
    }
  };

  const openEditEducation = (edu) => {
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
  };

  const openEditExperience = (exp) => {
    setEditingId(exp.id);
    setExperienceForm({
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate,
      endDate: exp.endDate,
      description: exp.description,
      current: exp.current || false,
    });
    setExperienceDialog(true);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 3,
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)',
          },
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={profile.photoURL}
              sx={{
                width: 120,
                height: 120,
                border: '5px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                fontSize: '2.5rem',
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {profile.displayName
                ? profile.displayName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
                : 'U'}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h3" fontWeight="700" gutterBottom sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {profile.displayName || 'User Name'}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, mb: 1 }}>
              {profile.email}
            </Typography>
            {profile.phone && (
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                📞 {profile.phone}
              </Typography>
            )}
            {profile.bio && (
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 2, fontStyle: 'italic' }}>
                "{profile.bio}"
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Paper 
        elevation={2} 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          overflow: 'hidden',
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.05)'
            : 'white',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 28 }} />} label={t('user.personalInfo')} iconPosition="start" />
          <Tab icon={<SchoolIcon sx={{ fontSize: 28 }} />} label={t('user.education')} iconPosition="start" />
          <Tab icon={<StarIcon sx={{ fontSize: 28 }} />} label={t('user.skills')} iconPosition="start" />
          <Tab icon={<WorkIcon sx={{ fontSize: 28 }} />} label={t('user.experience')} iconPosition="start" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.05)'
              : 'white',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="700" color="primary">
              {t('user.personalInfo')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              disabled={saving}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </Box>
          <Divider sx={{ mb: 4 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('common.firstName') + ' ' + t('common.lastName')}
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('common.email')}
                value={profile.email}
                disabled
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('common.phone')}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('user.bio')}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                variant="outlined"
                multiline
                rows={4}
                placeholder="Tell us about yourself..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={saving}
                size="large"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="600">
              Education
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEducationDialog(true)}
            >
              Add Education
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {education.length === 0 ? (
            <Alert severity="info">No education records yet. Add your first one!</Alert>
          ) : (
            <List>
              {education.map((edu, index) => (
                <React.Fragment key={edu.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      p: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                      },
                    }}
                  >
                    <Box width="100%" display="flex" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {edu.degree} in {edu.field}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {edu.institution}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {edu.startDate} - {edu.endDate || 'Present'}
                        </Typography>
                        {edu.description && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {edu.description}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <IconButton
                          onClick={() => openEditEducation(edu)}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteEducation(edu.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < education.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="600">
              Skills
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setSkillDialog(true)}
            >
              Add Skill
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {skills.length === 0 ? (
            <Alert severity="info">No skills added yet. Add your first skill!</Alert>
          ) : (
            <Grid container spacing={2}>
              {skills.map((skill) => (
                <Grid item key={skill.id}>
                  <Chip
                    label={`${skill.name} (${skill.level})`}
                    onDelete={() => handleDeleteSkill(skill.id)}
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.9rem', py: 2.5 }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="600">
              Experience
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setExperienceDialog(true)}
            >
              Add Experience
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {experience.length === 0 ? (
            <Alert severity="info">No experience records yet. Add your first one!</Alert>
          ) : (
            <List>
              {experience.map((exp, index) => (
                <React.Fragment key={exp.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      p: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                      },
                    }}
                  >
                    <Box width="100%" display="flex" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6" fontWeight="600">
                          {exp.position}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {exp.company}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        </Typography>
                        {exp.description && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {exp.description}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <IconButton
                          onClick={() => openEditExperience(exp)}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteExperience(exp.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < experience.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* Dialogs */}
      <Dialog
        open={educationDialog}
        onClose={() => {
          setEducationDialog(false);
          resetEducationForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingId ? 'Edit Education' : 'Add Education'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Institution"
                value={educationForm.institution}
                onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Degree"
                value={educationForm.degree}
                onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Field of Study"
                value={educationForm.field}
                onChange={(e) => setEducationForm({ ...educationForm, field: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="month"
                value={educationForm.startDate}
                onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="month"
                value={educationForm.endDate}
                onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={educationForm.description}
                onChange={(e) => setEducationForm({ ...educationForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEducationDialog(false);
            resetEducationForm();
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingId ? handleUpdateEducation : handleAddEducation}
          >
            {editingId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={skillDialog}
        onClose={() => {
          setSkillDialog(false);
          resetSkillForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Skill</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Skill Name"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Level"
                value={skillForm.level}
                onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={skillForm.category}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="Technical">Technical</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Languages">Languages</option>
                <option value="Other">Other</option>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSkillDialog(false);
            resetSkillForm();
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddSkill}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={experienceDialog}
        onClose={() => {
          setExperienceDialog(false);
          resetExperienceForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingId ? 'Edit Experience' : 'Add Experience'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={experienceForm.company}
                onChange={(e) => setExperienceForm({ ...experienceForm, company: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                value={experienceForm.position}
                onChange={(e) => setExperienceForm({ ...experienceForm, position: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="month"
                value={experienceForm.startDate}
                onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="month"
                value={experienceForm.endDate}
                onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                disabled={experienceForm.current}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setExperienceDialog(false);
            resetExperienceForm();
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingId ? handleUpdateExperience : handleAddExperience}
          >
            {editingId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;

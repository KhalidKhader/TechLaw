import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Button,
  TextField,
  Tabs,
  Tab,
  Divider,
  Chip,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  School,
  Work,
  Code,
  Person,
  PhotoCamera
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { database } from '../config/firebase';
import { ref, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProfilePage = () => {
  const { userData, currentUser, updateProfile } = useAuth();
  const { t } = useI18n();
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (userData) {
      setFormData(userData);
    }
  }, [userData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // In a real app, this might create a request for approval instead of direct update
      // For now, we'll update directly but show a toast about approval if needed
      await updateProfile(formData);
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile: ' + error.message);
    }
  };

  const handleCancel = () => {
    setFormData(userData);
    setEditMode(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 3, position: 'relative' }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
            src={formData.photoURL}
          >
            {formData.firstName?.charAt(0)}
          </Avatar>
          {editMode && (
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
          )}
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {formData.firstName} {formData.lastName}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            {formData.role?.toUpperCase()} • {formData.title || 'Law Student'}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Chip label={formData.status || 'Active'} color={formData.status === 'approved' ? 'success' : 'warning'} size="small" />
            <Chip label={formData.department || 'General'} variant="outlined" size="small" />
          </Box>
        </Box>

        <Box>
          {!editMode ? (
            <Button 
              variant="contained" 
              startIcon={<Edit />} 
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<Cancel />} 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<Save />} 
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Content Tabs */}
      <Paper sx={{ minHeight: 500 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Person />} label="Personal Info" iconPosition="start" />
          <Tab icon={<School />} label="Education" iconPosition="start" />
          <Tab icon={<Work />} label="Experience" iconPosition="start" />
          <Tab icon={<Code />} label="Skills" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleChange}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleChange}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={currentUser?.email || ''}
                disabled
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                disabled={!editMode}
                multiline
                rows={4}
                margin="normal"
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Education History</Typography>
          {(formData.profile?.education || []).map((edu, index) => (
            <Card variant="outlined" sx={{ mb: 2 }} key={index}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{edu.degree}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {edu.institution} • {edu.startYear} - {edu.endYear || 'Present'}
                    </Typography>
                    {edu.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>{edu.description}</Typography>
                    )}
                  </Box>
                  {editMode && (
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => {
                        const newEdu = [...(formData.profile?.education || [])];
                        newEdu.splice(index, 1);
                        setFormData(prev => ({
                          ...prev,
                          profile: { ...prev.profile, education: newEdu }
                        }));
                      }}
                    >
                      <Cancel />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          {editMode && (
            <Card variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Degree" name="edu_degree" size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Institution" name="edu_institution" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Start Year" name="edu_start" size="small" type="number" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="End Year" name="edu_end" size="small" type="number" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Description" name="edu_desc" size="small" multiline rows={2} />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    startIcon={<School />}
                    onClick={(e) => {
                      const form = e.target.closest('.MuiCard-root').querySelector('form') || e.target.closest('.MuiCard-root');
                      const degree = form.querySelector('[name="edu_degree"]').value;
                      const institution = form.querySelector('[name="edu_institution"]').value;
                      const startYear = form.querySelector('[name="edu_start"]').value;
                      const endYear = form.querySelector('[name="edu_end"]').value;
                      const description = form.querySelector('[name="edu_desc"]').value;
                      
                      if (degree && institution && startYear) {
                        const newEdu = {
                          degree,
                          institution,
                          startYear,
                          endYear: endYear || null,
                          description: description || ''
                        };
                        setFormData(prev => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            education: [...(prev.profile?.education || []), newEdu]
                          }
                        }));
                        // Clear inputs
                        form.querySelector('[name="edu_degree"]').value = '';
                        form.querySelector('[name="edu_institution"]').value = '';
                        form.querySelector('[name="edu_start"]').value = '';
                        form.querySelector('[name="edu_end"]').value = '';
                        form.querySelector('[name="edu_desc"]').value = '';
                      }
                    }}
                  >
                    Add Education
                  </Button>
                </Grid>
              </Grid>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Work Experience</Typography>
          {(formData.profile?.experience || []).map((exp, index) => (
            <Card variant="outlined" sx={{ mb: 2 }} key={index}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{exp.position}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {exp.company} • {exp.startYear} - {exp.endYear || 'Present'}
                    </Typography>
                    {exp.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>{exp.description}</Typography>
                    )}
                  </Box>
                  {editMode && (
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => {
                        const newExp = [...(formData.profile?.experience || [])];
                        newExp.splice(index, 1);
                        setFormData(prev => ({
                          ...prev,
                          profile: { ...prev.profile, experience: newExp }
                        }));
                      }}
                    >
                      <Cancel />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          {editMode && (
            <Card variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Position" name="exp_position" size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Company" name="exp_company" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="Start Year" name="exp_start" size="small" type="number" />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="End Year" name="exp_end" size="small" type="number" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Description" name="exp_desc" size="small" multiline rows={2} />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    startIcon={<Work />}
                    onClick={(e) => {
                      const form = e.target.closest('.MuiCard-root');
                      const position = form.querySelector('[name="exp_position"]').value;
                      const company = form.querySelector('[name="exp_company"]').value;
                      const startYear = form.querySelector('[name="exp_start"]').value;
                      const endYear = form.querySelector('[name="exp_end"]').value;
                      const description = form.querySelector('[name="exp_desc"]').value;
                      
                      if (position && company && startYear) {
                        const newExp = {
                          position,
                          company,
                          startYear,
                          endYear: endYear || null,
                          description: description || ''
                        };
                        setFormData(prev => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            experience: [...(prev.profile?.experience || []), newExp]
                          }
                        }));
                        // Clear inputs
                        form.querySelector('[name="exp_position"]').value = '';
                        form.querySelector('[name="exp_company"]').value = '';
                        form.querySelector('[name="exp_start"]').value = '';
                        form.querySelector('[name="exp_end"]').value = '';
                        form.querySelector('[name="exp_desc"]').value = '';
                      }
                    }}
                  >
                    Add Experience
                  </Button>
                </Grid>
              </Grid>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Skills</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {(formData.profile?.skills || []).map((skill, index) => (
              <Chip 
                key={index} 
                label={skill} 
                onDelete={editMode ? () => {
                  const newSkills = [...(formData.profile?.skills || [])];
                  newSkills.splice(index, 1);
                  setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile, skills: newSkills }
                  }));
                } : undefined} 
              />
            ))}
          </Box>
          {editMode && (
            <TextField 
              fullWidth 
              label="Add a skill (press enter)" 
              placeholder="e.g. Corporate Law"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  setFormData(prev => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      skills: [...(prev.profile?.skills || []), e.target.value.trim()]
                    }
                  }));
                  e.target.value = '';
                }
              }}
            />
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ProfilePage;

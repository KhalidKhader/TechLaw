import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link as MuiLink,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { validateEmail, validatePassword } from '../utils/helpers';
import { showError, showSuccess } from '../utils/toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('validation.required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('validation.required');
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = t('auth.passwordRequirements');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError(t('auth.fixErrors'));
      return;
    }

    setLoading(true);
    try {
      await register(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      );
      showSuccess(t('auth.signupSuccess'));
      navigate('/');
    } catch (error) {
      console.error('Signup error:', error);
      showError(error.message || t('auth.signupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 1,
              color: 'primary.main',
            }}
          >
            {t('auth.signup')}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              mb: 3,
            }}
          >
            {t('auth.pendingApprovalInfo')}
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            {t('auth.signupPendingWarning')}
          </Alert>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* First Name & Last Name */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label={t('common.firstName')}
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={!!errors.firstName}
                helperText={errors.firstName}
                disabled={loading}
                autoComplete="given-name"
              />
              <TextField
                fullWidth
                label={t('common.lastName')}
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={!!errors.lastName}
                helperText={errors.lastName}
                disabled={loading}
                autoComplete="family-name"
              />
            </Box>

            {/* Email */}
            <TextField
              fullWidth
              label={t('common.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
              margin="normal"
              autoComplete="email"
            />

            {/* Password */}
            <TextField
              fullWidth
              label={t('common.password')}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              error={!!errors.password}
              helperText={errors.password || t('auth.passwordHint')}
              disabled={loading}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password */}
            <TextField
              fullWidth
              label={t('auth.confirmPassword')}
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Submit Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : t('auth.signup')}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                {t('auth.haveAccount')}{' '}
                <MuiLink
                  component={RouterLink}
                  to="/login"
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {t('auth.loginHere')}
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignupPage;

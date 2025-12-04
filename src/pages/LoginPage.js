import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { validateEmail } from '../utils/helpers';
import { showError, showSuccess } from '../utils/toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = t('validation.required');
    } else if (!validateEmail(email)) {
      newErrors.email = t('validation.email');
    }

    if (!password) {
      newErrors.password = t('validation.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login(email, password);

      if (result.status === 'pending') {
        showSuccess(t('auth.pendingApproval'));
        navigate('/login-pending');
      } else if (result.status === 'suspended') {
        showError(t('auth.accountSuspended'));
      } else {
        showSuccess(t('auth.loginSuccess'));
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.message || t('errors.somethingWentWrong');
      setError(errorMessage);
      showError(errorMessage);
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
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={8} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
            {t('auth.loginTitle')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            {t('auth.dontHaveAccount')} {' '}
            <RouterLink to="/signup" style={{ textDecoration: 'none', fontWeight: 700 }}>
              {t('auth.signupHere')}
            </RouterLink>
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('common.email')}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={!!errors.email}
              helperText={errors.email}
              placeholder={t('auth.enterEmail')}
              disabled={loading}
              variant="outlined"
            />

            <TextField
              fullWidth
              label={t('common.password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={!!errors.password}
              helperText={errors.password}
              placeholder={t('auth.enterPassword')}
              disabled={loading}
              variant="outlined"
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

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.loginTitle')}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => navigate('/signup')}
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {t('auth.createAccount')}
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 1 }}>
              <RouterLink to="/forgot-password" style={{ textDecoration: 'none' }}>
                {t('auth.forgotPassword')}
              </RouterLink>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;

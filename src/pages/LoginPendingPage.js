import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../context/AuthContext';

const LoginPendingPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
            {t('auth.pendingApproval') || 'Account Pending Approval'}
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Your account is currently under review by the administration. 
            You will receive an email notification once your account has been approved.
          </Typography>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleLogout}
            sx={{ mt: 2 }}
          >
            {t('common.logout') || 'Logout'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPendingPage;

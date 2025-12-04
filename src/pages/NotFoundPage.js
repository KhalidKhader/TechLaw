import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <ErrorIcon sx={{ fontSize: 100, color: 'error.main', opacity: 0.7 }} />
        <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
          {t('errors.pageNotFound')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
          {t('errors.pageNotFoundDescription')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            {t('errors.goHome')}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFoundPage;

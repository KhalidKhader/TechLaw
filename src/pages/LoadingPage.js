import React from 'react';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import { useI18n } from '../hooks/useI18n';

const LoadingPage = () => {
  const { t } = useI18n();

  return (
    <Container>
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
        <CircularProgress size={60} />
        <Typography variant="h6">{t('common.loading')}</Typography>
      </Box>
    </Container>
  );
};

export default LoadingPage;

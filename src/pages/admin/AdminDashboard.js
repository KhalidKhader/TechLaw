import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as TaskIcon,
  Lightbulb as IdeaIcon,
  Event as EventIcon,
  Message as MessageIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CompleteIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useI18n } from '../../hooks/useI18n';

const AdminDashboard = () => {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    users: { total: 0, pending: 0, approved: 0, suspended: 0 },
    tasks: { total: 0, pending: 0, completed: 0, overdue: 0 },
    ideas: { total: 0, pending: 0, approved: 0, rejected: 0 },
    events: { total: 0, upcoming: 0 },
    messages: { total: 0, unread: 0 },
  });

  const [loading, setLoading] = useState(true);
  if (loading) {console.log('Loading...');}

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load Users
        const usersRef = ref(database, 'users');
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const users = Object.values(data);
            setStats(prev => ({
              ...prev,
              users: {
                total: users.length,
                pending: users.filter(u => u.status === 'pending').length,
                approved: users.filter(u => u.status === 'approved').length,
                suspended: users.filter(u => u.status === 'suspended').length,
              },
            }));
          }
        });

        // Load Tasks
        const tasksRef = ref(database, 'tasks');
        onValue(tasksRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const tasks = Object.values(data);
            const now = new Date();
            setStats(prev => ({
              ...prev,
              tasks: {
                total: tasks.length,
                pending: tasks.filter(t => t.status === 'pending').length,
                completed: tasks.filter(t => t.status === 'completed').length,
                overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'completed').length,
              },
            }));
          }
        });

        // Load Ideas
        const ideasRef = ref(database, 'ideas');
        onValue(ideasRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const ideas = Object.values(data);
            setStats(prev => ({
              ...prev,
              ideas: {
                total: ideas.length,
                pending: ideas.filter(i => i.status === 'pending').length,
                approved: ideas.filter(i => i.status === 'approved').length,
                rejected: ideas.filter(i => i.status === 'rejected').length,
              },
            }));
          }
        });

        // Load Events
        const eventsRef = ref(database, 'events');
        onValue(eventsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const events = Object.values(data);
            const now = new Date();
            setStats(prev => ({
              ...prev,
              events: {
                total: events.length,
                upcoming: events.filter(e => new Date(e.date) > now).length,
              },
            }));
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const StatCard = ({ title, value, subtitle, icon, color, progress }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight="700" gutterBottom>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {progress !== undefined && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 6, borderRadius: 3 }}
                  color={color}
                />
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.main`,
              width: 60,
              height: 60,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="700" gutterBottom>
          {t('admin.dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('admin.dashboard.subtitle')}
        </Typography>
      </Box>

      {/* Main Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.totalUsers')}
            value={stats.users.total}
            subtitle={t('admin.dashboard.pendingApproval', { count: stats.users.pending })}
            icon={<PeopleIcon fontSize="large" />}
            color="primary"
            progress={stats.users.total > 0 ? (stats.users.approved / stats.users.total) * 100 : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.totalTasks')}
            value={stats.tasks.total}
            subtitle={t('admin.dashboard.completedTasks', { count: stats.tasks.completed })}
            icon={<TaskIcon fontSize="large" />}
            color="success"
            progress={stats.tasks.total > 0 ? (stats.tasks.completed / stats.tasks.total) * 100 : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.ideasSubmitted')}
            value={stats.ideas.total}
            subtitle={t('admin.dashboard.awaitingReview', { count: stats.ideas.pending })}
            icon={<IdeaIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('admin.dashboard.events')}
            value={stats.events.total}
            subtitle={t('admin.dashboard.upcomingEvents', { count: stats.events.upcoming })}
            icon={<EventIcon fontSize="large" />}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* User Status Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {t('admin.dashboard.userStatusBreakdown')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {stats.users.approved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.approved')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {stats.users.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.pending')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="error.main">
                    {stats.users.suspended}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.suspended')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {stats.users.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.total')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Task Status */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {t('admin.dashboard.taskStatusOverview')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {stats.tasks.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.completed')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {stats.tasks.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.inProgress')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="error.main">
                    {stats.tasks.overdue}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.overdue')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {stats.tasks.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.dashboard.total')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Ideas Summary */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {t('admin.dashboard.ideasSummary')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <PendingIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('admin.dashboard.pendingReview')}
                  secondary={t('admin.dashboard.ideasAwaitingApproval', { count: stats.ideas.pending })}
                />
                <Chip label={stats.ideas.pending} color="warning" />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CompleteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('admin.dashboard.approvedIdeas')}
                  secondary={t('admin.dashboard.ideasInProgress', { count: stats.ideas.approved })}
                />
                <Chip label={stats.ideas.approved} color="success" />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <IdeaIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('admin.dashboard.rejected')}
                  secondary={t('admin.dashboard.ideasDeclined', { count: stats.ideas.rejected })}
                />
                <Chip label={stats.ideas.rejected} color="error" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {t('admin.dashboard.systemActivity')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <MessageIcon />
                  <Typography variant="body1" fontWeight="600">
                    {t('admin.dashboard.messages')}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="700">
                  {stats.messages.total}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'success.light',
                  color: 'success.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <EventIcon />
                  <Typography variant="body1" fontWeight="600">
                    {t('admin.dashboard.upcomingEvents', { count: '' }).trim()}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="700">
                  {stats.events.upcoming}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingIcon />
                  <Typography variant="body1" fontWeight="600">
                    {t('admin.dashboard.activeIdeas')}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="700">
                  {stats.ideas.approved}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;

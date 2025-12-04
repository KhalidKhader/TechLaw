import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  alpha,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assignment as TaskIcon,
  Lightbulb as IdeaIcon,
  Event as EventIcon,
  Message as MessageIcon,
  CheckCircle as CheckIcon,
  PendingActions as PendingIcon,
  Description as PostIcon,
} from '@mui/icons-material';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';

const AnalyticsPage = () => {
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: { total: 0, approved: 0, pending: 0 },
    tasks: { total: 0, completed: 0, pending: 0, inProgress: 0 },
    ideas: { total: 0, approved: 0, pending: 0, rejected: 0 },
    events: { total: 0, upcoming: 0, past: 0 },
    posts: { total: 0, recent: 0 },
    messages: { total: 0 },
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    if (!user?.uid) return;

    const loadAnalytics = async () => {
      try {
        // Load Users
        const usersRef = ref(database, 'users');
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const usersList = Object.values(data);
            setStats(prev => ({
              ...prev,
              users: {
                total: usersList.length,
                approved: usersList.filter(u => u.status === 'approved').length,
                pending: usersList.filter(u => u.status === 'pending').length,
              }
            }));
          }
        });

        // Load Tasks
        const tasksRef = ref(database, 'tasks');
        onValue(tasksRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const tasksList = Object.values(data);
            setStats(prev => ({
              ...prev,
              tasks: {
                total: tasksList.length,
                completed: tasksList.filter(t => t.status === 'completed').length,
                pending: tasksList.filter(t => t.status === 'pending').length,
                inProgress: tasksList.filter(t => t.status === 'in-progress').length,
              }
            }));
          }
        });

        // Load Ideas
        const ideasRef = ref(database, 'ideas');
        onValue(ideasRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const ideasList = Object.values(data);
            setStats(prev => ({
              ...prev,
              ideas: {
                total: ideasList.length,
                approved: ideasList.filter(i => i.status === 'approved').length,
                pending: ideasList.filter(i => i.status === 'pending').length,
                rejected: ideasList.filter(i => i.status === 'rejected').length,
              }
            }));
          }
        });

        // Load Events
        const eventsRef = ref(database, 'events');
        onValue(eventsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const eventsList = Object.values(data);
            const now = new Date();
            setStats(prev => ({
              ...prev,
              events: {
                total: eventsList.length,
                upcoming: eventsList.filter(e => new Date(e.date) >= now).length,
                past: eventsList.filter(e => new Date(e.date) < now).length,
              }
            }));
          }
        });

        // Load Posts
        const postsRef = ref(database, 'posts');
        onValue(postsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const postsList = Object.values(data);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            setStats(prev => ({
              ...prev,
              posts: {
                total: postsList.length,
                recent: postsList.filter(p => new Date(p.createdAt) >= sevenDaysAgo).length,
              }
            }));
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user?.uid]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, progress, chipLabel }) => (
    <Card
      sx={{
        height: '100%',
        background: isDarkMode
          ? `linear-gradient(135deg, ${alpha(color, 0.15)} 0%, ${alpha(color, 0.05)} 100%)`
          : `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.03)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.25)}`,
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight="700" color={color}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.15),
            }}
          >
            <Icon sx={{ fontSize: 32, color }} />
          </Box>
        </Box>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        
        {chipLabel && (
          <Chip 
            label={chipLabel} 
            size="small" 
            sx={{ 
              mt: 1,
              bgcolor: alpha(color, 0.1),
              color: color,
              fontWeight: 600,
            }} 
          />
        )}
        
        {progress !== undefined && (
          <Box mt={2}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(color, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: color,
                  borderRadius: 4,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress.toFixed(0)}% {t('dashboard.complete')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const taskCompletionRate = stats.tasks.total > 0 
    ? (stats.tasks.completed / stats.tasks.total) * 100 
    : 0;

  const ideaApprovalRate = stats.ideas.total > 0
    ? (stats.ideas.approved / stats.ideas.total) * 100
    : 0;

  const userApprovalRate = stats.users.total > 0
    ? (stats.users.approved / stats.users.total) * 100
    : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" fontWeight="700">
            {t('dashboard.analytics')}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.platformOverview')}
        </Typography>
      </Box>

      {/* Main Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalUsers')}
            value={stats.users.total}
            subtitle={`${stats.users.approved} ${t('common.approved')}, ${stats.users.pending} ${t('common.pending')}`}
            icon={PeopleIcon}
            color={theme.palette.primary.main}
            progress={userApprovalRate}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalTasks')}
            value={stats.tasks.total}
            subtitle={`${stats.tasks.completed} ${t('common.approved')}, ${stats.tasks.inProgress} ${t('task.inProgress')}`}
            icon={TaskIcon}
            color={theme.palette.success.main}
            progress={taskCompletionRate}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalIdeas')}
            value={stats.ideas.total}
            subtitle={`${stats.ideas.approved} ${t('common.approved')}, ${stats.ideas.pending} ${t('common.pending')}`}
            icon={IdeaIcon}
            color={theme.palette.warning.main}
            progress={ideaApprovalRate}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalEvents')}
            value={stats.events.total}
            subtitle={`${stats.events.upcoming} ${t('dashboard.upcomingEvents')}`}
            icon={EventIcon}
            color={theme.palette.info.main}
            chipLabel={`${stats.events.upcoming} ${t('calendar.upcoming')}`}
          />
        </Grid>
      </Grid>

      {/* Secondary Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <CheckIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h5" fontWeight="700">
                {t('dashboard.taskBreakdown')}
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {stats.tasks.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('task.completed')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {stats.tasks.inProgress}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('task.inProgress')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {stats.tasks.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('common.pending')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="info.main">
                    {taskCompletionRate.toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.completionRate')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <PostIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="700">
                {t('dashboard.contentOverview')}
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {stats.posts.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('post.totalPosts')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="success.main">
                    {stats.posts.recent}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.recentPosts')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="warning.main">
                    {stats.ideas.approved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.approvedIdeas')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Typography variant="h4" fontWeight="700" color="info.main">
                    {stats.events.upcoming}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('calendar.upcoming')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsPage;

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  CardActionArea,
  Avatar,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assignment,
  Lightbulb,
  Event,
  PersonOutline,
  AssignmentTurnedIn,
  CalendarMonth,
  Forum,
  Business,
  DynamicFeed,
  Description,
  Settings,
  SupportAgent,
  DashboardCustomize,
  PendingActions,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, onClick }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${theme.palette[color]?.main || theme.palette.primary.main} 0%, ${theme.palette[color]?.dark || theme.palette.primary.dark} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <Icon fontSize="large" />
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2">
              {trend}
            </Typography>
          </Box>
        )}
      </CardContent>
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 0,
          right: 0,
          opacity: 0.1,
          fontSize: '120px',
        }}
      >
        <Icon sx={{ fontSize: 'inherit' }} />
      </Box>
    </Card>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => {
  const theme = useTheme();
  const palette = theme.palette[color] || theme.palette.primary;
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        border: `2px solid ${palette.main}`,
        transition: 'all 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: palette.dark,
        },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: alpha(palette.main, 0.1),
              color: palette.main,
              width: 64,
              height: 64,
            }}
          >
            <Icon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};

const DashboardPageNew = () => {
  const { user, userData, userRole } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  const [stats, setStats] = useState({
    myTasks: 0,
    completedTasks: 0,
    myIdeas: 0,
    upcomingEvents: 0,
    pendingRequests: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    if (!user) return;

    // Load real-time stats
    const tasksRef = ref(database, 'tasks');
    const ideasRef = ref(database, 'ideas');
    const eventsRef = ref(database, 'events');

    const unsubTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksArray = Object.values(data);
        const myTasks = tasksArray.filter(t => t.assignedTo === user.uid || t.createdBy === user.uid);
        const completed = myTasks.filter(t => t.status === 'completed');
        setStats(prev => ({ 
          ...prev, 
          myTasks: myTasks.length,
          completedTasks: completed.length,
        }));
      }
    });

    const unsubIdeas = onValue(ideasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ideasArray = Object.values(data);
        const myIdeas = ideasArray.filter(i => i.submittedBy === user.uid);
        setStats(prev => ({ ...prev, myIdeas: myIdeas.length }));
      }
    });

    const unsubEvents = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsArray = Object.values(data);
        const upcoming = eventsArray.filter(e => new Date(e.date) > new Date());
        setStats(prev => ({ ...prev, upcomingEvents: upcoming.length }));
      }
    });

    return () => {
      unsubTasks();
      unsubIdeas();
      unsubEvents();
    };
  }, [user]);

  const quickActions = [
    {
      title: t('dashboard.myProfile') || t('user.myProfile'),
      description: t('dashboard.updateInfo'),
      icon: PersonOutline,
      color: 'primary',
      route: '/profile',
    },
    {
      title: t('dashboard.myTasks') || t('common.tasks'),
      description: t('dashboard.manageAssignments'),
      icon: AssignmentTurnedIn,
      color: 'success',
      route: '/tasks',
    },
    {
      title: t('dashboard.myIdeas') || t('common.ideas'),
      description: t('dashboard.shareIdeas'),
      icon: Lightbulb,
      color: 'warning',
      route: '/ideas',
    },
    {
      title: t('dashboard.calendar') || t('common.calendar'),
      description: t('dashboard.eventsMeetings'),
      icon: CalendarMonth,
      color: 'info',
      route: '/calendar',
    },
    {
      title: t('dashboard.messages') || t('common.messages'),
      description: t('dashboard.chatTeam'),
      icon: Forum,
      color: 'secondary',
      route: '/messages',
    },
    {
      title: t('dashboard.organizations') || t('common.organizations'),
      description: t('dashboard.partnerInstitutions'),
      icon: Business,
      color: 'primary',
      route: '/organizations',
    },
    {
      title: t('dashboard.newsPosts') || t('common.newsPosts'),
      description: t('dashboard.latestAnnouncements'),
      icon: DynamicFeed,
      color: 'info',
      route: '/posts',
    },
    {
      title: t('dashboard.forms') || t('common.forms'),
      description: t('dashboard.createFillForms'),
      icon: Description,
      color: 'success',
      route: '/forms',
    },
    {
      title: t('dashboard.requests') || t('common.requests'),
      description: t('dashboard.trackRequests'),
      icon: SupportAgent,
      color: 'warning',
      route: '/requests',
    },
    {
      title: t('dashboard.settings') || t('common.settings'),
      description: t('dashboard.customizePreferences'),
      icon: Settings,
      color: 'secondary',
      route: '/settings',
    },
  ];

  const adminActions = [
    {
      title: t('dashboard.userManagement') || t('common.userManagement'),
      description: t('dashboard.approveManageAccounts'),
      icon: People,
      color: 'primary',
      route: '/admin/users',
    },
    {
      title: t('dashboard.adminDashboard') || t('common.adminAnalyticsDashboard'),
      description: t('dashboard.analyticsInsights'),
      icon: DashboardCustomize,
      color: 'error',
      route: '/admin/dashboard',
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Welcome Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
            {t('dashboard.welcomeBack', { name: userData?.firstName || 'User' })} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.welcomeMessage')}
          </Typography>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.myTasks')} 
              value={stats.myTasks} 
              icon={Assignment} 
              color="primary"
              subtitle={`${stats.completedTasks} ${t('dashboard.completed')}`}
              onClick={() => navigate('/tasks')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.myIdeas')} 
              value={stats.myIdeas} 
              icon={Lightbulb} 
              color="warning"
              onClick={() => navigate('/ideas')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.upcomingEvents')} 
              value={stats.upcomingEvents} 
              icon={Event} 
              color="info"
              onClick={() => navigate('/calendar')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.pendingItems')} 
              value={stats.pendingRequests} 
              icon={PendingActions} 
              color="success"
              onClick={() => navigate('/requests')}
            />
          </Grid>
        </Grid>

        {/* All Features */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
            {t('dashboard.allFeatures')}
          </Typography>
          <Grid container spacing={2}>
            {quickActions.map((action) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={action.title}>
                <QuickActionCard
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  color={action.color}
                  onClick={() => navigate(action.route)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
              {t('dashboard.adminTools')}
            </Typography>
            <Grid container spacing={3}>
              {adminActions.map((action) => (
                <Grid item xs={12} sm={6} md={3} key={action.title}>
                  <QuickActionCard
                    title={action.title}
                    description={action.description}
                    icon={action.icon}
                    color={action.color}
                    onClick={() => navigate(action.route)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Progress Overview */}
        {stats.myTasks > 0 && (
          <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                {t('dashboard.taskProgress')}
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.completionRate')}
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    {stats.myTasks > 0 ? Math.round((stats.completedTasks / stats.myTasks) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.myTasks > 0 ? (stats.completedTasks / stats.myTasks) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Paper>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default DashboardPageNew;

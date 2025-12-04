import React from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Button,
  CardActionArea,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assignment,
  Lightbulb,
  Event,
  ArrowForward,
  Notifications,
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
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon, color, trend }) => {
  const theme = useMuiTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TrendingUp fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
            <Typography variant="body2" color="success.main">
              {trend}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
              vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage = () => {
  const { userRole, userData } = useAuth();
  const { t } = useI18n();
  const theme = useMuiTheme();
  const navigate = useNavigate();

  // Mock data - replace with Firebase real-time listeners
  const stats = {
    users: 120,
    tasks: 45,
    ideas: 12,
    events: 5
  };

  const recentActivities = [
    { id: 1, user: 'Sarah Connor', action: 'submitted a new idea', time: '2 hours ago', type: 'idea' },
    { id: 2, user: 'John Doe', action: 'completed task "Legal Review"', time: '4 hours ago', type: 'task' },
    { id: 3, user: 'Admin', action: 'approved 3 new users', time: '5 hours ago', type: 'admin' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Weekly Team Meeting', date: 'Today, 2:00 PM', type: 'meeting' },
    { id: 2, title: 'Project Deadline: Alpha', date: 'Tomorrow, 5:00 PM', type: 'deadline' },
  ];

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  const baseLinks = [
    {
      key: 'profile',
      title: 'Profile',
      description: 'Keep your personal and professional details current.',
      icon: <PersonOutline fontSize="large" />,
      route: '/profile',
      color: 'primary',
    },
    {
      key: 'tasks',
      title: 'Tasks',
      description: 'Review assignments, update progress, and collaborate.',
      icon: <AssignmentTurnedIn fontSize="large" />,
      route: '/tasks',
      color: 'success',
    },
    {
      key: 'ideas',
      title: 'Ideas',
      description: 'Submit and track innovation proposals.',
      icon: <Lightbulb fontSize="large" />,
      route: '/ideas',
      color: 'warning',
    },
    {
      key: 'calendar',
      title: 'Calendar',
      description: 'Check upcoming events and key dates.',
      icon: <CalendarMonth fontSize="large" />,
      route: '/calendar',
      color: 'info',
    },
    {
      key: 'messages',
      title: 'Messages',
      description: 'Securely communicate with colleagues and admins.',
      icon: <Forum fontSize="large" />,
      route: '/messages',
      color: 'secondary',
    },
    {
      key: 'organizations',
      title: 'Organizations',
      description: 'Manage partner institutions and collaborations.',
      icon: <Business fontSize="large" />,
      route: '/organizations',
      color: 'primary',
    },
    {
      key: 'posts',
      title: 'News & Posts',
      description: 'Share announcements with the community.',
      icon: <DynamicFeed fontSize="large" />,
      route: '/posts',
      color: 'info',
    },
    {
      key: 'forms',
      title: 'Forms',
      description: 'Create and manage digital forms and surveys.',
      icon: <Description fontSize="large" />,
      route: '/forms',
      color: 'success',
    },
    {
      key: 'requests',
      title: 'Requests',
      description: 'Track profile change requests and approvals.',
      icon: <SupportAgent fontSize="large" />,
      route: '/requests',
      color: 'warning',
    },
    {
      key: 'settings',
      title: 'Settings',
      description: 'Customize language, notifications, and appearance.',
      icon: <Settings fontSize="large" />,
      route: '/settings',
      color: 'secondary',
    },
  ];

  const adminLinks = [
    {
      key: 'admin-dashboard',
      title: 'Admin Dashboard',
      description: 'Review analytics and platform health.',
      icon: <DashboardCustomize fontSize="large" />,
      route: '/admin/dashboard',
      color: 'error',
    },
    {
      key: 'user-management',
      title: 'User Management',
      description: 'Approve users, assign roles, and enforce policies.',
      icon: <People fontSize="large" />,
      route: '/admin/users',
      color: 'primary',
    },
  ];

  const navigationLinks = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {t('common.dashboard')}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome back, {userData?.firstName || 'User'}! Here's what's happening today.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={isAdmin ? "Total Users" : "My Tasks"} 
            value={isAdmin ? stats.users : "8"} 
            icon={isAdmin ? <People /> : <Assignment />} 
            color="primary" 
            trend="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={isAdmin ? "Pending Requests" : "My Ideas"} 
            value={isAdmin ? "15" : "3"} 
            icon={isAdmin ? <Notifications /> : <Lightbulb />} 
            color="warning" 
            trend="+5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Projects" 
            value="7" 
            icon={<Assignment />} 
            color="success" 
            trend="+2%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Upcoming Events" 
            value={stats.events} 
            icon={<Event />} 
            color="info" 
          />
        </Grid>
      </Grid>

      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Quick Navigation
          </Typography>
          {isAdmin && (
            <Button
              size="small"
              startIcon={<DashboardCustomize />}
              onClick={() => navigate('/admin/dashboard')}
            >
              Admin Overview
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="textSecondary">
          Jump directly to the areas you use most.
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {navigationLinks.map((link) => {
            const palette = theme.palette[link.color] || theme.palette.primary;
            return (
              <Grid item xs={12} sm={6} md={4} key={link.key}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: theme.palette.divider }}>
                  <CardActionArea onClick={() => navigate(link.route)} sx={{ height: '100%' }}>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: palette.light || palette.main,
                          color: palette.contrastText || theme.palette.common.white,
                          width: 48,
                          height: 48,
                        }}
                      >
                        {link.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {link.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {link.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Recent Activity / News */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="Recent Activity" 
              action={
                <Button endIcon={<ArrowForward />} size="small">
                  View All
                </Button>
              }
            />
            <Divider />
            <List>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                        {activity.user.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                          {activity.user}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="body2" color="text.primary">
                            {activity.action}
                          </Typography>
                          {" — " + activity.time}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </Grid>

        {/* Side Panel: Calendar/Events */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Upcoming Events" />
            <Divider />
            <List>
              {upcomingEvents.map((event) => (
                <ListItem key={event.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.primary.light, color: 'white' }}>
                      <Event />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={event.title} 
                    secondary={event.date} 
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ p: 2 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => navigate('/calendar')}
              >
                Go to Calendar
              </Button>
            </Box>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="contained" startIcon={<Lightbulb />} onClick={() => navigate('/ideas')}>
                Submit New Idea
              </Button>
              <Button variant="outlined" startIcon={<Assignment />} onClick={() => navigate('/tasks')}>
                View My Tasks
              </Button>
              {isAdmin && (
                <Button variant="outlined" color="warning" startIcon={<People />} onClick={() => navigate('/admin/users')}>
                  Manage Users
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;

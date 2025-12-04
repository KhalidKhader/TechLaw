import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Task as TaskIcon,
  Lightbulb as IdeaIcon,
  Event as EventIcon,
  Mail as MessageIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Language as LanguageIcon,
  Close as CloseIcon,
  Assignment as FormIcon,
  Business as OrganizationIcon,
  Newspaper as PostIcon,
  TrendingUp as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useI18n } from '../hooks/useI18n';
import NotificationBell from './NotificationBellFull';
import UserAvatar from './common/UserAvatar';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, userData, userRole } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { language, toggleLanguage, dir } = useLanguage();
  const { t } = useI18n();

  const [openDrawer, setOpenDrawer] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const profileMenuOpen = Boolean(anchorEl);
  
  const isAuthenticated = !!user;

  const handleDrawerToggle = () => {
    setOpenDrawer(!openDrawer);
  };

  const handleProfileMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setOpenDrawer(false);
  };

  // Menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      { label: t('common.dashboard'), icon: DashboardIcon, path: '/dashboard' },
      { label: t('common.analytics'), icon: AnalyticsIcon, path: '/analytics' },
      { label: t('common.profile'), icon: PeopleIcon, path: '/profile' },
      { label: t('common.messages'), icon: MessageIcon, path: '/messages' },
      { label: t('common.calendar'), icon: EventIcon, path: '/calendar' },
    ];

    if (userRole === 'user' || userRole === 'admin' || userRole === 'superAdmin') {
      baseItems.push(
        { label: t('common.tasks'), icon: TaskIcon, path: '/tasks' },
        { label: t('common.ideas'), icon: IdeaIcon, path: '/ideas' },
        { label: t('common.organizations'), icon: OrganizationIcon, path: '/organizations' },
        { label: t('common.newsPosts'), icon: PostIcon, path: '/posts' },
        { label: t('common.requests'), icon: FormIcon, path: '/requests' },
        { label: t('common.forms'), icon: FormIcon, path: '/forms' }
      );
    }

    if (userRole === 'admin' || userRole === 'superAdmin') {
      baseItems.push(
        { label: t('admin.adminPanel'), icon: DashboardIcon, path: '/admin/dashboard' },
        { label: t('common.userManagement'), icon: PeopleIcon, path: '/admin/users' }
      );
    }

    if (userRole === 'superAdmin') {
      baseItems.push(
        { label: t('admin.superAdminPanel'), icon: DashboardIcon, path: '/super-admin' }
      );
    }

    return baseItems;
  };

  const drawerContent = (
    <Box sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('common.appName')}
        </Typography>
        <IconButton onClick={handleDrawerToggle} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <List sx={{ flex: 1 }}>
        {getMenuItems().map((item, index) => (
          <ListItem
            button
            key={index}
            onClick={() => handleNavigate(item.path)}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>
              <item.icon />
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'space-around' }}>
        <Tooltip title={mode === 'light' ? t('settings.darkMode') : t('settings.lightMode')}>
          <IconButton onClick={toggleTheme} size="small">
            {mode === 'light' ? <DarkIcon /> : <LightIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={language === 'en' ? t('settings.arabic') : t('settings.english')}>
          <IconButton onClick={toggleLanguage} size="small">
            <LanguageIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.settings')}>
          <IconButton onClick={() => handleNavigate('/settings')} size="small">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          {isAuthenticated && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              cursor: 'pointer',
              display: { xs: 'none', sm: 'block' },
            }}
            onClick={() => navigate('/dashboard')}
          >
            {t('common.appName')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isAuthenticated && <NotificationBell />}

            <Tooltip title={mode === 'light' ? t('settings.darkMode') : t('settings.lightMode')}>
              <IconButton color="inherit" onClick={toggleTheme}>
                {mode === 'light' ? <DarkIcon /> : <LightIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={language === 'en' ? t('settings.arabic') : t('settings.english')}>
              <IconButton color="inherit" onClick={toggleLanguage}>
                <LanguageIcon />
              </IconButton>
            </Tooltip>

            {!isAuthenticated ? (
              <>
                <Tooltip title={t('common.login')}>
                  <IconButton color="inherit" onClick={() => navigate('/login')}>
                    <Typography variant="button" sx={{ fontSize: '0.875rem' }}>
                      {t('common.login')}
                    </Typography>
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.signup')}>
                  <IconButton color="inherit" onClick={() => navigate('/signup')}>
                    <Typography variant="button" sx={{ fontSize: '0.875rem' }}>
                      {t('common.signup')}
                    </Typography>
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title={userData?.firstName || t('common.profile')}>
                <IconButton
                  onClick={handleProfileMenuClick}
                  sx={{ p: 0, ml: 2 }}
                >
                  <UserAvatar 
                    user={userData} 
                    size={40} 
                    sx={{ 
                      border: '2px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} 
                  />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {isAuthenticated && (
            <Menu
              anchorEl={anchorEl}
              open={profileMenuOpen}
              onClose={handleProfileMenuClose}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
              <MenuItem onClick={() => {
                navigate('/profile');
                handleProfileMenuClose();
              }}>
                {t('common.profile')}
              </MenuItem>
              <MenuItem onClick={() => {
                navigate('/settings');
                handleProfileMenuClose();
              }}>
                {t('common.settings')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                {t('common.logout')}
              </MenuItem>
            </Menu>
          )}
        </Toolbar>
      </AppBar>

      {isAuthenticated && (
        <Drawer
          anchor={dir === 'rtl' ? 'right' : 'left'}
          open={openDrawer}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ mt: 8 }} />
    </>
  );
};

export default Navbar;

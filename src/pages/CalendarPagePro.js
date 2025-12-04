import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Divider,
  useTheme,
  alpha,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  ChevronLeft,
  ChevronRight,
  AccessTime,
  LocationOn,
  VideoCall,
  Description,
  Person,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getUserFullName } from '../utils/helpers';

const CalendarPagePro = () => {
  const { user, userRole, userData } = useAuth();
  const { t, language } = useI18n();
  const theme = useTheme();
  const isRTL = language === 'ar';
  
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [eventDialog, setEventDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [confirmDialog, setConfirmDialog] = useState({ open: false, eventId: null });
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    type: 'personal',
    status: 'approved',
    meetingLink: '',
    meetingDetails: '',
    duration: '60',
    attendees: [],
    category: 'meeting',
    reminder: '30',
    priority: 'medium',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  const getCreatorName = (event) => {
    if (event.creatorName) {
      return event.creatorName;
    }
    
    const creatorData = users[event.createdBy];
    if (creatorData) {
      return getUserFullName(creatorData);
    }
    
    return t('common.unknown');
  };

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    const usersRef = ref(database, 'users');
    
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList = Object.entries(data).map(([id, event]) => ({ id, ...event }));
        setEvents(eventsList);
      } else {
        setEvents([]);
      }
      setLoading(false);
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(data);
      }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeUsers();
    };
  }, []);

  const handleCreateEvent = async () => {
    if (!user?.uid) {
      showError(t('errors.sessionExpired'));
      return;
    }

    if (!eventForm.title || !eventForm.date) {
      showError(t('errors.fillRequired'));
      return;
    }

    try {
      const eventId = push(ref(database, 'events')).key;
      
      // Get creator name
      const creatorName = getUserFullName(userData || user);
      
      const newEvent = {
        id: eventId,
        ...eventForm,
        createdBy: user.uid,
        creatorName,
        status: isAdmin ? 'approved' : 'pending',
        createdAt: new Date().toISOString(),
      };

      await set(ref(database, `events/${eventId}`), newEvent);

      // Send notification to admins if event needs approval
      if (!isAdmin) {
        // Get all admin users and notify them
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
          const users = usersSnapshot.val();
          const adminUsers = Object.entries(users)
            .filter(([uid, userData]) => 
              userData.role === 'admin' || userData.role === 'superAdmin'
            );
          
          for (const [adminUid] of adminUsers) {
            await sendNotification(
              adminUid,
              NotificationTemplates.eventPendingApproval(eventForm.title, creatorName)
            );
          }
        }
      }

      showSuccess(isAdmin ? t('calendar.eventCreated') : t('calendar.eventSubmitted'));
      setEventDialog(false);
      resetForm();
    } catch (error) {
      showError(t('errors.createEventFailed') + error.message);
    }
  };

  const handleApproveEvent = async (eventId) => {
    if (!user?.uid) return;

    try {
      const eventToApprove = events.find(e => e.id === eventId);
      
      await update(ref(database, `events/${eventId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });

      // Send notification to event creator
      if (eventToApprove?.createdBy) {
        await sendNotification(
          eventToApprove.createdBy,
          NotificationTemplates.eventApproved(eventToApprove.title)
        );
      }

      showSuccess(t('calendar.eventApproved'));
      setDetailsDialog(false);
    } catch (error) {
      showError(t('errors.approveEventFailed') + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const eventToDelete = events.find(e => e.id === eventId);
      
      await remove(ref(database, `events/${eventId}`));

      // Send notification to event creator if event was rejected (status was pending)
      if (eventToDelete?.createdBy && eventToDelete?.status === 'pending') {
        await sendNotification(
          eventToDelete.createdBy,
          NotificationTemplates.eventRejected(eventToDelete.title)
        );
      }

      showSuccess(t('calendar.eventDeleted'));
      setDetailsDialog(false);
    } catch (error) {
      showError(t('errors.deleteEventFailed') + error.message);
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      endTime: '',
      location: '',
      type: 'personal',
      status: 'approved',
      meetingLink: '',
      meetingDetails: '',
      duration: '60',
      attendees: [],
      category: 'meeting',
      reminder: '30',
      priority: 'medium',
    });
  };

  const filterEvents = () => {
    if (!user?.uid) return events;
    
    let filtered = events;

    if (activeTab === 0) {
      filtered = filtered.filter(e => 
        e.createdBy === user.uid || 
        (e.type === 'global' && e.status === 'approved')
      );
    } else if (activeTab === 1) {
      filtered = filtered.filter(e => e.type === 'global' && e.status === 'approved');
    } else if (activeTab === 2) {
      filtered = filtered.filter(e => e.status === 'pending');
    }

    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filterEvents().filter(e => e.date === dateStr);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setDetailsDialog(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      meeting: { bg: '#3B82F6', light: '#DBEAFE' },
      workshop: { bg: '#8B5CF6', light: '#EDE9FE' },
      deadline: { bg: '#EF4444', light: '#FEE2E2' },
      conference: { bg: '#06B6D4', light: '#CFFAFE' },
      training: { bg: '#10B981', light: '#D1FAE5' },
    };
    return colors[category] || colors.meeting;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981',
    };
    return colors[priority] || colors.medium;
  };

  const filteredEvents = filterEvents();
  const daysInMonth = getDaysInMonth(currentMonth);
  const weekDays = isRTL 
    ? [t('calendar.sat'), t('calendar.fri'), t('calendar.thu'), t('calendar.wed'), t('calendar.tue'), t('calendar.mon'), t('calendar.sun')]
    : [t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={50} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Professional Header */}
      <Box 
        sx={{ 
          mb: 4, 
          p: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="800" gutterBottom sx={{ color: theme.palette.primary.main }}>
              {t('calendar.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              {t('calendar.subtitle')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEventDialog(true)}
            size="large"
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {t('calendar.createEvent')}
          </Button>
        </Box>
      </Box>

      {/* Professional Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              py: 2.5,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 700,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label={t('calendar.myCalendar')} />
          <Tab label={t('calendar.globalCalendar')} />
          {isAdmin && (
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {t('calendar.pendingApproval')}
                  {events.filter(e => e.status === 'pending').length > 0 && (
                    <Chip 
                      label={events.filter(e => e.status === 'pending').length} 
                      size="small" 
                      color="error"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              }
            />
          )}
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Enhanced Calendar Grid */}
        <Grid item xs={12} lg={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: theme.palette.background.paper,
            }}
          >
            {/* Month Navigation - Professional */}
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              mb={4}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <IconButton 
                onClick={previousMonth}
                sx={{
                  bgcolor: theme.palette.background.paper,
                  boxShadow: 1,
                  '&:hover': { 
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronLeft />
              </IconButton>
              
              <Typography variant="h5" fontWeight="700" sx={{ color: theme.palette.primary.main }}>
                {currentMonth.toLocaleDateString(isRTL ? 'ar-PS' : 'en-US', { month: 'long', year: 'numeric' })}
              </Typography>
              
              <IconButton 
                onClick={nextMonth}
                sx={{
                  bgcolor: theme.palette.background.paper,
                  boxShadow: 1,
                  '&:hover': { 
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Calendar Grid - Professional Layout */}
            <Box>
              {/* Weekday Headers */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {weekDays.map((day) => (
                  <Grid item xs key={day}>
                    <Box
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="700"
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {day}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Days - Professional Grid */}
              <Grid container spacing={1}>
                {daysInMonth.map((date, index) => {
                  const dayEvents = date ? getEventsForDate(date) : [];
                  const isCurrentDay = isToday(date);

                  return (
                    <Grid item xs={12/7} key={index}>
                      <Paper
                        elevation={isCurrentDay ? 4 : 0}
                        sx={{
                          minHeight: 110,
                          p: 1.5,
                          borderRadius: 2,
                          border: 2,
                          borderColor: isCurrentDay 
                            ? theme.palette.primary.main 
                            : alpha(theme.palette.divider, 0.2),
                          bgcolor: date 
                            ? isCurrentDay 
                              ? alpha(theme.palette.primary.main, 0.08)
                              : theme.palette.background.paper
                            : 'transparent',
                          cursor: date ? 'default' : 'default',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            bgcolor: date ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                            transform: date && dayEvents.length > 0 ? 'translateY(-2px)' : 'none',
                            boxShadow: date && dayEvents.length > 0 ? 3 : 0,
                          },
                        }}
                      >
                        {date && (
                          <>
                            {/* Day Number */}
                            <Box 
                              sx={{ 
                                mb: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={isCurrentDay ? 'bold' : 600}
                                sx={{
                                  color: isCurrentDay 
                                    ? theme.palette.primary.main 
                                    : theme.palette.text.primary,
                                  fontSize: isCurrentDay ? '1.1rem' : '0.95rem',
                                }}
                              >
                                {date.getDate()}
                              </Typography>
                              
                              {dayEvents.length > 0 && (
                                <Chip 
                                  label={dayEvents.length} 
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                    color: theme.palette.primary.main,
                                  }}
                                />
                              )}
                            </Box>

                            {/* Event List */}
                            <Stack spacing={0.5}>
                              {dayEvents.slice(0, 2).map((event, i) => {
                                const categoryColor = getCategoryColor(event.category);
                                return (
                                  <Tooltip 
                                    key={i} 
                                    title={`${event.title} - ${event.time || 'All day'}`}
                                    placement="top"
                                    arrow
                                  >
                                    <Box
                                      onClick={() => handleEventClick(event)}
                                      sx={{
                                        p: 0.75,
                                        borderRadius: 1,
                                        bgcolor: alpha(categoryColor.bg, 0.1),
                                        borderLeft: 3,
                                        borderColor: categoryColor.bg,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          bgcolor: alpha(categoryColor.bg, 0.2),
                                          transform: 'translateX(2px)',
                                          boxShadow: `0 2px 8px ${alpha(categoryColor.bg, 0.3)}`,
                                        },
                                      }}
                                    >
                                      <Typography 
                                        variant="caption"
                                        sx={{
                                          fontWeight: 600,
                                          fontSize: '0.7rem',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          display: 'block',
                                          color: categoryColor.bg,
                                        }}
                                      >
                                        {event.time && (
                                          <AccessTime sx={{ fontSize: 10, mr: 0.5, verticalAlign: 'middle' }} />
                                        )}
                                        {event.title}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                              
                              {dayEvents.length > 2 && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: theme.palette.primary.main,
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    textAlign: 'center',
                                    display: 'block',
                                    mt: 0.5,
                                  }}
                                >
                                  +{dayEvents.length - 2} {t('calendar.more')}
                                </Typography>
                              )}
                            </Stack>
                          </>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Professional Upcoming Events List */}
        <Grid item xs={12} lg={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              maxHeight: 700, 
              overflow: 'auto',
              background: theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 3, color: theme.palette.primary.main }}>
              {activeTab === 0 && t('calendar.upcomingEvents')}
              {activeTab === 1 && t('calendar.globalEvents')}
              {activeTab === 2 && t('calendar.pendingApproval')}
            </Typography>

            {filteredEvents.length === 0 ? (
              <Alert 
                severity="info"
                sx={{ 
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                }}
              >
                {t('calendar.noEvents')}
              </Alert>
            ) : (
              <Stack spacing={2}>
                {filteredEvents.map((event) => {
                  const categoryColor = getCategoryColor(event.category);
                  return (
                    <Card
                      key={event.id}
                      elevation={0}
                      onClick={() => handleEventClick(event)}
                      sx={{
                        borderRadius: 2,
                        border: `2px solid ${alpha(categoryColor.bg, 0.3)}`,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'visible',
                        '&:hover': {
                          boxShadow: `0 4px 20px ${alpha(categoryColor.bg, 0.3)}`,
                          transform: 'translateY(-4px)',
                          borderColor: categoryColor.bg,
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 5,
                          bgcolor: categoryColor.bg,
                          borderRadius: '2px 0 0 2px',
                        },
                      }}
                    >
                      <CardContent sx={{ pl: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
                          <Typography variant="h6" fontWeight="700" sx={{ flex: 1, pr: 1 }}>
                            {event.title}
                          </Typography>
                          <Chip
                            label={t(`calendar.${event.category}`)}
                            size="small"
                            sx={{
                              bgcolor: alpha(categoryColor.bg, 0.15),
                              color: categoryColor.bg,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>

                        {event.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {event.description}
                          </Typography>
                        )}

                        <Stack spacing={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <EventIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={600}>
                              {new Date(event.date).toLocaleDateString(isRTL ? 'ar-PS' : 'en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                          </Box>
                          
                          {event.time && (
                            <Box display="flex" alignItems="center" gap={1}>
                              <AccessTime fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {event.time}
                                {event.endTime && ` - ${event.endTime}`}
                              </Typography>
                            </Box>
                          )}

                          {event.location && (
                            <Box display="flex" alignItems="center" gap={1}>
                              <LocationOn fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {event.location}
                              </Typography>
                            </Box>
                          )}
                        </Stack>

                        {isAdmin && event.status === 'pending' && (
                          <Box display="flex" gap={1} mt={2}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveEvent(event.id);
                              }}
                              sx={{ 
                                flex: 1,
                                textTransform: 'none',
                                fontWeight: 600,
                              }}
                            >
                              {t('common.approve')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<ClearIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setConfirmDialog({ open: true, eventId: event.id });
                              }}
                              sx={{ 
                                flex: 1,
                                textTransform: 'none',
                                fontWeight: 600,
                              }}
                            >
                              {t('common.reject')}
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Event Dialog */}
      <Dialog 
        open={eventDialog} 
        onClose={() => {
          setEventDialog(false);
          resetForm();
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 1,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          }}
        >
          <Typography variant="h5" fontWeight="700">
            {t('calendar.createEvent')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.eventTitle') + ' *'}
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.description')}
                multiline
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('calendar.category')}
                value={eventForm.category}
                onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
              >
                <MenuItem value="meeting">{t('calendar.meeting')}</MenuItem>
                <MenuItem value="workshop">{t('calendar.workshop')}</MenuItem>
                <MenuItem value="deadline">{t('calendar.deadline')}</MenuItem>
                <MenuItem value="conference">{t('calendar.conference')}</MenuItem>
                <MenuItem value="training">{t('calendar.training')}</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('calendar.priority')}
                value={eventForm.priority}
                onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
              >
                <MenuItem value="high">{t('calendar.high')}</MenuItem>
                <MenuItem value="medium">{t('calendar.medium')}</MenuItem>
                <MenuItem value="low">{t('calendar.low')}</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('calendar.eventType')}
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
              >
                <MenuItem value="personal">{t('calendar.personal')}</MenuItem>
                <MenuItem value="global">{t('calendar.global')}</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('calendar.date') + ' *'}
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('calendar.startTime')}
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('calendar.endTime')}
                type="time"
                value={eventForm.endTime}
                onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('calendar.duration')}
                type="number"
                value={eventForm.duration}
                onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })}
                InputProps={{
                  endAdornment: <Typography variant="caption">{t('calendar.minutes')}</Typography>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('calendar.reminder')}
                value={eventForm.reminder}
                onChange={(e) => setEventForm({ ...eventForm, reminder: e.target.value })}
              >
                <MenuItem value="0">{t('calendar.noReminder')}</MenuItem>
                <MenuItem value="15">15 {t('calendar.minutesBefore')}</MenuItem>
                <MenuItem value="30">30 {t('calendar.minutesBefore')}</MenuItem>
                <MenuItem value="60">1 {t('calendar.hourBefore')}</MenuItem>
                <MenuItem value="1440">1 {t('calendar.dayBefore')}</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.location')}
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                InputProps={{
                  startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.meetingLink')}
                value={eventForm.meetingLink}
                onChange={(e) => setEventForm({ ...eventForm, meetingLink: e.target.value })}
                placeholder="https://zoom.us/j/..."
                InputProps={{
                  startAdornment: <VideoCall sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.meetingDetails')}
                multiline
                rows={2}
                value={eventForm.meetingDetails}
                onChange={(e) => setEventForm({ ...eventForm, meetingDetails: e.target.value })}
                placeholder={t('calendar.meetingDetailsPlaceholder')}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={Object.values(users)}
                getOptionLabel={(option) => getUserFullName(option)}
                value={Object.values(users).filter(u => (Array.isArray(eventForm.attendees) ? eventForm.attendees : []).includes(u.uid))}
                onChange={(event, newValue) => {
                  setEventForm({
                    ...eventForm,
                    attendees: newValue.map(u => u.uid)
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('calendar.attendees')}
                    placeholder={t('calendar.attendeesPlaceholder')}
                    helperText={t('calendar.attendeesHelper')}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={getUserFullName(option)}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>

            {eventForm.type === 'global' && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {t('calendar.globalEventNote')}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => {
              setEventDialog(false);
              resetForm();
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateEvent}
            sx={{ 
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
            }}
          >
            {t('calendar.createEvent')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Details Dialog - Professional Popup */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        {selectedEvent && (
          <>
            <DialogTitle 
              sx={{ 
                pb: 2,
                background: `linear-gradient(135deg, ${alpha(getCategoryColor(selectedEvent.category).bg, 0.1)} 0%, ${alpha(getCategoryColor(selectedEvent.category).bg, 0.05)} 100%)`,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    {selectedEvent.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={t(`calendar.${selectedEvent.category}`)}
                      size="small"
                      sx={{
                        bgcolor: alpha(getCategoryColor(selectedEvent.category).bg, 0.15),
                        color: getCategoryColor(selectedEvent.category).bg,
                        fontWeight: 700,
                      }}
                    />
                    <Chip
                      label={t(`calendar.${selectedEvent.type}`)}
                      size="small"
                      variant="outlined"
                    />
                    {selectedEvent.priority && (
                      <Chip
                        label={t(`calendar.${selectedEvent.priority}`)}
                        size="small"
                        sx={{
                          bgcolor: alpha(getPriorityColor(selectedEvent.priority), 0.15),
                          color: getPriorityColor(selectedEvent.priority),
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>
                </Box>
                <IconButton onClick={() => setDetailsDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={3}>
                {selectedEvent.description && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Description fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight="700">
                        {t('calendar.description')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.description}
                    </Typography>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <EventIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight="700">
                      {t('calendar.dateTime')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {new Date(selectedEvent.date).toLocaleDateString(isRTL ? 'ar-PS' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                  {selectedEvent.time && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.time}
                      {selectedEvent.endTime && ` - ${selectedEvent.endTime}`}
                    </Typography>
                  )}
                  {selectedEvent.duration && (
                    <Typography variant="caption" color="text.disabled">
                      {t('calendar.duration')}: {selectedEvent.duration} {t('calendar.minutes')}
                    </Typography>
                  )}
                </Box>

                {selectedEvent.location && (
                  <>
                    <Divider />
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LocationOn fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight="700">
                          {t('calendar.location')}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEvent.location}
                      </Typography>
                    </Box>
                  </>
                )}

                {selectedEvent.meetingLink && (
                  <>
                    <Divider />
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <VideoCall fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight="700">
                          {t('calendar.meetingLink')}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        fullWidth
                        sx={{ 
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {t('calendar.joinMeeting')}
                      </Button>
                    </Box>
                  </>
                )}

                {selectedEvent.meetingDetails && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="700" gutterBottom>
                        {t('calendar.meetingDetails')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEvent.meetingDetails}
                      </Typography>
                    </Box>
                  </>
                )}

                {selectedEvent.attendees && (
                  <>
                    <Divider />
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Person fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight="700">
                          {t('calendar.attendees')}
                        </Typography>
                      </Box>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Array.isArray(selectedEvent.attendees) ? (
                          selectedEvent.attendees.map((uid) => {
                            const attendee = users[uid];
                            return (
                              <Chip
                                key={uid}
                                label={attendee ? getUserFullName(attendee) : t('common.unknown')}
                                size="small"
                                avatar={<Person />}
                              />
                            );
                          })
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {selectedEvent.attendees}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </>
                )}

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.disabled">
                    {t('calendar.createdBy')}: {getCreatorName(selectedEvent)}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            
            <DialogActions sx={{ px: 3, pb: 3 }}>
              {isAdmin && selectedEvent.status === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => handleApproveEvent(selectedEvent.id)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<ClearIcon />}
                    onClick={() => {
                      setDetailsDialog(false);
                      setConfirmDialog({ open: true, eventId: selectedEvent.id });
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('common.reject')}
                  </Button>
                </>
              )}
              
              {(isAdmin || selectedEvent.createdBy === user?.uid) && selectedEvent.status === 'approved' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setDetailsDialog(false);
                    setConfirmDialog({ open: true, eventId: selectedEvent.id });
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('common.delete')}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, eventId: null })}
        onConfirm={() => {
          handleDeleteEvent(confirmDialog.eventId);
          setConfirmDialog({ open: false, eventId: null });
        }}
        title={t('calendar.deleteEvent')}
        message={t('calendar.deleteEventConfirm')}
        confirmText={t('common.delete')}
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default CalendarPagePro;

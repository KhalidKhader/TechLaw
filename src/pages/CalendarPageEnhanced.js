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
  Tooltip,
  useTheme,
  alpha,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CalendarPageEnhanced = () => {
  const { user, userRole } = useAuth();
  const { t, language } = useI18n();
  const theme = useTheme();
  const isRTL = language === 'ar';
  
  const [events, setEvents] = useState([]);
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
    location: '',
    type: 'personal',
    status: 'approved',
    meetingLink: '',
    meetingDetails: '',
    duration: '60',
    attendees: '',
    category: 'meeting',
    reminder: '30',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList = Object.entries(data).map(([id, event]) => ({ id, ...event }));
        setEvents(eventsList);
      } else {
        setEvents([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      const newEvent = {
        id: eventId,
        ...eventForm,
        createdBy: user.uid,
        creatorName: user.displayName || user.email,
        status: eventForm.type === 'global' ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
      };

      await set(ref(database, `events/${eventId}`), newEvent);
      showSuccess(eventForm.type === 'global' ? t('calendar.eventSubmitted') : t('calendar.eventCreated'));
      setEventDialog(false);
      resetForm();
    } catch (error) {
      showError(t('errors.createEventFailed') + error.message);
    }
  };

  const handleApproveEvent = async (eventId) => {
    if (!user?.uid) {
      showError(t('errors.sessionExpired'));
      return;
    }

    try {
      await update(ref(database, `events/${eventId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });
      showSuccess(t('calendar.eventApproved'));
      setDetailsDialog(false);
    } catch (error) {
      showError(t('errors.approveEventFailed') + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await remove(ref(database, `events/${eventId}`));
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
      location: '',
      type: 'personal',
      status: 'approved',
      meetingLink: '',
      meetingDetails: '',
      duration: '60',
      attendees: '',
      category: 'meeting',
      reminder: '30',
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
      meeting: theme.palette.primary.main,
      workshop: theme.palette.secondary.main,
      deadline: theme.palette.error.main,
      conference: theme.palette.info.main,
      training: theme.palette.success.main,
    };
    return colors[category] || theme.palette.primary.main;
  };

  const filteredEvents = filterEvents();
  const daysInMonth = getDaysInMonth(currentMonth);
  const weekDays = isRTL 
    ? ['السبت', 'الجمعة', 'الخميس', 'الأربعاء', 'الثلاثاء', 'الاثنين', 'الأحد']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {t('calendar.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('calendar.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEventDialog(true)}
          size="large"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: theme.shadows[4],
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          }}
        >
          {t('calendar.createEvent')}
        </Button>
      </Box>

      {/* Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          overflow: 'hidden',
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
              py: 2,
            },
          }}
        >
          <Tab label={t('calendar.myCalendar')} />
          <Tab label={t('calendar.globalCalendar')} />
          {isAdmin && (
            <Tab 
              label={`${t('calendar.pendingApproval')} (${events.filter(e => e.status === 'pending').length})`}
            />
          )}
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Calendar View */}
        <Grid item xs={12} lg={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            }}
          >
            {/* Month Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <IconButton 
                onClick={previousMonth}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5" fontWeight="700">
                {currentMonth.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
              </Typography>
              <IconButton 
                onClick={nextMonth}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Calendar Grid */}
            <Box>
              {/* Weekday Headers */}
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {weekDays.map((day) => (
                  <Grid item xs key={day}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="700"
                      textAlign="center"
                      display="block"
                      sx={{
                        color: theme.palette.primary.main,
                        py: 1,
                      }}
                    >
                      {day}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Days */}
              <Grid container spacing={1}>
                {daysInMonth.map((date, index) => {
                  const dayEvents = date ? getEventsForDate(date) : [];
                  const isCurrentDay = isToday(date);

                  return (
                    <Grid item xs key={index}>
                      <Box
                        sx={{
                          minHeight: 100,
                          p: 1,
                          border: 2,
                          borderColor: isCurrentDay 
                            ? theme.palette.primary.main 
                            : alpha(theme.palette.divider, 0.3),
                          borderRadius: 2,
                          bgcolor: date 
                            ? isCurrentDay 
                              ? alpha(theme.palette.primary.main, 0.1)
                              : theme.palette.background.paper
                            : 'transparent',
                          cursor: date ? 'pointer' : 'default',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: date ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                            transform: date ? 'translateY(-2px)' : 'none',
                            boxShadow: date ? theme.shadows[4] : 'none',
                          },
                        }}
                      >
                        {date && (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight={isCurrentDay ? 'bold' : 'normal'}
                              sx={{
                                mb: 0.5,
                                color: isCurrentDay 
                                  ? theme.palette.primary.main 
                                  : theme.palette.text.primary,
                              }}
                            >
                              {date.getDate()}
                            </Typography>
                            <Stack spacing={0.5}>
                              {dayEvents.slice(0, 3).map((event, i) => (
                                <Tooltip 
                                  key={i} 
                                  title={event.title}
                                  placement="top"
                                >
                                  <Box
                                    onClick={() => handleEventClick(event)}
                                    sx={{
                                      p: 0.5,
                                      bgcolor: alpha(getCategoryColor(event.category), 0.15),
                                      borderLeft: 3,
                                      borderColor: getCategoryColor(event.category),
                                      borderRadius: 0.5,
                                      fontSize: '0.7rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: alpha(getCategoryColor(event.category), 0.25),
                                        transform: 'translateX(2px)',
                                      },
                                    }}
                                  >
                                    {event.title}
                                  </Box>
                                </Tooltip>
                              ))}
                              {dayEvents.length > 3 && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                  }}
                                >
                                  +{dayEvents.length - 3} {t('calendar.more')}
                                </Typography>
                              )}
                            </Stack>
                          </>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Upcoming Events List */}
        <Grid item xs={12} lg={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              maxHeight: 700, 
              overflow: 'auto',
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            }}
          >
            <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 3 }}>
              {activeTab === 0 && t('calendar.upcomingEvents')}
              {activeTab === 1 && t('calendar.globalEvents')}
              {activeTab === 2 && t('calendar.pendingApproval')}
            </Typography>

            {filteredEvents.length === 0 ? (
              <Alert 
                severity="info"
                sx={{ borderRadius: 2 }}
              >
                {t('calendar.noEvents')}
              </Alert>
            ) : (
              <Stack spacing={2}>
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${alpha(getCategoryColor(event.category), 0.2)}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: theme.shadows[4],
                        transform: 'translateY(-2px)',
                        borderColor: getCategoryColor(event.category),
                      },
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant="subtitle1" fontWeight="700">
                          {event.title}
                        </Typography>
                        <Chip
                          label={t(`calendar.${event.type}`)}
                          size="small"
                          sx={{
                            bgcolor: alpha(getCategoryColor(event.category), 0.15),
                            color: getCategoryColor(event.category),
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      {event.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ mb: 1.5 }}
                          noWrap
                        >
                          {event.description}
                        </Typography>
                      )}

                      <Stack spacing={0.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <EventIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(event.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        </Box>
                        
                        {event.time && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <AccessTime fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {event.time}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveEvent(event.id);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            {t('common.approve')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setConfirmDialog({ open: true, eventId: event.id });
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            {t('common.reject')}
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create/Edit Event Dialog */}
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
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="700">
            {t('calendar.createEvent')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('calendar.eventTitle') + ' *'}
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
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
                label={t('calendar.time')}
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
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
              <TextField
                fullWidth
                label={t('calendar.attendees')}
                value={eventForm.attendees}
                onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
                placeholder={t('calendar.attendeesPlaceholder')}
                helperText={t('calendar.attendeesHelper')}
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
            sx={{ textTransform: 'none' }}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateEvent}
            sx={{ textTransform: 'none' }}
          >
            {t('calendar.createEvent')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Details Dialog */}
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
            <DialogTitle sx={{ pb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    {selectedEvent.title}
                  </Typography>
                  <Chip
                    label={t(`calendar.${selectedEvent.type}`)}
                    size="small"
                    sx={{
                      bgcolor: alpha(getCategoryColor(selectedEvent.category), 0.15),
                      color: getCategoryColor(selectedEvent.category),
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <IconButton onClick={() => setDetailsDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                {selectedEvent.description && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Description fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight="600">
                        {t('calendar.description')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.description}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EventIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight="600">
                      {t('calendar.dateTime')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(selectedEvent.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {selectedEvent.time && ` ${t('common.at')} ${selectedEvent.time}`}
                  </Typography>
                  {selectedEvent.duration && (
                    <Typography variant="caption" color="text.secondary">
                      {t('calendar.duration')}: {selectedEvent.duration} {t('calendar.minutes')}
                    </Typography>
                  )}
                </Box>

                {selectedEvent.location && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <LocationOn fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight="600">
                        {t('calendar.location')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.location}
                    </Typography>
                  </Box>
                )}

                {selectedEvent.meetingLink && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <VideoCall fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight="600">
                        {t('calendar.meetingLink')}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      href={selectedEvent.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none' }}
                    >
                      {t('calendar.joinMeeting')}
                    </Button>
                  </Box>
                )}

                {selectedEvent.meetingDetails && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                      {t('calendar.meetingDetails')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.meetingDetails}
                    </Typography>
                  </Box>
                )}

                {selectedEvent.attendees && (
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Person fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight="600">
                        {t('calendar.attendees')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEvent.attendees}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('calendar.createdBy')}: {selectedEvent.creatorName}
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
                    onClick={() => handleApproveEvent(selectedEvent.id)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setDetailsDialog(false);
                      setConfirmDialog({ open: true, eventId: selectedEvent.id });
                    }}
                    sx={{ textTransform: 'none' }}
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
                  sx={{ textTransform: 'none' }}
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

export default CalendarPageEnhanced;

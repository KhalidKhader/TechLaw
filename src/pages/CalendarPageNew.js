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
  CardActions,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Tooltip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  ChevronLeft,
  ChevronRight,
  CalendarViewMonth,
  ViewWeek,
  ViewDay,
  CheckCircle,
  Cancel,
  Schedule,
  LocationOn,
  Description,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CalendarPage = () => {
  const { user, userRole, userData } = useAuth();
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('month');
  const [eventDialog, setEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmDialog, setConfirmDialog] = useState({ open: false, eventId: null });
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    meetingLink: '',
    agenda: '',
    notes: '',
    participants: '',
    type: 'personal',
    category: 'meeting',
    status: 'approved',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  const eventCategories = [
    { value: 'meeting', label: 'Meeting', color: '#3182CE' },
    { value: 'deadline', label: 'Deadline', color: '#E53E3E' },
    { value: 'workshop', label: 'Workshop', color: '#D69E2E' },
    { value: 'conference', label: 'Conference', color: '#805AD5' },
    { value: 'general', label: 'General', color: '#38A169' },
  ];

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
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!eventForm.title || !eventForm.date) {
      showError('Title and date are required');
      return;
    }

    try {
      const eventId = selectedEvent?.id || push(ref(database, 'events')).key;
      const creatorName = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : user.email;

      const eventData = {
        id: eventId,
        ...eventForm,
        createdBy: user.uid,
        creatorName,
        status: eventForm.type === 'global' ? 'pending' : 'approved',
        ...(selectedEvent ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
      };

      await set(ref(database, `events/${eventId}`), eventData);
      showSuccess(selectedEvent ? 'Event updated successfully' : (eventForm.type === 'global' ? 'Event submitted for approval' : 'Event created successfully'));
      setEventDialog(false);
      setSelectedEvent(null);
      resetForm();
    } catch (error) {
      showError('Failed to save event: ' + error.message);
    }
  };

  const handleApproveEvent = async (eventId) => {
    if (!user?.uid) return;
    try {
      await update(ref(database, `events/${eventId}`), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.uid,
      });
      showSuccess('Event approved successfully');
    } catch (error) {
      showError('Failed to approve event: ' + error.message);
    }
  };

  const handleRejectEvent = async (eventId) => {
    if (!user?.uid) return;
    try {
      await update(ref(database, `events/${eventId}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.uid,
      });
      showSuccess('Event rejected');
    } catch (error) {
      showError('Failed to reject event: ' + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await remove(ref(database, `events/${eventId}`));
      showSuccess('Event deleted successfully');
      setConfirmDialog({ open: false, eventId: null });
    } catch (error) {
      showError('Failed to delete event: ' + error.message);
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '',
      endTime: event.endTime || '',
      location: event.location || '',
      meetingLink: event.meetingLink || '',
      agenda: event.agenda || '',
      notes: event.notes || '',
      participants: event.participants || '',
      type: event.type,
      category: event.category || 'general',
      status: event.status,
    });
    setEventDialog(true);
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      endTime: '',
      location: '',
      meetingLink: '',
      agenda: '',
      notes: '',
      participants: '',
      type: 'personal',
      category: 'meeting',
      status: 'approved',
    });
  };

  const filterEvents = () => {
    if (!user?.uid) return [];
    
    let filtered = events;

    if (activeTab === 0) {
      // My Calendar
      filtered = filtered.filter(e => 
        e.createdBy === user.uid || 
        (e.type === 'global' && e.status === 'approved')
      );
    } else if (activeTab === 1) {
      // Global Calendar
      filtered = filtered.filter(e => e.type === 'global' && e.status === 'approved');
    } else if (activeTab === 2) {
      // Pending
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

  const getDaysInWeek = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const previousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getCategoryColor = (category) => {
    return eventCategories.find(c => c.value === category)?.color || '#38A169';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const filteredEvents = filterEvents();
  const daysInMonth = getDaysInMonth(currentDate);
  const daysInWeek = getDaysInWeek();

  // Event Card Component
  const EventCard = ({ event }) => {
    const getInitials = (name) => {
      if (!name) return 'U';
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    return (
      <Card 
        sx={{ 
          mb: 2, 
          borderLeft: 4, 
          borderColor: getCategoryColor(event.category),
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': { 
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease'
          }
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Typography variant="h6" fontWeight="600" color="text.primary">
              {event.title}
            </Typography>
            <Chip 
              label={event.status} 
              color={getStatusColor(event.status)} 
              size="small" 
            />
          </Box>
          
          <Stack spacing={1.5} mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <EventIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Typography>
            </Box>

            {event.time && (
              <Box display="flex" alignItems="center" gap={1}>
                <Schedule fontSize="small" sx={{ color: theme.palette.primary.main }} />
                <Typography variant="body2" color="text.secondary">
                  {event.time} {event.endTime && `- ${event.endTime}`}
                </Typography>
              </Box>
            )}
            
            {event.location && (
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOn fontSize="small" sx={{ color: theme.palette.primary.main }} />
                <Typography variant="body2" color="text.secondary">
                  {event.location}
                </Typography>
              </Box>
            )}

            {event.meetingLink && (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" component="a" href={event.meetingLink} target="_blank" rel="noopener noreferrer" 
                  sx={{ 
                    color: theme.palette.primary.main, 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  🔗 Join Meeting
                </Typography>
              </Box>
            )}

            {event.description && (
              <Box display="flex" alignItems="start" gap={1}>
                <Description fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                <Typography variant="body2" color="text.secondary">
                  {event.description}
                </Typography>
              </Box>
            )}

            {event.agenda && (
              <Box sx={{ 
                p: 1.5, 
                bgcolor: alpha(theme.palette.primary.main, 0.05), 
                borderRadius: 1,
                borderLeft: 3,
                borderColor: theme.palette.primary.main
              }}>
                <Typography variant="caption" fontWeight={600} color="text.primary" display="block" mb={0.5}>
                  Agenda:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {event.agenda}
                </Typography>
              </Box>
            )}

            {event.participants && (
              <Box display="flex" alignItems="start" gap={1}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Participants: {event.participants}
                </Typography>
              </Box>
            )}

            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: theme.palette.primary.main }}>
                {getInitials(event.creatorName)}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                Created by <strong>{event.creatorName || 'Unknown'}</strong>
              </Typography>
            </Box>
          </Stack>

          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip 
              label={event.category} 
              size="small" 
              sx={{ bgcolor: alpha(getCategoryColor(event.category), 0.15), color: getCategoryColor(event.category), fontWeight: 600 }}
            />
            <Chip 
              label={event.type === 'global' ? 'Global' : 'Personal'} 
              size="small" 
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          {isAdmin && event.status === 'pending' && (
            <>
              <Button 
                size="small" 
                startIcon={<CheckCircle />} 
                onClick={() => handleApproveEvent(event.id)}
                color="success"
              >
                Approve
              </Button>
              <Button 
                size="small" 
                startIcon={<Cancel />} 
                onClick={() => handleRejectEvent(event.id)}
                color="error"
              >
                Reject
              </Button>
            </>
          )}
        </Box>
        {(event.createdBy === user?.uid || isAdmin) && (
          <Box>
            <Button size="small" onClick={() => handleEditEvent(event)}>
              Edit
            </Button>
            <IconButton 
              size="small" 
              onClick={() => setConfirmDialog({ open: true, eventId: event.id })}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        </CardActions>
      </Card>
    );
  };

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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            📅 Calendar & Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your schedule and upcoming events
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEventDialog(true)}
          size="large"
          sx={{ borderRadius: 2 }}
        >
          Create Event
        </Button>
      </Box>

      {/* Tabs & View Toggle */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} p={2}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ flexGrow: 1 }}
          >
            <Tab label="My Calendar" icon={<EventIcon />} iconPosition="start" />
            <Tab label="Global Calendar" icon={<EventIcon />} iconPosition="start" />
            {isAdmin && (
              <Tab 
                label={`Pending (${events.filter(e => e.status === 'pending').length})`} 
                icon={<Schedule />} 
                iconPosition="start" 
              />
            )}
          </Tabs>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newView) => newView && setViewMode(newView)}
            size="small"
          >
            <ToggleButton value="month">
              <Tooltip title="Month View">
                <CalendarViewMonth />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="week">
              <Tooltip title="Week View">
                <ViewWeek />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="day">
              <Tooltip title="Day View">
                <ViewDay />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Calendar View */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, minHeight: 600 }}>
            {/* Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <IconButton onClick={previousPeriod} size="large">
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5" fontWeight="600">
                {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {viewMode === 'week' && `Week of ${daysInWeek[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography>
              <IconButton onClick={nextPeriod} size="large">
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Month View */}
            {viewMode === 'month' && (
              <Box>
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Grid item xs key={day}>
                      <Typography
                        variant="caption"
                        fontWeight="600"
                        textAlign="center"
                        display="block"
                        color="text.secondary"
                        sx={{ py: 1 }}
                      >
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={1}>
                  {daysInMonth.map((date, index) => {
                    const dayEvents = date ? getEventsForDate(date) : [];
                    const isCurrentDay = isToday(date);

                    return (
                      <Grid item xs key={index}>
                        <Paper
                          elevation={0}
                          sx={{
                            minHeight: 100,
                            p: 1,
                            bgcolor: date
                              ? isCurrentDay
                                ? alpha(theme.palette.primary.main, 0.1)
                                : theme.palette.background.paper
                              : 'transparent',
                            border: 1,
                            borderColor: isCurrentDay ? theme.palette.primary.main : 'divider',
                            borderRadius: 2,
                            cursor: date ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': date && {
                              boxShadow: 2,
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          {date && (
                            <>
                              <Typography
                                variant="body2"
                                fontWeight={isCurrentDay ? 700 : 400}
                                color={isCurrentDay ? 'primary' : 'text.primary'}
                                mb={0.5}
                              >
                                {date.getDate()}
                              </Typography>
                              <Stack spacing={0.5}>
                                {dayEvents.slice(0, 3).map((event) => (
                                  <Box
                                    key={event.id}
                                    sx={{
                                      bgcolor: alpha(getCategoryColor(event.category), 0.2),
                                      color: getCategoryColor(event.category),
                                      borderRadius: 1,
                                      px: 0.5,
                                      py: 0.25,
                                    }}
                                  >
                                    <Typography variant="caption" fontSize="0.65rem" noWrap>
                                      {event.title}
                                    </Typography>
                                  </Box>
                                ))}
                                {dayEvents.length > 3 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{dayEvents.length - 3} more
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
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <Grid container spacing={2}>
                {daysInWeek.map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isCurrentDay = isToday(date);

                  return (
                    <Grid item xs key={index}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          minHeight: 400,
                          bgcolor: isCurrentDay ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                          border: 1,
                          borderColor: isCurrentDay ? theme.palette.primary.main : 'divider',
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight={isCurrentDay ? 700 : 600}
                          color={isCurrentDay ? 'primary' : 'text.primary'}
                          mb={2}
                          textAlign="center"
                        >
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          <br />
                          {date.getDate()}
                        </Typography>
                        <Stack spacing={1}>
                          {dayEvents.map((event) => (
                            <Paper
                              key={event.id}
                              elevation={1}
                              sx={{
                                p: 1,
                                borderLeft: 3,
                                borderColor: getCategoryColor(event.category),
                                cursor: 'pointer',
                                '&:hover': { boxShadow: 3 },
                              }}
                              onClick={() => handleEditEvent(event)}
                            >
                              <Typography variant="caption" fontWeight="600" noWrap>
                                {event.time || ''}
                              </Typography>
                              <Typography variant="body2" noWrap>
                                {event.title}
                              </Typography>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            {/* Day View */}
            {viewMode === 'day' && (
              <Box>
                {getEventsForDate(currentDate).length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Typography variant="h6" color="text.secondary">
                      No events scheduled for this day
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {getEventsForDate(currentDate).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Events List */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, maxHeight: 800, overflow: 'auto' }}>
            <Typography variant="h6" fontWeight="600" mb={2}>
              {activeTab === 0 && 'My Upcoming Events'}
              {activeTab === 1 && 'Global Events'}
              {activeTab === 2 && 'Pending Approvals'}
            </Typography>

            {filteredEvents.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary">
                  No events to display
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
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
          setSelectedEvent(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'Create New Event'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Event Title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              multiline
              rows={3}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Time (Optional)"
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              placeholder="e.g., Conference Room A, Building 3"
            />

            <TextField
              fullWidth
              label="Meeting Link (Zoom, Teams, etc.)"
              value={eventForm.meetingLink}
              onChange={(e) => setEventForm({ ...eventForm, meetingLink: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />

            <TextField
              fullWidth
              label="Agenda"
              value={eventForm.agenda}
              onChange={(e) => setEventForm({ ...eventForm, agenda: e.target.value })}
              multiline
              rows={3}
              placeholder="Meeting agenda and topics to discuss..."
            />

            <TextField
              fullWidth
              label="Participants"
              value={eventForm.participants}
              onChange={(e) => setEventForm({ ...eventForm, participants: e.target.value })}
              placeholder="List participant names separated by commas"
            />

            <TextField
              fullWidth
              label="Additional Notes"
              value={eventForm.notes}
              onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
              multiline
              rows={2}
              placeholder="Any additional information..."
            />

            <TextField
              select
              fullWidth
              label="Category"
              value={eventForm.category}
              onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
            >
              {eventCategories.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Visibility"
              value={eventForm.type}
              onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
            >
              <MenuItem value="personal">Personal (Only Me)</MenuItem>
              <MenuItem value="global">Global (All Users - Requires Approval)</MenuItem>
            </TextField>

            {eventForm.type === 'global' && !isAdmin && (
              <Alert severity="info">
                Global events require admin approval before they appear on the global calendar
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => {
            setEventDialog(false);
            setSelectedEvent(null);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleCreateEvent} variant="contained">
            {selectedEvent ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, eventId: null })}
        onConfirm={() => handleDeleteEvent(confirmDialog.eventId)}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
      />
    </Container>
  );
};

export default CalendarPage;

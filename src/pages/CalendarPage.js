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
  List,
  ListItem,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CalendarPage = () => {
  const { user, userRole } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [eventDialog, setEventDialog] = useState(false);
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
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!eventForm.title || !eventForm.date) {
      showError('Please fill all required fields');
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
      showSuccess(eventForm.type === 'global' ? 'Event submitted for approval' : 'Event created successfully');
      setEventDialog(false);
      resetForm();
    } catch (error) {
      showError('Failed to create event: ' + error.message);
    }
  };

  const handleApproveEvent = async (eventId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

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

  const handleDeleteEvent = async (eventId) => {
    try {
      await remove(ref(database, `events/${eventId}`));
      showSuccess('Event deleted successfully');
    } catch (error) {
      showError('Failed to delete event: ' + error.message);
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
    });
  };

  const filterEvents = () => {
    if (!user?.uid) return events;
    
    let filtered = events;

    if (activeTab === 0) {
      // My Calendar - personal events or assigned to me
      filtered = filtered.filter(e => 
        e.createdBy === user.uid || 
        (e.type === 'global' && e.status === 'approved')
      );
    } else if (activeTab === 1) {
      // Global Calendar - all approved global events
      filtered = filtered.filter(e => e.type === 'global' && e.status === 'approved');
    } else if (activeTab === 2) {
      // Pending - only for admins
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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the days of the month
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

  const filteredEvents = filterEvents();
  const daysInMonth = getDaysInMonth(currentMonth);

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
            Calendar & Events
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your schedule and events
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEventDialog(true)}
          size="large"
        >
          Create Event
        </Button>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="My Calendar" />
          <Tab label="Global Calendar" />
          {isAdmin && <Tab label={`Pending Approval (${events.filter(e => e.status === 'pending').length})`} />}
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Calendar View */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
            {/* Month Navigation */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <IconButton onClick={previousMonth}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5" fontWeight="600">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Typography>
              <IconButton onClick={nextMonth}>
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Calendar Grid */}
            <Box>
              {/* Weekday Headers */}
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Grid item xs key={day}>
                    <Typography
                      variant="caption"
                      fontWeight="600"
                      textAlign="center"
                      display="block"
                      color="text.secondary"
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
                          minHeight: 80,
                          p: 1,
                          border: 1,
                          borderColor: isCurrentDay ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          bgcolor: date ? (isCurrentDay ? 'primary.light' : 'background.paper') : 'transparent',
                          cursor: date ? 'pointer' : 'default',
                          '&:hover': {
                            bgcolor: date ? 'action.hover' : 'transparent',
                          },
                        }}
                      >
                        {date && (
                          <>
                            <Typography
                              variant="body2"
                              fontWeight={isCurrentDay ? 'bold' : 'normal'}
                              color={isCurrentDay ? 'primary.contrastText' : 'text.primary'}
                            >
                              {date.getDate()}
                            </Typography>
                            {dayEvents.slice(0, 2).map((event, i) => (
                              <Box
                                key={i}
                                sx={{
                                  mt: 0.5,
                                  p: 0.5,
                                  bgcolor: event.type === 'global' ? 'secondary.light' : 'primary.light',
                                  borderRadius: 0.5,
                                  fontSize: '0.7rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {event.title}
                              </Box>
                            ))}
                            {dayEvents.length > 2 && (
                              <Typography variant="caption" color="text.secondary">
                                +{dayEvents.length - 2} more
                              </Typography>
                            )}
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

        {/* Event List */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, maxHeight: 700, overflow: 'auto' }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {activeTab === 0 && 'My Events'}
              {activeTab === 1 && 'Global Events'}
              {activeTab === 2 && 'Pending Approval'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {filteredEvents.length === 0 ? (
              <Alert severity="info">No events found</Alert>
            ) : (
              <List>
                {filteredEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        flexDirection: 'column',
                        p: 2,
                        mb: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                      }}
                    >
                      <Box width="100%">
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Typography variant="subtitle1" fontWeight="600">
                            {event.title}
                          </Typography>
                          <Chip
                            label={event.type}
                            size="small"
                            color={event.type === 'global' ? 'secondary' : 'primary'}
                          />
                        </Box>

                        {event.description && (
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {event.description}
                          </Typography>
                        )}

                        <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                          <Chip
                            icon={<EventIcon fontSize="small" />}
                            label={new Date(event.date).toLocaleDateString()}
                            size="small"
                            variant="outlined"
                          />
                          {event.time && (
                            <Chip label={event.time} size="small" variant="outlined" />
                          )}
                          {event.location && (
                            <Chip label={event.location} size="small" variant="outlined" />
                          )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          Created by {event.creatorName}
                        </Typography>

                        {isAdmin && event.status === 'pending' && (
                          <Box display="flex" gap={1} mt={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleApproveEvent(event.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => setConfirmDialog({ open: true, eventId: event.id })}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}

                        {(isAdmin || event.createdBy === user?.uid) && event.status === 'approved' && (
                          <Box mt={1}>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setConfirmDialog({ open: true, eventId: event.id })}
                            >
                              Delete
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Event Dialog */}
      <Dialog open={eventDialog} onClose={() => setEventDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Title *"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date *"
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Event Type"
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
              >
                <MenuItem value="personal">Personal (My Calendar)</MenuItem>
                <MenuItem value="global">Global (All Users) - Requires Approval</MenuItem>
              </TextField>
            </Grid>
            {eventForm.type === 'global' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Global events require admin approval before appearing on all calendars
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEventDialog(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateEvent}>
            Create Event
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, eventId: null })}
        onConfirm={() => {
          handleDeleteEvent(confirmDialog.eventId);
          setConfirmDialog({ open: false, eventId: null });
        }}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default CalendarPage;

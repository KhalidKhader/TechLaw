import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add,
  Event,
  ChevronLeft,
  ChevronRight,
  Today,
  Close
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { database } from '../config/firebase';
import { ref, push, onValue, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

const CalendarPage = () => {
  const { userData, currentUser, userRole } = useAuth();
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting',
    visibility: 'personal',
    attendees: []
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const eventsRef = ref(database, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setEvents(eventsList);
      } else {
        setEvents([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const eventDate = event.date?.split('T')[0];
      const isMyEvent = event.visibility === 'personal' && event.createdBy === currentUser?.uid;
      const isPublicEvent = event.visibility === 'public' && event.status === 'approved';
      const isAttendee = event.attendees?.includes(currentUser?.uid);
      
      return eventDate === dateStr && (isMyEvent || isPublicEvent || isAttendee || isAdmin);
    });
  };

  const handleCreateEvent = async () => {
    try {
      const eventData = {
        ...newEvent,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        status: newEvent.visibility === 'public' ? 'pending' : 'approved'
      };

      await push(ref(database, 'events'), eventData);
      
      toast.success(
        newEvent.visibility === 'public' 
          ? 'Event submitted for admin approval' 
          : 'Event created successfully'
      );
      
      setOpenDialog(false);
      setNewEvent({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'meeting',
        visibility: 'personal',
        attendees: []
      });
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);

  const filteredEvents = events.filter(event => {
    if (tabValue === 0) { // Personal
      return event.createdBy === currentUser?.uid && event.visibility === 'personal';
    } else { // Global
      return event.visibility === 'public' && event.status === 'approved';
    }
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">Calendar</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Create Event
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Calendar Grid */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <IconButton onClick={() => changeMonth(-1)}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" fontWeight="bold">{monthName}</Typography>
              <IconButton onClick={() => changeMonth(1)}>
                <ChevronRight />
              </IconButton>
            </Box>

            <Grid container spacing={1}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs={12/7} key={day}>
                  <Typography align="center" variant="caption" fontWeight="bold" color="textSecondary">
                    {day}
                  </Typography>
                </Grid>
              ))}
              
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day === new Date().getDate() && 
                               currentDate.getMonth() === new Date().getMonth() &&
                               currentDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <Grid item xs={12/7} key={index}>
                    <Box
                      sx={{
                        minHeight: 80,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 0.5,
                        bgcolor: isToday ? 'primary.light' : 'background.paper',
                        cursor: day ? 'pointer' : 'default',
                        '&:hover': day ? { bgcolor: 'action.hover' } : {}
                      }}
                    >
                      {day && (
                        <>
                          <Typography 
                            variant="caption" 
                            fontWeight={isToday ? 'bold' : 'normal'}
                            color={isToday ? 'primary.contrastText' : 'textPrimary'}
                          >
                            {day}
                          </Typography>
                          {dayEvents.map((event, idx) => (
                            <Chip
                              key={idx}
                              label={event.title}
                              size="small"
                              sx={{ 
                                mt: 0.5, 
                                width: '100%', 
                                fontSize: '0.65rem',
                                height: 'auto',
                                '& .MuiChip-label': { 
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                              color={event.type === 'meeting' ? 'primary' : event.type === 'deadline' ? 'error' : 'info'}
                            />
                          ))}
                        </>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Events List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
              <Tab label="My Events" />
              <Tab label="Global Events" />
            </Tabs>
            <Divider sx={{ my: 2 }} />
            
            <List>
              {filteredEvents.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
                  No events found
                </Typography>
              ) : (
                filteredEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              {new Date(event.date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption">
                              {event.startTime} - {event.endTime}
                            </Typography>
                          </>
                        }
                      />
                      <Chip 
                        label={event.type} 
                        size="small" 
                        color={event.type === 'meeting' ? 'primary' : 'default'}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Create Event Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Event
          <IconButton
            onClick={() => setOpenDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="End Time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Event Type"
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              >
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="deadline">Deadline</MenuItem>
                <MenuItem value="event">General Event</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Visibility"
                value={newEvent.visibility}
                onChange={(e) => setNewEvent({ ...newEvent, visibility: e.target.value })}
              >
                <MenuItem value="personal">Personal (Only Me)</MenuItem>
                <MenuItem value="public">Global (Requires Admin Approval)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateEvent}
            disabled={!newEvent.title || !newEvent.date}
          >
            Create Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;

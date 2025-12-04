import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add,
  Assignment,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  Comment,
  Close
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { database } from '../config/firebase';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { toast } from 'react-hot-toast';

const TasksPage = () => {
  const { userData, currentUser, userRole } = useAuth();
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    deadline: '',
    priority: 'medium',
    status: 'pending'
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const tasksRef = ref(database, 'tasks');
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setTasks(tasksList);
      } else {
        setTasks([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const usersRef = ref(database, 'users');
      const unsubscribe = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const usersList = Object.entries(data).map(([key, value]) => ({
            uid: key,
            ...value
          }));
          setUsers(usersList.filter(u => u.status === 'approved'));
        }
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleCreateTask = async () => {
    try {
      const taskData = {
        ...newTask,
        createdBy: currentUser.uid,
        createdByName: `${userData.firstName} ${userData.lastName}`,
        createdAt: new Date().toISOString(),
        comments: []
      };

      await push(ref(database, 'tasks'), taskData);
      toast.success('Task created successfully');
      
      setOpenDialog(false);
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        deadline: '',
        priority: 'medium',
        status: 'pending'
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await update(ref(database, `tasks/${taskId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await remove(ref(database, `tasks/${taskId}`));
        toast.success('Task deleted');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (tabValue === 0) { // My Tasks
      return task.assignedTo === currentUser?.uid;
    } else if (tabValue === 1) { // Created by Me
      return task.createdBy === currentUser?.uid;
    } else if (tabValue === 2 && isAdmin) { // All Tasks
      return true;
    }
    return false;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">Tasks</Typography>
        {isAdmin && (
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Create Task
          </Button>
        )}
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Assigned to Me" />
          <Tab label="Created by Me" />
          {isAdmin && <Tab label="All Tasks" />}
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {filteredTasks.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No tasks found
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredTasks.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        label={task.priority} 
                        size="small" 
                        color={getPriorityColor(task.priority)}
                      />
                      <Chip 
                        label={task.status} 
                        size="small" 
                        color={getStatusColor(task.status)}
                      />
                    </Box>
                    {isAdmin && (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {task.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    sx={{ 
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {task.description}
                  </Typography>

                  {task.deadline && (
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Created by: {task.createdByName}
                    </Typography>
                  </Box>

                  {task.assignedTo === currentUser?.uid && task.status !== 'completed' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      {task.status === 'pending' && (
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleUpdateTaskStatus(task.id, 'in-progress')}
                        >
                          Start Task
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button 
                          size="small" 
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Create Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Task
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
                label="Task Title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Assign To"
                value={newTask.assignedTo}
                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                required
              >
                <MenuItem value="">Select User</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.uid} value={user.uid}>
                    {user.firstName} {user.lastName} ({user.email})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Priority"
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Deadline"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTask}
            disabled={!newTask.title || !newTask.description || !newTask.assignedTo}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksPage;

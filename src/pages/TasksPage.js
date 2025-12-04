import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getUserData } from '../services/userService';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';
import { getUserFullName } from '../utils/helpers';
import UserAvatar from '../components/common/UserAvatar';

const TasksPage = () => {
  const { user, userRole } = useAuth();
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, taskId: null });
  const [activeTab, setActiveTab] = useState(0);
  const [taskDialog, setTaskDialog] = useState(false);
  const [commentDialog, setCommentDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: [], // Changed to array for multiple assignees
    deadline: '',
    priority: 'medium',
    status: 'pending',
  });

  const [comment, setComment] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    // Load tasks
    const tasksRef = ref(database, 'tasks');
    const unsubTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksList = Object.entries(data).map(([id, task]) => ({
          ...task,
          id,
          comments: task.comments ? (Array.isArray(task.comments) ? task.comments : Object.values(task.comments)) : []
        }));
        setTasks(tasksList);
      } else {
        setTasks([]);
      }
      setLoading(false);
    });

    // Load users for all authenticated users (needed for displaying assigned users)
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.entries(data).map(([uid, user]) => ({ uid, ...user }));
        setUsers(usersList);
      }
    });
    
    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, [isAdmin]);

  const handleCreateTask = async () => {
    if (!user?.uid) {
      showError(t('task.sessionExpired'));
      return;
    }

    if (!taskForm.title || !taskForm.assignedTo?.length || !taskForm.deadline) {
      showError(t('task.fillRequired'));
      return;
    }

    try {
      const taskId = push(ref(database, 'tasks')).key;
      await set(ref(database, `tasks/${taskId}`), {
        id: taskId,
        ...taskForm,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        comments: [],
      });

      // Send notification to all assigned users
      const creatorData = await getUserData(user.uid);
      const creatorName = getUserFullName(creatorData);
      
      for (const assignedUserId of taskForm.assignedTo) {
        await sendNotification(
          assignedUserId,
          NotificationTemplates.taskAssigned(taskForm.title, creatorName)
        );
      }

      showSuccess(t('task.createSuccess'));
      setTaskDialog(false);
      resetTaskForm();
    } catch (error) {
      showError(t('task.createError') + ': ' + error.message);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      await update(ref(database, `tasks/${selectedTask.id}`), {
        ...taskForm,
        updatedAt: new Date().toISOString(),
      });
      showSuccess(t('task.updateSuccess'));
      setTaskDialog(false);
      setSelectedTask(null);
      resetTaskForm();
    } catch (error) {
      showError(t('task.updateError') + ': ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await remove(ref(database, `tasks/${taskId}`));
      showSuccess(t('task.deleteSuccess'));
    } catch (error) {
      showError(t('task.deleteError') + ': ' + error.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await update(ref(database, `tasks/${taskId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showSuccess(`${t('task.statusUpdateSuccess')} ${t('common.' + newStatus) || t('task.' + newStatus)}`);
    } catch (error) {
      showError(t('task.statusUpdateError') + ': ' + error.message);
    }
  };

  const handleAddComment = async () => {
    if (!user?.uid) {
      showError(t('task.sessionExpired'));
      return;
    }

    if (!selectedTask || !comment.trim()) return;

    try {
      // Get user data from database
      const userData = await getUserData(user.uid);
      const userName = getUserFullName(userData || user);

      const comments = selectedTask.comments || [];
      const newComment = {
        text: comment,
        userId: user.uid,
        userName: userName,
        timestamp: new Date().toISOString(),
      };
      
      comments.push(newComment);

      // Write directly to comments path with proper permissions
      await set(ref(database, `tasks/${selectedTask.id}/comments`), comments);

      // Send notification to task creator and all assigned users
      const assignedUsers = Array.isArray(selectedTask.assignedTo) 
        ? selectedTask.assignedTo 
        : [selectedTask.assignedTo].filter(Boolean);
      
      const notifyUsers = [selectedTask.createdBy, ...assignedUsers].filter(
        uid => uid && uid !== user.uid
      );
      
      for (const userId of notifyUsers) {
        await sendNotification(
          userId,
          NotificationTemplates.taskCommented(selectedTask.title, userName)
        );
      }

      showSuccess(t('task.commentSuccess'));
      setComment('');
      setCommentDialog(false);
      setSelectedTask(null);
    } catch (error) {
      showError(t('task.commentError') + ': ' + error.message);
    }
  };

  const openEditTask = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo].filter(Boolean),
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
    });
    setTaskDialog(true);
  };

  const openCommentDialog = (task) => {
    setSelectedTask(task);
    setCommentDialog(true);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: [],
      deadline: '',
      priority: 'medium',
      status: 'pending',
    });
  };

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
      case 'in-progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const filterTasks = () => {
    if (!user?.uid) return tasks;
    
    let filtered = tasks;

    // Filter by tab
    if (activeTab === 1) {
      filtered = filtered.filter(t => {
        const assignedUsers = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo].filter(Boolean);
        return assignedUsers.includes(user.uid);
      });
    } else if (activeTab === 2) {
      filtered = filtered.filter(t => t.createdBy === user.uid);
    } else if (activeTab === 3) {
      filtered = filtered.filter(t => t.status === 'completed');
    }

    return filtered;
  };

  const filteredTasks = filterTasks();

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
            {t('common.tasks')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.tasksDescription')}
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTaskDialog(true)}
            size="large"
          >
            {t('tasks.createTask')}
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`${t('tasks.allTasks')} (${tasks.length})`} />
          <Tab label={`${t('tasks.assignedToMe')} (${user?.uid ? tasks.filter(t => {
            const assignedUsers = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo].filter(Boolean);
            return assignedUsers.includes(user.uid);
          }).length : 0})`} />
          <Tab label={`${t('tasks.myTasks')} (${user?.uid ? tasks.filter(t => t.createdBy === user.uid).length : 0})`} />
          <Tab label={`${t('common.completed')} (${tasks.filter(t => t.status === 'completed').length})`} />
        </Tabs>
      </Paper>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <Alert severity="info">{t('common.noData')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredTasks.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" fontWeight="600">
                      {task.title}
                    </Typography>
                    <Chip
                      label={task.priority}
                      color={getPriorityColor(task.priority)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.primary" paragraph>
                    {task.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={task.status}
                      color={getStatusColor(task.status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {task.deadline && (
                      <Typography variant="caption" color="text.secondary">
                        {t('tasks.due')}: {new Date(task.deadline).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  {/* Assigned To Users */}
                  <Box display="flex" alignItems="flex-start" gap={1} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('tasks.assignedTo')}:
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                      {(() => {
                        const assignedUsers = Array.isArray(task.assignedTo) 
                          ? task.assignedTo 
                          : [task.assignedTo].filter(Boolean);
                        
                        return assignedUsers.map((userId, index) => {
                          const assignedUser = users.find(u => u.uid === userId);
                          
                          // If user not found in users list, try to get basic info or show loading state
                          const fullName = assignedUser 
                            ? getUserFullName(assignedUser)
                            : t('common.unknown');
                          
                          return (
                            <Box key={userId || index} display="flex" alignItems="center" gap={0.3}>
                              <UserAvatar
                                user={assignedUser}
                                name={fullName}
                                size={20}
                                sx={{ fontSize: '0.6rem' }}
                              />
                              <Typography variant="caption" color="text.primary" fontWeight="500">
                                {fullName}
                              </Typography>
                              {index < assignedUsers.length - 1 && (
                                <Typography variant="caption" color="text.disabled">
                                  ,
                                </Typography>
                              )}
                            </Box>
                          );
                        }).filter(Boolean);
                      })()}
                    </Box>
                  </Box>

                  {task.comments && task.comments.length > 0 && (
                    <Box display="flex" alignItems="center" gap={1} sx={{ mt: 2 }}>
                      <CommentIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {task.comments.length} {t('tasks.comments')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box display="flex" gap={1}>
                    {task.status !== 'completed' && (
                      Array.isArray(task.assignedTo) 
                        ? task.assignedTo.includes(user.uid) 
                        : task.assignedTo === user.uid
                    ) && (
                      <Button
                        size="small"
                        startIcon={<CompleteIcon />}
                        onClick={() => handleStatusChange(task.id, 'completed')}
                      >
                        {t('task.complete')}
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => openCommentDialog(task)}>
                      <CommentIcon />
                    </IconButton>
                  </Box>
                  {isAdmin && (
                    <Box display="flex" gap={1}>
                      <IconButton size="small" onClick={() => openEditTask(task)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setConfirmDialog({ open: true, taskId: task.id })}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Task Dialog */}
      <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTask ? t('task.editTask') : t('task.createTask')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('task.taskTitle') + ' *'}
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('common.description')}
                multiline
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('task.assignedTo')} *</InputLabel>
                <Select
                  multiple
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  input={<OutlinedInput label={t('task.assignedTo') + ' *'} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const user = users.find(u => u.uid === value);
                        const userName = getUserFullName(user);
                        return (
                          <Chip key={value} label={userName} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {users.map((u) => {
                    const userName = getUserFullName(u);
                    return (
                      <MenuItem key={u.uid} value={u.uid}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.7rem' }}>
                          {userName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                        </Avatar>
                        {userName}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('task.deadline') + ' *'}
                type="date"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('common.priority')}
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <MenuItem value="low">{t('task.low')}</MenuItem>
                <MenuItem value="medium">{t('task.medium')}</MenuItem>
                <MenuItem value="high">{t('task.high')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={t('common.status')}
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
              >
                <MenuItem value="pending">{t('common.pending')}</MenuItem>
                <MenuItem value="in-progress">{t('task.inProgress')}</MenuItem>
                <MenuItem value="completed">{t('common.completed')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTaskDialog(false);
            setSelectedTask(null);
            resetTaskForm();
          }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={selectedTask ? handleUpdateTask : handleCreateTask}
          >
            {selectedTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={commentDialog} onClose={() => setCommentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Task Comments</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                {selectedTask.title}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {selectedTask.comments && selectedTask.comments.length > 0 ? (
                <List sx={{ 
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  borderRadius: 1,
                  p: 1
                }}>
                  {selectedTask.comments.map((c, index) => (
                    <ListItem 
                      key={index} 
                      alignItems="flex-start"
                      sx={{
                        bgcolor: 'background.paper',
                        mb: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {c.userName ? c.userName.substring(0, 2).toUpperCase() : 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight="600" color="text.primary">
                            {c.userName}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="text.primary" sx={{ display: 'block', mt: 0.5 }}>
                              {c.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {new Date(c.timestamp).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>No comments yet</Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCommentDialog(false);
            setComment('');
            setSelectedTask(null);
          }}>
            Close
          </Button>
          <Button variant="contained" onClick={handleAddComment} disabled={!comment.trim()}>
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, taskId: null })}
        onConfirm={() => {
          handleDeleteTask(confirmDialog.taskId);
          setConfirmDialog({ open: false, taskId: null });
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default TasksPage;

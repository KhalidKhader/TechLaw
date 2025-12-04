import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  MoreVert,
  Search
} from '@mui/icons-material';
import { database } from '../../config/firebase';
import { ref, onValue, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data).map(([key, value]) => ({
          uid: key,
          ...value
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (uid, newStatus) => {
    try {
      await update(ref(database, `users/${uid}`), {
        status: newStatus
      });
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleRoleChange = async (uid, newRole) => {
    try {
      await update(ref(database, `users/${uid}`), {
        role: newRole
      });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">User Management</Typography>
        <Button variant="contained" startIcon={<Search />}>Search Users</Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={filter} 
          onChange={(e, v) => setFilter(v)} 
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="All Users" value="all" />
          <Tab label="Pending Approval" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Suspended" value="suspended" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}
                      >
                        {user.firstName?.charAt(0)}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2">{user.firstName} {user.lastName}</Typography>
                        <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      variant="outlined"
                      color={user.role === 'admin' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      size="small" 
                      color={getStatusColor(user.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    {user.status === 'pending' && (
                      <>
                        <IconButton 
                          color="success" 
                          onClick={() => handleStatusChange(user.uid, 'approved')}
                          title="Approve"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleStatusChange(user.uid, 'rejected')}
                          title="Reject"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                    <IconButton onClick={() => {
                      setSelectedUser(user);
                      setOpenDialog(true);
                    }}>
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Role"
                value={selectedUser.role}
                onChange={(e) => handleRoleChange(selectedUser.uid, e.target.value)}
                fullWidth
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="superAdmin">Super Admin</MenuItem>
              </TextField>

              <TextField
                select
                label="Status"
                value={selectedUser.status}
                onChange={(e) => handleStatusChange(selectedUser.uid, e.target.value)}
                fullWidth
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;

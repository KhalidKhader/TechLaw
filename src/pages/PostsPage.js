import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  ThumbUp as LikeIcon,
  Comment as CommentIcon,
  PushPin as PinIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { showSuccess, showError } from '../utils/toast';
import { getUserFullName } from '../utils/helpers';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { sendNotification, NotificationTemplates } from '../utils/notificationHelpers';

const PostsPage = () => {
  const { user, userRole, userData } = useAuth();
  const { t } = useI18n();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postDialog, setPostDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, postId: null });
  const [expandedComments, setExpandedComments] = useState({});
  const [commentText, setCommentText] = useState({});
  
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    visibility: 'all',
  });

  const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.entries(data).map(([id, post]) => ({ id, ...post }));
        // Sort by pinned first, then by date
        postsList.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setPosts(postsList);
      } else {
        setPosts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitPost = async () => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!postForm.title || !postForm.content) {
      showError('Title and content are required');
      return;
    }

    try {
      if (selectedPost) {
        // Update existing post
        await update(ref(database, `posts/${selectedPost.id}`), {
          title: postForm.title,
          content: postForm.content,
          visibility: postForm.visibility,
          updatedAt: new Date().toISOString(),
        });
        showSuccess('Post updated successfully');
      } else {
        // Create new post
        const postId = push(ref(database, 'posts')).key;
        const authorName = getUserFullName(userData || user);
        await set(ref(database, `posts/${postId}`), {
          id: postId,
          ...postForm,
          authorId: user.uid,
          authorName,
          authorEmail: user.email,
          likes: {},
          comments: {},
          isPinned: false,
          createdAt: new Date().toISOString(),
        });

        // Notify all approved users about new post (if public)
        if (postForm.visibility === 'all') {
          const usersRef = ref(database, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            const approvedUsers = Object.entries(users)
              .filter(([uid, userData]) => 
                userData.status === 'approved' && uid !== user.uid
              );
            
            // Send to first 10 users to avoid spam (you can modify this logic)
            const limitedUsers = approvedUsers.slice(0, 10);
            for (const [userId] of limitedUsers) {
              await sendNotification(
                userId,
                NotificationTemplates.postCreated(postForm.title, authorName)
              );
            }
          }
        }

        showSuccess('Post created successfully');
      }
      
      setPostDialog(false);
      setSelectedPost(null);
      resetForm();
    } catch (error) {
      showError('Failed to submit post: ' + error.message);
    }
  };

  const handleLikePost = async (postId, currentLikes = {}) => {
    if (!user?.uid) return;

    try {
      const userLiked = currentLikes[user.uid];
      const updatedLikes = { ...currentLikes };
      
      if (userLiked) {
        delete updatedLikes[user.uid];
      } else {
        updatedLikes[user.uid] = {
          userName: user.displayName || user.email,
          timestamp: new Date().toISOString(),
        };
      }

      await update(ref(database, `posts/${postId}`), { likes: updatedLikes });
    } catch (error) {
      showError('Failed to update like: ' + error.message);
    }
  };

  const handleAddComment = async (postId) => {
    const comment = commentText[postId];
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    if (!comment?.trim()) return;

    try {
      const commentId = push(ref(database, `posts/${postId}/comments`)).key;
      const post = posts.find(p => p.id === postId);
      const currentComments = post.comments || {};
      const authorName = getUserFullName(userData || user);
      
      await update(ref(database, `posts/${postId}`), {
        comments: {
          ...currentComments,
          [commentId]: {
            id: commentId,
            text: comment,
            authorId: user.uid,
            authorName,
            createdAt: new Date().toISOString(),
          }
        }
      });

      // Send notification to post author (if not commenting on own post)
      if (post.authorId && post.authorId !== user.uid) {
        await sendNotification(
          post.authorId,
          NotificationTemplates.postCommented(post.title, authorName)
        );
      }

      setCommentText({ ...commentText, [postId]: '' });
      showSuccess('Comment added');
    } catch (error) {
      showError('Failed to add comment: ' + error.message);
    }
  };

  const handlePinPost = async (postId, currentPinned) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      await update(ref(database, `posts/${postId}`), {
        isPinned: !currentPinned,
        pinnedAt: !currentPinned ? new Date().toISOString() : null,
        pinnedBy: !currentPinned ? user.uid : null,
      });
      showSuccess(currentPinned ? 'Post unpinned' : 'Post pinned');
      handleCloseMenu();
    } catch (error) {
      showError('Failed to pin post: ' + error.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user?.uid) {
      showError('Your session expired. Please sign in again.');
      return;
    }

    try {
      await remove(ref(database, `posts/${postId}`));
      showSuccess('Post deleted successfully');
      handleCloseMenu();
    } catch (error) {
      showError('Failed to delete post: ' + error.message);
    }
  };

  const openEditPost = (post) => {
    setSelectedPost(post);
    setPostForm({
      title: post.title,
      content: post.content,
      visibility: post.visibility,
    });
    setPostDialog(true);
    handleCloseMenu();
  };

  const resetForm = () => {
    setPostForm({
      title: '',
      content: '',
      visibility: 'all',
    });
  };

  const handleOpenMenu = (event, post) => {
    setAnchorEl(event.currentTarget);
    setMenuPost(post);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuPost(null);
  };

  const toggleComments = (postId) => {
    setExpandedComments({
      ...expandedComments,
      [postId]: !expandedComments[postId]
    });
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const canView = post.visibility === 'all' || isAdmin || post.authorId === user?.uid;
    return matchesSearch && canView;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            {t('dashboard.newsPosts')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.latestAnnouncements')}
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedPost(null);
              setPostForm({ title: '', content: '', visibility: 'all' });
              setPostDialog(true);
            }}
            size="large"
          >
            {t('posts.createPost')}
          </Button>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder={t('common.search')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Alert severity="info">{t('common.noData')}</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filteredPosts.map((post) => (
            <Card key={post.id} elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'A'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="600">
                        {post.authorName || 'Admin'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(post.createdAt).toLocaleDateString()} • {new Date(post.createdAt).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center">
                    {post.isPinned && (
                      <Chip
                        icon={<PinIcon sx={{ fontSize: 16 }} />}
                        label={t('posts.pinned')}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    {isAdmin && (
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, post)}>
                        <MoreIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom fontWeight="bold">
                  {post.title}
                </Typography>
                
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" alignItems="center" gap={2}>
                  <Button
                    startIcon={<LikeIcon />}
                    color={post.likes && post.likes[user?.uid] ? 'primary' : 'inherit'}
                    onClick={() => handleLikePost(post.id, post.likes)}
                  >
                    {post.likes ? Object.keys(post.likes).length : 0} {t('ideas.like')}
                  </Button>
                  <Button
                    startIcon={<CommentIcon />}
                    color="inherit"
                    onClick={() => toggleComments(post.id)}
                  >
                    {post.comments ? Object.keys(post.comments).length : 0} {t('tasks.comments')}
                  </Button>
                </Box>

                <Collapse in={expandedComments[post.id]}>
                  <Box sx={{ mt: 2, bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
                    {/* Comments List */}
                    {post.comments && Object.values(post.comments).map((comment, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box display="flex" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {comment.userName?.charAt(0) || 'U'}
                          </Avatar>
                          <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 2, flex: 1 }}>
                            <Typography variant="subtitle2" fontSize={13}>
                              {comment.userName}
                            </Typography>
                            <Typography variant="body2">
                              {comment.text}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}

                    {/* Add Comment */}
                    <Box display="flex" gap={1} mt={2}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {userData?.firstName?.charAt(0) || user?.email?.charAt(0)}
                      </Avatar>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={t('posts.writeComment')}
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                size="small" 
                                onClick={() => handleAddComment(post.id)}
                                disabled={!commentText[post.id]?.trim()}
                              >
                                <SendIcon color="primary" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Post Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {isAdmin && (
          <MenuItem onClick={() => handlePinPost(menuPost?.id, menuPost?.isPinned)}>
            <PinIcon sx={{ mr: 1 }} fontSize="small" />
            {menuPost?.isPinned ? t('post.unpinPost') : t('post.pinPost')}
          </MenuItem>
        )}
        {(isAdmin || menuPost?.authorId === user?.uid) && (
          <MenuItem onClick={() => openEditPost(menuPost)}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            {t('common.edit')}
          </MenuItem>
        )}
        {(isAdmin || menuPost?.authorId === user?.uid) && (
          <MenuItem onClick={() => {
            handleCloseMenu();
            setConfirmDialog({ open: true, postId: menuPost?.id });
          }}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" color="error" />
            {t('common.delete')}
          </MenuItem>
        )}
      </Menu>

      {/* Post Dialog */}
      <Dialog open={postDialog} onClose={() => setPostDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedPost ? t('post.editPost') : t('post.createPostTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={t('post.title') + ' *'}
              value={postForm.title}
              onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('post.content') + ' *'}
              multiline
              rows={6}
              value={postForm.content}
              onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
            />
            <TextField
              fullWidth
              select
              label={t('post.visibility')}
              value={postForm.visibility}
              onChange={(e) => setPostForm({ ...postForm, visibility: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="all">{t('post.allUsers')}</option>
              <option value="admin">{t('post.adminOnly')}</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPostDialog(false);
            setSelectedPost(null);
            resetForm();
          }}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={handleSubmitPost}>
            {selectedPost ? t('common.update') : t('post.publish')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, postId: null })}
        onConfirm={() => {
          handleDeletePost(confirmDialog.postId);
          setConfirmDialog({ open: false, postId: null });
        }}
        title={t('post.deletePost')}
        message={t('post.deleteConfirmation')}
        confirmText={t('common.delete')}
        confirmColor="error"
        showWarningIcon
      />
    </Container>
  );
};

export default PostsPage;

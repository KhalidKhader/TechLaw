import React from 'react';
import { Avatar as MuiAvatar, useTheme, alpha } from '@mui/material';
import { getUserFullName } from '../../utils/helpers';

/**
 * Enhanced Avatar component that displays 2-letter initials from user's name
 * Features:
 * - Displays first 2 letters from username, firstName+lastName, or email
 * - Professional gradient background colors
 * - Clear, readable text with proper contrast
 * - Responsive sizing
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - User object with firstName, lastName, displayName, or email
 * @param {string} props.name - Full name (alternative to user object)
 * @param {string} props.username - Username (alternative identifier)
 * @param {number} props.size - Size in pixels (default: 40)
 * @param {string} props.bgcolor - Background color (optional, overrides generated color)
 */
const UserAvatar = ({ user, name, username, size = 40, bgcolor, ...props }) => {
  const theme = useTheme();
  
  const getInitials = () => {
    // Get the best available name
    const nameToUse = name || username || getUserFullName(user);

    // Return first 2 letters of the name
    return nameToUse.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '').substring(0, 2).toUpperCase();
  };

  const getGradientFromName = (str) => {
    if (!str) return { start: theme.palette.primary.main, end: theme.palette.primary.dark };
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Professional gradient color pairs
    const gradients = [
      { start: '#1E3A8A', end: '#3B82F6' }, // Blue
      { start: '#7C3AED', end: '#A78BFA' }, // Purple
      { start: '#059669', end: '#10B981' }, // Green
      { start: '#DC2626', end: '#F87171' }, // Red
      { start: '#0891B2', end: '#22D3EE' }, // Cyan
      { start: '#C026D3', end: '#E879F9' }, // Magenta
      { start: '#EA580C', end: '#FB923C' }, // Orange
      { start: '#0369A1', end: '#38BDF8' }, // Sky Blue
      { start: '#4F46E5', end: '#818CF8' }, // Indigo
      { start: '#15803D', end: '#4ADE80' }, // Emerald
      { start: '#BE123C', end: '#FB7185' }, // Rose
      { start: '#854D0E', end: '#FBBF24' }, // Amber
    ];
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  const initials = getInitials();
  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`.trim() 
    : user?.displayName || name || username || user?.email || 'User';
  
  const gradient = bgcolor ? null : getGradientFromName(fullName);
  const background = bgcolor 
    ? bgcolor 
    : `linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%)`;

  return (
    <MuiAvatar
      sx={{
        width: size,
        height: size,
        background: background,
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: '0.5px',
        boxShadow: `0 2px 8px ${alpha(gradient?.start || bgcolor || theme.palette.primary.main, 0.3)}`,
        border: `2px solid ${alpha('#FFFFFF', 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: `0 4px 12px ${alpha(gradient?.start || bgcolor || theme.palette.primary.main, 0.4)}`,
        },
        ...props.sx,
      }}
      {...props}
    >
      {initials}
    </MuiAvatar>
  );
};

export default UserAvatar;

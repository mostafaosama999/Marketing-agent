// src/components/layout/NotificationBell.tsx
// Bell icon with badge for CEO pending offer approvals

import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { getRelativeTimeString } from '../../services/api/notifications';

// Styled bell icon button matching navbar style
const NotificationIconButton = styled(IconButton)(() => ({
  color: 'white',
  padding: '8px',
  marginRight: '8px',
  borderRadius: '10px',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: 'translateY(-1px)',
  },
}));

// Styled popover menu
const StyledPopover = styled(Popover)(() => ({
  '& .MuiPaper-root': {
    borderRadius: '12px',
    marginTop: '8px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    minWidth: '320px',
    maxWidth: '400px',
    maxHeight: '450px',
    overflow: 'hidden',
  },
}));

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { pendingCount, allNotifications, isLoading } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (companyId: string) => {
    // Navigate directly to company page with offer tab open
    navigate(`/companies/${companyId}?tab=offer`);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <NotificationIconButton
        aria-describedby={id}
        onClick={handleClick}
        aria-label={`${pendingCount} pending offer approvals`}
      >
        <Badge
          badgeContent={pendingCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#ef4444',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: '1.4rem' }} />
        </Badge>
      </NotificationIconButton>

      <StyledPopover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              fontSize: '0.95rem',
            }}
          >
            Pending Offer Approvals
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#64748b',
              fontSize: '0.75rem',
            }}
          >
            {pendingCount === 0
              ? 'All caught up!'
              : `${pendingCount} company${pendingCount !== 1 ? 'ies' : ''} need${pendingCount === 1 ? 's' : ''} your approval`}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ maxHeight: '350px', overflowY: 'auto' }}>
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4,
              }}
            >
              <CircularProgress size={28} sx={{ color: '#667eea' }} />
            </Box>
          ) : allNotifications.length === 0 ? (
            <Box
              sx={{
                py: 4,
                px: 2,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                }}
              >
                No pending approvals
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {allNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  {index > 0 && <Divider sx={{ mx: 2 }} />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification.companyId)}
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'rgba(102, 126, 234, 0.06)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: notification.isChosen ? '#94a3b8' : '#1e293b',
                              fontSize: '0.875rem',
                              textDecoration: notification.isChosen ? 'line-through' : 'none',
                            }}
                          >
                            {notification.companyName}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            sx={{
                              color: notification.isChosen ? '#cbd5e1' : '#64748b',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            {notification.isChosen ? (
                              <>
                                <span style={{ color: '#10b981' }}>✓</span> Chosen {getRelativeTimeString(notification.pendingSince)}
                              </>
                            ) : (
                              <>Pending {getRelativeTimeString(notification.pendingSince)}</>
                            )}
                          </Typography>
                        }
                      />
                      {!notification.isChosen && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#667eea',
                            ml: 1,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </StyledPopover>
    </>
  );
};

export default NotificationBell;

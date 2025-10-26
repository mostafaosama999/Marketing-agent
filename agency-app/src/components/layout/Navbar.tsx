// src/components/layout/Navbar.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  IconButton,
  styled,
} from '@mui/material';
import {
  Logout,
  Dashboard,
  Assignment,
  Group,
  Analytics,
  TrendingUp,
  Business,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Styled Components for Modern Design
const ModernAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
}));

const ModernToolbar = styled(Toolbar)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  minHeight: '72px !important',
}));

const BrandText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'white',
  flexGrow: 1,
}));

const NavButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  textTransform: 'none',
  padding: '10px 16px',
  borderRadius: '8px',
  marginRight: '8px',
  color: 'white',
  minWidth: 'auto',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  
  ...(isActive && {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '-2px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '20px',
      height: '2px',
      backgroundColor: 'white',
      borderRadius: '1px',
    }
  }),
  
  '&:hover': {
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    transform: 'translateY(-1px)',
  },
  
  '& .MuiButton-startIcon': {
    marginRight: '6px',
    fontSize: '18px',
  },
}));

const RoleBadge = styled(Chip)(({ theme }) => ({
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  height: '28px',
  borderRadius: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  color: 'white',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  
  '& .MuiChip-label': {
    paddingLeft: '12px',
    paddingRight: '12px',
  },
}));

const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 36,
  height: 36,
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}));

const UserMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: '12px',
    marginTop: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    minWidth: '220px',
  },
  
  '& .MuiMenuItem-root': {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    padding: '12px 16px',
    borderRadius: '8px',
    margin: '4px 8px',
    
    '&:hover': {
      backgroundColor: 'rgba(102, 126, 234, 0.08)',
    },
  },
}));

const NavContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}));

const UserSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}));

const Navbar: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
  };

  const getNavItems = () => {
    if (!userProfile) return [];

    const items = [];

    // All roles can see Settings (moved to first position)
    items.push({ label: 'SETTINGS', path: '/settings', icon: Settings });

    // All roles can see Leads
    items.push({ label: 'LEADS', path: '/', icon: Dashboard });

    // All roles can see Companies
    items.push({ label: 'COMPANIES', path: '/companies', icon: Business });

    // Managers, CEOs, and Marketing Analysts can see Team
    if (userProfile.role === 'Manager' || userProfile.role === 'CEO' || userProfile.role === 'Marketing Analyst') {
      items.push({ label: 'TEAM', path: '/team', icon: Group });
    }

    // All roles can see Analytics
    items.push({ label: 'ANALYTICS', path: '/analytics', icon: TrendingUp });

    // Managers, CEOs, and Marketing Analysts can see Monitoring
    if (userProfile.role === 'Manager' || userProfile.role === 'CEO' || userProfile.role === 'Marketing Analyst') {
      items.push({ label: 'MONITORING', path: '/monitoring', icon: Analytics });
    }

    // Writers see their specific dashboard
    if (userProfile.role === 'Writer') {
      items.push({ label: 'MY TASKS', path: '/writer', icon: Assignment });
    }

    return items;
  };

  if (!userProfile) return null;

  return (
    <ModernAppBar position="static" elevation={0}>
      <ModernToolbar>
        <BrandText variant="h6">
          Agency Platform
        </BrandText>

        {/* Navigation Items */}
        <NavContainer>
          {getNavItems().map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavButton
                key={item.path}
                isActive={isActive}
                startIcon={<Icon />}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </NavButton>
            );
          })}
        </NavContainer>

        {/* User Section */}
        <UserSection>
          <RoleBadge
            label={userProfile.role}
            size="small"
          />
          
          <IconButton
            onClick={handleMenuClick}
            sx={{ padding: 0 }}
          >
            <UserAvatar>
              {userProfile.displayName?.charAt(0) || userProfile.email.charAt(0).toUpperCase()}
            </UserAvatar>
          </IconButton>
        </UserSection>

        {/* User Menu Dropdown */}
        <UserMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled sx={{ opacity: '1 !important', cursor: 'default' }}>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1e293b'
                }}
              >
                {userProfile.displayName || 'User'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 400
                }}
              >
                {userProfile.email}
              </Typography>
            </Box>
          </MenuItem>

          <MenuItem
            onClick={handleLogout}
            sx={{
              color: '#ef4444',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.08) !important',
              }
            }}
          >
            <Logout sx={{ mr: 2, fontSize: '18px' }} />
            Sign Out
          </MenuItem>
        </UserMenu>
      </ModernToolbar>
    </ModernAppBar>
  );
};

export default Navbar;
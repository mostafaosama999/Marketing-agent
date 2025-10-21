// src/pages/team/TeamManagement.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Grid,
  LinearProgress,
  Divider,
  Menu,
  MenuItem,
  ThemeProvider,
  createTheme,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  CalendarMonth as CalendarIcon,
  LocalOffer as TagIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { db } from '../../services/firebase/firestore';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import AddWriterModal from './AddWriterModal';
import EditWriterModal from './EditWriterModal';
import { useAuth } from '../../contexts/AuthContext';

// Modern theme with Inter font
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '32px',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '20px',
      lineHeight: 1.3,
    },
    h6: {
      fontWeight: 600,
      fontSize: '18px',
      lineHeight: 1.3,
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: '16px',
      lineHeight: 1.5,
      color: '#64748b',
    },
    body1: {
      fontWeight: 500,
      fontSize: '14px',
      lineHeight: 1.5,
    },
    body2: {
      fontWeight: 400,
      fontSize: '14px',
      lineHeight: 1.4,
      color: '#64748b',
    },
    caption: {
      fontWeight: 400,
      fontSize: '12px',
      lineHeight: 1.4,
      color: '#94a3b8',
    },
  },
  palette: {
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#64748b',
    },
  },
});

interface CompensationStructure {
  type: 'salary' | 'commission';
  baseSalary?: number;
  commissionRate?: number;
  bonusStructure?: number;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  department?: string;
  phoneNumber?: string;
  joinDate?: string;
  specialties?: string[];
  compensation?: CompensationStructure;
  performance?: {
    leadsConverted: number;
    conversionRate: number;
    pipelineValue: number;
  };
}

const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User))
        .filter(user => user.role !== 'CEO');
      
      usersData.sort((a, b) => {
        const roleOrder = { 'Sales Manager': 1, 'Sales Representative': 2 };
        const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 3;
        const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 3;

        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.displayName || a.email).localeCompare(b.displayName || b.email);
      });
      
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTeamMemberClick = (user: User) => {
    if (user.role === 'Sales Representative' || user.role === 'Sales Manager') {
      navigate(`/team-member/${user.id}`);
    }
  };

  const handleAddWriter = () => {
    setOpenAddModal(true);
  };

  const handleEditWriter = (user: User) => {
    setSelectedUser(user);
    setOpenEditModal(true);
    handleMenuClose();
  };

  const handleDeleteWriter = async (user: User) => {
    if (window.confirm(`Are you sure you want to remove ${user.displayName || user.email} from the team?`)) {
      try {
        await deleteDoc(doc(db, 'users', user.id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
    handleMenuClose();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuUser(null);
  };

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'Sales Manager': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'Sales Representative': return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
      default: return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
  };

  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'Sales Manager': return {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: '#92400e',
        fontWeight: 600,
      };
      case 'Sales Representative': return {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: '#1e40af',
        fontWeight: 600,
      };
      default: return {
        background: '#f1f5f9',
        color: '#475569',
        fontWeight: 600,
      };
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return { color: '#059669', bg: '#dcfce7' };
    if (score >= 70) return { color: '#d97706', bg: '#fef3c7' };
    return { color: '#dc2626', bg: '#fee2e2' };
  };

  const formatCompensation = (compensation?: CompensationStructure) => {
    if (!compensation) return null;

    if (compensation.type === 'salary') {
      const parts = [];
      if (compensation.baseSalary && compensation.baseSalary > 0) {
        parts.push(`$${compensation.baseSalary.toLocaleString()}/yr`);
      }
      if (compensation.bonusStructure && compensation.bonusStructure > 0) {
        parts.push(`+$${compensation.bonusStructure.toLocaleString()} bonus`);
      }
      return parts.join(' ');
    } else {
      return compensation.commissionRate ? `${compensation.commissionRate}% commission` : null;
    }
  };

  // Calculate team stats
  const salesReps = users.filter(user => user.role === 'Sales Representative');
  const managers = users.filter(user => user.role === 'Sales Manager');
  const avgConversionRate = salesReps.length > 0
    ? salesReps.reduce((sum, rep) => sum + (rep.performance?.conversionRate || 0), 0) / salesReps.length
    : 0;

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">Loading team...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '100vh',
        p: 4
      }}>
        {/* Modern Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          mb: 6 
        }}>
          <Box>
            <Typography variant="h4" sx={{ 
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 1
            }}>
              Team Management
            </Typography>
            <Typography variant="subtitle1">
              Manage your sales team and track performance
            </Typography>
          </Box>
          
          {userProfile?.role === 'CEO' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddWriter}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: 3,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Add Team Member
            </Button>
          )}
        </Box>

        {/* KPI Summary Cards */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(59, 130, 246, 0.1)',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
                transform: 'translateY(-4px)',
              }
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: 3,
                  p: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}>
                  <EditIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{
                  fontWeight: 800,
                  color: '#1e293b',
                  fontSize: '36px',
                  mb: 1
                }}>
                  {salesReps.length}
                </Typography>
                <Typography variant="body2" sx={{
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Sales Reps
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(245, 158, 11, 0.1)',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
                transform: 'translateY(-4px)',
              }
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: 3,
                  p: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}>
                  <BusinessIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 800,
                  color: '#1e293b',
                  fontSize: '36px',
                  mb: 1
                }}>
                  {managers.length}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Managers
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(34, 197, 94, 0.1)',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.15)',
                transform: 'translateY(-4px)',
              }
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: 3,
                  p: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}>
                  <TrendingUpIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{
                  fontWeight: 800,
                  color: '#1e293b',
                  fontSize: '36px',
                  mb: 1
                }}>
                  {avgConversionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Avg Conversion Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(139, 92, 246, 0.1)',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
                transform: 'translateY(-4px)',
              }
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: 3,
                  p: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                }}>
                  <AssignmentIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 800,
                  color: '#1e293b',
                  fontSize: '36px',
                  mb: 1
                }}>
                  {users.length}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Team
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Team Members Grid */}
        <Grid container spacing={4}>
          {users.map((user) => (
            <Grid key={user.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card 
                sx={{ 
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 4,
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: (user.role === 'Sales Representative' || user.role === 'Sales Manager') ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': (user.role === 'Sales Representative' || user.role === 'Sales Manager') ? {
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-6px)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                  } : {},
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: getAvatarColor(user.role),
                  }
                }}
                onClick={() => handleTeamMemberClick(user)}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* User Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Avatar sx={{ 
                        width: 56, 
                        height: 56,
                        background: getAvatarColor(user.role),
                        fontSize: '20px',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}>
                        {(user.displayName || user.email).charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ 
                          color: '#1e293b',
                          fontWeight: 700,
                          mb: 1,
                          fontSize: '18px'
                        }}>
                          {user.displayName || 'Unknown'}
                        </Typography>
                        <Chip
                          label={user.role}
                          size="small"
                          sx={{
                            ...getRoleChipColor(user.role),
                            fontSize: '12px',
                            height: 24,
                            borderRadius: 6,
                            border: 'none',
                            '& .MuiChip-label': {
                              px: 2
                            }
                          }}
                        />
                      </Box>
                    </Box>
                    
                    {userProfile?.role === 'CEO' && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuClick(e, user);
                        }}
                        sx={{
                          color: '#94a3b8',
                          '&:hover': {
                            color: '#64748b',
                            background: 'rgba(148, 163, 184, 0.1)'
                          }
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>

                  {/* Contact Info */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <EmailIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '14px' }}>
                        {user.email}
                      </Typography>
                    </Box>
                    {user.department && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <BusinessIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '14px' }}>
                          {user.department}
                        </Typography>
                      </Box>
                    )}
                    {user.joinDate && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '14px' }}>
                          Joined {new Date(user.joinDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ mb: 3, borderColor: 'rgba(226, 232, 240, 0.8)' }} />

                  {/* Compensation - Only for Sales Reps and Managers, and only visible to CEOs */}
                  {(user.role === 'Sales Representative' || user.role === 'Sales Manager') && userProfile?.role === 'CEO' && user.compensation && formatCompensation(user.compensation) && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <MoneyIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ 
                          color: '#475569',
                          fontSize: '13px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Compensation
                        </Typography>
                      </Box>
                      <Chip
                        label={formatCompensation(user.compensation)}
                        size="small"
                        sx={{
                          background: '#dcfce7',
                          color: '#059669',
                          fontSize: '12px',
                          height: 24,
                          borderRadius: 6,
                          border: 'none',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  )}

                  {/* Specialties */}
                  {user.specialties && user.specialties.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <TagIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                        <Typography variant="body2" sx={{ 
                          color: '#475569',
                          fontSize: '13px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Specialties
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {user.specialties.slice(0, 3).map((specialty, idx) => (
                          <Chip
                            key={idx}
                            label={specialty}
                            size="small"
                            sx={{
                              background: '#f1f5f9',
                              color: '#475569',
                              fontSize: '11px',
                              height: 22,
                              borderRadius: 4,
                              border: 'none',
                              fontWeight: 500,
                              '& .MuiChip-label': {
                                px: 1.5
                              }
                            }}
                          />
                        ))}
                        {user.specialties.length > 3 && (
                          <Chip
                            label={`+${user.specialties.length - 3} more`}
                            size="small"
                            sx={{
                              background: '#e2e8f0',
                              color: '#64748b',
                              fontSize: '11px',
                              height: 22,
                              borderRadius: 4,
                              border: 'none',
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Performance Stats (for Sales Reps) */}
                  {user.role === 'Sales Representative' && user.performance && (
                    <Box>
                      <Typography variant="body2" sx={{ 
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 2
                      }}>
                        Performance
                      </Typography>
                      
                      {/* Conversion Rate */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StarIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '12px' }}>
                              Conversion Rate
                            </Typography>
                          </Box>
                          <Chip
                            label={`${user.performance.conversionRate}%`}
                            size="small"
                            sx={{
                              background: getPerformanceColor(user.performance.conversionRate).bg,
                              color: getPerformanceColor(user.performance.conversionRate).color,
                              fontSize: '11px',
                              height: 22,
                              borderRadius: 4,
                              border: 'none',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={user.performance.conversionRate}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#f1f5f9',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getPerformanceColor(user.performance.conversionRate).color,
                              borderRadius: 3,
                            }
                          }}
                        />
                      </Box>

                      {/* Stats Grid */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                            Leads Converted
                          </Typography>
                          <Typography variant="body1" sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '16px'
                          }}>
                            {user.performance.leadsConverted}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                            Pipeline Value
                          </Typography>
                          <Typography variant="body1" sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '16px'
                          }}>
                            ${user.performance.pipelineValue?.toLocaleString() || 0}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Click hint for sales reps and managers */}
                  {(user.role === 'Sales Representative' || user.role === 'Sales Manager') && (
                    <Box sx={{ 
                      mt: 3, 
                      pt: 3, 
                      borderTop: '1px solid rgba(226, 232, 240, 0.8)',
                      textAlign: 'center'
                    }}>
                      <Typography variant="caption" sx={{
                        color: '#3b82f6',
                        fontSize: '11px',
                        fontWeight: 500,
                        opacity: 0.8
                      }}>
                        Click to view performance details →
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {users.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 12,
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 4,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <AssignmentIcon sx={{ 
              fontSize: 64, 
              color: '#cbd5e1',
              mb: 3
            }} />
            <Typography variant="h6" sx={{ 
              color: '#475569',
              fontWeight: 600,
              mb: 1
            }}>
              No team members yet
            </Typography>
            <Typography variant="body2" sx={{
              color: '#64748b',
              mb: 4,
              maxWidth: 400,
              mx: 'auto'
            }}>
              Add sales representatives and managers to start building your team
            </Typography>
            {userProfile?.role === 'CEO' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddWriter}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                Add Your First Team Member
              </Button>
            )}
          </Box>
        )}

        {/* User Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              mt: 1,
            }
          }}
        >
          <MenuItem 
            onClick={() => handleEditWriter(menuUser!)}
            sx={{
              py: 1.5,
              px: 2,
              '&:hover': {
                background: '#f8fafc'
              }
            }}
          >
            <EditIcon sx={{ mr: 2, fontSize: 18, color: '#64748b' }} />
            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Edit User</Typography>
          </MenuItem>
          {menuUser?.role !== 'CEO' && (
            <MenuItem 
              onClick={() => handleDeleteWriter(menuUser!)}
              sx={{ 
                py: 1.5,
                px: 2,
                color: '#dc2626',
                '&:hover': {
                  background: '#fef2f2'
                }
              }}
            >
              <DeleteIcon sx={{ mr: 2, fontSize: 18 }} />
              <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Remove User</Typography>
            </MenuItem>
          )}
        </Menu>

        {/* Modals */}
        <AddWriterModal
          open={openAddModal}
          onClose={() => setOpenAddModal(false)}
        />

        <EditWriterModal
          open={openEditModal}
          user={selectedUser}
          onClose={() => {
            setOpenEditModal(false);
            setSelectedUser(null);
          }}
        />
      </Box>
    </ThemeProvider>
  );
};

export default TeamManagement;
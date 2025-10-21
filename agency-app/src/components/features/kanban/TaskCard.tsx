// src/components/features/kanban/TaskCard.tsx
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import {
  Article as BlogIcon,
  School as TutorialIcon,
  TrendingUp as OnboardingIcon,
} from '@mui/icons-material';
import { Ticket } from '../../../types';
import { Client, ClientCompensation } from '../../../types/client';
import { UserProfile } from '../../../types/auth';
import { isClientOnboarding, isWriterOnboarding, getClientByName, getUserByDisplayName } from '../../../utils/onboarding';

interface TaskCardProps {
  task: Ticket;
  onDragStart: (e: any, task: Ticket) => void;
  onTaskClick: (task: Ticket) => void;
  userProfile: any;
  columnId: string;
  clients?: Client[];
  users?: UserProfile[];
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDragStart,
  onTaskClick,
  userProfile,
  columnId,
  clients = [],
  users = []
}) => {
  // Check if this is an onboarding ticket
  const taskClient = getClientByName(clients, task.clientName);
  const taskWriter = getUserByDisplayName(users, task.assignedTo || '');
  const isClientOnboardingTicket = taskClient ? isClientOnboarding(taskClient) : false;
  const isWriterOnboardingTicket = taskWriter ? isWriterOnboarding(taskWriter) : false;
  const isOnboarding = isClientOnboardingTicket || isWriterOnboardingTicket;
  // Task type configuration (simplified to only blog and tutorial)
  const getTaskTypeInfo = (type: string) => {
    const typeMap: { [key: string]: { icon: any, color: string, label: string } } = {
      'blog': { icon: BlogIcon, color: '#3b82f6', label: 'Blog' },
      'tutorial': { icon: TutorialIcon, color: '#8b5cf6', label: 'Tutorial' },
    };
    return typeMap[type] || typeMap['blog'];
  };

  // Legacy function removed - manager scores now tracked in reviewHistory

  // Calculate days in current state - includes cumulative time across multiple entries
  const getDaysInCurrentState = (task: any): number => {
    const now = new Date();
    let currentSessionDays = 0;
    let cumulativeDays = 0;

    // Get cumulative time from stateDurations if available
    if (task.stateDurations && typeof task.stateDurations[task.status] === 'number') {
      cumulativeDays = task.stateDurations[task.status];
    }

    // Calculate current session time
    let stateStartDate: Date | null = null;

    // PRIMARY: Use timeline state history if available
    if (task.stateHistory && task.stateHistory[task.status]) {
      stateStartDate = new Date(task.stateHistory[task.status]);
    }
    // FALLBACK: Legacy logic for old tasks without timeline data
    else {
      if (task.status === 'todo' && task.createdAt) {
        // For backlog, use creation date
        if (task.createdAt.toDate && typeof task.createdAt.toDate === 'function') {
          stateStartDate = task.createdAt.toDate();
        } else if (task.createdAt instanceof Date) {
          stateStartDate = task.createdAt;
        } else if (typeof task.createdAt === 'string') {
          stateStartDate = new Date(task.createdAt);
        }
      } else if (task.status === 'internal_review' && task.enteredReviewAt) {
        // For review state, use enteredReviewAt
        stateStartDate = new Date(task.enteredReviewAt);
      } else if (task.updatedAt) {
        // For other states, use last update date as approximation
        if (task.updatedAt.toDate && typeof task.updatedAt.toDate === 'function') {
          stateStartDate = task.updatedAt.toDate();
        } else if (task.updatedAt instanceof Date) {
          stateStartDate = task.updatedAt;
        } else if (typeof task.updatedAt === 'string') {
          stateStartDate = new Date(task.updatedAt);
        }
      }
    }

    // Calculate current session days if we have a start date
    if (stateStartDate) {
      const diffTime = now.getTime() - stateStartDate.getTime();
      currentSessionDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // Return total: cumulative + current session, ensuring no NaN values
    const total = (cumulativeDays || 0) + (currentSessionDays || 0);
    return Math.max(0, isNaN(total) ? 0 : total);
  };

  // Get color for state duration indicator
  const getStateDurationColor = (days: number, status: string): string => {
    // Special rules for done and invoiced columns
    if (status === 'done' || status === 'invoiced') {
      if (days < 10) return 'transparent'; // Hide indicator for less than 10 days
      if (days <= 20) return '#10b981'; // Green: 10-20 days
      if (days <= 30) return '#f59e0b'; // Orange: 20-30 days
      return '#ef4444'; // Red: 30+ days
    }
    
    // Default rules for other columns
    if (days <= 3) return '#10b981'; // Green
    if (days <= 7) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const typeInfo = getTaskTypeInfo(task.type);
  const TypeIcon = typeInfo.icon;
  const daysInState = getDaysInCurrentState(task);

  // Calculate revenue using hierarchy: actualRevenue OR client compensation rate
  const calculateRevenue = (): number => {
    // Priority 1: Check actualRevenue if it exists and is > 0
    if (task.actualRevenue && task.actualRevenue > 0) {
      return task.actualRevenue;
    }

    // Priority 2: Fall back to client compensation rates
    if (taskClient?.compensation && task.type) {
      const typeRateMap: { [key: string]: keyof ClientCompensation } = {
        'blog': 'blogRate',
        'tutorial': 'tutorialRate',
        'case-study': 'caseStudyRate',
        'whitepaper': 'whitepaperRate',
        'social-media': 'socialMediaRate',
        'email': 'emailRate',
        'landing-page': 'landingPageRate',
        'other': 'otherRate'
      };

      const rateField = typeRateMap[task.type];
      if (rateField && taskClient.compensation[rateField]) {
        return Number(taskClient.compensation[rateField]);
      }
    }

    return 0;
  };

  const taskRevenue = calculateRevenue();

  return (
    <Box
      draggable={userProfile?.role !== 'Writer'}
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onTaskClick(task)}
      sx={{
        background: isOnboarding
          ? 'linear-gradient(to bottom right, rgba(6, 182, 212, 0.03), rgba(8, 145, 178, 0.02))'
          : 'white',
        borderRadius: 2.5,
        p: 3,
        cursor: 'pointer',
        border: isOnboarding
          ? '2px solid transparent'
          : '1px solid #e2e8f0',
        backgroundImage: isOnboarding
          ? 'linear-gradient(white, white), linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
          : 'none',
        backgroundOrigin: 'border-box',
        backgroundClip: isOnboarding ? 'padding-box, border-box' : 'unset',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        flexShrink: 0,
        boxShadow: isOnboarding
          ? '0 0 20px rgba(6, 182, 212, 0.15)'
          : 'none',
        '&:hover': {
          boxShadow: isOnboarding
            ? '0 20px 25px -5px rgba(6, 182, 212, 0.2), 0 10px 10px -5px rgba(6, 182, 212, 0.1)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: 'translateY(-2px)',
          borderColor: isOnboarding ? 'transparent' : '#667eea',
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
        opacity: userProfile?.role === 'Writer' && task.assignedTo !== userProfile.displayName ? 0.6 : 1,
      }}
    >
      {/* Priority Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderRadius: '8px 8px 0 0',
          background: 
            task.priority === 'high' ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
            task.priority === 'medium' ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
            'linear-gradient(90deg, #10b981, #059669)'
        }}
      />

      {/* State Duration Indicator - Show for all states except 'paid', with special rules for done/invoiced */}
      {task.status !== 'paid' && (() => {
        const indicatorColor = getStateDurationColor(daysInState, task.status);
        const shouldShow = indicatorColor !== 'transparent';
        
        return shouldShow ? (
          <Tooltip title={`${daysInState} day${daysInState !== 1 ? 's' : ''} total in ${task.status?.replace('_', ' ') || 'current state'}`} arrow>
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: indicatorColor,
                color: 'white',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                boxShadow: `0 2px 4px ${indicatorColor}40`,
              }}
            >
              {daysInState}
            </Box>
          </Tooltip>
        ) : null;
      })()}

      {/* Onboarding Badge */}
      {isOnboarding && (
        <Tooltip
          title={
            isClientOnboardingTicket && isWriterOnboardingTicket
              ? `Client and writer onboarding`
              : isClientOnboardingTicket
              ? `Client onboarding (${task.clientName})`
              : `Writer onboarding (${task.assignedTo})`
          }
          arrow
        >
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: 'white',
              borderRadius: '8px',
              px: 1.5,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
            }}
          >
            <OnboardingIcon sx={{ fontSize: 12 }} />
            Onboarding
          </Box>
        </Tooltip>
      )}

      {/* Task Type */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mr: 4 }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${typeInfo.color}20, ${typeInfo.color}10)`,
            border: `1px solid ${typeInfo.color}40`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TypeIcon sx={{ fontSize: 16, color: typeInfo.color }} />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: typeInfo.color,
            fontWeight: 600,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {typeInfo.label}
        </Typography>
      </Box>

      {/* Task Title */}
      <Typography variant="body1" sx={{ 
        fontWeight: 600, 
        color: '#1e293b',
        mb: 1.5,
        lineHeight: 1.4
      }}>
        {task.title}
      </Typography>

      {/* Task Description */}
      {task.description && (
        <Box sx={{ 
          color: '#64748b', 
          mb: 3,
          lineHeight: 1.5,
          fontSize: '13px',
          '& h1': {
            fontSize: '16px',
            fontWeight: 700,
            margin: '8px 0 4px 0',
            lineHeight: 1.3,
            color: '#64748b',
          },
          '& h2': {
            fontSize: '15px',
            fontWeight: 600,
            margin: '6px 0 3px 0',
            lineHeight: 1.3,
            color: '#64748b',
          },
          '& h3': {
            fontSize: '14px',
            fontWeight: 600,
            margin: '4px 0 2px 0',
            lineHeight: 1.3,
            color: '#64748b',
          },
          '& h4': {
            fontSize: '13px',
            fontWeight: 600,
            margin: '4px 0 2px 0',
            lineHeight: 1.3,
            color: '#64748b',
          },
          '& p': {
            margin: '4px 0',
            lineHeight: 1.5,
            color: '#64748b',
            fontSize: '13px',
          },
          '& ul, & ol': {
            margin: '4px 0',
            paddingLeft: '16px',
          },
          '& li': {
            margin: '2px 0',
            lineHeight: 1.4,
            fontSize: '13px',
          },
          '& blockquote': {
            borderLeft: '2px solid #e2e8f0',
            padding: '4px 8px',
            margin: '4px 0',
            fontStyle: 'italic',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '0 2px 2px 0',
          },
          '& strong': {
            fontWeight: 600,
          },
          '& em': {
            fontStyle: 'italic',
          },
          '& u': {
            textDecoration: 'underline',
          },
        }}>
          {task.description.includes('<') && task.description.includes('>') ? (
            <div dangerouslySetInnerHTML={{ __html: task.description }} />
          ) : (
            <Typography variant="body2" sx={{ fontSize: '13px', color: '#64748b' }}>
              {task.description}
            </Typography>
          )}
        </Box>
      )}

      {/* Bottom Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Client & Assignment Info */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              }}
            />
            <Typography variant="caption" sx={{ 
              color: '#64748b',
              fontWeight: 500,
              fontSize: '11px'
            }}>
              {task.clientName}
            </Typography>
          </Box>
          
          {task.assignedTo && (
            <Typography variant="caption" sx={{ 
              color: '#94a3b8',
              fontSize: '11px',
              display: 'block'
            }}>
              Writer: {task.assignedTo}
            </Typography>
          )}
          
          {task.reviewedBy && (
            <Typography variant="caption" sx={{ 
              color: '#94a3b8',
              fontSize: '11px',
              display: 'block'
            }}>
              Reviewer: {task.reviewedBy}
            </Typography>
          )}
          
          {task.dueDate && (
            <Typography variant="caption" sx={{ 
              color: '#94a3b8',
              fontSize: '11px'
            }}>
              {new Date(typeof task.dueDate === 'object' && (task.dueDate as any).seconds ? (task.dueDate as any).seconds * 1000 : task.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Typography>
          )}
        </Box>

        {/* Assignee Avatar */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          {task.assignedTo?.charAt(0)?.toUpperCase() || 'U'}
        </Box>
      </Box>

      {/* Cost Information for CEO only */}
      {userProfile?.role === 'CEO' && task.totalCost && (
        <Box sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <Typography variant="body1" sx={{
            fontWeight: 700,
            color: '#059669',
            fontSize: '14px'
          }}>
            Cost: ${task.totalCost.toFixed(2)}
          </Typography>
        </Box>
      )}

      {/* Revenue for CEO only */}
      {userProfile?.role === 'CEO' && (columnId === 'invoiced' || columnId === 'paid') && taskRevenue > 0 && (
        <Box sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <Typography variant="body1" sx={{
            fontWeight: 700,
            color: '#059669',
            fontSize: '16px'
          }}>
            ${taskRevenue.toLocaleString()}
          </Typography>
          <Typography variant="caption" sx={{
            color: '#64748b',
            textTransform: 'uppercase',
            fontSize: '10px',
            letterSpacing: '0.05em'
          }}>
            {columnId}
          </Typography>
        </Box>
      )}

      {/* Review Button */}
      {columnId === 'internal_review' && (userProfile?.role === 'Manager' || userProfile?.role === 'CEO') && (
        <Box sx={{ mt: 2 }}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/review/${task.id}`;
            }}
            sx={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              p: 1.5,
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.025em',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
              }
            }}
          >
            Review Article
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TaskCard;
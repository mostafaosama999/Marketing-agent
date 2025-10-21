// src/components/features/kanban/KanbanColumn.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TaskCard from './TaskCard';
import { Client } from '../../../types/client';
import { UserProfile } from '../../../types/auth';

interface Column {
  id: string;
  title: string;
  icon: string;
  color: string;
  headerColor: string;
  count: number;
}

interface KanbanColumnProps {
  column: Column;
  tasks: any[];
  onDragOver: (e: any) => void;
  onDrop: (e: any, columnId: string) => void;
  onDragStart: (e: any, task: any) => void;
  onTaskClick: (task: any) => void;
  onAddTask: () => void;
  userProfile: any;
  clients?: Client[];
  users?: UserProfile[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onDragOver,
  onDrop,
  onDragStart,
  onTaskClick,
  onAddTask,
  userProfile,
  clients = [],
  users = []
}) => {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        minWidth: 280,
        maxWidth: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <Box
        sx={{
          background: column.headerColor,
          color: 'white',
          p: 3,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
          <Typography sx={{ fontSize: '18px' }}>
            {column.icon}
          </Typography>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            {column.title}
          </Typography>
        </Box>
        
        <Box sx={{ 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          px: 2,
          py: 0.5,
          zIndex: 1,
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="caption" sx={{ 
            color: 'white',
            fontWeight: 600,
            fontSize: '12px'
          }}>
            {column.count}
          </Typography>
        </Box>
      </Box>

      {/* Tasks Container */}
      <Box
        sx={{
          flex: 1,
          p: 3,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          background: '#fafafa',
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 3,
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        {/* Add Task Button */}
        {column.id === 'todo' && (userProfile?.role === 'Manager' || userProfile?.role === 'CEO') && (
          <Box
            onClick={onAddTask}
            sx={{
              border: '2px dashed #e2e8f0',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              color: '#64748b',
              background: 'rgba(255, 255, 255, 0.5)',
              flexShrink: 0,
              '&:hover': {
                borderColor: '#667eea',
                background: 'rgba(102, 126, 234, 0.05)',
                color: '#667eea',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <AddIcon sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Add new task
            </Typography>
          </Box>
        )}

        {/* Task Cards */}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onTaskClick={onTaskClick}
            userProfile={userProfile}
            columnId={column.id}
            clients={clients}
            users={users}
          />
        ))}
      </Box>
    </Box>
  );
};

export default KanbanColumn;
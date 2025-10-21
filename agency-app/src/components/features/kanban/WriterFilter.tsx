// src/components/features/kanban/WriterFilter.tsx
import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { db } from '../../../services/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';

interface WriterFilterProps {
  selectedWriter: string;
  onWriterChange: (writer: string) => void;
}

interface User {
  id: string;
  displayName: string;
  role: string;
}

const WriterFilter: React.FC<WriterFilterProps> = ({
  selectedWriter,
  onWriterChange,
}) => {
  const [writers, setWriters] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const writersData: User[] = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName || doc.data().email || 'Unknown',
          role: doc.data().role || '',
        }))
        .filter(user => user.role === 'Writer' || user.role === 'Manager')
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setWriters(writersData);
    } catch (error) {
      console.error('Error fetching writers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    onWriterChange(event.target.value);
  };

  const getSelectedWriterInfo = () => {
    const writer = writers.find(w => w.displayName === selectedWriter);
    return writer;
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Assigned Writer</InputLabel>
        <Select
          value={selectedWriter}
          label="Filter by Assigned Writer"
          onChange={handleChange}
          disabled={loading}
          renderValue={(value) => {
            if (!value) return 'All Assigned Writers';
            const writer = getSelectedWriterInfo();
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: writer?.role === 'Manager' 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {value.charAt(0).toUpperCase()}
                </Box>
                <Typography variant="body2">{value}</Typography>
              </Box>
            );
          }}
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
        >
          <MenuItem value="">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="All"
                size="small"
                variant="outlined"
                sx={{
                  color: '#667eea',
                  borderColor: '#667eea',
                }}
              />
              <Typography>All Writers</Typography>
            </Box>
          </MenuItem>
          {writers.map((writer) => (
            <MenuItem key={writer.id} value={writer.displayName}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: writer.role === 'Manager' 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {writer.displayName.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {writer.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {writer.role}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default WriterFilter;
// src/components/features/kanban/ClientFilter.tsx
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

interface ClientFilterProps {
  selectedClient: string;
  onClientChange: (client: string) => void;
}

interface Client {
  id: string;
  name: string;
}

const ClientFilter: React.FC<ClientFilterProps> = ({
  selectedClient,
  onClientChange,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData: Client[] = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown Client',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    onClientChange(event.target.value);
  };

  const getSelectedClientInfo = () => {
    const client = clients.find(c => c.name === selectedClient);
    return client;
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Client</InputLabel>
        <Select
          value={selectedClient}
          label="Filter by Client"
          onChange={handleChange}
          disabled={loading}
          renderValue={(value) => {
            if (!value) return 'All Clients';
            const client = getSelectedClientInfo();
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
              <Typography>All Clients</Typography>
            </Box>
          </MenuItem>
          {clients.map((client) => (
            <MenuItem key={client.id} value={client.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {client.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Client
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

export default ClientFilter;
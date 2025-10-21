// src/components/features/kanban/PricingModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { Client } from '../../../types';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (actualRevenue: number) => void;
  task: any;
  columnTitle: string; // 'Invoiced' or 'Paid'
}

const PricingModal: React.FC<PricingModalProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  task, 
  columnTitle 
}) => {
  const [actualRevenue, setActualRevenue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [clientData, setClientData] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Fetch client compensation data and pre-fill
  useEffect(() => {
    if (task && open && task.clientName) {
      fetchClientCompensation();
    }
  }, [task, open]);

  const fetchClientCompensation = async () => {
    try {
      setLoadingClient(true);
      const clientsRef = collection(db, 'clients');
      const clientQuery = query(clientsRef, where('name', '==', task.clientName));
      const clientSnapshot = await getDocs(clientQuery);
      
      if (!clientSnapshot.empty) {
        const clientDoc = clientSnapshot.docs[0];
        const client = { id: clientDoc.id, ...clientDoc.data() } as Client;
        setClientData(client);
        
        // Auto-fill with client's compensation rate for this task type
        if (client.compensation && task.type) {
          let rate = 0;
          
          switch (task.type) {
            case 'blog':
              rate = client.compensation.blogRate || 0;
              break;
            case 'tutorial':
              rate = client.compensation.tutorialRate || 0;
              break;
            default:
              rate = 0;
          }
          
          if (rate > 0) {
            setActualRevenue(rate.toString());
            setAutoFilled(true);
          } else {
            // Fallback to existing revenue values
            const existingRevenue = task.actualRevenue || task.estimatedRevenue || '';
            setActualRevenue(existingRevenue.toString());
            setAutoFilled(false);
          }
        } else {
          // No client compensation, use existing values
          const existingRevenue = task.actualRevenue || task.estimatedRevenue || '';
          setActualRevenue(existingRevenue.toString());
          setAutoFilled(false);
        }
      } else {
        // Client not found, use existing values
        const existingRevenue = task.actualRevenue || task.estimatedRevenue || '';
        setActualRevenue(existingRevenue.toString());
        setAutoFilled(false);
      }
    } catch (error) {
      console.error('Error fetching client compensation:', error);
      // Fallback to existing values on error
      const existingRevenue = task.actualRevenue || task.estimatedRevenue || '';
      setActualRevenue(existingRevenue.toString());
      setAutoFilled(false);
    } finally {
      setLoadingClient(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const revenue = parseFloat(actualRevenue);
    
    if (isNaN(revenue) || revenue < 0) {
      setError('Please enter a valid revenue amount');
      return;
    }

    onSubmit(revenue);
    handleClose();
  };

  const handleClose = () => {
    setActualRevenue('');
    setError('');
    setClientData(null);
    setAutoFilled(false);
    onClose();
  };

  if (!task) return null;

  const isInvoicing = columnTitle === 'Invoiced';
  const Icon = isInvoicing ? InvoiceIcon : PaymentIcon;
  const actionColor = isInvoicing ? 'warning' : 'success';

  // Get the rate info for display
  const getClientRate = () => {
    if (!clientData?.compensation || !task.type) return null;
    
    const taskTypeMap: { [key: string]: string } = {
      'blog': 'blogRate',
      'tutorial': 'tutorialRate'
    };
    
    const rateKey = taskTypeMap[task.type] as keyof typeof clientData.compensation;
    return clientData.compensation[rateKey] || null;
  };

  const clientRate = getClientRate();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Icon color={actionColor} />
        {isInvoicing ? 'Mark as Invoiced' : 'Mark as Paid'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Task Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {task.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Client: {task.clientName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Type: {task.type}
            </Typography>
            {task.estimatedRevenue && (
              <Typography variant="body2" color="text.secondary">
                Estimated Revenue: ${task.estimatedRevenue.toLocaleString()}
              </Typography>
            )}
          </Box>

          {/* Auto-fill notification */}
          {autoFilled && clientRate && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Auto-filled from client compensation:</strong> ${clientRate.toLocaleString()} for {task.type} content
              </Typography>
            </Alert>
          )}

          {/* Client compensation info */}
          {clientData?.compensation && !autoFilled && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Client has compensation rates set, but no rate found for "{task.type}" content type.
              </Typography>
            </Alert>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Pricing Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {isInvoicing ? 'Invoice Amount' : 'Payment Received'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isInvoicing 
                ? 'Enter the amount invoiced to the client for this task'
                : 'Enter the actual payment amount received from the client'
              }
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label={isInvoicing ? 'Invoice Amount' : 'Payment Amount'}
              type="number"
              value={actualRevenue}
              onChange={(e) => {
                setActualRevenue(e.target.value);
                setError(''); // Clear error on input
                setAutoFilled(false); // Mark as manually edited
              }}
              required
              inputProps={{ 
                min: 0, 
                step: 0.01 
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon />
                  </InputAdornment>
                ),
              }}
              autoFocus
              disabled={loadingClient}
            />
          </Box>

          {/* Revenue Impact */}
          <Alert severity="info">
            This amount will be recorded as <strong>actual revenue</strong> and will contribute to your revenue performance metrics in the Client Management dashboard.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color={actionColor}
            sx={{ minWidth: 120 }}
            disabled={loadingClient}
          >
            {isInvoicing ? 'Mark Invoiced' : 'Mark Paid'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PricingModal;
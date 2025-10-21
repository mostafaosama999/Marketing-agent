// src/components/features/crm/CSVUploadDialog.tsx
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { parseCSVFile, ParseResult } from '../../../services/api/csvImportService';
import { CSVRow } from '../../../types/crm';

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (data: CSVRow[], headers: string[]) => void;
}

export const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({
  open,
  onClose,
  onNext,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const result = await parseCSVFile(selectedFile);
      setParseResult(result);

      if (result.errors.length > 0) {
        setError(`CSV parsed with warnings: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV';
      setError(errorMessage);
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (parseResult) {
      onNext(parseResult.data, parseResult.headers);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    setError(null);
    setDragActive(false);
    onClose();
  };

  // Get first 5 rows for preview
  const previewData = parseResult ? parseResult.data.slice(0, 5) : [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle>
        <Typography
          variant="h6"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          Import CSV - Upload File
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Step 1 of 2: Upload and preview your CSV file
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!parseResult && (
          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragActive ? '#667eea' : '#e2e8f0',
              borderRadius: '12px',
              p: 4,
              textAlign: 'center',
              bgcolor: dragActive ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#667eea',
                bgcolor: 'rgba(102, 126, 234, 0.05)',
              },
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, color: '#1e293b' }}>
              Drag and drop your CSV file here
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              or
            </Typography>
            <Button
              variant="contained"
              component="label"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                },
              }}
            >
              Browse Files
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileInputChange}
              />
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {parseResult && !loading && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1" sx={{ color: '#1e293b' }}>
                <strong>File:</strong> {file?.name}
              </Typography>
              <Typography variant="body1" sx={{ color: '#1e293b' }}>
                <strong>Total Rows:</strong> {parseResult.totalRows}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              Preview (first 5 rows):
            </Typography>

            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                maxHeight: 400,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {parseResult.headers.map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontWeight: 600,
                          bgcolor: '#f8fafc',
                          borderBottom: '2px solid #e2e8f0',
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {parseResult.headers.map((header) => (
                        <TableCell key={header} sx={{ fontSize: '13px' }}>
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={!parseResult || loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          Next
        </Button>
      </DialogActions>
    </Dialog>
  );
};

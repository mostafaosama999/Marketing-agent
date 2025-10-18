import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { CSVRow } from '../../../app/types/crm';
import { parseCSV } from '../../../services/importService';

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (csvData: CSVRow[], headers: string[]) => void;
}

export const CSVUploadDialog: React.FC<CSVUploadDialogProps> = ({ open, onClose, onNext }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError('');
    setFile(selectedFile);

    try {
      const data = await parseCSV(selectedFile);
      if (data.length === 0) {
        setError('CSV file is empty');
        return;
      }

      setCSVData(data);
      setHeaders(Object.keys(data[0]));
    } catch (err) {
      setError('Failed to parse CSV file. Please check the file format.');
      console.error(err);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        // Accept CSV files based on extension or MIME type
        const isCSV =
          droppedFile.name.toLowerCase().endsWith('.csv') ||
          droppedFile.type === 'text/csv' ||
          droppedFile.type === 'application/csv' ||
          droppedFile.type === 'text/plain';

        if (isCSV) {
          handleFileSelect(droppedFile);
        } else {
          setError('Please upload a CSV file');
        }
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleNext = () => {
    if (csvData.length > 0 && headers.length > 0) {
      onNext(csvData, headers);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCSVData([]);
    setHeaders([]);
    setError('');
    onClose();
  };

  const previewData = csvData.slice(0, 5);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload CSV File</DialogTitle>
      <DialogContent>
        {!file ? (
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: isDragging ? 'action.hover' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drop CSV file here or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported format: .csv
            </Typography>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,text/csv,application/csv,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FileIcon color="primary" />
              <Typography variant="body1">{file.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                ({csvData.length} rows)
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {csvData.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview (first 5 rows):
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableCell key={header} sx={{ fontWeight: 600 }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          {headers.map((header) => (
                            <TableCell key={header}>{row[header] || '-'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Button
              variant="text"
              onClick={() => {
                setFile(null);
                setCSVData([]);
                setHeaders([]);
                setError('');
              }}
              sx={{ mt: 2 }}
            >
              Choose different file
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={!file || csvData.length === 0 || !!error}
        >
          Next
        </Button>
      </DialogActions>
    </Dialog>
  );
};

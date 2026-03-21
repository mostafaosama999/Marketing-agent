import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Upload as UploadIcon } from '@mui/icons-material';
import Papa from 'papaparse';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (imported: number, duplicates: number) => void;
}

interface ParsedApplicant {
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  bio: string;
  formAnswers: Record<string, string>;
  submittedAt?: string;
}

// Map CSV column names to shortened question labels
const QUESTION_COLUMNS: Record<string, string> = {
  'This role involves writing long-form technical blogs': 'Role Fit',
  'This role involves writing long form technical blogs': 'Role Fit',
  'Describe a technical concept you': 'Technical Writing Experience',
  'Have you ever built or worked with an LLM': 'LLM Experience',
  'What programming languages and tools': 'Languages & Tools',
  'Share 1': 'Writing Samples',
  'What are your 1-3 year goals': 'Career Goals',
  'What are your 1 3 year goals': 'Career Goals',
};

function matchQuestion(header: string): string | null {
  const lower = header.toLowerCase();
  for (const [prefix, label] of Object.entries(QUESTION_COLUMNS)) {
    if (lower.startsWith(prefix.toLowerCase())) {
      return label;
    }
  }
  return null;
}

export const CSVImportDialog: React.FC<CSVImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [parsed, setParsed] = useState<ParsedApplicant[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const applicants: ParsedApplicant[] = [];
        const headers = results.meta.fields || [];

        for (const row of results.data as Record<string, string>[]) {
          const name = row['Name'] || row['Hiring Contact Name 2'] || '';
          const email = row['Email'] || row['Hiring Contact Email 2'] || '';

          // Skip rows without name or email
          if (!name.trim() || !email.trim()) continue;
          // Skip test submissions
          if (email === 'mostafa.moqbel.ibrahim@gmail.com') continue;

          const formAnswers: Record<string, string> = {};
          for (const header of headers) {
            const questionLabel = matchQuestion(header);
            if (questionLabel && row[header]?.trim()) {
              formAnswers[questionLabel] = row[header].trim();
            }
          }

          applicants.push({
            name: name.trim(),
            email: email.trim(),
            phone: (row['Phone'] || row['Hiring Contact Phone 2'] || '').replace(/'/g, '').trim(),
            linkedInUrl: (row['LinkedIn URL'] || '').trim(),
            bio: (row['Bio'] || row['Hiring Contact Bio 2'] || '').trim(),
            formAnswers,
            submittedAt: row['Date'] || undefined,
          });
        }

        setParsed(applicants);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;

    setImporting(true);
    setError('');

    try {
      const functions = getFunctions();
      const importFn = httpsCallable(functions, 'importApplicantsCloud');
      const result = await importFn({ applicants: parsed });
      const data = result.data as { imported: number; duplicates: number; errors: number };
      onSuccess(data.imported, data.duplicates);
      setParsed([]);
      setFileName('');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setParsed([]);
      setFileName('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Import Applicants from CSV
        </Typography>
        <IconButton onClick={handleClose} size="small" disabled={importing}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {parsed.length === 0 ? (
          <Box
            sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 3,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: '#667eea', background: '#667eea08' },
            }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#64748b', mb: 1 }}>
              Click to select a CSV file
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Export from Webflow Forms and upload here
            </Typography>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              {fileName} - {parsed.length} applicant{parsed.length !== 1 ? 's' : ''} found
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>LinkedIn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Answers</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>{a.email}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>{a.phone}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>
                        {a.linkedInUrl ? 'Yes' : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>
                        {Object.keys(a.formAnswers).length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={importing} sx={{ color: '#64748b' }}>
          Cancel
        </Button>
        {parsed.length > 0 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={16} /> : undefined}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {importing ? 'Importing...' : `Import ${parsed.length} Applicants`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

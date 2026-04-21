import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Unarchive as UnarchiveIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import {
  SourcedCandidate,
  ARCHIVE_REASON_LABELS,
} from '../../../types/sourcedCandidate';

interface Props {
  open: boolean;
  onClose: () => void;
  archivedCandidates: SourcedCandidate[];
  onUnarchive: (candidate: SourcedCandidate) => void;
}

export const ArchivedSourcedCandidatesView: React.FC<Props> = ({
  open,
  onClose,
  archivedCandidates,
  onUnarchive,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Archived sourced candidates ({archivedCandidates.length})
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {archivedCandidates.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
            <Typography>No archived candidates.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>LinkedIn</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Archived</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '12px' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archivedCandidates.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.linkedInUrl && (
                      <IconButton size="small" component="a" href={c.linkedInUrl} target="_blank" rel="noopener noreferrer" sx={{ color: '#0077b5' }}>
                        <LinkedInIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{c.score}/10</Typography>
                  </TableCell>
                  <TableCell>
                    {c.archiveReason ? (
                      <Chip
                        label={ARCHIVE_REASON_LABELS[c.archiveReason]}
                        size="small"
                        sx={{ fontSize: '11px', bgcolor: '#f1f5f9', color: '#475569' }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '12px' }}>
                      {c.archivedAt ? c.archivedAt.toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Unarchive">
                      <IconButton size="small" onClick={() => onUnarchive(c)}>
                        <UnarchiveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

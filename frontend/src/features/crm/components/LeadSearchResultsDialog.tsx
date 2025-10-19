import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  Chip,
  CircularProgress,
} from '@mui/material';
import { ApolloSearchPerson } from '../../../services/apolloService';

interface LeadSearchResultsDialogProps {
  open: boolean;
  companyName: string;
  results: ApolloSearchPerson[];
  duplicateIds: Set<string>; // IDs of results that are duplicates
  isLoading: boolean;
  onClose: () => void;
  onImport: (selectedPeople: ApolloSearchPerson[]) => void;
}

export const LeadSearchResultsDialog: React.FC<LeadSearchResultsDialogProps> = ({
  open,
  companyName,
  results,
  duplicateIds,
  isLoading,
  onClose,
  onImport,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out duplicates from selectable results
  const availableResults = results.filter(person => !duplicateIds.has(person.id));
  const duplicateCount = results.length - availableResults.length;

  // Reset selection when results change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [results]);

  const handleToggle = (personId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(availableResults.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = () => {
    const selectedPeople = availableResults.filter(p => selectedIds.has(p.id));
    onImport(selectedPeople);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const isAllSelected = availableResults.length > 0 && selectedIds.size === availableResults.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < availableResults.length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Lead Search Results for {companyName}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Searching Apollo.io for matching people...
            </Typography>
          </Box>
        ) : (
          <>
            {results.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No people found matching the selected titles at {companyName}.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Found {results.length} people at {companyName}
                  </Typography>
                  {duplicateCount > 0 && (
                    <Chip
                      label={`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} automatically skipped`}
                      size="small"
                      color="info"
                      sx={{ mr: 1 }}
                    />
                  )}
                  {availableResults.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button size="small" onClick={handleSelectAll} variant="outlined">
                        Select All
                      </Button>
                      <Button size="small" onClick={handleDeselectAll} variant="outlined">
                        Deselect All
                      </Button>
                    </Box>
                  )}
                </Box>

                {availableResults.length === 0 ? (
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      All results are duplicates. No new leads to import.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={isIndeterminate}
                              checked={isAllSelected}
                              onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                            />
                          </TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>LinkedIn</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {availableResults.map((person) => (
                          <TableRow
                            key={person.id}
                            hover
                            onClick={() => handleToggle(person.id)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedIds.has(person.id)}
                                onChange={() => handleToggle(person.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>{person.name}</TableCell>
                            <TableCell>{person.title || '-'}</TableCell>
                            <TableCell>{person.email || '-'}</TableCell>
                            <TableCell>
                              {person.linkedin_url ? (
                                <Link
                                  href={person.linkedin_url}
                                  target="_blank"
                                  rel="noopener"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </Link>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {availableResults.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    {selectedIds.size} of {availableResults.length} selected for import
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!isLoading && availableResults.length > 0 && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={selectedIds.size === 0}
          >
            Import {selectedIds.size} Lead{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

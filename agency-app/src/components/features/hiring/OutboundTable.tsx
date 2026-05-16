import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Select,
  FormControl,
  Typography,
  ListSubheader,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import {
  SourcedCandidate,
  OutboundStatus,
  OUTBOUND_STAGES,
  ArchiveReason,
  ARCHIVE_REASON_LABELS,
  isStale,
} from '../../../types/sourcedCandidate';
import { useColumnWidths } from '../../../hooks/useColumnWidths';
import { ResizableHeaderCell } from '../../common/ResizableHeaderCell';

interface OutboundTableProps {
  candidates: SourcedCandidate[];
  onCandidateClick: (candidate: SourcedCandidate) => void;
  onStatusChange: (candidate: SourcedCandidate, newStatus: OutboundStatus) => void;
  onCopyDm: (candidate: SourcedCandidate) => void;
  onArchive: (candidate: SourcedCandidate, reason: ArchiveReason) => void;
  onDelete: (candidate: SourcedCandidate) => void;
  copyDisabledForCandidate: (candidate: SourcedCandidate) => boolean;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: '#dcfce7', color: '#16a34a', border: '#86efac' };
  if (score >= 5) return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
  return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
}

export const OutboundTable: React.FC<OutboundTableProps> = ({
  candidates,
  onCandidateClick,
  onStatusChange,
  onCopyDm,
  onArchive,
  onDelete,
  copyDisabledForCandidate,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; candidate: SourcedCandidate } | null>(null);
  const [archiveMenu, setArchiveMenu] = useState<{ el: HTMLElement; candidate: SourcedCandidate } | null>(null);

  const { getWidth: getColumnWidth, setWidth: setColumnWidth, resetWidth: resetColumnWidth } =
    useColumnWidths('outbound_table');
  const resizeProps = (columnId: string) => ({
    columnId,
    width: getColumnWidth(columnId),
    onResize: setColumnWidth,
    onResetWidth: resetColumnWidth,
  });
  const OUTBOUND_COLUMNS = ['name', 'linkedin', 'score', 'tier', 'role', 'university', 'age', 'status', 'last_contacted', 'actions'] as const;

  const openActionMenu = (e: React.MouseEvent<HTMLElement>, candidate: SourcedCandidate) => {
    e.stopPropagation();
    setMenuAnchor({ el: e.currentTarget, candidate });
  };

  const closeActionMenu = () => setMenuAnchor(null);

  const openArchiveMenu = (e: React.MouseEvent<HTMLElement>, candidate: SourcedCandidate) => {
    e.stopPropagation();
    setArchiveMenu({ el: e.currentTarget, candidate });
    setMenuAnchor(null);
  };

  const closeArchiveMenu = () => setArchiveMenu(null);

  const handleArchiveSelection = (reason: ArchiveReason) => {
    if (archiveMenu) {
      onArchive(archiveMenu.candidate, reason);
      closeArchiveMenu();
    }
  };

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          mx: 2,
          mb: 2,
          maxHeight: 'calc(100vh - 280px)',
        }}
      >
        <Table size="small" stickyHeader>
          <colgroup>
            {OUTBOUND_COLUMNS.map((id) => {
              const w = getColumnWidth(id);
              return <col key={id} style={w ? { width: `${w}px` } : undefined} />;
            })}
          </colgroup>
          <TableHead>
            <TableRow>
              <ResizableHeaderCell {...resizeProps('name')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Name
              </ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('linkedin')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LinkedIn</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('score')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Score</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('tier')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tier</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('role')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role @ Company</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('university')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>University</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('age')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Age</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('status')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 140 }}>Status</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('last_contacted')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Contacted</ResizableHeaderCell>
              <ResizableHeaderCell {...resizeProps('actions')} sx={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</ResizableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {candidates.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: '#94a3b8', fontStyle: 'italic' }}>
                  No sourced candidates yet. Run the BDR hiring skill's <code>source</code> mode, or add one manually.
                </TableCell>
              </TableRow>
            )}
            {candidates.map((c) => {
              const sc = scoreColors(c.score);
              const stale = isStale(c);
              const roleLine = [c.currentRole, c.currentCompany].filter(Boolean).join(' @ ') || '—';
              const stage = OUTBOUND_STAGES.find((s) => s.id === c.status);
              return (
                <TableRow
                  key={c.id}
                  hover
                  onClick={() => onCandidateClick(c)}
                  sx={{ cursor: 'pointer', '&:hover': { background: '#f8fafc' } }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{c.name}</Typography>
                    {c.location && (
                      <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{c.location}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.linkedInUrl ? (
                      <IconButton
                        size="small"
                        component="a"
                        href={c.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ color: '#0077b5' }}
                      >
                        <LinkedInIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: 0.25,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1.5,
                        background: sc.bg,
                        border: `1px solid ${sc.border}`,
                      }}
                    >
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: sc.color }}>{c.score}</Typography>
                      <Typography sx={{ fontSize: '9px', color: '#94a3b8' }}>/10</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {c.tier ? (
                      <Chip
                        label={c.tier.toUpperCase()}
                        size="small"
                        sx={{
                          fontSize: '10px',
                          fontWeight: 700,
                          bgcolor: c.tier === 'premium' ? '#fef3c7' : '#dbeafe',
                          color: c.tier === 'premium' ? '#b45309' : '#2563eb',
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '13px', color: '#475569' }}>{roleLine}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.university ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '12px', color: '#475569' }}>{c.university}</Typography>
                        {c.universityTier && (
                          <Chip
                            label={c.universityTier}
                            size="small"
                            sx={{ fontSize: '9px', fontWeight: 700, height: 16, bgcolor: '#ede9fe', color: '#6d28d9', '& .MuiChip-label': { px: 0.5 } }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '13px' }}>{c.estimatedAge ?? '—'}</Typography>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={c.status}
                        onChange={(e) => onStatusChange(c, e.target.value as OutboundStatus)}
                        sx={{
                          fontSize: '12px',
                          fontWeight: 700,
                          '& .MuiSelect-select': {
                            py: 0.5,
                            color: stage?.color,
                          },
                        }}
                      >
                        {OUTBOUND_STAGES.map((s) => (
                          <MenuItem key={s.id} value={s.id} sx={{ fontSize: '13px', color: s.color }}>
                            {s.icon} {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography sx={{ fontSize: '12px' }}>{formatDate(c.sentAt)}</Typography>
                      {stale && (
                        <Tooltip title="No response for 7+ days" arrow>
                          <WarningAmberIcon sx={{ fontSize: 14, color: '#f97316' }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip
                        title={copyDisabledForCandidate(c) ? 'No draft or default template' : 'Copy DM to clipboard'}
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={copyDisabledForCandidate(c)}
                            onClick={() => onCopyDm(c)}
                            sx={{ color: '#667eea' }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton size="small" onClick={(e) => openActionMenu(e, c)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menuAnchor?.el || null} open={!!menuAnchor} onClose={closeActionMenu}>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              onCandidateClick(menuAnchor.candidate);
              closeActionMenu();
            }
          }}
        >
          View details
        </MenuItem>
        <MenuItem onClick={(e) => menuAnchor && openArchiveMenu(e as any, menuAnchor.candidate)}>
          Archive…
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuAnchor) {
              onDelete(menuAnchor.candidate);
              closeActionMenu();
            }
          }}
          sx={{ color: '#dc2626' }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Menu anchorEl={archiveMenu?.el || null} open={!!archiveMenu} onClose={closeArchiveMenu}>
        <ListSubheader sx={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Archive reason
        </ListSubheader>
        {(Object.keys(ARCHIVE_REASON_LABELS) as ArchiveReason[]).map((r) => (
          <MenuItem key={r} onClick={() => handleArchiveSelection(r)}>
            {ARCHIVE_REASON_LABELS[r]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

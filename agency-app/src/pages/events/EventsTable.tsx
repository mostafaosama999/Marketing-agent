// src/pages/events/EventsTable.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  ClickAwayListener,
} from '@mui/material';
import { LocationOn, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Event,
  EventCategory,
  EventStatus,
  EventType,
  EducationalTier,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  EDUCATIONAL_TIER_LABELS,
  EDUCATIONAL_TIER_COLORS,
} from '../../types/event';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { ResizableHeaderCell } from '../../components/common/ResizableHeaderCell';

interface EventsTableProps {
  events: Event[];
  category?: EventCategory;
  onUpdatePrice?: (eventId: string, pricing: Event['pricing']) => Promise<void>;
}

type SortField = 'name' | 'startDate' | 'location' | 'eventType' | 'eventScore' | 'status' | 'icpCompanies' | 'price' | 'tier' | 'organiser' | 'discoveredAt';
type SortDirection = 'asc' | 'desc';

const TIER_ORDER: Record<string, number> = {
  must_attend: 0,
  strong: 1,
  worth_trying: 2,
  skip: 3,
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const year = end.getFullYear();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  }

  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
}

function formatDiscoveredDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getScoreBadgeStyle(score: number): { bg: string; text: string } {
  if (score >= 70) return { bg: '#dcfce7', text: '#166534' };
  if (score >= 40) return { bg: '#fef9c3', text: '#854d0e' };
  return { bg: '#fee2e2', text: '#991b1b' };
}

function formatPrice(pricing: Event['pricing']): string {
  if (!pricing) return '-';
  if (pricing.ticketStatus === 'free') return 'Free';
  if (pricing.ticketPrice === null || pricing.ticketPrice === undefined) return '-';
  const symbol = pricing.currency === 'GBP' ? '\u00A3' : pricing.currency === 'EUR' ? '\u20AC' : '$';
  return `${symbol}${pricing.ticketPrice.toLocaleString()}`;
}

export const EventsTable: React.FC<EventsTableProps> = ({ events, category = 'client', onUpdatePrice }) => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { getWidth: getColumnWidth, setWidth: setColumnWidth, resetWidth: resetColumnWidth } =
    useColumnWidths(`events_table_${category}`);

  // Inline price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [editPriceCurrency, setEditPriceCurrency] = useState<string>('GBP');

  const startPriceEdit = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setEditingPriceId(event.id);
    if (event.pricing.ticketStatus === 'free') {
      setEditPriceValue('0');
    } else {
      setEditPriceValue(event.pricing.ticketPrice?.toString() || '');
    }
    setEditPriceCurrency(event.pricing.currency || 'GBP');
  };

  const cancelPriceEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPriceId(null);
    setEditPriceValue('');
  };

  const savePriceEdit = async (e: React.MouseEvent | React.KeyboardEvent, event: Event) => {
    e.stopPropagation();
    if (!onUpdatePrice) return;

    const numValue = parseFloat(editPriceValue);
    const isFree = editPriceValue === '' || editPriceValue === '0';

    const updatedPricing: Event['pricing'] = {
      ...event.pricing,
      ticketPrice: isFree ? null : numValue,
      ticketStatus: isFree ? 'free' : (event.pricing.ticketStatus === 'free' ? 'available' : event.pricing.ticketStatus),
      currency: editPriceCurrency,
    };

    await onUpdatePrice(event.id, updatedPricing);
    setEditingPriceId(null);
    setEditPriceValue('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'location':
          comparison = (a.location?.city || '').localeCompare(b.location?.city || '');
          break;
        case 'eventType':
          comparison = a.eventType.localeCompare(b.eventType);
          break;
        case 'eventScore':
          comparison = (a.eventScore || 0) - (b.eventScore || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'icpCompanies':
          comparison = (a.icpSummary?.totalIcpCompanies || 0) - (b.icpSummary?.totalIcpCompanies || 0);
          break;
        case 'price':
          comparison = (a.pricing?.ticketPrice || 0) - (b.pricing?.ticketPrice || 0);
          break;
        case 'tier':
          comparison = (TIER_ORDER[a.tier || 'skip'] ?? 4) - (TIER_ORDER[b.tier || 'skip'] ?? 4);
          break;
        case 'organiser':
          comparison = (a.organiser || '').localeCompare(b.organiser || '');
          break;
        case 'discoveredAt':
          comparison = new Date(a.discoveredAt || '').getTime() - new Date(b.discoveredAt || '').getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [events, sortField, sortDirection]);

  const paginatedEvents = useMemo(
    () => sortedEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedEvents, page, rowsPerPage]
  );

  const columns = useMemo((): { field: SortField; label: string; width?: string }[] => {
    if (category === 'educational') {
      return [
        { field: 'discoveredAt', label: 'Date Added', width: '8%' },
        { field: 'name', label: 'Name', width: '20%' },
        { field: 'startDate', label: 'Date', width: '13%' },
        { field: 'location', label: 'Location', width: '11%' },
        { field: 'eventType', label: 'Type', width: '8%' },
        { field: 'eventScore', label: 'Score', width: '7%' },
        { field: 'tier', label: 'Tier', width: '8%' },
        { field: 'organiser', label: 'Organiser', width: '11%' },
        { field: 'status', label: 'Status', width: '8%' },
        { field: 'price', label: 'Price', width: '6%' },
      ];
    }
    return [
      { field: 'discoveredAt', label: 'Date Added', width: '10%' },
      { field: 'name', label: 'Name', width: '22%' },
      { field: 'startDate', label: 'Date', width: '14%' },
      { field: 'location', label: 'Location', width: '12%' },
      { field: 'eventType', label: 'Type', width: '9%' },
      { field: 'eventScore', label: 'Score', width: '7%' },
      { field: 'status', label: 'Status', width: '9%' },
      { field: 'icpCompanies', label: 'ICP Companies', width: '9%' },
      { field: 'price', label: 'Price', width: '8%' },
    ];
  }, [category]);

  const renderCell = (event: Event, field: SortField) => {
    const scoreStyle = getScoreBadgeStyle(event.eventScore || 0);
    const statusColor = EVENT_STATUS_COLORS[event.status as EventStatus] || EVENT_STATUS_COLORS.discovered;

    switch (field) {
      case 'name':
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
              fontSize: '13px',
              '&:hover': { color: '#667eea' },
            }}
          >
            {event.name}
          </Typography>
        );
      case 'startDate':
        return (
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
            {formatDateRange(event.startDate, event.endDate)}
          </Typography>
        );
      case 'location':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: '#94a3b8' }} />
            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
              {event.location?.city}
              {event.location?.country ? `, ${event.location.country}` : ''}
            </Typography>
          </Box>
        );
      case 'eventType':
        return (
          <Chip
            label={EVENT_TYPE_LABELS[event.eventType as EventType] || event.eventType}
            size="small"
            sx={{
              bgcolor: '#f1f5f9',
              color: '#475569',
              fontWeight: 500,
              fontSize: '11px',
              height: 24,
              borderRadius: 1.5,
            }}
          />
        );
      case 'eventScore':
        return (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: scoreStyle.bg,
              color: scoreStyle.text,
              fontWeight: 700,
              fontSize: '12px',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              minWidth: 36,
            }}
          >
            {event.eventScore ?? '-'}
          </Box>
        );
      case 'status':
        return (
          <Chip
            label={EVENT_STATUS_LABELS[event.status as EventStatus] || event.status}
            size="small"
            sx={{
              bgcolor: statusColor.bg,
              color: statusColor.text,
              fontWeight: 600,
              fontSize: '11px',
              height: 24,
              borderRadius: 1.5,
            }}
          />
        );
      case 'icpCompanies':
        return (
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>
            {event.icpSummary?.totalIcpCompanies ?? 0}
          </Typography>
        );
      case 'tier': {
        const tier = event.tier as EducationalTier | undefined;
        if (!tier) return <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>-</Typography>;
        const tierColor = EDUCATIONAL_TIER_COLORS[tier] || { bg: '#e2e8f0', text: '#64748b' };
        return (
          <Chip
            label={EDUCATIONAL_TIER_LABELS[tier] || tier}
            size="small"
            sx={{
              bgcolor: tierColor.bg,
              color: tierColor.text,
              fontWeight: 600,
              fontSize: '11px',
              height: 24,
              borderRadius: 1.5,
            }}
          />
        );
      }
      case 'organiser':
        return (
          <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
            {event.organiser || '-'}
          </Typography>
        );
      case 'discoveredAt':
        return (
          <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '12px' }}>
            {formatDiscoveredDate(event.discoveredAt)}
          </Typography>
        );
      case 'price':
        if (editingPriceId === event.id) {
          const symbol = editPriceCurrency === 'GBP' ? '\u00A3' : editPriceCurrency === 'EUR' ? '\u20AC' : '$';
          return (
            <ClickAwayListener onClickAway={() => cancelPriceEdit()}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <TextField
                  autoFocus
                  size="small"
                  type="number"
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') savePriceEdit(e, event);
                    if (e.key === 'Escape') cancelPriceEdit();
                  }}
                  placeholder="0 = Free"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ fontSize: '13px', color: '#64748b' }}>{symbol}</Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    width: 110,
                    '& .MuiOutlinedInput-root': {
                      height: 30,
                      fontSize: '13px',
                      borderRadius: 1.5,
                      '& fieldset': { borderColor: '#667eea' },
                      '&:hover fieldset': { borderColor: '#667eea' },
                      '&.Mui-focused fieldset': { borderColor: '#667eea' },
                    },
                    '& input[type=number]': {
                      MozAppearance: 'textfield',
                    },
                    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                      WebkitAppearance: 'none',
                    },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => savePriceEdit(e, event)}
                  sx={{ color: '#16a34a', p: 0.25 }}
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => cancelPriceEdit(e)}
                  sx={{ color: '#94a3b8', p: 0.25 }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </ClickAwayListener>
          );
        }
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover .price-edit-btn': { opacity: 1 },
            }}
          >
            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
              {formatPrice(event.pricing)}
            </Typography>
            {onUpdatePrice && (
              <IconButton
                className="price-edit-btn"
                size="small"
                onClick={(e) => startPriceEdit(e, event)}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  p: 0.25,
                  color: '#94a3b8',
                  '&:hover': { color: '#667eea', bgcolor: '#667eea10' },
                }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  if (events.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 500 }}>
          No events found
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
          Add your first event or adjust your filters
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <colgroup>
            {columns.map((col) => {
              const w = getColumnWidth(col.field);
              const styleWidth = w ? `${w}px` : col.width;
              return <col key={col.field} style={styleWidth ? { width: styleWidth } : undefined} />;
            })}
          </colgroup>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <ResizableHeaderCell
                  key={col.field}
                  columnId={col.field}
                  width={getColumnWidth(col.field)}
                  onResize={setColumnWidth}
                  onResetWidth={resetColumnWidth}
                  sx={{
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    bgcolor: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    py: 1.5,
                  }}
                >
                  <TableSortLabel
                    active={sortField === col.field}
                    direction={sortField === col.field ? sortDirection : 'asc'}
                    onClick={() => handleSort(col.field)}
                    sx={{
                      '&.Mui-active': { color: '#667eea' },
                      '& .MuiTableSortLabel-icon': { color: '#667eea !important' },
                    }}
                  >
                    {col.label}
                  </TableSortLabel>
                </ResizableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEvents.map((event) => (
              <TableRow
                key={event.id}
                hover
                onClick={() => navigate(`/events/${event.id}`)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.04)',
                  },
                  '& td': {
                    borderBottom: '1px solid #f1f5f9',
                    py: 1.5,
                    fontSize: '13px',
                  },
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.field}>
                    {renderCell(event, col.field)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedEvents.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{
          borderTop: '1px solid #e2e8f0',
          flexShrink: 0,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '13px',
            color: '#64748b',
          },
        }}
      />
    </Box>
  );
};

/**
 * EmailsTable Component
 * Displays newsletter emails in a table format with expandable rows
 */

import React, {useState} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  TablePagination,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from "@mui/icons-material";
import {EmailData} from "../../services/api/gmailService";
import EmailDetailRow from "./EmailDetailRow";

interface EmailsTableProps {
  emails: EmailData[];
  loading?: boolean;
}

const EmailsTable: React.FC<EmailsTableProps> = ({emails, loading = false}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const toggleRow = (emailId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Pagination
  const paginatedEmails = emails.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box sx={{p: 4, textAlign: "center"}}>
        <Typography variant="body1" sx={{color: "#64748b"}}>
          Loading emails...
        </Typography>
      </Box>
    );
  }

  if (emails.length === 0) {
    return (
      <Box sx={{p: 4, textAlign: "center"}}>
        <Typography variant="h6" sx={{color: "#64748b", mb: 1}}>
          No emails found
        </Typography>
        <Typography variant="body2" sx={{color: "#94a3b8"}}>
          Click "Sync Now" to fetch emails from your newsletter inbox
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
      }}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <TableCell sx={{width: 50}} />
              <TableCell sx={{color: "white", fontWeight: 600}}>
                Subject
              </TableCell>
              <TableCell sx={{color: "white", fontWeight: 600}}>
                From
              </TableCell>
              <TableCell sx={{color: "white", fontWeight: 600}}>
                Received
              </TableCell>
              <TableCell sx={{color: "white", fontWeight: 600}}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedEmails.map((email) => {
              const isExpanded = expandedRows.has(email.id);
              return (
                <React.Fragment key={email.id}>
                  <TableRow
                    sx={{
                      "&:hover": {
                        backgroundColor: "#f8fafc",
                        cursor: "pointer",
                      },
                      borderBottom: isExpanded ? "none" : undefined,
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRow(email.id)}
                        sx={{
                          color: "#667eea",
                          "&:hover": {background: "rgba(102, 126, 234, 0.1)"},
                        }}
                      >
                        {isExpanded ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell
                      onClick={() => toggleRow(email.id)}
                      sx={{cursor: "pointer"}}
                    >
                      <Typography variant="body2" sx={{fontWeight: 600}}>
                        {email.subject}
                      </Typography>
                    </TableCell>
                    <TableCell
                      onClick={() => toggleRow(email.id)}
                      sx={{cursor: "pointer"}}
                    >
                      <Typography variant="body2" sx={{color: "#64748b"}}>
                        {email.from.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{color: "#94a3b8", display: "block"}}
                      >
                        {email.from.email}
                      </Typography>
                    </TableCell>
                    <TableCell
                      onClick={() => toggleRow(email.id)}
                      sx={{cursor: "pointer"}}
                    >
                      <Typography variant="body2" sx={{color: "#64748b"}}>
                        {formatDate(email.receivedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={
                          email.processed ? (
                            <CheckCircleIcon />
                          ) : (
                            <RadioButtonUncheckedIcon />
                          )
                        }
                        label={email.processed ? "Processed" : "Unprocessed"}
                        size="small"
                        sx={{
                          background: email.processed
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{paddingBottom: 0, paddingTop: 0}}
                      colSpan={5}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <EmailDetailRow email={email} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={emails.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      />
    </Paper>
  );
};

export default EmailsTable;

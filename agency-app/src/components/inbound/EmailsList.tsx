/**
 * Compact Emails List Component
 * Simple, pragmatic list view showing just email subjects
 */

import React from "react";
import {Box, Typography, List, ListItem, ListItemText, Chip} from "@mui/material";
import {EmailData} from "../../services/api/gmailService";

interface EmailsListProps {
  emails: EmailData[];
  loading?: boolean;
}

const EmailsList: React.FC<EmailsListProps> = ({emails, loading = false}) => {
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{p: 2, textAlign: "center"}}>
        <Typography variant="body2" sx={{color: "#94a3b8"}}>
          Loading emails...
        </Typography>
      </Box>
    );
  }

  if (emails.length === 0) {
    return (
      <Box sx={{p: 3, textAlign: "center"}}>
        <Typography variant="body2" sx={{color: "#94a3b8", mb: 1}}>
          No emails found
        </Typography>
        <Typography variant="caption" sx={{color: "#cbd5e1"}}>
          Click "Sync Gmail" to fetch emails from your inbox
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{p: 0}}>
      {emails.map((email, index) => (
        <ListItem
          key={email.id}
          sx={{
            borderBottom: index < emails.length - 1 ? "1px solid #f1f5f9" : "none",
            py: 1.5,
            px: 2,
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "#f8fafc",
            },
          }}
        >
          <ListItemText
            primary={
              <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 0.5}}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "#1e293b",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email.subject}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#94a3b8",
                    flexShrink: 0,
                  }}
                >
                  {formatTimeAgo(email.receivedAt)}
                </Typography>
              </Box>
            }
            secondary={
              <Box component="span" sx={{display: "flex", alignItems: "center", gap: 1}}>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: "#64748b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  From: {email.from.name}
                </Typography>
                {email.processed && (
                  <Chip
                    label="Processed"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      backgroundColor: "#d1fae5",
                      color: "#065f46",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default EmailsList;

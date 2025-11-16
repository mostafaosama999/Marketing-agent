/**
 * EmailDetailRow Component
 * Displays expanded email content with LinkedIn suggestions section
 */

import React from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  Paper,
  Chip,
} from "@mui/material";
import {
  LinkedIn as LinkedInIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import {EmailData} from "../../services/api/gmailService";

interface EmailDetailRowProps {
  email: EmailData;
}

const EmailDetailRow: React.FC<EmailDetailRowProps> = ({email}) => {
  // Format the email body (preserve line breaks)
  const formatEmailBody = (body: string): string => {
    return body.trim();
  };

  return (
    <Box sx={{p: 3, backgroundColor: "#f8fafc"}}>
      {/* Email Metadata */}
      <Box sx={{mb: 3, display: "flex", flexWrap: "wrap", gap: 2}}>
        <Box>
          <Typography variant="caption" sx={{color: "#94a3b8", display: "block"}}>
            Thread ID
          </Typography>
          <Typography variant="body2" sx={{fontFamily: "monospace", color: "#64748b"}}>
            {email.gmailThreadId}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{color: "#94a3b8", display: "block"}}>
            Message ID
          </Typography>
          <Typography variant="body2" sx={{fontFamily: "monospace", color: "#64748b"}}>
            {email.id}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{color: "#94a3b8", display: "block"}}>
            Fetched At
          </Typography>
          <Typography variant="body2" sx={{color: "#64748b"}}>
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(email.fetchedAt)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{mb: 3}} />

      {/* Email Body */}
      <Paper
        sx={{
          p: 3,
          backgroundColor: "white",
          borderRadius: 2,
          mb: 3,
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid #e2e8f0",
        }}
      >
        <Typography variant="caption" sx={{color: "#94a3b8", mb: 1, display: "block"}}>
          EMAIL CONTENT
        </Typography>
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#334155",
            lineHeight: 1.8,
          }}
        >
          {formatEmailBody(email.body)}
        </Typography>
      </Paper>

      <Divider sx={{mb: 3}} />

      {/* LinkedIn Suggestions Section */}
      <Box>
        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 2}}>
          <LinkedInIcon sx={{color: "#667eea"}} />
          <Typography variant="h6" sx={{fontWeight: 600, color: "#334155"}}>
            LinkedIn Post Suggestions
          </Typography>
          <Chip
            label={`${email.linkedInSuggestions.length} suggestions`}
            size="small"
            sx={{
              ml: 1,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontWeight: 600,
            }}
          />
        </Box>

        {email.linkedInSuggestions.length === 0 ? (
          <Paper
            sx={{
              p: 3,
              backgroundColor: "white",
              borderRadius: 2,
              border: "1px dashed #cbd5e1",
              textAlign: "center",
            }}
          >
            <AutoAwesomeIcon sx={{fontSize: 40, color: "#cbd5e1", mb: 2}} />
            <Typography variant="body2" sx={{color: "#94a3b8", mb: 2}}>
              No LinkedIn post suggestions yet
            </Typography>
            <Button
              variant="contained"
              disabled
              startIcon={<AutoAwesomeIcon />}
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                "&:disabled": {
                  background: "#e2e8f0",
                  color: "#94a3b8",
                },
              }}
            >
              Generate LinkedIn Post (Coming Soon)
            </Button>
            <Typography
              variant="caption"
              sx={{display: "block", color: "#cbd5e1", mt: 2}}
            >
              AI-powered post generation will be available in Phase 2
            </Typography>
          </Paper>
        ) : (
          <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
            {email.linkedInSuggestions.map((suggestion, index) => (
              <Paper
                key={index}
                sx={{
                  p: 3,
                  backgroundColor: "white",
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{color: "#94a3b8", mb: 1, display: "block"}}
                >
                  SUGGESTION {index + 1}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    color: "#334155",
                    lineHeight: 1.8,
                  }}
                >
                  {suggestion}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default EmailDetailRow;

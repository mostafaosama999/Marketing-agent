/**
 * Gmail OAuth Callback Page
 * Handles the OAuth redirect from Google and exchanges code for tokens
 */

import React, {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Box, Typography, CircularProgress, Alert} from "@mui/material";
import {CheckCircle as CheckCircleIcon, Error as ErrorIcon} from "@mui/icons-material";
import {exchangeGmailOAuthCode} from "../../services/api/gmailService";

const GmailCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Extract authorization code from URL
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setMessage(`OAuth error: ${error}`);
        setTimeout(() => navigate("/inbound-generation"), 3000);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("No authorization code received");
        setTimeout(() => navigate("/inbound-generation"), 3000);
        return;
      }

      try {
        // Exchange code for tokens
        const result = await exchangeGmailOAuthCode(code);

        if (result.success) {
          setStatus("success");
          setMessage(result.message);
          // Redirect to inbound generation page after success
          setTimeout(() => navigate("/inbound-generation"), 2000);
        } else {
          setStatus("error");
          setMessage("Failed to save OAuth tokens");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Unknown error occurred");
      }
    };

    handleOAuthCallback();
  }, [location, navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        p: 4,
      }}
    >
      <Box
        sx={{
          maxWidth: 500,
          width: "100%",
          backgroundColor: "white",
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          p: 4,
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <>
            <CircularProgress
              size={60}
              sx={{
                color: "#667eea",
                mb: 3,
              }}
            />
            <Typography variant="h6" sx={{fontWeight: 600, mb: 1}}>
              Connecting Gmail...
            </Typography>
            <Typography variant="body2" sx={{color: "#64748b"}}>
              Please wait while we set up your Gmail connection
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircleIcon
              sx={{
                fontSize: 60,
                color: "#10b981",
                mb: 3,
              }}
            />
            <Typography variant="h6" sx={{fontWeight: 600, mb: 1, color: "#10b981"}}>
              Success!
            </Typography>
            <Typography variant="body2" sx={{color: "#64748b"}}>
              {message}
            </Typography>
            <Typography variant="caption" sx={{display: "block", color: "#94a3b8", mt: 2}}>
              Redirecting...
            </Typography>
          </>
        )}

        {status === "error" && (
          <>
            <ErrorIcon
              sx={{
                fontSize: 60,
                color: "#ef4444",
                mb: 3,
              }}
            />
            <Typography variant="h6" sx={{fontWeight: 600, mb: 1, color: "#ef4444"}}>
              Connection Failed
            </Typography>
            <Alert severity="error" sx={{mt: 2, textAlign: "left"}}>
              {message}
            </Alert>
            <Typography variant="caption" sx={{display: "block", color: "#94a3b8", mt: 2}}>
              Redirecting...
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default GmailCallback;

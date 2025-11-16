/**
 * Gmail Connection Banner
 * Shows a banner prompting the user to connect Gmail if not connected
 */

import React, {useState, useEffect} from "react";
import {Box, Button, Typography, Card, CardContent, CircularProgress} from "@mui/material";
import {Email as EmailIcon, OpenInNew as OpenInNewIcon} from "@mui/icons-material";
import {checkGmailConnection, getGmailAuthUrl} from "../../services/api/gmailService";

interface GmailConnectionBannerProps {
  onConnectionStatusChange?: (connected: boolean) => void;
}

const GmailConnectionBanner: React.FC<GmailConnectionBannerProps> = ({
  onConnectionStatusChange,
}) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const status = await checkGmailConnection();
      setConnected(status.connected);
      onConnectionStatusChange?.(status.connected);
    } catch (error) {
      console.error("Error checking Gmail connection:", error);
      setConnected(false);
      onConnectionStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      const authUrl = await getGmailAuthUrl();
      // Open OAuth consent screen in current window
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error getting auth URL:", error);
      alert("Failed to start Gmail connection. Please try again.");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{
        borderRadius: 3,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        mb: 3,
      }}>
        <CardContent sx={{p: 3, textAlign: "center"}}>
          <CircularProgress size={30} sx={{color: "#667eea"}} />
          <Typography variant="body2" sx={{color: "#64748b", mt: 2}}>
            Checking Gmail connection...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (connected) {
    return null; // Don't show banner if connected
  }

  return (
    <Card sx={{
      borderRadius: 3,
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
      background: "linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)",
      border: "2px solid #f87171",
      mb: 3,
    }}>
      <CardContent sx={{p: 3}}>
        <Box sx={{display: "flex", alignItems: "center", gap: 2, mb: 2}}>
          <EmailIcon sx={{fontSize: 40, color: "#ef4444"}} />
          <Box sx={{flex: 1}}>
            <Typography variant="h6" sx={{fontWeight: 600, color: "#991b1b"}}>
              Gmail Not Connected
            </Typography>
            <Typography variant="body2" sx={{color: "#7f1d1d", mt: 0.5}}>
              Connect your Gmail account (mostafaainews@gmail.com) to start syncing newsletter emails
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={connecting ? <CircularProgress size={16} sx={{color: "white"}} /> : <OpenInNewIcon />}
            disabled={connecting}
            onClick={handleConnectGmail}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              py: 1.5,
              borderRadius: 2,
              whiteSpace: "nowrap",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
              },
              "&:disabled": {
                background: "#e2e8f0",
                color: "#94a3b8",
              },
            }}
          >
            {connecting ? "Connecting..." : "Connect Gmail"}
          </Button>
        </Box>
        <Box sx={{
          background: "rgba(239, 68, 68, 0.1)",
          borderRadius: 2,
          p: 2,
        }}>
          <Typography variant="caption" sx={{color: "#7f1d1d", fontWeight: 600, display: "block", mb: 1}}>
            What happens next:
          </Typography>
          <Typography variant="caption" sx={{color: "#991b1b", display: "block"}}>
            1. You'll be redirected to Google's secure login page
          </Typography>
          <Typography variant="caption" sx={{color: "#991b1b", display: "block"}}>
            2. Grant permission for this app to read your Gmail (read-only access)
          </Typography>
          <Typography variant="caption" sx={{color: "#991b1b", display: "block"}}>
            3. You'll be redirected back here automatically
          </Typography>
          <Typography variant="caption" sx={{color: "#991b1b", display: "block"}}>
            4. Email syncing will start immediately!
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GmailConnectionBanner;

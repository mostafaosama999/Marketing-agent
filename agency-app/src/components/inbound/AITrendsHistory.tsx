/**
 * AI Trends History Component
 * Shows history of past AI trend analyses with ability to view and delete
 */

import React, {useState} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {AITrendsSession} from "../../types/aiTrends";
import {deleteAITrendsSession} from "../../services/api/aiTrendsService";
import AITrendsList from "./AITrendsList";

interface AITrendsHistoryProps {
  open: boolean;
  onClose: () => void;
  sessions: AITrendsSession[];
  userId: string;
}

const AITrendsHistory: React.FC<AITrendsHistoryProps> = ({
  open,
  onClose,
  sessions,
  userId,
}) => {
  const [viewingSession, setViewingSession] = useState<AITrendsSession | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleView = (session: AITrendsSession) => {
    setViewingSession(session);
  };

  const handleCloseView = () => {
    setViewingSession(null);
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this AI trends analysis?")) {
      return;
    }

    setDeleting(sessionId);
    try {
      await deleteAITrendsSession(userId, sessionId);
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* History List Dialog */}
      <Dialog
        open={open && !viewingSession}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "rgba(255, 255, 255, 0.98)",
          },
        }}
      >
        <DialogTitle sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}>
          <Typography variant="h6" sx={{fontWeight: 700}}>
            AI Trends History
          </Typography>
          <IconButton onClick={onClose} sx={{color: "white"}}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{p: 0}}>
          {sessions.length === 0 ? (
            <Box sx={{p: 4, textAlign: "center"}}>
              <Typography variant="body2" sx={{color: "#94a3b8"}}>
                No AI trends analyses yet
              </Typography>
            </Box>
          ) : (
            <List sx={{p: 0}}>
              {sessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 3,
                      "&:hover": {
                        backgroundColor: "#f8fafc",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 0.5}}>
                          <Typography variant="body1" sx={{fontWeight: 600, color: "#1e293b"}}>
                            {formatDate(session.generatedAt)}
                          </Typography>
                          <Chip
                            label={`${session.trends.length} trends`}
                            size="small"
                            sx={{
                              backgroundColor: "#e0e7ff",
                              color: "#4f46e5",
                              fontWeight: 600,
                              height: 22,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{mt: 0.5}}>
                          <Typography variant="caption" sx={{color: "#64748b"}}>
                            Analyzed {session.emailCount} emails • Cost: ${session.totalCost.toFixed(4)}
                          </Typography>
                          {session.customPrompt && (
                            <Chip
                              label="Custom Prompt"
                              size="small"
                              sx={{
                                ml: 1,
                                height: 18,
                                fontSize: "0.65rem",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleView(session)}
                        sx={{
                          mr: 1,
                          color: "#667eea",
                          "&:hover": {
                            backgroundColor: "#ede9fe",
                          },
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting === session.id}
                        sx={{
                          color: "#ef4444",
                          "&:hover": {
                            backgroundColor: "#fee2e2",
                          },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < sessions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions sx={{p: 2, borderTop: "1px solid #f1f5f9"}}>
          <Button onClick={onClose} sx={{color: "#64748b"}}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Detail View Dialog */}
      {viewingSession && (
        <Dialog
          open={Boolean(viewingSession)}
          onClose={handleCloseView}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: "rgba(255, 255, 255, 0.98)",
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
          }}>
            <Box>
              <Typography variant="h6" sx={{fontWeight: 700}}>
                AI Trends - {formatDate(viewingSession.generatedAt)}
              </Typography>
              <Typography variant="caption">
                {viewingSession.trends.length} trends from {viewingSession.emailCount} emails
              </Typography>
            </Box>
            <IconButton onClick={handleCloseView} sx={{color: "white"}}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{p: 0}}>
            <AITrendsList trends={viewingSession.trends} loading={false} />
          </DialogContent>

          <DialogActions sx={{p: 2, borderTop: "1px solid #f1f5f9"}}>
            <Button onClick={handleCloseView} sx={{color: "#64748b"}}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default AITrendsHistory;

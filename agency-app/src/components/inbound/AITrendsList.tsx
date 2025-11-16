/**
 * AI Trends List Component
 * Displays identified AI trends with leadership angles
 */

import React, {useState} from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import {AITrend} from "../../types/aiTrends";

interface AITrendsListProps {
  trends: AITrend[];
  loading?: boolean;
}

// Category color mapping
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    models: "#3b82f6", // Blue
    techniques: "#10b981", // Green
    applications: "#8b5cf6", // Purple
    tools: "#f59e0b", // Orange
    research: "#ef4444", // Red
    industry: "#06b6d4", // Cyan
  };
  return colors[category] || "#64748b";
};

const AITrendsList: React.FC<AITrendsListProps> = ({trends, loading = false}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExpandClick = (trendId: string) => {
    setExpandedId(expandedId === trendId ? null : trendId);
  };

  if (loading) {
    return (
      <Box sx={{p: 2, textAlign: "center"}}>
        <Typography variant="body2" sx={{color: "#94a3b8"}}>
          Analyzing emails and generating AI trends...
        </Typography>
      </Box>
    );
  }

  if (trends.length === 0) {
    return (
      <Box sx={{p: 3, textAlign: "center"}}>
        <TrendingUpIcon sx={{fontSize: 48, color: "#cbd5e1", mb: 2}} />
        <Typography variant="body2" sx={{color: "#94a3b8", mb: 1}}>
          No AI trends generated yet
        </Typography>
        <Typography variant="caption" sx={{color: "#cbd5e1"}}>
          Click "Generate AI Trends" to analyze your newsletter emails
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{p: 2}}>
      {trends.map((trend, index) => (
        <Card
          key={trend.id || index}
          sx={{
            mb: 2,
            borderRadius: 2,
            border: `2px solid ${getCategoryColor(trend.category)}`,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              transform: "translateY(-2px)",
            },
          }}
        >
          <CardContent sx={{p: 2}}>
            <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
              <Box sx={{flex: 1}}>
                <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                      fontSize: "1.1rem",
                    }}
                  >
                    {trend.title}
                  </Typography>
                  <Chip
                    label={trend.category.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryColor(trend.category),
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      height: 20,
                    }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  sx={{color: "#64748b", mb: 1.5}}
                >
                  {trend.description}
                </Typography>

                {/* Relevance Score */}
                <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
                  <Typography variant="caption" sx={{color: "#94a3b8"}}>
                    Relevance for Leadership:
                  </Typography>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      background: `linear-gradient(90deg, #667eea ${trend.relevanceScore}%, #f1f5f9 ${trend.relevanceScore}%)`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{fontWeight: 700, color: "white"}}
                    >
                      {trend.relevanceScore}%
                    </Typography>
                  </Box>
                </Box>

                {/* Leadership Angle Preview */}
                {trend.leadershipAngle && (
                  <Box sx={{display: "flex", gap: 1, mt: 1.5}}>
                    <LightbulbIcon sx={{fontSize: 18, color: "#f59e0b"}} />
                    <Typography
                      variant="caption"
                      sx={{color: "#64748b", fontStyle: "italic"}}
                    >
                      {trend.leadershipAngle.substring(0, 100)}
                      {trend.leadershipAngle.length > 100 && "..."}
                    </Typography>
                  </Box>
                )}
              </Box>

              <IconButton
                onClick={() => handleExpandClick(trend.id || `${index}`)}
                sx={{
                  transform: expandedId === (trend.id || `${index}`) ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>

            {/* Expandable Details */}
            <Collapse in={expandedId === (trend.id || `${index}`)} timeout="auto" unmountOnExit>
              <Box sx={{mt: 2, pt: 2, borderTop: "1px solid #f1f5f9"}}>
                {/* Key Points */}
                {trend.keyPoints && trend.keyPoints.length > 0 && (
                  <Box sx={{mb: 2}}>
                    <Typography
                      variant="subtitle2"
                      sx={{fontWeight: 700, color: "#1e293b", mb: 1}}
                    >
                      Key Points for Leaders:
                    </Typography>
                    <List dense sx={{pl: 2}}>
                      {trend.keyPoints.map((point, idx) => (
                        <ListItem key={idx} sx={{display: "list-item", listStyleType: "disc", p: 0}}>
                          <ListItemText
                            primary={point}
                            primaryTypographyProps={{
                              variant: "body2",
                              sx: {color: "#64748b"},
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Full Leadership Angle */}
                {trend.leadershipAngle && (
                  <Box sx={{mb: 2}}>
                    <Typography
                      variant="subtitle2"
                      sx={{fontWeight: 700, color: "#1e293b", mb: 1}}
                    >
                      Leadership Perspective:
                    </Typography>
                    <Typography variant="body2" sx={{color: "#64748b"}}>
                      {trend.leadershipAngle}
                    </Typography>
                  </Box>
                )}

                {/* Sources */}
                {trend.sources && trend.sources.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{color: "#94a3b8", fontWeight: 600}}
                    >
                      Sources: {trend.sources.join(", ")}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default AITrendsList;

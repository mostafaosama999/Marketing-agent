import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  OpenInNew as OpenInNewIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import {
  ResearchSession,
} from '../../../app/types/research';

interface ResearchResultsProps {
  session: ResearchSession;
  onDownload?: () => void;
  onOpenDoc?: () => void;
}

export const ResearchResults: React.FC<ResearchResultsProps> = ({
  session,
  onDownload,
  onOpenDoc,
}) => {
  const { companyAnalysis, blogAnalysis, aiTrends, uniqueIdeas, googleDocUrl } = session;

  if (session.status === 'error') {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Research failed: {session.error}
      </Alert>
    );
  }

  if (session.status !== 'completed') {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Company Summary */}
      {companyAnalysis && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6">Company Overview</Typography>
            </Box>
            <Typography variant="h5" gutterBottom>
              {companyAnalysis.title}
            </Typography>
            <Typography variant="body1" paragraph>
              {companyAnalysis.summary}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {companyAnalysis.industry && (
                <Chip label={companyAnalysis.industry} size="small" />
              )}
              {companyAnalysis.keyProducts.map((product, index) => (
                <Chip key={index} label={product} size="small" variant="outlined" />
              ))}
            </Box>
            {companyAnalysis.targetAudience && (
              <Typography variant="body2" color="text.secondary">
                <strong>Target Audience:</strong> {companyAnalysis.targetAudience}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Blog Analysis */}
      {blogAnalysis && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ArticleIcon color="primary" />
              <Typography variant="h6">Blog Analysis</Typography>
            </Box>
            {blogAnalysis.found ? (
              <>
                {blogAnalysis.blogUrl && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Blog found at: <strong>{blogAnalysis.blogUrl}</strong>
                  </Typography>
                )}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Content Themes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {blogAnalysis.themes.map((theme, index) => (
                      <Chip key={index} label={theme} size="small" color="secondary" />
                    ))}
                  </Box>
                </Box>
                {blogAnalysis.recentPosts.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Recent Posts ({blogAnalysis.recentPosts.length}):
                    </Typography>
                    <List dense>
                      {blogAnalysis.recentPosts.slice(0, 5).map((post, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={post.title}
                            secondary={post.publishedDate?.toLocaleDateString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info">
                No blog found for this company. Ideas will be generated based on company analysis and AI trends.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Trends */}
      {aiTrends && aiTrends.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6">Current AI Trends</Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {aiTrends.map((trend, index) => (
                <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.200', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {trend.topic}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {trend.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {trend.keywords.slice(0, 3).map((keyword, kIndex) => (
                      <Chip key={kIndex} label={keyword} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Generated Ideas */}
      {uniqueIdeas && uniqueIdeas.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LightbulbIcon color="primary" />
              <Typography variant="h6">
                Content Ideas ({uniqueIdeas.length} unique)
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2,
              }}
            >
              {uniqueIdeas.map((idea) => (
                <Box key={idea.id} sx={{ p: 2, border: 1, borderColor: 'grey.200', borderRadius: 1, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    {idea.title}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Angle:</strong> {idea.angle}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Product Tie-in:</strong> {idea.productTieIn}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip label={idea.format} size="small" color="primary" />
                    <Chip label={idea.targetAudience} size="small" />
                    <Chip label={idea.difficulty} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {idea.keywords.map((keyword, kIndex) => (
                      <Chip key={kIndex} label={keyword} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Results
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {googleDocUrl && (
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                onClick={onOpenDoc}
                href={googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Google Doc
              </Button>
            )}
            {onDownload && (
              <Button
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={onDownload}
              >
                Download Report
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Results are automatically saved to your account and can be accessed anytime.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
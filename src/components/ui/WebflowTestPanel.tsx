import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CloudSync as CloudSyncIcon,
  Search as SearchIcon,
  HealthAndSafety as HealthIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import {
  discoverWebflowCollections,
  triggerWebflowSync,
  webflowHealthCheck,
  testWebflowAPI
} from '../../services/researchApi';

export const WebflowTestPanel: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleDiscoverCollections = async () => {
    setLoading('discover');
    setError('');
    setResults(null);

    try {
      console.log('🔍 Discovering Webflow collections...');
      const result = await discoverWebflowCollections();
      console.log('📋 Discovery result:', result.data);
      setResults({ type: 'discover', data: result.data });
    } catch (err) {
      console.error('❌ Discovery error:', err);
      setError(err instanceof Error ? err.message : 'Failed to discover collections');
    } finally {
      setLoading(null);
    }
  };

  const handleWebflowSync = async () => {
    setLoading('sync');
    setError('');
    setResults(null);

    try {
      console.log('🔄 Triggering Webflow sync...');
      const result = await triggerWebflowSync();
      console.log('✅ Sync result:', result.data);
      setResults({ type: 'sync', data: result.data });
    } catch (err) {
      console.error('❌ Sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync to Webflow');
    } finally {
      setLoading(null);
    }
  };

  const handleHealthCheck = async () => {
    setLoading('health');
    setError('');
    setResults(null);

    try {
      console.log('🏥 Running Webflow health check...');
      const result = await webflowHealthCheck();
      console.log('✅ Health check result:', result.data);
      setResults({ type: 'health', data: result.data });
    } catch (err) {
      console.error('❌ Health check error:', err);
      setError(err instanceof Error ? err.message : 'Webflow health check failed');
    } finally {
      setLoading(null);
    }
  };

  const handleTestAPI = async () => {
    setLoading('test');
    setError('');
    setResults(null);

    try {
      console.log('🧪 Testing Webflow API approaches...');
      const result = await testWebflowAPI();
      console.log('🔬 API test result:', result.data);
      setResults({ type: 'test', data: result.data });
    } catch (err) {
      console.error('❌ API test error:', err);
      setError(err instanceof Error ? err.message : 'Webflow API test failed');
    } finally {
      setLoading(null);
    }
  };

  const renderCollectionResults = (data: any) => {
    if (!data.allCollections) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Site: {data.site?.name || 'Unknown'}
        </Typography>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Found {data.allCollections.length} total collections, {data.blogCollections?.length || 0} blog-related
        </Typography>

        {data.blogCollections && data.blogCollections.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              🎯 Blog Collections Found:
            </Typography>
            {data.blogCollections.map((collection: any, index: number) => (
              <Card key={collection._id} sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Typography variant="h6">{collection.name}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', my: 1 }}>
                    ID: {collection._id}
                  </Typography>
                  <Typography variant="body2">
                    Slug: {collection.slug}
                  </Typography>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <strong>Use this collection ID in Firebase config:</strong><br />
                    <code>firebase functions:config:set webflow.blog_collection_id="{collection._id}"</code>
                  </Alert>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>All Collections ({data.allCollections.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {data.allCollections.map((collection: any, index: number) => (
                <Box key={collection._id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{collection.name}</Typography>
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                    ID: {collection._id}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Slug: {collection.slug}
                  </Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const renderSyncResults = (data: any) => {
    if (!data.stats) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Sync Results
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`Total: ${data.stats.totalUrls}`} color="primary" />
          <Chip label={`Existing: ${data.stats.existingUrls}`} color="default" />
          <Chip label={`Created: ${data.stats.newlyCreated}`} color="success" />
          <Chip label={`Errors: ${data.stats.errors}`} color="error" />
        </Box>

        {data.stats.results && data.stats.results.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Detailed Results ({data.stats.results.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {data.stats.results.map((result: any, index: number) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2">{result.url}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        size="small"
                        label={result.exists ? 'Exists' : 'New'}
                        color={result.exists ? 'default' : 'primary'}
                      />
                      {result.created && <Chip size="small" label="Created" color="success" />}
                      {result.error && <Chip size="small" label="Error" color="error" />}
                    </Box>
                    {result.error && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                        {result.error}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const renderHealthResults = (data: any) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Health Check Results
      </Typography>
      <Alert severity="success">
        <Typography variant="body2">
          {data.message || 'Webflow integration is healthy'}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Timestamp: {data.timestamp}
        </Typography>
      </Alert>
    </Box>
  );

  const renderTestResults = (data: any) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        API Test Results
      </Typography>

      <Typography variant="body2" sx={{ mb: 2 }}>
        API Token: {data.apiToken} | Site ID: {data.siteId}
      </Typography>

      {data.tests && data.tests.length > 0 && (
        <Box>
          {data.tests.map((test: any, index: number) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1">
                    Test {index + 1}: {test.test}
                  </Typography>
                  <Chip
                    size="small"
                    label={test.success ? 'SUCCESS' : 'FAILED'}
                    color={test.success ? 'success' : 'error'}
                  />
                  {test.status && (
                    <Chip size="small" label={`Status: ${test.status}`} variant="outlined" />
                  )}
                </Box>

                {test.success && test.data && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2">View Response Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                        <pre style={{ fontSize: '12px', margin: 0 }}>
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}

                {!test.success && test.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre">
                      {JSON.stringify(test.error, null, 2)}
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🌐 Webflow Testing Panel
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Test Webflow integration, discover collections, and trigger sync operations.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={loading === 'discover' ? <CircularProgress size={20} /> : <SearchIcon />}
            onClick={handleDiscoverCollections}
            disabled={!!loading}
            color="primary"
          >
            {loading === 'discover' ? 'Discovering...' : 'Discover Collections'}
          </Button>

          <Button
            variant="contained"
            startIcon={loading === 'sync' ? <CircularProgress size={20} /> : <CloudSyncIcon />}
            onClick={handleWebflowSync}
            disabled={!!loading}
            color="secondary"
          >
            {loading === 'sync' ? 'Syncing...' : 'Test Sync'}
          </Button>

          <Button
            variant="outlined"
            startIcon={loading === 'health' ? <CircularProgress size={20} /> : <HealthIcon />}
            onClick={handleHealthCheck}
            disabled={!!loading}
          >
            {loading === 'health' ? 'Checking...' : 'Health Check'}
          </Button>

          <Button
            variant="outlined"
            startIcon={loading === 'test' ? <CircularProgress size={20} /> : <BugReportIcon />}
            onClick={handleTestAPI}
            disabled={!!loading}
            color="warning"
          >
            {loading === 'test' ? 'Testing...' : 'Debug API'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {results && (
          <Box sx={{ mt: 3 }}>
            {results.type === 'discover' && renderCollectionResults(results.data)}
            {results.type === 'sync' && renderSyncResults(results.data)}
            {results.type === 'health' && renderHealthResults(results.data)}
            {results.type === 'test' && renderTestResults(results.data)}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
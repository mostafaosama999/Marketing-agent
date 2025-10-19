import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  InputAdornment,
  FormControl,
  FormHelperText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { CompanyResearchRequest } from '../../../app/types/research';

interface CompanyResearchFormProps {
  onSubmit: (request: CompanyResearchRequest) => void;
  loading?: boolean;
  error?: string;
}

export const CompanyResearchForm: React.FC<CompanyResearchFormProps> = ({
  onSubmit,
  loading = false,
  error,
}) => {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [urlError, setUrlError] = useState('');

  const validateUrl = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) {
      setUrlError('Company URL is required');
      return false;
    }

    try {
      const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
      if (!urlObj.hostname.includes('.')) {
        setUrlError('Please enter a valid website URL');
        return false;
      }
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid website URL');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUrl(url)) {
      return;
    }

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    onSubmit({
      url: normalizedUrl,
      email: email.trim() || undefined,
    });
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (urlError && value.trim()) {
      validateUrl(value);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Company Research
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter a company's homepage URL to start the 7-step content research process.
          We'll analyze their business, find their blog, identify AI trends, and generate
          tailored content ideas.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl error={!!urlError}>
            <TextField
              label="Company Website URL"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.example.com or example.com"
              required
              disabled={loading}
              error={!!urlError}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LanguageIcon />
                  </InputAdornment>
                ),
              }}
            />
            {urlError && <FormHelperText>{urlError}</FormHelperText>}
          </FormControl>

          <TextField
            label="Contact Email (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
            helperText="Optional: We'll send you the results via email when complete"
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !!urlError}
            startIcon={loading ? undefined : <SearchIcon />}
            sx={{ py: 1.5 }}
          >
            {loading ? 'Starting Research...' : 'Start Research'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            What happens next:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Analyze the company homepage</li>
              <li>Find and scan their blog</li>
              <li>Extract current AI trends</li>
              <li>Generate 15-20 content ideas</li>
              <li>Remove duplicates</li>
              <li>Create a comprehensive Google Doc</li>
              <li>Deliver results</li>
            </ol>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
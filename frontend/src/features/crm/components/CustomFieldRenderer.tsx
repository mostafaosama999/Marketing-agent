import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CustomField } from '../../../app/types/crm';

interface CustomFieldRendererProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  switch (field.type) {
    case 'text':
      return (
        <TextField
          label={field.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error}
          required={field.required}
          disabled={disabled}
          fullWidth
        />
      );

    case 'textarea':
      return (
        <TextField
          label={field.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error}
          required={field.required}
          disabled={disabled}
          multiline
          rows={3}
          fullWidth
        />
      );

    case 'number':
      return (
        <TextField
          label={field.label}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          error={!!error}
          helperText={error}
          required={field.required}
          disabled={disabled}
          fullWidth
        />
      );

    case 'select':
      return (
        <FormControl fullWidth error={!!error} required={field.required} disabled={disabled}>
          <InputLabel>{field.label}</InputLabel>
          <Select value={value || ''} onChange={(e) => onChange(e.target.value)} label={field.label}>
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'radio':
      return (
        <FormControl component="fieldset" error={!!error} required={field.required} disabled={disabled}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <RadioGroup value={value || ''} onChange={(e) => onChange(e.target.value)}>
            {field.options?.map((option) => (
              <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
            ))}
          </RadioGroup>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'checkbox':
      return (
        <FormControl component="fieldset" error={!!error} required={field.required} disabled={disabled}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormGroup>
            {field.options?.map((option) => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    checked={Array.isArray(value) && value.includes(option)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        onChange([...currentValues, option]);
                      } else {
                        onChange(currentValues.filter((v) => v !== option));
                      }
                    }}
                  />
                }
                label={option}
              />
            ))}
          </FormGroup>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'date':
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={field.label}
            value={value ? new Date(value) : null}
            onChange={(newValue) => onChange(newValue ? newValue.toISOString() : null)}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!error,
                helperText: error,
                required: field.required,
              },
            }}
          />
        </LocalizationProvider>
      );

    case 'url':
      return (
        <TextField
          label={field.label}
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error}
          required={field.required}
          disabled={disabled}
          fullWidth
        />
      );

    default:
      return null;
  }
};

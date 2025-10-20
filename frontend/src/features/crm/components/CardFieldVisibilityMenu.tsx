import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  Button,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { CardFieldConfig } from '../hooks/useCardFieldVisibility';

interface CardFieldVisibilityMenuProps {
  fields: CardFieldConfig[];
  onFieldsChange: (fields: CardFieldConfig[]) => void;
}

export const CardFieldVisibilityMenu: React.FC<CardFieldVisibilityMenuProps> = ({
  fields,
  onFieldsChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = (fieldId: string) => {
    const updatedFields = fields.map((field) =>
      field.id === fieldId ? { ...field, visible: !field.visible } : field
    );
    onFieldsChange(updatedFields);
  };

  const handleShowAll = () => {
    const updatedFields = fields.map((field) => ({ ...field, visible: true }));
    onFieldsChange(updatedFields);
  };

  const handleHideAll = () => {
    const updatedFields = fields.map((field) =>
      field.required ? field : { ...field, visible: false }
    );
    onFieldsChange(updatedFields);
  };

  const visibleCount = fields.filter((field) => field.visible).length;
  const standardFields = fields.filter((field) => field.type === 'standard');
  const customFields = fields.filter((field) => field.type === 'custom');

  return (
    <>
      <IconButton onClick={handleClick} title="Show/Hide Card Fields" size="small">
        <VisibilityIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 300,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Visible Fields ({visibleCount}/{fields.length})
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ px: 1, py: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button size="small" onClick={handleShowAll} fullWidth variant="outlined">
              Show All
            </Button>
            <Button size="small" onClick={handleHideAll} fullWidth variant="outlined">
              Hide All
            </Button>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
          {/* Standard Fields Section */}
          {standardFields.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  STANDARD FIELDS
                </Typography>
              </Box>
              {standardFields.map((field) => (
                <MenuItem
                  key={field.id}
                  onClick={() => !field.required && handleToggle(field.id)}
                  disabled={field.required}
                  sx={{ py: 0.5 }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.visible}
                        size="small"
                        disabled={field.required}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{field.label}</Typography>
                        {field.required && (
                          <Typography variant="caption" color="text.secondary">
                            Required
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </MenuItem>
              ))}
            </>
          )}

          {/* Custom Fields Section */}
          {customFields.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100', mt: 1 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  CUSTOM FIELDS
                </Typography>
              </Box>
              {customFields.map((field) => (
                <MenuItem
                  key={field.id}
                  onClick={() => !field.required && handleToggle(field.id)}
                  disabled={field.required}
                  sx={{ py: 0.5 }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.visible}
                        size="small"
                        disabled={field.required}
                      />
                    }
                    label={<Typography variant="body2">{field.label}</Typography>}
                    sx={{ width: '100%', m: 0 }}
                  />
                </MenuItem>
              ))}
            </>
          )}
        </Box>
      </Menu>
    </>
  );
};

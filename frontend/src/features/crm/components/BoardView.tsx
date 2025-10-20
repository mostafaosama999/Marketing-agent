import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Lead, PipelineStage, CustomField } from '../../../app/types/crm';
import { LeadCard } from './LeadCard';
import { CardFieldVisibilityMenu } from './CardFieldVisibilityMenu';
import { useCardFieldVisibility } from '../hooks/useCardFieldVisibility';

interface BoardViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  customFields: CustomField[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEditLead: (lead: Lead) => void;
}

interface DraggableLeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  onEdit: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
  visibleFieldIds: Set<string>;
}

const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({
  lead,
  customFields,
  onEdit,
  onDragStart,
  onDragEnd,
  visibleFieldIds
}) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lead.id);
        setIsDragging(true);
        onDragStart(lead);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <LeadCard
        lead={lead}
        customFields={customFields}
        onEdit={onEdit}
        isDragging={isDragging}
        visibleFieldIds={visibleFieldIds}
      />
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  onDrop: (leadId: string, columnId: string) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children, onDrop }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => {
        setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        onDrop(leadId, id);
        setIsOver(false);
      }}
      sx={{
        minHeight: '70vh',
        height: '100%',
        backgroundColor: isOver ? 'action.hover' : 'transparent',
        borderRadius: 1,
        transition: 'background-color 0.2s',
        pb: 2,
      }}
    >
      {children}
    </Box>
  );
};

export const BoardView: React.FC<BoardViewProps> = ({ leads, stages, customFields, onStatusChange, onEditLead }) => {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  // Card field visibility management
  const { fields, setFields, isFieldVisible } = useCardFieldVisibility({
    storageKey: 'crm_kanban_card_fields',
    customFields,
  });

  // Create a Set of visible field IDs for efficient lookup
  const visibleFieldIds = new Set(fields.filter(f => f.visible).map(f => f.id));

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const handleDrop = (leadId: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status);
  };

  // Filter and sort stages
  const visibleStages = stages
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <Box>
      {/* Field Visibility Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <CardFieldVisibilityMenu fields={fields} onFieldsChange={setFields} />
      </Box>

      {/* Board Columns */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
        }}
      >
      {visibleStages.map((stage) => {
        const statusLeads = getLeadsByStatus(stage.label);

        return (
          <Paper
            key={stage.id}
            sx={{
              minWidth: 300,
              maxWidth: 300,
              p: 2,
              backgroundColor: 'grey.50',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
                pb: 1,
                borderBottom: 2,
                borderColor: stage.color,
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {stage.label}
              </Typography>
              <Box
                sx={{
                  backgroundColor: stage.color,
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {statusLeads.length}
              </Box>
            </Box>

            <DroppableColumn id={stage.label} onDrop={handleDrop}>
              {statusLeads.map((lead) => (
                <DraggableLeadCard
                  key={lead.id}
                  lead={lead}
                  customFields={customFields}
                  onEdit={onEditLead}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  visibleFieldIds={visibleFieldIds}
                />
              ))}
              {statusLeads.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No leads
                </Typography>
              )}
            </DroppableColumn>
          </Paper>
        );
      })}
      </Box>
    </Box>
  );
};

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead, PipelineStage, CustomField } from '../../../app/types/crm';
import { LeadCard } from './LeadCard';

interface BoardViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  customFields: CustomField[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEditLead: (lead: Lead) => void;
}

interface SortableLeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  onEdit: (lead: Lead) => void;
}

const SortableLeadCard: React.FC<SortableLeadCardProps> = ({ lead, customFields, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} customFields={customFields} onEdit={onEdit} isDragging={isDragging} />
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 100,
        backgroundColor: isOver ? 'action.hover' : 'transparent',
        borderRadius: 1,
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </Box>
  );
};

export const BoardView: React.FC<BoardViewProps> = ({ leads, stages, customFields, onStatusChange, onEditLead }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const lead = leads.find((l) => l.id === active.id);

      if (lead) {
        let newStatus: string | null = null;

        // Check if dropped on a column (stage label)
        if (stages.some((s) => s.label === over.id)) {
          newStatus = over.id as string;
        } else {
          // Dropped on another lead card, get that lead's status
          const targetLead = leads.find((l) => l.id === over.id);
          if (targetLead) {
            newStatus = targetLead.status;
          }
        }

        // Only update if status changed
        if (newStatus && newStatus !== lead.status) {
          onStatusChange(lead.id, newStatus);
        }
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status);
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  // Filter and sort stages
  const visibleStages = stages
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            <SortableContext
              key={stage.id}
              id={stage.label}
              items={statusLeads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <Paper
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

                <DroppableColumn id={stage.label}>
                  {statusLeads.map((lead) => (
                    <SortableLeadCard key={lead.id} lead={lead} customFields={customFields} onEdit={onEditLead} />
                  ))}
                  {statusLeads.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No leads
                    </Typography>
                  )}
                </DroppableColumn>
              </Paper>
            </SortableContext>
          );
        })}
      </Box>

      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} customFields={customFields} onEdit={onEditLead} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
};

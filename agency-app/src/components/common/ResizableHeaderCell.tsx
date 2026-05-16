import React, { useCallback, useRef } from 'react';
import { Box, TableCell, TableCellProps, Tooltip } from '@mui/material';

interface ResizableHeaderCellProps extends TableCellProps {
  columnId: string;
  width?: number;
  onResize: (columnId: string, width: number) => void;
  onResetWidth?: (columnId: string) => void;
  minWidth?: number;
  children?: React.ReactNode;
}

/**
 * Header cell with a draggable right-edge handle for column resizing.
 * Double-click the handle to reset to default width.
 *
 * - Width is controlled by parent state (typically via useColumnWidths).
 * - When `width` is undefined, the cell uses its natural width.
 */
export const ResizableHeaderCell: React.FC<ResizableHeaderCellProps> = ({
  columnId,
  width,
  onResize,
  onResetWidth,
  minWidth = 60,
  sx,
  children,
  ...rest
}) => {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!cellRef.current) return;

    startXRef.current = e.clientX;
    startWidthRef.current = width ?? cellRef.current.getBoundingClientRect().width;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + delta);
      onResize(columnId, newWidth);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [columnId, width, minWidth, onResize]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onResetWidth) onResetWidth(columnId);
  }, [columnId, onResetWidth]);

  const widthStyles = width
    ? { width, minWidth: width, maxWidth: width }
    : {};

  return (
    <TableCell
      ref={cellRef}
      {...rest}
      sx={{
        position: 'relative',
        ...sx,
        ...widthStyles,
      }}
    >
      {children}
      <Tooltip title="Drag to resize · double-click to reset" enterDelay={600} placement="top">
        <Box
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '6px',
            cursor: 'col-resize',
            userSelect: 'none',
            touchAction: 'none',
            zIndex: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.5,
            },
            '&:active': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.8,
            },
          }}
        />
      </Tooltip>
    </TableCell>
  );
};

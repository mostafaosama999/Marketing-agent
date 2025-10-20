import { useRef, useEffect, useState, useCallback } from 'react';

export const useScrollSync = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const isSyncingRef = useRef(false);

  // Update scrollbar width and overflow state
  const updateScrollbarDimensions = useCallback(() => {
    if (!tableRef.current) return;

    const table = tableRef.current;
    const hasOverflow = table.scrollWidth > table.clientWidth;
    setHasHorizontalOverflow(hasOverflow);
    setScrollbarWidth(table.scrollWidth);
  }, []);

  // Sync scroll from table to scrollbar
  const handleTableScroll = useCallback(() => {
    if (isSyncingRef.current || !tableRef.current || !scrollbarRef.current) return;

    isSyncingRef.current = true;
    scrollbarRef.current.scrollLeft = tableRef.current.scrollLeft;
    isSyncingRef.current = false;
  }, []);

  // Sync scroll from scrollbar to table
  const handleScrollbarScroll = useCallback(() => {
    if (isSyncingRef.current || !tableRef.current || !scrollbarRef.current) return;

    isSyncingRef.current = true;
    tableRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    isSyncingRef.current = false;
  }, []);

  // Set up resize observer to detect overflow changes
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    updateScrollbarDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarDimensions();
    });

    resizeObserver.observe(table);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollbarDimensions]);

  // Add scroll event listeners
  useEffect(() => {
    const table = tableRef.current;
    const scrollbar = scrollbarRef.current;

    if (!table || !scrollbar) return;

    table.addEventListener('scroll', handleTableScroll);
    scrollbar.addEventListener('scroll', handleScrollbarScroll);

    return () => {
      table.removeEventListener('scroll', handleTableScroll);
      scrollbar.removeEventListener('scroll', handleScrollbarScroll);
    };
  }, [handleTableScroll, handleScrollbarScroll]);

  return {
    tableRef,
    scrollbarRef,
    hasHorizontalOverflow,
    scrollbarWidth,
  };
};

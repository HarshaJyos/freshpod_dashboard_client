import { useState, useCallback } from 'react';

export function useResizableColumns(initialWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(initialWidths);

  const startResize = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = widths[index] || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      setWidths(prev => {
        const next = [...prev];
        next[index] = Math.max(50, startWidth + deltaX);
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [widths]);

  return { widths, startResize };
}

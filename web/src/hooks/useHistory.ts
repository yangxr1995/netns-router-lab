import { useRef, useCallback } from 'react';
import type { HistoryState } from '@/types';

interface UseHistoryOptions {
  maxSize?: number;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { maxSize = 50 } = options;
  
  // Use refs only - no React state for history
  const historyRef = useRef<HistoryState[]>([]);
  const currentIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const canUndo = () => currentIndexRef.current > 0;
  const canRedo = () => currentIndexRef.current < historyRef.current.length - 1;

  const pushState = useCallback((state: HistoryState) => {
    // If this is from undo/redo, don't save
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const currentIdx = currentIndexRef.current;
    
    // Remove future states if we're not at the end
    const newHistory = historyRef.current.slice(0, currentIdx + 1);
    
    // Add new state
    newHistory.push(state);
    
    // Limit history size
    if (newHistory.length > maxSize) {
      newHistory.shift();
      currentIndexRef.current = maxSize - 1;
    } else {
      currentIndexRef.current = newHistory.length - 1;
    }
    
    historyRef.current = newHistory;
  }, [maxSize]);

  const undo = useCallback(() => {
    if (!canUndo()) {
      return null;
    }
    
    isUndoRedoRef.current = true;
    currentIndexRef.current -= 1;
    
    return historyRef.current[currentIndexRef.current];
  }, []);

  const redo = useCallback(() => {
    if (!canRedo()) {
      return null;
    }
    
    isUndoRedoRef.current = true;
    currentIndexRef.current += 1;
    
    return historyRef.current[currentIndexRef.current];
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
  }, []);

  const getCanUndo = useCallback(() => canUndo(), []);
  const getCanRedo = useCallback(() => canRedo(), []);

  return {
    pushState,
    undo,
    redo,
    clear,
    canUndo: getCanUndo,
    canRedo: getCanRedo,
    // For debugging
    getHistory: () => historyRef.current,
    getIndex: () => currentIndexRef.current,
  };
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { OCRWord, OCRLine } from '@/lib/ocr/ocr-engine';

interface OCRViewerProps {
  canvas: HTMLCanvasElement;
  words: OCRWord[];
  lines: OCRLine[];
  selectedWords?: string[];
  onWordSelect?: (wordIds: string[]) => void;
  showBoundingBoxes?: boolean;
}

interface SelectableWord extends OCRWord {
  id: string;
  selected: boolean;
}

export function OCRViewer({
  canvas,
  words,
  lines,
  selectedWords = [],
  onWordSelect,
  showBoundingBoxes = false,
}: OCRViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectableWords, setSelectableWords] = useState<SelectableWord[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Initialize selectable words
  useEffect(() => {
    const wordsWithIds = words.map((word, index) => ({
      ...word,
      id: `word-${index}`,
      selected: selectedWords.includes(`word-${index}`),
    }));
    setSelectableWords(wordsWithIds);
  }, [words, selectedWords]);

  // Draw overlay with bounding boxes and selections
  useEffect(() => {
    if (!overlayCanvasRef.current || !canvas) return;

    const overlay = overlayCanvasRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match the PDF canvas
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw bounding boxes for words
    if (showBoundingBoxes) {
      selectableWords.forEach((word) => {
        ctx.strokeStyle = word.selected ? '#3b82f6' : '#94a3b8';
        ctx.lineWidth = word.selected ? 3 : 1;
        ctx.strokeRect(
          word.bbox.x0,
          word.bbox.y0,
          word.bbox.x1 - word.bbox.x0,
          word.bbox.y1 - word.bbox.y0
        );

        if (word.selected) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fillRect(
            word.bbox.x0,
            word.bbox.y0,
            word.bbox.x1 - word.bbox.x0,
            word.bbox.y1 - word.bbox.y0
          );
        }
      });
    }

    // Draw current selection rectangle
    if (currentSelection) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
    }
  }, [canvas, selectableWords, showBoundingBoxes, currentSelection]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart || !overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCurrentSelection({
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !currentSelection) {
      setIsSelecting(false);
      return;
    }

    // Find words within selection
    const selected = selectableWords.filter((word) => {
      return (
        word.bbox.x0 >= currentSelection.x &&
        word.bbox.x1 <= currentSelection.x + currentSelection.width &&
        word.bbox.y0 >= currentSelection.y &&
        word.bbox.y1 <= currentSelection.y + currentSelection.height
      );
    });

    if (selected.length > 0 && onWordSelect) {
      const selectedIds = selected.map((w) => w.id);
      onWordSelect(selectedIds);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setCurrentSelection(null);
  };

  const handleWordClick = (wordId: string) => {
    if (!onWordSelect) return;

    const isSelected = selectedWords.includes(wordId);
    const newSelection = isSelected
      ? selectedWords.filter((id) => id !== wordId)
      : [...selectedWords, wordId];

    onWordSelect(newSelection);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      style={{ maxWidth: '100%', overflow: 'auto' }}
    >
      {/* Original PDF canvas */}
      <div className="relative">
        <div
          dangerouslySetInnerHTML={{ __html: canvas.outerHTML }}
          style={{ display: 'block' }}
        />

        {/* Overlay canvas for selections */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Word overlay for click selection */}
      {!showBoundingBoxes && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {selectableWords.map((word) => {
            const rect = overlayCanvasRef.current?.getBoundingClientRect();
            if (!rect) return null;

            const scaleX = rect.width / canvas.width;
            const scaleY = rect.height / canvas.height;

            return (
              <button
                key={word.id}
                className={`absolute pointer-events-auto transition-all ${
                  word.selected
                    ? 'bg-blue-500/30 ring-2 ring-blue-500'
                    : 'hover:bg-blue-500/10'
                }`}
                style={{
                  left: `${word.bbox.x0 * scaleX}px`,
                  top: `${word.bbox.y0 * scaleY}px`,
                  width: `${(word.bbox.x1 - word.bbox.x0) * scaleX}px`,
                  height: `${(word.bbox.y1 - word.bbox.y0) * scaleY}px`,
                }}
                onClick={() => handleWordClick(word.id)}
                title={word.text}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

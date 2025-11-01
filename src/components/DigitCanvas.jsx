import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../hooks/useI18n';
import { DigitSketchPad } from '../services/digit-canvas';

export const DigitCanvas = forwardRef(({ onChange, brushSettings, children }, ref) => {
  const containerRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const [interactionRow, setInteractionRow] = useState(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = new DigitSketchPad(containerRef.current, 28, 28, {
      brush: brushSettings
    });

    canvas.setChangeHandler(() => {
      if (onChange) {
        onChange(canvas.getPixels());
      }
    });

    canvasInstanceRef.current = canvas;
    setInteractionRow(canvas.getInteractionRow());

    return () => {
      if (canvasInstanceRef.current) {
        canvasInstanceRef.current = null;
      }
      setInteractionRow(null);
    };
  }, [brushSettings]); // Re-creating canvas on brush settings change might be expensive/wrong if it resets drawing.
                       // But following existing pattern for now.
                       // Ideally brush settings should be updated via method, not re-init.
                       // Checking App.jsx, handleSettingsChange calls updateBrushSettings,
                       // but brushSettings prop change triggers this effect.
                       // App.jsx passes VISUALIZER_CONFIG.brush which is constant.
                       // So this effect only runs once. Good.

  useEffect(() => {
    if (canvasInstanceRef.current) {
      canvasInstanceRef.current.onChange = () => {
        if (onChange) {
          onChange(canvasInstanceRef.current.getPixels());
        }
      };
    }
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    clear: () => canvasInstanceRef.current?.clear(),
    setPixels: (pixels) => canvasInstanceRef.current?.setPixels(pixels),
    getPixels: () => canvasInstanceRef.current?.getPixels() || new Float32Array(28 * 28),
    updateBrushSettings: (settings) => canvasInstanceRef.current?.updateBrushSettings(settings),
  }));

  return (
    <div className="digit-canvas-wrapper">
      <div className="container">
        <div id="gridContainer" className="grid-container" ref={containerRef} />
      </div>
      {interactionRow && createPortal(children, interactionRow)}
    </div>
  );
});

DigitCanvas.displayName = 'DigitCanvas';

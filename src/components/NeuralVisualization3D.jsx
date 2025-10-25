import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { NeuralVisualizer } from '../services/neural-visualizer';
import { useI18n } from '../hooks/useI18n';

export const NeuralVisualization3D = forwardRef(({ model, config, onNeuronFocusChange }, ref) => {
  const visualizerRef = useRef(null);
  const containerRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!model) {
      console.log('[NeuralVisualization3D] Waiting for model...');
      return;
    }

    // Verificar se THREE está disponível
    if (typeof window.THREE === 'undefined') {
      console.error('[NeuralVisualization3D] THREE.js not loaded!');
      return;
    }

    console.log('[NeuralVisualization3D] Creating visualizer with model:', model);

    if (!containerRef.current) {
       console.warn('[NeuralVisualization3D] Container ref is null, skipping init');
       return;
    }

    // Clear container to prevent duplicates
    containerRef.current.innerHTML = '';

    try {
      // Criar visualizador Three.js
      const visualizer = new NeuralVisualizer(model, {
        container: containerRef.current,
        layerSpacing: config.layerSpacing,
        maxConnectionsPerNeuron: config.maxConnectionsPerNeuron,
        inputSpacing: config.inputSpacing,
        hiddenSpacing: config.hiddenSpacing,
        inputNodeSize: config.inputNodeSize,
        hiddenNodeRadius: config.hiddenNodeRadius,
        connectionRadius: config.connectionRadius,
        connectionWeightThreshold: config.connectionWeightThreshold,
        showFpsOverlay: config.showFpsOverlay,
        onNeuronFocusChange: onNeuronFocusChange,
        t: t
      });

      visualizerRef.current = visualizer;
      console.log('[NeuralVisualization3D] Visualizer created successfully!');

      // Expor globalmente para debug
      window.neuralVisualizer = visualizer;

    } catch (error) {
      console.error('[NeuralVisualization3D] Error creating visualizer:', error);
    }

    return () => {
      // Cleanup do visualizador
      console.log('[NeuralVisualization3D] Cleaning up visualizer');
      const visualizer = visualizerRef.current;
      if (visualizer) {
        if (visualizer.renderer) {
          visualizer.renderer.dispose();
          if (visualizer.renderer.domElement && visualizer.renderer.domElement.parentNode) {
            visualizer.renderer.domElement.parentNode.removeChild(visualizer.renderer.domElement);
          }
        }
        if (visualizer.controls) {
          visualizer.controls.dispose();
        }
        visualizerRef.current = null;
      }
      // Double check: clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [model, config, onNeuronFocusChange]);

  useImperativeHandle(ref, () => ({
    update: (displayActivations, networkActivations, preActivations) => {
      if (visualizerRef.current) {
        visualizerRef.current.update(displayActivations, networkActivations, preActivations);
      }
    },
    updateNetworkWeights: () => {
      if (visualizerRef.current) {
        visualizerRef.current.updateNetworkWeights();
      }
    },
    clearSelection: () => {
      if (visualizerRef.current) {
        visualizerRef.current.clearSelection();
      }
    },
    get maxConnectionsPerNeuron() {
      return visualizerRef.current?.maxConnectionsPerNeuron || 0;
    },
    set maxConnectionsPerNeuron(value) {
      if (visualizerRef.current) {
        visualizerRef.current.maxConnectionsPerNeuron = value;
      }
    },
    get connectionRadius() {
      return visualizerRef.current?.connectionRadius || 0;
    },
    set connectionRadius(value) {
      if (visualizerRef.current) {
        visualizerRef.current.connectionRadius = value;
      }
    },
    get connectionWeightThreshold() {
      return visualizerRef.current?.connectionWeightThreshold || 0;
    },
    set connectionWeightThreshold(value) {
      if (visualizerRef.current) {
        visualizerRef.current.connectionWeightThreshold = value;
      }
    }
  }));

  // O NeuralVisualizer adiciona o canvas ao container
  return <div ref={containerRef} className="neural-visualization-container" />;
});

NeuralVisualization3D.displayName = 'NeuralVisualization3D';

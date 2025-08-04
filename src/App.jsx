import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import { I18nProvider, useI18n } from './hooks/useI18n';
import { LanguageToggle } from './components/LanguageToggle';
import { FloatingControls } from './components/FloatingControls';
import { ResetButton } from './components/ResetButton';
import { Instructions } from './components/Instructions';
import { InfoModal } from './components/InfoModal';
import { AdvancedSettingsModal } from './components/AdvancedSettingsModal';
import { DigitCanvas } from './components/DigitCanvas';
import { ProbabilityPanel } from './components/ProbabilityPanel';
import { NetworkInfoPanel } from './components/NetworkInfoPanel';
import { NeuronDetailPanel } from './components/NeuronDetailPanel';
import { NeuralVisualization3D } from './components/NeuralVisualization3D';
import { VISUALIZER_CONFIG } from './config/config';
import { softmax } from './utils/math-utils';
import { fetchNetworkDefinition, hydrateTimeline } from './utils/network-utils';
import { FeedForwardModel } from './services/models/neural-network';
import { TimelineSlider } from './components/TimelineSlider';
import { MnistSampleButtons } from './components/MnistSampleButtons';
import Card from './components/ui/Card';

function AppContent() {
  const { t } = useI18n();
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [probabilities, setProbabilities] = useState([]);
  const [model, setModel] = useState(null);
  const [settings, setSettings] = useState({
    connectionLimit: VISUALIZER_CONFIG.maxConnectionsPerNeuron,
    connectionThreshold: VISUALIZER_CONFIG.connectionWeightThreshold,
    connectionThickness: VISUALIZER_CONFIG.connectionRadius,
    brushThickness: VISUALIZER_CONFIG.brush.drawRadius,
    brushStrength: VISUALIZER_CONFIG.brush.drawStrength,
  });

  const digitCanvasRef = useRef(null);
  const visualizerRef = useRef(null);
  const neuralModelRef = useRef(null);
  const gridContainerRef = useRef(null); // Added for the center-column div
  const [neuronFocusData, setNeuronFocusData] = useState(null);
  const [isNeuronPanelVisible, setNeuronPanelVisible] = useState(false);
  const [timelineSnapshots, setTimelineSnapshots] = useState([]);

  useEffect(() => {
    initializeNetwork();

    // Layout calculation for NeuronDetailPanel
    const updateLayout = () => {
      const grid = gridContainerRef.current;
      if (grid) {
        const rect = grid.getBoundingClientRect();
        const top = Math.round(rect.bottom + 16);
        const height = Math.max(window.innerHeight - top - 24, 200);
        document.documentElement.style.setProperty('--neuron-panel-top', `${top}px`);
        document.documentElement.style.setProperty('--neuron-panel-max-height', `${height}px`);
      }
    };

    requestAnimationFrame(updateLayout);
    window.addEventListener('resize', updateLayout);

    const grid = gridContainerRef.current;
    let observer;
    if (grid) {
        observer = new ResizeObserver(updateLayout);
        observer.observe(grid);
    }

    return () => {
        window.removeEventListener('resize', updateLayout);
        if (observer) observer.disconnect();
    };
  }, []);

  const handleNeuronFocusChange = useCallback((data) => {
    console.log('[App] Neuron focus changed:', data);
    setNeuronFocusData(data);
    if (data) {
      setNeuronPanelVisible(true);
    }
  }, []);

  const initializeNetwork = async () => {
    try {
      const weightDefinitionUrl = new URL(VISUALIZER_CONFIG.weightUrl, window.location.href);
      const definition = await fetchNetworkDefinition(weightDefinitionUrl.toString());

      if (!definition?.network) {
        throw new Error("Invalid network definition.");
      }

      const timelineSnapshots = hydrateTimeline(definition.timeline, {
        layerMetadata: definition.network.layers,
        baseUrl: weightDefinitionUrl,
      });

      if (!timelineSnapshots.length) {
        throw new Error("No valid timeline snapshots found.");
      }

      setTimelineSnapshots(timelineSnapshots);

      const defaultSnapshotIndex = Math.max(timelineSnapshots.length - 1, 0);
      const initialSnapshot = timelineSnapshots[defaultSnapshotIndex];
      const initialLayers = await initialSnapshot.loadLayers();

      const neuralModel = new FeedForwardModel({
        normalization: definition.network.normalization,
        architecture: definition.network.architecture,
        layers: initialLayers,
      });

      neuralModelRef.current = neuralModel;
      setModel(neuralModel);

      console.log('[App] Neural model created:', neuralModel);
      console.log('[App] Model architecture:', neuralModel.architecture);
      console.log('[App] Model layers:', neuralModel.layers);

      refreshNetworkState();
    } catch (error) {
      console.error("Failed to initialize network:", error);
    }
  };

  const refreshNetworkState = useCallback(() => {
    if (!neuralModelRef.current || !digitCanvasRef.current) return;

    const rawInput = digitCanvasRef.current.getPixels();
    const propagation = neuralModelRef.current.propagate(rawInput);

    const logitsTyped =
      propagation.preActivations.length > 0
        ? propagation.preActivations[propagation.preActivations.length - 1]
        : new Float32Array(0);

    const probs =
      logitsTyped.length > 0 ? Float32Array.from(softmax(Array.from(logitsTyped))) : new Float32Array(0);

    setProbabilities(Array.from(probs));

    if (visualizerRef.current) {
      const displayActivations = propagation.activations.slice();
      if (displayActivations.length > 0) {
        displayActivations[0] = rawInput;
      }
      if (probs.length && displayActivations.length > 1) {
        displayActivations[displayActivations.length - 1] = probs;
      }

      let networkActivations = propagation.activations;
      if (probs.length) {
        networkActivations = propagation.activations.slice();
        if (networkActivations.length > 1) {
          networkActivations[networkActivations.length - 1] = probs;
        }
      }

      visualizerRef.current.update(displayActivations, networkActivations, propagation.preActivations);
    }
  }, []);

  const handleSnapshotChange = async (snapshot) => {
    if (!snapshot || !neuralModelRef.current) return;
    const layers = await snapshot.loadLayers();
    neuralModelRef.current.updateLayers(layers);
    if (visualizerRef.current) {
      visualizerRef.current.updateNetworkWeights();
    }
    refreshNetworkState();
  };

  const handleReset = () => {
    digitCanvasRef.current?.clear();
    refreshNetworkState();
  };

  // Start with a clean state (same as clicking clear) once the model is ready
  useEffect(() => {
    if (!model) return;
    handleReset();
    setNeuronFocusData(null);
    visualizerRef.current?.clearSelection();
  }, [model]);

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);

    if (digitCanvasRef.current) {
      digitCanvasRef.current.updateBrushSettings({
        drawRadius: newSettings.brushThickness,
        drawStrength: newSettings.brushStrength,
      });
    }

    if (visualizerRef.current) {
      visualizerRef.current.maxConnectionsPerNeuron = newSettings.connectionLimit;
      visualizerRef.current.connectionRadius = newSettings.connectionThickness;
      visualizerRef.current.connectionWeightThreshold = newSettings.connectionThreshold;
      refreshNetworkState();
    }
  };

  return (
    <div className="app-container theme-dark">
      <div className="main-layout">
        <div className="left-column">
          <Card title={t('inputPanelTitle', 'Input')} className="panel input-panel">
            <DigitCanvas
              ref={digitCanvasRef}
              onChange={refreshNetworkState}
              brushSettings={VISUALIZER_CONFIG.brush}
            >
              <MnistSampleButtons
                onSampleApplied={refreshNetworkState}
                digitCanvasRef={digitCanvasRef}
              />
            </DigitCanvas>
          </Card>
          <ResetButton onClick={handleReset} />

          <Card title={t('networkInfoTitle', 'Network Info')} className="panel info-panel">
            <NetworkInfoPanel model={model} />
          </Card>

          <Instructions />
        </div>

        <div className="center-column" ref={gridContainerRef}>
          <NeuralVisualization3D
            ref={visualizerRef}
            model={model}
            config={VISUALIZER_CONFIG}
            onNeuronFocusChange={handleNeuronFocusChange}
          />
          <NeuronDetailPanel
            data={neuronFocusData}
            visible={isNeuronPanelVisible}
            onClear={() => {
              setNeuronFocusData(null);
              visualizerRef.current?.clearSelection();
              setNeuronPanelVisible(false);
            }}
            onClose={() => setNeuronPanelVisible(false)}
          />
        </div>

        <div className="right-column">
          <Card title={t('predictionTitle', 'Prediction')} className="panel prediction-panel">
            <ProbabilityPanel probabilities={probabilities} />
          </Card>
        </div>
      </div>

      <FloatingControls
        onInfoClick={() => setShowInfo(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      <LanguageToggle />

      <a
        href="https://github.com/Nandobez"
        className="github-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        https://github.com/Nandobez
      </a>

      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      <AdvancedSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      <TimelineSlider
        timelineSnapshots={timelineSnapshots}
        onSnapshotChange={handleSnapshotChange}
      />
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App

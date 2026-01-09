export const VISUALIZER_CONFIG = {
  weightUrl: "./exports/mlp_weights.json",
  maxConnectionsPerNeuron: 24,
  layerSpacing: 8.0,
  inputSpacing: 0.24,
  hiddenSpacing: 0.95,
  inputNodeSize: 0.18,
  hiddenNodeRadius: 0.22,
  connectionRadius: 0.005,
  connectionWeightThreshold: 0,
  showFpsOverlay: true,
  brush: {
    drawRadius: 1.4,
    eraseRadius: 2.5,
    drawStrength: 0.95,
    eraseStrength: 0.95,
    softness: 0.3,
  },
};

export const MNIST_SAMPLE_MANIFEST_URL = "./data/mnist-test-manifest.json";

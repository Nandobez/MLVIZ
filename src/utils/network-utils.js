import { resolveRelativeUrl, decodeFloat16Base64, decodeWeightMatrix } from './encoding-utils.js';

function normaliseShape(shape, fallback = []) {
  const source = Array.isArray(shape) ? shape : fallback;
  if (!Array.isArray(source)) return [];
  return source.map((value) => Number(value) || 0);
}

function normaliseLayerMetadata(layer, index) {
  const layerIndex = Number.isFinite(layer?.layer_index) ? Number(layer.layer_index) : index;
  const weightShape = normaliseShape(layer?.weight_shape);
  const biasShape = normaliseShape(layer?.bias_shape);
  const resolvedWeightShape =
    weightShape.length === 2 ? weightShape : [biasShape[0] ?? 0, weightShape[1] ?? 0];
  const resolvedBiasShape = biasShape.length >= 1 ? biasShape : [resolvedWeightShape[0] ?? 0];
  return {
    layerIndex,
    name: typeof layer?.name === "string" ? layer.name : `dense_${layerIndex}`,
    activation: typeof layer?.activation === "string" ? layer.activation : "relu",
    weightShape: resolvedWeightShape,
    biasShape: resolvedBiasShape,
  };
}

function normaliseWeightsDescriptor(descriptor, baseUrl) {
  if (!descriptor || typeof descriptor !== "object") return null;
  const path = typeof descriptor.path === "string" ? descriptor.path : null;
  if (!path) return null;
  const url = resolveRelativeUrl(baseUrl, path);
  if (!url) return null;
  return {
    path,
    url,
    dtype: typeof descriptor.dtype === "string" ? descriptor.dtype : "float16",
    format: typeof descriptor.format === "string" ? descriptor.format : "layer_array_v1",
  };
}

async function fetchNetworkDefinition(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load network weights (${response.status})`);
  }
  return response.json();
}

async function fetchSnapshotPayload(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load snapshot (${response.status})`);
  }
  return response.json();
}

function decodeSnapshotLayers(payload, layerMetadata) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.layers)) {
    throw new Error("Snapshot file does not contain valid layer data.");
  }

  return layerMetadata.map((meta, index) => {
    const layerPayload =
      payload.layers[index] ??
      payload.layers.find((layer) => Number(layer?.layer_index) === meta.layerIndex);
    if (!layerPayload) {
      throw new Error(`Snapshot missing layer ${meta.layerIndex}.`);
    }
    const weightsInfo = layerPayload.weights ?? {};
    const biasesInfo = layerPayload.biases ?? {};
    if (typeof weightsInfo.data !== "string" || typeof biasesInfo.data !== "string") {
      throw new Error("Snapshot layer does not contain encoded weights.");
    }

    const weightShape = normaliseShape(weightsInfo.shape, meta.weightShape);
    const biasShape = normaliseShape(biasesInfo.shape, meta.biasShape);
    if (weightShape.length !== 2) {
      throw new Error("Snapshot layer has invalid weight dimension.");
    }
    if (biasShape.length === 0) {
      throw new Error("Snapshot layer has invalid bias dimension.");
    }

    const weights = decodeWeightMatrix(weightsInfo.data, weightShape);
    const biases = decodeFloat16Base64(biasesInfo.data, biasShape[0]);
    return {
      name: typeof layerPayload.name === "string" ? layerPayload.name : meta.name,
      activation:
        typeof layerPayload.activation === "string" ? layerPayload.activation : meta.activation,
      weights,
      biases,
    };
  });
}

function hydrateTimeline(rawTimeline, options = {}) {
  if (!Array.isArray(rawTimeline)) return [];

  const layerMetadataSource = Array.isArray(options.layerMetadata) ? options.layerMetadata : [];
  if (layerMetadataSource.length === 0) return [];
  const layerMetadata = layerMetadataSource.map((layer, index) =>
    normaliseLayerMetadata(layer, index),
  );

  const baseUrl = options.baseUrl ?? window.location.href;

  return rawTimeline
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;

      const weights = normaliseWeightsDescriptor(entry.weights, baseUrl);
      if (!weights?.url) return null;

      const metrics = typeof entry.metrics === "object" && entry.metrics !== null ? entry.metrics : {};
      const snapshot = {
        id: typeof entry.id === "string" ? entry.id : `snapshot_${index}`,
        order: Number.isFinite(entry.order) ? Number(entry.order) : index,
        label: typeof entry.label === "string" ? entry.label : `Snapshot ${index + 1}`,
        description: typeof entry.description === "string" ? entry.description : "",
        kind: typeof entry.kind === "string" ? entry.kind : "approx",
        imagesSeen: Number.isFinite(entry.images_seen) ? entry.images_seen : null,
        targetImages: Number.isFinite(entry.target_images) ? entry.target_images : null,
        batchesSeen: Number.isFinite(entry.batches_seen) ? entry.batches_seen : null,
        datasetPasses: Number.isFinite(entry.dataset_passes) ? entry.dataset_passes : null,
        datasetMultiple: Number.isFinite(entry.dataset_multiple) ? entry.dataset_multiple : null,
        metrics: {
          testAccuracy: Number.isFinite(metrics.test_accuracy) ? metrics.test_accuracy : null,
          avgTrainingLoss: Number.isFinite(metrics.avg_training_loss) ? metrics.avg_training_loss : null,
        },
        weights,
        layers: null,
        async loadLayers() {
          if (Array.isArray(this.layers) && this.layers.length) {
            return this.layers;
          }
          const payload = await fetchSnapshotPayload(this.weights.url);
          this.layers = decodeSnapshotLayers(payload, layerMetadata);
          return this.layers;
        },
      };
      return snapshot;
    })
    .filter(Boolean);
}

function renderErrorMessage(message) {
  const chart = document.getElementById("predictionChart");
  if (chart) {
    chart.innerHTML = `<p class="error-text">${message}</p>`;
  }
}

export { normaliseShape, normaliseLayerMetadata, normaliseWeightsDescriptor, fetchNetworkDefinition, fetchSnapshotPayload, decodeSnapshotLayers, hydrateTimeline, renderErrorMessage };

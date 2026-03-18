function formatInteger(value) {
  if (!Number.isFinite(value)) return "";
  return Math.round(value).toLocaleString();
}

function resolveTranslator(t) {
  if (typeof t === "function") {
    return (key, fallback, replacements = {}) => t(key, fallback, replacements);
  }
  return (key, fallback, replacements = {}) => {
    let text = fallback ?? key;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(`{${placeholder}}`, value);
    });
    return text;
  };
}

function formatDecimal(value, digits) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

function formatSnapshotDescription(snapshot, t) {
  const translate = resolveTranslator(t);
  if (snapshot.description) return snapshot.description;
  const parts = [];
  if (Number.isFinite(snapshot.imagesSeen)) {
    parts.push(translate('timelineImages', '{count} images', { count: formatInteger(snapshot.imagesSeen) }));
  }
  if (Number.isFinite(snapshot.datasetMultiple)) {
    parts.push(translate('timelineDatasetMultiple', '{count}× dataset', { count: snapshot.datasetMultiple }));
  } else if (Number.isFinite(snapshot.datasetPasses)) {
    parts.push(translate('timelineDatasetPasses', '{count}× dataset', { count: formatDecimal(snapshot.datasetPasses, 2) }));
  }
  if (Number.isFinite(snapshot.batchesSeen)) {
    parts.push(translate('timelineBatches', '{count} batches', { count: formatInteger(snapshot.batchesSeen) }));
  }
  return parts.join(" • ");
}

function formatTimelineMetrics(metrics, t) {
  const translate = resolveTranslator(t);
  if (!metrics) return "";
  const segments = [];
  if (Number.isFinite(metrics.testAccuracy)) {
    segments.push(translate('timelineTestAccuracy', 'Test acc: {value}%', { value: formatDecimal(metrics.testAccuracy * 100, 2) }));
  }
  if (Number.isFinite(metrics.avgTrainingLoss)) {
    segments.push(translate('timelineAvgLoss', 'Avg loss: {value}', { value: formatDecimal(metrics.avgTrainingLoss, 4) }));
  }
  return segments.join(" • ");
}

export { formatInteger, formatDecimal, formatSnapshotDescription, formatTimelineMetrics };

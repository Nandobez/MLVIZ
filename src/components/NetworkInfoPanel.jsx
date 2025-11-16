import { useI18n } from '../hooks/useI18n';
import Badge from './ui/Badge';
import AlertBanner from './ui/AlertBanner';

export function NetworkInfoPanel({ model }) {
  const { t, language } = useI18n();
  const numberFormatter = new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US');

  const formatNumber = (value) => {
    if (!Number.isFinite(value)) return "—";
    return numberFormatter.format(Math.round(value));
  };

  const describeLayerName = (rawName, index) => {
    const defaultName = t('layerDefault', 'Layer {index}', { index: index + 1 });
    if (typeof rawName === "string" && rawName.trim().length > 0) {
      const normalized = rawName.replace(/[_-]+/g, " ").trim();
      if (normalized.length) {
        const lower = normalized.toLowerCase();
        if (lower.startsWith('dense')) {
          return `${t('networkInfoDenseLayer', 'Dense Layer')} ${index + 1}`;
        }
        if (lower.startsWith('output')) {
          return t('networkInfoOutputLayer', 'Output Layer');
        }
        if (lower.startsWith('input')) {
          return t('networkInfoInputLayer', 'Input Layer');
        }
        return normalized;
      }
    }
    return defaultName;
  };

  if (!model || !Array.isArray(model.layers) || model.layers.length === 0) {
    return (
      <div id="networkInfoPanel" className="network-info-panel">
        <h3 className="network-info-panel__title">{t('networkInfoTitle')}</h3>
        <div className="network-info-panel__empty">
          {t('networkInfoEmpty')}
        </div>
      </div>
    );
  }

  const architecture = Array.isArray(model.architecture) ? model.architecture : [];
  const layerSummaries = model.layers.map((layer, index) => {
    const archInput = architecture[index];
    const archOutput = architecture[index + 1];
    const weightRows = Array.isArray(layer.weights) ? layer.weights : [];
    const inputSize =
      typeof archInput === "number" && Number.isFinite(archInput)
        ? archInput
        : weightRows[0]?.length ?? 0;
    const outputSizeCandidate =
      typeof archOutput === "number" && Number.isFinite(archOutput)
        ? archOutput
        : layer.biases?.length ?? 0;
    const outputSize = Number.isFinite(outputSizeCandidate) ? outputSizeCandidate : 0;

    let weightCount = 0;
    for (const row of weightRows) {
      if (row && typeof row.length === "number") {
        weightCount += row.length;
      }
    }

    const biasArray = layer.biases;
    const biasCount = typeof biasArray?.length === "number" ? biasArray.length : 0;
    const parameterCount = weightCount + biasCount;

    return {
      index,
      name: describeLayerName(layer.name, index),
      activation: typeof layer.activation === "string" ? layer.activation : null,
      inputSize,
      outputSize,
      weightCount,
      biasCount,
      parameterCount,
    };
  });

  const totalParameters = layerSummaries.reduce((sum, entry) => sum + entry.parameterCount, 0);

  const firstArchitectureValue = architecture[0];
  const lastArchitectureValue = architecture[architecture.length - 1];
  const inputNodes =
    typeof firstArchitectureValue === "number" && Number.isFinite(firstArchitectureValue)
      ? firstArchitectureValue
      : layerSummaries[0]?.inputSize ?? 0;
  const lastLayer = layerSummaries[layerSummaries.length - 1];
  const outputNodes =
    typeof lastArchitectureValue === "number" && Number.isFinite(lastArchitectureValue)
      ? lastArchitectureValue
      : lastLayer?.outputSize ?? 0;

  return (
    <div id="networkInfoPanel" className="network-info-panel">
      <h3 className="network-info-panel__title">{t('networkInfoTitle')}</h3>

      <AlertBanner style={{ marginBottom: '1rem', padding: '0.75rem 1ch' }}>
        <Badge style={{ marginRight: '1ch', fontWeight: 'bold' }}>
          {t('networkInfoTotalParams', 'Total Params').toUpperCase()}
        </Badge>
        <span style={{ color: 'var(--theme-focused-foreground)', fontWeight: 'bold', fontSize: '1.1rem' }}>
          {formatNumber(totalParameters)}
        </span>
      </AlertBanner>

      <div className="network-info-panel__summary">
        <AlertBanner style={{ marginBottom: '0.5rem', padding: '0.5rem 1ch', background: 'var(--theme-border-subdued)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '1ch' }}>
            <span>
              <Badge style={{ marginRight: '0.5ch', fontSize: '0.7rem' }}>{t('networkInfoInputBadge', 'IN')}</Badge>
              <strong style={{ color: 'var(--theme-focused-foreground)' }}>{formatNumber(inputNodes)}</strong>
            </span>
            <span>
              <Badge style={{ marginRight: '0.5ch', fontSize: '0.7rem' }}>{t('networkInfoOutputBadge', 'OUT')}</Badge>
              <strong style={{ color: 'var(--theme-focused-foreground)' }}>{formatNumber(outputNodes)}</strong>
            </span>
            <span>
              <Badge style={{ marginRight: '0.5ch', fontSize: '0.7rem' }}>{t('networkInfoLayersBadge', 'LAYERS')}</Badge>
              <strong style={{ color: 'var(--theme-focused-foreground)' }}>{formatNumber(layerSummaries.length)}</strong>
            </span>
          </div>
        </AlertBanner>
      </div>

      <div className="network-info-panel__layers">
        {layerSummaries.map((entry) => (
          <AlertBanner key={entry.index} style={{ marginBottom: '0.75rem', padding: '0.75rem 1ch' }}>
            <div style={{ width: '100%' }}>
              <div className="network-info-panel__layer-title" style={{ marginBottom: '0.5rem' }}>
                <Badge style={{ marginRight: '0.5ch' }}>{entry.name}</Badge>
                {entry.activation && <Badge style={{ marginLeft: '0.5ch', background: 'var(--theme-focused-foreground)', color: 'var(--theme-background)' }}>{entry.activation}</Badge>}
                <span style={{ marginLeft: '0.5ch', color: 'var(--theme-focused-foreground)' }}>
                  {formatNumber(entry.inputSize)} → {formatNumber(entry.outputSize)}
                </span>
              </div>
              <div className="network-info-panel__layer-metrics" style={{ display: 'flex', gap: '1.5ch', fontSize: '0.85rem' }}>
                <span>
                  <span style={{ color: 'var(--theme-text)', opacity: 0.7 }}>W:</span>
                  <strong style={{ marginLeft: '0.5ch', color: 'var(--theme-focused-foreground)' }}>{formatNumber(entry.weightCount)}</strong>
                </span>
                <span>
                  <span style={{ color: 'var(--theme-text)', opacity: 0.7 }}>B:</span>
                  <strong style={{ marginLeft: '0.5ch', color: 'var(--theme-focused-foreground)' }}>{formatNumber(entry.biasCount)}</strong>
                </span>
                <span>
                  <span style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Σ:</span>
                  <strong style={{ marginLeft: '0.5ch', color: 'var(--theme-focused-foreground)' }}>{formatNumber(entry.parameterCount)}</strong>
                </span>
              </div>
            </div>
          </AlertBanner>
        ))}
      </div>
    </div>
  );
}

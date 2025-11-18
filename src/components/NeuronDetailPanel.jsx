import { useI18n } from '../hooks/useI18n';
import Button from './ui/Button';
import Badge from './ui/Badge';
import AlertBanner from './ui/AlertBanner';

export function NeuronDetailPanel({ data, onClear, onClose, visible = true }) {
  if (!data || !visible) return null;

  const { t } = useI18n();

  const formatValue = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "-∞" : "NaN";
    const abs = Math.abs(value);
    if (abs >= 10000 || (abs > 0 && abs < 0.0001)) {
      return value.toExponential(2);
    }
    return value.toFixed(abs >= 1 ? 3 : 4);
  };

  const hasIncoming = Boolean(data.incoming?.length);
  const hasOutgoing = Boolean(data.outgoing?.length);

  return (
    <div className="neuron-detail-panel-overlay" onClick={() => onClose?.()}>
      <div
        className="neuron-detail-panel visible"
        aria-live="polite"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="neuron-detail-panel__inner">
          <div className="neuron-detail-panel__header">
            <AlertBanner style={{ flex: 1, padding: '0.5rem 1ch', marginBottom: '0.5rem' }}>
              <Badge style={{ marginRight: '1ch' }}>{data.layerLabel}</Badge>
              <span>{t('neuron', 'Neuron').toUpperCase()} #{data.neuronIndex + 1}</span>
              {data.activationName && <Badge style={{ marginLeft: '1ch' }}>{data.activationName}</Badge>}
            </AlertBanner>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Button
              theme="SECONDARY"
              onClick={onClear}
              style={{ width: '100%' }}
            >
              [✖ {t('clearSelection', 'Clear Selection').toUpperCase()}]
            </Button>
          </div>
          <div className="neuron-detail-panel__body">
            {data.preActivation !== null && data.preActivation !== undefined && (
              <div className="neuron-detail-panel__formula">
                <span className="neuron-detail-panel__formula-badge">Σ</span>
                <div className="neuron-detail-panel__formula-text">
                  <div className="neuron-detail-panel__formula-label">{t('formula', 'Formula')}</div>
                <div className="neuron-detail-panel__formula-math">
                  Σ<span className="neuron-detail-panel__formula-index">i</span>
                  {' '}({`x`}
                  <span className="neuron-detail-panel__formula-index">i</span>
                  {' '}·{' '}
                  {`w`}
                  <span className="neuron-detail-panel__formula-index">i</span>
                  {")"}
                  {data.bias !== null && data.bias !== undefined && " + b"}
                </div>
                <div className="neuron-detail-panel__formula-legend">
                  <span>{t('formulaInputLegend', 'xᵢ: input/activation from source i')}</span>
                  <span>{t('formulaWeightLegend', 'wᵢ: weight connecting source i to this neuron')}</span>
                  <span>{t('formulaSummationLegend', 'Σ: sum over all incoming inputs/weights')}</span>
                  {data.bias !== null && data.bias !== undefined && (
                    <span>{t('formulaBiasLegend', 'b: bias term for this neuron')}</span>
                  )}
                </div>
                </div>
              </div>
            )}

            {(data.bias !== null && data.bias !== undefined ||
              data.preActivation !== null && data.preActivation !== undefined) && (
            <div className="neuron-detail-panel__totals">
              {data.bias !== null && data.bias !== undefined && (
                <div className="neuron-detail-panel__row neuron-detail-panel__row--bias">
                  <div><small>{t('bias', 'Bias')}</small><br /><strong>{formatValue(data.bias)}</strong></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              )}
              {data.preActivation !== null && data.preActivation !== undefined && (
                <div className="neuron-detail-panel__row neuron-detail-panel__row--total">
                  <div><small>Σ</small><br /><strong>{formatValue(data.preActivation)}</strong></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              )}
            </div>
          )}

          <div className="neuron-detail-panel__activations">
            <div className="neuron-detail-panel__activation-chip">
              <small>{t('inputLayerSize', 'Input Layer Size')}</small>
              <strong>{data.previousLayerSize ?? "—"}</strong>
            </div>
            <div className="neuron-detail-panel__activation-chip">
              <small>{t('outputLayerSize', 'Output Layer Size')}</small>
              <strong>{data.nextLayerSize ?? "—"}</strong>
            </div>
          </div>

          {hasIncoming ? (
            <div className="neuron-detail-panel__section neuron-detail-panel__section--subtle">
              <div className="neuron-detail-panel__section-title">{t('incomingContributions', 'Incoming Contributions')}</div>
              <div className="neuron-detail-panel__row neuron-detail-panel__row--header">
                <div>{t('source', 'Source')}</div>
                <div>{t('inputValue', 'Input')}</div>
                <div>{t('weight', 'Weight')}</div>
                <div>{t('product', 'Product')}</div>
              </div>
              {data.incoming.map((entry, idx) => (
                <div key={idx} className="neuron-detail-panel__row">
                  <div><small>{t('source', 'Source')}</small><br /><strong>#{entry.sourceIndex + 1}</strong></div>
                  <div><small>{t('inputValue', 'Input')}</small><br />{formatValue(entry.sourceActivation)}</div>
                  <div><small>{t('weight', 'Weight')}</small><br />{formatValue(entry.weight)}</div>
                  <div><small>{t('product', 'Product')}</small><br /><strong>{formatValue(entry.contribution)}</strong></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="neuron-detail-panel__empty">
              {t('noIncomingConnections', 'No incoming connections for this layer.')}
            </div>
              )}

              {hasOutgoing && (
                <div className="neuron-detail-panel__section neuron-detail-panel__section--highlight">
                  <div className="neuron-detail-panel__section-title">{t('outgoingContributions', 'Outgoing Contributions')}</div>
              <div className="neuron-detail-panel__row neuron-detail-panel__row--header">
                <div>{t('target', 'Target')}</div>
                <div>{t('targetActivation', 'Activation (Target)')}</div>
                <div>{t('weight', 'Weight')}</div>
                <div>{t('contribution', 'Contribution')}</div>
              </div>
              {data.outgoing.map((entry, idx) => (
                <div key={idx} className="neuron-detail-panel__row">
                  <div><small>{t('target', 'Target')}</small><br /><strong>#{entry.targetIndex + 1}</strong></div>
                  <div><small>{t('targetActivation', 'Activation (Target)')}</small><br />{formatValue(entry.targetActivation)}</div>
                  <div><small>{t('weight', 'Weight')}</small><br />{formatValue(entry.weight)}</div>
                  <div><small>{t('contribution', 'Contribution')}</small><br /><strong>{formatValue(entry.contribution)}</strong></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

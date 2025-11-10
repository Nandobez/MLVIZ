import { useI18n } from '../hooks/useI18n';
import BarProgress from './ui/BarProgress';
import Badge from './ui/Badge';

export function ProbabilityPanel({ probabilities = [] }) {
  const { t } = useI18n();

  if (!probabilities.length) {
    probabilities = new Array(10).fill(0);
  }

  const maxProb = Math.max(...probabilities);
  const maxIndex = probabilities.indexOf(maxProb);

  return (
    <div className="probability-panel">
      <div className="probability-panel__header">
        <span className="probability-panel__title">{t('predictionTitle')}</span>
        <span className="probability-panel__top-prediction">
          {maxProb > 0 ? maxIndex : '-'}
        </span>
      </div>
      <div className="probability-panel__bars">
        {probabilities.map((prob, digit) => {
          const clamped = Math.max(0, Math.min(1, prob));
          const isHighest = digit === maxIndex && clamped > 0;

          return (
            <div key={digit} className="probability-bar">
              <Badge className="probability-bar__label">{digit}</Badge>
              <div className="probability-bar__progress">
                <BarProgress progress={clamped * 100} />
              </div>
              <span className="probability-bar__value">
                {(clamped * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

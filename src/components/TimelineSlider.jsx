import React, { useState, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { formatSnapshotDescription, formatTimelineMetrics } from '../utils/format-utils';
import BarProgress from './ui/BarProgress';
import Badge from './ui/Badge';

export function TimelineSlider({ timelineSnapshots, onSnapshotChange }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Set initial index to the last snapshot when snapshots are loaded
  useEffect(() => {
    if (timelineSnapshots && timelineSnapshots.length > 0) {
      const lastIndex = timelineSnapshots.length - 1;
      setActiveIndex(lastIndex);
      // We don't automatically trigger onSnapshotChange here to avoid double initialization
      // if the parent already loads the default snapshot.
      // But if we wanted to sync, we could.
      // For now, let's assume parent handles initial load.
    }
  }, [timelineSnapshots]);

  const handleSliderChange = async (event) => {
    const index = Number(event.target.value);
    if (Number.isNaN(index)) return;

    setActiveIndex(index);

    if (timelineSnapshots && timelineSnapshots[index]) {
      setLoading(true);
      try {
        await onSnapshotChange(timelineSnapshots[index], index);
      } catch (error) {
        console.error("Error changing snapshot:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!timelineSnapshots || timelineSnapshots.length === 0) {
    return null;
  }

  const currentSnapshot = timelineSnapshots[activeIndex];
  const metricsText = currentSnapshot ? formatTimelineMetrics(currentSnapshot.metrics, t) : "";
  const maxIndex = Math.max(timelineSnapshots.length - 1, 0);

  const progressPercentage = maxIndex > 0 ? (activeIndex / maxIndex) * 100 : 0;

  return (
    <div id="timelineOverlay" className={`timeline-overlay ${loading ? 'timeline-overlay--loading' : ''}`}>
      <div className="timeline-container">
        <div className="timeline-header">
          <Badge style={{ marginRight: '1ch' }}>{t('timelineTrainingLabel', 'TRAINING')}</Badge>
          <span className="timeline-title">{currentSnapshot?.label || t('timelineProgressLabel', 'Progress')}</span>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <BarProgress progress={progressPercentage} />
        </div>

        <input
          id="timelineSlider"
          className="timeline-slider"
          type="range"
          min="0"
          max={maxIndex}
          value={activeIndex}
          step="1"
          disabled={loading || timelineSnapshots.length <= 1}
          aria-label={t('timelineAriaLabel', 'Training progress')}
          onChange={handleSliderChange}
        />

        <div className="timeline-meta">
          <span id="timelineLabel" className="timeline-label">
            {currentSnapshot ? formatSnapshotDescription(currentSnapshot, t) : ''}
          </span>
          <Badge className="timeline-metrics">
            {metricsText || t('timelineNoMetrics', 'No metrics')}
          </Badge>
        </div>
      </div>
    </div>
  );
}

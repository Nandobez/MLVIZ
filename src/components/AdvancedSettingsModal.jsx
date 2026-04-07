import { useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import Card from './ui/Card';
import Button from './ui/Button';

export function AdvancedSettingsModal({ isOpen, onClose, settings, onSettingsChange }) {
  const { t } = useI18n();

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div
      id="advancedSettingsModal"
      className={`advanced-modal ${isOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target.id === 'advancedSettingsModal' && onClose()}
    >
      <div className="advanced-modal-content-wrapper" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
        <Card
          title={t('advancedSettingsTitle')}
          headerAction={
            <Button
              theme="SECONDARY"
              onClick={onClose}
              style={{
                padding: 0,
                minWidth: '24px',
                width: '24px',
                height: '24px',
                lineHeight: '24px',
                fontSize: '16px',
                minHeight: '24px',
              }}
            >
              ×
            </Button>
          }
          className="advanced-modal-card"
        >
          <div className="advanced-modal-body modal-scroll">
            {/* Connection Limit */}
            <div className="advanced-control">
              <label htmlFor="connectionLimitSlider" className="advanced-label">
                {t('advancedConnectionLimit')}
              </label>
              <div className="advanced-slider">
                <input
                  id="connectionLimitSlider"
                  type="range"
                  min="1"
                  max="64"
                  step="1"
                  value={settings.connectionLimit || 24}
                  onChange={(e) => handleChange('connectionLimit', parseInt(e.target.value))}
                />
                <span className="advanced-value">{settings.connectionLimit || 24}</span>
              </div>
              <p className="advanced-hint">{t('advancedConnectionLimitHint')}</p>
            </div>

            {/* Connection Threshold */}
            <div className="advanced-control">
              <label htmlFor="connectionThresholdSlider" className="advanced-label">
                {t('advancedConnectionThreshold')}
              </label>
              <div className="advanced-slider">
                <input
                  id="connectionThresholdSlider"
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.0005"
                  value={settings.connectionThreshold || 0}
                  onChange={(e) => handleChange('connectionThreshold', parseFloat(e.target.value))}
                />
                <span className="advanced-value">
                  {(settings.connectionThreshold || 0).toFixed(4)}
                </span>
              </div>
              <p className="advanced-hint">{t('advancedConnectionThresholdHint')}</p>
            </div>

            {/* Connection Thickness */}
            <div className="advanced-control">
              <label htmlFor="connectionThicknessSlider" className="advanced-label">
                {t('advancedConnectionThickness')}
              </label>
              <div className="advanced-slider">
                <input
                  id="connectionThicknessSlider"
                  type="range"
                  min="0.001"
                  max="0.03"
                  step="0.001"
                  value={settings.connectionThickness || 0.005}
                  onChange={(e) => handleChange('connectionThickness', parseFloat(e.target.value))}
                />
                <span className="advanced-value">
                  {(settings.connectionThickness || 0.005).toFixed(3)}
                </span>
              </div>
              <p className="advanced-hint">{t('advancedConnectionThicknessHint')}</p>
            </div>

            {/* Brush Thickness */}
            <div className="advanced-control">
              <label htmlFor="brushThicknessSlider" className="advanced-label">
                {t('advancedBrushThickness')}
              </label>
              <div className="advanced-slider">
                <input
                  id="brushThicknessSlider"
                  type="range"
                  min="0.4"
                  max="4"
                  step="0.1"
                  value={settings.brushThickness || 1.4}
                  onChange={(e) => handleChange('brushThickness', parseFloat(e.target.value))}
                />
                <span className="advanced-value">
                  {(settings.brushThickness || 1.4).toFixed(1)}
                </span>
              </div>
              <p className="advanced-hint">{t('advancedBrushThicknessHint')}</p>
            </div>

            {/* Brush Strength */}
            <div className="advanced-control">
              <label htmlFor="brushStrengthSlider" className="advanced-label">
                {t('advancedBrushStrength')}
              </label>
              <div className="advanced-slider">
                <input
                  id="brushStrengthSlider"
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={settings.brushStrength || 0.95}
                  onChange={(e) => handleChange('brushStrength', parseFloat(e.target.value))}
                />
                <span className="advanced-value">
                  {Math.round((settings.brushStrength || 0.95) * 100)}%
                </span>
              </div>
              <p className="advanced-hint">{t('advancedBrushStrengthHint')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

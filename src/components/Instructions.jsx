import { useI18n } from '../hooks/useI18n';
import Card from './ui/Card';
import AlertBanner from './ui/AlertBanner';

export function Instructions() {
  const { t } = useI18n();

  return (
    <>
      {/* Desktop Instructions */}
      <div id="instructionsOverlay" className="instructions-overlay">
        <Card title={t('instructionsTitle', 'Instructions')} style={{ maxWidth: '400px' }}>
          <div className="instructions-content">
            <p dangerouslySetInnerHTML={{ __html: t('instructionsDraw') }} />
            <p dangerouslySetInnerHTML={{ __html: t('instructions3D') }} />
          </div>
        </Card>
      </div>

      {/* Mobile Instructions */}
      <div id="mobileInstructionsOverlay" className="mobile-instructions-overlay">
        <Card title={t('mobileInstructionsTitle')} style={{ width: '100%' }}>
          <ul className="mobile-gesture-list">
            <li dangerouslySetInnerHTML={{ __html: t('mobileInstructionsDraw') }} />
            <li dangerouslySetInnerHTML={{ __html: t('mobileInstructionsRotate') }} />
            <li dangerouslySetInnerHTML={{ __html: t('mobileInstructionsPan') }} />
            <li dangerouslySetInnerHTML={{ __html: t('mobileInstructionsZoom') }} />
          </ul>
        </Card>
      </div>
    </>
  );
}

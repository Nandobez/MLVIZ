import { useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import Card from './ui/Card';
import Button from './ui/Button';

export function InfoModal({ isOpen, onClose }) {
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

  return (
    <div
      id="infoModal"
      className={`info-modal ${isOpen ? 'open' : ''}`}
      onClick={(e) => e.target.id === 'infoModal' && onClose()}
    >
      <div className="info-modal-content-wrapper" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
        <Card
          title={t('infoModalTitle')}
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
          className="info-modal-card"
        >
          <div className="info-modal-body modal-scroll">
            <p dangerouslySetInnerHTML={{ __html: t('infoModalIntro') }} />
            <p>{t('infoModalDescription')}</p>

            <h4>{t('infoModalHowItWorks')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModalHowDraw') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalHowObserve') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalHowPredict') }} />
            </ul>

            <h4>{t('infoModalArchitecture')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModalArchInput') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalArchDense1') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalArchDense2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalArchOutput') }} />
            </ul>

            <h4>{t('infoModal3DControls')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModal3DRotate') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModal3DPan') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModal3DZoom') }} />
            </ul>

            <h4>{t('infoModalColorCoding')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModalColorNodes') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalColorConnections') }} />
            </ul>

            <h4>{t('infoModalTrainOwn')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModalTrainCommand') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalTrainExport') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalTrainCustomize') }} />
            </ul>

            <h4>{t('infoModalRealtime')}</h4>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t('infoModalRealtimeActivations') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalRealtimeConnections') }} />
              <li dangerouslySetInnerHTML={{ __html: t('infoModalRealtimeProbabilities') }} />
            </ul>

            <p><em>{t('infoModalNote')}</em></p>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useI18n } from '../hooks/useI18n';
import Button from './ui/Button';

export function FloatingControls({ onInfoClick, onSettingsClick }) {
  const { t } = useI18n();

  return (
    <div className="floating-controls">
      <Button
        theme="SECONDARY"
        onClick={onSettingsClick}
        style={{ width: 'auto', padding: '0 2ch' }}
      >
        [⚙ {t('settingsButton', 'Config').toUpperCase()}]
      </Button>
      <Button
        theme="SECONDARY"
        onClick={onInfoClick}
        style={{ width: 'auto', padding: '0 2ch' }}
      >
        [i {t('infoButton', 'Info').toUpperCase()}]
      </Button>
    </div>
  );
}

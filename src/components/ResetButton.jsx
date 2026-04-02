import { useI18n } from '../hooks/useI18n';
import Button from './ui/Button';

export function ResetButton({ onClick }) {
  const { t } = useI18n();

  return (
    <div id="resetButtonContainer" className="reset-button-container">
      <Button
        theme="SECONDARY"
        onClick={onClick}
        style={{ width: 'auto', padding: '0 2ch' }}
      >
        [✖ {t('clearButton', 'Clear').toUpperCase()}]
      </Button>
    </div>
  );
}

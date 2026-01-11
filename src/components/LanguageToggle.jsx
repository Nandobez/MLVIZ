import { useI18n } from '../hooks/useI18n';
import Button from './ui/Button';

export function LanguageToggle() {
  const { language, toggleLanguage } = useI18n();

  return (
    <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10 }}>
      <Button
        theme="SECONDARY"
        onClick={toggleLanguage}
        style={{ width: 'auto', padding: '0 2ch' }}
      >
        [{language === 'en' ? '🇺🇸 EN' : '🇧🇷 PT'}]
      </Button>
    </div>
  );
}

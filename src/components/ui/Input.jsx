import * as React from 'react';
import * as Utilities from '../../common/utilities';
import styles from './Input.module.scss';

function Input({ caretChars, isBlink = true, label, placeholder, onChange, type, id, ...rest }) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const inputRef = React.useRef(null);
  const [text, setText] = React.useState(rest.defaultValue?.toString() || rest.value?.toString() || '');
  const [isFocused, setIsFocused] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState(text.length);

  const lastFocusDirectionRef = React.useRef(null);

  React.useEffect(() => {
    if (rest.value !== undefined) {
      const val = rest.value.toString();
      setText(val);
      setSelectionStart(val.length);
    }
  }, [rest.value]);

  const onHandleChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (onChange) {
      onChange(e);
    }
    setSelectionStart(e.target.selectionStart ?? value.length);
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    if (!inputRef.current) return;

    if (lastFocusDirectionRef.current === 'down') {
      setSelectionStart(text.length);
      inputRef.current.setSelectionRange(text.length, text.length);
    } else if (lastFocusDirectionRef.current === 'up') {
      setSelectionStart(0);
      inputRef.current.setSelectionRange(0, 0);
    }
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleSelect = (e) => {
    const inputEl = e.currentTarget;
    setSelectionStart(inputEl.selectionStart ?? text.length);
  };

  const onHandleClick = (e) => {
    const inputEl = e.currentTarget;
    inputEl.focus();
    setSelectionStart(inputEl.selectionStart ?? text.length);
  };

  const onHandleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      lastFocusDirectionRef.current = 'up';
      const previousFocusable = Utilities.findNextFocusable(document.activeElement, 'previous');
      previousFocusable?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      lastFocusDirectionRef.current = 'down';
      const nextFocusable = Utilities.findNextFocusable(document.activeElement, 'next');
      nextFocusable?.focus();
    }
  };

  const isPlaceholderVisible = !text && placeholder;
  const containerClasses = Utilities.classNames(styles.root, isFocused && styles.focused);

  const maskText = (t) => (type === 'password' ? '•'.repeat(t.length) : t);

  const beforeCaretText = isPlaceholderVisible ? placeholder ?? '' : maskText(text.substring(0, selectionStart));
  const afterCaretText = isPlaceholderVisible ? '' : maskText(text.substring(selectionStart));

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        <div className={Utilities.classNames(styles.displayed, isPlaceholderVisible && styles.placeholder)}>
          {beforeCaretText}
          {!isPlaceholderVisible && <span className={Utilities.classNames(styles.block, isBlink && styles.blink)}>{caretChars || ''}</span>}
          {!isPlaceholderVisible && afterCaretText}
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className={styles.hidden}
          value={text}
          aria-placeholder={placeholder}
          type={type}
          onFocus={onHandleFocus}
          onBlur={onHandleBlur}
          onChange={onHandleChange}
          onSelect={onHandleSelect}
          onClick={onHandleClick}
          onKeyDown={onHandleKeyDown}
          {...rest}
        />
      </div>
    </div>
  );
}

export default Input;

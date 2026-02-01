import styles from './Button.module.css';
import * as React from 'react';
import { classNames } from '../../utils/classNames';

const Button = ({ theme = 'PRIMARY', isDisabled, children, ...rest }) => {
  let buttonClassNames = classNames(styles.root, styles.primary);

  if (theme === 'SECONDARY') {
    buttonClassNames = classNames(styles.root, styles.secondary);
  }

  if (isDisabled) {
    buttonClassNames = classNames(styles.root, styles.disabled);

    return <div className={buttonClassNames}>{children}</div>;
  }

  return (
    <button className={buttonClassNames} role="button" tabIndex={0} disabled={isDisabled} {...rest}>
      {children}
    </button>
  );
};

export default Button;

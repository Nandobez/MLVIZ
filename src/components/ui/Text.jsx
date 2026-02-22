import styles from './Text.module.scss';
import * as React from 'react';

const Text = ({ children, ...rest }) => {
  return (
    <p className={styles.text} {...rest}>
      {children}
    </p>
  );
};

export default Text;

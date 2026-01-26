import styles from './Badge.module.css';
import * as React from 'react';

const Badge = ({ children, ...rest }) => {
  return (
    <span className={styles.root} {...rest}>
      {children}
    </span>
  );
};

export default Badge;

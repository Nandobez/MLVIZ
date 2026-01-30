import styles from './Block.module.css';
import * as React from 'react';

const Block = ({ children, ...rest }) => {
  return (
    <span className={styles.block} {...rest}>
      {children}
    </span>
  );
};

export default Block;

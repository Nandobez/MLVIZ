import styles from './AlertBanner.module.css';
import * as React from 'react';

const AlertBanner = ({ style: propStyle, ...rest }) => {
  const style = { ...propStyle };

  return <div className={styles.root} {...rest} style={style} />;
};

export default AlertBanner;

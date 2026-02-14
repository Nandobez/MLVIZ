import styles from './AlertBanner.module.scss';
import * as React from 'react';

const AlertBanner = ({ style: propStyle, ...rest }) => {
  let style = { ...propStyle };

  return <div className={styles.root} {...rest} style={style} />;
};

export default AlertBanner;

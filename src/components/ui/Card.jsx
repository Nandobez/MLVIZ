import styles from './Card.module.scss';
import * as React from 'react';

const Card = ({ children, mode, title, headerAction, style, className = '', ...rest }) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  let titleElement = (
    <header className={styles.action}>
      <div className={styles.left} aria-hidden="true"></div>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.right} aria-hidden="true"></div>
    </header>
  );

  if (mode === 'left') {
    titleElement = (
      <header className={styles.action}>
        <div className={styles.leftCorner} aria-hidden="true"></div>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.right} aria-hidden="true"></div>
      </header>
    );
  }

  if (mode === 'right') {
    titleElement = (
      <header className={styles.action}>
        <div className={styles.left} aria-hidden="true"></div>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.rightCorner} aria-hidden="true"></div>
      </header>
    );
  }

  return (
    <article className={cardClassName} style={style} {...rest}>
      {titleElement}
      {headerAction ? (
        <div className={styles.headerAction}>
          {headerAction}
        </div>
      ) : null}
      <section className={styles.children}>{children}</section>
    </article>
  );
};

export default Card;

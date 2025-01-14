import React from 'react'
import styles from './header.module.css';

const Header = () => {
  return (
    <div className={styles.header}>
      <div className={styles.container}>
        <div style={{ flexGrow: 1 }} />
        {/* <p>LOGIN</p> */}
      </div>
    </div>
  )
}

export default Header
import React from 'react';
import * as style from './navItem.module.css';
import NavItemHeader from './NavItemHeader.jsx';
import Link from 'gatsby-link'

console.log({ style });
const NavItem = props => {
  const { label, to, children } = props.item;

  if (children) {
    return <NavItemHeader item={props.item} />;
  }

  return (
    <Link
      exact
      to={to}
      className={style.navItem}
      activeClassName={style.activeNavItem}
    >
      <span className={style.navLabel}>{label}</span>
    </Link>
  );
};

export default NavItem;

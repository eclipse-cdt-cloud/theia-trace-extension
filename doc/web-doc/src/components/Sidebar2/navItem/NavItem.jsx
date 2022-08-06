import React from 'react';
import { NavLink } from 'react-router-dom';
import * as style from './navItem.module.css';
import NavItemHeader from './NavItemHeader.jsx';

console.log({ style });
const NavItem = props => {
  const { label, to, children } = props.item;

  if (children) {
    return <NavItemHeader item={props.item} />;
  }

  return (
    <NavLink
      exact
      to={to}
      className={style.navItem}
      activeClassName={style.activeNavItem}
    >
      <span className={style.navLabel}>{label}</span>
    </NavLink>
  );
};

export default NavItem;

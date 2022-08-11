import React from 'react';
import * as style from './sidebar.module.css';
import NavItem from './navItem/NavItem.jsx';
import styled from 'styled-components'

const SidebarContainer = styled.div`
  width:  250px;

  header {
    font-weight: bold;
    text-transform: uppercase;
    margin: 0 0 8px 0;
  }

  ul {
    margin: 0 0 16px 0;
  }
`

const Sidebar = props => {
  return (
   <SidebarContainer>
    <nav className={style.sidebar}>
      {props.sideMenu.map((item, index) => {
        return <NavItem key={`${item.label}-${index}`} item={item} />;
      })}
    </nav>
   </SidebarContainer>
  );
};

export default Sidebar;

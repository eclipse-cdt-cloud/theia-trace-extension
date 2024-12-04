/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"
import Sidebar from "./Sidebar/Sidebar"
import styled from 'styled-components'
// import { sideMenu } from './Sidebar/menu.config.js';

import { BrowserRouter } from 'react-router-dom';

import Header from "./header"
import "./layout.css"

const path = require('path');

const Content = styled.div`
  display: flex;
`

const Layout = ({ children }) => {

  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
      allMarkdownRemark {
        edges {
          node {
            fileAbsolutePath
          }
        }
      }
    }
  `)

  const edges = data.allMarkdownRemark.edges
  const foldableRowToContent = createFoldableRowToContent(edges)

  /*
   * mySideMenu array should contain the structure of the side menu,
   * similar to the following:
   *
   * {
   *   label: 'Profile',
   *   to: '/profile',
   * },
   * {
   *   label: 'Settings',
   *   to: '/settings',
   *   children: [
   *   {
   *     label: 'Account',
   *     to: 'account',
   *   },
   *   {...}]
   * }
   *
   */
  var mySideMenu = []
  foldableRowToContent.forEach(
    (value, key) => {
      var foldableRowElements = key.split('/')
      mySideMenu.push(
	createChildren(foldableRowElements, value)
      )
    }
  )

  return (
    <>
      <Header siteTitle={data.site.siteMetadata?.title || `Title`} />
      <Content>
	<div style={{marginLeft: `10px`}}>
	  <BrowserRouter>
	    <Sidebar sideMenu={mySideMenu}/>
	  </BrowserRouter>
	</div>
      <div
        style={{
          margin: `0 auto`,
          maxWidth: `var(--size-content)`,
          padding: `var(--size-gutter)`,
        }}
      >
        <main>{children}</main>
        <footer
          style={{
            marginTop: `var(--space-5)`,
            fontSize: `var(--font-sm)`,
          }}
        >
          © {new Date().getFullYear()} &middot; Built with
          {` `}
          <a href="https://www.gatsbyjs.com">Gatsby</a>
        </footer>
      </div>
      </Content>
    </>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

/**
 * Create and object that can be used to configure a foldable sidebar.
 *
 * @param children An array representing the foldable elements of the
 * sidebar.
 *
 * @param pLeafs An object representing the clickable elements at the
 * end of the foldable items of the sidebar.
 *
 * @returns an object used to configure a row of the foldable sidebar.
 */
function createChildren(children, pLeafs) {
  if (children.length === 1) {
    var leafs = []
    for (const leaf of pLeafs){
      leafs.push(
	{
	label: leaf,
	to: leaf
	}
      )
    }
    return {
      label: children[0],
      to: children[0],
      children: leafs
    }
  } else {
    return {
      label: children[0],
      to: children[0],
      children: [
	createChildren(children.slice(1, children.length), pLeafs)
      ]
    }
  }
}

/**
 * Given edges representing the identified md files,
 * this function returns a Map, where:
 * - key: is a string representing the folder where the md files are located
 * - value: is an array of strings representing the md files located in that folder
 *
 * NOTE: this logic is far from being beautiful, it is just a quick proof of concept
 *
 * @param edges The edges representing the identified md files
 *
 * @returns a Map of folder to array of md files
 */
function createFoldableRowToContent (edges) {
  const mySideMenuMap = new Map();
  var leaves = []
  var edgesLength = edges.length;
  for (var i = 0; i < edgesLength; i++) {
    var absPathAsString = path.parse(edges[i].node.fileAbsolutePath).dir
    const dirs = absPathAsString.split('theia-trace-extension/')
    if (dirs.length > 1) {
      // identified md file inside top folder
      const dirsForSidebarString = dirs[dirs.length-1]
      if (mySideMenuMap.has(dirsForSidebarString)){
	leaves = mySideMenuMap.get(dirsForSidebarString)
      } else {
	leaves = []
      }
      leaves.push(path.parse(edges[i].node.fileAbsolutePath).name)
      mySideMenuMap.set(dirsForSidebarString, leaves)
    }
  }
  return mySideMenuMap
}

export default Layout

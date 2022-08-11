/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import * as React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"
import Sidebar from "./Sidebar2/Sidebar"
import styled from 'styled-components'
import { sideMenu } from './Sidebar2/menu.config.js';

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
  var mySideMenu = [];

  var edgesLength = edges.length;
  for (var i = 0; i < edgesLength; i++) {
    mySideMenu.push(
      {
	label: path.parse(edges[i].node.fileAbsolutePath).name,
	to: "/" + path.parse(edges[i].node.fileAbsolutePath).name
      }
    )
  }

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

export default Layout

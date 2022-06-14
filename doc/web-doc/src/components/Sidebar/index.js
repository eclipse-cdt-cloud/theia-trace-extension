import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import { useStaticQuery, graphql } from "gatsby"

const path = require('path');

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

function Sidebar() {
    const { allMarkdownRemark } = useStaticQuery(
    graphql`
      query {
        allMarkdownRemark {
          edges {
            node {
              fileAbsolutePath
            }
          }
        }
      }
    `
  )

  const edges = allMarkdownRemark.edges

  return (
    <SidebarContainer>
      <header>All pages</header>
        <ul>
	    {edges.map(edge => (
		<li><Link to={"/" + path.parse(edge.node.fileAbsolutePath).name}>{path.parse(edge.node.fileAbsolutePath).name}</Link></li>
	    ))}
        </ul>
    </SidebarContainer>
  ) 
  /*
  return (
    <SidebarContainer>
      <header>Quick start</header>
      <ul>
        <li><Link to="/getting-started">Getting Started</Link></li>
      </ul>
      <header>About</header>
      <ul>
        <li><Link to="/about">About us</Link></li>
      </ul>
    </SidebarContainer>
  )
  */
}

export default Sidebar

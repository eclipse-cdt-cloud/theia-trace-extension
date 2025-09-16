import React from 'react';
import { graphql } from 'gatsby'

import Layout from "../components/layout"
import Seo from "../components/seo"

export default function Template({
  data, // this prop will be injected by the GraphQL query below.
}) {
  const { markdownRemark } = data // data.markdownRemark holds your post data
  const { html } = markdownRemark
  const { fileName } = markdownRemark
  return (
    <Layout>
      <Seo title={fileName} />
      <h1>{fileName}</h1>
  	<div
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Layout>
  )
}

export const pageQuery = graphql`
  query DocsById($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
    }
  }
`
;

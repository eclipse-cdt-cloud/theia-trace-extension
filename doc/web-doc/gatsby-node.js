const path = require('path');
exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;
  const docTemplate = path.resolve(`src/templates/docs-template.js`);
  return graphql(`{
      allMarkdownRemark(
        sort: { order: DESC, fields: [frontmatter___title] }
        limit: 1000
      ) {
        edges {
          node {
            excerpt(pruneLength: 250)
            html
            id
            fileAbsolutePath
          }
        }
      }
    }`)
    .then(result => {
      if (result.errors) {
        return Promise.reject(result.errors);
      }
      result.data.allMarkdownRemark.edges
        .forEach(({ node }) => {
          createPage({
            path: path.parse(node.fileAbsolutePath).name,
            component: docTemplate,
            context: {
              // used for Template.pageQuery
              id: node.id,
              fileName: path.parse(node.fileAbsolutePath).name,
	    }
          });
        });
    });
}

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
   resolve: {
      fallback: {
        path: require.resolve('path-browserify'),
      },
    },
  })
}

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
	  var pagePath = ""
	  var absPathAsString = path.parse(node.fileAbsolutePath).dir
	  const dirs = absPathAsString.split('theia-trace-extension/')
	  if (dirs.length > 1) {
	    pagePath = dirs[dirs.length-1] + "/" + path.parse(node.fileAbsolutePath).name
	  } else {
	    pagePath = path.parse(node.fileAbsolutePath).name
	  }
          createPage({
            path: pagePath,
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

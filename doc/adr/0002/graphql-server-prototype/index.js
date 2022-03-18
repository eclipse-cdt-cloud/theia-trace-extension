// This is a stripped version of [1], down to showing TSP's /health and /traces endpoints.
// [1] https://www.apollographql.com/docs/apollo-server/getting-started/#step-3-define-your-graphql-schema

const { ApolloServer, gql } = require('apollo-server');
const { TspClient } = require('tsp-typescript-client/lib/protocol/tsp-client');

// A schema is a collection of type definitions (hence "typeDefs").
const typeDefs = gql`
  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. Both non-nullable.
  type Query {
    status: String!
    traces: Int!
  }
`;

const baseUrl = "http://localhost:8080/tsp/api";

// Resolvers define the technique for fetching the types defined in the schema.
// Here, a default yet running trace-server is assumed for showcase simplicity.
const resolvers = {
  Query: {
    async status() {
      const tspClient = new TspClient(baseUrl);
      try {
        const response = await tspClient.checkHealth();
        if (response.isOk()) {
          // Then assume presence of the corresponding model.
          return response.getModel().status;
        }
        // Reliably return the resulting message otherwise.
        return response.getStatusMessage();
      } catch (error) {
        // Likely caused by the missing local trace-server.
        return error.message;
      }
    },
    async traces() {
      // Same simple approach as above. Returns how many traces only.
      const tspClient = new TspClient(baseUrl);
      try {
        const response = await tspClient.fetchTraces();
        if (response.isOk()) {
          return response.getModel().length;
        }
        return response.getStatusCode();
      } catch (error) {
        return -1;
      }
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});

// src/ApolloClient.js
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_octopus_graphql_api_endpoint,
});

const authLink = setContext((_, { headers }) => {
  const token = process.env.REACT_APP_octopus_api_key;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

  const client = new ApolloClient({
  link: authLink.concat(httpLink),
  uri: process.env.REACT_APP_octopus_graphql_api_endpoint,
  cache: new InMemoryCache(),
});

export default client;

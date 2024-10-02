// src/ApolloClient.js
import { 
  ApolloClient, 
  // createHttpLink, 
  InMemoryCache 
} from '@apollo/client';
// import { setContext } from '@apollo/client/link/context';

// const httpLink = createHttpLink({
//   uri: process.env.REACT_APP_octopus_api_endpoint,
// });

// const authLink = setContext((_, { headers }) => {
//   const token = process.env.REACT_APP_octopus_api_key;
//   return {
//     headers: {
//       ...headers,
//       Authorization: token ? `${token}` : "",
//     },
//   };
// });

  const client = new ApolloClient({
  // link: authLink.concat(httpLink),
  uri: process.env.REACT_APP_octopus_api_endpoint,
  // uri: "https://api.octopus.energy/v1/graphql/",
  // uri: "https://swapi-graphql.netlify.app/.netlify/functions/index",
  cache: new InMemoryCache(),
});

export default client;

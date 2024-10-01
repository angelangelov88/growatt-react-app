import { useMemo } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';

function useOctopus() {
  const apiEndpoint = process.env.REACT_APP_octopus_api_endpoint;
  const octopusAccount = process.env.REACT_APP_octopus_account;
  const apiKey = process.env.REACT_APP_octopus_api_key;

  const AUTH = gql`
    mutation getAuth ($APIKey: String!) {
      obtainKrakenToken(input: {
        APIKey: "${apiKey}"
      }) {
        token
        refreshToken
        refreshExpiresIn
      }
    }
    `;
    
    const SLOTS = gql`
    query getSlots {
      plannedDispatches(accountNumber: "${process.env.REACT_APP_octopus_account}") {
        startDt
        endDt
        }
        }
        `;
    // Authorization Header:
    // Authorization: "{token}"

    const FILMS = gql`
      query Query {
        allFilms {
          films {
            title
            director
            releaseDate
            speciesConnection {
              species {
                name
                classification
                homeworld {
                  name
                }
              }
            }
          }
        }
      }
    `;


  // const { loading, error, data } = useQuery(FILMS);

  // const { loading, error, data } = useQuery(SLOTS);
  const [authMutation, { data, loading, error }] = useMutation(AUTH);

  // console.log('authMutation', authMutation);

  const handleAuth = async () => {
    console.log('handleAuthStarted');
    try {
      const response = await authMutation({
        variables: {
          APIKey: apiKey,
        },
      });
      console.log('Auth Data:', response.data);
    } catch (err) {
      console.error('Error executing AUTH mutation:', err);
    }
  };
    
    return useMemo(
    () => ({
      loading,
      error,
      data,
      handleAuth,
    }),
    [
      loading,
      error,
      data,
      handleAuth,
    ],
  );
}

export default useOctopus;

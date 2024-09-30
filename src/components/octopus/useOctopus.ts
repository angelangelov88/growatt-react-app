import { useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';

function useOctopus() {

  const octName = "Octopus";

  const apiEndpoint = process.env.REACT_APP_octopus_api_endpoint;
  const octopusAccount = process.env.REACT_APP_octopus_account;
  const apiKey = process.env.REACT_APP_octopus_api_key || '';

  const getAuth = gql`
    mutation getAuth {
      obtainKrakenToken(input: {
        APIKey: "${apiKey}"
      }) {
        token
        refreshToken
        refreshExpiresIn
      }
    }
  `;

  const getItems = gql`
    query getSlots {
      plannedDispatches(accountNumber: "${octopusAccount}") {
        startDt
        endDt
      }
    }
  `;

  // const handleAuth = async () => {
  //   try {
  //     const response = await getAuth ({ variables: { apiKey } });
  //     console.log('Auth Data:', response);
  //     // Handle successful authentication here, e.g., store tokens
  //   } catch (e) {
  //     console.error('Error fetching auth data:', e);
  //   }
  // };
  const { loading, error, data } = useQuery(getItems);

  console.log('data:', data);

  // const fetchOctopusData = async () => {  
  //   try {
      // const result = await fetch(`${apiEndpoint}/v1/accounts/${octopusAccount}`)

      // const result = await fetch(`${apiEndpoint}/v1/products`)

      // if (!result.ok) {
      //   throw new Error(`HTTP error! status: ${result.status}`);
      // }
      
      // const data = await result.json();
      // console.log('octData', data); 
  
  //   } catch (error) {
  //     console.error('Error fetching octopus data:', error);
  // }
  // }
    // useEffect(() => {
    //   fetchOctopusData();
    // }, []);
  
  return useMemo(
    () => ({
      octName,
      getItems,
      loading,
      error,
      data,
    }),
    [
      octName,
      getItems,
      loading,
      error,
      data,
    ],
  );
}

export default useOctopus;

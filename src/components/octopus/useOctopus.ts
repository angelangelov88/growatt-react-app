import { useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';

function useOctopus() {

  const octName = "Octopus";

  // const apiEndpoint = process.env.REACT_APP_octopus_api_endpoint;
const octopusAccount = process.env.REACT_APP_octopus_account;
  const apiKey = process.env.REACT_APP_octopus_api_key || '';

  const getItems = gql`
    query getSlots {
      plannedDispatches(accountNumber: "${octopusAccount}") {
          startDt
          endDt
      }
    }
  `;
  const { loading, error, data } = useQuery(getItems);

  console.log('data:', data);

  const fetchOctopusData = async () => {  
    try {
      // const result = await fetch(`${apiEndpoint}/v1/accounts/${octopusAccount}`)
      const result = await fetch(`/v1/accounts/${octopusAccount}`, {
        headers: {
          'X-Octopus-ApiKey': apiKey,
        }
      });

      // const result = await fetch(`${apiEndpoint}/v1/products`)

      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }
      
      const data = await result.json();
      console.log('octData', data); 
  
    } catch (error) {
      console.error('Error fetching octopus data:', error);
  }
  }
    useEffect(() => {
      fetchOctopusData();
    }, []);
  
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

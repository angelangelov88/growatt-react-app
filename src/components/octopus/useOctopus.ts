import { useEffect, useMemo } from 'react';

function useOctopus() {

  const octName = "Octopus";

  const apiEndpoint = process.env.REACT_APP_octopus_api_endpoint;
const octopusAccount = process.env.REACT_APP_octopus_account;
  const apiKey = process.env.REACT_APP_octopus_api_key;

  const fetchOctopusData = async () => {
    try {
      const result = await fetch(`${apiEndpoint}/v1/accounts/${octopusAccount}`, {
        method: 'GET',
        headers: {
          'X-Octopus-ApiKey': apiKey,
          'Content-Type': 'application/json',
        },
  
      })
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

    }),
    [
      octName,

    ],
  );
}

export default useOctopus;

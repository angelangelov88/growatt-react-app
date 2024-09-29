import { useEffect, useMemo } from 'react';

function useOctopus() {

  const octName = "Octopus";

  const apiEndpoint = process.env.REACT_APP_octopus_api_endpoint;

  const apiKey = 'sk_live_XJmhLsTeJybhTUEr4hxDkGvS'

  const fetchOctopusData = async () => {
    try {
      const result = await fetch(`${apiEndpoint}/v1/accounts/A-A766CA0B`, {
        method: 'GET',
        headers: {
          'X-Octopus-ApiKey': apiKey,  // Add your API key in the header
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

import { useEffect, useMemo, useState } from 'react';

function useGrowatt() {
  const [response, setResponse] = useState({});
  const [error, setError] = useState(null);

  const groName = "Growatt";
  
  const user = process.env.REACT_APP_growatt_user;
  const password = process.env.REACT_APP_growatt_password;
  // const options = {};

  // fetch data from growatt inverter api using username and password
  const fetchData = async () => {
    try {
      // const response = await fetch('http://server.growatt.com/v1/auth/login', {
      // This is the POST request to set the battery to discharge
      const response = await fetch('https://server.growatt.com/tcpSet.do$action=mixSet&serialNum=KTM0CML008&type=mix_ac_discharge_time_period&param1=100&param2=20&param3=22&param4=09&param5=22&param6=39&param7=1&param8=00&param9=00&param10=00&param11=00&param12=0&param13=00&param14=00&param15=00&param16=00&param17=0', {
        method: 'POST', // Make sure the method matches what the API expects
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: user,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error('Error fetching data');
      }

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.log('error', error);
    }};

  useEffect(() => {
    console.log('useEffect');
    fetchData();
  }, []);

  return useMemo(
    () => ({
      groName,
      response,
      error,
    }),
    [
      groName,
      response,
      error,
    ],
  );
}

export default useGrowatt;

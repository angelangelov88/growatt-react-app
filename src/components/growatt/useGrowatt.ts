/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";

function useGrowatt() {
  const [response, setResponse] = useState({});
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  const groName = "Growatt";

  const hashPassword = (password: string) => {
    let passwordMd5 = Array.from(new TextEncoder().encode(password)).reduce(
      (acc, byte) => acc + byte.toString(16).padStart(2, "0"),
      "",
    );
    for (let i = 0; i < passwordMd5.length; i += 2) {
      if (passwordMd5[i] === "0") {
        passwordMd5 = passwordMd5.slice(0, i) + "c" + passwordMd5.slice(i + 1);
      }
    }
    return passwordMd5;
  };

  const serverUrl = "https://openapi.growatt.com/";
  const serverUrl2 = "https://server.growatt.com/";

  const user = process.env.REACT_APP_growatt_user;
  const password = process.env.REACT_APP_growatt_password;
  // const options = {};

  // fetch data from growatt inverter api using username and password
  const fetchData = async () => {
    console.log("fetchDataCalled");
    try {
      // params for chargeTime
      // param1 = rate of charge
      // param2 = max SOC
      // param3 = true/false for ac charge
      // param4 = start time hour
      // param5 = start time minute
      // param6 = end time hour
      // param7 = end time minute
      // param8 = 1/0 for enable/disable
      // param9 = start time hour for second period
      // param10 = start time minute for second period
      // param11 = end time hour for second period
      // param12 = end time minute for second period
      // param13 = 1/0 for enable/disable for second period
      // param14 = start time hour for third period
      // param15 = start time minute for third period
      // param16 = end time hour for third period
      // param17 = end time minute for third period
      // param18 = 1/0 for enable/disable for third period

      // params for dischargeTime
      // param1 = rate of discharge
      // param2 = min/max SOC
      // param3 = 1/0 for ac charge
      // param4 = start time hour
      // param5 = start time minute
      // param6 = end time hour
      // param7 = end time minute
      // param8 = 1/0 for enable/disable
      // param9 = start time hour for second period
      // param10 = start time minute for second period
      // param11 = end time hour for second period
      // param12 = end time minute for second period
      // param13 = 1/0 for enable/disable for second period
      // param14 = start time hour for third period
      // param15 = start time minute for third period
      // param16 = end time hour for third period
      // param17 = end time minute for third period
      // param18 = 1/0 for enable/disable for third period

      // This is the POST request to set the battery to charge on cheap night rate
      const response = await fetch(
        "https://server.growatt.com/tcpSet.do$action=mixSet&serialNum=KTM0CML008&type=mix_ac_charge_time_period&param1=25&param2=95&param3=1&param4=23&param5=30&param6=05&param7=30&param8=1&param9=00&param10=00&param11=00&param12=00&param13=0&param14=00&param15=00&param16=00&param17=00&param18=0",
        {
          // This is the POST request to set the battery to discharge
          // const response = await fetch('https://server.growatt.com/tcpSet.do$action=mixSet&serialNum=KTM0CML008&type=mix_ac_discharge_time_period&param1=100&param2=20&param3=22&param4=20&param5=23&param6=20&param7=1&param8=00&param9=00&param10=00&param11=00&param12=0&param13=00&param14=00&param15=00&param16=00&param17=0', {
          // const response = await fetch('https://openapi.growatt.com/login', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
          // body: JSON.stringify({
          // 	account: user,
          // 	password: password,
          // }),
        },
      );

      if (!response.ok) {
        throw new Error("Error fetching data");
      }

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.log("error", error);
    }
  };

  const fetchData2 = async () => {
    console.log("fetchData2Called");
    try {
      const endpoint = `${serverUrl2}login`;
      const params = {
        account: user,
        password: hashPassword("solar10"),
        validateCode: "",
      };

      console.log("endpoint", endpoint);
      console.log("params", params);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // mode: "no-cors",
        body: JSON.stringify(params),
      });
      console.log("response", response);

      // Check the response status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Log the response text
      const responseText = await response.text();
      console.log("Response Text:", responseText);

      const data = await response.json();
      if (data.back.success) {
        setUserData(data.back.user);
      } else {
        console.error("Login failed:", data.back.msg);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // useEffect(() => {
  //   console.log("useEffect");
  //   // fetchData();
  //   // fetchData2();
  //   // fetchExample();
  // }, []);

  return useMemo(
    () => ({
      groName,
      response,
      error,
      fetchData,
      fetchData2,
    }),
    [groName, response, error, fetchData, fetchData2],
  );
}

export default useGrowatt;

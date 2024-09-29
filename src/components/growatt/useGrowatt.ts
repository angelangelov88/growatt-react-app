import { useEffect, useMemo } from 'react';

function useGrowatt() {

  const groName = "Growatt";
  
  const user = process.env.REACT_APP_growatt_user;
  const password = process.env.REACT_APP_growatt_password;
  // const options = {};

  // fetch data from growatt inverter api using username and password
  const fetchData = async () => {
    const result = await fetch("http://test.growatt.com/v1/user/c_user_list", {
      method: "POST",
      mode: "no-cors",
      // body: JSON.stringify({
      //   page: 1,
      //   perpage: 10,
      //   username: user,
      //   password: password,
      // }),
    });
    
    // console.log('result:', result);


  //     const fetchPhotos = async () => {
  //       try {
  //     // const response = await fetch(`http://test.growatt.com/v1/user/c_user_list?page=${page}&perpage=${perPage}`, {
  //     const response = await fetch('https://jsonplaceholder.typicode.com/photos', 
  //     //   {
  //     //   mode: 'no-cors',
  //     // }
  //   );
      
  //     console.log('response:', response);
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  
  //     const data = await response.json();
  //     console.log(data);
  //   } catch (error) {
  //     console.error('Error fetching photos:', error);
  //   }
  // };

  // fetchPhotos();
  };


  // async function test() {
  //   const growatt = new api({});
  //   const login = await growatt.login(user, password).catch((e: Error) => {
  //     console.log(e);
  //   });
  //   console.log("login:", login);
  //   const getAllPlantData = await growatt
  //     .getAllPlantData(options)
  //     .catch((e: Error) => {
  //       console.log(e);
  //     });
  //   console.log("getAllPlatData:", JSON.stringify(getAllPlantData, null, " "));
  //   const logout = await growatt.logout().catch((e: Error) => {
  //     console.log(e);
  //   });
  //   console.log("logout:", logout);
  // }
  
  // test();

  console.log('user:', user);
  // console.log('password:', password);
  // console.log('options:', options);

  useEffect(() => {
    console.log('useEffect');
    fetchData();
  }, []);

  return useMemo(
    () => ({
      groName,

    }),
    [
      groName,

    ],
  );
}

export default useGrowatt;

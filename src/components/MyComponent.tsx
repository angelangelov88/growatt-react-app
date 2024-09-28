import React from "react";
import api from "growatt";

const MyComponent = () => {
  const user = "Angel Angelov";
  const password = "solar10";
  const options = {};

  async function test() {
    const growatt = new api({});
    const login = await growatt.login(user, password).catch((e: Error) => {
      console.log(e);
    });
    console.log("login:", login);
    const getAllPlantData = await growatt
      .getAllPlantData(options)
      .catch((e: Error) => {
        console.log(e);
      });
    console.log("getAllPlatData:", JSON.stringify(getAllPlantData, null, " "));
    const logout = await growatt.logout().catch((e: Error) => {
      console.log(e);
    });
    console.log("logout:", logout);
  }
  
  test();

  return (
    <div>
      <h4 className="">My login page</h4>
      <h2>My name is:</h2>
    </div>
  );
};

export default MyComponent;

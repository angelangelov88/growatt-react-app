import React from "react";
import useGrowatt from "./useGrowatt";
// import api from "growatt";

const Growatt = () => {
const { groName, response, error} = useGrowatt();

  return (
    <div>
      {/* <h4 className="">My login page</h4> */}
      <h2>My name is: {groName}</h2>
      <div>
        {response && <p>Response: {JSON.stringify(response)}</p>}
        {error && <p>Error: {error}</p>}
      </div>
    </div>
  );
};

export default Growatt;

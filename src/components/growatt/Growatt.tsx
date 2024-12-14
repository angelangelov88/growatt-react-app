import React from "react";
import useGrowatt from "./useGrowatt";
// import api from "growatt";

const Growatt = () => {
  const {
    groName,
    response,
    error,
    // fetchData,
    fetchData2,
  } = useGrowatt();

  return (
    <div>
      {/* <h4 className="">My login page</h4> */}
      <h2>My name is: {groName}</h2>
      <div>
        {response && <p>Response: {JSON.stringify(response)}</p>}
        {error && <p>Error: {error}</p>}
      </div>
      {/* <button onClick={() => fetchData()} className='bg-blue-300 p-2 m-2 rounded-lg'>Fetch Data/setCheapPeriod</button> */}
      <button
        onClick={() => fetchData2()}
        className="bg-blue-300 p-2 m-2 rounded-lg"
      >
        Fetch Data 2
      </button>
    </div>
  );
};

export default Growatt;

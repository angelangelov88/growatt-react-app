import React from 'react';
import useOctopus from './useOctopus';

const Octopus = () => {
  const { octName, loading, error, data } = useOctopus();


  console.log('loading:', loading);
  console.log('error:', error);
  console.log('data:', data);
  return ( 
    <div>
      <h1>Octopus</h1>
      <h2>My name is: {octName}</h2>
      <ul>
      {data?.plannedDispaches?.map((item: {
        id: string;
        name: string;
      }) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>

    </div>
   );
}
 
export default Octopus;
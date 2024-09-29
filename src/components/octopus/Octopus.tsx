import React from 'react';
import useOctopus from './useOctopus';
import { useQuery } from '@apollo/client';

const Octopus = () => {
  const { octName, getItems } = useOctopus();

  const { loading, error, data } = useQuery(getItems);

  console.log('data:', data);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

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
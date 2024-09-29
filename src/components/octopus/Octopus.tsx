import React from 'react';
import useOctopus from './useOctopus';

const Octopus = () => {
  const { octName } = useOctopus();
  return ( 
    <div>
      <h1>Octopus</h1>
      <h2>My name is: {octName}</h2>
    </div>
   );
}
 
export default Octopus;
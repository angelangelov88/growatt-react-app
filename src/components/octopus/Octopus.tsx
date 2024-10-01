import React from 'react';
import useOctopus from './useOctopus';
import { film } from '../../types/Films';

const Octopus = () => {
  const { loading, error, data, handleAuth } = useOctopus();

  return ( 
    <div>
      <h1>Octopus</h1>
      {/* <h2>My name is: {octName}</h2> */}
      <>
        {error ? <p>Error: {error.message}</p> : null}
        <h1>Films</h1>
        {loading || !data ? (<p>Loading...</p>) :
          data?.allFilms?.films?.map((film: film) => (
            <div key={film.title} className='border border-red-500 my-3 w-44'>
              <h1>{film.title}</h1>
              <p className='text-sm font-normal text-gray-600'>{film.director}</p>
              <p className='text-sm font-normal text-gray-600'>{film.releaseDate}</p>
            </div>
          ))
        }
        <div>

        <h1>Handle Auth</h1>
        <button onClick={() => handleAuth()} className='bg-blue-300 p-2 m-2 rounded-lg'>Handle Auth</button>
        </div>
      </>
    </div>
   );
}
 
export default Octopus;
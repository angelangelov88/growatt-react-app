import React from 'react';
// import useOctopus from './useOctopus';
import { gql, useQuery } from '@apollo/client';

type film = {
  title: string;
  director: string;
  releaseDate: string;
  speciesConnection: {
    species: {
      name: string;
      classification: string;
      homeworld: {
        name: string;
      }
    }
  }
}
const Octopus = () => {
  // const { octName, loading, error, data } = useOctopus();
  const ROCKETS = gql`
    query Query {
      allFilms {
        films {
          title
          director
          releaseDate
          speciesConnection {
            species {
              name
              classification
              homeworld {
                name
              }
            }
          }
        }
      }
    }
  `;

  const { data, loading, error } = useQuery<any>(ROCKETS);
  // if (loading1) return "Loading...";
  // if (error1) return <pre>{error1.message}</pre>

  console.log('data:', data);
  return ( 
    <div>
      <h1>Octopus</h1>
      {/* <h2>My name is: {octName}</h2> */}
      <>
        {error ? <p>Error: {error.message}</p> : null}
        <h1>SpaceX Rockets</h1>
        {loading || !data ? (<p>Loading...</p>) :
          data?.allFilms?.films?.map((film: film) => (
            <div key={film.title} className='border border-red-500 my-3 w-44'>
              <h1>{film.title}</h1>
              <p className='text-sm font-normal text-gray-600'>{film.director}</p>
              <p className='text-sm font-normal text-gray-600'>{film.releaseDate}</p>
            </div>
          ))
        }
      </>
    </div>
   );
}
 
export default Octopus;
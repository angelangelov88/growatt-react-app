import React from 'react';
import useOctopus from './useOctopus';
import { Slot } from '../../types/Slots';

const Octopus = () => {
  const {       authLoading,
    authError,
    authData,
    slotsLoading,
    slotsError,
    slotsData, handleAuth,
  handleAuthAndFetchSlots } = useOctopus();

  return ( 
    <div>
      <h1>Octopus</h1>
      {/* <h2>My name is: {octName}</h2> */}
      <>
        {/* <h1>Films</h1>
        {loading || !data ? (<p>Films Loading...</p>) :
          data?.allFilms?.films?.map((film: film) => (
            <div key={film.title} className='border border-red-500 my-3 w-44'>
              <h1>{film.title}</h1>
              <p className='text-sm font-normal text-gray-600'>{film.director}</p>
              <p className='text-sm font-normal text-gray-600'>{film.releaseDate}</p>
            </div>
          ))
        } */}
        <div>

        <h1>Handle Auth</h1>
        <button onClick={() => handleAuth()} className='bg-blue-300 p-2 m-2 rounded-lg'>Handle Auth</button>
        <button onClick={() => handleAuthAndFetchSlots()} className='bg-blue-300 p-2 m-2 rounded-lg'>Handle Auth and slots</button>
        {authData && <p>Success! Token: {authData.obtainKrakenToken.token}</p>}
        {authError ? <p>Error: {authError.message}</p> : null}
        {authLoading ? <p>Loading...</p> : null}
        {slotsData && <div>
          <h3>Success! Slots:</h3>
          {slotsData?.plannedDispatches?.length > 0 ? slotsData?.planneDipatches?.map((item: Slot, index: number) => (
            <div key={`slot-${index}`} className='border border-red-500 my-3 w-44'>
              <p>{String(item.start)}</p>
              <p>{String(item.end)}</p>
          </div>
          )) : <div>No slots available</div>}
        </div>}
        {slotsError ? <p>Error: {slotsError.message}</p> : null}
        {slotsLoading ? <p>Loading...</p> : null}
        </div>
      </>
    </div>
   );
}
 
export default Octopus;
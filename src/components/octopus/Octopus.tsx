import React from 'react';
import useOctopus from './useOctopus';
import { Slot } from '../../types/Slots';
import useSlotChecker from './useSlotChecker';

const Octopus = () => {
  const {       
    // authLoading,
    // authError,
    // authData,
    slotsLoading,
    slotsError,
    slotsData, handleAuth,
    formatDate,
  handleAuthAndFetchSlots
 } = useOctopus();

 const { message } = useSlotChecker({ slotsData });

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
        {/* {authData && <p>Success! Token: {authData.obtainKrakenToken.token}</p>}
        {authError ? <p>Error: {authError.message}</p> : null}
        {authLoading ? <p>Loading...</p> : null} */}
        {/* {slotsData && <div>
          <h3>Success! Slots:</h3>
          {slotsData?.plannedDispatches?.length > 0 ? slotsData?.plannedDipatches?.map((item: Slot, index: number) => (
            <div key={`slot-${index}`} className='border border-red-500 my-3 w-44'>
              <p>{String(item.startDt)}</p>
              <p>{new Date(item.endDt).toString()}</p>
          </div>
          )) : <div>No slots available</div>}
        </div>} */}
        {slotsData && <h3>Success! Slots:</h3>}
        {slotsData?.plannedDispatches?.length > 0 && slotsData?.plannedDispatches?.map((item: Slot, index: number) => {
          return (
            <div key={`slot-${index}`} className='m-3 '>
              <p>{formatDate(item.startDt)}</p>
              <p>{formatDate(item.endDt)}</p>
              <h3>Message:</h3>
              <p>{message}</p>
            </div>

          )
        })}

        {slotsError ? <p>Error: {slotsError.message}</p> : null}
        {slotsLoading ? <p>Loading...</p> : null}
        </div>
      </>
    </div>
   );
}
 
export default Octopus;
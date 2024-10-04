import { useMemo, useState } from 'react';
import { gql, useMutation, useLazyQuery } from '@apollo/client';

function useOctopus() {
	const octopusAccount = process.env.REACT_APP_octopus_account;
	const apiKey = process.env.REACT_APP_octopus_api_key;
	const [token, setToken] = useState('');
	const AUTH = gql`
    mutation getAuth ($APIKey: String!) {
      obtainKrakenToken(input: { APIKey: $APIKey }) {
        token
        refreshToken
        refreshExpiresIn
      }
    }
  `;
    
	const GET_SLOTS = gql`
      query getSlots {
        plannedDispatches(accountNumber: "${octopusAccount}") {
          startDt
          endDt
        }
      }
    `;

	// Authorization Header:
	// Authorization: "{token}"

	// const FILMS = gql`
	//   query Query {
	//     allFilms {
	//       films {
	//         title
	//         director
	//         releaseDate
	//         speciesConnection {
	//           species {
	//             name
	//             classification
	//             homeworld {
	//               name
	//             }
	//           }
	//         }
	//       }
	//     }
	//   }
	// `;


	// const { loading, error, data } = useQuery(FILMS);

	const [getSlots, { loading: slotsLoading, error: slotsError, data: slotsData }] = useLazyQuery(GET_SLOTS, {
		fetchPolicy: 'network-only',
		context: {
			headers: {
				Authorization: `${token}`,
			},
		},
	});
	const [
		// authMutation,
		getAuth,
		{ data: authData, loading: authLoading, error: authError }] = useMutation(AUTH);
  
	// console.log('authMutation', authMutation);
	const handleAuth = async () => {
		try {
			const response = await getAuth({
				variables: {
					APIKey: apiKey,
				},
			});
			console.log('Auth Data:', response.data);
			setToken(response?.data?.obtainKrakenToken?.token);
		} catch (err) {
			console.log('error:', err);
			console.error('Error executing AUTH mutation:', err);
		}
	};

	const handleAuthAndFetchSlots = async () => {
		try {
			// Step 1: Execute the getAuth mutation to obtain the token
			const authResponse = await getAuth({ variables: { APIKey: apiKey } });
			const token = authResponse?.data?.obtainKrakenToken?.token;

			if (token) {
				// Step 2: Store the token in the state
				setToken(token);

				// Step 3: Execute the getSlots query with the token as authorization
				const slotsResponse = await getSlots();  // useLazyQuery automatically handles re-fetching when called
				console.log('Slots Data:', slotsResponse.data);
				console.log('slotsData', slotsData);
			}
		} catch (e) {
			console.error('Error fetching auth or slots data:', e);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		// Format the date as '04 Oct 2024'
		const formattedDate = date.toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
		// Format the time as '05:00:00'
		const formattedTime = date.toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
		return `${formattedDate} - ${formattedTime}`;
	};

	return useMemo(
		() => ({
			authLoading,
			authError,
			authData,
			slotsLoading,
			slotsError,
			slotsData,
			handleAuth,
			handleAuthAndFetchSlots,
			formatDate,
		}),
		[
			authLoading,
			authError,
			authData,
			slotsLoading,
			slotsError,
			slotsData,
			handleAuth,
			handleAuthAndFetchSlots,
			formatDate,
		],
	);
}

export default useOctopus;

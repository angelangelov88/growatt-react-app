import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ApolloProvider } from '@apollo/client';
import client from './ApolloClient';

const rootElement = document.getElementById('root');

if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<ApolloProvider client={client}>
				<App />
			</ApolloProvider>
		</React.StrictMode>
	);
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RepositoryProvider } from './repositories';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <RepositoryProvider>
      <App />
    </RepositoryProvider>
  </React.StrictMode>
);

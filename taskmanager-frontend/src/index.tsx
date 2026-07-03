import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RepositoryProvider } from './repositories';

if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_SQLITE_SMOKE === 'true') {
  import('./repositories/sqlite/nativeSmokeTest').then(({ runNativeSQLiteSmokeTest }) => {
    window.runTaskManagerSQLiteSmokeTest = runNativeSQLiteSmokeTest;
  });
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <RepositoryProvider>
      <App />
    </RepositoryProvider>
  </React.StrictMode>
);

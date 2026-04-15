import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DungeonDataProvider } from './contexts/DungeonDataContext';
import { UserProvider } from './contexts/UserContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <DungeonDataProvider>
        <App />
      </DungeonDataProvider>
    </UserProvider>
  </StrictMode>,
);

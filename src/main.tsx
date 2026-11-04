import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/nanum-pen-script/400.css';
import App from './App';
import PWAProvider from './components/pwa/PWAProvider';
import './styles/global.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PWAProvider><App /></PWAProvider></React.StrictMode>);

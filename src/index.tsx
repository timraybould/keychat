import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

if (window.location.pathname === "/.well-known/matrix/server") {
  window.location.replace(`https://${window.location.host}/.well-known/matrix/server.json`);
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
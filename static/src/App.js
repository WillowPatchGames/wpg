import React from 'react';
import logo from './logo.svg';
import './App.css';
import 'rmwc/dist/styles'
import '@rmwc/theme/styles';
import { Button } from '@rmwc/button';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload. Does it work?
        </p>
        <Button raised>Hello, world!</Button>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

import 'react-app-polyfill/ie11';
import 'core-js/features/array/find';
import 'core-js/features/array/includes';
import 'core-js/features/string/match-all';

import React from 'react';
import ReactDOM from 'react-dom';

import {
  BrowserRouter
} from "react-router-dom";

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const root = document.getElementById('root');
const doc = <BrowserRouter>
  <App />
</BrowserRouter>;

if (root.hasChildNodes()) {
  ReactDOM.hydrate(doc, root);
} else {
  ReactDOM.render(doc, root);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

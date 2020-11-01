import React from 'react';

import {
  Link,
} from "react-router-dom";

import '../App.css';

class LoadingPage extends React.Component {
  render() {
    return (
      <p>
        Please wait while this page loads. If this page doesn't
        load, <Link to="/">click here</Link> to go back to the home page.
      </p>
    );
  }
}

class ErrorPage extends React.Component {
  render() {
    return "Sorry, an unknown error occurred.";
  }
}

export { LoadingPage, ErrorPage };

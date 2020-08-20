import React from 'react';

import '../App.css';


class LoadingPage extends React.Component {
  render() {
    return (
      <p>
        Please wait while this page loads. If this page doesn't load,
        <a href="#home">click here</a> to go back to the home page.
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

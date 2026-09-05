import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Chats from './Chats'
import { AuthProvider } from '../contexts/AuthContext'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Switch>
        <Route exact path="/login" component={Login} />
        <Route exact path="/signup" component={Signup} />
        <Route exact path='/chats' component={Chats} />
        <Redirect to="/chats" />
        </Switch>
      </AuthProvider>
    </Router>
  );
}

export default App;

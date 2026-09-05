import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Chats from './Chats';
import ErrorBoundary from './ErrorBoundary';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <ProtectedRoute exact path="/chats" component={Chats} />
            <Redirect to="/login" />
          </Switch>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

import React, { useState } from 'react';
import { GoogleOutlined } from '@ant-design/icons';
import firebase, { auth } from '../firebase'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Google Sign-In Handler
  const handleGoogleSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
  };

  // Email/Password Sign-In Handler
  const handleEmailSignIn = (e) => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(email, password)
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <div id="login-page">
      <div id="login-card">
        <h2>Welcome to OmniChat!</h2>

        {/* Google Sign-In Button */}
        <div className="login-button google" onClick={handleGoogleSignIn}>
          <GoogleOutlined /> Sign In with Google
        </div>

        <br />

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSignIn}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <br /><br />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <br /><br />
          <button type="submit">Sign In with Email</button>
        </form>

      </div>
    </div>
  );
};

export default Login;
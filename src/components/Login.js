import React, { useState } from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import firebase, { auth } from "../firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignIn = (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    auth
      .signInWithEmailAndPassword(email.trim(), password)
      .catch((signInError) => setError(signInError.message))
      .finally(() => setIsSubmitting(false));
  };

  const handleGoogleSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth
      .signInWithRedirect(provider)
      .catch((signInError) => setError(signInError.message));
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OMNICHAT</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to pick up your conversations.</p>
        <form className="auth-form" onSubmit={handleEmailSignIn}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="auth-divider">
          <span>or continue with</span>
        </div>
        <button
          className="google-button"
          type="button"
          onClick={handleGoogleSignIn}
        >
          <GoogleOutlined />
          Google
        </button>
        <p className="auth-switch">
          New to OmniChat? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;

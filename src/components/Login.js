import React, { useEffect, useState } from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Link, useHistory } from "react-router-dom";
import firebase, { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { getFirebaseErrorMessage } from "../utils/errors";

const Login = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) history.replace("/chats");
  }, [user, history]);

  const handleEmailSignIn = (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    auth
      .signInWithEmailAndPassword(email.trim(), password)
      .then(() => history.replace("/chats"))
      .catch((signInError) => setError(getFirebaseErrorMessage(signInError)))
      .finally(() => setIsSubmitting(false));
  };

  const handleGoogleSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    setError("");
    setIsSubmitting(true);
    auth
      .signInWithPopup(provider)
      .then(() => history.replace("/chats"))
      .catch((signInError) => setError(getFirebaseErrorMessage(signInError)))
      .finally(() => setIsSubmitting(false));
  };

  const handleGuestSignIn = () => {
    setError("");
    setIsSubmitting(true);
    auth
      .signInAnonymously()
      .then(() => history.replace("/chats"))
      .catch((signInError) => setError(getFirebaseErrorMessage(signInError)))
      .finally(() => setIsSubmitting(false));
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
          disabled={isSubmitting}
        >
          <GoogleOutlined />
          Google
        </button>
        <button
          className="guest-button"
          type="button"
          onClick={handleGuestSignIn}
          disabled={isSubmitting}
        >
          Continue as guest
        </button>
        <p className="auth-switch">
          New to OmniChat? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;

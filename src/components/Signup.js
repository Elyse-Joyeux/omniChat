import React, { useState } from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Link, useHistory } from "react-router-dom";
import firebase, { auth } from "../firebase";

const Signup = () => {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignup = (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    auth
      .createUserWithEmailAndPassword(email.trim(), password)
      .then(() => history.push("/login"))
      .catch((signupError) => setError(signupError.message))
      .finally(() => setIsSubmitting(false));
  };

  const handleGoogleSignup = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth
      .signInWithRedirect(provider)
      .catch((signupError) => setError(signupError.message));
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <div className="brand-mark" aria-hidden="true">
          O
        </div>
        <p className="eyebrow">OMNICHAT</p>
        <h1 id="signup-title">Create your account</h1>
        <p className="auth-subtitle">Join your friends and start chatting.</p>
        <form className="auth-form" onSubmit={handleEmailSignup}>
          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="At least 6 characters"
            minLength="6"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Enter your password again"
            minLength="6"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          {error && (
            <p className="auth-error" role="malert">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-divider">
          <span>or sign up with</span>
        </div>
        <button
          className="google-button"
          type="button"
          onClick={handleGoogleSignup}
        >
          <GoogleOutlined />
          Google
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
};

export default Signup;

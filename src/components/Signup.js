import React, { useEffect, useState } from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Link, useHistory } from "react-router-dom";
import firebase, { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { getFirebaseErrorMessage } from "../utils/errors";

const Signup = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !user.isAnonymous) history.replace("/chats");
  }, [user, history]);

  const handleEmailSignup = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;

      if (currentUser?.isAnonymous) {
        const credential = firebase.auth.EmailAuthProvider.credential(email.trim(), password);
        await currentUser.linkWithCredential(credential);
      } else {
        await auth.createUserWithEmailAndPassword(email.trim(), password);
      }

      history.replace("/chats");
    } catch (signupError) {
      setError(getFirebaseErrorMessage(signupError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    setError("");
    setIsSubmitting(true);

    try {
      const currentUser = auth.currentUser;

      if (currentUser?.isAnonymous) {
        await currentUser.linkWithPopup(provider);
      } else {
        await auth.signInWithPopup(provider);
      }

      history.replace("/chats");
    } catch (signupError) {
      setError(getFirebaseErrorMessage(signupError));
    } finally {
      setIsSubmitting(false);
    }
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
            <p className="auth-error" role="alert">
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
          disabled={isSubmitting}
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

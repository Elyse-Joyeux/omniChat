import React, { useEffect, useState } from "react";
import { GoogleOutlined } from "@ant-design/icons";
import { Link, useHistory, useLocation } from "react-router-dom";
import firebase, { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { getFirebaseErrorMessage } from "../utils/errors";

// Fire-and-forget welcome email — failure is silently swallowed so it
// never blocks the sign-up flow.
async function sendWelcomeEmail(firebaseUser, displayName) {
  try {
    const token = await firebaseUser.getIdToken();
    await fetch("/api/email/welcome", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: displayName }),
    });
  } catch {
    // non-critical — ignore
  }
}

const Signup = () => {
  const history = useHistory();
  const location = useLocation();
  const { user } = useAuth();
  const inviteParams = new URLSearchParams(location.search);
  const invitedBy = inviteParams.get("from");
  const isInvite = inviteParams.get("invite") === "1";
  const [displayName, setDisplayName]         = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState("");
  const [isSubmitting, setIsSubmitting]       = useState(false);

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
      let firebaseUser;

      if (currentUser?.isAnonymous) {
        const credential = firebase.auth.EmailAuthProvider.credential(
          email.trim(),
          password,
        );
        const result = await currentUser.linkWithCredential(credential);
        firebaseUser = result.user;
      } else {
        const result = await auth.createUserWithEmailAndPassword(
          email.trim(),
          password,
        );
        firebaseUser = result.user;
      }

      // Set display name in Firebase Auth
      const name = displayName.trim() || email.trim().split("@")[0];
      await firebaseUser.updateProfile({ displayName: name });

      // Send welcome email (best-effort, non-blocking)
      sendWelcomeEmail(firebaseUser, name);

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
      let firebaseUser;

      if (currentUser?.isAnonymous) {
        const result = await currentUser.linkWithPopup(provider);
        firebaseUser = result.user;
      } else {
        const result = await auth.signInWithPopup(provider);
        firebaseUser = result.user;
        // Only send welcome for truly new Google accounts
        if (result.additionalUserInfo?.isNewUser) {
          sendWelcomeEmail(firebaseUser, firebaseUser.displayName || "");
        }
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
        <div className="brand-mark" aria-hidden="true">O</div>
        <p className="eyebrow">OMNICHAT</p>
        <h1 id="signup-title">{isInvite ? "You're invited" : "Create your account"}</h1>
        <p className="auth-subtitle">
          {isInvite && invitedBy
            ? `${invitedBy} invited you to join OmniChat. Sign up to start chatting.`
            : "Join your friends and start chatting."}
        </p>

        <form className="auth-form" onSubmit={handleEmailSignup}>
          <label htmlFor="signup-name">Display name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
          />

          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="At least 6 characters"
            minLength="6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Enter your password again"
            minLength="6"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-divider"><span>or sign up with</span></div>

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

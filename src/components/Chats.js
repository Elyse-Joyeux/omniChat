import React, { useEffect, useState, useCallback, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  Attachment as DefaultAttachment,
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  TypingIndicator,
  Window,
  useChatContext,
} from "stream-chat-react";
import "stream-chat-react/css/index.css";
import { useAuth } from "../contexts/AuthContext";
import { useChatClient } from "../contexts/ChatContext";
import { useTheme } from "../contexts/ThemeContext";
import CreateChatModal, { ChannelSidebarHeader } from "./CreateChatModal";
import InviteModal from "./InviteModal";
import { fetchWithRetry, getStreamErrorMessage, isOnline } from "../utils/errors";
import { searchUsers } from "../utils/chat";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "").join("") || "?";

// ─── Custom Attachment renderer ───────────────────────────────────────────────

const Attachment = (props) => {
  const attachments = props.attachments || [];
  return (
    <div className="omni-attachments">
      {attachments.map((att) => {
        const isVideo = att.type === "video" || att.mime_type?.startsWith("video/");
        const isImage = att.type === "image" || att.mime_type?.startsWith("image/");
        if (isVideo && att.asset_url) {
          return (
            <div className="omni-attachment omni-attachment-video" key={att.id || att.asset_url}>
              <video controls preload="metadata" src={att.asset_url}>
                <track kind="captions" />
              </video>
              {att.title && <p className="omni-attachment-caption">{att.title}</p>}
            </div>
          );
        }
        if (isImage && (att.image_url || att.thumb_url || att.asset_url)) {
          const src = att.image_url || att.thumb_url || att.asset_url;
          return (
            <div className="omni-attachment omni-attachment-image" key={att.id || src}>
              <img src={src} alt={att.fallback || att.title || "Shared image"} loading="lazy" />
              {att.title && <p className="omni-attachment-caption">{att.title}</p>}
            </div>
          );
        }
        return <DefaultAttachment key={att.id || att.asset_url} attachments={[att]} />;
      })}
    </div>
  );
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const IconSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const IconCompose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconInvite = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V10c0-.63.3-1.22.8-1.6l8-6a2 2 0 012.4 0l8 6z" />
    <path d="M22 10l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 10" />
  </svg>
);

// ─── Profile dropdown ─────────────────────────────────────────────────────────

const ProfileDropdown = ({ displayName, photoURL, onClose }) => {
  const history        = useHistory();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const go = (path) => { onClose(); history.push(path); };

  const handleSignOut = async () => {
    onClose();
    try { await signOut(); history.replace("/login"); } catch { /* ignore */ }
  };

  return (
    <div className="profile-dropdown" ref={ref} role="menu" aria-label="Profile menu">
      {/* User info header */}
      <div className="pd-header">
        <div className="pd-avatar">
          {photoURL
            ? <img src={photoURL} alt={displayName} />
            : <span>{getInitials(displayName)}</span>}
        </div>
        <div className="pd-name-wrap">
          <p className="pd-name">{displayName}</p>
          <p className="pd-email">{user?.email || "Guest account"}</p>
        </div>
      </div>

      <div className="pd-divider" />

      {/* Profile */}
      <button className="pd-item" type="button" role="menuitem" onClick={() => go("/profile")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Edit profile
      </button>

      {/* Settings */}
      <button className="pd-item" type="button" role="menuitem" onClick={() => go("/settings")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        Settings
      </button>

      {/* Appearance */}
      <button className="pd-item pd-item--toggle" type="button" role="menuitem" onClick={toggleTheme}>
        {theme === "dark" ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            Light mode
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
            Dark mode
          </>
        )}
        <span className="pd-toggle-track">
          <span className={`pd-toggle-thumb${theme === "dark" ? " pd-toggle-thumb--on" : ""}`} />
        </span>
      </button>

      <div className="pd-divider" />

      {/* Logout */}
      <button className="pd-item pd-item--danger" type="button" role="menuitem" onClick={handleSignOut}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Log out
      </button>
    </div>
  );
};

// ─── Toast notification system ────────────────────────────────────────────────

let _toastId = 0;

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className="toast-item" role="alert">
          <div className="toast-avatar">
            {t.image
              ? <img src={t.image} alt={t.sender} />
              : <span>{getInitials(t.sender)}</span>}
          </div>
          <div className="toast-body">
            <p className="toast-sender">{t.sender}</p>
            <p className="toast-text">{t.text}</p>
          </div>
          <button
            className="toast-close"
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
          >
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── People / Explore panel ───────────────────────────────────────────────────

const PeoplePanel = ({ authToken, currentUser, client, onChannelOpen }) => {
  const [term, setTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    if (!authToken) return;
    if (!term.trim()) { setUsers([]); setLoading(false); return; }

    let alive = true;
    setLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(term, authToken);
        if (alive) setUsers(results.filter((u) => u.id !== currentUser.uid));
      } catch {
        if (alive) { setError("Unable to load people."); setUsers([]); }
      } finally {
        if (alive) setLoading(false);
      }
    }, 280);

    return () => { alive = false; clearTimeout(timer); };
  }, [term, authToken, currentUser.uid]);

  const startChat = async (targetUser) => {
    setStarting(targetUser.id);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetchWithRetry("/api/channels", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [targetUser.id] }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Failed to start chat.");
      const channel = client.channel(payload.channelType, payload.channelId);
      await channel.watch();
      onChannelOpen(channel);
    } catch (err) {
      setError(err.message || "Unable to start chat.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="people-panel">
      <div className="people-panel-header">
        <p className="panel-eyebrow">FIND PEOPLE</p>
        <h2>Explore</h2>
      </div>
      <div className="people-search-box">
        <IconSearch />
        <input
          type="search"
          placeholder="Search by name…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />
        {term && (
          <button className="people-search-clear" type="button"
            onClick={() => setTerm("")} aria-label="Clear search">
            <IconClose />
          </button>
        )}
      </div>
      <div className="people-list">
        {!term.trim() && (
          <div className="people-idle">
            <div className="people-idle-icon" aria-hidden="true"><IconSearch /></div>
            <p className="people-idle-title">Find people</p>
            <p className="people-idle-hint">Type a name to search for registered OmniChat users.</p>
          </div>
        )}
        {term.trim() && loading && <p className="people-status">Searching…</p>}
        {term.trim() && !loading && error && <p className="people-status people-error">{error}</p>}
        {term.trim() && !loading && !error && users.length === 0 && (
          <p className="people-status">No users found for "{term}".</p>
        )}
        {term.trim() && !loading && users.map((u) => (
          <div className="people-row" key={u.id}>
            <span className="people-avatar">
              {u.image ? <img src={u.image} alt={u.name || u.id} /> : getInitials(u.name || u.id)}
            </span>
            <span className="people-info">
              <strong>{u.name || u.id}</strong>
              <span className={`people-status-dot ${u.online ? "online" : "offline"}`}>
                {u.online ? "● Online" : "● Offline"}
              </span>
            </span>
            <button className="people-chat-btn" type="button"
              onClick={() => startChat(u)} disabled={starting === u.id}
              aria-label={`Start chat with ${u.name || u.id}`}>
              {starting === u.id ? "…" : <IconCompose />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main workspace ───────────────────────────────────────────────────────────

const ChatWorkspace = ({ user, client, isGuest, isOffline }) => {
  const { setActiveChannel, channel: activeChannel } = useChatContext();
  const [showCreateModal, setShowCreateModal]     = useState(false);
  const [showInviteModal, setShowInviteModal]     = useState(false);
  const [showProfileMenu, setShowProfileMenu]     = useState(false);
  const [authToken, setAuthToken]                 = useState("");
  const [activeTab, setActiveTab]                 = useState("chats");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [toasts, setToasts]                       = useState([]);
  const [unreadCount, setUnreadCount]             = useState(0);
  const history = useHistory();

  // Auth token
  useEffect(() => {
    let alive = true;
    user.getIdToken().then((t) => { if (alive) setAuthToken(t); });
    return () => { alive = false; };
  }, [user]);

  // ── Notifications ─────────────────────────────────────────────────────────
  // Ask for native permission once (best-effort — works on desktop, not all mobiles).
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  // Listen for new messages on the Stream client
  useEffect(() => {
    if (!client) return;

    const handleNewMessage = (event) => {
      const msg = event.message;
      if (!msg || msg.user?.id === user.uid) return; // ignore own messages

      const isCurrentChannel = activeChannel?.id === event.channel_id;
      const isHidden         = document.visibilityState === "hidden";

      // Increment badge for any message not in the active channel
      if (!isCurrentChannel) setUnreadCount((c) => c + 1);

      // Show in-app toast when hidden OR from a different channel
      if (isHidden || !isCurrentChannel) {
        const sender = msg.user?.name || msg.user?.id || "Someone";
        const text   = msg.text
          ? (msg.text.length > 72 ? msg.text.slice(0, 72) + "…" : msg.text)
          : msg.attachments?.length ? "📎 Sent an attachment"
          : "New message";

        const id = ++_toastId;
        setToasts((cur) => [...cur.slice(-4), { id, sender, text, image: msg.user?.image }]);
        // Auto-dismiss after 5 s
        setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 5000);

        // Also fire native OS notification when tab is fully hidden
        if (isHidden && "Notification" in window && Notification.permission === "granted") {
          try {
            const native = new Notification(sender, {
              body: text,
              icon: "/omnichat-icon.svg",
              badge: "/omnichat-icon.svg",
              tag: event.channel_id,
              renotify: true,
            });
            native.onclick = () => { window.focus(); native.close(); };
          } catch { /* Safari / some mobile browsers throw — silently ignore */ }
        }
      }
    };

    client.on("message.new", handleNewMessage);
    return () => client.off("message.new", handleNewMessage);
  }, [client, user.uid, activeChannel?.id]);

  // Reset unread badge when chats tab is opened
  const openTab = useCallback((tab) => {
    setActiveTab(tab);
    setShowMobileSidebar(true);
    if (tab === "chats") setUnreadCount(0);
  }, []);

  const handleChannelCreated = useCallback((channel) => {
    setActiveChannel(channel);
    setShowMobileSidebar(false);
    setUnreadCount(0);
  }, [setActiveChannel]);

  const handleChannelOpen = useCallback((channel) => {
    setActiveChannel(channel);
    setActiveTab("chats");
    setShowMobileSidebar(false);
    setUnreadCount(0);
  }, [setActiveChannel]);

  const closeSidebar = useCallback(() => setShowMobileSidebar(false), []);

  const displayName = user.displayName || user.email?.split("@")[0] || `Guest ${user.uid.slice(0, 6)}`;
  const photoURL    = user.photoURL;
  const filters     = { type: "messaging", members: { $in: [user.uid] } };
  const sort        = { last_message_at: -1 };
  const options     = { state: true, watch: true, presence: true, limit: 30 };

  return (
    <>
      {isOffline && (
        <div className="offline-banner" role="status">
          You're offline — messages will send when your connection returns.
        </div>
      )}

      <div className="app-shell">
        {/* ── Icon rail ── */}
        <nav className="icon-rail" aria-label="Main navigation">
          <div className="rail-brand" aria-hidden="true">O</div>

          {/* Chats */}
          <button
            className={`rail-btn${activeTab === "chats" ? " rail-btn--active" : ""}`}
            type="button" onClick={() => openTab("chats")} title="Chats" aria-label="Chats"
          >
            <IconChat />
            {unreadCount > 0 && (
              <span className="rail-badge" aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Search / Explore */}
          <button
            className={`rail-btn${activeTab === "search" ? " rail-btn--active" : ""}`}
            type="button" onClick={() => openTab("search")} title="Find people" aria-label="Find people"
          >
            <IconSearch />
          </button>

          {/* Invite */}
          <button
            className={`rail-btn${activeTab === "invite" ? " rail-btn--active" : ""}`}
            type="button" onClick={() => setShowInviteModal(true)} title="Invite by email" aria-label="Invite by email"
          >
            <IconInvite />
          </button>

          <div className="rail-spacer" aria-hidden="true" />

          {/* Guest upgrade prompt */}
          {isGuest && (
            <button className="rail-btn" type="button"
              onClick={() => history.push("/signup")} title="Create account" aria-label="Create account">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </button>
          )}

          {/* Settings */}
          <button className="rail-btn" type="button"
            onClick={() => history.push("/settings")} title="Settings" aria-label="Settings">
            <IconSettings />
          </button>

          {/* Avatar → opens profile dropdown */}
          <div className="rail-avatar-wrap">
            <button
              className="rail-avatar"
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              title="Account menu"
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
            >
              {photoURL
                ? <img src={photoURL} alt={displayName} />
                : <span>{getInitials(displayName)}</span>}
            </button>
            {showProfileMenu && (
              <ProfileDropdown
                displayName={displayName}
                photoURL={photoURL}
                onClose={() => setShowProfileMenu(false)}
              />
            )}
          </div>
        </nav>

        {/* ── Sidebar ── */}
        <aside className={`sidebar${showMobileSidebar ? " sidebar--open" : ""}`}>
          {/* Backdrop (mobile only) */}
          {showMobileSidebar && (
            <div className="sidebar-backdrop" aria-hidden="true" onClick={closeSidebar} />
          )}

          <div className="sidebar-inner">
            <button className="sidebar-mobile-close" type="button"
              onClick={closeSidebar} aria-label="Close sidebar">
              <IconClose />
            </button>

            {activeTab === "chats" && (
              <>
                <ChannelSidebarHeader onCreateClick={() => setShowCreateModal(true)} />
                <div className="channel-list-wrap">
                  <ChannelList filters={filters} sort={sort} options={options} />
                </div>
              </>
            )}

            {activeTab === "search" && authToken && (
              <PeoplePanel
                authToken={authToken}
                currentUser={user}
                client={client}
                onChannelOpen={handleChannelOpen}
              />
            )}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="chat-main">
          <Channel Attachment={Attachment}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <TypingIndicator />
              <MessageComposer focus />
            </Window>
            <Thread />
          </Channel>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        className="mobile-sidebar-toggle"
        type="button"
        onClick={() => { openTab("chats"); setUnreadCount(0); }}
        aria-label="Open conversations"
      >
        <IconChat />
        {unreadCount > 0 && (
          <span className="fab-badge" aria-label={`${unreadCount} unread`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* In-app toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modals */}
      {showCreateModal && authToken && (
        <CreateChatModal
          client={client}
          currentUser={user}
          authToken={authToken}
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={handleChannelCreated}
        />
      )}

      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
    </>
  );
};

// ─── Root Chats page ──────────────────────────────────────────────────────────

const Chats = () => {
  const history = useHistory();
  const { user, signOut } = useAuth();
  const { client, ready, error, retry } = useChatClient();
  const { theme } = useTheme();
  const [isOffline, setIsOffline] = useState(!isOnline());

  useEffect(() => {
    const up   = () => setIsOffline(false);
    const down = () => setIsOffline(true);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const handleLogout = async () => {
    try {
      if (client?.userID) await client.disconnectUser();
      await signOut();
      history.push("/login");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(getStreamErrorMessage(err, "Unable to sign out. Please try again."));
    }
  };

  if (error) {
    return (
      <main className="chats-error" role="alert">
        <div className="chats-error-card">
          <div className="chats-error-icon" aria-hidden="true">!</div>
          <p>{error}</p>
          <div className="error-actions">
            <button className="error-retry-btn" type="button" onClick={retry}>Try again</button>
            <button className="error-logout-btn" type="button" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  const isConnected = Boolean(user && client?.userID === user.uid);

  if (!user || (!isConnected && (!ready || !client))) {
    return (
      <main className="chats-loading">
        <div className="chats-loading-inner">
          <div className="loading-spinner" aria-hidden="true" />
          <p>{isConnected ? "Loading…" : "Connecting to chat…"}</p>
        </div>
      </main>
    );
  }

  return (
    <div className={`chats-page${theme === "dark" ? " theme-dark" : ""}`}>
      <Chat client={client} theme={theme === "dark" ? "messaging dark" : "messaging light"}>
        <ChatWorkspace
          user={user}
          client={client}
          isGuest={user.isAnonymous}
          isOffline={isOffline}
        />
      </Chat>
    </div>
  );
};

export default Chats;

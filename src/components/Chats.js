import React, { useEffect, useRef, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { StreamChat } from "stream-chat";
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
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import CreateChatModal, { ChannelSidebarHeader } from "./CreateChatModal";
import {
  checkChatServerHealth,
  fetchChatConfig,
  getServerHealthMessage,
} from "../utils/api";
import {
  fetchWithRetry,
  getStreamErrorMessage,
  isOnline,
} from "../utils/errors";

const streamTokenUrl =
  process.env.REACT_APP_STREAM_CHAT_TOKEN_URL || "/api/stream/token";

const Attachment = (props) => {
  const attachments = props.attachments || [];

  return (
    <div className="omni-attachments">
      {attachments.map((attachment) => {
        const isVideo = attachment.type === "video" || attachment.mime_type?.startsWith("video/");
        const isImage = attachment.type === "image" || attachment.mime_type?.startsWith("image/");

        if (isVideo && attachment.asset_url) {
          return (
            <div className="omni-attachment omni-attachment-video" key={attachment.id || attachment.asset_url}>
              <video controls preload="metadata" src={attachment.asset_url}>
                <track kind="captions" />
              </video>
              {attachment.title && <p className="omni-attachment-caption">{attachment.title}</p>}
            </div>
          );
        }

        if (isImage && (attachment.image_url || attachment.thumb_url || attachment.asset_url)) {
          const src = attachment.image_url || attachment.thumb_url || attachment.asset_url;
          return (
            <div className="omni-attachment omni-attachment-image" key={attachment.id || src}>
              <img src={src} alt={attachment.fallback || attachment.title || "Shared image"} loading="lazy" />
              {attachment.title && <p className="omni-attachment-caption">{attachment.title}</p>}
            </div>
          );
        }

        return <DefaultAttachment key={attachment.id || attachment.asset_url} attachments={[attachment]} />;
      })}
    </div>
  );
};

const ChatWorkspace = ({ user, client, isGuest, isOffline, onLogout }) => {
  const { setActiveChannel } = useChatContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    let isCurrent = true;

    user.getIdToken().then((token) => {
      if (isCurrent) setAuthToken(token);
    });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const displayName = user.displayName || user.email || `Guest ${user.uid.slice(0, 6)}`;
  const filters = { type: "messaging", members: { $in: [user.uid] } };
  const sort = { last_message_at: -1 };
  const options = { state: true, watch: true, presence: true, limit: 20 };

  return (
    <>
      {isOffline && (
        <div className="offline-banner" role="status">
          You are offline. Messages will send when your connection returns.
        </div>
      )}
      <div className="nav-bar">
        <div className="nav-left">
          <div className="logo-tab">OMNICHAT</div>
          <div className="user-meta">
            <span className="user-name">{displayName}</span>
            {isGuest && <span className="guest-badge">Guest</span>}
          </div>
        </div>
        <div className="nav-actions">
          {isGuest && (
            <>
              <Link className="nav-link" to="/login">
                Sign in
              </Link>
              <Link className="nav-link nav-link-primary" to="/signup">
                Create account
              </Link>
            </>
          )}
          <button className="logout-tab" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      <div className="chat-layout">
        <aside className="channel-list-panel">
          <ChannelSidebarHeader onCreateClick={() => setShowCreateModal(true)} />
          <ChannelList filters={filters} sort={sort} options={options} />
        </aside>
        <Channel Attachment={Attachment}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <TypingIndicator />
            <MessageComposer focus />
          </Window>
          <Thread />
        </Channel>
      </div>
      {showCreateModal && authToken && (
        <CreateChatModal
          client={client}
          currentUser={user}
          authToken={authToken}
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={setActiveChannel}
        />
      )}
    </>
  );
};

const Chats = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const connectAttemptRef = useRef(0);

  useEffect(() => {
    if (!user) return undefined;

    if (!isOnline()) {
      setError("You appear to be offline. Check your connection and try again.");
      setLoading(false);
      return undefined;
    }

    const attemptId = connectAttemptRef.current + 1;
    connectAttemptRef.current = attemptId;
    let chatClient = null;

    const connect = async () => {
      setLoading(true);
      setError("");

      try {
        const health = await checkChatServerHealth();
        if (!health.ok || !health.streamConfigured) {
          throw new Error(getServerHealthMessage(health));
        }

        const { streamApiKey } = await fetchChatConfig();
        chatClient = StreamChat.getInstance(streamApiKey);

        if (chatClient.userID) {
          await chatClient.disconnectUser();
        }

        if (attemptId !== connectAttemptRef.current) return;

        const firebaseToken = await user.getIdToken(true);
        const response = await fetchWithRetry(streamTokenUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.displayName || user.email || `Guest ${user.uid.slice(0, 6)}`,
            image: user.photoURL || undefined,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Unable to get a chat session. Please try again.");
        }

        const { token } = payload;
        if (!token) throw new Error("Unable to start chat. Please try again.");

        if (attemptId !== connectAttemptRef.current) return;

        if (chatClient.userID) {
          await chatClient.disconnectUser();
        }

        await chatClient.connectUser(
          {
            id: user.uid,
            name: user.displayName || user.email || `Guest ${user.uid.slice(0, 6)}`,
            image: user.photoURL || undefined,
          },
          token,
        );

        if (attemptId !== connectAttemptRef.current) {
          await chatClient.disconnectUser();
          return;
        }

        setClient(chatClient);
        setLoading(false);
      } catch (connectionError) {
        if (attemptId === connectAttemptRef.current) {
          setError(getStreamErrorMessage(connectionError));
          setLoading(false);
        }
      }
    };

    connect();

    return () => {
      connectAttemptRef.current += 1;
      if (chatClient?.userID) {
        chatClient.disconnectUser().catch(() => {});
      }
    };
  }, [user, retryCount]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      if (client?.userID) await client.disconnectUser();
      await auth.signOut();
      history.push("/login");
    } catch (logoutError) {
      setError(getStreamErrorMessage(logoutError, "Unable to sign out. Please try again."));
    }
  };

  const handleRetry = () => {
    connectAttemptRef.current += 1;
    if (client?.userID) {
      client.disconnectUser().catch(() => {});
      setClient(null);
    }
    setRetryCount((count) => count + 1);
  };

  if (error) {
    return (
      <main className="chats-error" role="alert">
        <div>
          <p>{error}</p>
          <div className="error-actions">
            <button className="logout-tab error-retry" type="button" onClick={handleRetry}>
              Try again
            </button>
            <button className="logout-tab error-logout" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!user || loading || !client) {
    return <main className="chats-loading">Connecting to chat…</main>;
  }

  const isGuest = user.isAnonymous;

  return (
    <div className="chats-page">
      <Chat client={client} theme="messaging light">
        <ChatWorkspace
          user={user}
          client={client}
          isGuest={isGuest}
          isOffline={isOffline}
          onLogout={handleLogout}
        />
      </Chat>
    </div>
  );
};

export default Chats;

import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { StreamChat } from "stream-chat";
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import "stream-chat-react/css/index.css";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const streamApiKey = process.env.REACT_APP_STREAM_CHAT_API_KEY;
const streamTokenUrl = process.env.REACT_APP_STREAM_CHAT_TOKEN_URL;

const Chats = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      // visitors use an anonymous Firebase session; no Firebase account is required.
      auth.signInAnonymously().catch((signInError) => {
        setError(signInError.message || "Unable to start a guest chat session.");
        setLoading(false);
      });
      return undefined;
    }

    if (!streamApiKey || !streamTokenUrl) {
      setError("Stream Chat is not configured. Add the Stream environment variables and restart the app.");
      setLoading(false);
      return undefined;
    }

    const chatClient = StreamChat.getInstance(streamApiKey);
    let isCurrent = true;

    const connectChat = async () => {
      try {
        // stream token is issued by the server after it verifies this firebase ID token.
        // never put the stream app secret in a REACT_APP_* variable.
        const firebaseToken = await user.getIdToken();
        const response = await fetch(streamTokenUrl, {
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

        if (!response.ok) throw new Error("Unable to get a Stream Chat token.");

        const { token } = await response.json();
        if (!token) throw new Error("The Stream token response was invalid.");

        await chatClient.connectUser(
          {
            id: user.uid,
            name: user.displayName || user.email || `Guest ${user.uid.slice(0, 6)}`,
            image: user.photoURL || undefined,
          },
          token,
        );

        if (isCurrent) {
          setClient(chatClient);
          setLoading(false);
        } else {
          await chatClient.disconnectUser();
        }
      } catch (connectionError) {
        if (isCurrent) {
          setError(connectionError.message || "Unable to connect to Stream Chat.");
          setLoading(false);
        }
      }
    };

    connectChat();

    return () => {
      isCurrent = false;
      if (chatClient.userID === user.uid) chatClient.disconnectUser();
    };
  }, [user, history]);

  const handleLogout = async () => {
    if (client?.userID) await client.disconnectUser();
    await auth.signOut();
    history.push("/");
  };

  if (error) {
    return (
      <main className="chats-error" role="alert">
        <div>
          <p>{error}</p>
          <button className="logout-tab error-logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </main>
    );
  }

  if (!user || loading) {
    return <main className="chats-loading">Connecting to chat…</main>;
  }

  const filters = { type: "messaging", members: { $in: [user.uid] } };
  const sort = { last_message_at: -1 };

  return (
    <div className="chats-page">
      <div className="nav-bar">
        <div className="logo-tab">OMNICHAT</div>
        <button className="logout-tab" type="button" onClick={handleLogout}>Logout</button>
      </div>
      <Chat client={client} theme="messaging light">
        <ChannelList filters={filters} sort={sort} options={{ state: true, watch: true }} />
        <Channel>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageComposer focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};

export default Chats

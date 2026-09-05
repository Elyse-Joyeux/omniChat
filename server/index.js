require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { StreamChat } = require("stream-chat");

// `PORT` is reserved by Create React App. Keep the API server on its own port
// so `npm run dev` can start both processes from the same .env file.
const PORT = process.env.SERVER_PORT || 3001;
const STREAM_API_KEY = process.env.STREAM_API_KEY || process.env.REACT_APP_STREAM_CHAT_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID || "omnichat-3c607";
const FIREBASE_API_KEY =
  process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBLT2admOYMRpDN5H6YeaNBjAhmVMTU2yg";

const FEED_CHANNEL_ID = "community-feed";
const GENERAL_CHANNEL_ID = "general-chat";

const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  if (hasServiceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
      projectId: FIREBASE_PROJECT_ID,
    });
  } else {
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
}

const streamClient = STREAM_API_KEY && STREAM_API_SECRET
  ? StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET)
  : null;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

async function verifyTokenWithRestApi(idToken, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;

    try {
      response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        },
      );
    } catch (networkError) {
      lastError = networkError;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      throw Object.assign(
        new Error("Unable to verify your session. Please try again."),
        { status: 503, cause: networkError },
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      throw Object.assign(new Error("Unable to verify your session. Please try again."), {
        status: 503,
        cause: parseError,
      });
    }

    if (!response.ok || !payload.users?.length) {
      throw Object.assign(new Error("Your session expired. Please sign in again."), { status: 401 });
    }

    const account = payload.users[0];
    return {
      uid: account.localId,
      email: account.email,
      name: account.displayName,
      picture: account.photoUrl,
    };
  }

  throw Object.assign(new Error("Unable to verify your session. Please try again."), {
    status: 503,
    cause: lastError,
  });
}

async function verifyFirebaseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing authorization token."), { status: 401 });
  }

  const idToken = authHeader.slice(7);

  if (hasServiceAccount) {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (verifyError) {
      throw Object.assign(new Error("Your session expired. Please refresh the page."), { status: 401 });
    }
  }

  return verifyTokenWithRestApi(idToken);
}

async function ensureDefaultChannels(userId) {
  if (!streamClient) return;

  const feedChannel = streamClient.channel("messaging", FEED_CHANNEL_ID, {
    name: "Community Feed",
    image: "https://getstream.io/images/stream-logo.png",
  });

  const generalChannel = streamClient.channel("messaging", GENERAL_CHANNEL_ID, {
    name: "General Chat",
    image: "https://getstream.io/images/stream-logo.png",
  });

  await feedChannel.create().catch(() => {});
  await generalChannel.create().catch(() => {});

  await feedChannel.addMembers([userId]).catch(() => {});
  await generalChannel.addMembers([userId]).catch(() => {});
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    streamConfigured: Boolean(streamClient && STREAM_API_KEY),
    firebaseProject: FIREBASE_PROJECT_ID,
  });
});

app.get("/api/config", (_req, res) => {
  if (!STREAM_API_KEY) {
    return res.status(503).json({ error: "Chat is temporarily unavailable." });
  }

  return res.json({ streamApiKey: STREAM_API_KEY });
});

async function handleStreamToken(req, res) {
  try {
    if (!streamClient || !STREAM_API_KEY) {
      return res.status(503).json({
        error: "Chat is temporarily unavailable. Please try again in a moment.",
      });
    }

    const decoded = await verifyFirebaseToken(req.headers.authorization);
    const uid = decoded.uid;
    const { name, image } = req.body || {};

    const displayName =
      name || decoded.name || decoded.email || `Guest ${uid.slice(0, 6)}`;
    const avatar = image || decoded.picture || undefined;

    try {
      await streamClient.upsertUser({
        id: uid,
        name: displayName,
        image: avatar,
      });
    } catch (streamError) {
      console.error("Stream upsertUser failed (continuing):", streamError.message || streamError);
    }

    try {
      await ensureDefaultChannels(uid);
    } catch (channelError) {
      console.error("Default channel setup failed (continuing):", channelError.message || channelError);
    }

    const token = streamClient.createToken(uid);
    return res.json({ token, userId: uid });
  } catch (error) {
    const status = error.status || 500;
    const message = status >= 500
      ? "Chat is temporarily unavailable. Please try again in a moment."
      : (error.message || "Unable to create a chat session.");
    if (status >= 500) {
      console.error("Stream token error:", error.cause || error);
    }
    return res.status(status).json({ error: message });
  }
}

app.post("/api/stream-token", handleStreamToken);
app.post("/api/stream/token", handleStreamToken);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const server = app.listen(PORT, () => {
  console.log(`OmniChat server running on http://localhost:${PORT}`);
  if (!streamClient) {
    console.warn("Warning: STREAM_API_SECRET is missing. Chat token requests will fail.");
  }
  if (!hasServiceAccount) {
    console.log("Using Firebase REST token verification (no service account configured).");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set SERVER_PORT in .env.`,
    );
    process.exit(1);
  }

  throw error;
});

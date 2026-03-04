import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

   const PORT = Number(process.env.PORT) || 3000;

  // In-memory state for sessions
  // sessions: { [sessionId: string]: { players: { [id: string]: Player }, revealed: boolean, adminId: string } }
  const sessions: Record<string, any> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-session", ({ sessionId, name, avatar }) => {
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          players: {},
          revealed: false,
          adminId: socket.id,
        };
      }

      const player = {
        id: socket.id,
        name,
        avatar,
        vote: null,
      };

      sessions[sessionId].players[socket.id] = player;
      socket.join(sessionId);

      io.to(sessionId).emit("session-update", sessions[sessionId]);
    });

    socket.on("submit-vote", ({ sessionId, vote }) => {
      if (sessions[sessionId] && !sessions[sessionId].revealed) {
        sessions[sessionId].players[socket.id].vote = vote;
        io.to(sessionId).emit("session-update", sessions[sessionId]);
      }
    });

    socket.on("reveal-votes", ({ sessionId }) => {
      if (sessions[sessionId] && sessions[sessionId].adminId === socket.id) {
        sessions[sessionId].revealed = true;
        io.to(sessionId).emit("session-update", sessions[sessionId]);
      }
    });

    socket.on("reset-round", ({ sessionId }) => {
      if (sessions[sessionId] && sessions[sessionId].adminId === socket.id) {
        sessions[sessionId].revealed = false;
        Object.keys(sessions[sessionId].players).forEach((id) => {
          sessions[sessionId].players[id].vote = null;
        });
        io.to(sessionId).emit("session-update", sessions[sessionId]);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up player from sessions
      for (const sessionId in sessions) {
        if (sessions[sessionId].players[socket.id]) {
          delete sessions[sessionId].players[socket.id];
          
          // If admin left, assign new admin or delete session
          if (sessions[sessionId].adminId === socket.id) {
            const remainingPlayers = Object.keys(sessions[sessionId].players);
            if (remainingPlayers.length > 0) {
              sessions[sessionId].adminId = remainingPlayers[0];
            } else {
              delete sessions[sessionId];
              continue;
            }
          }
          
          io.to(sessionId).emit("session-update", sessions[sessionId]);
        }
      }
    });
  });

  // API to create a new session
  app.get("/api/create-session", (req, res) => {
    const sessionId = uuidv4();
    res.json({ sessionId });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // Catch-all route to serve index.html for SPA
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

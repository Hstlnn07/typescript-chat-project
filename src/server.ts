import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Server } from "socket.io";

interface ClientToServerEvents {
  join: (name: string) => void;
  chat: (text: string) => void;
}

interface ServerToClientEvents {
  history: (messages: ChatMessage[]) => void;
  message: (message: ChatMessage) => void;
  users: (names: string[]) => void;
  notice: (message: string) => void;
  errorMessage: (message: string) => void;
}

interface SocketData {
  name?: string;
}

function latest<T>(items: readonly T[], count: number): T[] {
  return items.slice(-count);
}

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(httpServer);
const publicDir = path.resolve(__dirname, "../../public");
const clientScript = path.resolve(__dirname, "../public/client.js");
const activeUsers = new Map<string, string>();
const messages: ChatMessage[] = [];

app.use(express.static(publicDir));
app.get("/assets/client.js", (_request, response) => response.sendFile(clientScript));
app.get("/", (_request, response) => response.sendFile(path.join(publicDir, "index.html")));

function sendUsers(): void {
  io.emit("users", [...activeUsers.values()].sort((a, b) => a.localeCompare(b)));
}

io.on("connection", (socket) => {
  socket.on("join", (rawName) => {
    if (typeof rawName !== "string") return;
    const name = rawName.trim();
    if (name.length < 1 || name.length > 24) {
      socket.emit("errorMessage", "Choose a name between 1 and 24 characters.");
      return;
    }
    const wasJoined = activeUsers.has(socket.id);
    socket.data.name = name;
    activeUsers.set(socket.id, name);
    socket.emit("history", latest(messages, 30));
    sendUsers();
    if (!wasJoined) io.emit("notice", `${name} joined the chat.`);
  });

  socket.on("chat", (rawText) => {
    if (typeof rawText !== "string") return;
    const name = socket.data.name;
    if (!name) {
      socket.emit("errorMessage", "Enter your name before sending a message.");
      return;
    }
    const text = rawText.trim();
    if (text.length < 1 || text.length > 500) {
      socket.emit("errorMessage", "Messages must be between 1 and 500 characters.");
      return;
    }
    const message: ChatMessage = { id: randomUUID(), user: name, text, sentAt: new Date().toISOString() };
    messages.push(message);
    if (messages.length > 30) messages.shift();
    io.emit("message", message);
  });

  socket.on("disconnect", () => {
    const name = activeUsers.get(socket.id);
    if (!name) return;
    activeUsers.delete(socket.id);
    sendUsers();
    io.emit("notice", `${name} left the chat.`);
  });
});

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => console.log(`Chat app running at http://localhost:${port}`));

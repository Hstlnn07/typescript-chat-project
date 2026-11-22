// The Socket.IO browser bundle defines `io` before this compiled script loads.
interface ClientSocket {
  emit(event: "join" | "chat", value: string): void;
  on(event: "history", listener: (messages: ChatMessage[]) => void): void;
  on(event: "message", listener: (message: ChatMessage) => void): void;
  on(event: "users", listener: (users: string[]) => void): void;
  on(event: "notice" | "errorMessage", listener: (message: string) => void): void;
  on(event: "connect" | "disconnect", listener: () => void): void;
}
declare function io(): ClientSocket;

const socket = io();
const nameForm = document.querySelector<HTMLFormElement>("#name-form")!;
const messageForm = document.querySelector<HTMLFormElement>("#message-form")!;
const nameInput = document.querySelector<HTMLInputElement>("#name")!;
const messageInput = document.querySelector<HTMLInputElement>("#message")!;
const joinPanel = document.querySelector<HTMLElement>("#join-panel")!;
const chatPanel = document.querySelector<HTMLElement>("#chat-panel")!;
const messageList = document.querySelector<HTMLOListElement>("#messages")!;
const userList = document.querySelector<HTMLUListElement>("#users")!;
const statusText = document.querySelector<HTMLElement>("#status")!;
let currentName = "";

function appendMessage(message: ChatMessage): void {
  const row = document.createElement("li");
  row.className = "message";
  const details = document.createElement("div");
  details.className = "details";
  const author = document.createElement("strong");
  author.textContent = message.user;
  const time = document.createElement("time");
  time.dateTime = message.sentAt;
  time.textContent = new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  details.append(author, time);
  const body = document.createElement("p");
  body.textContent = message.text;
  row.append(details, body);
  messageList.append(row);
  messageList.scrollTop = messageList.scrollHeight;
}

function appendNotice(text: string): void {
  const row = document.createElement("li");
  row.className = "notice";
  row.textContent = text;
  messageList.append(row);
  messageList.scrollTop = messageList.scrollHeight;
}

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (name.length < 1 || name.length > 24) return;
  currentName = name;
  socket.emit("join", name);
  joinPanel.hidden = true;
  chatPanel.hidden = false;
  messageInput.focus();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || text.length > 500) return;
  socket.emit("chat", text);
  messageInput.value = "";
  messageInput.focus();
});

socket.on("history", (messages) => {
  messageList.replaceChildren();
  messages.forEach(appendMessage);
});
socket.on("message", appendMessage);
socket.on("notice", appendNotice);
socket.on("errorMessage", (message) => { statusText.textContent = message; });
socket.on("users", (users) => {
  userList.replaceChildren();
  users.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    userList.append(item);
  });
  document.querySelector<HTMLElement>("#user-count")!.textContent = `${users.length} online`;
});
socket.on("connect", () => {
  statusText.textContent = "Connected";
  if (currentName) socket.emit("join", currentName);
});
socket.on("disconnect", () => { statusText.textContent = "Reconnecting..."; });

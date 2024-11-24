import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);

interface RoomData {
  room: string;
  username: string;
}

const users: Record<string, RoomData> = {};
const rooms: Set<string> = new Set();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (socket: Socket) => {
  // When a user joins
  socket.on("joinRoom", ({ username, room }: RoomData) => {
    users[socket.id] = { username, room };
    rooms.add(room);

    socket.join(room);

    // Send system message about room joining
    socket.emit("message", {
      text: `You have joined the ${room} chat room.`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });

    // Notify other users in the room
    socket.to(room).emit("message", {
      text: `${username} has joined the room.`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });

    io.in(room).emit("roomUsers", {
      room,
      users: Object.values(users).filter((user) => user.room === room),
    });
  });

  // Handle chat messages
  socket.on("chatMessage", (msg) => {
    const user = users[socket.id];
    if (user) {
      io.in(user.room).emit("message", {
        username: user.username,
        text: msg,
        type: "user", // Mark the message as a user message
        time: new Date().toLocaleTimeString(),
      });
    }
  });
});

server.listen(3500, () => {
  console.log("Server running on http://localhost:3500");
});

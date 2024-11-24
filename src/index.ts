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
    console.log("User connected:", socket.id);
  
    socket.on("joinRoom", ({ username, room }: RoomData) => {
      // Save user data
      users[socket.id] = { username, room };
  
      // Join the room
      socket.join(room);
  
      // Emit personalized message to the user who joined
      socket.emit("message", {
        username: "System",
        text: `You have joined the ${room} room.`,
        time: new Date().toLocaleTimeString(),
      });
  
      // Broadcast to others in the room
      socket.to(room).emit("message", {
        username: "System",
        text: `${username} has joined the room.`,
        time: new Date().toLocaleTimeString(),
      });
  
      // Update room user list for everyone in the room
      io.in(room).emit("roomUsers", {
        room,
        users: Object.values(users).filter((user) => user.room === room),
      });
    });
  
    // Handle messages
    socket.on("chatMessage", (msg) => {
      const user = users[socket.id];
      if (user) {
        io.in(user.room).emit("message", {
          username: user.username,
          text: msg,
          time: new Date().toLocaleTimeString(),
        });
      }
    });
  
    // Handle user disconnecting
    socket.on("disconnect", () => {
      const user = users[socket.id];
      if (user) {
        // Notify others in the room
        socket.to(user.room).emit("message", {
          username: "System",
          text: `${user.username} has left the room.`,
          time: new Date().toLocaleTimeString(),
        });
  
        // Remove the user
        delete users[socket.id];
  
        // Update room user list
        io.in(user.room).emit("roomUsers", {
          room: user.room,
          users: Object.values(users).filter((u) => u.room === user.room),
        });
      }
    });
  });
  

server.listen(3500, () => {
  console.log("Server running on http://localhost:3500");
});

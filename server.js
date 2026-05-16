const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const players = {};

app.get("/", (req, res) => {
  res.send("CarDestroy.io multiplayer server is running.");
});

io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  players[socket.id] = {
    id: socket.id,
    name: "Player",
    x: Math.random() * 40 - 20,
    z: Math.random() * 40 - 20,
    rotationY: 0,
    health: 100,
    level: 1,
    xp: 0,
    carColor: "#00bfff",
    wheelColor: "#050505",
    hatColor: "#ff3333",
    character: "driver"
  };

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("updatePlayer", data => {
    if (!players[socket.id]) return;

    players[socket.id] = {
      ...players[socket.id],
      ...data,
      id: socket.id
    };

    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  socket.on("shootBullet", data => {
    io.emit("bulletCreated", {
      id: socket.id + "-" + Date.now(),
      ownerId: socket.id,
      x: data.x,
      z: data.z,
      rotationY: data.rotationY,
      damage: data.damage || 20
    });
  });

  socket.on("hitPlayer", data => {
    const targetId = data.targetId;
    const shooterId = socket.id;
    const damage = data.damage || 20;

    if (!players[targetId]) return;
    if (!players[shooterId]) return;
    if (targetId === shooterId) return;

    players[targetId].health -= damage;

    if (players[targetId].health <= 0) {
      players[targetId].health = 100;
      players[targetId].x = Math.random() * 40 - 20;
      players[targetId].z = Math.random() * 40 - 20;

      players[shooterId].xp += 1;

      if (players[shooterId].xp >= 5) {
        players[shooterId].xp = 0;
        players[shooterId].level += 1;
      }

      io.emit("playerRespawned", players[targetId]);
      io.emit("playerLeveled", players[shooterId]);
    } else {
      io.emit("playerHealthUpdated", {
        id: targetId,
        health: players[targetId].health
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    delete players[socket.id];
    socket.broadcast.emit("playerDisconnected", socket.id);
  });
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

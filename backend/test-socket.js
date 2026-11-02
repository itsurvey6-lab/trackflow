
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:5000";

// Supply a fresh customer JWT through the environment.
const token = process.env.TEST_JWT;
const orderId = process.env.TEST_ORDER_ID || "2";

if (!token) {
  console.error("Missing TEST_JWT environment variable.");
  process.exit(1);
}

const socket = io(BASE_URL, {
  auth: { token },
});

socket.on("connect", () => {
  console.log("Connected to Socket.IO:", socket.id);

  socket.emit("order:join", orderId, (reply) => {
    console.log("Join order room:", reply);

    if (reply?.status !== "success") {
      socket.disconnect();
      process.exitCode = 1;
    }
  });
});

socket.on("order:status_updated", (event) => {
  console.log("REAL-TIME STATUS UPDATE:", event);
});

socket.on("location:updated", (event) => {
  console.log("REAL-TIME LOCATION UPDATE:", event);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

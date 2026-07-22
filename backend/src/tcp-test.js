import net from "node:net";

const socket = net.createConnection({
  host: "smtp-relay.brevo.com",
  port: 587,
});

socket.setTimeout(10000);

socket.on("connect", () => {
  console.log("✅ Connected to Brevo SMTP");
  socket.end();
});

socket.on("data", (data) => {
  console.log("SMTP:", data.toString());
});

socket.on("timeout", () => {
  console.log("❌ TCP Timeout");
  socket.destroy();
});

socket.on("error", (err) => {
  console.log("❌ Error:", err);
});

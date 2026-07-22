import net from "node:net";

async function test(port) {
  return new Promise((resolve) => {
    console.log(`Testing port ${port}...`);

    const socket = net.createConnection({
      host: "smtp-relay.brevo.com",
      port,
    });

    socket.setTimeout(10000);

    socket.on("connect", () => {
      console.log(`✅ Connected on ${port}`);
      socket.end();
      resolve();
    });

    socket.on("timeout", () => {
      console.log(`❌ Timeout on ${port}`);
      socket.destroy();
      resolve();
    });

    socket.on("error", (err) => {
      console.log(`❌ Error on ${port}:`, err.code);
      resolve();
    });
  });
}

await test(587);
await test(465);

import net from "node:net";

function test(host, port) {
  return new Promise((resolve) => {
    console.log(`Testing ${host}:${port}`);

    const socket = net.createConnection({ host, port });

    socket.setTimeout(10000);

    socket.on("connect", () => {
      console.log(`✅ Connected to ${host}:${port}`);
      socket.end();
      resolve();
    });

    socket.on("timeout", () => {
      console.log(`❌ Timeout on ${host}:${port}`);
      socket.destroy();
      resolve();
    });

    socket.on("error", (err) => {
      console.log(`❌ Error on ${host}:${port}`, err.code);
      resolve();
    });
  });
}

await test("smtp.brevo.com", 587);
await test("smtp.brevo.com", 465);

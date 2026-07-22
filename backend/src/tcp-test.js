import dns from "node:dns/promises";
import net from "node:net";

const HOST = "smtp-relay.brevo.com";

async function resolveHost() {
  console.log("========================================");
  console.log("DNS Lookup");
  console.log("========================================");

  try {
    const addresses = await dns.lookup(HOST, { all: true });

    console.log("Resolved addresses:");
    console.log(addresses);
  } catch (err) {
    console.error("DNS Error:");
    console.error(err);
  }

  console.log();
}

async function testPort(port) {
  return new Promise((resolve) => {
    console.log("========================================");
    console.log(`Testing ${HOST}:${port}`);
    console.log("========================================");

    const socket = net.createConnection({
      host: HOST,
      port,
    });

    socket.setTimeout(10000);

    socket.on("connect", () => {
      console.log(`✅ TCP Connected on port ${port}`);
    });

    socket.on("data", (data) => {
      console.log("SMTP Greeting:");
      console.log(data.toString());

      socket.end();
    });

    socket.on("timeout", () => {
      console.log(`❌ TCP Timeout on port ${port}`);
      socket.destroy();
      resolve();
    });

    socket.on("error", (err) => {
      console.log(`❌ Error on port ${port}`);
      console.log({
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        address: err.address,
        port: err.port,
        message: err.message,
      });
      resolve();
    });

    socket.on("close", () => {
      console.log(`Connection closed for port ${port}`);
      console.log();
      resolve();
    });
  });
}

async function main() {
  console.log("Brevo SMTP Connectivity Test");
  console.log();

  await resolveHost();

  await testPort(587);

  await testPort(465);

  console.log("Finished.");
}

main();

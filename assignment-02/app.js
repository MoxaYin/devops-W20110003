const http = require("http");
const os = require("os");
const fs = require("fs");

const port = 3000;
const logFile = "/home/ec2-user/requests.log";

const server = http.createServer((req, res) => {
  const hostname = os.hostname();
  const line = `${new Date().toISOString()} ${hostname} ${req.url}\n`;

  try {
    fs.appendFileSync(logFile, line);
  } catch (error) {
    console.error(`Unable to write request log: ${error.message}`);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(`Server: ${hostname}\n`);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

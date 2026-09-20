const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  let filePath = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  filePath = path.normalize(filePath).replace(/^\.\.(\/|\\|$)/, "");
  const abs = path.join(root, filePath);

  fs.stat(abs, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(abs).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "public, max-age=300"
    });
    fs.createReadStream(abs).pipe(res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AuthPath Health site listening on port ${port}`);
});

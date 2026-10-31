const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'build', 'web');
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
  let relativePath = req.url.split('?')[0];
  if (relativePath === '/') relativePath = '/index.html';
  let filePath = path.join(dir, relativePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(dir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mime[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 8090;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Vocario Mobile Web running at http://localhost:${PORT}/`);
});

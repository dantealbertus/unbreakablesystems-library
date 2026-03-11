const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'DanteSystems97';
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function readData() {
  // Try JSONBin first (persistent across deployments)
  if (JSONBIN_KEY && JSONBIN_BIN_ID) {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Meta': 'false' }
      });
      if (res.ok) return await res.json();
    } catch(e) { console.error('JSONBin read error:', e.message); }
  }
  // Fallback: local file (resets on redeploy)
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { systems: null, categories: null };
}

async function writeData(data) {
  // Write to JSONBin (persistent)
  if (JSONBIN_KEY && JSONBIN_BIN_ID) {
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(data)
      });
      return;
    } catch(e) { console.error('JSONBin write error:', e.message); }
  }
  // Fallback: local file
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Public: get all data
app.get('/api/data', async (req, res) => {
  try {
    res.json(await readData());
  } catch(e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Admin: save data (requires password)
app.post('/api/data', async (req, res) => {
  const { password, systems, categories } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const current = await readData();
    if (systems !== undefined) current.systems = systems;
    if (categories !== undefined) current.categories = categories;
    await writeData(current);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Running on port ${PORT}${JSONBIN_KEY ? ' [JSONBin storage]' : ' [local file storage]'}`));

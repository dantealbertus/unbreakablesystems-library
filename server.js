const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'DanteSystems97';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { systems: null, categories: null };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Public: get all data
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// Admin: save data (requires password)
app.post('/api/data', (req, res) => {
  const { password, systems, categories } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const current = readData();
  if (systems !== undefined) current.systems = systems;
  if (categories !== undefined) current.categories = categories;
  writeData(current);
  res.json({ ok: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, () => console.log(`Running on port ${PORT}`));

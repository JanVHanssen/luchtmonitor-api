const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const app = express();
app.use(express.json());

// Middleware: API key controle
function checkApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    console.log(`[${new Date().toLocaleString('nl-BE')}] Ongeautoriseerde toegang geweigerd`);
    return res.status(401).json({ error: 'Ongeautoriseerd' });
  }
  next();
}

// POST /meting — ESP stuurt data naar hier
app.post('/meting', checkApiKey, async (req, res) => {
  const { temperature, humidity, pressure, gas_resistance } = req.body;

  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ error: 'Ontbrekende data' });
  }

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const meting = { temperature, humidity, pressure, gas_resistance };

try {
    await db.ref(`/metingen/${timestamp}`).set(meting);
    console.log(`[${now.toLocaleString('nl-BE')}] Meting opgeslagen in Firebase:`, meting);
    res.json({ success: true, timestamp });
  } catch (err) {
    console.error(`[${now.toLocaleString('nl-BE')}] Firebase fout:`, err.message, err.code);
    res.status(500).json({ error: 'Opslaan mislukt', detail: err.message });
  }
});

// GET /status — om te checken of API draait
app.get('/status', (req, res) => {
  res.json({ status: 'online', tijd: new Date().toLocaleString('nl-BE') });
});

app.listen(process.env.PORT, () => {
  console.log(`LuchtMonitor API draait op poort ${process.env.PORT}`);
});
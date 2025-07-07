const fs = require('fs');
const fetch = require('node-fetch');

const ttl = fs.readFileSync('/init/data.ttl', 'utf8');

const FUSEKI_URL = 'http://fuseki:3030/ds';
const DATA_URL = `${FUSEKI_URL}/data`;
const RETRY_INTERVAL = 2000; // ms
const MAX_RETRIES = 15;

async function waitForFuseki(retries = 0) {
  try {
    const res = await fetch(FUSEKI_URL, { method: 'GET' });
    if (res.ok) {
      console.log('Fuseki est prêt ! Chargement des données...');
      await uploadData();
    } else {
      throw new Error(`Status: ${res.status}`);
    }
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.log(`Fuseki pas prêt (tentative ${retries + 1}/${MAX_RETRIES})...`);
      setTimeout(() => waitForFuseki(retries + 1), RETRY_INTERVAL);
    } else {
      console.error('Timeout : Fuseki ne répond pas.');
    }
  }
}

const auth = Buffer.from("admin:admin").toString('base64');

async function uploadData() {
  try {
    const res = await fetch(DATA_URL, {
    method: 'POST',
    headers: {
    'Content-Type': 'text/turtle',
    'Authorization': `Basic ${auth}`
  },
  body: ttl
    });
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const text = await res.text();
    console.log('Données RDF chargées avec succès.');
    console.log(text);
  } catch (err) {
    console.error('Échec du chargement RDF :', err.message);
  }
}

waitForFuseki();

// Lancement du service Fuseki avec barre de progression visuelle + DEBUG COMPLET
// MODIFIÉ pour charger data.ttl ET ia-das-taxonomy.ttl dans le même dataset ds
const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');

console.log('🔧 === DÉBUT DEBUG FUSEKI LOADER (DUAL FILES) ===');

// Lecture et analyse des DEUX fichiers TTL
const dataTtl = fs.readFileSync('/init/data.ttl', 'utf8');
const taxonomyTtl = fs.readFileSync('/init/ia-das-taxonomy.ttl', 'utf8');

console.log('📁 ANALYSE DES FICHIERS TTL:');
console.log('\n📊 DATA.TTL:');
console.log(`   📏 Taille: ${dataTtl.length} caractères (${Math.round(dataTtl.length / 1024)} KB)`);
console.log(`   🔑 Hash MD5: ${crypto.createHash('md5').update(dataTtl).digest('hex')}`);
console.log(`   🏷️  Préfixes: ${(dataTtl.match(/@prefix/g) || []).length}`);
console.log(`   🔬 Mentions "Analysis": ${(dataTtl.match(/iadas:Analysis/g) || []).length}`);

console.log('\n📊 IA-DAS-TAXONOMY.TTL:');
console.log(`   📏 Taille: ${taxonomyTtl.length} caractères (${Math.round(taxonomyTtl.length / 1024)} KB)`);
console.log(`   🔑 Hash MD5: ${crypto.createHash('md5').update(taxonomyTtl).digest('hex')}`);
console.log(`   🏷️  Préfixes: ${(taxonomyTtl.match(/@prefix/g) || []).length}`);
console.log(`   🌳 Mentions "subClassOf": ${(taxonomyTtl.match(/rdfs:subClassOf/g) || []).length}`);

const FUSEKI_URL = 'http://fuseki:3030/ds';
const DATA_URL = `${FUSEKI_URL}/data`;
const SPARQL_URL = `${FUSEKI_URL}/sparql`;
const PING_URL = 'http://fuseki:3030/$/ping';
const RETRY_INTERVAL = 2000;
const MAX_RETRIES = 30;
const auth = Buffer.from("admin:admin").toString('base64');

console.log('\n⚙️  CONFIGURATION:');
console.log(`   🌐 FUSEKI_URL: ${FUSEKI_URL}`);
console.log(`   📤 DATA_URL: ${DATA_URL}`);
console.log(`   🔍 SPARQL_URL: ${SPARQL_URL}`);
console.log(`   🏓 PING_URL: ${PING_URL}`);
console.log(`   🔐 Auth: ${auth}`);

let startTime;

function drawProgressBar(current, total, width = 40) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const filledChar = '█';
  const emptyChar = '░';
  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
  
  return `[${bar}] ${percentage}%`;
}

function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

async function waitForFuseki(retries = 0) {
  if (retries === 0) {
    startTime = Date.now();
    console.log('\n🚀 DÉMARRAGE VÉRIFICATION FUSEKI:');
    console.log(`   ⏱️  Max retries: ${MAX_RETRIES}`);
    console.log(`   🔄 Intervalle: ${RETRY_INTERVAL/1000}s`);
    console.log('');
  }

  try {
    console.log(`\n🏓 PING Fuseki (tentative ${retries + 1}):`);
    console.log(`   📡 URL: ${PING_URL}`);
    
    const res = await fetch(PING_URL, { 
      method: 'GET',
      timeout: 3000
    });
    
    console.log(`   📨 Réponse: Status ${res.status} ${res.statusText}`);
    console.log(`   🔗 Headers: ${JSON.stringify(Object.fromEntries(res.headers))}`);
    
    if (res.ok) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ FUSEKI PRÊT! Temps d'attente: ${formatTime(elapsedTime)}`);
      console.log('📤 Début du chargement des données RDF...\n');
      
      // NOUVEAU: Charger les deux fichiers séquentiellement
      await uploadData();
      await uploadTaxonomy();
      
    } else {
      const errorText = await res.text();
      console.log(`   ❌ Erreur response: ${errorText}`);
      throw new Error(`Status: ${res.status} - ${errorText}`);
    }
  } catch (err) {
    console.log(`   💥 Erreur fetch: ${err.message}`);
    console.log(`   🔍 Type erreur: ${err.name}`);
    console.log(`   📚 Stack: ${err.stack?.substring(0, 200)}...`);
    
    if (retries < MAX_RETRIES) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      const remainingTime = Math.round(((MAX_RETRIES - retries) * RETRY_INTERVAL) / 1000);
      
      const progressBar = drawProgressBar(retries, MAX_RETRIES);
      
      process.stdout.write('\r');
      process.stdout.write(`⏳ ${progressBar} Tentative ${retries + 1}/${MAX_RETRIES} | Écoulé: ${formatTime(elapsedTime)} | Reste: ~${formatTime(remainingTime)}`);
      
      if (retries % 5 === 0 && retries > 0) {
        console.log(`\n   💭 Erreur persistante: ${err.message}`);
      }
      
      setTimeout(() => waitForFuseki(retries + 1), RETRY_INTERVAL);
    } else {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n❌ TIMEOUT après ${formatTime(totalTime)} : Fuseki ne répond pas.`);
      console.error(`   💡 Vérifiez: docker-compose logs fuseki`);
      process.exit(1);
    }
  }
}

async function uploadData() {
  console.log('\n🔷 === UPLOAD DATA.TTL ===');
  return await uploadFile(dataTtl, 'data.ttl', '📊');
}

async function uploadTaxonomy() {
  console.log('\n🔶 === UPLOAD IA-DAS-TAXONOMY.TTL ===');
  return await uploadFile(taxonomyTtl, 'ia-das-taxonomy.ttl', '🌳');
}

async function uploadFile(ttlContent, fileName, icon) {
  const uploadStartTime = Date.now();
  
  console.log(`${icon} DÉBUT UPLOAD ${fileName.toUpperCase()}:`);
  console.log(`   🎯 Destination: ${DATA_URL}`);
  console.log(`   📦 Content-Type: text/turtle`);
  console.log(`   📏 Taille body: ${ttlContent.length} caractères`);
  
  try {
    process.stdout.write(`${icon} Upload ${fileName} en cours `);
    
    const uploadAnimation = setInterval(() => {
      process.stdout.write('.');
    }, 500);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/turtle',
        'Authorization': `Basic ${auth}`,
        'Content-Length': ttlContent.length.toString()
      },
      body: ttlContent
    };
    
    console.log(`\n📋 OPTIONS REQUEST ${fileName}:`);
    console.log(`   Method: ${requestOptions.method}`);
    console.log(`   Headers: ${JSON.stringify(requestOptions.headers)}`);
    console.log(`   Body length: ${requestOptions.body.length}`);
    
    const res = await fetch(DATA_URL, requestOptions);
    
    clearInterval(uploadAnimation);
    console.log('\n');
    
    console.log(`📨 RÉPONSE UPLOAD ${fileName}:`);
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(res.headers))}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log(`   ❌ Erreur body: ${errorText}`);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const responseText = await res.text();
    const uploadTime = Math.round((Date.now() - uploadStartTime) / 1000);
    
    console.log(`   ✅ Response body: "${responseText}"`);
    console.log(`   ⏱️  Temps upload ${fileName}: ${formatTime(uploadTime)}`);
    
    return true;
    
  } catch (err) {
    console.log(`\n❌ ÉCHEC UPLOAD ${fileName}:`);
    console.log(`   Message: ${err.message}`);
    console.log(`   Type: ${err.name}`);
    console.log(`   Stack: ${err.stack}`);
    process.exit(1);
  }
}

async function verifyDataLoaded() {
  console.log('\n🔍 === VÉRIFICATION FINALE DU CHARGEMENT ===');
  
  const queries = [
    {
      name: 'Comptage total triples',
      query: 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }'
    },
    {
      name: 'Comptage Analysis',
      query: 'SELECT (COUNT(*) as ?count) WHERE { ?s a <http://ia-das.org/onto#Analysis> }'
    },
    {
      name: 'Comptage relations hiérarchiques',
      query: 'SELECT (COUNT(*) as ?count) WHERE { ?s <http://www.w3.org/2000/01/rdf-schema#subClassOf> ?o }'
    },
    {
      name: 'Échantillon variables avec hiérarchie',
      query: `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?child ?parent WHERE { 
          ?child rdfs:subClassOf ?parent 
        } LIMIT 5
      `
    },
    {
      name: 'Test Depression hiérarchie',
      query: `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?concept ?label WHERE {
          ?concept rdfs:label ?label .
          FILTER(CONTAINS(LCASE(?label), "depression"))
        } LIMIT 3
      `
    }
  ];
  
  for (const {name, query} of queries) {
    try {
      console.log(`\n🔍 TEST: ${name}`);
      console.log(`   📝 Requête: ${query.replace(/\s+/g, ' ').trim()}`);
      
      const startQuery = Date.now();
      const res = await fetch(SPARQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
          'Authorization': `Basic ${auth}`
        },
        body: query
      });
      
      const queryTime = Date.now() - startQuery;
      console.log(`   📨 Status: ${res.status} (${queryTime}ms)`);
      
      if (res.ok) {
        const result = await res.json();
        console.log(`   📊 Résultat: ${JSON.stringify(result, null, 2)}`);
        
        if (result.results?.bindings) {
          console.log(`   🔢 Nombre bindings: ${result.results.bindings.length}`);
        }
      } else {
        const errorText = await res.text();
        console.log(`   ❌ Erreur: ${errorText}`);
      }
      
    } catch (err) {
      console.log(`   💥 Exception: ${err.message}`);
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 CHARGEMENT COMPLET TERMINÉ! Temps total: ${formatTime(totalTime)}`);
  console.log('✅ Dataset "ds" contient maintenant:');
  console.log('   📊 Données ontologiques (data.ttl)');
  console.log('   🌳 Hiérarchie taxonomique (ia-das-taxonomy.ttl)');
}

// Gestion des signaux
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé par utilisateur');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt demandé par système');
  process.exit(0);
});

// Démarrage
console.log('\n🎯 DÉMARRAGE SCRIPT DEBUG DUAL FILES');
console.log('💡 Appuyez sur Ctrl+C pour arrêter\n');

// MODIFIÉ: Appeler verifyDataLoaded à la fin
waitForFuseki().then(() => {
  // Attendre un peu puis vérifier
  setTimeout(verifyDataLoaded, 1000);
}).catch(err => {
  console.error('Erreur générale:', err);
  process.exit(1);
});
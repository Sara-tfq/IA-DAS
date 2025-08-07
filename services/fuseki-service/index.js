// Lancement du service Fuseki avec barre de progression visuelle
const fs = require('fs');
const fetch = require('node-fetch');

const ttl = fs.readFileSync('/init/data.ttl', 'utf8');

const FUSEKI_URL = 'http://fuseki:3030/ds';
const DATA_URL = `${FUSEKI_URL}/data`;
const PING_URL = 'http://fuseki:3030/$/ping'; // Plus fiable pour le health check
const RETRY_INTERVAL = 2000; // 2 secondes
const MAX_RETRIES = 30; // 1 minute total
const auth = Buffer.from("admin:admin").toString('base64');

let startTime;

// Fonction pour dessiner la barre de progression
function drawProgressBar(current, total, width = 40) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  // Utiliser différents caractères pour une meilleure lisibilité
  const filledChar = '█';
  const emptyChar = '░';
  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
  
  return `[${bar}] ${percentage}%`;
}

// Fonction pour formater le temps écoulé
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
    console.log('🚀 Démarrage de la vérification Fuseki...');
    console.log(`📊 Configuration: ${MAX_RETRIES} tentatives max, intervalle ${RETRY_INTERVAL/1000}s`);
    
    // Afficher la taille du fichier à charger
    const fileSizeKB = Math.round(ttl.length / 1024);
    const fileSizeMB = (ttl.length / (1024 * 1024)).toFixed(1);
    console.log(`📁 Fichier TTL: ${fileSizeKB} KB (${fileSizeMB} MB) à charger`);
    console.log(''); // Ligne vide pour la lisibilité
  }

  try {
    // Utiliser l'endpoint ping qui est plus rapide
    const res = await fetch(PING_URL, { 
      method: 'GET',
      timeout: 3000 // Timeout de 3 secondes
    });
    
    if (res.ok) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      console.log(''); // Ligne vide après la barre de progression
      console.log(`✅ Fuseki est prêt ! Temps d'attente: ${formatTime(elapsedTime)}`);
      console.log('📤 Début du chargement des données RDF...');
      await uploadData();
    } else {
      throw new Error(`Status: ${res.status}`);
    }
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      const estimatedTotalTime = Math.round((MAX_RETRIES * RETRY_INTERVAL) / 1000);
      const remainingTime = Math.round(((MAX_RETRIES - retries) * RETRY_INTERVAL) / 1000);
      
      // Créer la barre de progression
      const progressBar = drawProgressBar(retries, MAX_RETRIES);
      
      // Affichage avec retour à la ligne pour nettoyer l'affichage précédent
      process.stdout.write('\r'); // Retour au début de la ligne
      process.stdout.write(`⏳ ${progressBar} Tentative ${retries + 1}/${MAX_RETRIES} | Écoulé: ${formatTime(elapsedTime)} | Reste: ~${formatTime(remainingTime)}`);
      
      // Afficher des détails d'erreur occasionnellement (sur une nouvelle ligne)
      if (retries % 10 === 0 && retries > 0) {
        console.log(''); // Nouvelle ligne
        console.log(`   💭 Détail erreur: ${err.message}`);
        console.log(`   💡 Temps estimé total: ~${formatTime(estimatedTotalTime)}`);
      }
      
      setTimeout(() => waitForFuseki(retries + 1), RETRY_INTERVAL);
    } else {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log(''); // Nouvelle ligne après la barre de progression
      console.error(`❌ Timeout après ${formatTime(totalTime)} : Fuseki ne répond pas.`);
      console.error(`   💡 Vérifiez les logs: docker-compose logs fuseki`);
      console.error(`   🔧 Ou augmentez MAX_RETRIES (actuellement ${MAX_RETRIES})`);
      process.exit(1);
    }
  }
}

async function uploadData() {
  const uploadStartTime = Date.now();
  
  try {
    // Barre de progression pour l'upload
    process.stdout.write('📊 Upload en cours ');
    
    // Animation pendant l'upload
    const uploadAnimation = setInterval(() => {
      process.stdout.write('.');
    }, 500);
    
    const res = await fetch(DATA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/turtle',
        'Authorization': `Basic ${auth}`
      },
      body: ttl
    });
    
    clearInterval(uploadAnimation);
    console.log(''); // Nouvelle ligne
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const text = await res.text();
    const uploadTime = Math.round((Date.now() - uploadStartTime) / 1000);
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`✅ Données RDF chargées avec succès !`);
    console.log(`⏱️  Temps upload: ${formatTime(uploadTime)} | Temps total: ${formatTime(totalTime)}`);
    
    // Afficher la réponse du serveur si elle contient des infos utiles
    if (text && text.trim()) {
      console.log(`📈 Réponse serveur: ${text.trim()}`);
    }
    
    // Vérification optionnelle que les données sont bien là
    console.log('🔍 Vérification du chargement...');
    await verifyDataLoaded();
    
  } catch (err) {
    console.log(''); // Nouvelle ligne en cas d'erreur
    console.error('❌ Échec du chargement RDF :', err.message);
    process.exit(1);
  }
}

// Fonction pour vérifier que les données sont bien chargées
async function verifyDataLoaded() {
  try {
    const queryUrl = `${FUSEKI_URL}/sparql`;
    const testQuery = 'SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }';
    
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json',
        'Authorization': `Basic ${auth}`
      },
      body: testQuery
    });
    
    if (res.ok) {
      const result = await res.json();
      const count = result.results.bindings[0]?.count?.value || '0';
      const formattedCount = parseInt(count).toLocaleString();
      console.log(`🔢 Vérification réussie: ${formattedCount} triples chargés dans le dataset`);
      
      // Test de performance simple
      const queryTime = Date.now();
      const simpleQuery = 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 1';
      const testRes = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
          'Authorization': `Basic ${auth}`
        },
        body: simpleQuery
      });
      
      if (testRes.ok) {
        const queryDuration = Date.now() - queryTime;
        console.log(`⚡ Test de requête: ${queryDuration}ms (performances OK)`);
      }
      
    } else {
      console.log('⚠️  Impossible de vérifier le dataset (mais le chargement semble réussi)');
    }
  } catch (err) {
    console.log('⚠️  Erreur lors de la vérification (ce n\'est pas critique):', err.message);
  }
}

// Gestion propre de l'arrêt du script
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du script demandé par l\'utilisateur');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du script demandé par le système');
  process.exit(0);
});

// Démarrage du script
console.log('🎯 Script de chargement IA-DAS avec barre de progression');
console.log('💡 Appuyez sur Ctrl+C pour arrêter\n');
waitForFuseki();
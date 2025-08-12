// SPARQL Generator avec warmup, retry et variables complètes pour le parser
const http = require('http');
const fetch = require('node-fetch');

// Configuration
const FUSEKI_TIMEOUT = 60000; // 60 secondes
const WARMUP_TIMEOUT = 15000; // 15 secondes pour warmup
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 secondes entre tentatives

// 🆕 FONCTION DE WARMUP avec la requête fallback
async function warmupFuseki(endpoint) {
  console.log('🔥 WARMUP de Fuseki avec requête fallback...');
  
  // Utiliser EXACTEMENT la même requête que le fallback
  const warmupQuery = generateFallbackQuery();
  
  
  try {
    // Utiliser le même système de retry que pour les requêtes principales
    const result = await executeWithRetry(endpoint, warmupQuery, 2); // 2 tentatives pour warmup
    const resultCount = result.results?.bindings?.length || 0;
    console.log(`✅ Fuseki est réveillé et opérationnel (${resultCount} résultats warmup)`);
    return true;
    
  } catch (error) {
    console.error('❌ Warmup échoué même avec retry:', error.message);
    return false;
  }
}

// 🆕 FONCTION DE RETRY
async function executeWithRetry(endpoint, query, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🎯 Tentative ${attempt}/${maxRetries}...`);
    
    try {
      const timeout = Math.min(FUSEKI_TIMEOUT * attempt, 180000); // Max 3 minutes
      console.log(`⏱️ Timeout pour cette tentative: ${timeout/1000}s`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: query,
        timeout: timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Succès à la tentative ${attempt}!`);
        return data;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ Tentative ${attempt} échouée: ${error.message}`);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * attempt;
        console.log(`⏳ Attente de ${delay/1000}s avant prochaine tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Échec après ${maxRetries} tentatives: ${lastError.message}`);
}

function generateSparqlQuery(filters) {
  console.log("=== SPARQL GENERATOR avec VARIABLES COMPLÈTES ===");
  console.log("📥 Filtres reçus:", JSON.stringify(filters, null, 2));
  
  const prefixes = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>`;

  // 🆕 REQUÊTE AVEC TOUTES LES VARIABLES pour le parser
  let query = `${prefixes}

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    # Récupérer toutes les analyses
    ?analysis a iadas:Analysis .
    
    # Récupérer les relations de chaque analyse
    ?analysis iadas:hasRelation ?relation .
    
    # Récupérer les VI et VD de chaque relation
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    # Récupérer les propriétés des variables VI
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    # Récupérer les propriétés des variables VD  
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }`;

  // Ajouter les filtres conditionnellement
  
  // Filtre genre
  if (filters.gender && filters.gender !== '') {
    query += `
    
    # Filtrer sur les populations par genre
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "${filters.gender}" .`;
    console.log("✅ Filtre genre ajouté:", filters.gender);
  }
  
  // Filtre catégorie VD - APPROCHE OPTIMISÉE
  if (filters.categoryVD && filters.categoryVD !== '') {
    query += `
    
    # Filtrer sur les VD de catégorie (approche optimisée)
    ?variableVD iadas:hasCategory "${filters.categoryVD}" .`;
    console.log("✅ Filtre catégorie VD ajouté (optimisé):", filters.categoryVD);
  }
  
  // Filtre catégorie VI 
  if (filters.categoryVI && filters.categoryVI !== '') {
    query += `
    
    # Filtrer sur les VI de catégorie spécifique
    FILTER(?categoryVI = "${filters.categoryVI}")`;
    console.log("✅ Filtre catégorie VI ajouté:", filters.categoryVI);
  }
  
  // Filtre sport
  if (filters.sportType && filters.sportType !== '') {
    query += `
    
    # Filtrer sur les sports
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportName ?sportName .
    FILTER(CONTAINS(LCASE(?sportName), "${filters.sportType.toLowerCase()}"))`;
    console.log("✅ Filtre sport ajouté:", filters.sportType);
  }
  
  // Filtre VI spécifique
  if (filters.selectedVI && filters.selectedVI !== '') {
    query += `
    
    # Filtrer sur VI spécifique
    FILTER(?vi = "${filters.selectedVI}")`;
    console.log("✅ Filtre VI spécifique ajouté:", filters.selectedVI);
  }
  
  // Filtre VD spécifique
  if (filters.selectedVD && filters.selectedVD !== '') {
    query += `
    
    # Filtrer sur VD spécifique
    FILTER(?vd = "${filters.selectedVD}")`;
    console.log("✅ Filtre VD spécifique ajouté:", filters.selectedVD);
  }
  
  // Filtre résultat relation
  if (filters.relationDirection && filters.relationDirection !== '') {
    query += `
    
    # Filtrer sur résultat de relation spécifique
    ?relation iadas:resultatRelation "${filters.relationDirection}" .
    BIND("${filters.relationDirection}" AS ?resultatRelation)`;
    console.log("✅ Filtre relation ajouté:", filters.relationDirection);
  } else {
    // Récupérer tous les résultats de relation
    query += `
    
    # Récupérer le résultat de relation (OPTIONAL)
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }`;
  }
  
  // Toujours récupérer médiateur et modérateur
  query += `
    
    # Médiateur et modérateur (optionnels)
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }`;

  // Finaliser la requête
  query += `
}
ORDER BY ?analysis`;

  // Ajouter LIMIT si pas de filtres spécifiques
  const activeFilters = Object.keys(filters).filter(key => 
    filters[key] && filters[key] !== '' && key !== 'queryType'
  ).length;
  
  if (activeFilters === 0) {
    query += `
LIMIT 1500`;
    console.log("⚠️ Aucun filtre actif - LIMIT 500 ajouté");
  }

  console.log("📝 REQUÊTE GÉNÉRÉE avec toutes les variables:");
  console.log(query);
  console.log("="*60);
  
  return query;
}

// Fonction de fallback simplifiée
function generateFallbackQuery() {
  console.log("🚨 GÉNÉRATION REQUÊTE DE FALLBACK");
  
  return `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?analysis
LIMIT 100`;
}

// Serveur HTTP
http.createServer(async (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      const startTime = Date.now();
      let sparqlQuery = null;
      let usedFallback = false;
      
      try {
        const requestPayload = JSON.parse(body);
        console.log("🚀 DÉBUT DU TRAITEMENT avec WARMUP et RETRY");
        console.log("⏰ Timestamp:", new Date().toISOString());
        
        // Configuration Fuseki
        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';
        
        // Générer la requête AVANT le warmup pour debug
        if (requestPayload.queryType === 'raw_sparql') {
          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log("📝 Utilisation requête SPARQL brute");
        } else {
          sparqlQuery = generateSparqlQuery(requestPayload);
        }
        
        // 🆕 ÉTAPE 1: WARMUP OBLIGATOIRE
        console.log("🔥 WARMUP OBLIGATOIRE avant requête principale...");
        const warmupSuccess = await warmupFuseki(fusekiEndpoint);
        if (!warmupSuccess) {
          console.log("⚠️ Warmup échoué - on continue quand même...");
        } else {
          console.log("✅ Warmup réussi - Fuseki est prêt !");
        }

        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide générée");
        }

        console.log("🔗 Exécution requête principale après warmup...");
        
        let data;
        try {
          // 🆕 ÉTAPE 2: EXÉCUTION avec RETRY (après warmup)
          data = await executeWithRetry(fusekiEndpoint, sparqlQuery, MAX_RETRIES);
          
        } catch (mainError) {
          console.log("🔄 TENTATIVE FALLBACK après échec principal...");
          
          try {
            // Essayer la requête fallback
            const fallbackQuery = generateFallbackQuery();
            data = await executeWithRetry(fusekiEndpoint, fallbackQuery, 2);
            usedFallback = true;
            console.log("✅ FALLBACK RÉUSSI");
            
            // Ajouter un warning
            data.warning = "Requête simplifiée utilisée à cause d'un timeout";
            
          } catch (fallbackError) {
            console.error("💥 FALLBACK AUSSI ÉCHOUÉ:", fallbackError.message);
            throw mainError; // Relancer l'erreur principale
          }
        }

        const queryTime = Date.now() - startTime;
        const resultCount = data.results?.bindings?.length || 0;
        
        console.log("🎉 SUCCÈS COMPLET!");
        console.log(`📊 Résultats trouvés: ${resultCount}`);
        console.log(`⏱️ Temps total: ${queryTime}ms`);
        
        // 🆕 ANALYSE DES VARIABLES pour vérifier compatibilité parser
        if (resultCount > 0) {
          const firstResult = data.results.bindings[0];
          const availableVars = Object.keys(firstResult);
          const expectedVars = ['analysis', 'vi', 'vd', 'categoryVI', 'categoryVD', 'mediator', 'moderator', 'resultatRelation'];
          
          console.log("🔍 VÉRIFICATION COMPATIBILITÉ PARSER:");
          console.log(`   Variables disponibles: ${availableVars.join(', ')}`);
          console.log(`   Variables attendues: ${expectedVars.join(', ')}`);
          
          expectedVars.forEach(varName => {
            const present = availableVars.includes(varName);
            const sampleValue = firstResult[varName]?.value || 'VIDE';
            console.log(`   ${present ? '✅' : '❌'} ${varName}: ${present ? sampleValue : 'MANQUANT'}`);
          });
          
          // Statistiques de complétude
          const stats = {};
          expectedVars.forEach(varName => {
            const count = data.results.bindings.filter(b => b[varName]?.value).length;
            stats[varName] = {
              count: count,
              percentage: ((count / resultCount) * 100).toFixed(1)
            };
          });
          
          console.log("📈 COMPLÉTUDE DES DONNÉES:");
          Object.entries(stats).forEach(([varName, stat]) => {
            console.log(`   ${varName}: ${stat.count}/${resultCount} (${stat.percentage}%)`);
          });
        }
        
        // Ajouter métadonnées étendues
        data.performance = {
          queryTime: queryTime,
          resultCount: resultCount,
          usedFallback: usedFallback,
          usedRetry: true,
          maxRetries: MAX_RETRIES,
          timestamp: new Date().toISOString(),
          parserCompatible: true,
          availableVariables: resultCount > 0 ? Object.keys(data.results.bindings[0]) : []
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        const totalTime = Date.now() - startTime;
        console.error("💥 ERREUR CRITIQUE FINALE:");
        console.error(`   Message: ${err.message}`);
        console.error(`   Temps écoulé: ${totalTime}ms`);
        
        let statusCode = 500;
        let errorType = 'internal_error';
        
        if (err.message.includes('timeout') || totalTime > FUSEKI_TIMEOUT) {
          statusCode = 408;
          errorType = 'timeout';
        } else if (err.message.includes('503')) {
          statusCode = 503;
          errorType = 'service_unavailable';
        } else if (err.message.includes('JSON')) {
          statusCode = 400;
          errorType = 'invalid_request';
        }
        
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur SPARQL Generator avec Retry',
          type: errorType,
          message: err.message,
          timestamp: new Date().toISOString(),
          queryTime: totalTime,
          debugging: {
            usedFallback: usedFallback,
            maxRetries: MAX_RETRIES,
            queryLength: sparqlQuery?.length || 0,
            endpoint: 'fuseki:3030/ds/sparql',
            warmupAttempted: true
          }
        }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("🚀 SPARQL Generator AMÉLIORÉ démarré sur le port 8003");
  console.log("✨ Nouvelles fonctionnalités:");
  console.log("   🔥 Warmup automatique de Fuseki");
  console.log("   🔄 Système de retry intelligent (3 tentatives)");
  console.log("   📊 Variables complètes pour le parser");
  console.log("   🎯 Compatibilité totale avec SPARQLDataParser");
  console.log("   ⏱️ Timeouts adaptatifs et gestion d'erreurs");
  console.log("   🛡️ Fallback automatique en cas d'échec");
  console.log("="*60);
});
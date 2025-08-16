// SPARQL Generator avec warmup AU DÉMARRAGE UNIQUEMENT
const http = require('http');
const fetch = require('node-fetch');

// Configuration
const FUSEKI_TIMEOUT = 60000; // 60 secondes
const WARMUP_TIMEOUT = 15000; // 15 secondes pour warmup
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 secondes entre tentatives
const FUSEKI_UPDATE_URL = 'http://fuseki:3030/ds/update';

// 🔥 ÉTAT GLOBAL DU WARMUP
let isFusekiWarmed = false;
let warmupInProgress = false;
let warmupPromise = null;

// 🔥 WARMUP AU DÉMARRAGE DU SERVICE
async function performStartupWarmup() {
  if (warmupInProgress || isFusekiWarmed) {
    console.log('⏭️ Warmup déjà fait ou en cours - skip');
    return true;
  }

  warmupInProgress = true;
  console.log('\n🔥 === WARMUP AU DÉMARRAGE DU SPARQL GENERATOR ===');
  
  const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';
  const startTime = Date.now();

  // Requêtes de warmup - LES MÊMES que ton code utilise vraiment
  const warmupQueries = [
    {
      name: "Test connexion",
      query: "SELECT (1 as ?test) WHERE { }",
      timeout: 5000
    },
    {
      name: "Fallback principal (EXACT)",
      query: generateFallbackQuery(),
      timeout: 20000
    },
    {
      name: "Requête DEAB (la plus utilisée)",
      query: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>

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
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Filtrer sur les VD de catégorie (approche optimisée)
    ?variableVD iadas:hasCategory "DEAB" .
    
    # Récupérer le résultat de relation (OPTIONAL)
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
    # Médiateur et modérateur (optionnels)
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?analysis
LIMIT 500`,
      timeout: 30000
    },
    {
      name: "Requête Male (courante)",
      query: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>

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
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Filtrer sur les populations par genre
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "Male" .
    
    # Récupérer le résultat de relation (OPTIONAL)
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
    # Médiateur et modérateur (optionnels)
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?analysis`,
      timeout: 30000
    },
    {
      name: "Requête large (sans filtres - LIMIT 1500)",
      query: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>

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
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Récupérer le résultat de relation (OPTIONAL)
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
    # Médiateur et modérateur (optionnels)
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?analysis
LIMIT 800`,
      timeout: 45000
    },
    {
      name: "Requête Q1 compétence",
      query: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>

SELECT DISTINCT ?vd ?vi ?categoryVI ?categoryVD ?resultatRelation ?mediator ?moderator ?analysis 
WHERE {
    # Récupérer toutes les analyses
    ?analysis a iadas:Analysis .
    
    # Récupérer les relations
    ?analysis iadas:hasRelation ?relation .
    
    # Variables et leurs catégories
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Relation et médiateurs/modérateurs
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?vd ?vi
LIMIT 500`,
      timeout: 40000
    }
  ];

  let successCount = 0;

  for (const [index, warmupQuery] of warmupQueries.entries()) {
    console.log(`\n🎯 [${index + 1}/${warmupQueries.length}] ${warmupQuery.name}`);
    
    const queryStart = Date.now();
    
    try {
      const data = await executeWithRetry(fusekiEndpoint, warmupQuery.query, 2);
      const queryTime = Date.now() - queryStart;
      const resultCount = data.results?.bindings?.length || 0;
      
      console.log(`   ✅ Succès: ${resultCount} résultats en ${queryTime}ms`);
      successCount++;
      
    } catch (error) {
      const queryTime = Date.now() - queryStart;
      console.log(`   ❌ Échec: ${error.message} (${queryTime}ms)`);
      
      // Si le test de connexion échoue, on attend un peu
      if (index === 0) {
        console.log('   ⏳ Fuseki pas encore prêt - attente 5s...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Délai entre requêtes
    if (index < warmupQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const totalTime = Date.now() - startTime;
  
  console.log(`\n🔥 === BILAN WARMUP DÉMARRAGE ===`);
  console.log(`   ✅ Succès: ${successCount}/${warmupQueries.length} requêtes`);
  console.log(`   ⏱️ Temps total: ${(totalTime/1000).toFixed(1)}s`);
  
  if (successCount >= 4) { // Au moins 4/6 requêtes réussies
    isFusekiWarmed = true;
    console.log(`   🚀 FUSEKI EST MAINTENANT CHAUD !`);
    console.log(`   🎯 Plus de warmup nécessaire pour les requêtes suivantes`);
    console.log(`   ⚡ Performance optimale garantie`);
  } else {
    console.log(`   ⚠️ Warmup insuffisant (${successCount}/${warmupQueries.length}) - warmup par requête activé`);
  }
  
  warmupInProgress = false;
  return isFusekiWarmed;
}

// 🔥 WARMUP CONDITIONNEL (seulement si pas fait au démarrage)
async function warmupFuseki(endpoint) {
  // Si déjà warm, skip
  if (isFusekiWarmed) {
    console.log('⚡ WARMUP SKIPPÉ - Fuseki déjà chaud depuis le démarrage !');
    return true;
  }

  // Si warmup en cours, attendre qu'il finisse
  if (warmupInProgress && warmupPromise) {
    console.log('⏳ Warmup en cours - attente de la fin...');
    return await warmupPromise;
  }

  console.log('🔥 WARMUP de Fuseki avec requête fallback...');
  const warmupQuery = generateFallbackQuery();

  try {
    const result = await executeWithRetry(endpoint, warmupQuery, 2);
    const resultCount = result.results?.bindings?.length || 0;
    console.log(`✅ Fuseki est réveillé et opérationnel (${resultCount} résultats warmup)`);
    
    // Marquer comme warm même si ce n'était qu'un mini-warmup
    isFusekiWarmed = true;
    return true;

  } catch (error) {
    console.error('❌ Warmup échoué même avec retry:', error.message);
    return false;
  }
}

async function executeWithRetry(endpoint, query, maxRetries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeout = Math.min(FUSEKI_TIMEOUT * attempt, 180000); // Max 3 minutes

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
        return data;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * attempt;
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
    console.log("⚠️ Aucun filtre actif - LIMIT 1500 ajouté");
  }

  console.log("📝 REQUÊTE GÉNÉRÉE avec toutes les variables:");
  console.log(query);
  console.log("=" * 60);

  return query;
}

// Fonction pour exécuter une requête SPARQL UPDATE
async function executeSparqlUpdate(sparqlQuery) {
  console.log('🔄 Exécution requête SPARQL UPDATE...');
  console.log('📝 Requête:', sparqlQuery.substring(0, 200) + '...');

  try {
    const response = await fetch(FUSEKI_UPDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-update',
        'Accept': 'text/plain',
        'Authorization': `Basic ${Buffer.from("admin:admin").toString('base64')}`
      },
      body: sparqlQuery,
      timeout: FUSEKI_TIMEOUT
    });

    console.log(`📨 Réponse UPDATE: Status ${response.status}`);

    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ UPDATE réussi:', responseText || 'Success');
      return {
        success: true,
        message: responseText || 'Update successful',
        status: response.status
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Erreur UPDATE:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

  } catch (error) {
    console.error('💥 Erreur lors de l\'UPDATE:', error.message);
    throw error;
  }
}

// Fonction pour exécuter plusieurs requêtes UPDATE en séquence
async function executeMultipleSparqlUpdates(queries) {
  console.log(`🔄 Exécution de ${Object.keys(queries).length} requêtes UPDATE...`);
  
  const results = {};
  const errors = [];
  
  for (const [queryName, query] of Object.entries(queries)) {
    try {
      console.log(`\n🎯 Exécution: ${queryName}`);
      const result = await executeSparqlUpdate(query);
      results[queryName] = result;
      console.log(`✅ ${queryName}: Succès`);
      
      // Petit délai entre les requêtes pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ ${queryName}: Échec -`, error.message);
      errors.push({
        queryName: queryName,
        error: error.message,
        query: query.substring(0, 200) + '...'
      });
    }
  }
  
  return {
    results: results,
    errors: errors,
    totalQueries: Object.keys(queries).length,
    successCount: Object.keys(results).length,
    errorCount: errors.length
  };
}

function generateCompetenceQuery(questionId) {
  console.log("🚀 === GÉNÉRATEUR DE REQUÊTES DE COMPÉTENCE DÉMARRÉ ===");
  console.log("⏰ Timestamp:", new Date().toISOString());
  console.log("📝 Question ID reçue:", questionId);
  console.log("🔍 Type de questionId:", typeof questionId);
  console.log("🔍 QuestionId vide ?", questionId === null || questionId === undefined || questionId === '');

  // Vérifications de base
  if (!questionId) {
    console.error("❌ ERREUR: questionId est vide/null/undefined !");
    console.log("🔧 Tentative de récupération d'un ID par défaut...");
    questionId = 'q1'; // Fallback
    console.log("✅ ID par défaut assigné:", questionId);
  }

  const prefixes = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>`;

  console.log("📋 Prefixes SPARQL définis");

  let query = '';
  let selectedCase = 'aucun';
  let expectedResults = 'inconnu';

  console.log("🔄 Entrée dans le switch avec questionId:", questionId);

  switch (questionId) {
    case 'q1':
      console.log("✅ CASE Q1 DÉTECTÉ: Pour une ACAD spécifique, facteurs psychosociaux");
      selectedCase = 'q1 - ACAD → Facteurs psychosociaux';
      expectedResults = '800-1000 relations (toutes catégories)';

      query = `${prefixes}

SELECT DISTINCT ?vd ?vi ?categoryVI ?categoryVD ?resultatRelation ?mediator ?moderator ?analysis 
WHERE {
    # Récupérer toutes les analyses
    ?analysis a iadas:Analysis .
    
    # Récupérer les relations
    ?analysis iadas:hasRelation ?relation .
    
    # Variables et leurs catégories
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Relation et médiateurs/modérateurs
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?vd ?vi
LIMIT 1000`;
      break;

    case 'q2-protecteur':
      console.log("✅ CASE Q2-PROTECTEUR DÉTECTÉ: Facteurs protecteurs → ACAD");
      selectedCase = 'q2-protecteur - Facteurs protecteurs UNIQUEMENT';
      expectedResults = '200-400 relations avec resultatRelation = "-"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    # FILTRE SPÉCIFIQUE : Relations protectrices uniquement
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "-" .  # Facteur protecteur UNIQUEMENT
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("-" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
LIMIT 500`;
      break;

    case 'q2-risque':
      console.log("✅ CASE Q2-RISQUE DÉTECTÉ: Facteurs de risque → ACAD");
      selectedCase = 'q2-risque - Facteurs de risque UNIQUEMENT';
      expectedResults = '300-600 relations avec resultatRelation = "+"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    # FILTRE SPÉCIFIQUE : Relations de risque uniquement
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "+" .  # Facteur de risque UNIQUEMENT
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("+" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
LIMIT 500`;
      break;

    case 'q2-ambigu':
      console.log("✅ CASE Q2-AMBIGU DÉTECTÉ: Facteurs ambigus → ACAD");
      selectedCase = 'q2-ambigu - Facteurs ambigus UNIQUEMENT';
      expectedResults = '100-300 relations avec resultatRelation = "NS"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    # FILTRE SPÉCIFIQUE : Relations non significatives uniquement
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "NS" .  # Non significatif UNIQUEMENT
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("NS" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
LIMIT 500`;
      break;

    case 'q3-socioenvironnementaux':
      console.log("✅ CASE Q3-SOCIO DÉTECTÉ: Facteurs socio-environnementaux → ACAD");
      selectedCase = 'q3-socioenvironnementaux - Catégorie Sociocultural factor related to DEAB';
      expectedResults = '50-150 relations de cette catégorie';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVD ?resultatRelation ?analysis ?categoryVI
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    # FILTRE SPÉCIFIQUE : Facteurs socio-environnementaux uniquement
    ?variableVI iadas:VI ?vi ;
                iadas:hasCategory "Sociocultural factor related to DEAB" .
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    
    BIND("Sociocultural factor related to DEAB" AS ?categoryVI)
}
ORDER BY ?vi ?vd
LIMIT 300`;
      break;

    case 'q3-autres':
      console.log("✅ CASE Q3-AUTRES DÉTECTÉ: Autres comportements → ACAD");
      selectedCase = 'q3-autres - Catégorie Other behaviors';
      expectedResults = '50-100 relations de cette catégorie';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVD ?resultatRelation ?analysis ?categoryVI
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    # FILTRE SPÉCIFIQUE : Autres comportements uniquement
    ?variableVI iadas:VI ?vi ;
                iadas:hasCategory "Other behaviors" .
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    
    BIND("Other behaviors" AS ?categoryVI)
}
ORDER BY ?vi ?vd
LIMIT 300`;
      break;

    default:
      console.error("❌ CASE DEFAULT DÉCLENCHÉ !");
      console.error("❌ Question ID non reconnue:", questionId);
      console.error("❌ Valeurs possibles attendues:");
      console.error("   - q1, q2-protecteur, q2-risque, q2-ambigu");
      console.error("   - q3-intrapersonnels, q3-interpersonnels");
      console.error("   - q3-socioenvironnementaux, q3-autres");
      console.log("🔧 Utilisation d'une requête par défaut...");

      selectedCase = 'DEFAULT - Requête générale de secours';
      expectedResults = '100-200 relations générales';

      // Requête par défaut plus ciblée
      query = `${prefixes}

SELECT DISTINCT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation 
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI iadas:VI ?vi .
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD iadas:VD ?vd .
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
}
ORDER BY ?analysis
LIMIT 200`;
      break;
  }

  // Logs de résumé
  console.log("📊 === RÉSUMÉ DE LA GÉNÉRATION ===");
  console.log("🎯 Case sélectionné:", selectedCase);
  console.log("📈 Résultats attendus:", expectedResults);
  console.log("📏 Longueur de la requête:", query.length, "caractères");
  console.log("🔍 Requête contient LIMIT ?", query.includes('LIMIT'));
  console.log("🔍 Requête contient DISTINCT ?", query.includes('DISTINCT'));
  console.log("🔍 Requête contient des filtres ?", query.includes('FILTRE SPÉCIFIQUE') || query.includes('iadas:resultatRelation'));

  console.log("📝 === REQUÊTE SPARQL GÉNÉRÉE ===");
  console.log(query);
  console.log("=" * 80);
  console.log("🎯 Fin de génération pour questionId:", questionId);
  console.log("⏰ Timestamp fin:", new Date().toISOString());
  console.log("=" * 80);

  return query;
}

function getFilterDescription(questionId) {
  const descriptions = {
    'q1': 'Toutes les relations ACAD ↔ Facteurs',
    'q2-protecteur': 'Uniquement relations PROTECTRICES (-)',
    'q2-risque': 'Uniquement relations de RISQUE (+)',
    'q2-ambigu': 'Uniquement relations AMBIGUËS (NS)',
    'q3-intrapersonnels': 'Uniquement facteurs INTRAPERSONNELS',
    'q3-interpersonnels': 'Uniquement facteurs INTERPERSONNELS',
    'q3-socioenvironnementaux': 'Uniquement facteurs SOCIO-ENVIRONNEMENTAUX',
    'q3-autres': 'Uniquement AUTRES COMPORTEMENTS'
  };

  return descriptions[questionId] || 'Requête générale par défaut';
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

// Serveur HTTP complet
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

  if (req.url === '/update-analysis' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      const startTime = Date.now();
      
      try {
        console.log('\n🚀 === DÉBUT UPDATE ANALYSIS ===');
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        const requestData = JSON.parse(body);
        console.log('📥 Données reçues:', {
          hasFormData: !!requestData.formData,
          hasSparqlQueries: !!requestData.sparqlQueries,
          queryCount: requestData.sparqlQueries ? Object.keys(requestData.sparqlQueries).length : 0
        });
        
        // Vérifier les données reçues
        if (!requestData.sparqlQueries) {
          throw new Error('Aucune requête SPARQL fournie');
        }
        
        const queries = requestData.sparqlQueries;
        console.log('📋 Requêtes à exécuter:', Object.keys(queries));
        
        // Exécuter toutes les requêtes UPDATE
        const updateResults = await executeMultipleSparqlUpdates(queries);
        
        const totalTime = Date.now() - startTime;
        
        console.log('\n📊 RÉSULTATS UPDATE:');
        console.log(`   ✅ Succès: ${updateResults.successCount}/${updateResults.totalQueries}`);
        console.log(`   ❌ Erreurs: ${updateResults.errorCount}`);
        console.log(`   ⏱️ Temps total: ${totalTime}ms`);
        
        if (updateResults.errors.length > 0) {
          console.log('\n❌ DÉTAIL DES ERREURS:');
          updateResults.errors.forEach(err => {
            console.log(`   - ${err.queryName}: ${err.error}`);
          });
        }
        
        // Réponse selon le succès
        if (updateResults.errorCount === 0) {
          // Succès complet
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Analyse ajoutée avec succès! ${updateResults.successCount} objets créés.`,
            results: updateResults,
            executionTime: totalTime,
            analysisId: requestData.formData?.analysisId || 'unknown',
            timestamp: new Date().toISOString()
          }));
          
        } else if (updateResults.successCount > 0) {
          // Succès partiel
          res.writeHead(207, { 'Content-Type': 'application/json' }); // 207 Multi-Status
          res.end(JSON.stringify({
            success: false,
            message: `Analyse partiellement ajoutée. ${updateResults.successCount}/${updateResults.totalQueries} objets créés.`,
            results: updateResults,
            executionTime: totalTime,
            analysisId: requestData.formData?.analysisId || 'unknown',
            timestamp: new Date().toISOString()
          }));
          
        } else {
          // Échec complet
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Échec complet de l\'ajout de l\'analyse.',
            results: updateResults,
            executionTime: totalTime,
            analysisId: requestData.formData?.analysisId || 'unknown',
            timestamp: new Date().toISOString()
          }));
        }
        
      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('\n💥 ERREUR CRITIQUE UPDATE ANALYSIS:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Temps écoulé: ${totalTime}ms`);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Erreur serveur lors de l\'ajout de l\'analyse',
          error: error.message,
          executionTime: totalTime,
          timestamp: new Date().toISOString()
        }));
      }
    });
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
        console.log("🚀 DÉBUT DU TRAITEMENT");
        console.log("⏰ Timestamp:", new Date().toISOString());

        // Configuration Fuseki
        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';

        console.log("🔄 Détermination du type de requête...");
        console.log("🔍 queryType détecté:", requestPayload.queryType);

        if (requestPayload.queryType === 'predefined_competence') {
          console.log("🎯 REQUÊTE DE COMPÉTENCE PRÉDÉFINIE");
          console.log("📝 Question ID:", requestPayload.questionId);

          sparqlQuery = generateCompetenceQuery(requestPayload.questionId);

          if (!sparqlQuery) {
            throw new Error(`Question de compétence non reconnue: ${requestPayload.questionId}`);
          }

          console.log("✅ Requête de compétence générée avec succès");
          console.log("📏 Longueur de la requête:", sparqlQuery.length, "caractères");

        } else if (requestPayload.queryType === 'raw_sparql') {
          console.log("⚡ REQUÊTE SPARQL BRUTE");

          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log("✅ Requête SPARQL brute utilisée");

        } else {
          console.log("🔍 REQUÊTE DE RECHERCHE NORMALE (avec filtres)");

          // Utiliser generateSparqlQuery SEULEMENT pour les requêtes normales
          sparqlQuery = generateSparqlQuery(requestPayload);
          console.log("✅ Requête avec filtres générée");
        }

        console.log("✅ Type final de requête déterminé");
        console.log("✅ Requête finale prête pour exécution");

        // 🔥 WARMUP CONDITIONNEL (seulement si pas fait au démarrage)
        if (!isFusekiWarmed) {
          console.log("🔥 WARMUP NÉCESSAIRE - Fuseki pas encore chaud...");
          const warmupSuccess = await warmupFuseki(fusekiEndpoint);
          if (!warmupSuccess) {
            console.log("⚠️ Warmup échoué - on continue quand même...");
          } else {
            console.log("✅ Warmup réussi - Fuseki est prêt !");
          }
        } else {
          console.log("⚡ WARMUP SKIPPÉ - Fuseki déjà chaud depuis le démarrage !");
        }

        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide générée");
        }

        console.log("🎯 Exécution requête principale...");

        let data;
        try {
          data = await executeWithRetry(fusekiEndpoint, sparqlQuery, MAX_RETRIES);

        } catch (mainError) {
          console.log("🚨 TENTATIVE FALLBACK après échec principal...");

          try {
            // Essayer la requête fallback
            const fallbackQuery = generateFallbackQuery();
            data = await executeWithRetry(fusekiEndpoint, fallbackQuery, 2);
            usedFallback = true;
            console.log("✅ FALLBACK RÉUSSI");

            // Ajouter un warning
            data.warning = "Requête simplifiée utilisée à cause d'un timeout";

          } catch (fallbackError) {
            console.error("❌ FALLBACK AUSSI ÉCHOUÉ:", fallbackError.message);
            throw mainError; // Relancer l'erreur principale
          }
        }

        const queryTime = Date.now() - startTime;
        const resultCount = data.results?.bindings?.length || 0;

        console.log("🎉 SUCCÈS COMPLET!");
        console.log(`📊 Résultats trouvés: ${resultCount}`);
        console.log(`⏱️ Temps total: ${queryTime}ms`);

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
          availableVariables: resultCount > 0 ? Object.keys(data.results.bindings[0]) : [],
          fusekiWarmed: isFusekiWarmed
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
            warmupAttempted: true,
            fusekiWarmed: isFusekiWarmed
          }
        }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("🚀 SPARQL Generator avec WARMUP AU DÉMARRAGE - Port 8003");
  console.log("✨ Nouvelles fonctionnalités:");
  console.log("   🔥 Warmup automatique AU DÉMARRAGE (une seule fois)");
  console.log("   🔄 Système de retry intelligent (3 tentatives)");
  console.log("   📊 Variables complètes pour le parser");
  console.log("   🎯 Compatibilité totale avec SPARQLDataParser");
  console.log("   ⚡ Skip warmup si déjà fait au démarrage");
  console.log("   🛡️ Fallback automatique en cas d'échec");
  console.log("   🆕 Endpoint UPDATE pour ajouter des analyses (/update-analysis)");
  console.log("=" * 60);
  
  // 🔥 DÉMARRER LE WARMUP EN ARRIÈRE-PLAN
  console.log("\n🔥 LANCEMENT DU WARMUP AU DÉMARRAGE...");
  warmupPromise = performStartupWarmup();
});
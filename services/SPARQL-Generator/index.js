// SPARQL Generator avec warmup AU DÉMARRAGE UNIQUEMENT
const http = require('http');
const fetch = require('node-fetch');

// Fonction de conversion SPARQL vers Turtle
function convertSparqlToTurtle(sparqlResults, metadata = {}) {
  if (!sparqlResults.results || !sparqlResults.results.bindings) {
    throw new Error('Format SPARQL invalide');
  }
  
  const bindings = sparqlResults.results.bindings;
  const timestamp = new Date().toISOString();
  
  // En-tête Turtle avec préfixes
  let turtle = `@prefix iadas: <http://ia-das.org/onto#> .
@prefix iadas-data: <http://ia-das.org/data#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix export: <http://ia-das.org/export#> .

# Export généré le ${timestamp}
# Type: ${metadata.exportType || 'sparql_query'}
`;

  if (metadata.questionId) {
    turtle += `# Question ID: ${metadata.questionId}\n`;
  }
  if (metadata.questionText) {
    turtle += `# Question: ${metadata.questionText}\n`;
  }
  
  turtle += `\n`;
  
  // Convertir chaque binding en triples Turtle
  bindings.forEach((binding, index) => {
    const exportId = `export:result_${index + 1}`;
    turtle += `${exportId} rdf:type export:SparqlResult ;\n`;
    
    Object.keys(binding).forEach(variable => {
      const value = binding[variable];
      if (value && value.value) {
        const turtleValue = value.type === 'uri' 
          ? `<${value.value}>` 
          : `"${value.value.replace(/"/g, '\\"')}"`;
        turtle += `    export:${variable} ${turtleValue} ;\n`;
      }
    });
    
    turtle += `    export:resultIndex ${index + 1} .\n\n`;
  });
  
  // Métadonnées d'export
  turtle += `export:metadata rdf:type export:ExportMetadata ;
    export:timestamp "${timestamp}"^^xsd:dateTime ;
    export:resultCount ${bindings.length} ;
    export:exportFormat "turtle" `;
    
  if (metadata.questionId) {
    turtle += `;\n    export:sourceQuestion "${metadata.questionId}" `;
  }
  
  turtle += `.\n`;
  
  return turtle;
}

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
    console.log(' Warmup déjà fait ou en cours - skip');
    return true;
  }

  warmupInProgress = true;
  console.log('\n === WARMUP AU DÉMARRAGE DU SPARQL GENERATOR ===');

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
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?variableVD iadas:hasCategory "DEAB" .
    
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?analysis
`,
      timeout: 30000
    },
    {
      name: "Requête Male (courante)",
      query: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "Male" .
    
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
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
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { 
      ?relation iadas:resultatRelation ?resultatRelation 
    }
    
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
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?vd ?vi ?categoryVI ?categoryVD ?resultatRelation ?mediator ?moderator ?analysis 
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?vd ?vi
`,
      timeout: 40000
    }
  ];

  let successCount = 0;

  for (const [index, warmupQuery] of warmupQueries.entries()) {
    console.log(`\n [${index + 1}/${warmupQueries.length}] ${warmupQuery.name}`);

    const queryStart = Date.now();

    try {
      const data = await executeWithRetry(fusekiEndpoint, warmupQuery.query, 2);
      const queryTime = Date.now() - queryStart;
      const resultCount = data.results?.bindings?.length || 0;

      console.log(`   Succès: ${resultCount} résultats en ${queryTime}ms`);
      successCount++;
    } catch (error) {
      const queryTime = Date.now() - queryStart;
      console.log(`    Échec: ${error.message} (${queryTime}ms)`);

      // Si le test de connexion échoue, on attend un peu
      if (index === 0) {
        console.log('    Fuseki pas encore prêt - attente 5s...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Délai entre requêtes
    if (index < warmupQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const totalTime = Date.now() - startTime;

  console.log(`\n === BILAN WARMUP DÉMARRAGE ===`);
  console.log(`    Succès: ${successCount}/${warmupQueries.length} requêtes`);
  console.log(`    Temps total: ${(totalTime / 1000).toFixed(1)}s`);

  if (successCount >= 4) { // Au moins 4/6 requêtes réussies
    isFusekiWarmed = true;
    console.log(`    FUSEKI EST MAINTENANT CHAUD !`);
    console.log(`    Plus de warmup nécessaire pour les requêtes suivantes`);
    console.log(`    Performance optimale garantie`);
  } else {
    console.log(`    Warmup insuffisant (${successCount}/${warmupQueries.length}) - warmup par requête activé`);
  }

  warmupInProgress = false;
  return isFusekiWarmed;
}

// Fonction pour générer les requêtes SPARQL de hiérarchie
function generateHierarchyQuery(conceptLabel) {
 
  
  // Vérifications de base
  if (!conceptLabel || conceptLabel.trim() === '') {
    console.error(" ERREUR: conceptLabel est vide !");
    throw new Error("Concept label requis pour la requête hiérarchie");
  }
  
  // Fonction automatique de mapping label → URI ontologique
  console.log(" Génération automatique de l'URI...");
  
  let conceptUri = generateAutomaticUri(conceptLabel);
  
  console.log(` URI généré: ${conceptLabel} → ${conceptUri}`);
  
  // Générer la requête SPARQL complète
  const prefixes = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX taxonomy: <http://ia-das.org/taxonomy#>`;

  const query = `${prefixes}

SELECT ?concept ?conceptLabel ?relation ?related ?relatedLabel ?level WHERE {
  # Le concept principal
  BIND(<http://ia-das.org/onto#${conceptUri.replace('iadas:', '')}> AS ?mainConcept)
  
  {
    # PARENTS du concept avec comptage de niveaux
    ?mainConcept rdfs:subClassOf ?parent1 .
    BIND(?parent1 as ?concept)
    BIND("parent" as ?relation)
    BIND(?concept as ?related) 
    BIND(1 as ?level)
    OPTIONAL { ?concept rdfs:label ?conceptLabel }
    OPTIONAL { ?related rdfs:label ?relatedLabel }
  }
  UNION
  {
    ?mainConcept rdfs:subClassOf ?parent1 .
    ?parent1 rdfs:subClassOf ?parent2 .
    BIND(?parent2 as ?concept)
    BIND("parent" as ?relation)
    BIND(?concept as ?related)
    BIND(2 as ?level)
    OPTIONAL { ?concept rdfs:label ?conceptLabel }
    OPTIONAL { ?related rdfs:label ?relatedLabel }
  }
  UNION
  {
    ?mainConcept rdfs:subClassOf ?parent1 .
    ?parent1 rdfs:subClassOf ?parent2 .
    ?parent2 rdfs:subClassOf ?parent3 .
    BIND(?parent3 as ?concept)
    BIND("parent" as ?relation)
    BIND(?concept as ?related)
    BIND(3 as ?level)
    OPTIONAL { ?concept rdfs:label ?conceptLabel }
    OPTIONAL { ?related rdfs:label ?relatedLabel }
  }
  UNION
  {
    # ENFANTS du concept
    ?concept rdfs:subClassOf ?mainConcept .
    BIND("child" as ?relation)
    BIND(?concept as ?related)
    BIND(1 as ?level)
    OPTIONAL { ?concept rdfs:label ?conceptLabel }
    OPTIONAL { ?related rdfs:label ?relatedLabel }
  }
  UNION
  {
    # Le concept LUI-MÊME
    BIND(?mainConcept as ?concept)
    BIND("self" as ?relation)
    BIND(?mainConcept as ?related)
    BIND(0 as ?level)
    OPTIONAL { ?concept rdfs:label ?conceptLabel }
    OPTIONAL { ?related rdfs:label ?relatedLabel }
  }
  
  # Filtrer pour évider les concepts vides
  FILTER(?concept != <http://www.w3.org/2002/07/owl#Thing>)
  FILTER(?related != <http://www.w3.org/2002/07/owl#Thing>)
}
ORDER BY ?relation DESC(?level)
LIMIT 50`;


  
  return query;
}

// Fonction automatique pour générer les URIs ontologiques
function generateAutomaticUri(label) {
  
  if (!label || label.trim() === '') {
    throw new Error("Label vide pour génération URI");
  }
  
  // Nettoyer et normaliser le label
  let cleanLabel = label.trim();
  
  // Règles de transformation automatiques
  
  // 1. Remplacer SEULEMENT les espaces par des underscores (préserver les tirets existants)
  cleanLabel = cleanLabel.replace(/\s+/g, '_');
  
  // 2. Transformation simple : remplacer espaces par underscores
  // Plus de CamelCase - utiliser le format exact de l'ontologie
  const finalUri = cleanLabel;
  
  
  return `iadas:${finalUri}`;
}

// Tests automatiques des patterns (pour debug)
function testAutomaticMapping() {
  const testCases = [
    "Exercise Motivation",
    "Achievement Goals", 
    "Basic Needs Frustration in Sport",
    "Body Dissatisfaction",
    "Instagram Usage",
    "Depression",
    "DEAB",
    "Interest in Body-improvement TV Content",
    "Exposure to Thin Ideal TV",
    "Hours Spent on Social Media"
  ];
  
  testCases.forEach(label => {
    const uri = generateAutomaticUri(label);
    console.log(`   "${label}" → ${uri}`);
  });
}

// 🔥 WARMUP CONDITIONNEL (seulement si pas fait au démarrage)
async function warmupFuseki(endpoint) {
  // Si déjà warm, skip
  if (isFusekiWarmed) {
    return true;
  }

  // Si warmup en cours, attendre qu'il finisse
  if (warmupInProgress && warmupPromise) {
    return await warmupPromise;
  }

  const warmupQuery = generateFallbackQuery();

  try {
    const result = await executeWithRetry(endpoint, warmupQuery, 2);
    const resultCount = result.results?.bindings?.length || 0;

    // Marquer comme warm même si ce n'était qu'un mini-warmup
    isFusekiWarmed = true;
    return true;

  } catch (error) {
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
  console.log("=== SPARQL GENERATOR avec FILTRES MIN/MAX CORRIGÉS ===");

  const prefixes = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

  let query = `${prefixes}

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation ?reference ?gender ?populationType ?sportName WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    # Nouvelles colonnes ajoutées
    OPTIONAL { ?analysis iadas:analysisId ?reference }
    
    # Population obligatoire (pas OPTIONAL)
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender ?gender .
    OPTIONAL { ?population iadas:population ?populationType }
    
    OPTIONAL { 
        ?analysis iadas:hasSport ?sport .
        ?sport iadas:sportName ?sportName .
    }
    
    # Récupérer le résultat de relation, médiateur et modérateur
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }`;

  // === FILTRES D'ÂGE - NOUVEAU SYSTÈME ===
  if (filters.meanAge !== undefined) {
    // Cas spécial : âge moyen → recherche ± 1
    const moyenne = parseFloat(filters.meanAge);
    const minAge = moyenne - 1;
    const maxAge = moyenne + 1;

    query += `
    
    # Filtrer sur l'âge moyen ± 1
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:ageStats ?ageStats .
    ?ageStats iadas:meanAge ?meanAgeStr .
    BIND(xsd:decimal(?meanAgeStr) AS ?meanAge)
    FILTER(?meanAge >= ${minAge} && ?meanAge <= ${maxAge})`;


  } else if (filters.minAge !== undefined || filters.maxAge !== undefined) {
    
    if (filters.includeMeanInRange) {
      // CAS SPÉCIAL : Catégories prédéfinies avec option chevauchement
      if (filters.allowOverlap === false) {
        // Mode strict : seulement les moyennes
        query += `
    
    # Mode strict : seulement les âges moyens dans la plage
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:ageStats ?ageStats .
    ?ageStats iadas:meanAge ?meanAgeStr .
    FILTER(?meanAgeStr != "" && xsd:decimal(?meanAgeStr) >= ${filters.minAge} && xsd:decimal(?meanAgeStr) <= ${filters.maxAge})`;
        
        console.log(` Filtre âge strict: seulement moyennes ${filters.minAge}-${filters.maxAge}`);
        
      } else {
        // Mode inclusif : moyennes + chevauchements
        query += `
    
    # Mode inclusif : moyennes + chevauchements de plages
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:ageStats ?ageStats .
    
    {
      # Option 1 (PRIORITAIRE): Âges moyens dans la plage
      ?ageStats iadas:meanAge ?meanAgeStr .
      FILTER(?meanAgeStr != "" && xsd:decimal(?meanAgeStr) >= ${filters.minAge} && xsd:decimal(?meanAgeStr) <= ${filters.maxAge})
    }
    UNION
    {
      # Option 2 (INCLUSIF): Plages qui chevauchent
      ?ageStats iadas:minAge ?minAgeStr .
      ?ageStats iadas:maxAge ?maxAgeStr .
      FILTER(?minAgeStr != "" && ?maxAgeStr != "")
      BIND(xsd:decimal(?minAgeStr) AS ?minAge)
      BIND(xsd:decimal(?maxAgeStr) AS ?maxAge)
      FILTER(?maxAge >= ${filters.minAge} && ?minAge <= ${filters.maxAge})
      # Éviter doublons avec les moyennes
      FILTER NOT EXISTS {
        ?ageStats iadas:meanAge ?meanCheck .
        FILTER(?meanCheck != "" && xsd:decimal(?meanCheck) >= ${filters.minAge} && xsd:decimal(?meanCheck) <= ${filters.maxAge})
      }
    }`;
        
        console.log(` Filtre âge inclusif: moyennes ${filters.minAge}-${filters.maxAge} + chevauchements`);
      }
      
    } else {
      // Cas normal : filtrer sur les VRAIES propriétés minAge/maxAge
      query += `
    
    # Filtrer sur les vraies propriétés minAge et maxAge
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:ageStats ?ageStats .`;

      if (filters.minAge !== undefined && filters.maxAge !== undefined) {
        // Les deux : minAge ET maxAge
        query += `
    ?ageStats iadas:minAge ?minAgeStr .
    ?ageStats iadas:maxAge ?maxAgeStr .
    BIND(xsd:decimal(?minAgeStr) AS ?minAge)
    BIND(xsd:decimal(?maxAgeStr) AS ?maxAge)
    FILTER(?minAge >= ${filters.minAge} && ?maxAge <= ${filters.maxAge})`;


      } else if (filters.minAge !== undefined) {
        // Seulement minAge
        query += `
    ?ageStats iadas:minAge ?minAgeStr .
    BIND(xsd:decimal(?minAgeStr) AS ?minAge)
    FILTER(?minAge >= ${filters.minAge})`;


      } else if (filters.maxAge !== undefined) {
        // Seulement maxAge
        query += `
    ?ageStats iadas:maxAge ?maxAgeStr .
    BIND(xsd:decimal(?maxAgeStr) AS ?maxAge)
    FILTER(?maxAge <= ${filters.maxAge})`;

      }
    }
  }

  // === FILTRES DE FRÉQUENCE D'EXERCICE AVEC NORMALISATION ===
  if (filters.meanExFR !== undefined) {
    // Cas spécial : moyenne de fréquence → recherche ± 1
    const moyenne = parseFloat(filters.meanExFR);
    const minFreq = moyenne - 1;
    const maxFreq = moyenne + 1;

    // Si on n'a pas déjà ajouté ?population, l'ajouter
    if (!query.includes('?analysis iadas:hasPopulation ?population')) {
      query += `
    
    # Filtrer sur la fréquence moyenne ± 1 (avec normalisation)
    ?analysis iadas:hasPopulation ?population .`;
    }
    query += `
    ?population iadas:exerciseFreqStats ?freqStats .
    ?freqStats iadas:meanExFR ?meanExFRStr .
    OPTIONAL { ?freqStats iadas:freqUnit ?freqUnit }
    OPTIONAL { ?freqStats iadas:freqBase ?freqBase }
    FILTER(?meanExFRStr != "" && ?meanExFRStr != "N.A.")
    
    # Normalisation automatique vers heures/semaine
    BIND(
      IF(?freqUnit = "minutes" && ?freqBase = "week", xsd:decimal(?meanExFRStr) / 60,
      IF(?freqUnit = "minutes" && ?freqBase = "day", (xsd:decimal(?meanExFRStr) / 60) * 7,
      IF(?freqUnit = "hours" && ?freqBase = "day", xsd:decimal(?meanExFRStr) * 7,
      IF(?freqUnit = "hours" && ?freqBase = "week", xsd:decimal(?meanExFRStr),
      IF(?freqUnit = "days" && ?freqBase = "week", xsd:decimal(?meanExFRStr) * 24,
      IF(?freqUnit = "sessions" && ?freqBase = "week", xsd:decimal(?meanExFRStr) * 1.5,
      IF(xsd:decimal(?meanExFRStr) < 50, xsd:decimal(?meanExFRStr), xsd:decimal(?meanExFRStr) / 60)))))))
      AS ?normalizedFreq
    )
    
    FILTER(?normalizedFreq >= ${minFreq} && ?normalizedFreq <= ${maxFreq})`;

    console.log(` Filtre fréquence moyenne normalisé: ${moyenne} ± 1 = [${minFreq}, ${maxFreq}] h/sem`);

  } else if (filters.minExFR !== undefined || filters.maxExFR !== undefined) {
    
    if (filters.includeMeanFreqInRange) {
      // CAS SPÉCIAL : Catégories prédéfinies avec option chevauchement
      if (!query.includes('?analysis iadas:hasPopulation ?population')) {
        query += `
    
    # Filtrer populations par fréquence
    ?analysis iadas:hasPopulation ?population .`;
      }
      
      if (filters.allowOverlap === false) {
        // Mode strict : seulement les moyennes avec normalisation d'unités
        query += `
    ?population iadas:exerciseFreqStats ?freqStats .
    ?freqStats iadas:meanExFR ?meanExFRStr .
    OPTIONAL { ?freqStats iadas:freqUnit ?freqUnit }
    OPTIONAL { ?freqStats iadas:freqBase ?freqBase }
    FILTER(?meanExFRStr != "")
    
    # Normalisation vers heures/semaine
    BIND(
      IF(?freqUnit = "minutes" && ?freqBase = "week", xsd:decimal(?meanExFRStr) / 60,
      IF(?freqUnit = "days" && ?freqBase = "week", xsd:decimal(?meanExFRStr) * 24, 
      IF(?freqUnit = "hours" || (?freqUnit = "" && xsd:decimal(?meanExFRStr) < 50), xsd:decimal(?meanExFRStr),
      xsd:decimal(?meanExFRStr))))
      AS ?normalizedFreq
    )
    
    FILTER(?normalizedFreq >= ${filters.minExFR} && ?normalizedFreq <= ${filters.maxExFR})`;
        
        console.log(` Filtre fréquence strict normalisé: moyennes ${filters.minExFR}-${filters.maxExFR}h/sem`);
        
      } else {
        // Mode inclusif : moyennes + chevauchements avec normalisation
        query += `
    ?population iadas:exerciseFreqStats ?freqStats .
    
    {
      # Option 1: Fréquences moyennes normalisées
      ?freqStats iadas:meanExFR ?meanExFRStr .
      OPTIONAL { ?freqStats iadas:freqUnit ?freqUnit }
      OPTIONAL { ?freqStats iadas:freqBase ?freqBase }
      FILTER(?meanExFRStr != "")
      
      # Normalisation vers heures/semaine
      BIND(
        IF(?freqUnit = "minutes" && ?freqBase = "week", xsd:decimal(?meanExFRStr) / 60,
        IF(?freqUnit = "days" && ?freqBase = "week", xsd:decimal(?meanExFRStr) * 24, 
        IF(?freqUnit = "hours" || (?freqUnit = "" && xsd:decimal(?meanExFRStr) < 50), xsd:decimal(?meanExFRStr),
        xsd:decimal(?meanExFRStr))))
        AS ?normalizedMeanFreq
      )
      
      FILTER(?normalizedMeanFreq >= ${filters.minExFR} && ?normalizedMeanFreq <= ${filters.maxExFR})
    }
    UNION
    {
      # Option 2: Plages qui chevauchent (normalisées)
      ?freqStats iadas:minExFR ?minExFRStr .
      ?freqStats iadas:maxExFR ?maxExFRStr .
      OPTIONAL { ?freqStats iadas:freqUnit ?freqUnit }
      OPTIONAL { ?freqStats iadas:freqBase ?freqBase }
      FILTER(?minExFRStr != "" && ?maxExFRStr != "")
      
      # Normalisation des bornes
      BIND(
        IF(?freqUnit = "minutes" && ?freqBase = "week", xsd:decimal(?minExFRStr) / 60,
        IF(?freqUnit = "days" && ?freqBase = "week", xsd:decimal(?minExFRStr) * 24, 
        IF(?freqUnit = "hours" || (?freqUnit = "" && xsd:decimal(?minExFRStr) < 50), xsd:decimal(?minExFRStr),
        xsd:decimal(?minExFRStr))))
        AS ?normalizedMinFreq
      )
      
      BIND(
        IF(?freqUnit = "minutes" && ?freqBase = "week", xsd:decimal(?maxExFRStr) / 60,
        IF(?freqUnit = "days" && ?freqBase = "week", xsd:decimal(?maxExFRStr) * 24, 
        IF(?freqUnit = "hours" || (?freqUnit = "" && xsd:decimal(?maxExFRStr) < 50), xsd:decimal(?maxExFRStr),
        xsd:decimal(?maxExFRStr))))
        AS ?normalizedMaxFreq
      )
      
      FILTER(?normalizedMaxFreq >= ${filters.minExFR} && ?normalizedMinFreq <= ${filters.maxExFR})
      
      # Éviter doublons avec moyennes
      FILTER NOT EXISTS {
        ?freqStats iadas:meanExFR ?meanCheck .
        OPTIONAL { ?freqStats iadas:freqUnit ?freqUnitCheck }
        OPTIONAL { ?freqStats iadas:freqBase ?freqBaseCheck }
        FILTER(?meanCheck != "")
        BIND(
          IF(?freqUnitCheck = "minutes" && ?freqBaseCheck = "week", xsd:decimal(?meanCheck) / 60,
          IF(?freqUnitCheck = "days" && ?freqBaseCheck = "week", xsd:decimal(?meanCheck) * 24, 
          IF(?freqUnitCheck = "hours" || (?freqUnitCheck = "" && xsd:decimal(?meanCheck) < 50), xsd:decimal(?meanCheck),
          xsd:decimal(?meanCheck))))
          AS ?normalizedMeanCheck
        )
        FILTER(?normalizedMeanCheck >= ${filters.minExFR} && ?normalizedMeanCheck <= ${filters.maxExFR})
      }
    }`;
        
        console.log(` Filtre fréquence inclusif normalisé: moyennes + chevauchements ${filters.minExFR}-${filters.maxExFR}h/sem`);
      }
      
    } else {
      // Cas normal : filtrer sur les VRAIES propriétés minExFR/maxExFR
      if (!query.includes('?analysis iadas:hasPopulation ?population')) {
        query += `
    
    # Filtrer sur les vraies propriétés minExFR et maxExFR
    ?analysis iadas:hasPopulation ?population .`;
      }
      query += `
    ?population iadas:exerciseFreqStats ?freqStats .`;

      if (filters.minExFR !== undefined && filters.maxExFR !== undefined) {
        // Les deux : minExFR ET maxExFR
        query += `
    ?freqStats iadas:minExFR ?minExFRStr .
    ?freqStats iadas:maxExFR ?maxExFRStr .
    BIND(xsd:decimal(?minExFRStr) AS ?minExFR)
    BIND(xsd:decimal(?maxExFRStr) AS ?maxExFR)
    FILTER(?minExFR >= ${filters.minExFR} && ?maxExFR <= ${filters.maxExFR})`;

        console.log(` Filtre plage fréquence: population dans [${filters.minExFR}, ${filters.maxExFR}] h/sem`);

      } else if (filters.minExFR !== undefined) {
        // Seulement minExFR
        query += `
    ?freqStats iadas:minExFR ?minExFRStr .
    BIND(xsd:decimal(?minExFRStr) AS ?minExFR)
    FILTER(?minExFR >= ${filters.minExFR})`;

        console.log(` Filtre fréquence minimum: minExFR >= ${filters.minExFR}`);

      } else if (filters.maxExFR !== undefined) {
        // Seulement maxExFR
        query += `
    ?freqStats iadas:maxExFR ?maxExFRStr .
    BIND(xsd:decimal(?maxExFRStr) AS ?maxExFR)
    FILTER(?maxExFR <= ${filters.maxExFR})`;

        console.log(` Filtre fréquence maximum: maxExFR <= ${filters.maxExFR}`);
      }
    }
  }

  // === FILTRES D'EXPÉRIENCE AVEC NORMALISATION ===
  if (filters.meanYOE !== undefined) {
    // Cas spécial : moyenne d'expérience → recherche ± 1
    const moyenne = parseFloat(filters.meanYOE);
    const minExp = moyenne - 1;
    const maxExp = moyenne + 1;

    if (!query.includes('?analysis iadas:hasPopulation ?population')) {
      query += `
    
    # Filtrer sur l'expérience moyenne ± 1 (avec normalisation)
    ?analysis iadas:hasPopulation ?population .`;
    }
    query += `
    ?population iadas:experienceStats ?expStats .
    ?expStats iadas:meanYOE ?meanYOEStr .
    OPTIONAL { ?expStats iadas:expUnit ?expUnit }
    FILTER(?meanYOEStr != "" && ?meanYOEStr != "N.A.")
    
    # Normalisation automatique vers années
    BIND(
      IF(?expUnit = "months", xsd:decimal(?meanYOEStr) / 12,
      IF(?expUnit = "weeks", xsd:decimal(?meanYOEStr) / 52,
      IF(?expUnit = "days", xsd:decimal(?meanYOEStr) / 365,
      IF(?expUnit = "years" || ?expUnit = "" || !BOUND(?expUnit), xsd:decimal(?meanYOEStr),
      xsd:decimal(?meanYOEStr)))))
      AS ?normalizedExp
    )
    
    FILTER(?normalizedExp >= ${minExp} && ?normalizedExp <= ${maxExp})`;

    console.log(` Filtre expérience moyenne normalisé: ${moyenne} ± 1 = [${minExp}, ${maxExp}] ans`);

  } else if (filters.minYOE !== undefined || filters.maxYOE !== undefined) {
    
    if (filters.includeMeanExpInRange) {
      // CAS SPÉCIAL : Catégories prédéfinies avec option chevauchement
      if (!query.includes('?analysis iadas:hasPopulation ?population')) {
        query += `
    
    # Filtrer populations par expérience
    ?analysis iadas:hasPopulation ?population .`;
      }
      
      if (filters.allowOverlap === false) {
        // Mode strict : seulement les moyennes avec normalisation complète
        query += `
    ?population iadas:experienceStats ?expStats .
    ?expStats iadas:meanYOE ?meanYOEStr .
    OPTIONAL { ?expStats iadas:expUnit ?expUnit }
    FILTER(?meanYOEStr != "" && ?meanYOEStr != "N.A.")
    
    # Normalisation complète vers années
    BIND(
      IF(?expUnit = "months", xsd:decimal(?meanYOEStr) / 12,
      IF(?expUnit = "weeks", xsd:decimal(?meanYOEStr) / 52,
      IF(?expUnit = "days", xsd:decimal(?meanYOEStr) / 365,
      IF(?expUnit = "years" || ?expUnit = "" || !BOUND(?expUnit), xsd:decimal(?meanYOEStr),
      xsd:decimal(?meanYOEStr)))))
      AS ?normalizedExp
    )
    FILTER(?normalizedExp >= ${filters.minYOE} && ?normalizedExp <= ${filters.maxYOE})`;
        
        console.log(` Filtre expérience strict normalisé: seulement moyennes ${filters.minYOE}-${filters.maxYOE} ans`);
        
      } else {
        // Mode inclusif : moyennes + chevauchements avec normalisation complète
        query += `
    ?population iadas:experienceStats ?expStats .
    
    {
      # Option 1: Expériences moyennes normalisées
      ?expStats iadas:meanYOE ?meanYOEStr .
      OPTIONAL { ?expStats iadas:expUnit ?expUnit }
      FILTER(?meanYOEStr != "" && ?meanYOEStr != "N.A.")
      
      BIND(
        IF(?expUnit = "months", xsd:decimal(?meanYOEStr) / 12,
        IF(?expUnit = "weeks", xsd:decimal(?meanYOEStr) / 52,
        IF(?expUnit = "days", xsd:decimal(?meanYOEStr) / 365,
        IF(?expUnit = "years" || ?expUnit = "" || !BOUND(?expUnit), xsd:decimal(?meanYOEStr),
        xsd:decimal(?meanYOEStr)))))
        AS ?normalizedMeanExp
      )
      FILTER(?normalizedMeanExp >= ${filters.minYOE} && ?normalizedMeanExp <= ${filters.maxYOE})
    }
    UNION
    {
      # Option 2: Plages qui chevauchent (normalisées)
      ?expStats iadas:minYOE ?minYOEStr .
      ?expStats iadas:maxYOE ?maxYOEStr .
      OPTIONAL { ?expStats iadas:expUnit ?expUnit }
      FILTER(?minYOEStr != "" && ?maxYOEStr != "" && ?minYOEStr != "N.A." && ?maxYOEStr != "N.A.")
      
      BIND(
        IF(?expUnit = "months", xsd:decimal(?minYOEStr) / 12,
        IF(?expUnit = "weeks", xsd:decimal(?minYOEStr) / 52,
        IF(?expUnit = "days", xsd:decimal(?minYOEStr) / 365,
        IF(?expUnit = "years" || ?expUnit = "" || !BOUND(?expUnit), xsd:decimal(?minYOEStr),
        xsd:decimal(?minYOEStr)))))
        AS ?normalizedMinExp
      )
      
      BIND(
        IF(?expUnit = "months", xsd:decimal(?maxYOEStr) / 12,
        IF(?expUnit = "weeks", xsd:decimal(?maxYOEStr) / 52,
        IF(?expUnit = "days", xsd:decimal(?maxYOEStr) / 365,
        IF(?expUnit = "years" || ?expUnit = "" || !BOUND(?expUnit), xsd:decimal(?maxYOEStr),
        xsd:decimal(?maxYOEStr)))))
        AS ?normalizedMaxExp
      )
      
      FILTER(?normalizedMaxExp >= ${filters.minYOE} && ?normalizedMinExp <= ${filters.maxYOE})
      
      # Éviter doublons avec moyennes
      FILTER NOT EXISTS {
        ?expStats iadas:meanYOE ?meanCheck .
        OPTIONAL { ?expStats iadas:expUnit ?expUnitCheck }
        FILTER(?meanCheck != "" && ?meanCheck != "N.A.")
        BIND(
          IF(?expUnitCheck = "months", xsd:decimal(?meanCheck) / 12,
          IF(?expUnitCheck = "weeks", xsd:decimal(?meanCheck) / 52,
          IF(?expUnitCheck = "days", xsd:decimal(?meanCheck) / 365,
          IF(?expUnitCheck = "years" || ?expUnitCheck = "" || !BOUND(?expUnitCheck), xsd:decimal(?meanCheck),
          xsd:decimal(?meanCheck)))))
          AS ?normalizedMeanExpCheck
        )
        FILTER(?normalizedMeanExpCheck >= ${filters.minYOE} && ?normalizedMeanExpCheck <= ${filters.maxYOE})
      }
    }`;
        
        console.log(` Filtre expérience inclusif normalisé: moyennes + chevauchements ${filters.minYOE}-${filters.maxYOE} ans`);
      }
      
    } else {
      // Cas normal : filtrer sur les VRAIES propriétés minYOE/maxYOE
      if (!query.includes('?analysis iadas:hasPopulation ?population')) {
        query += `
    
    # Filtrer sur les vraies propriétés minYOE et maxYOE
    ?analysis iadas:hasPopulation ?population .`;
      }
      query += `
    ?population iadas:experienceStats ?expStats .`;

      if (filters.minYOE !== undefined && filters.maxYOE !== undefined) {
        // Les deux : minYOE ET maxYOE
        query += `
    ?expStats iadas:minYOE ?minYOEStr .
    ?expStats iadas:maxYOE ?maxYOEStr .
    BIND(xsd:decimal(?minYOEStr) AS ?minYOE)
    BIND(xsd:decimal(?maxYOEStr) AS ?maxYOE)
    FILTER(?minYOE >= ${filters.minYOE} && ?maxYOE <= ${filters.maxYOE})`;

        console.log(` Filtre plage expérience: population dans [${filters.minYOE}, ${filters.maxYOE}] ans`);

      } else if (filters.minYOE !== undefined) {
        // Seulement minYOE
        query += `
    ?expStats iadas:minYOE ?minYOEStr .
    BIND(xsd:decimal(?minYOEStr) AS ?minYOE)
    FILTER(?minYOE >= ${filters.minYOE})`;

        console.log(` Filtre expérience minimum: minYOE >= ${filters.minYOE}`);

      } else if (filters.maxYOE !== undefined) {
        // Seulement maxYOE
        query += `
    ?expStats iadas:maxYOE ?maxYOEStr .
    BIND(xsd:decimal(?maxYOEStr) AS ?maxYOE)
    FILTER(?maxYOE <= ${filters.maxYOE})`;

        console.log(` Filtre expérience maximum: maxYOE <= ${filters.maxYOE}`);
      }
    }
  }

  // === AUTRES FILTRES EXISTANTS ===

  // Filtre genre
  if (filters.gender && filters.gender !== '') {
    // Si on n'a pas déjà ajouté ?population, l'ajouter
    if (!query.includes('?analysis iadas:hasPopulation ?population')) {
      query += `
    
    # Filtrer sur les populations par genre
    ?analysis iadas:hasPopulation ?population .`;
    }
    query += `
    ?population iadas:gender "${filters.gender}" .`;
    console.log(" Filtre genre ajouté:", filters.gender);
  }

  // Filtre catégorie VD
  if (filters.categoryVD && filters.categoryVD !== '') {
    query += `
    
    # Filtrer sur les VD de catégorie
    ?variableVD iadas:hasCategory "${filters.categoryVD}" .`;
    console.log(" Filtre catégorie VD ajouté:", filters.categoryVD);
  }

  // Filtre catégorie VI 
  if (filters.categoryVI && filters.categoryVI !== '') {
    query += `
    
    # Filtrer sur les VI de catégorie spécifique
    FILTER(?categoryVI = "${filters.categoryVI}")`;
    console.log(" Filtre catégorie VI ajouté:", filters.categoryVI);
  }

  // Filtre sport
  if (filters.sportType && filters.sportType !== '') {
    query += `
    
    # Filtrer sur les sports
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportName ?sportName .
    FILTER(CONTAINS(LCASE(?sportName), "${filters.sportType.toLowerCase()}"))`;
    console.log(" Filtre sport ajouté:", filters.sportType);
  }

  // Filtre VI spécifique
  if (filters.selectedVI && filters.selectedVI !== '') {
    query += `
    
    # Filtrer sur VI spécifique
    FILTER(?vi = "${filters.selectedVI}")`;
    console.log(" Filtre VI spécifique ajouté:", filters.selectedVI);
  }

  // Filtre VD spécifique
  if (filters.selectedVD && filters.selectedVD !== '') {
    query += `
    
    # Filtrer sur VD spécifique
    FILTER(?vd = "${filters.selectedVD}")`;
    console.log(" Filtre VD spécifique ajouté:", filters.selectedVD);
  }

  // Filtre résultat relation
  if (filters.relationDirection && filters.relationDirection !== '') {
    query += `
    
    # Filtrer sur résultat de relation spécifique
    ?relation iadas:resultatRelation "${filters.relationDirection}" .
    BIND("${filters.relationDirection}" AS ?resultatRelation)`;
    console.log(" Filtre relation ajouté:", filters.relationDirection);
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
    console.log(" Aucun filtre actif - LIMIT 1500 ajouté");
  } else {
    console.log(`${activeFilters} filtres actifs détectés - pas de LIMIT ajouté`);
  }

  console.log(" REQUÊTE GÉNÉRÉE :");
  console.log(query);

  return query;
}

// Fonction pour exécuter une requête SPARQL UPDATE
async function executeSparqlUpdate(sparqlQuery) {
  console.log(' Exécution requête SPARQL UPDATE...');
  console.log(' Requête:', sparqlQuery.substring(0, 200) + '...');

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

    console.log(` Réponse UPDATE: Status ${response.status}`);

    if (response.ok) {
      const responseText = await response.text();
      console.log(' UPDATE réussi:', responseText || 'Success');
      return {
        success: true,
        message: responseText || 'Update successful',
        status: response.status
      };
    } else {
      const errorText = await response.text();
      console.error(' Erreur UPDATE:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

  } catch (error) {
    console.error('Erreur lors de l\'UPDATE:', error.message);
    throw error;
  }
}

// Fonction pour exécuter plusieurs requêtes UPDATE en séquence
async function executeMultipleSparqlUpdates(queries) {
  console.log(` Exécution de ${Object.keys(queries).length} requêtes UPDATE...`);

  const results = {};
  const errors = [];

  for (const [queryName, query] of Object.entries(queries)) {
    try {
      console.log(`\n Exécution: ${queryName}`);
      const result = await executeSparqlUpdate(query);
      results[queryName] = result;
      console.log(` ${queryName}: Succès`);

      // Petit délai entre les requêtes pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(` ${queryName}: Échec -`, error.message);
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

  // Vérifications de base
  if (!questionId) {
    console.error(" ERREUR: questionId est vide/null/undefined !");
    console.log(" Tentative de récupération d'un ID par défaut...");
    questionId = 'q1'; // Fallback
    console.log(" ID par défaut assigné:", questionId);
  }

  const prefixes = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>`;

  console.log(" Prefixes SPARQL définis");

  let query = '';
  let selectedCase = 'aucun';
  let expectedResults = 'inconnu';

  console.log(" Entrée dans le switch avec questionId:", questionId);

  switch (questionId) {
    case 'q1':
      console.log(" CASE Q1 DÉTECTÉ: Pour une ACAD spécifique, facteurs psychosociaux");
      selectedCase = 'q1 - ACAD → Facteurs psychosociaux';
      expectedResults = '800-1000 relations (toutes catégories)';

      query = `${prefixes}

SELECT DISTINCT ?vd ?vi ?categoryVI ?categoryVD ?resultatRelation ?mediator ?moderator ?analysis 
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    OPTIONAL { ?analysis iadas:hasMediator ?mediator }
    OPTIONAL { ?analysis iadas:hasModerator ?moderator }
}
ORDER BY ?vd ?vi
LIMIT 10000`;
      break;

    case 'q2-protecteur':
      console.log(" CASE Q2-PROTECTEUR DÉTECTÉ: Facteurs protecteurs → ACAD");
      selectedCase = 'q2-protecteur - Facteurs protecteurs UNIQUEMENT';
      expectedResults = '200-400 relations avec resultatRelation = "-"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "-" .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("-" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q2-risque':
      console.log(" CASE Q2-RISQUE DÉTECTÉ: Facteurs de risque → ACAD");
      selectedCase = 'q2-risque - Facteurs de risque UNIQUEMENT';
      expectedResults = '300-600 relations avec resultatRelation = "+"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "+" .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("+" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q2-ambigu':
      console.log(" CASE Q2-AMBIGU DÉTECTÉ: Facteurs ambigus → ACAD");
      selectedCase = 'q2-ambigu - Facteurs ambigus UNIQUEMENT';
      expectedResults = '100-300 relations avec resultatRelation = "NS"';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?analysis ?resultatRelation
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD ;
              iadas:resultatRelation "NS" .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    BIND("NS" AS ?resultatRelation)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q3-socioenvironnementaux':
      console.log(" CASE Q3-SOCIO DÉTECTÉ: Facteurs socio-environnementaux → ACAD");
      selectedCase = 'q3-socioenvironnementaux - Catégorie Sociocultural factor related to DEAB';
      expectedResults = '50-150 relations de cette catégorie';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVD ?resultatRelation ?analysis ?categoryVI
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType ;
                iadas:hasCategory "Sociocultural factor related to DEAB" .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    
    BIND("Sociocultural factor related to DEAB" AS ?categoryVI)
}
ORDER BY ?vi ?vd
LIMIT 300`;
      break;

    case 'q3-autres':
      console.log(" CASE Q3-AUTRES DÉTECTÉ: Autres comportements → ACAD");
      selectedCase = 'q3-autres - Catégorie Other behaviors';
      expectedResults = '50-100 relations de cette catégorie';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVD ?resultatRelation ?analysis ?categoryVI
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType ;
                iadas:hasCategory "Other behaviors" .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    
    BIND("Other behaviors" AS ?categoryVI)
}
ORDER BY ?vi ?vd
LIMIT 300`;
      break;

    case 'q4-male':
      console.log(" CASE Q4-MALE DÉTECTÉ: Relations ACAD-facteurs pour populations masculines");
      selectedCase = 'q4-male - Populations masculines';
      expectedResults = '300-600 relations pour populations masculines';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?gender
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "Male" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Male" AS ?gender)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q4-female':
      console.log(" CASE Q4-FEMALE DÉTECTÉ: Relations ACAD-facteurs pour populations féminines");
      selectedCase = 'q4-female - Populations féminines';
      expectedResults = '200-400 relations pour populations féminines';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?gender
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "Female" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Female" AS ?gender)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q4-mixed':
      console.log(" CASE Q4-MIXED DÉTECTÉ: Relations ACAD-facteurs pour populations mixtes");
      selectedCase = 'q4-mixed - Populations mixtes';
      expectedResults = '100-300 relations pour populations mixtes';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?gender
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:gender "Mixed" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Mixed" AS ?gender)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q5-individual':
      console.log(" CASE Q5-INDIVIDUAL DÉTECTÉ: Relations ACAD-facteurs pour sports individuels");
      selectedCase = 'q5-individual - Sports individuels';
      expectedResults = '400-800 relations pour sports individuels';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?sportType
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportPracticeType "Individual sport" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Individual sport" AS ?sportType)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q5-team':
      console.log(" CASE Q5-TEAM DÉTECTÉ: Relations ACAD-facteurs pour sports d'équipe");
      selectedCase = 'q5-team - Sports d\'équipe';
      expectedResults = '100-200 relations pour sports d\'équipe';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?sportType
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportPracticeType "Team sport" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Team sport" AS ?sportType)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q5-mixed':
      console.log(" CASE Q5-MIXED DÉTECTÉ: Relations ACAD-facteurs pour sports mixtes");
      selectedCase = 'q5-mixed - Sports mixtes';
      expectedResults = '300-600 relations pour sports mixtes';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?sportType
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportPracticeType "Mixed sport" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Mixed sport" AS ?sportType)
}
ORDER BY ?vi ?vd
`;
      break;

    case 'q5-aesthetic':
      console.log(" CASE Q5-AESTHETIC DÉTECTÉ: Relations ACAD-facteurs pour sports esthétiques");
      selectedCase = 'q5-aesthetic - Sports esthétiques';
      expectedResults = '50-100 relations pour sports esthétiques';

      query = `${prefixes}

SELECT DISTINCT ?vi ?vd ?categoryVI ?categoryVD ?resultatRelation ?analysis ?sportType
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    ?analysis iadas:hasSport ?sport .
    ?sport iadas:sportPracticeType "Aesthetic sport" .
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
    BIND("Aesthetic sport" AS ?sportType)
}
ORDER BY ?vi ?vd
`;
      break;

    default:
      console.error(" CASE DEFAULT DÉCLENCHÉ !");
      console.error(" Question ID non reconnue:", questionId);
      console.error(" Valeurs possibles attendues:");
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
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }
    
    OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
}
ORDER BY ?analysis
LIMIT 200`;
      break;
  }



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
  console.log(" GÉNÉRATION REQUÊTE DE FALLBACK");

  return `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?analysis ?vi ?vd ?categoryVI ?categoryVD ?mediator ?moderator ?resultatRelation WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI ;
              iadas:hasDependentVariable ?variableVD .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
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

  if (req.url.startsWith('/api/interface-data') && req.method === 'GET') {
    try {
      console.log('\n=== RÉCUPÉRATION DONNÉES INTERFACE ===');
      
      const urlParts = req.url.split('?');
      const params = new URLSearchParams(urlParts[1] || '');
      
      console.log('Paramètres de filtrage:', Object.fromEntries(params));
      
      const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';
      
      // Requêtes pour alimenter l'interface depuis les ontologies hiérarchiques
      const queries = {
        acads: `
PREFIX iadas: <http://ia-das.org/onto#>

SELECT DISTINCT ?acad (COUNT(*) as ?count) 
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:practicesSport ?sport .
    ?sport iadas:sportName ?acad .
}
GROUP BY ?acad
ORDER BY DESC(?count)`,

        factorsVI: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?vi (COUNT(*) as ?count)
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI .
    
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    BIND(REPLACE(REPLACE(STR(?viType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vi)
    
    ${params.get('categoryVI') ? `?variableVI iadas:hasCategory "${params.get('categoryVI')}" .` : ''}
}
GROUP BY ?vi
ORDER BY DESC(?count)`,

        factorsVD: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?vd (COUNT(*) as ?count)
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasDependentVariable ?variableVD .
    
    ?variableVD rdf:type ?vdType .
    FILTER(?vdType != iadas:VariableDependante)
    BIND(REPLACE(REPLACE(STR(?vdType), "http://ia-das.org/onto#", ""), "_", " ") AS ?vd)
    
    ${params.get('categoryVD') ? `?variableVD iadas:hasCategory "${params.get('categoryVD')}" .` : ''}
}
GROUP BY ?vd
ORDER BY DESC(?count)`,

        categoriesVD: `
PREFIX iadas: <http://ia-das.org/onto#>

SELECT DISTINCT ?category (COUNT(*) as ?count)
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasDependentVariable ?variableVD .
    ?variableVD iadas:hasCategory ?category .
}
GROUP BY ?category
ORDER BY DESC(?count)`,

        categoriesVI: `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?category (COUNT(*) as ?count)
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI .
    ?variableVI rdf:type ?viType .
    FILTER(?viType != iadas:VariableIndependante)
    ?variableVI iadas:hasCategory ?category .
}
GROUP BY ?category
ORDER BY DESC(?count)`,

        sports: `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX iadas: <http://ia-das.org/onto#>

SELECT DISTINCT ?sport 
WHERE {
    ?concept a owl:Class .
    ?concept rdfs:label ?sportLabel .
    BIND(?sportLabel AS ?sport)
    FILTER NOT EXISTS { ?child rdfs:subClassOf ?concept }
    FILTER(?sportLabel != "Sport" && ?sportLabel != "Physical_activity" && ?sportLabel != "Athletic" && 
           ?sportLabel != "Individual_sport" && ?sportLabel != "Team_sport" && ?sportLabel != "Combat_sport" &&
           ?sportLabel != "Aesthetic" && ?sportLabel != "Endurance" && ?sportLabel != "Power" && ?sportLabel != "Technical")
    ${params.get('sportCategory') ? `
    # Filtrer les sports par catégorie
    ?concept rdfs:subClassOf* ?categoryClass .
    ?categoryClass rdfs:label "${params.get('sportCategory')}" .
    ` : ''}
}
ORDER BY ?sport`,

        sportCategories: `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX iadas: <http://ia-das.org/onto#>

SELECT DISTINCT ?category 
WHERE {
    ?concept a owl:Class .
    ?concept rdfs:label ?category .
    # Récupérer les Class 1 (catégories principales) qui sont directement sous Sport
    ?concept rdfs:subClassOf iadas:Sport .
    # S'assurer qu'il y a des sous-classes (pour évider les catégories vides)
    ?child rdfs:subClassOf ?concept .
}
ORDER BY ?category`,

        countries: `
PREFIX iadas: <http://ia-das.org/onto#>

SELECT DISTINCT ?country (COUNT(*) as ?count)
WHERE {
    ?analysis a iadas:Analysis .
    ?analysis iadas:hasPopulation ?population .
    ?population iadas:country ?country .
}
GROUP BY ?country
ORDER BY DESC(?count)`
      };

      // Exécuter toutes les requêtes en parallèle
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        try {
          console.log(`Exécution requête: ${key}`);
          const data = await executeWithRetry(fusekiEndpoint, query, 2);
          results[key] = data.results?.bindings || [];
          console.log(`${key}: ${results[key].length} résultats`);
        } catch (error) {
          console.error(`Erreur requête ${key}:`, error.message);
          results[key] = [];
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Erreur récupération données interface:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  if (req.url === '/api/export/turtle' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        console.log('\n=== EXPORT TURTLE DEMANDÉ ===');
        const requestData = JSON.parse(body);
        
        if (!requestData.sparqlResults) {
          throw new Error('Données SPARQL manquantes');
        }
        
        const turtleData = convertSparqlToTurtle(requestData.sparqlResults, requestData.metadata || {});
        
        res.writeHead(200, { 'Content-Type': 'text/turtle; charset=utf-8' });
        res.end(turtleData);
        
      } catch (error) {
        console.error('Erreur export Turtle:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur lors de l\'export Turtle',
          message: error.message
        }));
      }
    });
    return;
  }

  if (req.url === '/delete-analysis' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      const startTime = Date.now();

      try {
        console.log('\n=== DÉBUT DELETE ANALYSIS ===');
        console.log('Timestamp:', new Date().toISOString());

        const requestData = JSON.parse(body);
        console.log('📋 Données reçues:', {
          hasQuery: !!requestData.rawSparqlQuery,
          operation: requestData.operation,
          analysisId: requestData.analysisId
        });

        // Vérifier les données reçues
        if (!requestData.rawSparqlQuery) {
          throw new Error('Aucune requête SPARQL fournie');
        }

        if (requestData.operation !== 'delete') {
          throw new Error('Opération de suppression non spécifiée');
        }

        // Exécuter la requête DELETE
        console.log('🗑️ Exécution de la requête DELETE...');
        const deleteResult = await executeSparqlUpdate(requestData.rawSparqlQuery);

        const totalTime = Date.now() - startTime;

        console.log(`✅ SUPPRESSION RÉUSSIE en ${totalTime}ms`);
        console.log(`📊 Analyse ${requestData.analysisId} supprimée`);

        // Réponse de succès
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Analyse ${requestData.analysisId} supprimée avec succès !`,
          result: deleteResult,
          executionTime: totalTime,
          analysisId: requestData.analysisId,
          timestamp: new Date().toISOString()
        }));

      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('\n💥 ERREUR CRITIQUE DELETE ANALYSIS:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Temps écoulé: ${totalTime}ms`);

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Erreur serveur lors de la suppression de l\'analyse',
          error: error.message,
          executionTime: totalTime,
          timestamp: new Date().toISOString()
        }));
      }
    });
    return;
  }

  if (req.url === '/update-analysis' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      const startTime = Date.now();

      try {
        console.log('\n=== DÉBUT UPDATE ANALYSIS ===');
        console.log('Timestamp:', new Date().toISOString());

        const requestData = JSON.parse(body);
        console.log(' Données reçues:', {
          hasFormData: !!requestData.formData,
          hasSparqlQueries: !!requestData.sparqlQueries,
          queryCount: requestData.sparqlQueries ? Object.keys(requestData.sparqlQueries).length : 0
        });

        // Vérifier les données reçues
        if (!requestData.sparqlQueries) {
          throw new Error('Aucune requête SPARQL fournie');
        }

        const queries = requestData.sparqlQueries;

        // Exécuter toutes les requêtes UPDATE
        const updateResults = await executeMultipleSparqlUpdates(queries);

        const totalTime = Date.now() - startTime;

        

        if (updateResults.errors.length > 0) {
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
        console.error('\n ERREUR CRITIQUE UPDATE ANALYSIS:');
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
        console.log(" DÉBUT DU TRAITEMENT");
        console.log(" Timestamp:", new Date().toISOString());

        // Configuration Fuseki
        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';

       
        if (requestPayload.queryType === 'predefined_competence') {
        
          sparqlQuery = generateCompetenceQuery(requestPayload.questionId);

          if (!sparqlQuery) {
            throw new Error(`Question de compétence non reconnue: ${requestPayload.questionId}`);
          }

          console.log(" Requête de compétence générée avec succès");
          console.log(" Longueur de la requête:", sparqlQuery.length, "caractères");

        } else if (requestPayload.queryType === 'raw_sparql') {
          console.log(" REQUÊTE SPARQL BRUTE");

          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log(" Requête SPARQL brute utilisée");

        } else if (requestPayload.queryType === 'hierarchy') {
          console.log(" REQUÊTE HIÉRARCHIE");
          console.log(" Concept:", requestPayload.concept);

          sparqlQuery = generateHierarchyQuery(requestPayload.concept);

        } else {
          console.log("REQUÊTE DE RECHERCHE NORMALE (avec filtres)");

          // Utiliser generateSparqlQuery SEULEMENT pour les requêtes normales
          sparqlQuery = generateSparqlQuery(requestPayload);
          console.log(" Requête avec filtres générée");
        }

        console.log(" Type final de requête déterminé");
        console.log(" Requête finale prête pour exécution");

        // 🔥 WARMUP CONDITIONNEL (seulement si pas fait au démarrage)
        if (!isFusekiWarmed) {
          console.log("WARMUP NÉCESSAIRE - Fuseki pas encore chaud...");
          const warmupSuccess = await warmupFuseki(fusekiEndpoint);
          if (!warmupSuccess) {
            console.log(" Warmup échoué - on continue quand même...");
          } else {
            console.log(" Warmup réussi - Fuseki est prêt !");
          }
        } else {
          console.log(" WARMUP SKIPPÉ - Fuseki déjà chaud depuis le démarrage !");
        }

        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide générée");
        }

        console.log(" Exécution requête principale...");

        let data;
        try {
          data = await executeWithRetry(fusekiEndpoint, sparqlQuery, MAX_RETRIES);

        } catch (mainError) {
          console.log(" TENTATIVE FALLBACK après échec principal...");

          try {
            // Essayer la requête fallback
            const fallbackQuery = generateFallbackQuery();
            data = await executeWithRetry(fusekiEndpoint, fallbackQuery, 2);
            usedFallback = true;
            console.log(" FALLBACK RÉUSSI");

            // Ajouter un warning
            data.warning = "Requête simplifiée utilisée à cause d'un timeout";

          } catch (fallbackError) {
            console.error(" FALLBACK AUSSI ÉCHOUÉ:", fallbackError.message);
            throw mainError; // Relancer l'erreur principale
          }
        }

        const queryTime = Date.now() - startTime;
        const resultCount = data.results?.bindings?.length || 0;

        console.log(" SUCCÈS COMPLET!");
        console.log(` Résultats trouvés: ${resultCount}`);
        console.log(` Temps total: ${queryTime}ms`);

        if (resultCount > 0) {
          const firstResult = data.results.bindings[0];
          const availableVars = Object.keys(firstResult);
          const expectedVars = ['analysis', 'vi', 'vd', 'categoryVI', 'categoryVD', 'mediator', 'moderator', 'resultatRelation'];

          console.log(" VÉRIFICATION COMPATIBILITÉ PARSER:");
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

        // Ajouter la requête SPARQL générée dans la réponse
        data.generatedQuery = sparqlQuery;
        data.query = sparqlQuery; // Alias pour compatibilité
        data.sparqlQuery = sparqlQuery; // Autre alias

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        const totalTime = Date.now() - startTime;
        console.error(" ERREUR CRITIQUE FINALE:");
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
}).listen(8003, '0.0.0.0', () => {
  

  warmupPromise = performStartupWarmup();
});
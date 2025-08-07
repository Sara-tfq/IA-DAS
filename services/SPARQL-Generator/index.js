// SPARQL Generator DYNAMIQUE - construit la requête selon les filtres utilisés
// Plus efficace car évite les OPTIONAL inutiles
const http = require('http');
const fetch = require('node-fetch');

function generateDynamicSparqlQuery(filters) {
  console.log("Generating DYNAMIC SPARQL query based on active filters:", filters);
  
  const prefixes = `
    PREFIX iadas: <http://ia-das.org/onto#>
    PREFIX iadas-data: <http://ia-das.org/data#>
    PREFIX bibo: <http://purl.org/ontology/bibo/>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  `;

  let whereClauses = [];
  let filterConditions = [];
  let selectVars = ['?analysis'];
  
  // Base obligatoire
  whereClauses.push(`?analysis a iadas:Analysis .`);

  // === RELATIONS & VARIABLES (seulement si nécessaires) ===
  let needsRelation = false;
  let needsVI = false;
  let needsVD = false;
  
  // Déterminer si on a besoin des relations/variables
  if (filters.selectedVI || filters.selectedVD || filters.relationDirection || 
      filters.significantRelation !== undefined || filters.resultatRelation) {
    needsRelation = true;
  }
  
  if (filters.selectedVI || filters.factorCategory) {
    needsVI = true;
  }
  
  if (filters.selectedVD || filters.factorCategory) {
    needsVD = true;
  }
  
  // Construire les clauses relation seulement si nécessaires
  if (needsRelation) {
    console.log("Adding relation clauses...");
    whereClauses.push(`OPTIONAL { ?analysis iadas:hasRelation ?relation }`);
    selectVars.push('?relation');
    
    if (needsVI) {
      whereClauses.push(`OPTIONAL { ?relation iadas:hasIndependentVariable ?variableVI }`);
      whereClauses.push(`OPTIONAL { ?variableVI iadas:VI ?vi }`);
      whereClauses.push(`OPTIONAL { ?variableVI iadas:hasVariableConcept ?conceptVI }`);
      selectVars.push('?vi', '?conceptVI');
    }
    
    if (needsVD) {
      whereClauses.push(`OPTIONAL { ?relation iadas:hasDependentVariable ?variableVD }`);
      whereClauses.push(`OPTIONAL { ?variableVD iadas:VD ?vd }`);
      whereClauses.push(`OPTIONAL { ?variableVD iadas:hasVariableConcept ?conceptVD }`);
      selectVars.push('?vd', '?conceptVD');
    }
    
    // Résultat de relation
    whereClauses.push(`OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }`);
    selectVars.push('?resultatRelation');
    
    // Statistiques UNIQUEMENT si explicitement demandées dans les filtres
    // (pour le graphique, on n'en a généralement pas besoin)
    if (filters.includeStatistics) {
      whereClauses.push(`OPTIONAL { ?relation iadas:degreR ?degreR }`);
      whereClauses.push(`OPTIONAL { ?relation iadas:degreP ?degreP }`);
      selectVars.push('?degreR', '?degreP');
    }
  }

  // === MODÉRATEURS/MÉDIATEURS (toujours inclus pour le graphique) ===
  if (needsRelation) {
    console.log("Adding moderator/mediator clauses for graph...");
    whereClauses.push(`OPTIONAL { ?analysis iadas:hasModerator ?moderator }`);
    whereClauses.push(`OPTIONAL { ?analysis iadas:hasMediator ?mediator }`);
    selectVars.push('?moderator', '?mediator');
    
    // Mesures seulement si filtres spécifiques
    if (filters.moderator || filters.mediator) {
      whereClauses.push(`OPTIONAL { ?analysis iadas:moderatorMeasure ?moderatorMeasure }`);
      whereClauses.push(`OPTIONAL { ?analysis iadas:mediatorMeasure ?mediatorMeasure }`);
      selectVars.push('?moderatorMeasure', '?mediatorMeasure');
    }
  }

  // === SPORT (seulement si filtré) ===
  let needsSport = filters.sportType || filters.sportName || filters.sportLevel || filters.sportPracticeType;
  
  if (needsSport) {
    console.log("Adding sport clauses...");
    whereClauses.push(`OPTIONAL { ?analysis iadas:hasSport ?sport }`);
    whereClauses.push(`OPTIONAL { ?sport iadas:sportName ?sportName }`);
    selectVars.push('?sportName');
    
    if (filters.sportLevel || !filters.sportType) {
      whereClauses.push(`OPTIONAL { ?sport iadas:sportLevel ?sportLevel }`);
      selectVars.push('?sportLevel');
    }
    
    if (filters.sportPracticeType) {
      whereClauses.push(`OPTIONAL { ?sport iadas:sportPracticeType ?sportPracticeType }`);
      selectVars.push('?sportPracticeType');
    }
  }

  // === POPULATION (seulement si explicitement filtrée) ===
  let needsPopulation = filters.gender || filters.minAge || filters.maxAge || 
                       filters.minSampleSize || filters.maxSampleSize || 
                       filters.experienceYears || filters.practiceFrequency;
  
  if (needsPopulation) {
    console.log("Adding population clauses (filtered)...");
    whereClauses.push(`OPTIONAL { ?analysis iadas:hasPopulation ?population }`);
    
    // Seulement les propriétés filtrées
    if (filters.gender) {
      whereClauses.push(`OPTIONAL { ?population iadas:gender ?gender }`);
      selectVars.push('?gender');
    }
    
    if (filters.minAge || filters.maxAge) {
      whereClauses.push(`OPTIONAL { ?population iadas:ageStats ?ageStats }`);
      whereClauses.push(`OPTIONAL { ?ageStats iadas:meanAge ?meanAge }`);
      selectVars.push('?meanAge');
    }
    
    if (filters.minSampleSize || filters.maxSampleSize) {
      whereClauses.push(`OPTIONAL { ?population iadas:sampleSize ?sampleSize }`);
      selectVars.push('?sampleSize');
    }
    
    if (filters.experienceYears) {
      whereClauses.push(`OPTIONAL { ?population iadas:experienceStats ?expStats }`);
      whereClauses.push(`OPTIONAL { ?expStats iadas:meanYOE ?meanYOE }`);
      selectVars.push('?meanYOE');
    }
    
    if (filters.practiceFrequency) {
      whereClauses.push(`OPTIONAL { ?population iadas:exerciseFreqStats ?freqStats }`);
      whereClauses.push(`OPTIONAL { ?freqStats iadas:meanExFR ?meanExFR }`);
      selectVars.push('?meanExFR');
    }
  }

  // === ARTICLES (seulement si filtrés) ===
  let needsArticles = filters.publicationYear || filters.country || filters.studyType;
  
  if (needsArticles) {
    console.log("Adding article clauses...");
    whereClauses.push(`OPTIONAL { ?article iadas:hasAnalysis ?analysis }`);
    whereClauses.push(`OPTIONAL { ?article a bibo:AcademicArticle }`);
    
    if (filters.publicationYear) {
      whereClauses.push(`OPTIONAL { ?article dcterms:date ?publicationYear }`);
      selectVars.push('?publicationYear');
    }
    
    if (filters.country) {
      whereClauses.push(`OPTIONAL { ?article iadas:country ?country }`);
      selectVars.push('?country');
    }
    
    if (filters.studyType) {
      whereClauses.push(`OPTIONAL { ?article iadas:studyType ?studyType }`);
      selectVars.push('?studyType');
    }
  }

  // === TYPE D'ANALYSE (seulement si filtré) ===
  if (filters.analysisType) {
    console.log("Adding analysis type clauses...");
    whereClauses.push(`OPTIONAL { ?analysis iadas:typeOfAnalysis ?analysisType }`);
    selectVars.push('?analysisType');
  }

  // === CONSTRUCTION DES FILTRES ===
  
  // Filtres VI/VD
  if (filters.selectedVI) {
    filterConditions.push(`?vi = "${filters.selectedVI}"`);
  }
  
  if (filters.selectedVD) {
    filterConditions.push(`?vd = "${filters.selectedVD}"`);
  }

  // Filtres sport
  if (filters.sportType || filters.sportName) {
    const sportFilter = filters.sportType || filters.sportName;
    filterConditions.push(`CONTAINS(LCASE(?sportName), LCASE("${sportFilter}"))`);
  }
  
  if (filters.sportLevel) {
    filterConditions.push(`LCASE(?sportLevel) = LCASE("${filters.sportLevel}")`);
  }
  
  if (filters.sportPracticeType) {
    filterConditions.push(`LCASE(?sportPracticeType) = LCASE("${filters.sportPracticeType}")`);
  }

  // Filtres population
  if (filters.gender) {
    filterConditions.push(`LCASE(?gender) = LCASE("${filters.gender}")`);
  }
  
  if (filters.minAge) {
    filterConditions.push(`xsd:decimal(?meanAge) >= ${filters.minAge}`);
  }
  
  if (filters.maxAge) {
    filterConditions.push(`xsd:decimal(?meanAge) <= ${filters.maxAge}`);
  }
  
  if (filters.minSampleSize) {
    filterConditions.push(`xsd:integer(?sampleSize) >= ${filters.minSampleSize}`);
  }
  
  if (filters.maxSampleSize) {
    filterConditions.push(`xsd:integer(?sampleSize) <= ${filters.maxSampleSize}`);
  }
  
  if (filters.experienceYears) {
    filterConditions.push(`?meanYOE >= ${filters.experienceYears}`);
  }
  
  if (filters.practiceFrequency) {
    filterConditions.push(`?meanExFR >= ${filters.practiceFrequency}`);
  }

  // Filtres relations
  if (filters.relationDirection) {
    filterConditions.push(`?resultatRelation = "${filters.relationDirection}"`);
  }
  
  if (filters.significantRelation !== undefined) {
    if (filters.significantRelation === true) {
      filterConditions.push(`(?resultatRelation = "+" || ?resultatRelation = "-")`);
    } else if (filters.significantRelation === false) {
      filterConditions.push(`?resultatRelation = "NS"`);
    }
  }
  
  if (filters.resultatRelation && !filters.relationDirection) {
    filterConditions.push(`LCASE(?resultatRelation) = LCASE("${filters.resultatRelation}")`);
  }

  // Filtres modérateurs/médiateurs
  if (filters.moderator) {
    filterConditions.push(`CONTAINS(LCASE(?moderator), LCASE("${filters.moderator}"))`);
  }
  
  if (filters.mediator) {
    filterConditions.push(`CONTAINS(LCASE(?mediator), LCASE("${filters.mediator}"))`);
  }

  // Filtres articles
  if (filters.publicationYear) {
    filterConditions.push(`xsd:gYear(?publicationYear) = ${filters.publicationYear}`);
  }
  
  if (filters.country) {
    filterConditions.push(`LCASE(?country) = LCASE("${filters.country}")`);
  }
  
  if (filters.studyType) {
    filterConditions.push(`CONTAINS(LCASE(?studyType), LCASE("${filters.studyType}"))`);
  }

  // Filtre type d'analyse
  if (filters.analysisType) {
    filterConditions.push(`CONTAINS(LCASE(?analysisType), LCASE("${filters.analysisType}"))`);
  }

  // Filtre catégorie de facteurs
  if (filters.factorCategory) {
    let categoryPattern;
    switch (filters.factorCategory) {
      case 'intrapersonal': categoryPattern = 'Intrapersonal'; break;
      case 'interpersonal': categoryPattern = 'Interpersonal'; break;
      case 'socio-environmental': categoryPattern = 'Socio-environmental'; break;
      case 'other-behaviors': categoryPattern = 'Other'; break;
      default: categoryPattern = filters.factorCategory;
    }
    filterConditions.push(`(CONTAINS(LCASE(str(?conceptVI)), LCASE("${categoryPattern}")) || CONTAINS(LCASE(str(?conceptVD)), LCASE("${categoryPattern}")))`);
  }

  // Construction finale
  let filterSection = '';
  if (filterConditions.length > 0) {
    filterSection = `FILTER(${filterConditions.join(' && ')})`;
  }

  // ORDER BY intelligent selon les variables demandées
  let orderBy = 'ORDER BY ';
  if (needsVI && needsVD) {
    orderBy += '?vi ?vd ?resultatRelation';
  } else if (needsVI) {
    orderBy += '?vi ?resultatRelation';
  } else if (needsVD) {
    orderBy += '?vd ?resultatRelation';
  } else {
    orderBy += '?analysis';
  }

  // Limite intelligente selon la complexité
  const hasFilters = filterConditions.length > 0;
  const limit = hasFilters ? 10000 : 2000;

  // Compter le nombre de clauses ajoutées pour debug
  const clauseCount = whereClauses.length;
  const variableCount = selectVars.length;
  
  console.log(`DYNAMIC QUERY STATS:`);
  console.log(`- WHERE clauses: ${clauseCount} (vs ~30 dans l'original)`);
  console.log(`- SELECT variables: ${variableCount} (vs ~20 dans l'original)`);
  console.log(`- Filter conditions: ${filterConditions.length}`);
  console.log(`- Needs: relation=${needsRelation}, VI=${needsVI}, VD=${needsVD}, sport=${needsSport}, population=${needsPopulation}`);

  // Construction de la requête finale
  const query = `${prefixes}
SELECT DISTINCT ${selectVars.join(' ')} WHERE {
  ${whereClauses.join('\n  ')}${filterSection ? `\n  ${filterSection}` : ''}
}
${orderBy}
LIMIT ${limit}`;

  console.log("Generated DYNAMIC SPARQL Query:");
  console.log(query);
  console.log("=== END QUERY ===");

  return query;
}

// Serveur HTTP optimisé
http.createServer(async (req, res) => {
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
      try {
        const requestPayload = JSON.parse(body);
        console.log("=== DYNAMIC SPARQL GENERATOR ===");
        console.log("Active filters received:", Object.keys(requestPayload).filter(key => 
          requestPayload[key] !== undefined && requestPayload[key] !== '' && key !== 'queryType'
        ));

        let sparqlQuery;

        if (requestPayload.queryType === 'raw_sparql') {
          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log("Using raw SPARQL query from user");
        } else {
          console.log("Generating DYNAMIC SPARQL query based on active filters");
          sparqlQuery = generateDynamicSparqlQuery(requestPayload);
        }

        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide");
        }

        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';
        const startTime = Date.now();

        console.log("Sending DYNAMIC query to Fuseki...");
        const response = await fetch(fusekiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
          },
          body: sparqlQuery,
          timeout: 60000 // 1 minute - devrait être largement suffisant avec moins de données
        });

        const queryTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fuseki error response:", errorText);
          throw new Error(`Fuseki error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const resultCount = data.results?.bindings?.length || 0;
        
        console.log(`✅ DYNAMIC Query successful: ${resultCount} results in ${queryTime}ms`);

        // Ajouter métadonnées de performance
        data.performance = {
          queryTime: queryTime,
          resultCount: resultCount,
          optimizationType: 'dynamic',
          efficency: queryTime < 5000 ? 'excellent' : queryTime < 15000 ? 'good' : 'slow'
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        console.error("❌ Error in DYNAMIC SPARQL Generator:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur dans le SPARQL Generator (DYNAMIC)',
          message: err.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("🚀 DYNAMIC SPARQL Generator listening on port 8003");
  console.log("📊 Builds queries based only on active filters - maximum efficiency!");
});
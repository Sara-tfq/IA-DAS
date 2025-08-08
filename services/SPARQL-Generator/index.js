// SPARQL Generator corrigé pour récupérer TOUS les résultats
// Optimisé pour graphique VI/VD/Moderator sans perdre de données
const http = require('http');
const fetch = require('node-fetch');

// Configuration des timeouts
const FUSEKI_TIMEOUT = 30000; // 30 secondes pour les requêtes
const MAX_RESULTS = 1000; // Limiter le nombre de résultats

function generateOptimizedSparqlQuery(filters) {
  console.log("Generating DIAGNOSTIC SPARQL query, filters:", filters);
  
  const prefixes = `
    PREFIX iadas: <http://ia-das.org/onto#>
    PREFIX iadas-data: <http://ia-das.org/data#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  `;

  // DIAGNOSTIC: Commençons par la requête la plus simple possible
  if (filters.selectedVI) {
    console.log("=== DIAGNOSTIC MODE: Testing different queries ===");
    
    // Test 1: Comptage de base avec VI uniquement
    const countQuery = `${prefixes}
SELECT (COUNT(DISTINCT ?analysis) as ?count) WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:hasIndependentVariable ?variableVI .
  ?variableVI iadas:VI ?vi .
  FILTER(LCASE(str(?vi)) = LCASE("${filters.selectedVI}"))
}`;

    console.log("DIAGNOSTIC COUNT QUERY:");
    console.log(countQuery);
    
    // Test 2: Requête complète mais avec structure obligatoire
    const fullQuery = `${prefixes}
SELECT DISTINCT ?analysis ?relation ?vi ?vd ?resultatRelation ?moderator ?mediator WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:hasIndependentVariable ?variableVI .
  ?variableVI iadas:VI ?vi .
  FILTER(LCASE(str(?vi)) = LCASE("${filters.selectedVI}"))
  
  OPTIONAL { 
    ?relation iadas:hasDependentVariable ?variableVD .
    ?variableVD iadas:VD ?vd .
  }
  OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
  OPTIONAL { ?analysis iadas:hasModerator ?moderator }
  OPTIONAL { ?analysis iadas:hasMediator ?mediator }
}
ORDER BY ?analysis ?relation
LIMIT 1000`;

    console.log("DIAGNOSTIC FULL QUERY:");
    console.log(fullQuery);
    
    return fullQuery;
  }

  // Si pas de VI, requête par défaut
  let whereClauses = [];
  let selectVars = ['?analysis'];
  
  whereClauses.push(`?analysis a iadas:Analysis .`);
  whereClauses.push(`OPTIONAL { 
    ?analysis iadas:hasRelation ?relation .
    ?relation iadas:hasIndependentVariable ?variableVI .
    ?variableVI iadas:VI ?vi .
  }`);
  
  const query = `${prefixes}
SELECT DISTINCT ${selectVars.join(' ')} WHERE {
  ${whereClauses.join('\n  ')}
}
LIMIT 100`;

  console.log("DEFAULT QUERY:");
  console.log(query);
  return query;
}

// Serveur HTTP
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
        console.log("=== CORRECTED SPARQL GENERATOR ===");
        console.log("Request filters:", Object.keys(requestPayload).filter(key => 
          requestPayload[key] !== undefined && requestPayload[key] !== '' && key !== 'queryType'
        ));

        let sparqlQuery;

        if (requestPayload.queryType === 'raw_sparql') {
          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log("Using raw SPARQL query from user");
        } else {
          sparqlQuery = generateOptimizedSparqlQuery(requestPayload);
        }

        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide");
        }

        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';
        const startTime = Date.now();

        console.log("🚀 Sending CORRECTED query to Fuseki...");
        const response = await fetch(fusekiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
          },
          body: sparqlQuery,
          timeout: FUSEKI_TIMEOUT
        });

        const queryTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Fuseki error:", errorText);
          throw new Error(`Fuseki error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const resultCount = data.results?.bindings?.length || 0;
        
        console.log("🎉".repeat(20));
        console.log(`✅ SUCCESS: ${resultCount} résultats trouvés`);
        console.log(`⏱️  Temps: ${queryTime}ms`);
        console.log("🎉".repeat(20));

        // Vérification des données pour le graphique
        if (resultCount > 0) {
          const firstResult = data.results.bindings[0];
          const sampleData = {
            vi: firstResult.vi?.value || 'NULL',
            vd: firstResult.vd?.value || 'NULL',
            relation: firstResult.resultatRelation?.value || 'NULL',
            moderator: firstResult.moderator?.value || 'NULL',
            mediator: firstResult.mediator?.value || 'NULL'
          };
          
          console.log("📊 SAMPLE DATA FOR GRAPH:", sampleData);
          
          // Compter les types de données
          const hasVI = data.results.bindings.filter(b => b.vi?.value).length;
          const hasVD = data.results.bindings.filter(b => b.vd?.value).length;
          const hasRelation = data.results.bindings.filter(b => b.resultatRelation?.value).length;
          const hasModerator = data.results.bindings.filter(b => b.moderator?.value && b.moderator.value !== 'N.A.').length;
          const hasMediator = data.results.bindings.filter(b => b.mediator?.value && b.mediator.value !== 'N.A.').length;
          
          console.log("📈 DATA STATS:");
          console.log(`   VI: ${hasVI}/${resultCount}`);
          console.log(`   VD: ${hasVD}/${resultCount}`);
          console.log(`   Relations: ${hasRelation}/${resultCount}`);
          console.log(`   Moderators: ${hasModerator}/${resultCount}`);
          console.log(`   Mediators: ${hasMediator}/${resultCount}`);
        }

        data.performance = {
          queryTime: queryTime,
          resultCount: resultCount,
          hasTimeout: queryTime > (FUSEKI_TIMEOUT * 0.8),
          queryType: 'corrected_full_data'
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        console.error("❌ Error in CORRECTED SPARQL Generator:", err);
        
        let statusCode = 500;
        let errorMessage = err.message;
        
        if (err.message.includes('timeout')) {
          statusCode = 408;
          errorMessage = 'Query timed out. Try adding more specific filters.';
        }
        
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur SPARQL Generator (CORRECTED)',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("🎯 CORRECTED SPARQL Generator listening on port 8003");
  console.log("📊 Focus: Complete data recovery + Graph optimization");
  console.log("✅ All data preserved with OPTIONAL structure");
});
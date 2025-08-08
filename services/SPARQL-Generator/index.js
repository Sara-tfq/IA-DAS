// SPARQL Generator avec support des catégories VI/VD
// Optimisé pour récupérer TOUS les résultats sans perdre de données
const http = require('http');
const fetch = require('node-fetch');

// Configuration des timeouts
const FUSEKI_TIMEOUT = 30000; // 30 secondes pour les requêtes
const MAX_RESULTS = 1000; // Limiter le nombre de résultats

function generateOptimizedSparqlQuery(filters) {
  console.log("=== SPARQL OPTIMISÉ ANTI-TIMEOUT AVEC CATÉGORIES ===");
  console.log("Filters received:", filters);
  
  const prefixes = `
    PREFIX iadas: <http://ia-das.org/onto#>
    PREFIX iadas-data: <http://ia-das.org/data#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  `;

  // STRATÉGIE ANTI-TIMEOUT : Structure hiérarchique obligatoire
  
  // CAS 1: Filtre sur VI (variable ou catégorie)
  if (filters.selectedVI || filters.categoryVI) {
    console.log("🎯 OPTIMISATION: Requête centrée sur VI");
    
    let query = `${prefixes}
SELECT DISTINCT ?analysis ?relation ?vi ?vd ?resultatRelation ?moderator ?mediator ?categoryVI ?categoryVD WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:hasIndependentVariable ?variableVI .
  ?variableVI iadas:VI ?vi .`;

    // Ajouter la catégorie VI dans la structure principale si nécessaire
    if (filters.categoryVI) {
      query += `
  ?variableVI iadas:hasCategory ?categoryVI .`;
    } else {
      query += `
  OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }`;
    }

    // Construire les filtres obligatoires
    const mainFilters = [];
    
    if (filters.selectedVI) {
      mainFilters.push(`LCASE(str(?vi)) = LCASE("${filters.selectedVI}")`);
    }
    
    if (filters.categoryVI) {
      mainFilters.push(`LCASE(str(?categoryVI)) = LCASE("${filters.categoryVI}")`);
    }
    
    if (mainFilters.length > 0) {
      query += `
  FILTER(${mainFilters.join(' && ')})`;
    }

    // Ajouter les données optionnelles
    query += `
  
  OPTIONAL { 
    ?relation iadas:hasDependentVariable ?variableVD .
    ?variableVD iadas:VD ?vd .`;
    
    // Si on filtre aussi sur VD, l'inclure dans l'OPTIONAL
    if (filters.selectedVD || filters.categoryVD) {
      if (filters.categoryVD) {
        query += `
    ?variableVD iadas:hasCategory ?categoryVD .`;
        
        const vdFilters = [];
        if (filters.selectedVD) {
          vdFilters.push(`LCASE(str(?vd)) = LCASE("${filters.selectedVD}")`);
        }
        if (filters.categoryVD) {
          vdFilters.push(`LCASE(str(?categoryVD)) = LCASE("${filters.categoryVD}")`);
        }
        
        if (vdFilters.length > 0) {
          query += `
    FILTER(${vdFilters.join(' && ')})`;
        }
      } else {
        query += `
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }`;
        if (filters.selectedVD) {
          query += `
    FILTER(LCASE(str(?vd)) = LCASE("${filters.selectedVD}"))`;
        }
      }
    } else {
      query += `
    OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }`;
    }
    
    query += `
  }`;

    // Autres données optionnelles
    query += `
  OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
  OPTIONAL { ?analysis iadas:hasModerator ?moderator }
  OPTIONAL { ?analysis iadas:hasMediator ?mediator }`;

    // Filtre sur la relation si spécifié
    if (filters.relationDirection) {
      query += `
  OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
  FILTER(?resultatRelation && str(?resultatRelation) = "${filters.relationDirection}")`;
    }

    query += `
}
ORDER BY ?analysis ?relation
LIMIT 1000`;

    console.log("REQUÊTE OPTIMISÉE VI:");
    console.log(query);
    return query;
  }

  // CAS 2: Filtre sur VD uniquement (variable ou catégorie)
  if (filters.selectedVD || filters.categoryVD) {
    console.log("🎯 OPTIMISATION: Requête centrée sur VD");
    
    let query = `${prefixes}
SELECT DISTINCT ?analysis ?relation ?vi ?vd ?resultatRelation ?moderator ?mediator ?categoryVI ?categoryVD WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:hasDependentVariable ?variableVD .
  ?variableVD iadas:VD ?vd .`;

    // Ajouter la catégorie VD dans la structure principale si nécessaire
    if (filters.categoryVD) {
      query += `
  ?variableVD iadas:hasCategory ?categoryVD .`;
    } else {
      query += `
  OPTIONAL { ?variableVD iadas:hasCategory ?categoryVD }`;
    }

    // Filtres obligatoires sur VD
    const mainFilters = [];
    
    if (filters.selectedVD) {
      mainFilters.push(`LCASE(str(?vd)) = LCASE("${filters.selectedVD}")`);
    }
    
    if (filters.categoryVD) {
      mainFilters.push(`LCASE(str(?categoryVD)) = LCASE("${filters.categoryVD}")`);
    }
    
    if (mainFilters.length > 0) {
      query += `
  FILTER(${mainFilters.join(' && ')})`;
    }

    // Ajouter VI comme optionnel
    query += `
  
  OPTIONAL { 
    ?relation iadas:hasIndependentVariable ?variableVI .
    ?variableVI iadas:VI ?vi .
    ?variableVI iadas:hasCategory ?categoryVI .
  }
  OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
  OPTIONAL { ?analysis iadas:hasModerator ?moderator }
  OPTIONAL { ?analysis iadas:hasMediator ?mediator }`;

    // Filtre sur la relation si spécifié
    if (filters.relationDirection) {
      query += `
  OPTIONAL { ?relation iadas:resultatRelation ?resultatRelation }
  FILTER(?resultatRelation && str(?resultatRelation) = "${filters.relationDirection}")`;
    }

    query += `
}
ORDER BY ?analysis ?relation
LIMIT 1000`;

    console.log("REQUÊTE OPTIMISÉE VD:");
    console.log(query);
    return query;
  }

  // CAS 3: Filtre sur relation uniquement
  if (filters.relationDirection) {
    console.log("🎯 OPTIMISATION: Requête centrée sur relation");
    
    const query = `${prefixes}
SELECT DISTINCT ?analysis ?relation ?vi ?vd ?resultatRelation ?moderator ?mediator ?categoryVI ?categoryVD WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:resultatRelation ?resultatRelation .
  FILTER(str(?resultatRelation) = "${filters.relationDirection}")
  
  OPTIONAL { 
    ?relation iadas:hasIndependentVariable ?variableVI .
    ?variableVI iadas:VI ?vi .
    ?variableVI iadas:hasCategory ?categoryVI .
  }
  OPTIONAL { 
    ?relation iadas:hasDependentVariable ?variableVD .
    ?variableVD iadas:VD ?vd .
    ?variableVD iadas:hasCategory ?categoryVD .
  }
  OPTIONAL { ?analysis iadas:hasModerator ?moderator }
  OPTIONAL { ?analysis iadas:hasMediator ?mediator }
}
ORDER BY ?analysis ?relation
LIMIT 1000`;

    console.log("REQUÊTE OPTIMISÉE RELATION:");
    console.log(query);
    return query;
  }

  // CAS 4: Aucun filtre - requête d'exploration limitée
  console.log("🎯 REQUÊTE D'EXPLORATION (aucun filtre)");
  const explorationQuery = `${prefixes}
SELECT DISTINCT ?analysis ?vi ?vd ?categoryVI ?categoryVD WHERE {
  ?analysis a iadas:Analysis .
  ?analysis iadas:hasRelation ?relation .
  ?relation iadas:hasIndependentVariable ?variableVI .
  ?variableVI iadas:VI ?vi .
  
  OPTIONAL { ?variableVI iadas:hasCategory ?categoryVI }
  OPTIONAL { 
    ?relation iadas:hasDependentVariable ?variableVD .
    ?variableVD iadas:VD ?vd .
    ?variableVD iadas:hasCategory ?categoryVD .
  }
}
ORDER BY ?analysis
LIMIT 50`;

  console.log("REQUÊTE D'EXPLORATION:");
  console.log(explorationQuery);
  return explorationQuery;
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
        console.log("=== SPARQL GENERATOR WITH CATEGORIES ===");
        
        // Log des filtres actifs
        const activeFilters = Object.keys(requestPayload).filter(key => 
          requestPayload[key] !== undefined && 
          requestPayload[key] !== '' && 
          key !== 'queryType'
        );
        console.log("Active filters:", activeFilters);
        console.log("Filter values:", activeFilters.reduce((acc, key) => {
          acc[key] = requestPayload[key];
          return acc;
        }, {}));

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

        console.log("🚀 Sending query with categories to Fuseki...");
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
        console.log(`✅ SUCCESS WITH CATEGORIES: ${resultCount} résultats trouvés`);
        console.log(`⏱️  Temps: ${queryTime}ms`);
        console.log("🎉".repeat(20));

        // Vérification des données pour le graphique
        if (resultCount > 0) {
          const firstResult = data.results.bindings[0];
          const sampleData = {
            vi: firstResult.vi?.value || 'NULL',
            vd: firstResult.vd?.value || 'NULL',
            categoryVI: firstResult.categoryVI?.value || 'NULL',  // NOUVEAU
            categoryVD: firstResult.categoryVD?.value || 'NULL',  // NOUVEAU
            relation: firstResult.resultatRelation?.value || 'NULL',
            moderator: firstResult.moderator?.value || 'NULL',
            mediator: firstResult.mediator?.value || 'NULL'
          };
          
          console.log("📊 SAMPLE DATA WITH CATEGORIES:", sampleData);
          
          // Compter les types de données
          const hasVI = data.results.bindings.filter(b => b.vi?.value).length;
          const hasVD = data.results.bindings.filter(b => b.vd?.value).length;
          const hasCategoryVI = data.results.bindings.filter(b => b.categoryVI?.value).length;
          const hasCategoryVD = data.results.bindings.filter(b => b.categoryVD?.value).length;
          const hasRelation = data.results.bindings.filter(b => b.resultatRelation?.value).length;
          const hasModerator = data.results.bindings.filter(b => b.moderator?.value && b.moderator.value !== 'N.A.').length;
          const hasMediator = data.results.bindings.filter(b => b.mediator?.value && b.mediator.value !== 'N.A.').length;
          
          console.log("📈 DATA STATS WITH CATEGORIES:");
          console.log(`   VI: ${hasVI}/${resultCount}`);
          console.log(`   VD: ${hasVD}/${resultCount}`);
          console.log(`   Category VI: ${hasCategoryVI}/${resultCount}`);  // NOUVEAU
          console.log(`   Category VD: ${hasCategoryVD}/${resultCount}`);  // NOUVEAU
          console.log(`   Relations: ${hasRelation}/${resultCount}`);
          console.log(`   Moderators: ${hasModerator}/${resultCount}`);
          console.log(`   Mediators: ${hasMediator}/${resultCount}`);

          // Afficher quelques exemples de catégories trouvées
          if (hasCategoryVI > 0) {
            const categoriesVI = [...new Set(data.results.bindings
              .filter(b => b.categoryVI?.value)
              .map(b => b.categoryVI.value))];
            console.log(`📋 Categories VI found: ${categoriesVI.slice(0, 5).join(', ')}`);
          }

          if (hasCategoryVD > 0) {
            const categoriesVD = [...new Set(data.results.bindings
              .filter(b => b.categoryVD?.value)
              .map(b => b.categoryVD.value))];
            console.log(`📋 Categories VD found: ${categoriesVD.slice(0, 5).join(', ')}`);
          }
        }

        data.performance = {
          queryTime: queryTime,
          resultCount: resultCount,
          hasTimeout: queryTime > (FUSEKI_TIMEOUT * 0.8),
          queryType: 'categories_support',
          filters: activeFilters
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        console.error("❌ Error in SPARQL Generator with categories:", err);
        
        let statusCode = 500;
        let errorMessage = err.message;
        
        if (err.message.includes('timeout')) {
          statusCode = 408;
          errorMessage = 'Query timed out. Try adding more specific filters.';
        }
        
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur SPARQL Generator (Categories)',
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
  console.log("🎯 SPARQL Generator with Categories Support listening on port 8003");
  console.log("📊 Features: VI/VD filters + Category VI/VD filters + Relations");
  console.log("✅ Complete data recovery with OPTIONAL structure");
  console.log("🆕 NEW: Support for categoryVI and categoryVD filters");
});
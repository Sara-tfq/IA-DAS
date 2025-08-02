// Bienvenue au fichier le plus embêtant de tout le projet
// Ce fichier est le SPARQL Generator, il génère des requêtes SPARQL basées sur les filtres fournis par l'utilisateur.
// MODIFICATION: Toutes les requêtes incluent maintenant VI et VD
// NOUVELLE MODIFICATION: Toutes les clauses sont maintenant OPTIONAL
// TODO : Rendre le code un peu plus dynamique et moins verbeux
// TODO : Ajouter des logs pour le debug

const http = require('http');
const fetch = require('node-fetch');

function generateSparqlQuery(filters) {
  console.log("Generating SPARQL query with filters:", filters);
  const prefixes = `
    PREFIX : <http://example.org/onto#>
    PREFIX ex: <http://example.org/data#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  `;

  let whereClauses = [];
  let filterConditions = []; // Conditions pour la clause FILTER finale
  let selectVars = ['?analysis']; // Variable de base

  // Garantir qu'on a toujours une analyse comme point de départ
  whereClauses.push(`?analysis a :Analysis .`);

  // STRUCTURE DE BASE POUR VI/VD -en vrai chai pas ce que je fous , ça devient enorme ces trucs
  // Cette structure est maintenant ajoutée systématiquement mais avec OPTIONAL
  whereClauses.push(`OPTIONAL { ?analysis :hasRelation ?relation }`);
  whereClauses.push(`OPTIONAL { ?relation :hasIndependentVariable ?variableVI }`);
  whereClauses.push(`OPTIONAL { ?relation :VD ?vd }`);
  whereClauses.push(`OPTIONAL { ?relation :resultatRelation ?resultatRelation }`);
  whereClauses.push(`OPTIONAL { ?variableVI :VI ?vi }`);
  // STRUCTURE POUR MODERATEURS/MEDIATEURS 
  whereClauses.push(`OPTIONAL { ?analysis :hasModerator ?moderator }`);
  whereClauses.push(`OPTIONAL { ?analysis :moderatorMeasure ?moderatorMeasure }`);
  whereClauses.push(`OPTIONAL { ?analysis :hasMediator ?mediator }`);
  whereClauses.push(`OPTIONAL { ?analysis :mediatorMeasure ?mediatorMeasure }`);

  // Ajouter les variables VI/VD aux variables de sélection
  if (!selectVars.includes('?relation')) selectVars.push('?relation');
  if (!selectVars.includes('?vi')) selectVars.push('?vi');
  if (!selectVars.includes('?vd')) selectVars.push('?vd');
  if (!selectVars.includes('?resultatRelation')) selectVars.push('?resultatRelation');
  if (!selectVars.includes('?moderator')) selectVars.push('?moderator');
  if (!selectVars.includes('?moderatorMeasure')) selectVars.push('?moderatorMeasure');
  if (!selectVars.includes('?mediator')) selectVars.push('?mediator');
  if (!selectVars.includes('?mediatorMeasure')) selectVars.push('?mediatorMeasure');

  // Informations statistiques optionnelles
  whereClauses.push(`OPTIONAL { ?relation :degreR ?degreR }`);
  whereClauses.push(`OPTIONAL { ?relation :degreP ?degreP }`);
  whereClauses.push(`OPTIONAL { ?relation :degreBeta ?degreBeta }`);

  if (!selectVars.includes('?degreR')) selectVars.push('?degreR');
  if (!selectVars.includes('?degreP')) selectVars.push('?degreP');
  if (!selectVars.includes('?degreBeta')) selectVars.push('?degreBeta');

  // FILTRES SPÉCIFIQUES POUR VI/VD SÉLECTIONNÉES
  if (filters.selectedVI) {
    filterConditions.push(`?vi = "${filters.selectedVI}"`);
  }

  if (filters.selectedVD) {
    filterConditions.push(`?vd = "${filters.selectedVD}"`);
  }

  // Type de SPORT - OPTIONAL
  if (filters.sportType) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasSport ?sport }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasSport ?sport }`);
    }
    whereClauses.push(`OPTIONAL { ?sport :sportType ?sportType }`);
    filterConditions.push(`LCASE(?sportType) = LCASE("${filters.sportType}")`);
    if (!selectVars.includes('?sportType')) selectVars.push('?sportType');
  }

  // Filtre année D'expérience - OPTIONAL
  if (filters.experienceYears) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasPopulation ?population }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasPopulation ?population }`);
    }
    whereClauses.push(`OPTIONAL { ?population :experienceYears ?experienceYears }`);
    filterConditions.push(`CONTAINS(?experienceYears, "${filters.experienceYears}")`);
    if (!selectVars.includes('?experienceYears')) selectVars.push('?experienceYears');
  }

  // Fréquence de pratique - OPTIONAL
  if (filters.practiceFrequency) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasPopulation ?population }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasPopulation ?population }`);
    }
    whereClauses.push(`OPTIONAL { ?population :practiceFrequency ?practiceFrequency }`);
    filterConditions.push(`CONTAINS(?practiceFrequency, "${filters.practiceFrequency}")`);
    if (!selectVars.includes('?practiceFrequency')) selectVars.push('?practiceFrequency');
  }

  // FILTRES SPORT - OPTIONAL
  if (filters.sportName) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasSport ?sport }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasSport ?sport }`);
    }
    whereClauses.push(`OPTIONAL { ?sport :sportName ?sportName }`);
    filterConditions.push(`CONTAINS(LCASE(?sportName), LCASE("${filters.sportName}"))`);
    if (!selectVars.includes('?sportName')) selectVars.push('?sportName');
  }

  if (filters.sportLevel) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasSport ?sport }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasSport ?sport }`);
    }
    whereClauses.push(`OPTIONAL { ?sport :sportLevel ?sportLevel }`);
    filterConditions.push(`LCASE(?sportLevel) = LCASE("${filters.sportLevel}")`);
    if (!selectVars.includes('?sportLevel')) selectVars.push('?sportLevel');
  }

  if (filters.sportPracticeType) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasSport ?sport }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasSport ?sport }`);
    }
    whereClauses.push(`OPTIONAL { ?sport :sportPracticeType ?sportPracticeType }`);
    filterConditions.push(`LCASE(?sportPracticeType) = LCASE("${filters.sportPracticeType}")`);
    if (!selectVars.includes('?sportPracticeType')) selectVars.push('?sportPracticeType');
  }

  // FILTRES POPULATION - OPTIONAL
  if (filters.gender) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasPopulation ?population }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasPopulation ?population }`);
    }
    whereClauses.push(`OPTIONAL { ?population :gender ?gender }`);
    filterConditions.push(`LCASE(?gender) = LCASE("${filters.gender}")`);
    if (!selectVars.includes('?gender')) selectVars.push('?gender');
  }

  if (filters.minAge || filters.maxAge) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasPopulation ?population }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasPopulation ?population }`);
    }
    whereClauses.push(`OPTIONAL { ?population :ageStats ?ageStat }`);
    whereClauses.push(`OPTIONAL { ?ageStat :meanAge ?age }`);
    if (filters.minAge) filterConditions.push(`xsd:decimal(?age) >= ${filters.minAge}`);
    if (filters.maxAge) filterConditions.push(`xsd:decimal(?age) <= ${filters.maxAge}`);
    if (!selectVars.includes('?age')) selectVars.push('?age');
  }

  if (filters.minSampleSize || filters.maxSampleSize) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?analysis :hasPopulation ?population }'))) {
      whereClauses.push(`OPTIONAL { ?analysis :hasPopulation ?population }`);
    }
    whereClauses.push(`OPTIONAL { ?population :sampleSize ?sampleSize }`);
    if (filters.minSampleSize) filterConditions.push(`xsd:integer(?sampleSize) >= ${filters.minSampleSize}`);
    if (filters.maxSampleSize) filterConditions.push(`xsd:integer(?sampleSize) <= ${filters.maxSampleSize}`);
    if (!selectVars.includes('?sampleSize')) selectVars.push('?sampleSize');
  }

  // FILTRES RELATIONS - les conditions de filtre restent obligatoires pour filtrer les résultats
  if (filters.significantRelation !== undefined) {
    if (filters.significantRelation === true) {
      // Significatif (+ ou -)
      filterConditions.push(`(?resultatRelation = "+" || ?resultatRelation = "-")`);
    } else if (filters.significantRelation === false) {
      // Non significatif
      filterConditions.push(`?resultatRelation = "NS"`);
    }
  }

  if (filters.relationDirection) {
    filterConditions.push(`?resultatRelation = "${filters.relationDirection}"`);
  }

  if (filters.resultatRelation && !filters.relationDirection) {
    filterConditions.push(`LCASE(?resultatRelation) = LCASE("${filters.resultatRelation}")`);
  }

  // FILTRES VARIABLES - OPTIONAL
  if (filters.variableType) {
    if (filters.variableType === 'VD') {
      // Ajouter un filtre sur le type de VD si nécessaire
      // La structure de base inclut déjà ?vd
    } else if (filters.variableType === 'VI') {
      // Ajouter un filtre sur le type de VI si nécessaire
      // La structure de base inclut déjà ?vi
    }
  }

  if (filters.factorCategory) {
    whereClauses.push(`OPTIONAL { ?variableVI :mainClass ?factorCategory }`);

    // Mapper les valeurs du frontend vers les valeurs de l'ontologie
    let categoryValue;
    switch (filters.factorCategory) {
      case 'intrapersonal':
        categoryValue = 'Intrapersonal factor related to DEAB';
        break;
      case 'interpersonal':
        categoryValue = 'Interpersonal factor related to DEAB';
        break;
      case 'socio-environmental':
        categoryValue = 'Socio-environmental factor related to DEAB';
        break;
      case 'other-behaviors':
        categoryValue = 'Other behaviors';
        break;
      default:
        categoryValue = filters.factorCategory;
    }

    filterConditions.push(`CONTAINS(LCASE(?factorCategory), LCASE("${categoryValue}"))`);
    if (!selectVars.includes('?factorCategory')) selectVars.push('?factorCategory');
  }

  // FILTRES ANALYSE - OPTIONAL
  if (filters.analysisType) {
    whereClauses.push(`OPTIONAL { ?analysis :analysisType ?analysisType }`);
    filterConditions.push(`CONTAINS(LCASE(?analysisType), LCASE("${filters.analysisType}"))`);
    if (!selectVars.includes('?analysisType')) selectVars.push('?analysisType');
  }

  // Les clauses WHERE sont déjà ajoutées dans la structure de base je pense 
  // On garde seulement les conditions de filtre
  if (filters.moderator) {
    filterConditions.push(`CONTAINS(LCASE(?moderator), LCASE("${filters.moderator}"))`);
  }

  if (filters.mediator) {
    filterConditions.push(`CONTAINS(LCASE(?mediator), LCASE("${filters.mediator}"))`);
  }

  // if (filters.moderator) {
  //   whereClauses.push(`OPTIONAL { ?analysis :hasModerator ?moderator }`);
  //   filterConditions.push(`CONTAINS(LCASE(?moderator), LCASE("${filters.moderator}"))`);
  //   if (!selectVars.includes('?moderator')) selectVars.push('?moderator');
  // }

  // if (filters.mediator) {
  //   whereClauses.push(`OPTIONAL { ?analysis :hasMediator ?mediator }`);
  //   filterConditions.push(`CONTAINS(LCASE(?mediator), LCASE("${filters.mediator}"))`);
  //   if (!selectVars.includes('?mediator')) selectVars.push('?mediator');
  // }

  // FILTRES ARTICLE - OPTIONAL
  if (filters.publicationYear) {
    whereClauses.push(`OPTIONAL { ?article :hasAnalysis ?analysis }`);
    whereClauses.push(`OPTIONAL { ?article :publicationYear ?publicationYear }`);
    filterConditions.push(`xsd:gYear(?publicationYear) = ${filters.publicationYear}`);
    if (!selectVars.includes('?publicationYear')) selectVars.push('?publicationYear');
  }

  if (filters.country) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?article :hasAnalysis ?analysis }'))) {
      whereClauses.push(`OPTIONAL { ?article :hasAnalysis ?analysis }`);
    }
    whereClauses.push(`OPTIONAL { ?article :country ?country }`);
    filterConditions.push(`LCASE(?country) = LCASE("${filters.country}")`);
    if (!selectVars.includes('?country')) selectVars.push('?country');
  }

  if (filters.studyType) {
    if (!whereClauses.some(clause => clause.includes('OPTIONAL { ?article :hasAnalysis ?analysis }'))) {
      whereClauses.push(`OPTIONAL { ?article :hasAnalysis ?analysis }`);
    }
    whereClauses.push(`OPTIONAL { ?article :studyType ?studyType }`);
    filterConditions.push(`CONTAINS(LCASE(?studyType), LCASE("${filters.studyType}"))`);
    if (!selectVars.includes('?studyType')) selectVars.push('?studyType');
  }

  console.log("Where Clauses:", whereClauses);
  console.log("Filter Conditions:", filterConditions);
  console.log("Select Variables:", selectVars);

  // Construction de la clause FILTER finale
  let filterSection = '';
  if (filterConditions.length > 0) {
    filterSection = `FILTER(${filterConditions.join(' && ')})`;
  }

  // Construction de la clause ORDER BY - toujours avec VI et VD
  let orderBy = 'ORDER BY ?vi ?vd ?resultatRelation ?degreR';

  // Construction de la requête finale
  const query = `${prefixes}
SELECT  ${selectVars.join(' ')} WHERE {
  ${whereClauses.join('\n  ')}${filterSection ? `\n  ${filterSection}` : ''}
}
${orderBy}
LIMIT 10000`;

  console.log("Generated SPARQL Query:");
  console.log(query);

  return query;
}

http.createServer(async (req, res) => {
  // Gérer CORS
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
        console.log("Received payload:", requestPayload);

        let sparqlQuery;

        // Traiter selon le type de requête
        if (requestPayload.queryType === 'raw_sparql') {
          // Mode SPARQL direct
          sparqlQuery = requestPayload.rawSparqlQuery;
          console.log("Using raw SPARQL query from user");
        } else {
          // Mode formulaire - génération automatique
          console.log("Generating SPARQL query from filters");
          sparqlQuery = generateSparqlQuery(requestPayload);
        }

        // Validation de base
        if (!sparqlQuery || sparqlQuery.trim() === '') {
          throw new Error("Requête SPARQL vide");
        }

        // Exécution sur Fuseki
        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';

        console.log("Sending query to Fuseki...");
        const response = await fetch(fusekiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
          },
          body: sparqlQuery
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fuseki error response:", errorText);
          throw new Error(`Fuseki error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Results from Fuseki:", data.results?.bindings?.length || 0, "results");

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        console.error("Error in SPARQL Generator:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Erreur dans le SPARQL Generator',
          message: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("SPARQL Generator listening on port 8003");
});
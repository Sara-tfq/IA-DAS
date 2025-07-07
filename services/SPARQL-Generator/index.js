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
  let filterClauses = [];

  if (filters.sportName) {
    whereClauses.push(`?sport a :Sport ; :sportName ?sportName .`);
    filterClauses.push(`FILTER(CONTAINS(LCASE(?sportName), LCASE("${filters.sportName}")))`);
  }

  if (filters.gender) {
    whereClauses.push(`?population a :Population ; :gender ?gender .`);
    filterClauses.push(`FILTER(LCASE(?gender) = LCASE("${filters.gender}"))`);
  }

  if (filters.minAge || filters.maxAge) {
    whereClauses.push(`?population :ageStats ?ageStat .`);
    whereClauses.push(`?ageStat :meanAge ?age .`);
    if (filters.minAge) filterClauses.push(`FILTER(xsd:decimal(?age) >= ${filters.minAge})`);
    if (filters.maxAge) filterClauses.push(`FILTER(xsd:decimal(?age) <= ${filters.maxAge})`);
  }

  console.log("Where Clauses:", whereClauses);
  console.log("Filter Clauses:", filterClauses);
  return `
    ${prefixes}
    SELECT DISTINCT ?sportName ?gender ?age WHERE {
      ${whereClauses.join('\n')}
      ${filterClauses.join('\n')}
    }
    LIMIT 100
  `;
}

http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const filters = JSON.parse(body);
        const sparqlQuery = generateSparqlQuery(filters);

        const fusekiEndpoint = 'http://fuseki:3030/ds/sparql';

        const response = await fetch(fusekiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
          },
          body: sparqlQuery
        });

        const data = await response.json();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Erreur dans le SPARQL Generator: ' + err.message);
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Méthode non autorisée');
  }
}).listen(8003, () => {
  console.log("SPARQL Generator running on port 8003");
});

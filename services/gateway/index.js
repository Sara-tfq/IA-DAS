const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer();

http.createServer(function (request, response) {

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');


    if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
    }

    // Ensuite seulement on analyse l’URL
    let filePath = request.url.split("/").filter(function (elem) {
        return elem !== "..";
    });

    try {
        if (filePath[1] === "api" && filePath[2] === "query") {
            console.log("REST API call, redirecting to SPARQL Generator");
            console.log(`Request URL: ${request.url}`);
            console.log(`File Path: ${filePath}`);
            if (filePath[1] === "api" && filePath[2] === "query") {
                console.log("REST API call, redirecting to SPARQL Generator");
                proxy.web(request, response, { target: "http://sparql-generator:8003" });
            }

        } else {
            console.log("Static file request, redirecting to frontend service");
            proxy.web(request, response, { target: "http://frontend:8002" });
        }
    } catch (error) {
        console.log(`Error while processing ${request.url}: ${error}`);
        response.statusCode = 400;
        response.end(`Something went wrong with your request: ${request.url}`);
    }
}).listen(8000 , '0.0.0.0');

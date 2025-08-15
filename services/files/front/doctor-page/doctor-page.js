let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script principal chargé !");

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Page chargée, début de l'initialisation...");
    
    const inputs = document.querySelectorAll('input, button, select');
    inputs.forEach(input => input.disabled = true);
    
    try {
        await window.pageInitializer.initializePage();
        console.log(' Initialisation terminée avec succès');
    } catch (error) {
        console.error(' Échec de l\'initialisation:', error);
    }
    
    const excelPaths = [
        './data/IA-DAS-Data1.xlsx',
        './../data/IA-DAS-Data1.xlsx'
    ];
    
    let excelLoaded = false;
    for (const excelPath of excelPaths) {
        try {
            console.log(`🔍 Tentative chargement Excel: ${excelPath}`);
            
            if (window.csvLoader && typeof window.csvLoader.
                Data === 'function') {
                const excelData = await window.csvLoader.loadExcelData(excelPath);
                if (excelData && excelData.length > 0) {
                    console.log(`✅ Excel chargé avec succès: ${excelData.length} analyses depuis ${excelPath}`);
                    excelLoaded = true;
                    break;
                }
            } else {
                console.log(`⏳ ExcelLoader pas encore disponible, attente...`);
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
        } catch (error) {
            console.log(` Échec chargement ${excelPath}:`, error.message);
        }
    }
    
    if (!excelLoaded) {
        console.error("Aucun fichier Excel trouvé !");
    }
    
    setTimeout(() => {
        const component = document.querySelector('input-intorregation-component');
        if (component) {
            console.log("Composant trouvé, ajout du listener !");
            component.addEventListener('search', (event) => {
                console.log("=== ÉVÉNEMENT REÇU DANS LA PAGE PRINCIPALE ===");
                rechercher(event.detail);
            });
        }
    }, 100);
});
// Fonction pour les requêtes prédéfinies
// Fonction pour les requêtes prédéfinies - MISE À JOUR COMPLÈTE
async function rechercher(data) {
    try {
        const isReady = await window.pageInitializer.ensureReady();
        if (!isReady) {
            console.log('❌ Page pas prête pour la recherche');
            return;
        }
        
        console.log("=== RECHERCHE AVEC PAGE INITIALISÉE ===");
        console.log("Données reçues:", data);
        
        window.loadingManager.show("Recherche en cours...");
        window.loadingManager.startQuery(1, 1); // Une seule tentative nécessaire
        
        let payload;
        
        if (data.queryType === 'raw_sparql') {
            payload = {
                queryType: 'raw_sparql',
                rawSparqlQuery: data.rawSparqlQuery
            };
        } else {
            payload = { queryType: 'generated' };

            if (data.selectedVI) payload.selectedVI = data.selectedVI;
            if (data.selectedVD) payload.selectedVD = data.selectedVD;
            if (data.categoryVI) payload.categoryVI = data.categoryVI;
            if (data.categoryVD) payload.categoryVD = data.categoryVD;
            if (data.relationDirection) payload.relationDirection = data.relationDirection;
            if (data.sportType) payload.sportType = data.sportType;
            if (data.gender) payload.gender = data.gender;

            // Nouveaux filtres âge
            if (data.ageCategory) {
                payload.ageCategory = data.ageCategory;
            } else {
                if (data.ageMin) payload.ageMin = parseInt(data.ageMin);
                if (data.ageMax) payload.ageMax = parseInt(data.ageMax);
            }

            // Nouveaux filtres fréquence
            if (data.exerciseFrequency) {
                payload.exerciseFrequency = data.exerciseFrequency;
            } else {
                if (data.frequencyMin) payload.frequencyMin = parseInt(data.frequencyMin);
                if (data.frequencyMax) payload.frequencyMax = parseInt(data.frequencyMax);
            }

            // Nouveaux filtres expérience
            if (data.experienceCategory) {
                payload.experienceCategory = data.experienceCategory;
            } else {
                if (data.experienceMin) payload.experienceMin = parseInt(data.experienceMin);
                if (data.experienceMax) payload.experienceMax = parseInt(data.experienceMax);
            }
        }
        
        console.log("Payload complet:", payload);
        
        const response = await fetch('http://localhost:8003/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log("Réponse API:", responseData);
        
        window.loadingManager.completeQuery(responseData.results?.bindings?.length);
        window.loadingManager.startParsing();
        
        // Parser les données si nécessaire
        let parsedData = responseData;
        if (window.SPARQLDataParser && typeof window.SPARQLDataParser.parse === 'function') {
            parsedData = window.SPARQLDataParser.parse(responseData);
        }
        
        window.loadingManager.completeParsing();
        
        displayResults(parsedData);
        window.loadingManager.completeAll();
        
    } catch (error) {
        console.error(' Erreur lors de la recherche:', error);
        
        window.loadingManager.showError('Erreur de recherche', error.message);
        
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="color: red; padding: 20px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 5px;">
                    <h4>Erreur de recherche</h4>
                    <p><strong>Message:</strong> ${error.message}</p>
                    <p><strong>Suggestions:</strong></p>
                    <ul>
                        <li>Vérifiez que le serveur SPARQL Generator fonctionne (port 8003)</li>
                        <li>Essayez avec moins de filtres pour éviter les timeouts</li>
                        <li>Vérifiez la console pour plus de détails</li>
                    </ul>
                </div>
            `;
        }
    }
}

function displayResults(data, query = null) {
    currentData = data;
    currentQuery = query;
    
    const resultsDiv = document.getElementById('results');
    
    // Créer la structure si elle n'existe pas
    if (!resultsDiv.querySelector('#result-controls')) {
        resultsDiv.innerHTML = `
            <div id="result-controls" style="margin-bottom: 20px;">
                <button id="viewTable" class="view-btn active">Tableau</button>
                <button id="viewGraph" class="view-btn">Graphique</button>
                <button id="viewSparql" class="view-btn"> SPARQL</button>
            </div>
            <div id="result-display"></div>
        `;
    }
    
    // Maintenant on peut accéder aux éléments en sécurité
    const controlsDiv = document.getElementById('result-controls');
    const displayDiv = document.getElementById('result-display');
    
    // Afficher les contrôles
    controlsDiv.style.display = 'block';
    
    // Configurer les événements des boutons
    setupViewButtons();
    
    // Afficher en mode tableau par défaut
    displayTableView();
}

function setupViewButtons() {
    document.getElementById('viewTable').onclick = () => switchView('table');
    document.getElementById('viewGraph').onclick = () => switchView('graph');
    document.getElementById('viewSparql').onclick = () => switchView('sparql');
}

function switchView(mode) {
    currentMode = mode;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
    
    // Afficher le bon mode
    switch(mode) {
        case 'table':
            displayTableView();
            break;
        case 'graph':
            displayGraphView();
            break;
        case 'sparql':
            displaySparqlView();
            break;
    }
}

function displayTableView() {
    const displayDiv = document.getElementById('result-display');
    
    if (!currentData || !currentData.results || !currentData.results.bindings) {
        displayDiv.innerHTML = '<p>Aucun résultat à afficher</p>';
        return;
    }
    
    const bindings = currentData.results.bindings;
    const variables = currentData.head.vars;
    
    let tableHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        ${variables.map(v => `<th style="border: 1px solid #ddd; padding: 12px; text-align: left;">${v}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    bindings.forEach((binding, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        tableHTML += `<tr style="background-color: ${bgColor};">`;
        
        variables.forEach(variable => {
            const value = binding[variable];
            const displayValue = value ? (value.value || value) : '';
            tableHTML += `<td style="border: 1px solid #ddd; padding: 12px;">${displayValue}</td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
        <p style="margin-top: 10px; color: #666;">
            ${bindings.length} résultat(s) trouvé(s)
        </p>
    `;
    
    displayDiv.innerHTML = tableHTML;
}

function displayGraphView() {
    const displayDiv = document.getElementById('result-display');
    
    const exportButton = `
        <div style="margin-bottom: 15px;">
            <button id="exportGraph" style="
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
                📥 Exporter PNG avec logo IA-DAS
            </button>
        </div>
    `;
    
    try {
        displayDiv.innerHTML = exportButton + '<div id="graph-container"></div>';
        const graphContainer = document.getElementById('graph-container');
        const graphComponent = new OntologyGraphComponent(graphContainer, currentData);
        graphComponent.render();
        
        // Événement d'export
        document.getElementById('exportGraph').onclick = () => exportGraphToPNG();
    } catch (error) {
        console.error('Erreur graphique:', error);
        displayDiv.innerHTML = '<p>Erreur lors de l\'affichage du graphique</p>';
    }
}

function displaySparqlView() {
    const displayDiv = document.getElementById('result-display');
    
    const sparqlHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
            <h4>Requête SPARQL générée :</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${currentQuery || 'Requête non disponible'}</pre>
            
            <h4 style="margin-top: 20px;">Résultats JSON :</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; max-height: 400px; white-space: pre-wrap;">${JSON.stringify(currentData, null, 2)}</pre>
        </div>
    `;
    
    displayDiv.innerHTML = sparqlHTML;
}
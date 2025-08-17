let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script principal chargé !");
document.addEventListener('DOMContentLoaded', async function () {
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

            if (data.ageCategory) {
                payload.ageCategory = data.ageCategory;
            } else {
                if (data.meanAge) payload.meanAge = parseFloat(data.meanAge);
                if (data.minAge) payload.minAge = parseInt(data.minAge);    
                if (data.maxAge) payload.maxAge = parseInt(data.maxAge);    
            }

            if (data.exerciseFrequency) {
                payload.exerciseFrequency = data.exerciseFrequency;
            } else {
                if (data.meanExFR) payload.meanExFR = parseFloat(data.meanExFR);
                if (data.minExFR) payload.minExFR = parseInt(data.minExFR);    
                if (data.maxExFR) payload.maxExFR = parseInt(data.maxExFR);    
            }

            if (data.experienceCategory) {
                payload.experienceCategory = data.experienceCategory;
            } else {
                if (data.meanYOE) payload.meanYOE = parseFloat(data.meanYOE);
                if (data.minYOE) payload.minYOE = parseInt(data.minYOE);     
                if (data.maxYOE) payload.maxYOE = parseInt(data.maxYOE);     
            }
        }

        console.log("Payload complet:", payload);

        const response = await fetch(
            window.location.hostname === 'localhost'
                ? 'http://localhost:8003'
                : 'http://51.44.188.162:8003',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );


        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log("Réponse API:", responseData);

        window.loadingManager.completeQuery(responseData.results?.bindings?.length);
        window.loadingManager.startParsing();

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
            const template = document.getElementById('error-template');
            const clone = template.content.cloneNode(true);
            clone.getElementById('error-message').textContent = error.message;
            resultsDiv.innerHTML = '';
            resultsDiv.appendChild(clone);
        }
    }
}

function displayResults(data, query = null) {
    currentData = data;
    currentQuery = query;
    const resultsDiv = document.getElementById('results');

    if (!resultsDiv.querySelector('#result-controls')) {
        const template = document.getElementById('result-controls-template');
        const clone = template.content.cloneNode(true);
        resultsDiv.appendChild(clone);
    }

    const controlsDiv = document.getElementById('result-controls');
    const displayDiv = document.getElementById('result-display');


    controlsDiv.style.display = 'block';


    setupViewButtons();


    displayTableView();
}

function setupViewButtons() {
    document.getElementById('viewTable').onclick = () => switchView('table');
    document.getElementById('viewGraph').onclick = () => switchView('graph');
    document.getElementById('viewSparql').onclick = () => switchView('sparql');
}

function switchView(mode) {
    currentMode = mode;

    // Nettoyer le bouton d'export s'il existe
    const exportBtn = document.getElementById('exportGraph');
    if (exportBtn) {
        exportBtn.remove();
    }

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');

    // Afficher le bon mode
    switch (mode) {
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
        const template = document.getElementById('no-results-template');
        const clone = template.content.cloneNode(true);
        displayDiv.innerHTML = '';
        displayDiv.appendChild(clone);
        return;
    }

    const bindings = currentData.results.bindings;
    const variables = currentData.head.vars;

    let tableHTML = `
        <div style="overflow-x: auto; margin: 10px 0;">
            <table style="
                width: 100%; 
                border-collapse: collapse; 
                margin: 0;
                font-size: 13px;
                line-height: 1.2;
            ">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        ${variables.map(v => `<th style="
                            border: 1px solid #ddd; 
                            padding: 6px 8px; 
                            text-align: left;
                            font-weight: 600;
                            font-size: 12px;
                        ">${v}</th>`).join('')}
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
            tableHTML += `<td style="
                border: 1px solid #ddd; 
                padding: 4px 8px;
                vertical-align: top;
                word-break: break-word;
                max-width: 200px;
            ">${displayValue}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
        <p style="margin: 5px 0; color: #666; font-size: 12px;">
            ${bindings.length} résultat(s) trouvé(s)
        </p>
    `;

    displayDiv.innerHTML = tableHTML;
}
function displayGraphView() {
    const displayDiv = document.getElementById('result-display');

    try {
        const template = document.getElementById('graph-view-template');
        const clone = template.content.cloneNode(true);

        displayDiv.innerHTML = '';
        displayDiv.appendChild(clone);

        const controls = document.getElementById('result-controls');
        if (controls && !document.getElementById('exportGraph')) {
            const exportTemplate = document.getElementById('export-button-template');
            const exportClone = exportTemplate.content.cloneNode(true);
            controls.appendChild(exportClone);
            document.getElementById('exportGraph').onclick = () => exportGraphToPNG();
        }

        const graphContainer = document.getElementById('graph-container');
        const graphComponent = new OntologyGraphComponent(graphContainer, currentData);
        graphComponent.render();

    } catch (error) {
        console.error('Erreur graphique:', error);
        const errorTemplate = document.getElementById('graph-error-template');
        const errorClone = errorTemplate.content.cloneNode(true);
        displayDiv.innerHTML = '';
        displayDiv.appendChild(errorClone);
    }
}

function displaySparqlView() {
    const displayDiv = document.getElementById('result-display');
    const template = document.getElementById('sparql-view-template');
    const clone = template.content.cloneNode(true);
    clone.getElementById('sparql-query').textContent = currentQuery || 'Requête non disponible';
    clone.getElementById('sparql-results').textContent = JSON.stringify(currentData, null, 2);
    displayDiv.innerHTML = '';
    displayDiv.appendChild(clone);
}
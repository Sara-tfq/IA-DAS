let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script competence-page chargé !");

document.addEventListener('DOMContentLoaded', async function () {
    console.log("📄 Page Questions de Compétences prête !");

    const excelPaths = [
        './data/IA-DAS-Data1.xlsx',
        './../data/IA-DAS-Data1.xlsx'
    ];

    let excelLoaded = false;
    for (const excelPath of excelPaths) {
        try {
            console.log(`🔍 Tentative chargement Excel: ${excelPath}`);

            if (window.csvLoader && typeof window.csvLoader.loadExcelData === 'function') {
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
            console.log(`❌ Échec chargement ${excelPath}:`, error.message);
        }
    }

    if (!excelLoaded) {
        console.error("❌ Aucun fichier Excel trouvé !");
    }

    // Attendre que le composant soit initialisé
    setTimeout(() => {
        console.log("🔍 Recherche du composant compétence...");



        const competenceComponent = document.querySelector('input-competence-component');
        if (competenceComponent) {
            console.log("✅ Composant compétence trouvé, ajout du listener !");

            competenceComponent.addEventListener('search', (event) => {
                console.log("=== ÉVÉNEMENT COMPÉTENCE REÇU ===");
                console.log("Données:", event.detail);
                rechercherCompetence(event.detail);
            });
        } else {
            console.log("❌ Composant compétence non trouvé dans le DOM");
        }
    }, 500);
});

async function rechercherCompetence(data) {
    console.log("🚀 === RECHERCHE COMPÉTENCE CÔTÉ CLIENT DÉMARRÉE ===");
    console.log("⏰ Timestamp client:", new Date().toISOString());
    console.log("📥 Données reçues du composant:", data);
    console.log("🔍 Structure des données:");
    console.log("   - questionId:", data.questionId);
    console.log("   - questionText:", data.questionText);
    console.log("   - description:", data.description);
    console.log("   - queryType:", data.queryType);

    try {
        // Vérifications préliminaires
        if (!data.questionId) {
            console.error("❌ ERREUR: questionId manquant dans les données !");
            throw new Error("Question ID manquant");
        }

        console.log("✅ Validation des données OK");

        // Afficher un indicateur de chargement simple
        console.log("🎨 Affichage du loading...");
        showSimpleLoading(`Analyse de la question : ${data.questionText.substring(0, 50)}...`);

        // Payload pour le serveur
        const payload = {
            queryType: 'predefined_competence',
            questionId: data.questionId,
            questionText: data.questionText,
            description: data.description
        };

        console.log("📤 === PRÉPARATION REQUÊTE SERVEUR ===");
        console.log("📤 Payload complet:", JSON.stringify(payload, null, 2));
        console.log(window.location.hostname);
        console.log("🔧 Méthode: POST");

        console.log("📡 Envoi de la requête...");
        const startTime = Date.now();

        // Appel API
        const apiUrl = window.location.hostname === 'localhost' ?
            'http://localhost:8003' :
            `http://${window.location.hostname}:8003`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const requestTime = Date.now() - startTime;
        console.log(`⏱️ Temps de requête: ${requestTime}ms`);
        console.log("📡 Statut de réponse:", response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erreur HTTP:", response.status);
            console.error("❌ Texte d'erreur:", errorText);
            throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }

        console.log("✅ Réponse HTTP OK, parsing JSON...");
        const responseData = await response.json();

        console.log("📥 === ANALYSE DE LA RÉPONSE SERVEUR ===");
        console.log("📊 Type de réponse:", typeof responseData);
        console.log("📊 Clés principales:", Object.keys(responseData));

        if (responseData.results) {
            console.log("📊 Nombre de résultats:", responseData.results.bindings?.length || 0);
            console.log("📊 Variables SPARQL:", responseData.head?.vars);

            if (responseData.results.bindings?.length > 0) {
                console.log("📊 Premier résultat:", responseData.results.bindings[0]);
            }
        }

        if (responseData.performance) {
            console.log("📈 Performance serveur:", responseData.performance);
        }

        if (responseData.warning) {
            console.warn("⚠️ Warning du serveur:", responseData.warning);
        }

        // Parser les données si SPARQLDataParser est disponible
        console.log("🔄 === PARSING DES DONNÉES ===");
        let parsedData = responseData;

        if (window.SPARQLDataParser && typeof window.SPARQLDataParser.parse === 'function') {
            console.log("✅ SPARQLDataParser disponible, parsing...");
            const parseStartTime = Date.now();

            parsedData = window.SPARQLDataParser.parse(responseData);

            const parseTime = Date.now() - parseStartTime;
            console.log(`⏱️ Temps de parsing: ${parseTime}ms`);
            console.log("📊 Données parsées - structure:", Object.keys(parsedData));

            if (parsedData.networkData) {
                console.log("🕸️ Réseau créé:");
                console.log("   - Nœuds:", parsedData.networkData.nodes?.length || 0);
                console.log("   - Liens:", parsedData.networkData.links?.length || 0);
            }
        } else {
            console.warn("⚠️ SPARQLDataParser non disponible, données brutes utilisées");
        }

        // Cacher le loading
        console.log("🎨 Masquage du loading...");
        hideSimpleLoading();

        // Afficher les résultats
        console.log("🎯 === AFFICHAGE DES RÉSULTATS ===");
        displayCompetenceResults(parsedData, data);

        console.log("✅ === RECHERCHE COMPÉTENCE TERMINÉE AVEC SUCCÈS ===");
        console.log("⏰ Timestamp fin:", new Date().toISOString());
        console.log("⏱️ Temps total:", Date.now() - startTime, "ms");

    } catch (error) {
        const errorTime = Date.now();
        console.error('💥 === ERREUR DANS RECHERCHE COMPÉTENCE ===');
        console.error('⏰ Timestamp erreur:', new Date().toISOString());
        console.error('❌ Type d\'erreur:', error.constructor.name);
        console.error('❌ Message:', error.message);
        console.error('❌ Stack:', error.stack);
        console.error('❌ Données qui ont causé l\'erreur:', data);

        hideSimpleLoading();
        showError('Erreur de recherche compétence', error.message, data);

        console.error('💥 === FIN GESTION ERREUR ===');
    }
}



function showSimpleLoading(message) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div id="simple-loading" style="
                text-align: center; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                border-radius: 8px;
                margin: 20px 0;
            ">
                <div style="
                    width: 40px; 
                    height: 40px; 
                    border: 4px solid rgba(255,255,255,0.3); 
                    border-radius: 50%; 
                    border-top-color: white; 
                    animation: spin 1s ease-in-out infinite; 
                    margin: 0 auto 20px auto;
                "></div>
                <h3>🔍 Recherche en cours...</h3>
                <p>${message}</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

function hideSimpleLoading() {
    const loadingDiv = document.getElementById('simple-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showError(title, message, data) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div style="color: red; padding: 20px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 5px; margin: 20px 0;">
                <h4> ${title}</h4>
                <p><strong>Question:</strong> ${data.questionText}</p>
                <p><strong>Erreur:</strong> ${message}</p>
                <p><strong>Suggestions:</strong></p>
                <ul>
                    <li>Vérifiez que le serveur SPARQL Generator fonctionne (port 8003)</li>
                    <li>Vérifiez que les requêtes de compétence sont bien configurées</li>
                    <li>Consultez la console pour plus de détails</li>
                </ul>
                <button onclick="location.reload()" style="
                    background: #dc3545; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    cursor: pointer; 
                    margin-top: 10px;
                ">🔄 Recharger la page</button>
            </div>
        `;
    }
}

function displayCompetenceResults(data, questionContext) {
    currentData = data;
    currentQuery = questionContext;

    const resultsDiv = document.getElementById('results');

    // Header spécifique aux compétences
    const competenceHeader = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3> Analyse de Compétence</h3>
            <p><strong>Question:</strong> ${questionContext.questionText}</p>
            <p><strong>Description:</strong> ${questionContext.description}</p>
            <p><strong>Résultats trouvés:</strong> ${data.results?.bindings?.length || 0}</p>
        </div>
    `;

    // Créer la structure avec header compétence
    resultsDiv.innerHTML = competenceHeader + `
        <div id="result-controls" style="margin-bottom: 20px;">
            <button id="viewTable" class="view-btn active">Tableau détaillé</button>
            <button id="viewGraph" class="view-btn">Graphique réseau</button>
            <button id="viewSparql" class="view-btn">SPARQL</button>
            <button id="exportCompetence" class="view-btn" style="background: #28a745; color: white;">📥 Exporter analyse</button>
        </div>
        <div id="result-display"></div>
    `;

    // Afficher les contrôles
    const controlsDiv = document.getElementById('result-controls');
    controlsDiv.style.display = 'block';

    // Configurer les événements
    setupViewButtons();

    // Événement export spécifique compétence
    document.getElementById('exportCompetence').onclick = () => exportCompetenceAnalysis(data, questionContext);

    // Afficher en mode tableau par défaut
    displayTableView();
}

// Fonctions d'affichage (inchangées)
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
        displayDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 5px;">
                <p>Aucun résultat à afficher</p>
                <p style="color: #666;">Vérifiez que la question sélectionnée retourne des données</p>
            </div>
        `;
        return;
    }

    const bindings = currentData.results.bindings;
    const variables = currentData.head.vars;

    let tableHTML = `
        <div style="overflow-x: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #e8f4fd; border-radius: 5px;">
                <h4 style="margin: 0 0 5px 0; color: #2c3e50;">Question analysée :</h4>
                <p style="margin: 0; font-style: italic;">${currentQuery?.questionText || 'Question non spécifiée'}</p>
            </div>
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

    if (!currentData || !currentData.results || !currentData.results.bindings) {
        displayDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 5px;">
                <p>Aucune donnée à visualiser</p>
                <p style="color: #666;">Sélectionnez une question et lancez une recherche d'abord</p>
            </div>
        `;
        return;
    }

    // Bouton d'export
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
                📥 Exporter PNG
            </button>
            <span style="margin-left: 15px; color: #666;">
                📊 ${currentData.results.bindings.length} relations • 
                🎯 ${currentQuery?.questionText?.substring(0, 50)}...
            </span>
        </div>
    `;

    try {
        // Afficher le loading pendant le parsing
        displayDiv.innerHTML = exportButton + `
            <div id="graph-container">
                <div style="text-align: center; padding: 40px;">
                    <div style="
                        width: 40px; height: 40px; 
                        border: 4px solid #f3f3f3; 
                        border-top: 4px solid #667eea; 
                        border-radius: 50%; 
                        animation: spin 1s linear infinite; 
                        margin: 0 auto 20px;
                    "></div>
                    <p>🎨 Génération du graphique...</p>
                </div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;

        console.log("🎨 Début génération graphique...");
        console.log("📊 Données brutes:", currentData);

        let parsedData;

        if (typeof SPARQLDataParser !== 'undefined' && typeof SPARQLDataParser.parse === 'function') {
            console.log("✅ SPARQLDataParser disponible, parsing...");
            const parseStartTime = Date.now();

            parsedData = SPARQLDataParser.parse(currentData);

            const parseTime = Date.now() - parseStartTime;
            console.log(`⏱️ Temps de parsing: ${parseTime}ms`);
            console.log("📊 Données parsées - structure:", Object.keys(parsedData));

            if (parsedData.networkData) {
                console.log("🕸️ Réseau créé:");
                console.log("   - Nœuds:", parsedData.networkData.nodes?.length || 0);
                console.log("   - Liens:", parsedData.networkData.links?.length || 0);
            }
        } else {
            console.warn("⚠️ SPARQLDataParser non disponible, données brutes utilisées");
        }

        // Vérifier que les données parsées ont la bonne structure
        if (!parsedData.networkData || !parsedData.networkData.nodes) {
            throw new Error("Les données parsées n'ont pas la structure réseau attendue");
        }

        console.log("📈 Réseau créé:", {
            nodes: parsedData.networkData.nodes.length,
            links: parsedData.networkData.links.length
        });

        setTimeout(() => {
            const graphContainer = document.getElementById('graph-container');

            // Nettoyer le loading
            graphContainer.innerHTML = '';

            // Créer le graphique avec les bonnes données
            if (typeof GraphRenderer !== 'undefined') {
                console.log("✅ GraphRenderer trouvé, rendu...");
                const renderer = new GraphRenderer(graphContainer, parsedData);
                renderer.render();

            } else if (typeof OntologyGraphComponent !== 'undefined') {
                console.log("✅ OntologyGraphComponent trouvé, rendu...");
                const graphComponent = new OntologyGraphComponent(graphContainer, parsedData);
                graphComponent.render();

            } else {
                console.log("⚠️ Composants graphiques non trouvés, graphique D3 simple...");
                createAdvancedD3Graph(graphContainer, parsedData);
            }

            console.log("✅ Graphique rendu avec succès !");
        }, 100);

        // Événement d'export
        setTimeout(() => {
            const exportBtn = document.getElementById('exportGraph');
            if (exportBtn) {
                exportBtn.onclick = () => exportGraphToPNG();
            }
        }, 200);

    } catch (error) {
        console.error('❌ Erreur graphique:', error);
        displayDiv.innerHTML = `
            <div style="padding: 20px; background: #ffebee; border: 1px solid #ffcdd2; border-radius: 5px;">
                <h4>❌ Erreur lors de l'affichage du graphique</h4>
                <p><strong>Détails:</strong> ${error.message}</p>
                <p><strong>Données disponibles:</strong> ${currentData.results?.bindings?.length || 0} résultats</p>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #666;">🔍 Détails techniques</summary>
                    <pre style="background: #f5f5f5; padding: 10px; margin-top: 10px; font-size: 12px; overflow-x: auto;">
Structure attendue: { networkData: { nodes: [...], links: [...] } }
Structure reçue: ${JSON.stringify(Object.keys(currentData), null, 2)}
Variables SPARQL: ${JSON.stringify(currentData.head?.vars, null, 2)}
                    </pre>
                </details>
                <div style="margin-top: 15px;">
                    <button onclick="displayTableView()" style="
                        background: #28a745; color: white; border: none; 
                        padding: 8px 16px; border-radius: 4px; cursor: pointer;
                    ">📊 Voir en tableau</button>
                </div>
            </div>
        `;
    }
}



function createManualNetworkData(rawData) {
    console.log("🔧 Création manuelle des données réseau...");

    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    rawData.results.bindings.forEach((binding, index) => {
        const vi = binding.vi?.value || `facteur_${index}`;
        const vd = binding.vd?.value || `acad_${index}`;
        const relation = binding.resultatRelation?.value || 'unknown';

        // Créer nœud VI
        const viId = `vi_${vi}`;
        if (!nodeMap.has(viId)) {
            nodes.push({
                id: viId,
                label: vi,
                type: 'factor',
                size: 15,
                color: '#1565C0'
            });
            nodeMap.set(viId, true);
        }

        // Créer nœud VD
        const vdId = `vd_${vd}`;
        if (!nodeMap.has(vdId)) {
            nodes.push({
                id: vdId,
                label: vd,
                type: 'acad',
                size: 15,
                color: '#C62828'
            });
            nodeMap.set(vdId, true);
        }

        // Créer lien
        links.push({
            source: viId,
            target: vdId,
            relation: relation,
            label: relation,
            color: relation === '+' ? '#E53E3E' : relation === '-' ? '#38A169' : '#718096'
        });
    });

    console.log(`🏗️ Réseau manuel créé: ${nodes.length} nœuds, ${links.length} liens`);

    return {
        networkData: { nodes, links },
        variables: rawData.head.vars,
        data: rawData.results.bindings
    };
}

function createSimpleD3Graph(container, data) {
    console.log("🎨 Création graphique D3 simple...");

    // Nettoyer le container
    d3.select(container).selectAll("*").remove();

    const width = 800;
    const height = 600;

    // Créer l'SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('border', '1px solid #ddd')
        .style('border-radius', '8px');

    // Ajouter un message temporaire
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('fill', '#666')
        .text('🎨 Graphique simple en développement...');

    // Statistiques des données
    const resultCount = data.results?.bindings?.length || 0;
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#999')
        .text(`📊 ${resultCount} relations trouvées`);

    console.log("✅ Graphique D3 simple créé");
}

function exportGraphToPNG() {
    console.log('📥 Export PNG demandé...');

    try {
        const graphContainer = document.getElementById('graph-container');
        const svg = graphContainer.querySelector('svg');

        if (svg) {
            // Créer un canvas pour l'export
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Définir la taille
            canvas.width = svg.getAttribute('width') || 800;
            canvas.height = svg.getAttribute('height') || 600;

            // Fond blanc
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Convertir SVG en image
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = function () {
                ctx.drawImage(img, 0, 0);

                // Télécharger
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `competence_graph_${currentQuery?.questionId || 'unknown'}_${timestamp}.png`;

                canvas.toBlob(function (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                    URL.revokeObjectURL(svgUrl);

                    console.log(`✅ Graphique exporté: ${filename}`);
                });
            };
            img.src = svgUrl;

        } else {
            throw new Error("Aucun SVG trouvé à exporter");
        }

    } catch (error) {
        console.error('❌ Erreur export PNG:', error);
        alert(`Erreur lors de l'export : ${error.message}`);
    }
}


function displaySparqlView() {
    const displayDiv = document.getElementById('result-display');

    const sparqlHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
            <div style="margin-bottom: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Question analysée :</h4>
                <p style="margin: 0; font-weight: 500; color: #34495e;">${currentQuery?.questionText || 'Question non spécifiée'}</p>
                <p style="margin: 5px 0 0 0; font-style: italic; color: #666;">${currentQuery?.description || ''}</p>
            </div>
            
            <h4>Résultats JSON :</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; max-height: 400px; white-space: pre-wrap;">${JSON.stringify(currentData, null, 2)}</pre>
        </div>
    `;

    displayDiv.innerHTML = sparqlHTML;
}

function exportCompetenceAnalysis(data, questionContext) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `competence_${questionContext.questionId}_${timestamp}.json`;

    const exportData = {
        metadata: {
            questionId: questionContext.questionId,
            questionText: questionContext.questionText,
            description: questionContext.description,
            timestamp: new Date().toISOString(),
            resultCount: data.results?.bindings?.length || 0
        },
        results: data,
        analysis: {
            summary: `Analyse de ${data.results?.bindings?.length || 0} relations pour la question de compétence`
        }
    };

    // Créer et télécharger le fichier
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`📥 Analyse de compétence exportée: ${filename}`);
}

// Debug global
window.competenceDebug = {
    getCurrentData: () => currentData,
    getCurrentQuery: () => currentQuery,
    testFunction: () => console.log("✅ competence-page.js fonctionne !")
};
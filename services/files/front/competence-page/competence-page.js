let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script competence-page chargé !");

document.addEventListener('DOMContentLoaded', async function () {

    const excelPaths = [
        './data/IA-DAS-Data1.xlsx',
        './../data/IA-DAS-Data1.xlsx'
    ];

    let excelLoaded = false;
    for (const excelPath of excelPaths) {
        try {

            if (window.csvLoader && typeof window.csvLoader.loadExcelData === 'function') {
                const excelData = await window.csvLoader.loadExcelData(excelPath);
                if (excelData && excelData.length > 0) {
                    excelLoaded = true;
                    break;
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
        } catch (error) {
        }
    }

    if (!excelLoaded) {
        console.error(" Aucun fichier Excel trouvé !");
    }

    // Configurer les boutons d'export au chargement
    setupInitialExportButtons();

    // Attendre que le composant soit initialisé
    setTimeout(() => {
        console.log(" Recherche du composant compétence...");

        const competenceComponent = document.querySelector('input-competence-component');
        if (competenceComponent) {
            console.log("Composant compétence trouvé, ajout du listener !");

            competenceComponent.addEventListener('search', (event) => {
                console.log("=== ÉVÉNEMENT COMPÉTENCE REÇU ===");
                console.log("Données:", event.detail);
                rechercherCompetence(event.detail);
            });
        } else {
            console.log(" Composant compétence non trouvé dans le DOM");
        }
    }, 500);
});

function setupInitialExportButtons() {
    // Configurer les événements des boutons d'export
    const exportPNGBtn = document.getElementById('exportPNG');
    if (exportPNGBtn) {
        exportPNGBtn.onclick = () => exportGraphToPNG();
    }
    
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.onclick = () => exportToExcel();
    }
    
    const exportTurtleBtn = document.getElementById('exportTurtle');
    if (exportTurtleBtn) {
        exportTurtleBtn.onclick = () => exportToTurtle();
    }
}

async function rechercherCompetence(data) {
    console.log(" ===============================================");
    console.log(" DÉBUT RECHERCHE COMPÉTENCE - DEBUG COMPLET");
    console.log(" ===============================================");
    console.log(" Timestamp:", new Date().toISOString());
    
    // ===== DEBUG ENVIRONNEMENT =====
    console.log(" === ANALYSE ENVIRONNEMENT ===");
    console.log("   window.location.href:", window.location.href);
    console.log("   window.location.hostname:", window.location.hostname);
    console.log("   window.location.port:", window.location.port);
    console.log("   window.location.protocol:", window.location.protocol);
    
    // ===== DÉTECTION URL API =====
    console.log("🔧 === DÉTECTION URL API ===");
    const hostname = window.location.hostname;
    let apiUrl;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        apiUrl = 'http://localhost:8003';
        console.log("   ENVIRONNEMENT: LOCAL");
        console.log("   URL API CHOISIE:", apiUrl);
    } else {
        apiUrl = `http://${hostname}:8003`;
        console.log("   ENVIRONNEMENT: DISTANT");
        console.log("   Hostname détecté:", hostname);
        console.log("   URL API CONSTRUITE:", apiUrl);
    }
    
    // ===== VALIDATION DONNÉES ENTRÉE =====
    console.log(" === VALIDATION DONNÉES ENTRÉE ===");
    console.log("   Données reçues:", JSON.stringify(data, null, 2));
    
    if (!data.questionId) {
        console.error(" ERREUR CRITIQUE: questionId manquant !");
        throw new Error("Question ID manquant");
    }
    console.log("    questionId présent:", data.questionId);
    console.log("   questionText:", data.questionText?.substring(0, 100) + "...");
    
    // ===== CONSTRUCTION PAYLOAD =====
    const payload = {
        queryType: 'predefined_competence',
        questionId: data.questionId,
        questionText: data.questionText,
        description: data.description
    };
   
  
    
    try {
        // ===== TEST CONNECTIVITÉ RÉSEAU =====
       
        
        const startTime = Date.now();
        
      
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const requestTime = Date.now() - startTime;
        console.log(" === RÉPONSE REÇUE ===");
        console.log("    Temps requête:", requestTime, "ms");
        console.log("    Status:", response.status);
        console.log("    Status Text:", response.statusText);
        console.log("    OK:", response.ok);
        console.log("    Headers:", [...response.headers.entries()]);
        console.log("    Heure réception:", new Date().toLocaleTimeString());
        
        // ===== ANALYSE STATUS HTTP =====
        if (!response.ok) {
            console.error(" === ERREUR HTTP ===");
            console.error("   Status:", response.status);
            console.error("   Status Text:", response.statusText);
            
            let errorText;
            try {
                errorText = await response.text();
                console.error("   Réponse serveur:", errorText);
            } catch (e) {
                console.error("   Impossible de lire réponse serveur:", e);
                errorText = "Erreur inconnue";
            }
            
            // Diagnostics spécifiques selon le code d'erreur
            switch (response.status) {
                case 404:
                    console.error(" DIAGNOSTIC: Endpoint non trouvé - Vérifiez que l'API tourne sur", apiUrl);
                    break;
                case 500:
                    console.error(" DIAGNOSTIC: Erreur serveur - Vérifiez les logs du serveur SPARQL");
                    break;
                case 502:
                    console.error(" DIAGNOSTIC: Bad Gateway - Le serveur est peut-être arrêté");
                    break;
                case 503:
                    console.error(" DIAGNOSTIC: Service indisponible - Le serveur est surchargé");
                    break;
                default:
                    console.error(" DIAGNOSTIC: Erreur inconnue - Vérifiez la connectivité réseau");
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // ===== PARSING RÉPONSE =====
     
        let responseData;
        try {
            const responseText = await response.text();
          
            responseData = JSON.parse(responseText);
            console.log("    JSON parsé avec succès");
        } catch (parseError) {
            console.error(" ERREUR PARSING JSON:", parseError);
            console.error("   Contenu reçu:", await response.text());
            throw new Error(`Erreur parsing JSON: ${parseError.message}`);
        }
        
        // ===== ANALYSE RÉPONSE =====
        console.log("== ANALYSE RÉPONSE SERVEUR ===");
        console.log("    Type réponse:", typeof responseData);
        console.log("    Clés principales:", Object.keys(responseData));
        
        if (responseData.results) {
            console.log("    Structure results:", Object.keys(responseData.results));
            console.log("    Nombre résultats:", responseData.results.bindings?.length || 0);
            
            if (responseData.results.bindings?.length > 0) {
                console.log("    Premier résultat:", responseData.results.bindings[0]);
                console.log("    Variables disponibles:", responseData.head?.vars);
            }
        }
        
        if (responseData.error) {
            console.error("    Erreur dans réponse:", responseData.error);
        }
        
        if (responseData.performance) {
            console.log("    Performance:", responseData.performance);
        }
        
        // ===== PARSING DONNÉES RÉSEAU =====
        console.log(" === PARSING DONNÉES RÉSEAU ===");
        let parsedData = responseData;
        
        if (window.SPARQLDataParser && typeof window.SPARQLDataParser.parse === 'function') {
            console.log("    SPARQLDataParser disponible");
            try {
                const parseStartTime = Date.now();
                parsedData = window.SPARQLDataParser.parse(responseData);
                const parseTime = Date.now() - parseStartTime;
                
                console.log("    Parsing réussi en", parseTime, "ms");
                console.log("    Structure parsée:", Object.keys(parsedData));
                
                if (parsedData.networkData) {
                    console.log("    Réseau créé:");
                    console.log("      - Nœuds:", parsedData.networkData.nodes?.length || 0);
                    console.log("      - Liens:", parsedData.networkData.links?.length || 0);
                }
            } catch (parseError) {
                console.error("    Erreur parsing réseau:", parseError);
                console.log("    Utilisation données brutes");
            }
        } else {
            console.warn("   SPARQLDataParser non disponible");
        }
        
        // ===== AFFICHAGE RÉSULTATS =====
        console.log(" === AFFICHAGE RÉSULTATS ===");
        hideSimpleLoading();
        console.log("    Loading masqué");
        
        displayCompetenceResults(parsedData, data);
        console.log("    Résultats affichés");
        
        // ===== SUCCÈS FINAL =====
        const totalTime = Date.now() - startTime;
        console.log("===============================================");
        console.log(" RECHERCHE COMPÉTENCE RÉUSSIE !");
        console.log(" ===============================================");
        console.log(" Temps total:", totalTime, "ms");
        console.log(" Résultats:", responseData.results?.bindings?.length || 0);
        console.log(" Fin:", new Date().toLocaleTimeString());
        
    } catch (error) {
        // ===== GESTION ERREUR COMPLÈTE =====
        
        // ===== DIAGNOSTICS AUTOMATIQUES =====
        console.error(" === DIAGNOSTICS AUTOMATIQUES ===");
        
        if (error.message.includes("Failed to fetch")) {
            console.error("    DIAGNOSTIC: Problème de connectivité réseau");
            console.error("    SOLUTIONS POSSIBLES:");
            console.error("      - Vérifiez que le serveur tourne sur", apiUrl);
            console.error("      - Vérifiez que le port 8003 est ouvert");
            console.error("      - Vérifiez les règles firewall/sécurité AWS");
            console.error("      - Testez manuellement:", apiUrl);
        } else if (error.message.includes("JSON")) {
            console.error("   DIAGNOSTIC: Problème de format de réponse");
            console.error("    Le serveur ne renvoie pas du JSON valide");
        } else if (error.message.includes("HTTP")) {
            console.error("    DIAGNOSTIC: Erreur serveur HTTP");
            console.error("    Vérifiez les logs du serveur");
        }
        
        hideSimpleLoading();
        showError('Erreur de recherche compétence', error.message, data);
        
        console.error(" === FIN GESTION ERREUR ===");
        throw error; // Re-lancer pour debugging
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

    // Activer les boutons de contrôle et d'export
    enableResultControls();

    // Afficher en mode tableau par défaut
    displayTableView();
}

function enableResultControls() {
    // Activer tous les boutons de contrôle
    document.getElementById('viewTable').disabled = false;
    document.getElementById('viewGraph').disabled = false;
    document.getElementById('viewSparql').disabled = false;
    document.getElementById('exportPNG').disabled = false;
    document.getElementById('exportExcel').disabled = false;
    document.getElementById('exportTurtle').disabled = false;
    
    // Configurer les événements si pas déjà fait
    setupViewButtons();
}

// Fonctions d'affichage (inchangées)
function setupViewButtons() {
    document.getElementById('viewTable').onclick = () => switchView('table');
    document.getElementById('viewGraph').onclick = () => switchView('graph');
    document.getElementById('viewSparql').onclick = () => switchView('sparql');
    
    // Event handlers pour les boutons d'export
    const exportPNGBtn = document.getElementById('exportPNG');
    if (exportPNGBtn) {
        exportPNGBtn.onclick = () => exportGraphToPNG();
    }
    
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.onclick = () => exportToExcel();
    }
    
    const exportTurtleBtn = document.getElementById('exportTurtle');
    if (exportTurtleBtn) {
        exportTurtleBtn.onclick = () => exportToTurtle();
    }
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
            
            // Détecter si c'est un ID d'analyse et le rendre cliquable
            let cellContent = displayValue;
            if (isAnalysisId(variable, displayValue)) {
                cellContent = `<a href="#" onclick="openAnalysisPanelFromTable('${displayValue}', event)" 
                    style="color: #2980b9; text-decoration: underline; cursor: pointer;">
                    ${displayValue}
                </a>`;
            }
            
            tableHTML += `<td style="
                border: 1px solid #ddd; 
                padding: 4px 8px;
                vertical-align: top;
                word-break: break-word;
                max-width: 200px;
            ">${cellContent}</td>`;
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

// Fonction pour détecter si une valeur est un ID d'analyse
function isAnalysisId(variableName, value) {
    if (!value) return false;
    
    // Détecter par nom de variable
    const analysisVarNames = ['analysis', 'analysisId', 'analysis_id', 'id', 'Analysis_ID'];
    if (analysisVarNames.some(name => variableName.toLowerCase().includes(name.toLowerCase()))) {
        return true;
    }
    
    // Détecter par format de valeur (ex: A001, A123, Analysis_1, etc.)
    if (typeof value === 'string') {
        return /^(A\d+|Analysis_?\d+|\d+)$/i.test(value.trim());
    }
    
    return false;
}

// Fonction pour ouvrir le panneau d'analyse depuis le tableau
async function openAnalysisPanelFromTable(analysisId, event) {
    event.preventDefault();
    console.log('🔍 Ouverture panneau pour analyse:', analysisId);
    
    try {
        // Vérifier que les services sont disponibles
        if (typeof window.analysisPanel === 'undefined') {
            console.error('AnalysisPanel non disponible !');
            alert('Erreur: Le panneau d\'analyse n\'est pas disponible.');
            return;
        }
        
        if (typeof window.fusekiRetriever === 'undefined') {
            console.error('FusekiAnalysisRetriever non disponible !');
            alert('Erreur: Le système de récupération des données n\'est pas disponible.');
            return;
        }
        
        // Nettoyer l'ID d'analyse (extraire depuis URI si nécessaire)
        let cleanAnalysisId = analysisId;
        if (analysisId.includes('#')) {
            cleanAnalysisId = analysisId.split('#').pop();
        } else if (analysisId.includes('/')) {
            cleanAnalysisId = analysisId.split('/').pop();
        }
        
        console.log('🔍 DEBUG: ID nettoyé:', cleanAnalysisId);
        
        // Créer un objet nodeData factice avec l'ID d'analyse
        const nodeData = {
            label: `Analyse ${cleanAnalysisId}`,
            analyses: [cleanAnalysisId],
            type: 'analysis_link'
        };
        
        // Récupérer les données d'analyse via Fuseki
        const analysisData = await window.fusekiRetriever.getAllAnalysesData(nodeData);
        
        // Ouvrir le panneau avec les données
        window.analysisPanel.openMultipleAnalyses(`Analyse ${analysisId}`, analysisData);
        
        console.log('✅ Panneau ouvert avec succès');
        
    } catch (error) {
        console.error('❌ Erreur ouverture panneau:', error);
        alert(`Erreur lors de l'ouverture du panneau d'analyse: ${error.message}`);
    }
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

    // Info sur les données seulement
    const dataInfo = `
        <div style="margin-bottom: 15px; color: #666;">
            ${currentData.results.bindings.length} relations • 
            ${currentQuery?.questionText?.substring(0, 50)}...
        </div>
    `;

    try {
        // Afficher le loading pendant le parsing
        displayDiv.innerHTML = dataInfo + `
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

        console.log(" Début génération graphique...");
        console.log(" Données brutes:", currentData);

        let parsedData;

        if (typeof SPARQLDataParser !== 'undefined' && typeof SPARQLDataParser.parse === 'function') {
            console.log(" SPARQLDataParser disponible, parsing...");
            const parseStartTime = Date.now();

            parsedData = SPARQLDataParser.parse(currentData);

            const parseTime = Date.now() - parseStartTime;
            console.log(` Temps de parsing: ${parseTime}ms`);
            console.log(" Données parsées - structure:", Object.keys(parsedData));

            if (parsedData.networkData) {
                
            }
        } else {
            console.warn(" SPARQLDataParser non disponible, données brutes utilisées");
        }

        // Vérifier que les données parsées ont la bonne structure
        if (!parsedData.networkData || !parsedData.networkData.nodes) {
            throw new Error("Les données parsées n'ont pas la structure réseau attendue");
        }

       

        setTimeout(() => {
            const graphContainer = document.getElementById('graph-container');

            // Nettoyer le loading
            graphContainer.innerHTML = '';

            // Créer le graphique avec les bonnes données
            if (typeof GraphRenderer !== 'undefined') {
                const renderer = new GraphRenderer(graphContainer, parsedData);
                renderer.render();

            } else if (typeof OntologyGraphComponent !== 'undefined') {
                const graphComponent = new OntologyGraphComponent(graphContainer, parsedData);
                graphComponent.render();

            } else {
                createAdvancedD3Graph(graphContainer, parsedData);
            }

        }, 100);

        // Événement d'export
        setTimeout(() => {
            const exportBtn = document.getElementById('exportGraph');
            if (exportBtn) {
                exportBtn.onclick = () => exportGraphToPNG();
            }
            
        }, 200);

    } catch (error) {
        console.error(' Erreur graphique:', error);
        displayDiv.innerHTML = `
            <div style="padding: 20px; background: #ffebee; border: 1px solid #ffcdd2; border-radius: 5px;">
                <h4> Erreur lors de l'affichage du graphique</h4>
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
    console.log(" Création manuelle des données réseau...");

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

    console.log(` Réseau manuel créé: ${nodes.length} nœuds, ${links.length} liens`);

    return {
        networkData: { nodes, links },
        variables: rawData.head.vars,
        data: rawData.results.bindings
    };
}

function createSimpleD3Graph(container, data) {

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
        .text(` ${resultCount} relations trouvées`);

}

function exportGraphToPNG() {

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

                });
            };
            img.src = svgUrl;

        } else {
            throw new Error("Aucun SVG trouvé à exporter");
        }

    } catch (error) {
        console.error(' Erreur export PNG:', error);
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

    console.log(`Analyse de compétence exportée: ${filename}`);
}

// Fonctions d'export simplifiées
function exportToExcel() {
    if (!currentData || !currentData.results || !currentData.results.bindings) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    try {
        const excelData = convertToExcel(currentData);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `competence_data_${currentQuery?.questionId || 'unknown'}_${timestamp}.xlsx`;
        downloadExcelFile(excelData, filename);
        console.log('Export Excel réussi:', filename);
    } catch (error) {
        console.error('Erreur export Excel:', error);
        alert(`Erreur lors de l'export Excel: ${error.message}`);
    }
}

function exportToTurtle() {
    if (!currentData || !currentData.results || !currentData.results.bindings) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    try {
        convertToTurtle(currentData);
        console.log('Export Turtle lancé');
    } catch (error) {
        console.error('Erreur export Turtle:', error);
        alert(`Erreur lors de l'export Turtle: ${error.message}`);
    }
}

function convertToExcel(data) {
    if (!data.results || !data.results.bindings || data.results.bindings.length === 0) {
        // Retourner un workbook vide avec message
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([['Aucune donnée disponible']]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pas de données");
        return workbook;
    }
    
    const bindings = data.results.bindings;
    const variables = data.head.vars;
    
    // Préparer les données pour XLSX
    const worksheetData = [];
    
    // En-têtes
    worksheetData.push(variables);
    
    // Données
    bindings.forEach(binding => {
        const row = variables.map(variable => {
            const value = binding[variable];
            return value ? (value.value || value) : '';
        });
        worksheetData.push(row);
    });
    
    // Créer le workbook et la worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Ajouter la worksheet au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Compétences Export");
    
    return workbook;
}

async function convertToTurtle(data) {
    try {
        // Déterminer l'URL API
        const hostname = window.location.hostname;
        const apiUrl = hostname === 'localhost' || hostname === '127.0.0.1' 
            ? 'http://localhost:8003' 
            : `http://${hostname}:8003`;
        
        const response = await fetch(`${apiUrl}/api/export/turtle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sparqlResults: data,
                metadata: {
                    questionId: currentQuery?.questionId,
                    questionText: currentQuery?.questionText,
                    exportType: 'competence_query'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur serveur: ${response.status}`);
        }
        
        const turtleData = await response.text();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `competence_data_${currentQuery?.questionId || 'unknown'}_${timestamp}.ttl`;
        downloadFile(turtleData, filename, 'text/turtle');
        
    } catch (error) {
        console.error('Erreur export Turtle:', error);
        alert(`Erreur lors de l'export Turtle: ${error.message}`);
    }
}

function downloadExcelFile(workbook, filename) {
    XLSX.writeFile(workbook, filename);
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Debug global
window.competenceDebug = {
    getCurrentData: () => currentData,
    getCurrentQuery: () => currentQuery,
    testFunction: () => console.log(" competence-page.js fonctionne !")
};
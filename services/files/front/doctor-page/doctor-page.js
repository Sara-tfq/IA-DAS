let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script principal chargé !");
document.addEventListener('DOMContentLoaded', async function () {

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

            if (window.csvLoader && typeof window.csvLoader.
                Data === 'function') {
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
            console.log(` Échec chargement ${excelPath}:`, error.message);
        }
    }

    if (!excelLoaded) {
        console.error("Aucun fichier Excel trouvé !");
    }

    // Configurer les boutons d'export au chargement
    setupInitialExportButtons();

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


async function rechercher(data) {
    try {
        const isReady = await window.pageInitializer.ensureReady();
        if (!isReady) {
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

        // Récupérer la requête SPARQL depuis la réponse du serveur
        console.log("Clés disponibles dans responseData:", Object.keys(responseData));
        let sparqlQuery = responseData.query || responseData.sparqlQuery || responseData.generatedQuery || responseData.sparql || null;
        
        // Fallback : chercher dans des structures imbriquées
        if (!sparqlQuery && responseData.metadata) {
            sparqlQuery = responseData.metadata.query || responseData.metadata.sparql || null;
        }
        if (!sparqlQuery && responseData.debug) {
            sparqlQuery = responseData.debug.query || responseData.debug.sparql || null;
        }
        
        console.log("Requête SPARQL récupérée:", sparqlQuery);
        
        displayResults(parsedData, sparqlQuery);
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
    
    // Activer les boutons de contrôle et d'export
    enableResultControls();

    // Afficher en mode tableau par défaut
    displayTableView();
}

function enableResultControls() {
    // Activer tous les boutons de contrôle (avec vérification d'existence)
    const viewTable = document.getElementById('viewTable');
    const viewGraph = document.getElementById('viewGraph');
    const viewSparql = document.getElementById('viewSparql');
    const exportPNG = document.getElementById('exportPNG');
    const exportExcel = document.getElementById('exportExcel');
    const exportTurtle = document.getElementById('exportTurtle');
    
    if (viewTable) viewTable.disabled = false;
    if (viewGraph) viewGraph.disabled = false;
    if (viewSparql) viewSparql.disabled = false;
    if (exportPNG) exportPNG.disabled = false;
    if (exportExcel) exportExcel.disabled = false;
    if (exportTurtle) exportTurtle.disabled = false;
    
    // Configurer les événements si pas déjà fait
    setupViewButtons();
}

function setupViewButtons() {
    const viewTable = document.getElementById('viewTable');
    const viewGraph = document.getElementById('viewGraph');
    const viewSparql = document.getElementById('viewSparql');
    
    if (viewTable) viewTable.onclick = () => switchView('table');
    if (viewGraph) viewGraph.onclick = () => switchView('graph');
    if (viewSparql) viewSparql.onclick = () => switchView('sparql');
    
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
    console.log('🔍 DEBUG: Ouverture panneau pour analyse:', analysisId);
    
    try {
        // Vérifier que les services sont disponibles
        if (typeof window.analysisPanel === 'undefined') {
            console.error('❌ AnalysisPanel non disponible !');
            alert('Erreur: Le panneau d\'analyse n\'est pas disponible.');
            return;
        }
        
        if (typeof window.fusekiRetriever === 'undefined') {
            console.error('❌ FusekiAnalysisRetriever non disponible !');
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
        
        // Enlever le préfixe "Analysis_" s'il existe déjà
        if (cleanAnalysisId.startsWith('Analysis_')) {
            cleanAnalysisId = cleanAnalysisId.replace('Analysis_', '');
        }
        
        console.log('🔍 DEBUG: ID final:', cleanAnalysisId);
        
        // Créer un objet nodeData factice avec l'ID d'analyse
        const nodeData = {
            label: `Analyse ${cleanAnalysisId}`,
            analyses: [cleanAnalysisId],
            type: 'analysis_link'
        };
        
        console.log('🔍 DEBUG: nodeData créé:', nodeData);
        
        // Récupérer les données d'analyse via Fuseki
        console.log('🔍 DEBUG: Appel getAllAnalysesData...');
        const analysisData = await window.fusekiRetriever.getAllAnalysesData(nodeData);
        console.log('🔍 DEBUG: analysisData reçu:', analysisData);
        console.log('🔍 DEBUG: Nombre d\'analyses:', analysisData.length);
        
        if (!analysisData || analysisData.length === 0) {
            console.warn('⚠️ Aucune donnée d\'analyse récupérée');
            alert('Aucune donnée trouvée pour cette analyse.');
            return;
        }
        
        // Ouvrir le panneau avec les données
        console.log('🔍 DEBUG: Ouverture du panneau...');
        window.analysisPanel.openMultipleAnalyses(`Analyse ${analysisId}`, analysisData);
        
        console.log('✅ Panneau ouvert avec succès');
        
    } catch (error) {
        console.error('❌ ERREUR ouverture panneau:', error);
        console.error('❌ Stack:', error.stack);
        alert(`Erreur lors de l'ouverture du panneau d'analyse: ${error.message}`);
    }
}

// Fonctions d'export simplifiées
function exportToExcel() {
    if (!currentData || !currentData.results || !currentData.results.bindings) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    try {
        console.log('Export Excel...');
        const excelData = convertToExcel(currentData.results.bindings, currentData.head.vars);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        downloadExcelFile(excelData, `IA-DAS-Export-${timestamp}.xlsx`);
        console.log('Export Excel réussi');
    } catch (error) {
        console.error('Erreur export Excel:', error);
        alert(`Erreur lors de l'export Excel: ${error.message}`);
    }
}

async function exportToTurtle() {
    if (!currentData || !currentData.results || !currentData.results.bindings) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    try {
        console.log('Export Turtle...');
        const turtleContent = await convertToTurtle(currentData);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        downloadFile(turtleContent, `IA-DAS-Export-${timestamp}.ttl`, 'text/turtle');
        console.log('Export Turtle réussi');
    } catch (error) {
        console.error('Erreur export Turtle:', error);
        alert(`Erreur lors de l'export Turtle: ${error.message}`);
    }
}

// Convertir les données SPARQL en Excel
function convertToExcel(bindings, variables) {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "IA-DAS Export");
    
    return workbook;
}

// Télécharger un fichier Excel
function downloadExcelFile(workbook, filename) {
    XLSX.writeFile(workbook, filename);
}

// Convertir les données SPARQL en Turtle (via backend)
async function convertToTurtle(sparqlData) {
    const response = await fetch('/api/export/turtle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sparqlData)
    });

    if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
    }

    return await response.text();
}

// Télécharger un fichier
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`Fichier téléchargé: ${filename}`);
}

async function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function addLogoToCanvas(originalCanvas) {
    return new Promise((resolve, reject) => {
        const logoPath = './../assets/logo_IA-DAS-No-Background.png'; 
        const logoImg = new Image();
        
        logoImg.onload = () => {
            try {
                const finalCanvas = document.createElement('canvas');
                const ctx = finalCanvas.getContext('2d');
                
                const margin = 40;
                const maxLogoSize = 300; 
                const padding = 150;
                
                // Calculer les dimensions du logo en respectant les proportions
                const logoRatio = logoImg.width / logoImg.height;
                let logoWidth, logoHeight;
                
                if (logoRatio > 1) {
                    // Logo plus large que haut
                    logoWidth = maxLogoSize;
                    logoHeight = maxLogoSize / logoRatio;
                } else {
                    // Logo plus haut que large
                    logoHeight = maxLogoSize;
                    logoWidth = maxLogoSize * logoRatio;
                }
                
                finalCanvas.width = originalCanvas.width + margin;
                finalCanvas.height = originalCanvas.height + margin;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                
                ctx.drawImage(originalCanvas, margin/2, margin/2);
                
                const logoX = finalCanvas.width - logoWidth - padding;
                const logoY = padding;
                
                const logoBgPadding = 15;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(
                    logoX - logoBgPadding, 
                    logoY - logoBgPadding, 
                    logoWidth + (logoBgPadding * 2), 
                    logoHeight + (logoBgPadding * 2)
                );
                
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    logoX - logoBgPadding, 
                    logoY - logoBgPadding, 
                    logoWidth + (logoBgPadding * 2), 
                    logoHeight + (logoBgPadding * 2)
                );
                
                ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
                
                resolve(finalCanvas);
                
            } catch (err) {
                reject(err);
            }
        };
        
        logoImg.onerror = () => {
            console.warn('Logo non trouvé, export sans logo');
            resolve(originalCanvas);
        };
        
        logoImg.src = logoPath;
    });
}

function downloadCanvas(canvas, filename) {
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });
}

async function exportGraphToPNG() {
    try {
        const graphContainer = document.getElementById('graph-container');
        if (!graphContainer) {
            alert('Aucun graphique à exporter');
            return;
        }

        console.log('Début de l\'export PNG...');
        
        await loadHtml2Canvas();
        
        const canvas = await html2canvas(graphContainer, {
            scale: 6, 
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: graphContainer.scrollWidth,
            height: graphContainer.scrollHeight
        });

        console.log('Graphique capturé, ajout du logo...');
        
        const finalCanvas = await addLogoToCanvas(canvas);
        
        console.log('Logo ajouté, téléchargement...');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `graph_export_${timestamp}.png`;
        
        downloadCanvas(finalCanvas, filename);
        
    } catch (error) {
        console.error('Erreur export PNG:', error);
        alert(`Erreur lors de l'export PNG: ${error.message}`);
    }
}
function displayGraphView() {
    const displayDiv = document.getElementById('result-display');

    try {
        const template = document.getElementById('graph-view-template');
        const clone = template.content.cloneNode(true);

        displayDiv.innerHTML = '';
        displayDiv.appendChild(clone);

        const controls = document.getElementById('result-controls');
        // Ajouter export PNG (image) seulement pour la vue graphique
        if (controls && !document.getElementById('exportGraph')) {
            const imageExportTemplate = document.getElementById('export-image-template');
            const imageExportClone = imageExportTemplate.content.cloneNode(true);
            controls.appendChild(imageExportClone);
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
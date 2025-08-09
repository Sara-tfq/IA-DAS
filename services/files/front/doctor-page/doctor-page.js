let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script principal chargé !");

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Page prête !");
    
    // ✅ CHANGEMENT : Utiliser des chemins Excel au lieu de CSV
    const excelPaths = [
        './data/IA-DAS-Data1.xlsx',     // ✅ Nouveau chemin Excel
        './../data/IA-DAS-Data1.xlsx'   // ✅ Chemin alternatif
    ];
    
    let excelLoaded = false;
    for (const excelPath of excelPaths) {
        try {
            console.log(`🔍 Tentative chargement Excel: ${excelPath}`);
            
            // ✅ CHANGEMENT : Utiliser window.csvLoader (qui pointe vers ExcelLoader)
            if (window.csvLoader && typeof window.csvLoader.loadExcelData === 'function') {
                const excelData = await window.csvLoader.loadExcelData(excelPath);
                if (excelData && excelData.length > 0) {
                    console.log(`✅ Excel chargé avec succès: ${excelData.length} analyses depuis ${excelPath}`);
                    excelLoaded = true;
                    break;
                }
            } else {
                console.log(`⏳ ExcelLoader pas encore disponible, attente...`);
                // Attendre que ExcelLoader soit disponible
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
        } catch (error) {
            console.log(`❌ Échec chargement ${excelPath}:`, error.message);
        }
    }
    
    if (!excelLoaded) {
        console.error("❌ Aucun fichier Excel trouvé ! Vérifiez le nom et l'emplacement du fichier.");
        console.log("📁 Fichiers tentés:", excelPaths);
        console.log("💡 Astuce: Assurez-vous d'avoir converti IA-DAS-Data1.csv en IA-DAS-Data1.xlsx");
    }
    
    // Attendre un peu que le composant soit initialisé
    setTimeout(() => {
        const component = document.querySelector('input-intorregation-component');
        if (component) {
            console.log("Composant trouvé, ajout du listener !");
            
            component.addEventListener('search', (event) => {
                console.log("=== ÉVÉNEMENT REÇU DANS LA PAGE PRINCIPALE ===");
                console.log("Données reçues:", event.detail);
                
                // Appeler la recherche
                rechercher(event.detail);
            });
        } else {
            console.log("Composant non trouvé !");
        }
    }, 100);
});

// Fonction pour les requêtes prédéfinies
async function rechercher(data) {
    console.log("=== RECHERCHE APPELÉE ===");
    console.log("Données:", data);
    
    let payload;
    
    if (data.queryType === 'raw_sparql') {
        payload = {
            queryType: 'raw_sparql',
            rawSparqlQuery: data.rawSparqlQuery
        };
    } else {
        payload = {
            queryType: 'generated',
            ...(data.gender && { gender: data.gender }),
            ...(data.minAge && { minAge: parseInt(data.minAge) }),
            ...(data.sportLevel && { sportLevel: data.sportLevel }),
            ...(data.relationDirection && { relationDirection: data.relationDirection }),
            ...(data.variableType && { variableType: data.variableType }),
            ...(data.selectedVI && { selectedVI: data.selectedVI }),
            ...(data.selectedVD && { selectedVD: data.selectedVD }),
            ...(data.categoryVI && { categoryVI: data.categoryVI }),
            ...(data.categoryVD && { categoryVD: data.categoryVD }),
            ...(data.factorType && { factorType: data.factorType }),
            ...(data.factorCategory && { factorCategory: data.factorCategory }),
            ...(data.sportType && { sportType: data.sportType }),
            ...(data.experienceYears && { experienceYears: data.experienceYears }),
            ...(data.practiceFrequency && { practiceFrequency: data.practiceFrequency })
        };
    }
    
    console.log("Payload à envoyer:", payload);
    
    try {
        const response = await fetch('http://localhost:8000/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Erreur HTTP " + response.status);

        const data = await response.json();
        console.log("Réponse API:", data);
        
        displayResults(data);
        
    } catch (err) {
        console.error("Erreur API:", err);
        document.getElementById('results').textContent = "Erreur : " + err.message;
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
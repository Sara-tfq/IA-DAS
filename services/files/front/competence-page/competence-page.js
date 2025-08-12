let currentData = null;
let currentQuery = null;
let currentMode = 'table';

console.log("Script competence-page chargé !");

document.addEventListener('DOMContentLoaded', async function() {
    console.log("Page Questions de Compétences prête !");
    
    // Attendre que le composant soit initialisé
    setTimeout(() => {
        const component = document.querySelector('input-competence-component');
        if (component) {
            console.log("Composant de compétences trouvé, ajout du listener !");
            
            component.addEventListener('search', (event) => {
                console.log("=== ÉVÉNEMENT REÇU DANS LA PAGE COMPÉTENCES ===");
                console.log("Données reçues:", event.detail);
                
                // Appeler la recherche
                rechercherCompetence(event.detail);
            });
        } else {
            console.log("Composant de compétences non trouvé !");
        }
    }, 100);
});

// Fonction principale pour les recherches de compétences
async function rechercherCompetence(data) {
    console.log("=== RECHERCHE COMPÉTENCE APPELÉE ===");
    console.log("Données reçues:", data);
    
    const payload = {
        queryType: 'predefined_competence',
        questionId: data.questionId,
        questionText: data.questionText,
        description: data.description
    };
    
    console.log("Payload à envoyer:", payload);
    
    try {
        // Envoyer la requête au serveur SPARQL
        const response = await fetch('http://localhost:8003/api/competence', {  // Nouveau endpoint pour les compétences
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log("Réponse API compétences:", responseData);
        
        // Afficher les statistiques de performance si disponibles
        if (responseData.performance) {
            console.log("📊 Performance:", responseData.performance);
        }
        
        displayResults(responseData, payload);
        
    } catch (err) {
        console.error("❌ Erreur API compétences:", err);
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="color: red; padding: 20px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 5px;">
                    <h4>Erreur de recherche</h4>
                    <p><strong>Message:</strong> ${err.message}</p>
                    <p><strong>Question sélectionnée:</strong> ${data.questionText}</p>
                    <p><strong>Suggestions:</strong></p>
                    <ul>
                        <li>Vérifiez que le serveur SPARQL fonctionne (port 8003)</li>
                        <li>Vérifiez que l'endpoint /api/competence est configuré</li>
                        <li>Consultez la console pour plus de détails</li>
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
                <button id="viewSparql" class="view-btn">SPARQL</button>
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
    
    const exportButton = `
        <div style="margin-bottom: 15px;">
            <button id="exportGraph" style="
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                font-size: 11px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
                📥 Exporter en  PNG
            </button>
        </div>
    `;
    
    try {
        displayDiv.innerHTML = exportButton + '<div id="graph-container"></div>';
        const graphContainer = document.getElementById('graph-container');
        
        // Vérifier si OntologyGraphComponent est disponible
        if (typeof OntologyGraphComponent !== 'undefined') {
            const graphComponent = new OntologyGraphComponent(graphContainer, currentData);
            graphComponent.render();
        } else {
            console.warn('OntologyGraphComponent non disponible');
            displayDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
                    <h4>Graphique temporairement indisponible</h4>
                    <p>Le composant graphique sera disponible prochainement pour les questions de compétences.</p>
                </div>
            `;
        }
        
        // Événement d'export
        const exportBtn = document.getElementById('exportGraph');
        if (exportBtn) {
            exportBtn.onclick = () => exportGraphToPNG();
        }
    } catch (error) {
        console.error('Erreur graphique:', error);
        displayDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #ffebee; border: 1px solid #ffcdd2; border-radius: 5px;">
                <h4>Erreur lors de l'affichage du graphique</h4>
                <p>Détails: ${error.message}</p>
            </div>
        `;
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
            
            <h4>Requête SPARQL générée :</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${currentData?.sparqlQuery || 'Requête non disponible'}</pre>
            
            <h4 style="margin-top: 20px;">Résultats JSON :</h4>
            <pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; max-height: 400px; white-space: pre-wrap;">${JSON.stringify(currentData, null, 2)}</pre>
        </div>
    `;
    
    displayDiv.innerHTML = sparqlHTML;
}

// Fonction d'export du graphique (si disponible)
function exportGraphToPNG() {
    console.log('Export PNG demandé');
    // Cette fonction sera implémentée quand le composant graphique sera adapté
    alert('Fonction d\'export en cours de développement pour les questions de compétences');
}

// Fonction utilitaire pour réinitialiser la page
function resetPage() {
    currentData = null;
    currentQuery = null;
    currentMode = 'table';
    
    const resultsDiv = document.getElementById('results');
    const controlsDiv = document.getElementById('result-controls');
    
    if (controlsDiv) {
        controlsDiv.style.display = 'none';
    }
    
    if (resultsDiv) {
        const displayDiv = document.getElementById('result-display');
        if (displayDiv) {
            displayDiv.innerHTML = '';
        }
    }
    
    // Reset du composant input
    const component = document.querySelector('input-competence-component');
    if (component && typeof component.reset === 'function') {
        component.reset();
    }
}

// Fonctions utilitaires pour débuggage
function logCurrentState() {
    console.log('=== ÉTAT ACTUEL DE LA PAGE ===');
    console.log('currentData:', currentData);
    console.log('currentQuery:', currentQuery);
    console.log('currentMode:', currentMode);
}

// Exposer quelques fonctions globalement pour le debug
window.competencePageDebug = {
    resetPage,
    logCurrentState,
    getCurrentData: () => currentData,
    getCurrentQuery: () => currentQuery
};
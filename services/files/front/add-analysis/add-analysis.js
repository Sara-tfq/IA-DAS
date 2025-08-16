// JavaScript pour le formulaire d'ajout d'analyse
document.addEventListener('DOMContentLoaded', function () {
    console.log('Page d\'ajout d\'analyse chargée');

    const form = document.getElementById('addAnalysisForm');
    const submitBtn = document.getElementById('submitBtn');
    const previewBtn = document.getElementById('previewBtn');

    // Fonction pour remplacer les champs vides par "N.A."
    function replaceEmptyFields() {
        const allInputs = form.querySelectorAll('input, textarea, select');

        allInputs.forEach(input => {
            if (!input.value || input.value.trim() === '') {
                input.value = 'N.A.';
            }
        });
    }

    // Fonction pour collecter toutes les données du formulaire
    function collectFormData() {
        const formData = new FormData(form);
        const data = {};

        // Convertir FormData en objet simple
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim() || 'N.A.';
        }

        console.log('Données collectées:', data);
        return data;
    }

    // Fonction de prévisualisation
    function showPreview() {
        console.log('Prévisualisation demandée');

        // Remplacer les champs vides par "N.A."
        replaceEmptyFields();

        // Collecter les données
        const data = collectFormData();

        // Créer la fenêtre de prévisualisation
        const previewWindow = window.open('', 'preview', 'width=800,height=600,scrollbars=yes');

        const previewHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prévisualisation - Nouvelle analyse</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .section h2 { color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
                .field { margin-bottom: 10px; }
                .field label { font-weight: bold; color: #34495e; }
                .field span { margin-left: 10px; }
                .na { color: #7f8c8d; font-style: italic; }
            </style>
        </head>
        <body>
            <h1>Prévisualisation de la nouvelle analyse</h1>
            
            <div class="section">
                <h2>Article</h2>
                <div class="field"><label>DOI:</label><span class="${data.doi === 'N.A.' ? 'na' : ''}">${data.doi}</span></div>
                <div class="field"><label>Titre:</label><span class="${data.title === 'N.A.' ? 'na' : ''}">${data.title}</span></div>
                <div class="field"><label>Auteurs:</label><span class="${data.authors === 'N.A.' ? 'na' : ''}">${data.authors}</span></div>
                <div class="field"><label>Journal:</label><span class="${data.journal === 'N.A.' ? 'na' : ''}">${data.journal}</span></div>
                <div class="field"><label>Année:</label><span class="${data.year === 'N.A.' ? 'na' : ''}">${data.year}</span></div>
                <div class="field"><label>Pays:</label><span class="${data.country === 'N.A.' ? 'na' : ''}">${data.country}</span></div>
                <div class="field"><label>Type d'étude:</label><span class="${data.studyType === 'N.A.' ? 'na' : ''}">${data.studyType}</span></div>
            </div>
            
            <div class="section">
                <h2>Analyse</h2>
                <div class="field"><label>ID:</label><span class="${data.analysisId === 'N.A.' ? 'na' : ''}">${data.analysisId}</span></div>
                <div class="field"><label>Type:</label><span class="${data.typeOfAnalysis === 'N.A.' ? 'na' : ''}">${data.typeOfAnalysis}</span></div>
                <div class="field"><label>Multiplicité:</label><span class="${data.analysisMultiplicity === 'N.A.' ? 'na' : ''}">${data.analysisMultiplicity}</span></div>
                <div class="field"><label>Taille échantillon:</label><span class="${data.sampleSizeMobilized === 'N.A.' ? 'na' : ''}">${data.sampleSizeMobilized}</span></div>
            </div>
            
            <div class="section">
                <h2>Population</h2>
                <div class="field"><label>Taille totale:</label><span class="${data.sampleSize === 'N.A.' ? 'na' : ''}">${data.sampleSize}</span></div>
                <div class="field"><label>Genre:</label><span class="${data.gender === 'N.A.' ? 'na' : ''}">${data.gender}</span></div>
                <div class="field"><label>Description:</label><span class="${data.population === 'N.A.' ? 'na' : ''}">${data.population}</span></div>
            </div>
            
            <div class="section">
                <h2>Sport</h2>
                <div class="field"><label>Nom:</label><span class="${data.sportName === 'N.A.' ? 'na' : ''}">${data.sportName}</span></div>
                <div class="field"><label>Niveau:</label><span class="${data.sportLevel === 'N.A.' ? 'na' : ''}">${data.sportLevel}</span></div>
            </div>
            
            <div class="section">
                <h2>Variables</h2>
                <h3>Variable Dépendante</h3>
                <div class="field"><label>Nom VD:</label><span class="${data.vdName === 'N.A.' ? 'na' : ''}">${data.vdName}</span></div>
                <div class="field"><label>Catégorie VD:</label><span class="${data.vdCategory === 'N.A.' ? 'na' : ''}">${data.vdCategory}</span></div>
                
                <h3>Variable Indépendante</h3>
                <div class="field"><label>Nom VI:</label><span class="${data.viName === 'N.A.' ? 'na' : ''}">${data.viName}</span></div>
                <div class="field"><label>Catégorie VI:</label><span class="${data.viCategory === 'N.A.' ? 'na' : ''}">${data.viCategory}</span></div>
            </div>
            
            <div class="section">
                <h2>Relations statistiques</h2>
                <div class="field"><label>Coefficient r:</label><span class="${data.degreR === 'N.A.' ? 'na' : ''}">${data.degreR}</span></div>
                <div class="field"><label>Valeur p:</label><span class="${data.degreP === 'N.A.' ? 'na' : ''}">${data.degreP}</span></div>
                <div class="field"><label>R²:</label><span class="${data.degreR2 === 'N.A.' ? 'na' : ''}">${data.degreR2}</span></div>
                <div class="field"><label>Résultat:</label><span class="${data.resultatRelation === 'N.A.' ? 'na' : ''}">${data.resultatRelation}</span></div>
            </div>
            
            <button onclick="window.close()" style="padding: 10px 20px; background: #2980b9; color: white; border: none; border-radius: 5px; margin-top: 20px;">Fermer</button>
        </body>
        </html>`;

        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    }

    // Fonction pour envoyer les requêtes SPARQL au serveur
    async function sendToServer(formData, sparqlQueries) {
        console.log('🚀 Envoi au serveur...');

        const serverURL = window.location.hostname === 'localhost' ?
            'http://localhost:8003' :
            `http://${window.location.hostname}:8003`;


        const payload = {
            formData: formData,
            sparqlQueries: sparqlQueries
        };

        console.log('📤 Payload à envoyer:', {
            formDataKeys: Object.keys(formData),
            queryCount: Object.keys(sparqlQueries).length,
            queryNames: Object.keys(sparqlQueries)
        });

        try {
            const response = await fetch(serverURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            console.log('📨 Réponse serveur:', {
                status: response.status,
                success: responseData.success,
                message: responseData.message
            });

            if (response.ok) {
                // Succès complet (200)
                return {
                    success: true,
                    data: responseData,
                    status: response.status
                };
            } else if (response.status === 207) {
                // Succès partiel (207)
                return {
                    success: false,
                    partial: true,
                    data: responseData,
                    status: response.status
                };
            } else {
                // Erreur (500+)
                return {
                    success: false,
                    data: responseData,
                    status: response.status
                };
            }

        } catch (error) {
            console.error('💥 Erreur réseau:', error);
            throw new Error(`Erreur de connexion au serveur: ${error.message}`);
        }
    }

    // Fonction de soumission du formulaire (VERSION SERVEUR)
    function submitForm(event) {
        event.preventDefault();
        console.log('Soumission du formulaire');

        // Remplacer les champs vides par "N.A."
        replaceEmptyFields();

        // Collecter les données
        const data = collectFormData();

        // Afficher un loading
        submitBtn.textContent = 'Génération SPARQL...';
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        // Générer les requêtes SPARQL
        try {
            console.log('=== GÉNÉRATION DES REQUÊTES SPARQL ===');
            const generator = new SPARQLGenerator();
            const sparqlQueries = generator.generateAllInserts(data);

            console.log('Requêtes SPARQL générées avec succès:');
            Object.keys(sparqlQueries).forEach(name => {
                console.log(`✅ ${name}`);
            });

            // Envoyer au serveur
            submitBtn.textContent = 'Envoi au serveur...';

            sendToServer(data, sparqlQueries)
                .then(result => {
                    console.log('🎉 Réponse finale du serveur:', result);

                    if (result.success) {
                        // Succès complet
                        const successMsg = `✅ Analyse ajoutée avec succès !
                        
📊 Résultats:
• ${result.data.results.successCount} objets créés
• Temps d'exécution: ${result.data.executionTime}ms
• ID d'analyse: ${result.data.analysisId}

Tous les objets ont été créés dans Fuseki.`;

                        alert(successMsg);

                        // Optionnel : réinitialiser le formulaire
                        if (confirm('Voulez-vous réinitialiser le formulaire pour ajouter une nouvelle analyse ?')) {
                            form.reset();
                        }

                    } else if (result.partial) {
                        // Succès partiel
                        const partialMsg = `⚠️ Analyse partiellement ajoutée
                        
📊 Résultats:
• ${result.data.results.successCount}/${result.data.results.totalQueries} objets créés
• ${result.data.results.errorCount} erreurs
• Temps d'exécution: ${result.data.executionTime}ms

Vérifiez la console pour les détails des erreurs.`;

                        alert(partialMsg);

                    } else {
                        // Échec complet
                        const errorMsg = `❌ Échec de l'ajout de l'analyse
                        
Erreur: ${result.data.message}
Temps d'exécution: ${result.data.executionTime}ms

Vérifiez la console pour plus de détails.`;

                        alert(errorMsg);
                    }
                })
                .catch(error => {
                    console.error('💥 Erreur lors de l\'envoi:', error);
                    alert(`Erreur de connexion au serveur:
                    
${error.message}

Vérifiez que le serveur SPARQL est démarré sur le port 8003.`);
                })
                .finally(() => {
                    // Réinitialiser le bouton dans tous les cas
                    submitBtn.textContent = 'Ajouter l\'analyse';
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                });

        } catch (error) {
            console.error('Erreur lors de la génération SPARQL:', error);
            alert('Erreur lors de la génération des requêtes SPARQL. Vérifiez la console.');

            // Réinitialiser le bouton
            submitBtn.textContent = 'Ajouter l\'analyse';
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // Événements
    if (previewBtn) {
        previewBtn.addEventListener('click', showPreview);
        console.log('Gestionnaire prévisualisation attaché');
    }

    if (submitBtn && form) {
        form.addEventListener('submit', submitForm);
        console.log('Gestionnaire soumission attaché');
    }

    // Fonction utilitaire pour débugger et tester SPARQL
    window.debugForm = function () {
        console.log('=== DEBUG FORMULAIRE ET SPARQL ===');
        replaceEmptyFields();
        const data = collectFormData();
        console.table(data);

        // Tester la génération SPARQL
        if (typeof SPARQLGenerator !== 'undefined') {
            console.log('\n=== TEST GÉNÉRATION SPARQL ===');
            const generator = new SPARQLGenerator();
            const queries = generator.generateAllInserts(data);

            Object.entries(queries).forEach(([name, query]) => {
                console.log(`\n--- ${name.toUpperCase()} ---`);
                console.log(query);
            });

            return { formData: data, sparqlQueries: queries };
        } else {
            console.error('SPARQLGenerator non disponible !');
            return { formData: data };
        }
    };

    // Fonction pour tester une requête SPARQL spécifique
    window.testSingleQuery = function (queryType) {
        const data = collectFormData();
        const generator = new SPARQLGenerator();

        const methodMap = {
            'article': 'generateArticleInsert',
            'analysis': 'generateAnalysisInsert',
            'population': 'generatePopulationInsert',
            'sport': 'generateSportInsert',
            'variables': 'generateVDInsert',
            'relations': 'generateRelationsInsert'
        };

        if (methodMap[queryType]) {
            const query = generator[methodMap[queryType]](data);
            console.log(`=== REQUÊTE ${queryType.toUpperCase()} ===`);
            console.log(query);
            return query;
        } else {
            console.error('Type de requête invalide. Types disponibles:', Object.keys(methodMap));
        }
    };

    console.log('JavaScript d\'ajout d\'analyse initialisé');
    console.log('Utilise debugForm() dans la console pour voir les données');
});
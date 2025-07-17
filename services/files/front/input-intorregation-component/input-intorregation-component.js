class InputInterrogationComponent extends HTMLElement {
    constructor() {
        super();
        this.csvData = null;
        this.availableVD = [];
        this.availableVI = [];
        this.isQueryMode = false;
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="input-container">
                <div class="header-controls">
                    <h2>Interroger l'ontologie</h2>
                    <button id="toggleMode" class="mode-toggle-btn">Mode SPARQL</button>
                </div>
                
                <!-- Status du chargement -->
                <div id="loadingStatus">
                    <p>Chargement des données IA-DAS...</p>
                </div>
                
                <!-- MODE FORMULAIRE -->
                <div id="formMode">
                    <!-- Générateur de requêtes dynamique -->
                    <div class="dynamic-query-section" id="querySection" style="display: none;">
                        <h3>Sélection de variables</h3>
                        
                        <div class="variable-row">
                            <label for="variableVI">Facteur relié aux ACAD :</label>
                            <select id="variableVI" disabled>
                                <option value="">-- Chargement en cours... --</option>
                            </select>
                        </div>
                        
                        <div class="variable-row">
                            <label for="variableVD">ACAD :</label>
                            <select id="variableVD" disabled>
                                <option value="">-- Chargement en cours... --</option>
                            </select>
                        </div>                
                    </div>
                    
                    <hr style="margin: 20px 0;">
                    
                    <!-- Filtres contextuels existants -->
                    <div class="contextual-filters">
                        <h3>Filtres contextuels</h3>
                        
                        <select id="gender">
                            <option value="">-- Sexe --</option>
                            <option value="female">Femme</option>
                            <option value="male">Homme</option>
                            <option value="mixed">Mixte</option>
                        </select>

                        <input type="number" 
                            id="minAge" 
                            placeholder="Âge minimum" 
                            min="0" 
                            max="120">

                        <select id="sportLevel">
                            <option value="">-- Niveau sportif --</option>
                           
                            <option value="amateur">Amateur</option>
                           
                        </select>

                         <select id="factorCategory">
                            <option value="">-- Catégorie de facteur --</option>
                            <option value="intrapersonal">Intrapersonnel</option>
                            <option value="interpersonal">Interpersonnel</option>
                            <option value="socio-environmental">Socio-environnemental</option>
                            <option value="other-behaviors">Autres comportements</option>
                        </select>

                        <select id="sportType">
                            <option value="">-- Type de sport --</option>
                            <option value="individual">Sport individuel</option>
                            <option value="team">Sport d'équipe</option>
                            <option value="endurance">Sport d'endurance</option>
                            <option value="aesthetic">Sport esthétique</option>
                        </select>


                        <select id="experienceYears">
                            <option value="">-- Années d'expérience --</option>
                            <option value="0-2">0-2 ans</option>
                            <option value="3-5">3-5 ans</option>
                            <option value="6-10">6-10 ans</option>
                            <option value="10+">10+ ans</option>
                        </select>
                        <select id="relationDirection">
                            <option value="">-- Type de relation --</option>
                            <option value="+">Positive (+)</option>
                            <option value="-">Négative (-)</option>
                            <option value="NS">Non significative (NS)</option>
                        </select>
                    </div>

                    <br><br>
                    <button id="searchBtn" disabled>Générer et Rechercher</button>
                </div>

                
                <div id="sparqlMode" style="display: none;">
                    <div class="sparql-editor">
                        <h3>Éditeur SPARQL</h3>
                        
                        <div class="sparql-controls">
                            <button id="loadExample" class="sparql-btn">Exemple</button>
                            <button id="clearQuery" class="sparql-btn">Effacer</button>
                            <span class="sparql-info">Écrivez votre requête SPARQL ci-dessous :</span>
                        </div>
                        
                        <textarea id="sparqlQuery" placeholder="PREFIX : <http://example.org/onto#>
PREFIX ex: <http://example.org/data#>

SELECT * WHERE {
  ?s ?p ?o
} 
LIMIT 10" rows="15" style="width: 100%; font-family: 'Courier New', monospace; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"></textarea>
                        
                        <div class="query-validation" id="queryValidation" style="margin-top: 10px;"></div>
                        
                        <br>
                        <button id="executeSparql" class="execute-btn">▶ Exécuter la requête</button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadCSVData();
    }

    setupEventListeners() {

        // Bouton toggle pout changer le mode
        const toggleBtn = this.querySelector('#toggleMode');
        toggleBtn.addEventListener('click', () => this.toggleMode());

        // Bouton en rapport avec le mode Sparql , Charger l'exemple , Effacer la requête et Exécuter la requête
        const loadExampleBtn = this.querySelector('#loadExample');
        const clearQueryBtn = this.querySelector('#clearQuery');
        const executeSparqlBtn = this.querySelector('#executeSparql');

        // Ajout des lsitener pour les boutons SPARQL
        loadExampleBtn.addEventListener('click', () => this.loadExampleQuery());
        clearQueryBtn.addEventListener('click', () => this.clearSparqlQuery());
        executeSparqlBtn.addEventListener('click', () => this.executeSparqlQuery());

        const sparqlTextarea = this.querySelector('#sparqlQuery');
        sparqlTextarea.addEventListener('input', () => this.validateSparqlQuery());

        // Gestion de la sélection de variables
        const variableVI = this.querySelector('#variableVI');
        const variableVD = this.querySelector('#variableVD');
        variableVI.addEventListener('change', () => this.updateSelection());
        variableVD.addEventListener('change', () => this.updateSelection());

        // Gestion du bouton recherche
        const button = this.querySelector('#searchBtn');
        button.addEventListener('click', () => this.handleSearch());
    }

    toggleMode() {

        this.isQueryMode = !this.isQueryMode;
        const toggleBtn = this.querySelector('#toggleMode');
        const formMode = this.querySelector('#formMode');
        const sparqlMode = this.querySelector('#sparqlMode');

        if (this.isQueryMode) {
            // Passer en mode SPARQL
            formMode.style.display = 'none';
            sparqlMode.style.display = 'block';
            toggleBtn.textContent = ' Mode Formulaire';
            toggleBtn.title = 'Retour au formulaire';
        } else {
            // Passer en mode Formulaire
            formMode.style.display = 'block';
            sparqlMode.style.display = 'none';
            toggleBtn.textContent = ' Mode SPARQL';
            toggleBtn.title = 'Basculer vers l\'éditeur SPARQL';
        }
    }

    loadExampleQuery() {
        const exampleQuery = `PREFIX : <http://example.org/onto#>
PREFIX ex: <http://example.org/data#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?selectedVI ?selectedVD ?resultatRelation ?degreR ?degreP WHERE {
  ?analysis a :Analysis ;
            :hasRelation ?relation .
  
  ?relation :hasIndependentVariable ?variableVI ;
            :VD ?selectedVD ;
            :resultatRelation ?resultatRelation ;
            :degreR ?degreR ;
            :degreP ?degreP .
            
  ?variableVI :VI ?selectedVI .
  
  FILTER(?selectedVI = "Motivation")
  FILTER(?selectedVD = "Performance")
}
ORDER BY ?resultatRelation
LIMIT 20`;

        this.querySelector('#sparqlQuery').value = exampleQuery;
        this.validateSparqlQuery();
    }

    clearSparqlQuery() {
        this.querySelector('#sparqlQuery').value = '';
        this.querySelector('#queryValidation').innerHTML = '';
    }

    validateSparqlQuery() {
        const query = this.querySelector('#sparqlQuery').value.trim();
        const validationDiv = this.querySelector('#queryValidation');

        if (!query) {
            validationDiv.innerHTML = '';
            return;
        }

        // Validation basique
        const hasPrefix = query.toLowerCase().includes('prefix');
        const hasSelect = query.toLowerCase().includes('select');
        const hasWhere = query.toLowerCase().includes('where');

        if (hasPrefix && hasSelect && hasWhere) {
            validationDiv.innerHTML = '<p style="color: green;">Syntaxe de base valide</p>';
        } else {
            validationDiv.innerHTML = '<p style="color: orange;">Vérifiez la syntaxe (PREFIX, SELECT, WHERE)</p>';
        }
    }

    executeSparqlQuery() {
        const query = this.querySelector('#sparqlQuery').value.trim();

        if (!query) {
            alert('Veuillez saisir une requête SPARQL');
            return;
        }

        console.log("Exécution requête SPARQL directe:", query);

        const searchEvent = new CustomEvent('search', {
            detail: {
                queryType: 'raw_sparql',
                rawSparqlQuery: query
            }
        });
        this.dispatchEvent(searchEvent);
    }

    async loadCSVData() {
        const statusDiv = this.querySelector('#loadingStatus');


        try {
            // Charger Papa Parse si pas déjà fait
            if (typeof Papa === 'undefined') {
                await this.loadPapaParse();
            }

            // Charger le fichier CSV
            const response = await fetch('/data/IA-DAS-Data.csv');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const csvText = await response.text();

            // Parser le CSV
            const result = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });

            if (result.errors.length > 0) {
                console.warn('Erreurs de parsing CSV:', result.errors);
            }

            this.csvData = result.data;
            console.log('Données CSV chargées:', this.csvData.length, 'lignes');
            console.log('Colonnes disponibles:', result.meta.fields);

            // Extraire les valeurs uniques
            this.extractUniqueValues();
            this.populateSelects();

            statusDiv.innerHTML = `<p style="color: green;"> Données chargées : ${this.csvData.length} analyses</p>`;

        } catch (error) {
            console.error('Erreur lors du chargement CSV:', error);
            statusDiv.innerHTML = `<p style="color: red;">Erreur : ${error.message}</p>`;
        }
    }

    async loadPapaParse() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    extractUniqueValues() {
        // Extraire les valeurs uniques pour VD
        this.availableVD = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VD'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Extraire les valeurs uniques pour VI
        this.availableVI = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VI'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        console.log('Variables VD disponibles:', this.availableVD);
        console.log('Variables VI disponibles:', this.availableVI);
    }

    populateSelects() {
        const variableVISelect = this.querySelector('#variableVI');
        const variableVDSelect = this.querySelector('#variableVD');
        const querySection = this.querySelector('#querySection');
        const searchBtn = this.querySelector('#searchBtn');

        // Populer les VI
        variableVISelect.innerHTML = '<option value="">-- Sélectionnez un facteur (VI) --</option>';
        this.availableVI.forEach(vi => {
            const option = new Option(vi, vi);
            variableVISelect.appendChild(option);
        });

        // Populer les VD  
        variableVDSelect.innerHTML = '<option value="">-- Sélectionnez un outcome (VD) --</option>';
        this.availableVD.forEach(vd => {
            const option = new Option(vd, vd);
            variableVDSelect.appendChild(option);
        });

        // Activer l'interface
        variableVISelect.disabled = false;
        variableVDSelect.disabled = false;
        searchBtn.disabled = false;
        querySection.style.display = 'block';

        console.log(`Interface activée: ${this.availableVI.length} VI, ${this.availableVD.length} VD`);
    }

    updateSelection() {
        const selectedVI = this.querySelector('#variableVI').value;
        const selectedVD = this.querySelector('#variableVD').value;
        const infoDiv = this.querySelector('#selectionInfo');
        const textDiv = this.querySelector('#selectionText');

        if (selectedVI || selectedVD) {
            let text = '';
            if (selectedVI) text += `Facteur: ${selectedVI}`;
            if (selectedVI && selectedVD) text += ' → ';
            if (selectedVD) text += `Outcome: ${selectedVD}`;

            textDiv.textContent = text;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    }

    handleSearch() {

        const selectedVI = this.querySelector('#variableVI').value;
        const selectedVD = this.querySelector('#variableVD').value;

        const gender = this.querySelector('#gender').value;
        const minAge = this.querySelector('#minAge').value;
        const sportLevel = this.querySelector('#sportLevel').value;
        const relationDirection = this.querySelector('#relationDirection').value;
        // To do 
        // const factorType = this.querySelector('#factorType').value;
        const factorCategory = this.querySelector('#factorCategory').value;
        const sportType = this.querySelector('#sportType').value;
        const experienceYears = this.querySelector('#experienceYears').value;
        // To do 
        // const practiceFrequency = this.querySelector('#practiceFrequency').value;

        const searchData = {
            selectedVI,
            selectedVD,
            gender,
            minAge,
            sportLevel,
            sportType,
            experienceYears,
            // practiceFrequency,
            // factorType,
            factorCategory,
            relationDirection,
            queryType: 'variable_relation'
        };

        console.log("Recherche avec tous les critères:", searchData);

        const searchEvent = new CustomEvent('search', {
            detail: searchData
        });
        this.dispatchEvent(searchEvent);
    }
}

customElements.define('input-intorregation-component', InputInterrogationComponent);
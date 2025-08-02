class InputInterrogationComponent extends HTMLElement {
    constructor() {
        super();
        this.csvData = null;
        this.availableVD = [];
        this.availableVI = [];
        this.isQueryMode = false;
    }
// Pour ajouter le bouton de switch en mode sparql
// <button id="toggleMode" class="mode-toggle-btn" display="none">Mode SPARQL</button>


    connectedCallback() {
        this.innerHTML = `
            <div class="input-container">
                <div class="header-controls">
                </div>
                <div id="formMode">
    <!-- COLONNE 1: ACAD -->
    <div class="acad-section">
        <h3>ACAD</h3>
        
        <div class="variable-row">
            <label for="variableVD">ACAD :</label>
            <div class="autocomplete-container">
                <input type="text" id="variableVD" placeholder="Tapez pour rechercher un ACAD..." disabled>
                <div class="autocomplete-dropdown" id="variableVD-dropdown"></div>
            </div>
        </div>
    </div>

    <!-- COLONNE 2: Facteurs -->
    <div class="factors-section">
        <h3>Variable</h3>
        
        <div class="variable-row">
            <label for="variableVI">Facteur :</label>
            <div class="autocomplete-container">
                <input type="text" id="variableVI" placeholder="Tapez pour rechercher un facteur..." disabled>
                <div class="autocomplete-dropdown" id="variableVI-dropdown"></div>
            </div>
        </div>
    </div>

    <!-- COLONNE 3: Type de relations -->
    <div class="relations-section">
        <h3>Type de relations</h3>
        
        <div class="radio-group">
            <div class="radio-option">
                <input type="radio" id="positive" name="relationDirection" value="+">
                <label for="positive">Protecteur</label>
            </div>
            <div class="radio-option">
                <input type="radio" id="negative" name="relationDirection" value="-">
                <label for="negative">À risque</label>
            </div>
            <div class="radio-option">
                <input type="radio" id="non-significant" name="relationDirection" value="NS">
                <label for="non-significant">Ambigu</label>
            </div>
        </div>
    </div>

    <!-- COLONNE 4: Caractéristiques des populations -->
    <div class="demographics-section">
        <h3>Caractéristiques des populations étudiées</h3>
        
        <div class="demographics-grid">
            <select id="gender">
                <option value="">Sexe</option>
                <option value="female">Femme</option>
                <option value="male">Homme</option>
                <option value="mixed">Mixte</option>
            </select>

            <input type="number" id="minAge" placeholder="Âge" min="0" max="120">

            <select id="sportType">
                <option value="">Sport</option>
                <option value="individual">Sport individuel</option>
                <option value="team">Sport d'équipe</option>
                <option value="endurance">Sport d'endurance</option>
                <option value="aesthetic">Sport esthétique</option>
            </select>

            <select id="experienceYears">
                <option value="">Fréquence de pratique</option>
                <option value="0-2">0-2 ans</option>
                <option value="3-5">3-5 ans</option>
                <option value="6-10">6-10 ans</option>
                <option value="10+">10+ ans</option>
            </select>

            <select id="sportLevel">
                <option value="">Années d'expérience</option>
                <option value="amateur">Amateur</option>
            </select>

            <select id="factorCategory">
                <option value="">Niveau sportif</option>
                <option value="intrapersonal">Intrapersonnel</option>
                <option value="interpersonal">Interpersonnel</option>
                <option value="socio-environmental">Socio-environnemental</option>
                <option value="other-behaviors">Autres comportements</option>
            </select>
        </div>
    </div>

    
    <div class="search-section">
        <button id="searchBtn" disabled>Rechercher</button>
    </div>
</div>

                <div id="sparqlMode" style="display: none;">
                    <div class="sparql-editor">
                        <h3>Éditeur SPARQL</h3>
                        
                        <div class="sparql-controls">
                            <button id="loadExample" class="sparql-btn">Exemple</button>
                            <button id="clearQuery" class="sparql-btn">Effacer</button>
                        </div>
                        
                        <textarea id="sparqlQuery" placeholder="PREFIX : <http://example.org/onto#>
PREFIX ex: <http://example.org/data#>

SELECT * WHERE {
  ?s ?p ?o
} 
LIMIT 10" rows="8"></textarea>
                        
                        <div class="query-validation" id="queryValidation"></div>
                        
                        <button id="executeSparql" class="execute-btn">▶ Exécuter la requête</button>
                    </div>
                </div>
            </div>

           
        `;

        this.setupEventListeners();
        this.loadCSVData();
    }

    setupEventListeners() {
        // Mode toggle
        // this.querySelector('#toggleMode').addEventListener('click', () => this.toggleMode());

        // SPARQL buttons
        this.querySelector('#loadExample').addEventListener('click', () => this.loadExampleQuery());
        this.querySelector('#clearQuery').addEventListener('click', () => this.clearSparqlQuery());
        this.querySelector('#executeSparql').addEventListener('click', () => this.executeSparqlQuery());
        this.querySelector('#sparqlQuery').addEventListener('input', () => this.validateSparqlQuery());

        // Autocomplete for variables
        this.setupAutocomplete('variableVI', () => this.availableVI);
        this.setupAutocomplete('variableVD', () => this.availableVD);

        // Search button
        this.querySelector('#searchBtn').addEventListener('click', () => this.handleSearch());

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                this.hideAllDropdowns();
            }
        });
    }

    setupAutocomplete(inputId, getDataFn) {
        const input = this.querySelector(`#${inputId}`);
        const dropdown = this.querySelector(`#${inputId}-dropdown`);
        let currentSelection = -1;

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.showAutocompleteResults(inputId, query, getDataFn());
            currentSelection = -1;
        });

        input.addEventListener('focus', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.showAutocompleteResults(inputId, query, getDataFn());
        });

        input.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.autocomplete-item:not(.no-results)');
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentSelection = Math.min(currentSelection + 1, items.length - 1);
                    this.updateSelection(dropdown, currentSelection);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    currentSelection = Math.max(currentSelection - 1, -1);
                    this.updateSelection(dropdown, currentSelection);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (currentSelection >= 0 && items[currentSelection]) {
                        this.selectItem(input, dropdown, items[currentSelection].textContent);
                        currentSelection = -1;
                    }
                    break;
                    
                case 'Escape':
                    dropdown.classList.remove('show');
                    currentSelection = -1;
                    break;
            }
        });
    }

    showAutocompleteResults(inputId, query, data) {
    const dropdown = this.querySelector(`#${inputId}-dropdown`);
    
    // Hide other dropdowns
    this.hideAllDropdowns();
    
    let filteredData = data;
    
    if (query) {
        filteredData = data.filter(item => {
            // Vérification de sécurité : s'assurer que item est une chaîne
            if (!item || typeof item !== 'string') {
                return false;
            }
            return item.toLowerCase().includes(query);
        }).sort((a, b) => {
            // Prioritize items that start with the query
            const aStarts = a.toLowerCase().startsWith(query);
            const bStarts = b.toLowerCase().startsWith(query);
            
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return a.localeCompare(b);
        });
    }

    if (filteredData.length === 0) {
        dropdown.innerHTML = '<div class="no-results">Aucun résultat trouvé</div>';
    } else {
        dropdown.innerHTML = filteredData
            // .slice(0, 10) // pas de limite je prefere
            .map(item => `<div class="autocomplete-item">${item}</div>`)
            .join('');
    }

    // Add click listeners to items
    dropdown.querySelectorAll('.autocomplete-item:not(.no-results)').forEach(item => {
        item.addEventListener('click', () => {
            const input = this.querySelector(`#${inputId}`);
            this.selectItem(input, dropdown, item.textContent);
        });
    });

    dropdown.classList.add('show');
}

    selectItem(input, dropdown, value) {
        input.value = value;
        dropdown.classList.remove('show');
        this.updateSelection();
        
        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateSelection(dropdown, selectedIndex) {
        if (!dropdown) return;
        
        const items = dropdown.querySelectorAll('.autocomplete-item:not(.no-results)');
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === selectedIndex);
        });
    }

    hideAllDropdowns() {
        this.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    toggleMode() {
        this.isQueryMode = !this.isQueryMode;
        const toggleBtn = this.querySelector('#toggleMode');
        const formMode = this.querySelector('#formMode');
        const sparqlMode = this.querySelector('#sparqlMode');

        if (this.isQueryMode) {
            formMode.style.display = 'none';
            sparqlMode.style.display = 'block';
            toggleBtn.textContent = 'Mode Formulaire';
        } else {
            formMode.style.display = 'grid';
            sparqlMode.style.display = 'none';
            toggleBtn.textContent = 'Mode SPARQL';
        }
    }

    async loadCSVData() {
        const statusDiv = this.querySelector('#loadingStatus');

        try {
            if (typeof Papa === 'undefined') {
                await this.loadPapaParse();
            }

            const response = await fetch('/data/IA-DAS-Data.csv');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const csvText = await response.text();
            const result = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });

            this.csvData = result.data;
            this.extractUniqueValues();
            this.enableInputs();
        } catch (error) {
            console.error('Erreur lors du chargement CSV:', error);
            statusDiv.innerHTML = `<p style="color: red;"> Erreur : ${error.message}</p>`;
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
        this.availableVD = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VD'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        this.availableVI = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VI'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();
    }

    enableInputs() {
        const variableVIInput = this.querySelector('#variableVI');
        const variableVDInput = this.querySelector('#variableVD');
        const searchBtn = this.querySelector('#searchBtn');

        // Update placeholders
        variableVIInput.placeholder = `Rechercher parmi ${this.availableVI.length} facteurs...`;
        variableVDInput.placeholder = `Rechercher parmi ${this.availableVD.length} ACAD...`;

        // Enable interface
        variableVIInput.disabled = false;
        variableVDInput.disabled = false;
        searchBtn.disabled = false;
    }

    handleSearch() {
        const searchData = {
            selectedVI: this.querySelector('#variableVI').value,
            selectedVD: this.querySelector('#variableVD').value,
            gender: this.querySelector('#gender').value,
            minAge: this.querySelector('#minAge').value,
            sportLevel: this.querySelector('#sportLevel').value,
            relationDirection: this.querySelector('input[name="relationDirection"]:checked')?.value || '',
            factorCategory: this.querySelector('#factorCategory').value,
            sportType: this.querySelector('#sportType').value,
            experienceYears: this.querySelector('#experienceYears').value,
            queryType: 'variable_relation'
        };

        console.log("Recherche avec critères:", searchData);

        this.dispatchEvent(new CustomEvent('search', {
            detail: searchData
        }));
    }

    // SPARQL methods
    loadExampleQuery() {
        const exampleQuery = `PREFIX : <http://example.org/onto#>
PREFIX ex: <http://example.org/data#>

SELECT DISTINCT ?selectedVI ?selectedVD ?resultatRelation WHERE {
  ?analysis a :Analysis ;
            :hasRelation ?relation .
  ?relation :hasIndependentVariable ?variableVI ;
            :VD ?selectedVD ;
            :resultatRelation ?resultatRelation .
  ?variableVI :VI ?selectedVI .
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

        const hasPrefix = query.toLowerCase().includes('prefix');
        const hasSelect = query.toLowerCase().includes('select');
        const hasWhere = query.toLowerCase().includes('where');

        if (hasPrefix && hasSelect && hasWhere) {
            validationDiv.innerHTML = '<p style="color: green;"> Syntaxe de base valide</p>';
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

        this.dispatchEvent(new CustomEvent('search', {
            detail: {
                queryType: 'raw_sparql',
                rawSparqlQuery: query
            }
        }));
    }
}

customElements.define('input-intorregation-component', InputInterrogationComponent);
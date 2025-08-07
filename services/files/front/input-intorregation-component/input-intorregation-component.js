class InputInterrogationComponent extends HTMLElement {
    constructor() {
        super();
        this.csvData = null;
        this.availableVD = [];
        this.availableVI = [];
        this.availableCategoriesVD = [];
        this.availableCategoriesVI = [];
        this.availableSports = [];
        this.sportsData = null;
        this.availableCategoriesSports = [];
        this.allSports = [];
        this.isQueryMode = false;
    }
    // Pour ajouter le bouton de switch en mode sparql
    // <button id="toggleMode" class="mode-toggle-btn" display="none">Mode SPARQL</button>


    connectedCallback() {
        this.initializeComponent();
    }

    async initializeComponent() {
        await this.loadTemplate();
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

        this.querySelector('#categoryVD').addEventListener('change', () => this.handleCategoryChangeVD());
        this.querySelector('#categoryVI').addEventListener('change', () => this.handleCategoryChangeVI());

        // Autocomplete for variables
        this.setupAutocomplete('variableVI', () => this.availableVI);
        this.setupAutocomplete('variableVD', () => this.availableVD);
        this.setupAutocomplete('sportType', () => this.availableSports);

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

            switch (e.key) {
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

    UniqueValues() {
        // Extraire toutes les variables (backup)
        this.allVD = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VD'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        this.allVI = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VI'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Extraire les catégories pour VD
        this.availableCategoriesVD = [...new Set(
            this.csvData
                .filter(row => row['sub-class_Final_VD'] != null && row['sub-class_Final_VD'] !== '')
                .map(row => row['CLASS'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Extraire les catégories pour VI
        this.availableCategoriesVI = [...new Set(
            this.csvData
                .filter(row => row['sub-class_Final_VI'] != null && row['sub-class_Final_VI'] !== '')
                .map(row => row['CLASS'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Initialiser avec toutes les variables
        this.availableVD = [...this.allVD];
        this.availableVI = [...this.allVI];

        // Peupler les sélecteurs de catégories
        this.populateCategorySelectors();
    }

    populateCategorySelectors() {
        this.populateCategorySelector('#categoryVD', this.availableCategoriesVD);
        this.populateCategorySelector('#categoryVI', this.availableCategoriesVI);
    }

    populateCategorySelector(selectId, categories) {
        const categorySelect = this.querySelector(selectId);

        // Vider les options existantes (garder la première)
        while (categorySelect.children.length > 1) {
            categorySelect.extractremoveChild(categorySelect.lastChild);
        }

        // Ajouter les catégories
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    handleCategoryChangeVD() {
        const selectedCategory = this.querySelector('#categoryVD').value;

        if (selectedCategory === '') {
            this.availableVD = [...this.allVD];
        } else {
            this.availableVD = [...new Set(
                this.csvData
                    .filter(row => row['CLASS'] === selectedCategory && row['sub-class_Final_VD'])  // ← 'CLASS'
                    .map(row => row['sub-class_Final_VD'])
                    .filter(val => val != null && val !== '' && val !== undefined)
            )].sort();
        }

        this.resetVariableInput('variableVD');
        this.updatePlaceholder('variableVD', this.availableVD.length, 'ACAD');
    }

    handleCategoryChangeVI() {
        const selectedCategory = this.querySelector('#categoryVI').value;

        if (selectedCategory === '') {
            this.availableVI = [...this.allVI];
        } else {
            this.availableVI = [...new Set(
                this.csvData
                    .filter(row => row['CLASS_1'] === selectedCategory && row['sub-class_Final_VI'])  // ← 'CLASS_1'
                    .map(row => row['sub-class_Final_VI'])
                    .filter(val => val != null && val !== '' && val !== undefined)
            )].sort();
        }

        this.resetVariableInput('variableVI');
        this.updatePlaceholder('variableVI', this.availableVI.length, 'facteurs');
    }
    resetVariableInput(inputId) {
        this.querySelector(`#${inputId}`).value = '';
        this.querySelector(`#${inputId}-dropdown`).classList.remove('show');
    }

    updatePlaceholder(inputId, count, type) {
        this.querySelector(`#${inputId}`).placeholder = `Rechercher parmi ${count} ${type}...`;
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
            console.log('🔍 Colonnes détectées:', result.meta.fields);
            console.log('🔍 Première ligne de données:', result.data[0]);


            const response2 = await fetch('/data/Sport.csv');
            if (!response2.ok) {
                throw new Error(`Erreur HTTP Sport: ${response2.status}`);
            }
            const csvText2 = await response2.text();
            const result2 = Papa.parse(csvText2, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });
            this.sportsData = result2.data;

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

    async loadTemplate() {
        try {
            const response = await fetch('../input-intorregation-component.html');
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement du template: ${response.status}`);
            }
            const htmlContent = await response.text();
            this.innerHTML = htmlContent;
        } catch (error) {
            console.error('Erreur lors du chargement du template:', error);
            // Fallback vers l'ancien HTML en cas d'erreur
            this.innerHTML = `<!-- Votre ancien HTML ici en fallback -->`;
        }
    }

    extractUniqueValues() {
        console.log('🔍 DEBUG: csvData length:', this.csvData.length);

        // Extraire toutes les variables (backup)
        this.allVD = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VD'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        this.allVI = [...new Set(
            this.csvData
                .map(row => row['sub-class_Final_VI'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Extraire les catégories pour VD (utilise 'CLASS')
        this.availableCategoriesVD = [...new Set(
            this.csvData
                .filter(row => row['sub-class_Final_VD'] != null && row['sub-class_Final_VD'] !== '')
                .map(row => row['CLASS'])
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        // Extraire les catégories pour VI (utilise 'CLASS_1')
        this.availableCategoriesVI = [...new Set(
            this.csvData
                .filter(row => row['sub-class_Final_VI'] != null && row['sub-class_Final_VI'] !== '')
                .map(row => row['CLASS_1'])  // ← CHANGEMENT ICI
                .filter(val => val != null && val !== '' && val !== undefined)
        )].sort();

        console.log('🔍 Categories VD:', this.availableCategoriesVD);
        console.log('🔍 Categories VI:', this.availableCategoriesVI);

        // Initialiser avec toutes les variables
        this.availableVD = [...this.allVD];
        this.availableVI = [...this.allVI];

        // Extraire les sports depuis Sport.csv avec logique hiérarchique
        this.allSports = [...new Set(
            this.sportsData
                .map(row => {
                    // Priorité : Sub class 3, sinon Sub class 2
                    const sportLevel3 = row['Sub class 3'];
                    const sportLevel2 = row['Sub class 2'];

                    // Si Sub class 3 existe et n'est pas vide
                    if (sportLevel3 && sportLevel3.toString().trim() !== '') {
                        return sportLevel3.toString().trim();
                    }
                    // Sinon utiliser Sub class 2 si elle existe
                    if (sportLevel2 && sportLevel2.toString().trim() !== '') {
                        return sportLevel2.toString().trim();
                    }
                    // Sinon ignorer cette ligne
                    return null;
                })
                .filter(val => val !== null) // Eliminer les lignes sans sport
        )].sort();

        // Initialiser avec tous les sports
        this.availableSports = [...this.allSports];

        console.log('🔍 Sports extraits depuis Sport.csv:', this.availableSports.length, this.availableSports.slice(0, 10));
        // Peupler les sélecteurs de catégories
        this.populateCategorySelectors();
    }

    enableInputs() {
        const variableVIInput = this.querySelector('#variableVI');
        const variableVDInput = this.querySelector('#variableVD');
        const searchBtn = this.querySelector('#searchBtn');
        const sportTypeInput = this.querySelector('#sportType');
        sportTypeInput.placeholder = `Rechercher parmi ${this.availableSports.length} sports...`;
        sportTypeInput.disabled = false;

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
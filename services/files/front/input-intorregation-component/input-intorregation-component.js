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
        this.setupCustomFieldHandlers();


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

    setupCustomFieldHandlers() {
    // Gestion âge custom
    const ageCategory = this.querySelector('#ageCategory');
    if (ageCategory) {
        ageCategory.addEventListener('change', () => this.handleAgeCategoryChange());
    }
    
    // Gestion fréquence custom
    const exerciseFrequency = this.querySelector('#exerciseFrequency');
    if (exerciseFrequency) {
        exerciseFrequency.addEventListener('change', () => this.handleFrequencyCategoryChange());
    }
    
    // Gestion expérience custom
    const experienceCategory = this.querySelector('#experienceCategory');
    if (experienceCategory) {
        experienceCategory.addEventListener('change', () => this.handleExperienceCategoryChange());
    }
}

// 3. NOUVELLES MÉTHODES pour gérer les modes custom
handleAgeCategoryChange() {
    const ageCategory = this.querySelector('#ageCategory');
    const ageCustom = this.querySelector('#ageCustom');
    
    if (!ageCategory || !ageCustom) return;
    
    if (ageCategory.value === 'custom') {
        ageCustom.classList.remove('hidden');
        // Focus sur le premier champ
        const ageMin = this.querySelector('#ageMin');
        if (ageMin) ageMin.focus();
    } else {
        ageCustom.classList.add('hidden');
        // Reset des valeurs custom
        this.resetCustomFields(['ageMin', 'ageMax']);
    }
}

handleFrequencyCategoryChange() {
    const exerciseFrequency = this.querySelector('#exerciseFrequency');
    const frequencyCustom = this.querySelector('#frequencyCustom');
    
    if (!exerciseFrequency || !frequencyCustom) return;
    
    if (exerciseFrequency.value === 'custom') {
        frequencyCustom.classList.remove('hidden');
        // Focus sur le premier champ
        const frequencyMin = this.querySelector('#frequencyMin');
        if (frequencyMin) frequencyMin.focus();
    } else {
        frequencyCustom.classList.add('hidden');
        // Reset des valeurs custom
        this.resetCustomFields(['frequencyMin', 'frequencyMax']);
    }
}

handleExperienceCategoryChange() {
    const experienceCategory = this.querySelector('#experienceCategory');
    const experienceCustom = this.querySelector('#experienceCustom');
    
    if (!experienceCategory || !experienceCustom) return;
    
    if (experienceCategory.value === 'custom') {
        experienceCustom.classList.remove('hidden');
        // Focus sur le premier champ
        const experienceMin = this.querySelector('#experienceMin');
        if (experienceMin) experienceMin.focus();
    } else {
        experienceCustom.classList.add('hidden');
        // Reset des valeurs custom
        this.resetCustomFields(['experienceMin', 'experienceMax']);
    }
}

// 4. MÉTHODE UTILITAIRE pour reset les champs
resetCustomFields(fieldIds) {
    fieldIds.forEach(id => {
        const field = this.querySelector(`#${id}`);
        if (field) field.value = '';
    });
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

  async handleSearch() {
    try {
        // 🆕 1. AFFICHER LE LOADING
        if (window.loadingManager) {
            window.loadingManager.show("Recherche dans la base IA-DAS...");
        }

        // Récupérer les valeurs des champs existants
        const searchData = {
            selectedVI: this.querySelector('#variableVI').value,
            selectedVD: this.querySelector('#variableVD').value,
            categoryVI: this.querySelector('#categoryVI').value,
            categoryVD: this.querySelector('#categoryVD').value,
            gender: this.querySelector('#gender').value,
            relationDirection: this.querySelector('input[name="relationDirection"]:checked')?.value || '',
            sportType: this.querySelector('#sportType').value,
            queryType: 'variable_relation'
        };

        // NOUVEAUX CHAMPS : Gestion de l'âge
        const ageCategory = this.querySelector('#ageCategory').value;
        if (ageCategory) {
            if (ageCategory === 'custom') {
                const ageMin = this.querySelector('#ageMin').value;
                const ageMax = this.querySelector('#ageMax').value;
                if (ageMin) searchData.ageMin = parseInt(ageMin);
                if (ageMax) searchData.ageMax = parseInt(ageMax);
            } else {
                searchData.ageCategory = ageCategory;
            }
        }

        // NOUVEAUX CHAMPS : Gestion de la fréquence
        const exerciseFrequency = this.querySelector('#exerciseFrequency').value;
        if (exerciseFrequency) {
            if (exerciseFrequency === 'custom') {
                const frequencyMin = this.querySelector('#frequencyMin').value;
                const frequencyMax = this.querySelector('#frequencyMax').value;
                if (frequencyMin) searchData.frequencyMin = parseInt(frequencyMin);
                if (frequencyMax) searchData.frequencyMax = parseInt(frequencyMax);
            } else {
                searchData.exerciseFrequency = exerciseFrequency;
            }
        }

        // NOUVEAUX CHAMPS : Gestion de l'expérience
        const experienceCategory = this.querySelector('#experienceCategory').value;
        if (experienceCategory) {
            if (experienceCategory === 'custom') {
                const experienceMin = this.querySelector('#experienceMin').value;
                const experienceMax = this.querySelector('#experienceMax').value;
                if (experienceMin) searchData.experienceMin = parseInt(experienceMin);
                if (experienceMax) searchData.experienceMax = parseInt(experienceMax);
            } else {
                searchData.experienceCategory = experienceCategory;
            }
        }

        console.log("Recherche avec nouveaux critères:", searchData);

        // 🆕 2. DISPATCHER L'ÉVÉNEMENT (qui sera capturé par doctor-page.js)
        this.dispatchEvent(new CustomEvent('search', {
            detail: searchData
        }));

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        
        // 🆕 3. AFFICHER L'ERREUR DANS LE LOADING
        if (window.loadingManager) {
            window.loadingManager.showError('Erreur de recherche', error.message);
        }
    }
}

// 6. OPTIONNEL : Méthode pour valider les champs custom
validateCustomFields() {
    let isValid = true;
    const errors = [];

    // Validation âge custom
    const ageMin = this.querySelector('#ageMin');
    const ageMax = this.querySelector('#ageMax');
    if (ageMin && ageMax && ageMin.value && ageMax.value) {
        if (parseInt(ageMin.value) >= parseInt(ageMax.value)) {
            errors.push("L'âge minimum doit être inférieur à l'âge maximum");
            isValid = false;
        }
    }

    // Validation fréquence custom
    const frequencyMin = this.querySelector('#frequencyMin');
    const frequencyMax = this.querySelector('#frequencyMax');
    if (frequencyMin && frequencyMax && frequencyMin.value && frequencyMax.value) {
        if (parseInt(frequencyMin.value) >= parseInt(frequencyMax.value)) {
            errors.push("La fréquence minimum doit être inférieure à la fréquence maximum");
            isValid = false;
        }
    }

    // Validation expérience custom
    const experienceMin = this.querySelector('#experienceMin');
    const experienceMax = this.querySelector('#experienceMax');
    if (experienceMin && experienceMax && experienceMin.value && experienceMax.value) {
        if (parseInt(experienceMin.value) >= parseInt(experienceMax.value)) {
            errors.push("L'expérience minimum doit être inférieure à l'expérience maximum");
            isValid = false;
        }
    }

    // Afficher les erreurs si nécessaire
    if (!isValid) {
        console.warn("Erreurs de validation:", errors);
        // Tu peux afficher les erreurs à l'utilisateur ici
    }

    return { isValid, errors };
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
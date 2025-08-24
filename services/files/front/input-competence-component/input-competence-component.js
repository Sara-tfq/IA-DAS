class InputCompetenceComponent extends HTMLElement {
    constructor() {
        super();
        this.selectedQuestion = null;
        this.questionDefinitions = {
            'q1': {
                text: 'Pour une ACAD spécifique, quel est l\'ensemble des facteurs psychosociaux associés ?',
                description: 'Cette question explore tous les facteurs psychosociaux associés à une activité ou conduite addictive spécifique, incluant leurs catégories, degrés de relations et études de référence.'
            },
            'q2-protecteur': {
                text: 'Pour un facteur protecteur, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Identifie les types spécifiques d\'ACAD qui sont positivement influencés par les facteurs protecteurs.'
            },
            'q2-risque': {
                text: 'Pour un facteur à risque, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Répertorie les types d\'ACAD qui sont négativement influencés par les facteurs de risque.'
            },
            'q2-ambigu': {
                text: 'Pour un facteur ambigu, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Analyse les ACAD associés aux facteurs dont l\'influence n\'est pas clairement établie.'
            },
            'q3-intrapersonnels': {
                text: 'Pour les facteurs intrapersonnels, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Explore les liens entre les facteurs intrapersonnels (liés à l\'individu) et les différents types d\'ACAD.'
            },
            'q3-interpersonnels': {
                text: 'Pour les facteurs interpersonnels, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Examine les relations entre les facteurs interpersonnels (relations sociales) et les types d\'ACAD.'
            },
            'q3-socioenvironnementaux': {
                text: 'Pour les facteurs socio-environnementaux, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Analyse les connections entre les facteurs socio-environnementaux (contexte) et les types d\'ACAD.'
            },
            'q3-autres': {
                text: 'Pour les autres comportements, à quels types d\'ACAD sont-ils reliés ?',
                description: 'Étudie les liens entre les autres comportements et les différents types d\'ACAD.'
            }
        };
    }

    connectedCallback() {
        this.initializeComponent();
    }

    async initializeComponent() {
        await this.loadTemplate();
        this.setupEventListeners();
    }

    async loadTemplate() {
        try {
            const response = await fetch('./input-competence-component/input-competence-component.html');
            if (response.ok) {
                const htmlContent = await response.text();
                this.innerHTML = htmlContent;
            } else {
                this.loadFallbackTemplate();
            }
        } catch (error) {
            console.log('Chargement du template externe échoué, utilisation du fallback');
            this.loadFallbackTemplate();
        }
    }

    loadFallbackTemplate() {
        this.innerHTML = `
            <div class="competence-input-container">
                <div class="header-controls">
                    <h2>Questions de Compétences</h2>
                </div>

                <div class="accordion-section">
                    <!-- Question 1 : ACAD spécifique (pas de sous-options) -->
                    <div class="accordion-item">
                        <div class="accordion-header" data-question="q1">
                            <h3>Pour une ACAD spécifique, quel est l'ensemble des facteurs psychosociaux associés ?</h3>
                            <span class="accordion-icon">🔍</span>
                        </div>
                    </div>

                    <!-- Question 2 : Facteur spécifique (avec sous-options) -->
                    <div class="accordion-item">
                        <div class="accordion-header" data-toggle="accordion-2">
                            <h3>Pour un facteur spécifique, à quels types d'ACAD sont-ils reliés ?</h3>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="accordion-content" id="accordion-2">
                            <div class="sub-option" data-question="q2-protecteur">
                                <span class="sub-icon">➤</span>
                                <span>Facteur protecteur</span>
                            </div>
                            <div class="sub-option" data-question="q2-risque">
                                <span class="sub-icon">➤</span>
                                <span>Facteur à risque</span>
                            </div>
                            <div class="sub-option" data-question="q2-ambigu">
                                <span class="sub-icon">➤</span>
                                <span>Facteur ambigu</span>
                            </div>
                        </div>
                    </div>

                    <!-- Question 3 : Catégorie de facteurs (avec sous-options) -->
                    <div class="accordion-item">
                        <div class="accordion-header" data-toggle="accordion-3">
                            <h3>Pour une catégorie de facteurs, à quels types d'ACAD sont-ils reliés ?</h3>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="accordion-content" id="accordion-3">
                            <div class="sub-option" data-question="q3-intrapersonnels">
                                <span class="sub-icon">➤</span>
                                <span>Facteurs intrapersonnels</span>
                            </div>
                            <div class="sub-option" data-question="q3-interpersonnels">
                                <span class="sub-icon">➤</span>
                                <span>Facteurs interpersonnels</span>
                            </div>
                            <div class="sub-option" data-question="q3-socioenvironnementaux">
                                <span class="sub-icon">➤</span>
                                <span>Facteurs socio-environnementaux</span>
                            </div>
                            <div class="sub-option" data-question="q3-autres">
                                <span class="sub-icon">➤</span>
                                <span>Autres comportements</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="selected-question" id="selectedQuestion" style="display: none;">
                    <div class="selected-info">
                        <h4>Question sélectionnée :</h4>
                        <p id="selectedQuestionText"></p>
                    </div>
                    <button id="searchBtn">Rechercher</button>
                    <button id="resetBtn">Changer de question</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Gestion des headers d'accordéon avec toggle
        this.querySelectorAll('[data-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                const targetId = header.getAttribute('data-toggle');
                this.toggleAccordion(targetId, header);
            });
        });

        // Gestion des questions directes (sans sous-options)
        this.querySelectorAll('[data-question]:not([data-toggle])').forEach(element => {
            element.addEventListener('click', (e) => {
                const questionId = element.getAttribute('data-question');
                this.selectQuestion(questionId);
            });
        });

        // Gestion des sous-options
        this.querySelectorAll('.sub-option[data-question]').forEach(option => {
            option.addEventListener('click', (e) => {
                const questionId = option.getAttribute('data-question');
                this.selectQuestion(questionId);
            });
        });

        // Bouton rechercher
        const searchBtn = this.querySelector('#searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // Bouton reset
        const resetBtn = this.querySelector('#resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSelection());
        }
    }

    toggleAccordion(targetId, header) {
        const content = this.querySelector(`#${targetId}`);
        
        if (!content) return;

        // Fermer les autres accordéons
        this.querySelectorAll('.accordion-content').forEach(otherContent => {
            if (otherContent.id !== targetId) {
                otherContent.classList.remove('expanded');
            }
        });

        this.querySelectorAll('[data-toggle]').forEach(otherHeader => {
            if (otherHeader !== header) {
                otherHeader.classList.remove('expanded');
            }
        });

        // Toggle l'accordéon actuel
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            header.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            header.classList.add('expanded');
        }
    }

    selectQuestion(questionId) {
        this.selectedQuestion = questionId;
        
        // Retirer la sélection précédente
        this.querySelectorAll('.sub-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Ajouter la sélection actuelle
        const selectedOption = this.querySelector(`[data-question="${questionId}"]`);
        if (selectedOption && selectedOption.classList.contains('sub-option')) {
            selectedOption.classList.add('selected');
        }

        // Afficher la section de question sélectionnée
        this.showSelectedQuestion(questionId);
    }

    showSelectedQuestion(questionId) {
        const selectedQuestionDiv = this.querySelector('#selectedQuestion');
        const questionTextP = this.querySelector('#selectedQuestionText');
        
        if (this.questionDefinitions[questionId]) {
            questionTextP.textContent = this.questionDefinitions[questionId].text;
            selectedQuestionDiv.style.display = 'block';
            
            // Faire défiler vers la question sélectionnée
            selectedQuestionDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    handleSearch() {
        if (!this.selectedQuestion) {
            alert('Veuillez sélectionner une question');
            return;
        }

        const questionDef = this.questionDefinitions[this.selectedQuestion];
        
        const searchData = {
            queryType: 'predefined_competence',
            questionId: this.selectedQuestion,
            questionText: questionDef.text,
            description: questionDef.description
        };

        console.log('Recherche accordéon lancée:', searchData);

        // Émettre l'événement pour la page parent
        this.dispatchEvent(new CustomEvent('search', {
            detail: searchData,
            bubbles: true
        }));
    }

    resetSelection() {
        this.selectedQuestion = null;
        
        // Cacher la section de question sélectionnée
        const selectedQuestionDiv = this.querySelector('#selectedQuestion');
        selectedQuestionDiv.style.display = 'none';
        
        // Retirer toutes les sélections
        this.querySelectorAll('.sub-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Fermer tous les accordéons
        this.querySelectorAll('.accordion-content').forEach(content => {
            content.classList.remove('expanded');
        });
        
        this.querySelectorAll('[data-toggle]').forEach(header => {
            header.classList.remove('expanded');
        });
    }

    // Méthodes publiques
    reset() {
        this.resetSelection();
    }

    getSelectedQuestion() {
        if (!this.selectedQuestion) return null;
        
        const questionDef = this.questionDefinitions[this.selectedQuestion];
        return {
            id: this.selectedQuestion,
            text: questionDef.text,
            description: questionDef.description
        };
    }
}

// Enregistrer le composant
customElements.define('input-competence-component', InputCompetenceComponent);
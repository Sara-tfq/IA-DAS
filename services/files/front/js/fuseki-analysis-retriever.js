// FusekiAnalysisRetriever - Module pour récupérer les analyses depuis Fuseki
// Extrait et adapté depuis la page de modification d'analyses

class FusekiAnalysisRetriever {
  constructor() {
    // 🔥 URL dynamique simple basée sur l'hostname
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
        this.serverURL = 'http://localhost:8003';
    } else {
        // Adaptez cette URL selon votre configuration de production
        this.serverURL = 'http://51.44.188.162:8003';
        // OU si votre API est sur le même serveur :
        // this.serverURL = `${window.location.protocol}//${window.location.hostname}:8003`;
    }
    
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
   
}

    // ================== MÉTHODE PUBLIQUE PRINCIPALE ==================
    
    /**
     * Récupère les données complètes d'une analyse par ID
     * @param {string} analysisId - ID de l'analyse à récupérer
     * @returns {Object} Données de l'analyse au format compatible AnalysisPanel
     */
    async getAnalysisData(analysisId) {
        
        // Vérifier le cache d'abord
        const cacheKey = `analysis_${analysisId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // Charger les données depuis Fuseki
            const rawData = await this.loadCompleteAnalysisData(analysisId);
            
            // Convertir au format attendu par AnalysisPanel
            const analysisData = this.convertToAnalysisPanelFormat(analysisId, rawData);
            
            // Mettre en cache
            this.cache.set(cacheKey, {
                data: analysisData,
                timestamp: Date.now()
            });

            return analysisData;

        } catch (error) {
            console.error(` Erreur récupération Fuseki pour ${analysisId}:`, error);
            return this.createErrorAnalysis(analysisId, error.message);
        }
    }

    /**
     * Récupère toutes les analyses pour un nœud (utilisé par GraphRenderer)
     * @param {Object} nodeData - Données du nœud avec liste d'analyses
     * @returns {Array} Liste des analyses au format AnalysisPanel
     */
    async getAllAnalysesData(nodeData) {
        console.log(` Récupération de toutes les analyses pour: ${nodeData.label}`);
        
        if (!nodeData.analyses || nodeData.analyses.length === 0) {
            console.log(` Aucune analyse liée à ${nodeData.label}`);
            return [];
        }

        const allAnalyses = [];
        
        // Récupérer en parallèle pour de meilleures performances
        const promises = nodeData.analyses.map(analysisId => 
            this.getAnalysisData(analysisId)
        );

        try {
            const results = await Promise.all(promises);
            allAnalyses.push(...results);
            
            console.log(` ${allAnalyses.length} analyses récupérées pour ${nodeData.label}`);
            return allAnalyses;

        } catch (error) {
            console.error(` Erreur lors de la récupération en lot:`, error);
            
            // Fallback : récupérer une par une
            for (const analysisId of nodeData.analyses) {
                try {
                    const analysis = await this.getAnalysisData(analysisId);
                    allAnalyses.push(analysis);
                } catch (individualError) {
                    console.error(` Échec individuel pour ${analysisId}:`, individualError);
                    allAnalyses.push(this.createErrorAnalysis(analysisId, individualError.message));
                }
            }
            
            return allAnalyses;
        }
    }

    // ================== MÉTHODES PRIVÉES (EXTRAITES DE LA PAGE MODIFICATION) ==================

    /**
     * Exécute une requête SPARQL via le serveur
     * @param {string} sparqlQuery - Requête SPARQL à exécuter
     * @returns {Array} Résultats de la requête
     */
    async executeQuery(sparqlQuery) {
        try {
            
            const response = await fetch(this.serverURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    queryType: 'raw_sparql',
                    rawSparqlQuery: sparqlQuery
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return data.results?.bindings || [];
            
        } catch (error) {
            throw new Error(`Impossible de contacter le serveur: ${error.message}`);
        }
    }

    /**
     * Charge toutes les données d'une analyse depuis Fuseki
     * @param {string} analysisId - ID de l'analyse
     * @returns {Object} Données parsées de l'analyse
     */
    async loadCompleteAnalysisData(analysisId) {
        
        // Requête complexe pour récupérer TOUTES les données
        const query = `
PREFIX iadas: <http://ia-das.org/onto#>
PREFIX iadas-data: <http://ia-das.org/data#>
PREFIX bibo: <http://purl.org/ontology/bibo/>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?property ?value ?entity WHERE {
    {
        # Données de l'analyse
        iadas-data:Analysis_${analysisId} ?property ?value .
        BIND("analysis" AS ?entity)
    }
    UNION
    {
        # Données de l'article lié
        ?article iadas:hasAnalysis iadas-data:Analysis_${analysisId} ;
                 ?property ?value .
        BIND("article" AS ?entity)
    }
    UNION
    {
        # Données de la population
        iadas-data:Analysis_${analysisId} iadas:hasPopulation ?population .
        ?population ?property ?value .
        BIND("population" AS ?entity)
    }
    UNION
    {
        # Données du sport
        iadas-data:Analysis_${analysisId} iadas:hasSport ?sport .
        ?sport ?property ?value .
        BIND("sport" AS ?entity)
    }
    UNION
    {
        # Données des relations
        iadas-data:Analysis_${analysisId} iadas:hasRelation ?relation .
        ?relation ?property ?value .
        BIND("relation" AS ?entity)
    }
    UNION
    {
        # Variable dépendante
        iadas-data:Analysis_${analysisId} iadas:hasRelation ?relation .
        ?relation iadas:hasDependentVariable ?varVD .
        ?varVD ?property ?value .
        BIND("variableVD" AS ?entity)
    }
    UNION
    {
        # Variable indépendante
        iadas-data:Analysis_${analysisId} iadas:hasRelation ?relation .
        ?relation iadas:hasIndependentVariable ?varVI .
        ?varVI ?property ?value .
        BIND("variableVI" AS ?entity)
    }
    UNION
    {
        # Statistiques d'âge
        iadas-data:Analysis_${analysisId} iadas:hasPopulation ?population .
        ?population iadas:ageStats ?ageStats .
        ?ageStats ?property ?value .
        BIND("ageStats" AS ?entity)
    }
    UNION
    {
        # Statistiques de BMI
        iadas-data:Analysis_${analysisId} iadas:hasPopulation ?population .
        ?population iadas:bmiStats ?bmiStats .
        ?bmiStats ?property ?value .
        BIND("bmiStats" AS ?entity)
    }
}`;
        
        const results = await this.executeQuery(query);
        return this.parseAnalysisResults(results);
    }

    /**
     * Parse les résultats SPARQL en objet structuré
     * @param {Array} results - Résultats SPARQL
     * @returns {Object} Données structurées
     */
    parseAnalysisResults(results) {
        
        const data = {};
        
        results.forEach(result => {
            const property = result.property?.value;
            const value = result.value?.value;
            const entity = result.entity?.value;
            
            if (!property || !value) return;
            
            // Extraire le nom de la propriété (après le # ou après le dernier /)
            let propName = property.split('#')[1];
            if (!propName) {
                const parts = property.split('/');
                propName = parts[parts.length - 1];
            }
            
            // Mapper selon l'entité
            switch (entity) {
                case 'analysis':
                    this.mapAnalysisProperty(data, propName, value);
                    break;
                case 'article':
                    this.mapArticleProperty(data, propName, value);
                    break;
                case 'population':
                    this.mapPopulationProperty(data, propName, value);
                    break;
                case 'sport':
                    this.mapSportProperty(data, propName, value);
                    break;
                case 'relation':
                    this.mapRelationProperty(data, propName, value);
                    break;
                case 'variableVD':
                    this.mapVariableProperty(data, propName, value, 'vd');
                    break;
                case 'variableVI':
                    this.mapVariableProperty(data, propName, value, 'vi');
                    break;
                case 'ageStats':
                    this.mapAgeStatsProperty(data, propName, value);
                    break;
                case 'bmiStats':
                    this.mapBmiStatsProperty(data, propName, value);
                    break;
            }
        });
        
        return data;
    }

    // ================== FONCTIONS DE MAPPING (EXTRAITES DE LA PAGE MODIFICATION) ==================

    mapAnalysisProperty(data, propName, value) {
        const mapping = {
            'analysisId': 'analysisId',
            'typeOfAnalysis': 'typeOfAnalysis',
            'analysisMultiplicity': 'analysisMultiplicity',
            'relationDegree': 'relationDegree',
            'sampleSizeMobilized': 'sampleSizeMobilized',
            'authorConclusion': 'authorConclusion',
            'limites': 'limites',
            'perspectives': 'perspectives',
            'acads': 'acads',
            'hasMediator': 'mediator',
            'hasModerator': 'moderator',
            'moderatorMeasure': 'moderatorMeasure',
            'mediatorMeasure': 'mediatorMeasure'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapArticleProperty(data, propName, value) {
        const mapping = {
            'doi': 'doi',
            'title': 'title',
            'creator': 'authors',
            'journal': 'journal',
            'date': 'year',
            'country': 'country',
            'studyType': 'studyType'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapPopulationProperty(data, propName, value) {
        const mapping = {
            'sampleSize': 'sampleSize',
            'gender': 'gender',
            'population': 'population',
            'inclusionCriteria': 'inclusionCriteria',
            'hasSubgroup': 'hasSubgroup',
            'sportingPopulation': 'sportingPopulation',
            'sousGroupeAnalyse1': 'sousGroupeAnalyse1',
            'sousGroupeAnalyse2': 'sousGroupeAnalyse2'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapSportProperty(data, propName, value) {
        const mapping = {
            'sportName': 'sportName',
            'sportLevel': 'sportLevel',
            'sportPracticeType': 'sportPracticeType',
            'sportSubcategory': 'sportSubcategory'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapRelationProperty(data, propName, value) {
        const mapping = {
            'degreR': 'degreR',
            'degreP': 'degreP',
            'signeP': 'signeP',
            'degreBeta': 'degreBeta',
            'degreR2': 'degreR2',
            'resultatRelation': 'resultatRelation',
            'sousGroupeAnalyse': 'sousGroupeAnalyse',
            'sousGroupeAnalyse2': 'sousGroupeAnalyse2',
            'relationDegreeSecondary': 'relationDegreeSecondary'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapVariableProperty(data, propName, value, type) {
        const prefix = type === 'vd' ? 'vd' : 'vi';
        
        const mapping = {
            'VD': `${prefix}Name`,
            'VI': `${prefix}Name`,
            'hasCategory': `${prefix}Category`,
            'measure': `${prefix}Measure`,
            'subClass1': `${prefix}SubClass1`,
            'subClass2': `${prefix}SubClass2`,
            'subClass3': `${prefix}SubClass3`,
            'subClass4': `${prefix}SubClass4`,
            'finalClass': `${prefix}FinalClass`,
            'variableType': `${prefix}Type`
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapAgeStatsProperty(data, propName, value) {
        const mapping = {
            'ageDescription': 'ageDescription',
            'meanAge': 'meanAge',
            'sdAge': 'sdAge',
            'minAge': 'minAge',
            'maxAge': 'maxAge'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }
    
    mapBmiStatsProperty(data, propName, value) {
        const mapping = {
            'bmiDescription': 'bmiDescription',
            'meanBMI': 'meanBMI',
            'sdBMI': 'sdBMI',
            'minBMI': 'minBMI',
            'maxBMI': 'maxBMI'
        };
        
        if (mapping[propName]) {
            data[mapping[propName]] = value;
        }
    }

    // ================== CONVERSION POUR ANALYSIS PANEL ==================

    /**
     * Convertit les données Fuseki au format attendu par AnalysisPanel
     * @param {string} analysisId - ID de l'analyse
     * @param {Object} fusekiData - Données brutes de Fuseki
     * @returns {Object} Données au format AnalysisPanel
     */
    convertToAnalysisPanelFormat(analysisId, fusekiData) {
        // Format compatible avec AnalysisPanel (basé sur le code existant)
        return {
            id: analysisId,
            source: 'fuseki', // Marquer la source
            title: fusekiData.title || `Analyse ${analysisId}`,
            vi: fusekiData.viName || 'N/A',
            vd: fusekiData.vdName || fusekiData.acads || 'N/A',
            categoryVI: fusekiData.viCategory || 'N/A',
            categoryVD: fusekiData.vdCategory || 'N/A',
            relation: fusekiData.resultatRelation || 'N/A',
            moderator: fusekiData.moderator || 'N/A',
            mediator: fusekiData.mediator || 'N/A',
            
            // Données brutes pour compatibilité avec AnalysisPanel.renderDetailedAnalysis()
            rawData: {
                Analysis_ID: analysisId,
                Title: fusekiData.title || `Analyse ${analysisId}`,
                Authors: fusekiData.authors || 'N/A',
                'Year ': fusekiData.year || 'N/A',
                DOI: fusekiData.doi || 'N/A',
                Journal: fusekiData.journal || 'N/A',
                Country: fusekiData.country || 'N/A',
                'Types of study': fusekiData.studyType || 'N/A',
                N: fusekiData.sampleSize || 'N/A',
                Population: fusekiData.population || 'N/A',
                Sexe: fusekiData.gender || 'N/A',
                Age: fusekiData.ageDescription || 'N/A',
                AgeForAnalysis_Mean: fusekiData.meanAge || 'N/A',
                SDAnalysis: fusekiData.sdAge || 'N/A',
                MinAge: fusekiData.minAge || 'N/A',
                MaxAge: fusekiData.maxAge || 'N/A',
                BMI: fusekiData.bmiDescription || 'N/A',
                BMI_Mean: fusekiData.meanBMI || 'N/A',
                BMI_SD: fusekiData.sdBMI || 'N/A',
                Sport_name: fusekiData.sportName || 'N/A',
                Sport_level: fusekiData.sportLevel || 'N/A',
                'Type_of _sport_practice': fusekiData.sportPracticeType || 'N/A',
                Subcategory_of_sport: fusekiData.sportSubcategory || 'N/A',
                ACADS: fusekiData.acads || fusekiData.vdName || 'N/A',
                VD: fusekiData.vdName || 'N/A',
                Measure_VD: fusekiData.vdMeasure || 'N/A',
                VI: fusekiData.viName || 'N/A',
                Measure_VI: fusekiData.viMeasure || 'N/A',
                Mediator: fusekiData.mediator || 'N/A',
                Measure_Mediator: fusekiData.mediatorMeasure || 'N/A',
                Moderator: fusekiData.moderator || 'N/A',
                Measure_Moderator: fusekiData.moderatorMeasure || 'N/A',
                Resultat_de_relation: fusekiData.resultatRelation || 'N/A',
                Degre_r: fusekiData.degreR || 'N/A',
                'Degre_p ': fusekiData.degreP || 'N/A',
                Signe_p: fusekiData.signeP || 'N/A',
                Degre_beta: fusekiData.degreBeta || 'N/A',
                Degre_RS: fusekiData.degreR2 || 'N/A',
                Type_of_analysis: fusekiData.typeOfAnalysis || 'N/A',
                'N_mobilise_dans_les analyse': fusekiData.sampleSizeMobilized || 'N/A',
                Authors_conclusions: fusekiData.authorConclusion || 'N/A',
                Limites: fusekiData.limites || 'N/A',
                Perspectives: fusekiData.perspectives || 'N/A',
                Multiplicity_analyse: fusekiData.analysisMultiplicity || 'N/A'
            }
        };
    }

    /**
     * Crée une analyse d'erreur pour les cas d'échec
     * @param {string} analysisId - ID de l'analyse
     * @param {string} errorMessage - Message d'erreur
     * @returns {Object} Analyse d'erreur au format AnalysisPanel
     */
    createErrorAnalysis(analysisId, errorMessage) {
        return {
            id: analysisId,
            source: 'error',
            title: `Analyse ${analysisId}`,
            vi: 'N/A',
            vd: 'N/A',
            relation: 'N/A',
            moderator: 'N/A',
            mediator: 'N/A',
            categoryVI: 'N/A',
            categoryVD: 'N/A',
            error: errorMessage,
            rawData: {
                Analysis_ID: analysisId,
                Title: `Analyse ${analysisId} (erreur)`,
                Authors: 'Données non disponibles',
                'Year ': 'N/A',
                ERROR: errorMessage
            }
        };
    }

    // ================== MÉTHODES UTILITAIRES ==================

    /**
     * Vide le cache (utile pour le debug)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Obtient les statistiques du cache
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();
        const validEntries = entries.filter(([key, data]) => 
            (now - data.timestamp) < this.cacheTimeout
        );
        
        return {
            total: this.cache.size,
            valid: validEntries.length,
            expired: this.cache.size - validEntries.length
        };
    }
}

// Export global pour utilisation
window.FusekiAnalysisRetriever = FusekiAnalysisRetriever;

// Instance globale (optionnelle, pour faciliter l'usage)
window.fusekiRetriever = new FusekiAnalysisRetriever();


class HierarchyService {
  constructor() {
    this.endpoint = window.location.hostname === 'localhost' 
      ? 'http://localhost:8003' 
      : 'http://51.44.188.162:8003';
    
  }

 
  async getHierarchy(conceptLabel) {
 
    
    const startTime = Date.now();
    
    try {
      // Valider le paramètre
      if (!conceptLabel || conceptLabel.trim() === '') {
        throw new Error('Label de concept requis');
      }
      
      
      // Payload pour votre service SPARQL
      const payload = {
        queryType: 'hierarchy',
        concept: conceptLabel.trim()
      };
      
      
      // Appel vers votre service (même logique que vos requêtes actuelles)
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      const sparqlData = await response.json();
      
      // Parser les données hiérarchiques
      const hierarchyData = this.parseHierarchyResponse(sparqlData, conceptLabel);
      
      const totalTime = Date.now() - startTime;
      
      return hierarchyData;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(` Erreur récupération hiérarchie après ${totalTime}ms:`, error);
      
      // Retourner une structure vide mais cohérente
      return {
        concept: conceptLabel,
        parents: [],
        children: [],
        self: null,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Parser la réponse SPARQL en structure hiérarchique
   * @param {Object} sparqlData - Réponse brute du service SPARQL
   * @param {string} originalConcept - Le concept original demandé
   * @returns {Object} - Structure hiérarchique parsée
   */
  parseHierarchyResponse(sparqlData, originalConcept) {

    
    // Vérifier la structure de la réponse
    if (!sparqlData || !sparqlData.results || !sparqlData.results.bindings) {
      throw new Error('Structure de réponse SPARQL invalide');
    }
    
    const bindings = sparqlData.results.bindings;
    
    const parents = [];
    const children = [];
    let self = null;
    
    // Parcourir tous les résultats
    bindings.forEach((binding, index) => {
      console.log(`\n--- Résultat ${index + 1} ---`);
      
      const relation = binding.relation?.value;
      const concept = binding.concept?.value;
      const conceptLabel = binding.conceptLabel?.value || this.extractLabelFromUri(concept);
      const related = binding.related?.value;
      const relatedLabel = binding.relatedLabel?.value || this.extractLabelFromUri(related);
      
     
      // Créer l'objet nœud
      const nodeData = {
        uri: related,
        label: relatedLabel,
        originalConcept: concept,
        originalLabel: conceptLabel
      };
      
      // Classer selon le type de relation
      switch (relation) {
        case 'parent':
          parents.push(nodeData);
          break;
          
        case 'child':
          children.push(nodeData);
          break;
          
        case 'self':
          self = nodeData;
          break;
          
        default:
          console.warn(`    Type de relation inconnu: ${relation}`);
      }
    });
    
    
    
    if (parents.length > 0) {
      console.log(`   Parents: ${parents.map(p => p.label).join(', ')}`);
    }
    
    if (children.length > 0) {
      console.log(`   Enfants: ${children.map(c => c.label).join(', ')}`);
    }
    
    const result = {
      concept: originalConcept,
      self: self,
      parents: parents,
      children: children,
      totalResults: bindings.length,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    console.log(` Parsing terminé avec succès`);
    return result;
  }

  /**
   * Extraire un label lisible depuis une URI
   * @param {string} uri - URI ontologique
   * @returns {string} - Label extrait
   */
  extractLabelFromUri(uri) {
    if (!uri) return 'Inconnu';
    
    // Extraire la partie après le dernier # ou /
    const parts = uri.split(/[#\/]/);
    const lastPart = parts[parts.length - 1];
    
    // Convertir CamelCase en mots séparés
    const readable = lastPart
      .replace(/([A-Z])/g, ' $1')  // Ajouter espace avant majuscules
      .trim()                      // Supprimer espaces début/fin
      .replace(/\s+/g, ' ');       // Normaliser espaces multiples
    
    return readable || 'Inconnu';
  }

  /**
   * Tester la connectivité avec le service SPARQL
   * @returns {Promise<boolean>} - True si le service répond
   */
  async testConnectivity() {
    
    try {
      // Utiliser un concept simple pour tester
      const testResult = await this.getHierarchy('Depression');
      
     
      return testResult.success;
      
    } catch (error) {
      console.error(` Service SPARQL inaccessible:`, error.message);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de hiérarchie pour un concept
   * @param {Object} hierarchyData - Données hiérarchiques
   * @returns {Object} - Statistiques
   */
  getHierarchyStats(hierarchyData) {
    if (!hierarchyData || !hierarchyData.success) {
      return {
        hasParents: false,
        hasChildren: false,
        isEmpty: true,
        parentCount: 0,
        childCount: 0,
        totalNodes: 0
      };
    }
    
    const parentCount = hierarchyData.parents.length;
    const childCount = hierarchyData.children.length;
    const totalNodes = parentCount + childCount + (hierarchyData.self ? 1 : 0);
    
    return {
      hasParents: parentCount > 0,
      hasChildren: childCount > 0,
      isEmpty: totalNodes <= 1, // Seulement le concept lui-même
      parentCount: parentCount,
      childCount: childCount,
      totalNodes: totalNodes,
      concept: hierarchyData.concept
    };
  }
}

// Créer une instance globale (comme vos autres services)
if (typeof window !== 'undefined') {
  window.hierarchyService = new HierarchyService();
}
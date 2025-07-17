// Composant principal pour la visualisation d'ontologie
// Ceci est le code injecté lors de l'affichage du résultat d'une requête SPARQL.

// TODO , corriger les boutons. 
// TODO , ajouter un bouton pour exporter les données en JSON, CSV, SPARQL.
// TODO ,Ajouter un bouton pour prendre des screeschots de la visualisation.

class OntologyGraphComponent {
  
  constructor(container, sparqlData) {
    this.container = container;
    this.sparqlData = sparqlData;
    this.parsedData = null;
    this.renderer = null;
    
    this.init();
  }
  
  init() {
    try {
      // Parser les données SPARQL
      this.parsedData = SPARQLDataParser.parse(this.sparqlData);
      
      // Créer le renderer
      this.renderer = new GraphRenderer(this.container, this.parsedData);
      
      console.log('Composant initialisé avec succès');
      console.log('Données parsées:', this.parsedData);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      this.showError('Erreur lors de l\'initialisation du composant: ' + error.message);
    }
  }
  
  render() {
    if (!this.renderer) {
      this.showError('Renderer non initialisé');
      return;
    }
    
    try {
      // Vider le conteneur
      this.clear();
      
      // Ajouter un titre
      this.addTitle();
      
      // Rendre la visualisation
      this.renderer.render();
      
      console.log('Visualisation rendue avec succès');
      
    } catch (error) {
      console.error('Erreur lors du rendu:', error);
      this.showError('Erreur lors du rendu: ' + error.message);
    }
  }
  
  clear() {
    // Vider le conteneur mais garder la structure
    this.container.innerHTML = '';
  }
  
  addTitle() {
    const title = document.createElement('h3');
    title.textContent = 'Résultats de la requête ontologique';
    title.style.marginBottom = '20px';
    title.style.color = '#2c3e50';
    this.container.appendChild(title);
  }
  
  showError(message) {
    this.container.innerHTML = `
      <div style="
        background-color: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 5px;
        border: 1px solid #f5c6cb;
        margin: 10px 0;
      ">
        <strong>Erreur:</strong> ${message}
      </div>
    `;
  }
  
  // Méthodes publiques pour l'interaction
  
  updateData(newSparqlData) {
    try {
      this.sparqlData = newSparqlData;
      this.parsedData = SPARQLDataParser.parse(newSparqlData);
      this.renderer = new GraphRenderer(this.container, this.parsedData);
      this.render();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      this.showError('Erreur lors de la mise à jour: ' + error.message);
    }
  }
  
  getStatistics() {
    if (!this.parsedData) return null;
    
    return {
      totalResults: this.parsedData.data.length,
      variables: this.parsedData.variables,
      dataTypes: SPARQLDataParser.detectDataTypes(this.parsedData)
    };
  }
  
  exportData(format = 'json') {
    if (!this.parsedData) return null;
    
    switch (format) {
      case 'json':
        return JSON.stringify(this.parsedData.data, null, 2);
      case 'csv':
        return this.convertToCSV(this.parsedData.data);
      case 'sparql':
        return JSON.stringify(this.sparqlData, null, 2);
      default:
        return this.parsedData.data;
    }
  }
  
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // En-têtes
    csvRows.push(headers.join(','));
    
    // Données
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'object' && value && value.label) {
          return `"${value.label}"`;
        }
        return `"${value || ''}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  // Méthodes de debug
  
  debug() {
    console.log('=== DEBUG ONTOLOGY GRAPH COMPONENT ===');
    console.log('SPARQL Data:', this.sparqlData);
    console.log('Parsed Data:', this.parsedData);
    console.log('Statistics:', this.getStatistics());
    console.log('=====================================');
  }
}

// Fonction utilitaire pour créer rapidement un composant
function createOntologyGraph(containerId, sparqlData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Conteneur ${containerId} non trouvé`);
    return null;
  }
  
  const component = new OntologyGraphComponent(container, sparqlData);
  component.render();
  return component;
}
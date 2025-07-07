// Parser pour données SPARQL JSON - Version graphe réseau
class SPARQLDataParser {
  
  static parse(sparqlData) {
    if (!sparqlData || !sparqlData.results || !sparqlData.results.bindings) {
      throw new Error('Format de données SPARQL invalide');
    }
    
    const vars = sparqlData.head.vars;
    const bindings = sparqlData.results.bindings;
    
    return {
      variables: vars,
      data: bindings.map(binding => this.parseBinding(binding, vars)),
      networkData: this.createNetworkData(bindings, vars),
      rawData: sparqlData
    };
  }
  
  static parseBinding(binding, vars) {
    const parsed = {};
    
    vars.forEach(varName => {
      if (binding[varName]) {
        parsed[varName] = this.parseValue(binding[varName]);
      } else {
        parsed[varName] = null;
      }
    });
    
    return parsed;
  }
  
  static parseValue(sparqlValue) {
    const value = sparqlValue.value;
    const type = sparqlValue.type;
    const datatype = sparqlValue.datatype;
    
    // Conversion selon le type
    if (type === 'literal') {
      if (datatype) {
        if (datatype.includes('decimal') || datatype.includes('double') || datatype.includes('float')) {
          return parseFloat(value);
        }
        if (datatype.includes('integer') || datatype.includes('int')) {
          return parseInt(value);
        }
        if (datatype.includes('boolean')) {
          return value === 'true';
        }
      }
      return value; // String par défaut
    }
    
    if (type === 'uri') {
      return {
        uri: value,
        label: this.extractLabel(value)
      };
    }
    
    return value;
  }
  
  static extractLabel(uri) {
    // Extraire le nom de l'URI pour l'affichage
    const parts = uri.split(/[/#]/);
    return parts[parts.length - 1] || uri;
  }
  
  // NOUVELLE FONCTION : Créer les données pour le graphe réseau
  static createNetworkData(bindings, vars) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map(); // Pour éviter les doublons
    
    bindings.forEach((binding, index) => {
      // Créer un nœud central pour chaque résultat (entité principale)
      const centralNodeId = `entity_${index}`;
      const centralNode = {
        id: centralNodeId,
        label: `Entité ${index + 1}`,
        type: 'entity',
        size: 15,
        color: '#3498db'
      };
      
      if (!nodeMap.has(centralNodeId)) {
        nodes.push(centralNode);
        nodeMap.set(centralNodeId, centralNode);
      }
      
      // Créer des nœuds pour chaque propriété
      vars.forEach(varName => {
        if (binding[varName]) {
          const value = this.parseValue(binding[varName]);
          const valueStr = typeof value === 'object' && value.label ? value.label : String(value);
          const valueNodeId = `${varName}_${valueStr}`;
          
          // Créer le nœud de valeur s'il n'existe pas
          if (!nodeMap.has(valueNodeId)) {
            const valueNode = {
              id: valueNodeId,
              label: valueStr,
              type: 'value',
              property: varName,
              size: 10,
              color: this.getColorByProperty(varName)
            };
            nodes.push(valueNode);
            nodeMap.set(valueNodeId, valueNode);
          }
          
          // Créer le lien entre l'entité et la valeur
          links.push({
            source: centralNodeId,
            target: valueNodeId,
            label: varName,
            type: 'property'
          });
        }
      });
    });
    
    return { nodes, links };
  }
  
  static getColorByProperty(property) {
    const colors = {
      'gender': '#e74c3c',
      'age': '#f39c12',
      'sportName': '#2ecc71',
      'name': '#9b59b6',
      'sport': '#2ecc71',
      'default': '#95a5a6'
    };
    return colors[property] || colors.default;
  }
  
  static detectDataTypes(parsedData) {
    const types = {};
    
    parsedData.variables.forEach(varName => {
      const values = parsedData.data.map(row => row[varName]).filter(v => v !== null);
      
      if (values.length === 0) {
        types[varName] = 'empty';
        return;
      }
      
      const firstValue = values[0];
      
      if (typeof firstValue === 'number') {
        types[varName] = 'numeric';
      } else if (typeof firstValue === 'string') {
        types[varName] = 'categorical';
      } else if (typeof firstValue === 'object' && firstValue.uri) {
        types[varName] = 'uri';
      } else {
        types[varName] = 'unknown';
      }
    });
    
    return types;
  }
}
// Parser pour affichage ontologique concret et compréhensible
// Ce code est la pour "Traduire" les données si y'en besoin, pas exemple + devient à risque, - devient protecteur, etc.

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
      networkData: this.createConcreteOntologyNetwork(bindings, vars),
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
      return value;
    }
    
    return value;
  }
  
  

static createConcreteOntologyNetwork(bindings, vars) {
  const nodes = [];
  const links = [];
  const nodeMap = new Map();
  
  //  Afficher les variables disponibles
  console.log("=== DEBUG PARSER ===");
  console.log("Variables disponibles:", vars);
  console.log("Nombre de résultats:", bindings.length);
  
  //  Afficher le premier résultat
  if (bindings.length > 0) {
    console.log("Premier résultat:", bindings[0]);
    
    // Lister toutes les propriétés du premier binding
    Object.keys(bindings[0]).forEach(key => {
      const value = this.parseValue(bindings[0][key]);
      console.log(`${key}: ${value}`);
    });
  }
  
  bindings.forEach((binding, index) => {
    console.log(`\n--- Résultat ${index + 1} ---`);
    
    //  Afficher chaque valeur
    const vi = binding.vi ? this.parseValue(binding.vi) : null;
    const vd = binding.vd ? this.parseValue(binding.vd) : null;
    const relation = binding.resultatRelation ? this.parseValue(binding.resultatRelation) : null;
    
    console.log(`VI (facteur): ${vi}`);
    console.log(`VD (ACAD): ${vd}`);
    console.log(`Relation: ${relation}`);
    
    // Si on a au moins VI ou VD, créer des nœuds
    if (vi) {
      const factorNodeId = `factor_${vi}`;
      if (!nodeMap.has(factorNodeId)) {
        console.log(`Création nœud facteur: ${vi}`);
        nodes.push({
          id: factorNodeId,
          label: vi,
          type: 'factor',
          size: 20,
          color: '#3498db'
        });
        nodeMap.set(factorNodeId, true);
      }
    }
    
    if (vd) {
      const acadNodeId = `acad_${vd}`;
      if (!nodeMap.has(acadNodeId)) {
        console.log(`Création nœud ACAD: ${vd}`);
        nodes.push({
          id: acadNodeId,
          label: vd,
          type: 'acad',
          size: 20,
          color: '#e74c3c'
        });
        nodeMap.set(acadNodeId, true);
      }
    }
    
    // Créer lien si on a facteur ET ACAD
    if (vi && vd) {
      console.log(`Création lien: ${vi} -> ${vd} (${relation})`);
      links.push({
        source: `factor_${vi}`,
        target: `acad_${vd}`,
        label: relation || 'relation',
        type: 'factor-acad',
        color: '#95a5a6'
      });
    }
  });
  
  console.log(`RÉSULTAT FINAL: ${nodes.length} nœuds, ${links.length} liens`);
  console.log("Nœuds:", nodes);
  console.log("Liens:", links);
  
  return { nodes, links };
}
  

  // FONCTIONS DE TRADUCTION POUR RENDRE COMPRÉHENSIBLE
  static translateGender(gender) {
    const translations = {
      'male': 'Hommes',
      'female': 'Femmes',
      'mixed': 'Mixte'
    };
    return translations[gender] || gender;
  }
  
  static translateRelation(relation) {
    const translations = {
      '+': 'Facteur de risque',
      '-': 'Facteur protecteur',
      'NS': 'Relation non significative'
    };
    return translations[relation] || relation;
  }
  
  static getRelationColor(relation) {
    console.log(`La fonction color est appelée Relation: ${relation}`);

    const colors = {
      '+': '#e74c3c',      // Rouge pour risque
      '-': '#2ecc71',      // Vert pour protecteur
      'NS': '#95a5a6'      // Gris pour non significatif
    };
    return colors[relation] || '#95a5a6';
  }
  
  static getRelationStrength(binding) {
    // Extraire la force de la relation (r, p-value, etc.)
    const degreR = binding.degreR ? this.parseValue(binding.degreR) : null;
    const degreP = binding.degreP ? this.parseValue(binding.degreP) : null;
    
    let strength = '';
    if (degreR) strength += `r=${degreR}`;
    if (degreP) strength += strength ? `, p=${degreP}` : `p=${degreP}`;
    
    return strength || 'Force inconnue';
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
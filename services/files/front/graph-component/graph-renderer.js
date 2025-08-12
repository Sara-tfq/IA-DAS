// Moteur de rendu D3.js pour graphe réseau ontologique
// Modifié pour utiliser les couleurs du parser + panneau latéral + liens courbés + chargement forcé Excel

class GraphRenderer {

  constructor(container, parsedData) {
    this.container = container;
    this.parsedData = parsedData;
    this.margin = { top: 20, right: 30, bottom: 40, left: 50 };
    this.width = 900 - this.margin.left - this.margin.right;
    this.height = 600 - this.margin.top - this.margin.bottom;
    this.simulation = null;
  }

  render() {
    // FORCER le graphe réseau pour toutes les données ontologiques
    this.createSVG();
    this.renderNetworkGraph();
    this.addControls();
  }

  createSVG() {
    // Supprimer l'ancien SVG s'il existe
    d3.select(this.container).select('svg').remove();

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    // Ajouter le zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  renderNetworkGraph() {
    const networkData = this.parsedData.networkData;
    const nodes = [...networkData.nodes]; // Copie pour D3
    const links = [...networkData.links]; // Copie pour D3

    console.log('🎨 Rendu du graphe avec liens courbés:', { nodes: nodes.length, links: links.length });
    
    // Debug : Afficher les nœuds avec leur taille
    nodes.forEach(node => {
      console.log(`🎨 Nœud "${node.label}" (${node.type}) -> Couleur: ${node.color}, Taille: ${node.size}, Analyses: ${node.analyses ? node.analyses.length : 'N/A'}`);
    });

    // Debug : Afficher les couleurs des liens
    links.forEach(link => {
      console.log(`🔗 Lien "${link.label}" -> Couleur: ${link.color}`);
    });

    // 🆕 NOUVELLE LOGIQUE : Calculer les courbes pour liens multiples
    const processedLinks = this.calculateLinkCurves(links);

    // Créer la simulation de force
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(processedLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10));

    // 🆕 DESSINER LES LIENS COURBÉS au lieu de lignes droites
    const link = this.g.append('g')
      .attr('class', 'links')
      .selectAll('path') // ← CHANGEMENT : path au lieu de line
      .data(processedLinks)
      .enter().append('path')
      .attr('class', 'link')
      .style('fill', 'none')
      .style('stroke', d => {
        console.log(`🔗 Application couleur lien: ${d.color}`);
        return d.color || '#aaa'; // Utiliser la couleur du parser ou gris par défaut
      })
      .style('stroke-width', 3) // Plus épais pour mieux voir les couleurs
      .style('opacity', 0.8);

    // Labels des liens (repositionnés pour les courbes)
    const linkLabels = this.g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(processedLinks)
      .enter().append('text')
      .attr('class', 'link-label')
      .style('font-size', '10px')
      .style('fill', '#666')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text(d => d.label);

    // Dessiner les nœuds AVEC les couleurs du parser
    const node = this.g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .call(d3.drag()
        .on('start', (event, d) => this.dragstarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragended(event, d)));

    // Cercles des nœuds avec couleurs du parser
    node.append('circle')
      .attr('r', d => d.size)
      .style('fill', d => {
        console.log(`🎨 Application couleur nœud "${d.label}": ${d.color}`);
        return d.color || '#808080'; // Utiliser la couleur du parser ou gris par défaut
      })
      .style('stroke', '#fff')
      .style('stroke-width', d => d.type === 'entity' ? 3 : 2)
      .style('cursor', 'pointer'); // ← NOUVEAU : Indique que c'est cliquable

    // Labels des nœuds
    const nodeLabels = this.g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .attr('class', 'node-label')
      .style('font-size', '12px')
      .style('font-weight', d => d.type === 'entity' ? 'bold' : 'normal')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text(d => this.truncateLabel(d.label, 40));

    // Tooltip amélioré avec catégories et instruction
    node.on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());

    // 🆕 DOUBLE-CLIC pour ouvrir le panneau latéral
    node.on('dblclick', (event, d) => {
      console.log(`📋 Double-clic sur nœud: ${d.label}`);
      
      // Empêcher les autres comportements
      event.stopPropagation();
      event.preventDefault();
      
      // Ouvrir le panneau avec les données
      this.openAnalysisPanel(d);
    });

    // 🔄 SIMPLE CLIC pour fixer/libérer un nœud (modifié)
    node.on('click', (event, d) => {
      // Délai pour distinguer simple clic du double-clic
      setTimeout(() => {
        if (event.detail === 1) { // Simple clic seulement
          d.fx = d.fx ? null : d.x;
          d.fy = d.fy ? null : d.y;
          this.simulation.alpha(0.3).restart();
          console.log(`📌 Nœud ${d.fx ? 'fixé' : 'libéré'}: ${d.label}`);
        }
      }, 200);
    });

    // 🆕 NOUVELLE LOGIQUE : Mise à jour avec chemins courbés
    this.simulation.on('tick', () => {
      // Mettre à jour les chemins courbés
      link.attr('d', d => this.createCurvedPath(d));

      // Mettre à jour les labels sur les courbes
      linkLabels
        .attr('x', d => this.getCurveMidpoint(d).x)
        .attr('y', d => this.getCurveMidpoint(d).y);

      // Mettre à jour les nœuds
      node.attr('transform', d => `translate(${d.x},${d.y})`);
      nodeLabels.attr('transform', d => `translate(${d.x},${d.y + d.size + 15})`);
    });
  }

  // 🆕 NOUVELLE FONCTION : Calculer les courbes pour liens multiples
  calculateLinkCurves(links) {
    // Grouper les liens par paire source-target
    const linkGroups = new Map();
    
    links.forEach(link => {
      const key = `${link.source}_${link.target}`;
      const reverseKey = `${link.target}_${link.source}`;
      
      // Utiliser la clé dans un sens cohérent
      const groupKey = key < reverseKey ? key : reverseKey;
      
      if (!linkGroups.has(groupKey)) {
        linkGroups.set(groupKey, []);
      }
      linkGroups.get(groupKey).push(link);
    });

    // Assigner des courbes à chaque groupe
    const processedLinks = [];
    
    linkGroups.forEach((groupLinks, groupKey) => {
      const linkCount = groupLinks.length;
      
      groupLinks.forEach((link, index) => {
        // Calculer l'offset de courbe
        let curveOffset = 0;
        
        if (linkCount > 1) {
          // Répartir les liens autour de la ligne droite
          const step = 60 / (linkCount - 1); // 60 pixels d'étalement maximum
          curveOffset = (index - (linkCount - 1) / 2) * step;
        }
        
        processedLinks.push({
          ...link,
          curveOffset: curveOffset,
          linkIndex: index,
          totalLinks: linkCount
        });
        
        console.log(`🔗 Lien ${link.label}: offset ${curveOffset}, groupe de ${linkCount} liens`);
      });
    });

    return processedLinks;
  }

  // 🆕 NOUVELLE FONCTION : Créer un chemin courbé
  createCurvedPath(d) {
    const sourceX = d.source.x;
    const sourceY = d.source.y;
    const targetX = d.target.x;
    const targetY = d.target.y;
    
    // Si pas de courbe, ligne droite
    if (!d.curveOffset || d.curveOffset === 0) {
      return `M${sourceX},${sourceY}L${targetX},${targetY}`;
    }
    
    // Calculer le point de contrôle pour la courbe
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Vecteur perpendiculaire pour l'offset
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return `M${sourceX},${sourceY}L${targetX},${targetY}`;
    
    // Point de contrôle décalé perpendiculairement
    const offsetX = midX + (-dy / length) * d.curveOffset;
    const offsetY = midY + (dx / length) * d.curveOffset;
    
    // Créer une courbe quadratique
    return `M${sourceX},${sourceY}Q${offsetX},${offsetY} ${targetX},${targetY}`;
  }

  // 🆕 NOUVELLE FONCTION : Point milieu d'une courbe
  getCurveMidpoint(d) {
    const sourceX = d.source.x;
    const sourceY = d.source.y;
    const targetX = d.target.x;
    const targetY = d.target.y;
    
    if (!d.curveOffset || d.curveOffset === 0) {
      return {
        x: (sourceX + targetX) / 2,
        y: (sourceY + targetY) / 2
      };
    }
    
    // Calculer le point milieu de la courbe
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { x: midX, y: midY };
    
    const offsetX = midX + (-dy / length) * d.curveOffset * 0.5; // Milieu de la courbe
    const offsetY = midY + (dx / length) * d.curveOffset * 0.5;
    
    return { x: offsetX, y: offsetY };
  }

  // 🆕 NOUVELLE FONCTION : Ouvrir le panneau latéral avec toutes les analyses
  openAnalysisPanel(nodeData) {
    console.log(`📋 Ouverture panneau pour nœud: ${nodeData.label}`);
    console.log(`📊 Analyses liées: ${nodeData.analyses ? nodeData.analyses.length : 0}`);
    
    // Vérifier que le panneau est disponible
    if (typeof window.analysisPanel === 'undefined') {
      console.error('❌ AnalysisPanel non disponible ! Assurez-vous qu\'il est chargé.');
      alert('Erreur: Le panneau d\'analyse n\'est pas disponible.\n\nVérifiez que analysis-panel.js est chargé.');
      return;
    }

    // Récupérer TOUTES les données d'analyses pour ce nœud
    this.getAllAnalysesData(nodeData).then(allAnalysesData => {
      // Ouvrir le panneau avec toutes les analyses
      window.analysisPanel.openMultipleAnalyses(nodeData.label, allAnalysesData);
    });
  }

  // 🆕 NOUVELLE FONCTION : Récupérer TOUTES les données d'analyses d'un nœud (async)
  async getAllAnalysesData(nodeData) {
    console.log(`🔍 Récupération de toutes les analyses pour: ${nodeData.label}`);
    
    const allAnalyses = [];
    
    if (nodeData.analyses && nodeData.analyses.length > 0) {
      for (const analysisId of nodeData.analyses) {
        const analysisData = await this.getAnalysisData(analysisId);
        allAnalyses.push(analysisData);
      }
    }
    
    console.log(`✅ ${allAnalyses.length} analyses récupérées pour ${nodeData.label}`);
    return allAnalyses;
  }

  // 🆕 FONCTION AVEC CHARGEMENT FORCÉ : Récupérer les données d'UNE analyse
  async getAnalysisData(analysisId) {
    console.log(`🔍 Récupération données pour analyse: ${analysisId}`);
    
    // ✅ FORCER LE CHARGEMENT EXCEL SI NÉCESSAIRE
    if (!window.csvLoader?.isCSVLoaded()) {
      console.log("🔄 Forçage du chargement Excel...");
      return await this.loadExcelAndGetAnalysis(analysisId);
    }

    // Chercher dans le CSV
    const csvRow = window.csvLoader.findAnalysisById(analysisId);
    
    if (csvRow) {
      console.log(`✅ Données trouvées pour analyse ${analysisId}:`, csvRow);
      
      return {
        id: analysisId,
        title: csvRow['Title'] || `Analyse ${analysisId}`,
        vi: csvRow['VI'] || 'N/A',
        vd: csvRow['VD'] || csvRow['ACADS'] || 'N/A',
        relation: csvRow['Resultat_de_relation'] || csvRow['Degre_de_relation'] || 'N/A',
        moderator: csvRow['Moderator'] || 'N/A',
        mediator: csvRow['Mediator'] || 'N/A',
        categoryVI: csvRow['sub-class_Final_VI'] || 'N/A',
        categoryVD: csvRow['sub-class_Final_VD'] || 'N/A',
        rawData: csvRow 
      };
    } else {
      console.log(`⚠️ Données non trouvées pour analyse ${analysisId}`);
      return this.createErrorAnalysis(analysisId, 'Données non trouvées');
    }
  }

  // ✅ NOUVELLE MÉTHODE : Charger Excel et récupérer l'analyse
  async loadExcelAndGetAnalysis(analysisId) {
    try {
      console.log("⏳ Chargement Excel en cours...");
      
      // Tester différents chemins
      const paths = [
        './data/IA-DAS-Data1.xlsx',
        'data/IA-DAS-Data1.xlsx',
        '../data/IA-DAS-Data1.xlsx'
      ];
      
      let data = null;
      for (const path of paths) {
        try {
          console.log(`🔍 Test chemin Excel: ${path}`);
          data = await window.excelLoader.loadExcelData(path);
          if (data && data.length > 0) {
            console.log(`✅ Excel chargé avec succès: ${data.length} analyses depuis ${path}`);
            break;
          }
        } catch (pathError) {
          console.log(`❌ Échec ${path}:`, pathError.message);
        }
      }
      
      if (data && data.length > 0) {
        // Maintenant chercher l'analyse
        const csvRow = window.csvLoader.findAnalysisById(analysisId);
        
        if (csvRow) {
          console.log(`✅ Analyse ${analysisId} trouvée après chargement Excel:`, csvRow);
          return {
            id: analysisId,
            title: csvRow['Title'] || `Analyse ${analysisId}`,
            vi: csvRow['VI'] || 'N/A',
            vd: csvRow['VD'] || csvRow['ACADS'] || 'N/A',
            relation: csvRow['Resultat_de_relation'] || 'N/A',
            moderator: csvRow['Moderator'] || 'N/A',
            mediator: csvRow['Mediator'] || 'N/A',
            rawData: csvRow
          };
        }
      }
    } catch (error) {
      console.error("❌ Erreur chargement Excel:", error);
    }
    
    return this.createErrorAnalysis(analysisId, 'Chargement Excel échoué');
  }

  // Méthode utilitaire pour créer une analyse d'erreur
  createErrorAnalysis(analysisId, errorMessage) {
    return {
      id: analysisId,
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
        Year: 'N/A'
      }
    };
  }

  // Fonctions de drag (inchangées)
  dragstarted(event, d) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragended(event, d) {
    if (!event.active) this.simulation.alphaTarget(0);
    // Ne pas libérer automatiquement - laisser l'utilisateur cliquer
  }

  truncateLabel(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  showTooltip(event, d) {
    // Supprimer l'ancien tooltip
    d3.selectAll('.tooltip').remove();

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('opacity', 0);

    let tooltipText = `<strong>${d.label}</strong><br/>`;
    tooltipText += `Type: ${d.type}<br/>`;
    if (d.category) tooltipText += `Catégorie: ${d.category}<br/>`;
    if (d.analyses) tooltipText += `Analyses: ${d.analyses.length}<br/>`;
    else if (d.analysisId) tooltipText += `Analyse: ${d.analysisId}<br/>`;
    tooltipText += `<em>Double-clic pour ouvrir le panneau</em>`;

    tooltip.html(tooltipText)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

  hideTooltip() {
    d3.selectAll('.tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }

  addControls() {
    const controls = d3.select(this.container)
      .insert('div', ':first-child')
      .attr('class', 'graph-controls')
      .style('margin-bottom', '10px');

    // Légende des couleurs
    this.addColorLegend(controls);

    // Instructions d'interaction
    this.addInteractionInstructions(controls);

    // Informations
    controls.append('span')
      .style('margin-left', '20px')
      .text(`${this.parsedData.networkData.nodes.length} nœuds, ${this.parsedData.networkData.links.length} liens`);
  }

  addColorLegend(controls) {
    const legend = controls.append('div')
      .style('margin-bottom', '10px')
      .style('font-size', '12px');

    // legend.append('strong').text('Légende: ');

    // Légende relations
  //   legend.append('span')
  //     .style('margin-left', '10px')
  //     .html('🔗 <span style="color: #E53E3E;">■</span> Risque (+) ' +
  //           '<span style="color: #38A169;">■</span> Protecteur (-) ' +
  //           '<span style="color: #718096;">■</span> Non significatif (NS)');

  //   // Légende types de nœuds
  //   legend.append('div')
  //     .style('margin-top', '5px')
  //     .html('🎯 <span style="color: #C62828;">●</span> ACAD ' +
  //           '<span style="color: #1565C0;">●</span> Facteurs ' +
  //           '<span style="color: #FFD700;">●</span> Médiateurs ' +
  //           '<span style="color: #FF8C00;">●</span> Modérateurs');
  // }
  }

  addInteractionInstructions(controls) {
   
  }
  
}
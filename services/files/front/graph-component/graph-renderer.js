// Moteur de rendu D3.js pour graphe réseau ontologique
// Modifié pour utiliser les couleurs du parser + panneau latéral + liens courbés + chargement forcé Excel

class GraphRenderer {
  constructor(container, parsedData) {
    this.container = container;
    this.parsedData = parsedData;
    this.margin = { top: 20, right: 30, bottom: 40, left: 50 };
    this.updateDimensions();
    this.simulation = null;
    this.hierarchyNodes = [];
    this.hierarchyLinks = [];
    this.hierarchyVisible = false;
    this.currentHierarchyConcept = null;
    this.longClickTimer = null;
    this.longClickNode = null;
    this.longClickEvent = null;
    this.longClickInProgress = false;
  }

  updateDimensions() {
    const containerRect = this.container.getBoundingClientRect();
    this.width = Math.max(containerRect.width - this.margin.left - this.margin.right, 600);
    this.height = Math.max(containerRect.height - this.margin.top - this.margin.bottom, 400);
  }

  handleResize() {
    this.updateDimensions();
    // Redessiner le graphique si nécessaire
    if (this.svg) {
      this.svg.attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom);
    }
  }

  render() {
    // FORCER le graphe réseau pour toutes les données ontologiques
    this.createSVG();
    this.renderNetworkGraph();
    // this.addControls();
  }

  render() {
    // FORCER le graphe réseau pour toutes les données ontologiques
    this.createSVG();
    this.renderNetworkGraph();
    // this.addControls();
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
    console.log('🚀 === DÉBUT RENDERNETWORKGRAPH ===');

    const networkData = this.parsedData.networkData;
    const nodes = [...networkData.nodes];
    const links = [...networkData.links];

    console.log('🎨 Rendu du graphe avec liens courbés:', { nodes: nodes.length, links: links.length });

    const processedLinks = this.calculateLinkCurves(links);

    // Créer la simulation de force
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(processedLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10));

    // Créer les liens
    const link = this.g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(processedLinks)
      .enter().append('path')
      .attr('class', 'link')
      .style('fill', 'none')
      .style('stroke', d => d.color || '#aaa')
      .style('stroke-width', 3)
      .style('opacity', 0.8);

    // Labels des liens
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

    // Dessiner les nœuds
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

    // Cercles des nœuds
    node.append('circle')
      .attr('r', d => d.size)
      .style('fill', d => d.color || '#808080')
      .style('stroke', '#fff')
      .style('stroke-width', d => d.type === 'entity' ? 3 : 2)
      .style('cursor', 'pointer');

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

    // ✅ GESTIONNAIRES D'ÉVÉNEMENTS CORRIGÉS
    console.log('🎯 === ATTACHEMENT DES GESTIONNAIRES D\'ÉVÉNEMENTS ===');

    node
      .on('mouseover', (event, d) => {
        console.log(`🐭 Mouseover sur: ${d.label}`);
        if (!this.longClickInProgress) { // ← Ne pas afficher tooltip pendant clic prolongé
          this.showTooltip(event, d);
        }
      })
      .on('mouseout', (event, d) => {
        console.log(`🐭 Mouseout de: ${d.label}`);
        this.hideTooltip();
      })
      .on('dblclick', (event, d) => {
        console.log(`📋 Double-clic sur nœud: ${d.label}`);
        console.log(`La la je suis dans le graph rendrererererezrzerzerzerzeze ptn ça ne veut pas marcher  fjjdjdjfj`)
        event.stopPropagation();
        event.preventDefault();
        this.cancelLongClickTimer();
        this.openAnalysisPanel(d);
      })
      // ✅ ÉVÉNEMENTS CLIC PROLONGÉ CORRIGÉS
      .on('mousedown', (event, d) => {
        console.log(`⬇️ MOUSEDOWN sur: ${d.label} - DÉMARRAGE CLIC PROLONGÉ`);
        event.preventDefault(); // ← Empêcher la sélection de texte
        this.startLongClickTimer(event, d);
      })
      .on('mouseup', (event, d) => {
        console.log(`⬆️ MOUSEUP sur: ${d.label} - ARRÊT CLIC PROLONGÉ`);
        this.cancelLongClickTimer();
      })
      .on('mouseleave', (event, d) => {
        console.log(`🚪 MOUSELEAVE de: ${d.label} - ANNULATION CLIC PROLONGÉ`);
        this.cancelLongClickTimer();
        this.hideTooltip();
      })
      // ✅ NOUVEAU: Gestion du simple clic (fixation du nœud)
      .on('click', (event, d) => {
        if (!this.longClickInProgress) {
          // Délai pour distinguer simple clic du double-clic
          setTimeout(() => {
            if (event.detail === 1) { // Simple clic seulement
              d.fx = d.fx ? null : d.x;
              d.fy = d.fy ? null : d.y;
              this.simulation.alpha(0.3).restart();
              console.log(`📌 Nœud ${d.fx ? 'fixé' : 'libéré'}: ${d.label}`);
            }
          }, 200);
        }
      });

    console.log('✅ TOUS les gestionnaires d\'événements attachés aux nœuds');

    // Animation tick
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

    console.log('🎉 === FIN RENDERNETWORKGRAPH - TOUT EST PRÊT ===');
  }

  // ✅ FONCTIONS CLIC PROLONGÉ CORRIGÉES
  startLongClickTimer(event, nodeData) {
    console.log(`⏳ Début clic prolongé sur: ${nodeData.label}`);

    // Nettoyer tout état précédent
    this.cancelLongClickTimer();

    // Stocker l'état
    this.longClickNode = nodeData;
    this.longClickEvent = event;
    this.longClickInProgress = true;

    // Afficher l'indicateur visuel
    this.showLongClickProgress(nodeData);

    // Démarrer le timer
    this.longClickTimer = setTimeout(() => {
      console.log(`🌳 Clic prolongé déclenché pour: ${nodeData.label}`);
      this.hideLongClickProgress();
      this.longClickInProgress = false;
      this.handleHierarchyRequest(event, nodeData);
      this.longClickTimer = null;
    }, 1200); // ← 1.2 secondes pour être sûr
  }

  cancelLongClickTimer() {
    if (this.longClickTimer) {
      console.log(`🚫 Annulation clic prolongé pour: ${this.longClickNode?.label || 'unknown'}`);
      clearTimeout(this.longClickTimer);
      this.longClickTimer = null;
    }

    // Nettoyer l'état
    this.longClickInProgress = false;
    this.longClickNode = null;
    this.longClickEvent = null;

    // Cacher l'indicateur visuel
    this.hideLongClickProgress();
  }

  showLongClickProgress(nodeData) {
    // Supprimer l'ancien indicateur s'il existe
    this.g.selectAll('.long-click-progress').remove();

    const progressGroup = this.g.append('g')
      .attr('class', 'long-click-progress')
      .attr('transform', `translate(${nodeData.x}, ${nodeData.y})`);

    // Cercle de fond
    progressGroup.append('circle')
      .attr('r', nodeData.size + 8)
      .style('fill', 'none')
      .style('stroke', '#FF9800')
      .style('stroke-width', 3)
      .style('opacity', 0.3);

    // Cercle de progression
    const circumference = 2 * Math.PI * (nodeData.size + 8);
    const progressCircle = progressGroup.append('circle')
      .attr('r', nodeData.size + 8)
      .style('fill', 'none')
      .style('stroke', '#FF9800')
      .style('stroke-width', 4)
      .style('stroke-linecap', 'round')
      .style('opacity', 0.8)
      .style('stroke-dasharray', `0 ${circumference}`)
      .style('transform', 'rotate(-90deg)'); // ← Commencer en haut

    // Animation de progression
    progressCircle
      .transition()
      .duration(1200) // ← Même durée que le timer
      .ease(d3.easeLinear)
      .style('stroke-dasharray', `${circumference} 0`);

    // Texte informatif
    progressGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-35px')
      .style('font-size', '11px')
      .style('fill', '#FF9800')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text('🌳 Hiérarchie');
  }

  hideLongClickProgress() {
    this.g.selectAll('.long-click-progress').remove();
  }

  // ... reste du code inchangé (openAnalysisPanel, handleHierarchyRequest, etc.) ...

  async handleHierarchyRequest(event, nodeData) {
    console.log(`🌳 === DEMANDE HIÉRARCHIE ===`);
    console.log(`📝 Nœud: ${nodeData.label}`);

    try {
      // Cacher la hiérarchie actuelle si visible
      if (this.hierarchyVisible) {
        this.hideHierarchy();
      }

      // Vérifier que le service hiérarchie est disponible
      if (typeof window.hierarchyService === 'undefined') {
        console.error('❌ HierarchyService non disponible !');
        this.showHierarchyError(nodeData, 'Service hiérarchie non disponible');
        return;
      }

      // Afficher un indicateur de chargement
      this.showHierarchyLoading(nodeData);

      // Récupérer la hiérarchie
      console.log(`🔍 Récupération hiérarchie pour: "${nodeData.label}"`);
      const hierarchyData = await window.hierarchyService.getHierarchy(nodeData.label);

      // Cacher l'indicateur de chargement
      this.hideHierarchyLoading();

      if (!hierarchyData.success) {
        console.warn(`⚠️ Pas de hiérarchie trouvée pour: ${nodeData.label}`);
        this.showHierarchyError(nodeData, 'Aucune hiérarchie trouvée');
        return;
      }

      // Vérifier s'il y a des données hiérarchiques
      const stats = window.hierarchyService.getHierarchyStats(hierarchyData);
      if (stats.isEmpty) {
        console.log(`ℹ️ Concept sans hiérarchie: ${nodeData.label}`);
        this.showHierarchyError(nodeData, 'Concept sans hiérarchie parent/enfant');
        return;
      }

      // Afficher la hiérarchie
      console.log(`✅ Affichage hiérarchie: ${stats.parentCount} parents, ${stats.childCount} enfants`);
      this.showHierarchy(nodeData, hierarchyData);

    } catch (error) {
      console.error(`❌ Erreur lors de la récupération hiérarchie:`, error);
      this.hideHierarchyLoading();
      this.showHierarchyError(nodeData, error.message);
    }
  }
  updateDimensions() {
    const containerRect = this.container.getBoundingClientRect();

    // Utiliser la taille du conteneur ou une taille par défaut
    this.width = Math.max(containerRect.width - this.margin.left - this.margin.right, 600);
    this.height = Math.max(containerRect.height - this.margin.top - this.margin.bottom, 400);

    // Si le conteneur n'a pas de taille, utiliser la fenêtre
    if (containerRect.width <= 0) {
      this.width = window.innerWidth - this.margin.left - this.margin.right - 100;
    }
    if (containerRect.height <= 0) {
      this.height = window.innerHeight - this.margin.top - this.margin.bottom - 200;
    }
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

    const processedLinks = this.calculateLinkCurves(links);

    // Créer la simulation de force
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(processedLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 10));

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

    node.on('dblclick', (event, d) => {
      console.log(`📋 Double-clic sur nœud: ${d.label}`);
      console.log(`La la je suis dans le graph rendrererererezrzerzerzerzeze ptn ça ne veut pas marcher  fjjdjdjfj`);

      // Empêcher les autres comportements
      event.stopPropagation();
      event.preventDefault();

      // Ouvrir le panneau avec les données
      this.openAnalysisPanel(d);
    });

    node.on('mousedown', (event, d) => {
      console.log(`⬇ MOUSEDOWN sur: ${d.label} - DÉMARRAGE CLIC PROLONGÉ`);
      event.preventDefault(); // ← Empêcher la sélection de texte
      this.startLongClickTimer(event, d);
    })
    node.on('mouseup', (event, d) => {
      console.log(`⬆ MOUSEUP sur: ${d.label} - ARRÊT CLIC PROLONGÉ`);
      this.cancelLongClickTimer();
    })
    node.on('mouseleave', (event, d) => {
      console.log(` MOUSELEAVE de: ${d.label} - ANNULATION CLIC PROLONGÉ`);
      this.cancelLongClickTimer();
      this.hideTooltip();
    })

    node.on('contextmenu', (event, d) => {
      event.preventDefault();
      console.log(` Menu contextuel désactivé sur: ${d.label}`);
    });

    node.on('click', (event, d) => {
      setTimeout(() => {
        if (event.detail === 1) { 
          d.fx = d.fx ? null : d.x;
          d.fy = d.fy ? null : d.y;
          this.simulation.alpha(0.3).restart();
          console.log(` Nœud ${d.fx ? 'fixé' : 'libéré'}: ${d.label}`);
        }
      }, 200);
    });

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

  openAnalysisPanel(nodeData) {
    console.log(`📋 Ouverture panneau pour nœud: ${nodeData.label}`);
    console.log(`📊 Analyses liées: ${nodeData.analyses ? nodeData.analyses.length : 0}`);

    // Vérifier que le panneau est disponible
    if (typeof window.analysisPanel === 'undefined') {
      console.error('AnalysisPanel non disponible ! Assurez-vous qu\'il est chargé.');
      alert('Erreur: Le panneau d\'analyse n\'est pas disponible.\n\nVérifiez que analysis-panel.js est chargé.');
      return;
    }

    // Vérifier que FusekiAnalysisRetriever est disponible
    if (typeof window.fusekiRetriever === 'undefined') {
      console.error('FusekiAnalysisRetriever non disponible ! Assurez-vous qu\'il est chargé.');
      alert('Erreur: Le système de récupération Fuseki n\'est pas disponible.\n\nVérifiez que fuseki-analysis-retriever.js est chargé.');
      return;
    }

    // Utiliser FusekiAnalysisRetriever au lieu de la logique CSV locale
    window.fusekiRetriever.getAllAnalysesData(nodeData)
      .then(allAnalysesData => {
        console.log(`✅ Analyses récupérées depuis Fuseki pour ${nodeData.label}:`, allAnalysesData);

        // Ouvrir le panneau avec toutes les analyses
        window.analysisPanel.openMultipleAnalyses(nodeData.label, allAnalysesData);
      })
      .catch(error => {
        console.error(`❌ Erreur lors de la récupération des analyses pour ${nodeData.label}:`, error);

        // Afficher un message d'erreur mais ouvrir quand même le panneau avec des données d'erreur
        const errorAnalyses = nodeData.analyses ? nodeData.analyses.map(id => ({
          id: id,
          title: `Analyse ${id}`,
          vi: 'N/A',
          vd: 'N/A',
          relation: 'N/A',
          moderator: 'N/A',
          mediator: 'N/A',
          categoryVI: 'N/A',
          categoryVD: 'N/A',
          source: 'error',
          error: error.message,
          rawData: {
            Analysis_ID: id,
            Title: `Analyse ${id} (erreur Fuseki)`,
            Authors: 'Erreur de récupération',
            'Year ': 'N/A',
            ERROR: error.message
          }
        })) : [];

        // Ouvrir le panneau même en cas d'erreur pour informer l'utilisateur
        window.analysisPanel.openMultipleAnalyses(
          `${nodeData.label} (Erreur Fuseki)`,
          errorAnalyses
        );

        // Optionnel : afficher une notification
        if (confirm(`Erreur lors de la récupération des données depuis Fuseki:\n\n${error.message}\n\nVoulez-vous réessayer ?`)) {
          // Réessayer après un délai
          setTimeout(() => this.openAnalysisPanel(nodeData), 1000);
        }
      });
  }

  // async getAllAnalysesData(nodeData) {
  //   console.log(`🔍 Récupération de toutes les analyses pour: ${nodeData.label}`);

  //   const allAnalyses = [];

  //   if (nodeData.analyses && nodeData.analyses.length > 0) {
  //     for (const analysisId of nodeData.analyses) {
  //       const analysisData = await this.getAnalysisData(analysisId);
  //       allAnalyses.push(analysisData);
  //     }
  //   }

  //   console.log(`✅ ${allAnalyses.length} analyses récupérées pour ${nodeData.label}`);
  //   return allAnalyses;
  // }

  // async getAnalysisData(analysisId) {
  //   console.log(`🔍 Récupération données pour analyse: ${analysisId}`);

  //   if (!window.csvLoader?.isCSVLoaded()) {
  //     console.log("🔄 Forçage du chargement Excel...");
  //     return await this.loadExcelAndGetAnalysis(analysisId);
  //   }

  //   // Chercher dans le CSV
  //   const csvRow = window.csvLoader.findAnalysisById(analysisId);

  //   if (csvRow) {
  //     console.log(`✅ Données trouvées pour analyse ${analysisId}:`, csvRow);

  //     return {
  //       id: analysisId,
  //       title: csvRow['Title'] || `Analyse ${analysisId}`,
  //       vi: csvRow['VI'] || 'N/A',
  //       vd: csvRow['VD'] || csvRow['ACADS'] || 'N/A',
  //       relation: csvRow['Resultat_de_relation'] || csvRow['Degre_de_relation'] || 'N/A',
  //       moderator: csvRow['Moderator'] || 'N/A',
  //       mediator: csvRow['Mediator'] || 'N/A',
  //       categoryVI: csvRow['sub-class_Final_VI'] || 'N/A',
  //       categoryVD: csvRow['sub-class_Final_VD'] || 'N/A',
  //       rawData: csvRow 
  //     };
  //   } else {
  //     console.log(`⚠️ Données non trouvées pour analyse ${analysisId}`);
  //     return this.createErrorAnalysis(analysisId, 'Données non trouvées');
  //   }
  // }

  // async loadExcelAndGetAnalysis(analysisId) {
  //   try {
  //     console.log("⏳ Chargement Excel en cours...");

  //     // Tester différents chemins
  //     const paths = [
  //       './data/IA-DAS-Data1.xlsx',
  //       'data/IA-DAS-Data1.xlsx',
  //       '../data/IA-DAS-Data1.xlsx'
  //     ];

  //     let data = null;
  //     for (const path of paths) {
  //       try {
  //         console.log(`🔍 Test chemin Excel: ${path}`);
  //         data = await window.excelLoader.loadExcelData(path);
  //         if (data && data.length > 0) {
  //           console.log(`✅ Excel chargé avec succès: ${data.length} analyses depuis ${path}`);
  //           break;
  //         }
  //       } catch (pathError) {
  //         console.log(`❌ Échec ${path}:`, pathError.message);
  //       }
  //     }

  //     if (data && data.length > 0) {
  //       // Maintenant chercher l'analyse
  //       const csvRow = window.csvLoader.findAnalysisById(analysisId);

  //       if (csvRow) {
  //         console.log(`✅ Analyse ${analysisId} trouvée après chargement Excel:`, csvRow);
  //         return {
  //           id: analysisId,
  //           title: csvRow['Title'] || `Analyse ${analysisId}`,
  //           vi: csvRow['VI'] || 'N/A',
  //           vd: csvRow['VD'] || csvRow['ACADS'] || 'N/A',
  //           relation: csvRow['Resultat_de_relation'] || 'N/A',
  //           moderator: csvRow['Moderator'] || 'N/A',
  //           mediator: csvRow['Mediator'] || 'N/A',
  //           rawData: csvRow
  //         };
  //       }
  //     }
  //   } catch (error) {
  //     console.error("❌ Erreur chargement Excel:", error);
  //   }

  //   return this.createErrorAnalysis(analysisId, 'Chargement Excel échoué');
  // }

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

  // addControls() {
  //   const controls = d3.select(this.container)
  //     .insert('div', ':first-child')
  //     .attr('class', 'graph-controls')
  //     .style('margin-bottom', '10px');

  //   // Légende des couleurs
  //   this.addColorLegend(controls);

  //   // Instructions d'interaction
  //   this.addInteractionInstructions(controls);

  //   // Informations
  //   controls.append('span')
  //     .style('margin-left', '20px')
  //     .text(`${this.parsedData.networkData.nodes.length} nœuds, ${this.parsedData.networkData.links.length} liens`);
  // }

  addColorLegend(controls) {
    const legend = controls.append('div')
      .style('margin-bottom', '10px')
      .style('font-size', '12px');


  }

  addInteractionInstructions(controls) {

  }

  startLongClickTimer(event, nodeData) {
    console.log(`⏳ Début clic prolongé sur: ${nodeData.label}`);

    this.cancelLongClickTimer();
    this.longClickNode = nodeData;
    this.longClickEvent = event;
    this.showLongClickProgress(nodeData);

    this.longClickTimer = setTimeout(() => {
      console.log(`🌳 Clic prolongé déclenché pour: ${nodeData.label}`);
      this.hideLongClickProgress();
      this.handleHierarchyRequest(event, nodeData);
      this.longClickTimer = null;
    }, 800);
  }

  cancelLongClickTimer() {
    if (this.longClickTimer) {
      console.log(`🚫 Annulation clic prolongé`);
      clearTimeout(this.longClickTimer);
      this.longClickTimer = null;
      this.hideLongClickProgress();
    }
  }

  showLongClickProgress(nodeData) {
    this.g.selectAll('.long-click-progress').remove();

    const progressGroup = this.g.append('g')
      .attr('class', 'long-click-progress')
      .attr('transform', `translate(${nodeData.x}, ${nodeData.y})`);

    progressGroup.append('circle')
      .attr('r', nodeData.size + 8)
      .style('fill', 'none')
      .style('stroke', '#FF9800')
      .style('stroke-width', 3)
      .style('opacity', 0.3);

    const progressCircle = progressGroup.append('circle')
      .attr('r', nodeData.size + 8)
      .style('fill', 'none')
      .style('stroke', '#FF9800')
      .style('stroke-width', 4)
      .style('stroke-linecap', 'round')
      .style('opacity', 0.8)
      .style('stroke-dasharray', `0 ${2 * Math.PI * (nodeData.size + 8)}`);

    progressCircle
      .transition()
      .duration(800)
      .ease(d3.easeLinear)
      .style('stroke-dasharray', `${2 * Math.PI * (nodeData.size + 8)} 0`);
  }

  hideLongClickProgress() {
    this.g.selectAll('.long-click-progress').remove();
  }

  async handleHierarchyRequest(event, nodeData) {
    console.log(`🌳 === DEMANDE HIÉRARCHIE ===`);
    console.log(`📝 Nœud: ${nodeData.label}`);
    console.log(`🏷️ Type: ${nodeData.type}`);
    console.log(`📂 Catégorie: ${nodeData.category}`);

    try {
      // Cacher la hiérarchie actuelle si visible
      if (this.hierarchyVisible) {
        this.hideHierarchy();
      }

      // Vérifier que le service hiérarchie est disponible
      if (typeof window.hierarchyService === 'undefined') {
        console.error('❌ HierarchyService non disponible !');
        this.showHierarchyError(nodeData, 'Service hiérarchie non disponible');
        return;
      }

      // Afficher un indicateur de chargement
      this.showHierarchyLoading(nodeData);

      // Récupérer la hiérarchie
      console.log(`🔍 Récupération hiérarchie pour: "${nodeData.label}"`);
      const hierarchyData = await window.hierarchyService.getHierarchy(nodeData.label);

      // Cacher l'indicateur de chargement
      this.hideHierarchyLoading();

      if (!hierarchyData.success) {
        console.warn(`⚠️ Pas de hiérarchie trouvée pour: ${nodeData.label}`);
        this.showHierarchyError(nodeData, 'Aucune hiérarchie trouvée');
        return;
      }

      // Vérifier s'il y a des données hiérarchiques
      const stats = window.hierarchyService.getHierarchyStats(hierarchyData);
      if (stats.isEmpty) {
        console.log(`ℹ️ Concept sans hiérarchie: ${nodeData.label}`);
        this.showHierarchyError(nodeData, 'Concept sans hiérarchie parent/enfant');
        return;
      }

      // Afficher la hiérarchie
      console.log(`✅ Affichage hiérarchie: ${stats.parentCount} parents, ${stats.childCount} enfants`);
      this.showHierarchy(nodeData, hierarchyData);

    } catch (error) {
      console.error(`❌ Erreur lors de la récupération hiérarchie:`, error);
      this.hideHierarchyLoading();
      this.showHierarchyError(nodeData, error.message);
    }
  }

  // ========================================
  // 4. FONCTION: Afficher indicateur de chargement
  // ========================================
  showHierarchyLoading(centerNode) {
    console.log(`⏳ Affichage indicateur chargement pour: ${centerNode.label}`);

    // Créer un nœud de chargement temporaire
    const loadingNode = {
      id: 'hierarchy_loading',
      x: centerNode.x + 60,
      y: centerNode.y,
      fx: centerNode.x + 60,
      fy: centerNode.y
    };

    // Ajouter le nœud de chargement visuellement
    const loadingGroup = this.g.append('g')
      .attr('class', 'hierarchy-loading')
      .attr('transform', `translate(${loadingNode.x}, ${loadingNode.y})`);

    // Cercle de chargement animé
    loadingGroup.append('circle')
      .attr('r', 15)
      .style('fill', '#FFA500')
      .style('stroke', '#FF8C00')
      .style('stroke-width', 2)
      .style('opacity', 0.8);

    // Texte "..."
    loadingGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text('...');

    // Animation de rotation
    loadingGroup
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attrTween('transform', () => {
        return (t) => {
          const angle = t * 360;
          return `translate(${loadingNode.x}, ${loadingNode.y}) rotate(${angle})`;
        };
      })
      .on('end', function () {
        // Répéter l'animation si le nœud existe encore
        if (d3.select(this).node()) {
          d3.select(this).transition().duration(1000).ease(d3.easeLinear)
            .attrTween('transform', () => (t) => {
              const angle = t * 360;
              return `translate(${loadingNode.x}, ${loadingNode.y}) rotate(${angle})`;
            })
            .on('end', arguments.callee);
        }
      });
  }

  // ========================================
  // 5. FONCTION: Cacher indicateur de chargement
  // ========================================
  hideHierarchyLoading() {
    console.log(`🚫 Suppression indicateur chargement`);
    this.g.selectAll('.hierarchy-loading').remove();
  }

  // ========================================
  // 6. FONCTION: Afficher la hiérarchie
  // ========================================
  showHierarchy(centerNode, hierarchyData) {
    console.log(`🌳 === AFFICHAGE HIÉRARCHIE ===`);
    console.log(`🎯 Nœud central: ${centerNode.label}`);
    console.log(`👨‍👩‍👧‍👦 Parents: ${hierarchyData.parents.length}`);
    console.log(`👶 Enfants: ${hierarchyData.children.length}`);

    this.hierarchyVisible = true;
    this.currentHierarchyConcept = centerNode.label;

    // Nettoyer les éléments hiérarchiques précédents
    this.cleanupHierarchy();

    const hierarchyRadius = 80; // Rayon du cercle autour du nœud central
    const allHierarchyNodes = [];
    const allHierarchyLinks = [];

    // === CRÉER LES NŒUDS PARENTS ===
    hierarchyData.parents.forEach((parent, index) => {
      const angle = (index / hierarchyData.parents.length) * Math.PI * 2 - Math.PI / 2; // Commencer en haut
      const x = centerNode.x + Math.cos(angle) * hierarchyRadius;
      const y = centerNode.y + Math.sin(angle) * hierarchyRadius;

      const parentNode = {
        id: `hierarchy_parent_${index}`,
        label: parent.label,
        uri: parent.uri,
        type: 'hierarchy_parent',
        x: x,
        y: y,
        fx: x, // Fixer la position
        fy: y,
        originalData: parent
      };

      allHierarchyNodes.push(parentNode);

      // Lien vers le parent
      allHierarchyLinks.push({
        source: centerNode,
        target: parentNode,
        type: 'hierarchy_parent_link',
        id: `hierarchy_parent_link_${index}`
      });

      console.log(`↗️ Parent ${index + 1}: ${parent.label} à (${x.toFixed(1)}, ${y.toFixed(1)})`);
    });

    // === CRÉER LES NŒUDS ENFANTS ===
    const childStartAngle = hierarchyData.parents.length > 0 ? Math.PI : 0; // Éviter superposition avec parents
    hierarchyData.children.forEach((child, index) => {
      const totalChildren = hierarchyData.children.length;
      const angle = childStartAngle + (index / totalChildren) * Math.PI * 2;
      const x = centerNode.x + Math.cos(angle) * hierarchyRadius;
      const y = centerNode.y + Math.sin(angle) * hierarchyRadius;

      const childNode = {
        id: `hierarchy_child_${index}`,
        label: child.label,
        uri: child.uri,
        type: 'hierarchy_child',
        x: x,
        y: y,
        fx: x, // Fixer la position
        fy: y,
        originalData: child
      };

      allHierarchyNodes.push(childNode);

      // Lien vers l'enfant
      allHierarchyLinks.push({
        source: centerNode,
        target: childNode,
        type: 'hierarchy_child_link',
        id: `hierarchy_child_link_${index}`
      });

      console.log(`↘️ Enfant ${index + 1}: ${child.label} à (${x.toFixed(1)}, ${y.toFixed(1)})`);
    });

    // Stocker pour nettoyage ultérieur
    this.hierarchyNodes = allHierarchyNodes;
    this.hierarchyLinks = allHierarchyLinks;

    // === AFFICHAGE VISUEL ===
    this.renderHierarchyNodes(allHierarchyNodes);
    this.renderHierarchyLinks(allHierarchyLinks);

    // === GESTIONNAIRE DE FERMETURE ===
    this.setupHierarchyCloseHandlers();

    console.log(`✅ Hiérarchie affichée: ${allHierarchyNodes.length} nœuds, ${allHierarchyLinks.length} liens`);
  }

  // ========================================
  // 7. FONCTION: Rendu visuel des nœuds hiérarchiques
  // ========================================
  renderHierarchyNodes(hierarchyNodes) {
    console.log(`🎨 Rendu de ${hierarchyNodes.length} nœuds hiérarchiques`);

    const hierarchyGroup = this.g.append('g').attr('class', 'hierarchy-nodes');

    const nodeGroups = hierarchyGroup.selectAll('.hierarchy-node')
      .data(hierarchyNodes)
      .enter().append('g')
      .attr('class', 'hierarchy-node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Cercles des nœuds hiérarchiques
    nodeGroups.append('circle')
      .attr('r', 18)
      .style('fill', d => d.type === 'hierarchy_parent' ? '#4CAF50' : '#8BC34A') // Vert foncé pour parents, vert clair pour enfants
      .style('stroke', '#2E7D32')
      .style('stroke-width', 2)
      .style('opacity', 0.9)
      .style('cursor', 'pointer');

    // Labels des nœuds hiérarchiques
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => this.truncateLabel(d.label, 8)); // Texte court

    // Labels complets en dessous
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '32px')
      .style('font-size', '11px')
      .style('fill', '#2E7D32')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => this.truncateLabel(d.label, 15));

    // Icônes pour distinguer parents/enfants
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-25px')
      .style('font-size', '14px')
      .style('fill', '#2E7D32')
      .style('pointer-events', 'none')

    // Animation d'apparition
    nodeGroups.style('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 100)
      .style('opacity', 1);

    // Tooltip au survol
    nodeGroups.on('mouseover', (event, d) => {
      this.showHierarchyTooltip(event, d);
    }).on('mouseout', () => {
      this.hideTooltip();
    });
  }

  // ========================================
  // 8. FONCTION: Rendu des liens hiérarchiques
  // ========================================
  renderHierarchyLinks(hierarchyLinks) {
    console.log(` Rendu de ${hierarchyLinks.length} liens hiérarchiques`);

    const linksGroup = this.g.append('g').attr('class', 'hierarchy-links');

    const links = linksGroup.selectAll('.hierarchy-link')
      .data(hierarchyLinks)
      .enter().append('line')
      .attr('class', 'hierarchy-link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .style('stroke', d => d.type === 'hierarchy_parent_link' ? '#4CAF50' : '#8BC34A')
      .style('stroke-width', 3)
      .style('opacity', 0.7)
      .style('stroke-dasharray', '5,5'); // Lignes pointillées

    // Animation d'apparition
    links.style('opacity', 0)
      .transition()
      .duration(300)
      .style('opacity', 0.7);
  }

  // ========================================
  // 9. FONCTIONS: Gestion des erreurs et nettoyage
  // ========================================
  showHierarchyError(nodeData, errorMessage) {
    console.log(`⚠️ Affichage erreur hiérarchie: ${errorMessage}`);

    // Afficher temporairement un message d'erreur
    const errorGroup = this.g.append('g')
      .attr('class', 'hierarchy-error')
      .attr('transform', `translate(${nodeData.x + 60}, ${nodeData.y})`);

    errorGroup.append('circle')
      .attr('r', 20)
      .style('fill', '#F44336')
      .style('stroke', '#D32F2F')
      .style('stroke-width', 2)
      .style('opacity', 0.9);

    errorGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '16px')
      .style('fill', 'white')
      .text('❌');

    errorGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '35px')
      .style('font-size', '10px')
      .style('fill', '#F44336')
      .style('font-weight', 'bold')
      .text('Pas de hiérarchie');

    // Supprimer automatiquement après 3 secondes
    setTimeout(() => {
      errorGroup.transition().duration(500).style('opacity', 0).remove();
    }, 3000);
  }

  hideHierarchy() {
    console.log(`🚫 Masquage hiérarchie pour: ${this.currentHierarchyConcept}`);
    this.cleanupHierarchy();
    this.hierarchyVisible = false;
    this.currentHierarchyConcept = null;
  }

  cleanupHierarchy() {
    this.g.selectAll('.hierarchy-nodes').remove();
    this.g.selectAll('.hierarchy-links').remove();
    this.g.selectAll('.hierarchy-loading').remove();
    this.g.selectAll('.hierarchy-error').remove();
    this.hierarchyNodes = [];
    this.hierarchyLinks = [];
  }

  setupHierarchyCloseHandlers() {
    // Fermer en cliquant ailleurs
    d3.select('body').on('click.hierarchy', (event) => {
      if (!event.target.closest('.hierarchy-node') && !event.target.closest('.node-group')) {
        this.hideHierarchy();
      }
    });

    // Fermer avec Échap
    d3.select('body').on('keydown.hierarchy', (event) => {
      if (event.key === 'Escape' && this.hierarchyVisible) {
        this.hideHierarchy();
      }
    });
  }

  showHierarchyTooltip(event, d) {
    d3.selectAll('.tooltip').remove();

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(46, 125, 50, 0.95)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('opacity', 0);

    const relationText = d.type === 'hierarchy_parent' ? 'Parent de' : 'Enfant de';
    const tooltipText = `<strong>${d.label}</strong><br/>${relationText} "${this.currentHierarchyConcept}"<br/><em>Concept ontologique</em>`;

    tooltip.html(tooltipText)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

}
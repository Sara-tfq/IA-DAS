// Moteur de rendu D3.js pour graphe réseau ontologique
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
    
    console.log('Rendu du graphe réseau:', { nodes: nodes.length, links: links.length });
    
    // Créer la simulation de force
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 5));
    
    // Dessiner les liens
    const link = this.g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .style('stroke', '#aaa')
      .style('stroke-width', 2)
      .style('opacity', 0.7);
    
    // Labels des liens
    const linkLabels = this.g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
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
    
    // Formes des nœuds selon le type
    node.each(function(d) {
      const nodeGroup = d3.select(this);
      
      if (d.type === 'entity') {
        // Nœuds entités : cercles bleus
        nodeGroup.append('circle')
          .attr('r', d.size)
          .style('fill', d.color)
          .style('stroke', '#fff')
          .style('stroke-width', 3);
      } else {
        // Nœuds valeurs : rectangles colorés selon la propriété
        nodeGroup.append('rect')
          .attr('width', d.size * 2)
          .attr('height', d.size * 1.5)
          .attr('x', -d.size)
          .attr('y', -d.size * 0.75)
          .style('fill', d.color)
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .style('rx', 3);
      }
    });
    
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
      .text(d => this.truncateLabel(d.label, 15));
    
    // Tooltip
    node.on('mouseover', (event, d) => this.showTooltip(event, d))
        .on('mouseout', () => this.hideTooltip());
    
    // Double-clic pour fixer/libérer un nœud
    node.on('dblclick', (event, d) => {
      d.fx = d.fx ? null : d.x;
      d.fy = d.fy ? null : d.y;
      this.simulation.alpha(0.3).restart();
    });
    
    // Mise à jour des positions à chaque tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
      nodeLabels.attr('transform', d => `translate(${d.x},${d.y + d.size + 15})`);
    });
  }
  
  // Fonctions de drag
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
    // Ne pas libérer automatiquement - laisser l'utilisateur double-cliquer
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
    if (d.property) tooltipText += `Propriété: ${d.property}<br/>`;
    tooltipText += `ID: ${d.id}`;
    
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
    
    // Bouton pour redémarrer la simulation
    controls.append('button')
      .text('Réorganiser')
      .on('click', () => {
        this.simulation.alpha(0.3).restart();
      });
    
    // Bouton pour centrer le graphe
    controls.append('button')
      .text('Centrer')
      .style('margin-left', '10px')
      .on('click', () => {
        const transform = d3.zoomIdentity.translate(this.margin.left, this.margin.top);
        this.svg.transition().duration(750).call(
          d3.zoom().transform, transform
        );
      });
    
    // Informations
    controls.append('span')
      .style('margin-left', '20px')
      .text(`${this.parsedData.networkData.nodes.length} nœuds, ${this.parsedData.networkData.links.length} liens`);
    
    // Instructions
    controls.append('div')
      .style('font-size', '11px')
      .style('color', '#666')
      .style('margin-top', '5px')
      .text('Glissez pour déplacer • Double-clic pour fixer • Molette pour zoomer');
  }
}
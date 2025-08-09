class AnalysisPanel {
  
  constructor() {
    this.isOpen = false;
    this.currentAnalysisId = null;
    this.currentNodeName = null;
    this.currentAnalysesData = null;
    this.panelElement = null;
    this.overlayElement = null;
    this.templateCache = new Map();
    
    this.init();
  }

  async init() {
    try {
      await this.loadTemplate();
      this.createPanelElements();
      this.attachEventListeners();
      console.log("📋 AnalysisPanel initialisé avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation d'AnalysisPanel:", error);
    }
  }

  async loadTemplate() {
    try {
      const response = await fetch('./analysis-panel.html');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const templateHTML = await response.text();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = templateHTML;
      
      this.templateCache.set('main', tempDiv.querySelector('.analysis-panel-content').outerHTML);
      this.templateCache.set('content', tempDiv.querySelector('#analysis-content-template').innerHTML);
      this.templateCache.set('loading', tempDiv.querySelector('#analysis-loading-template').innerHTML);
      
      console.log("✅ Templates HTML chargés");
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement du template:", error);
      this.createFallbackTemplate();
    }
  }

  createFallbackTemplate() {
    console.log("⚠️ Utilisation du template de secours");
    
    this.templateCache.set('main', `
      <div class="analysis-panel-content">
        <div class="analysis-panel-header">
          <h2 class="analysis-panel-title">📊 Détails de l'Analyse</h2>
          <button id="close-analysis-panel" class="analysis-panel-close">×</button>
        </div>
        <div id="analysis-content">
          <div class="analysis-empty">
            <div class="analysis-empty-icon">📋</div>
            <p>Double-cliquez sur un nœud du graphique pour voir les détails</p>
          </div>
        </div>
      </div>
    `);
  }

  createPanelElements() {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'analysis-overlay';

    this.panelElement = document.createElement('div');
    this.panelElement.id = 'analysis-panel';
    
    this.panelElement.innerHTML = this.templateCache.get('main');

    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.panelElement);
  }

  attachEventListeners() {
    const closeButton = this.panelElement.querySelector('#close-analysis-panel');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    this.panelElement.addEventListener('click', (e) => e.stopPropagation());
  }

  openMultipleAnalyses(nodeName, analysesData) {
    console.log(`📋 Ouverture panneau multi-analyses pour: ${nodeName}`);
    console.log(`📊 Nombre d'analyses: ${analysesData.length}`);
    
    this.currentNodeName = nodeName;
    this.currentAnalysesData = analysesData;
    this.isOpen = true;

    this.overlayElement.classList.add('show');
    this.panelElement.classList.add('open');

    this.renderAnalysesList(nodeName, analysesData);
  }

  open(analysisId, analysisData = null) {
    console.log(`📋 Ouverture panneau pour analyse: ${analysisId}`);
    
    this.currentAnalysisId = analysisId;
    this.isOpen = true;

    this.overlayElement.classList.add('show');
    this.panelElement.classList.add('open');

    if (analysisData) {
      this.renderContent(analysisData);
    } else {
      this.showLoadingState(analysisId);
      setTimeout(() => this.loadContentFromId(analysisId), 500);
    }
  }

  close() {
    console.log("📋 Fermeture panneau analyse");
    
    this.isOpen = false;
    this.currentAnalysisId = null;

    this.overlayElement.classList.remove('show');
    this.panelElement.classList.remove('open');
  }

  showLoadingState(analysisId) {
    const contentDiv = this.panelElement.querySelector('#analysis-content');
    const loadingTemplate = this.templateCache.get('loading');
    
    if (loadingTemplate) {
      contentDiv.innerHTML = loadingTemplate;
      
      const loadingIdSpan = contentDiv.querySelector('.loading-analysis-id');
      if (loadingIdSpan) {
        loadingIdSpan.textContent = analysisId;
      }
    } else {
      contentDiv.innerHTML = `
        <div class="analysis-loading">
          <div class="analysis-loading-icon">⏳</div>
          <p>Chargement de l'analyse ${analysisId}...</p>
        </div>
      `;
    }
  }

  renderAnalysesList(nodeName, analysesData) {
    console.log("📋 Rendu liste des analyses:", analysesData);

    const contentDiv = this.panelElement.querySelector('#analysis-content');
    
    let listHTML = `
      <div style="padding: 10px;">
        <h3 style="color: #2980b9; margin: 0 0 15px 0;">
          📊 Analyses liées à "${nodeName}" (${analysesData.length})
        </h3>
        
        <div style="max-height: 500px; overflow-y: auto;">
    `;
    
    analysesData.forEach((analysis, index) => {
      const apaTitle = this.formatAPATitle(analysis);
      
      listHTML += `
        <div class="analysis-item" 
             style="
               border: 1px solid #ddd; 
               border-radius: 8px; 
               padding: 15px; 
               margin-bottom: 10px; 
               background: #fafafa;
               cursor: pointer;
               transition: all 0.2s ease;
             "
             onmouseover="this.style.background='#f0f0f0'; this.style.borderColor='#007bff';"
             onmouseout="this.style.background='#fafafa'; this.style.borderColor='#ddd';"
             onclick="window.analysisPanel.showAnalysisDetail('${analysis.id}')">
          
          <div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px;">
            ${apaTitle}
          </div>
          
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            ID: ${analysis.id} • Relation: 
            <span style="color: ${this.getRelationColor(analysis.relation)}; font-weight: bold;">
              ${this.getRelationText(analysis.relation)}
            </span>
          </div>
          
          <div style="font-size: 11px; color: #888;">
            VI: ${analysis.vi} → VD: ${analysis.vd}
            ${analysis.moderator !== 'N/A' ? ` • Modérateur: ${analysis.moderator}` : ''}
            ${analysis.mediator !== 'N/A' ? ` • Médiateur: ${analysis.mediator}` : ''}
          </div>
        </div>
      `;
    });
    
    listHTML += `
        </div>
        
        <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <button onclick="window.analysisPanel.close()" style="
            background: #95a5a6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          ">
            Fermer
          </button>
        </div>
      </div>
    `;
    
    contentDiv.innerHTML = listHTML;
  }

  formatAPATitle(analysis) {
    const authors = analysis.rawData?.Authors || 'Auteur inconnu';
    const year = analysis.rawData?.Year || 'Année inconnue';
    const title = analysis.rawData?.Title || analysis.title || `Analyse ${analysis.id}`;
    
    const shortAuthors = authors.length > 50 ? authors.substring(0, 47) + '...' : authors;
    
    return `${shortAuthors} (${year}). ${title}`;
  }

  getRelationColor(relation) {
    switch(relation) {
      case '+': return '#E53E3E';
      case '-': return '#38A169';
      case 'NS': return '#718096';
      default: return '#A0AEC0';
    }
  }

 async showAnalysisDetail(analysisId) {
  console.log(`📊 Affichage détail analyse: ${analysisId}`);
  
  let analysis = this.currentAnalysesData.find(a => a.id === analysisId);
  
  // ✅ Si pas trouvé, forcer le chargement Excel
  if (!analysis || !analysis.rawData) {
    console.log("🔄 Rechargement des données depuis Excel...");
    
    try {
      await window.excelLoader.loadExcelData('./data/IA-DAS-Data1.xlsx');
      const csvRow = window.csvLoader.findAnalysisById(analysisId);
      
      if (csvRow) {
        analysis = {
          id: analysisId,
          title: csvRow['Title'] || `Analyse ${analysisId}`,
          rawData: csvRow
        };
      }
    } catch (error) {
      console.error("❌ Erreur rechargement:", error);
    }
  }
  
  if (!analysis) {
    console.error(`❌ Analyse ${analysisId} non trouvée`);
    return;
  }

  this.renderDetailedAnalysis(analysis);
}

  renderDetailedAnalysis(analysis) {
    console.log("📊 Rendu analyse détaillée:", analysis);

    const contentDiv = this.panelElement.querySelector('#analysis-content');
    const data = analysis.rawData || {};
    
    let detailHTML = `
      <div style="padding: 15px;">
        <div style="border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="color: #2980b9; margin: 0; font-size: 18px;">
            📊 ${analysis.id} - Analyse Détaillée
          </h2>
          <button onclick="window.analysisPanel.renderAnalysesList('${this.currentNodeName}', window.analysisPanel.currentAnalysesData)" 
                  style="float: right; background: #95a5a6; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: -25px;">
            ← Retour à la liste
          </button>
        </div>

        <div style="max-height: 600px; overflow-y: auto;">
    `;

    detailHTML += this.createDetailSection("🆔 Identification", [
      ['DOI', data.DOI],
      ['Code', data.Code],
      ['Analysis ID', data.Analysis_ID],
      ['Titre', data.Title],
      ['Auteurs', data.Authors],
      ['Année', data.Year],
      ['Journal', data.Journal],
      ['Pays', data.Country]
    ]);

    detailHTML += this.createDetailSection("🔬 Méthodologie", [
      ['Type d\'étude', data['Types of study']],
      ['N (échantillon)', data.N],
      ['Population', data.Population],
      ['Sexe', data.Sexe],
      ['Sous-groupe population', data['Population subgroup']],
      ['Critères inclusion', data['Inclusion criteria']],
      ['Type d\'analyse', data.Type_of_analysis],
      ['N mobilisé analyses', data['N_mobilise_dans_les analyse']]
    ]);

    detailHTML += this.createDetailSection("👥 Caractéristiques Population", [
      ['Âge', data.Age],
      ['Âge moyen analyse', data.AgeForAnalysis_Mean],
      ['SD âge', data.SDAnalysis],
      ['Âge min', data.MinAge],
      ['Âge max', data.MaxAge],
      ['IMC', data.BMI],
      ['IMC moyen', data.BMI_Mean],
      ['SD IMC', data.BMI_SD]
    ]);

    detailHTML += this.createDetailSection("🏃 Pratique Sportive", [
      ['Type pratique sport', data['Type_of _sport_practice']],
      ['Sous-catégorie sport', data.Subcategory_of_sport],
      ['Nom du sport', data.Sport_name],
      ['Niveau sportif', data.Sport_level],
      ['Population sportive', data.Sporting_population],
      ['Fréquence exercice', data.Exercise_frequency],
      ['Fréquence moyenne', data.Freq_Mean],
      ['Années d\'expérience', data.Years_of_experience],
      ['Expérience moyenne', data.Exp_Mean]
    ]);

    detailHTML += this.createDetailSection("🔗 Variables et Relations", [
      ['ACADS (VD)', data.ACADS],
      ['VD', data.VD],
      ['Mesure VD', data.Measure_VD],
      ['VI', data.VI],
      ['Mesure VI', data.Measure_VI],
      ['Médiateur', data.Mediator],
      ['Mesure Médiateur', data.Measure_Mediator],
      ['Modérateur', data.Moderator],
      ['Mesure Modérateur', data.Measure_Moderator]
    ]);

    detailHTML += this.createDetailSection("📊 Résultats Statistiques", [
      ['Degré relation', data.Degre_de_relation],
      ['Résultat relation', data.Resultat_de_relation],
      ['Degré r', data.Degre_r],
      ['Signe p', data.Signe_p],
      ['Degré p', data['Degre_p ']],
      ['Degré beta', data.Degre_beta],
      ['Degré RS', data.Degre_RS],
      ['Index', data.Index],
      ['Multiplicité analyse', data.Multiplicity_analyse]
    ]);

    detailHTML += this.createDetailSection("📝 Conclusions et Limites", [
      ['Conclusions auteurs', data.Authors_conclusions],
      ['Limites', data.Limites],
      ['Perspectives', data.Perspectives],
      ['Notes', data['Notes on jn']]
    ]);

    detailHTML += `
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <button onclick="window.analysisPanel.renderAnalysesList('${this.currentNodeName}', window.analysisPanel.currentAnalysesData)" 
                  style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
            ← Retour à la liste
          </button>
          <button onclick="window.analysisPanel.close()" 
                  style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
            Fermer
          </button>
        </div>
      </div>
    `;

    contentDiv.innerHTML = detailHTML;
  }

  createDetailSection(title, fields) {
    let sectionHTML = `
      <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f9f9f9;">
        <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;">
          ${title}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; font-size: 13px;">
    `;

    fields.forEach(([label, value]) => {
      if (value && value.toString().trim() !== '' && value !== 'N/A') {
        sectionHTML += `
          <div style="font-weight: bold; color: #555;">${label}:</div>
          <div style="color: #333; word-wrap: break-word;">${value}</div>
        `;
      }
    });

    sectionHTML += `
        </div>
      </div>
    `;

    return sectionHTML;
  }

  renderContent(analysisData) {
    console.log("📋 Rendu contenu panneau:", analysisData);

    const contentDiv = this.panelElement.querySelector('#analysis-content');
    const contentTemplate = this.templateCache.get('content');
    
    if (contentTemplate) {
      contentDiv.innerHTML = contentTemplate;
      this.populateTemplate(contentDiv, analysisData);
    } else {
      this.renderFallbackContent(contentDiv, analysisData);
    }
  }

  populateTemplate(container, data) {
    this.setTextContent(container, '.analysis-id', data.id);
    this.setTextContent(container, '.analysis-title', data.title);

    this.setTextContent(container, '.vi-name', data.vi, '#1565C0');
    this.setTextContent(container, '.vi-category', 
      data.categoryVI !== 'N/A' ? `Catégorie: ${data.categoryVI}` : '');

    this.setTextContent(container, '.vd-name', data.vd, '#C62828');
    this.setTextContent(container, '.vd-category', 
      data.categoryVD !== 'N/A' ? `Catégorie: ${data.categoryVD}` : '');

    const relationBadge = container.querySelector('.relation-type');
    if (relationBadge) {
      relationBadge.textContent = this.getRelationText(data.relation);
      relationBadge.className = `relation-badge ${this.getRelationClass(data.relation)}`;
    }

    this.setTextContent(container, '.moderator-name', data.moderator);
    this.setTextContent(container, '.mediator-name', data.mediator);
  }

  setTextContent(container, selector, text, color = null) {
    const element = container.querySelector(selector);
    if (element) {
      element.textContent = text || 'N/A';
      if (color) {
        element.style.color = color;
      }
    }
  }

  renderFallbackContent(container, data) {
    container.innerHTML = `
      <div style="padding: 20px;">
        <h3>📊 Analyse ${data.id}</h3>
        <p><strong>VI:</strong> ${data.vi}</p>
        <p><strong>VD:</strong> ${data.vd}</p>
        <p><strong>Relation:</strong> ${data.relation}</p>
        <p><strong>Modérateur:</strong> ${data.moderator}</p>
        <p><strong>Médiateur:</strong> ${data.mediator}</p>
        <button onclick="window.analysisPanel.close()">Fermer</button>
      </div>
    `;
  }

  loadContentFromId(analysisId) {
    console.log(`📋 Simulation chargement pour: ${analysisId}`);
    
    const mockData = {
      id: analysisId,
      title: `Analyse ${analysisId} - Titre APA à récupérer`,
      vi: 'Variable à récupérer',
      vd: 'Variable à récupérer',
      relation: '+',
      moderator: 'À déterminer',
      mediator: 'À déterminer',
      categoryVI: 'N/A',
      categoryVD: 'N/A'
    };
    
    setTimeout(() => {
      this.renderContent(mockData);
    }, 1000);
  }

  getRelationClass(relation) {
    switch(relation) {
      case '+': return 'risk';
      case '-': return 'protective';
      case 'NS': return 'non-significant';
      default: return 'default';
    }
  }

  getRelationText(relation) {
    switch(relation) {
      case '+': return '+ Facteur de risque';
      case '-': return '- Facteur protecteur';
      case 'NS': return 'NS Non significatif';
      default: return relation || 'Non défini';
    }
  }

  isOpened() {
    return this.isOpen;
  }

  getCurrentAnalysisId() {
    return this.currentAnalysisId;
  }

  exportAnalysis() {
    console.log(`📤 Export analyse: ${this.currentAnalysisId}`);
    alert(`Fonctionnalité d'export à implémenter pour l'analyse ${this.currentAnalysisId}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.analysisPanel = new AnalysisPanel();
  console.log("✅ AnalysisPanel disponible globalement");
});
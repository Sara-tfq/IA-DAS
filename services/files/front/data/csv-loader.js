// CSV Loader - Chargement des données détaillées
class CSVLoader {
  
  static csvData = null;
  static isLoaded = false;

  // Charger le CSV au démarrage
  static async loadCSVData(csvPath = './data/IA-DAS-Data1.csv') {
    try {
      console.log("📁 Chargement du CSV depuis:", csvPath);
      
      const response = await fetch(csvPath);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} - Fichier non trouvé: ${csvPath}`);
      }
      
      const csvText = await response.text();
      
      console.log("📄 Taille du fichier CSV:", csvText.length, "caractères");
      
      // ✅ CORRECTION : Parser le CSV avec des POINTS-VIRGULES
      const lines = csvText.split('\n');
      const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, '')); // Enlever guillemets
      
      console.log("📊 Headers CSV trouvés:", headers);
      console.log("📊 Nombre de lignes totales:", lines.length);
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Ignorer lignes vides
        
        // ✅ CORRECTION : Split par point-virgule
        const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Debug: afficher les premières lignes
        if (i <= 3) {
          console.log(`📋 Ligne ${i}:`, row);
        }
        
        // ✅ CORRECTION : Chercher Analysis_ID (peut être décimal)
        const analysisId = row['Analysis_ID'];
        
        if (analysisId && analysisId !== '' && analysisId !== 'N.A.' && analysisId !== 'NA') {
          data.push(row);
          
          // Debug: afficher les premiers IDs trouvés
          if (data.length <= 5) {
            console.log(`🆔 ID trouvé: "${analysisId}" dans la ligne ${i}`);
          }
        }
      }
      
      this.csvData = data;
      this.isLoaded = true;
      
      console.log(`✅ CSV chargé avec succès: ${data.length} analyses`);
      
      if (data.length > 0) {
        console.log("📋 Exemple première analyse complète:", data[0]);
        console.log("🆔 Premiers IDs:", data.slice(0, 10).map(r => r['Analysis_ID']));
      } else {
        console.error("❌ Aucune donnée trouvée ! Vérifiez le format du CSV");
      }
      
      return data;
      
    } catch (error) {
      console.error("❌ Erreur chargement CSV:", error);
      this.csvData = [];
      this.isLoaded = false;
      return [];
    }
  }

  // ✅ NOUVELLE MÉTHODE : Parser une ligne CSV avec guillemets
  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current); // Ajouter le dernier élément
    return result;
  }

  // Rechercher une analyse par ID
  static findAnalysisById(analysisId) {
    if (!this.isLoaded || !this.csvData) {
      console.warn("⚠️ CSV non chargé, impossible de rechercher l'analyse");
      return null;
    }

    // ✅ CORRECTION : Nettoyer l'ID et gérer format français (virgule)
    let cleanId = analysisId.toString()
      .replace(/^Analysis_/, '')    // Enlever préfixe
      .replace(/\.0$/, '')          // Enlever .0 à la fin
      .replace('.', ',');           // Convertir point en virgule (format français)
    
    console.log(`🔍 Recherche analyse: "${analysisId}" (nettoyé: "${cleanId}")`);
    
    // Chercher l'analyse avec différentes variantes
    const found = this.csvData.find(row => {
      const rowId = row['Analysis_ID'];
      if (!rowId) return false;
      
      const cleanRowId = rowId.toString().trim();
      
      // Tests de correspondance multiples
      const matches = [
        cleanRowId === analysisId,           // Exact match
        cleanRowId === cleanId,              // ID nettoyé
        cleanRowId.replace(',', '.') === analysisId,  // Virgule → point
        cleanRowId.replace(',', '.') === cleanId,     // Virgule → point nettoyé
        `Analysis_${cleanRowId}` === analysisId,      // Avec préfixe
        parseFloat(cleanRowId.replace(',', '.')) === parseFloat(analysisId.toString().replace(',', '.'))  // Comparaison numérique
      ];
      
      const isMatch = matches.some(m => m);
      
      if (isMatch) {
        console.log(`✅ Match trouvé! CSV: "${cleanRowId}" <-> Recherché: "${analysisId}"`);
      }
      
      return isMatch;
    });

    if (found) {
      console.log(`✅ Analyse trouvée:`, found);
    } else {
      console.log(`❌ Analyse non trouvée: ${analysisId}`);
      console.log("📋 Exemples d'IDs dans le CSV:", this.csvData.slice(0, 10).map(r => r['Analysis_ID']));
    }

    return found;
  }

  // Obtenir toutes les données
  static getAllData() {
    return this.csvData || [];
  }

  static isCSVLoaded() {
    return this.isLoaded;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Chargement automatique du CSV...");
  await CSVLoader.loadCSVData();
  window.csvLoader = CSVLoader; // Disponible globalement
});
// // Excel Loader - Chargement des données Excel (remplacement de CSVLoader)
// class ExcelLoader {
  
//   static excelData = null;
//   static isLoaded = false;

//   // Charger le fichier Excel au démarrage
//   static async loadExcelData(excelPath = './data/IA-DAS-Data1.xlsx') {
//     try {
//       console.log("📁 Chargement du fichier Excel depuis:", excelPath);
      
//       const response = await fetch(excelPath);
//       if (!response.ok) {
//         throw new Error(`Erreur HTTP: ${response.status} - Fichier non trouvé: ${excelPath}`);
//       }
      
//       const arrayBuffer = await response.arrayBuffer();
      
//       console.log("📄 Taille du fichier Excel:", arrayBuffer.byteLength, "bytes");
      
//       const workbook = XLSX.read(arrayBuffer, {
//         cellStyles: true,    // Couleurs et formatage
//         cellFormulas: true,  // Formules
//         cellDates: true,     // Gestion des dates
//         cellNF: true,        // Formatage des nombres
//         sheetStubs: true     // Cellules vides
//       });
      
//       console.log("📊 Feuilles disponibles:", workbook.SheetNames);
      
//       // Prendre la première feuille
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
      
//       console.log(`📋 Lecture de la feuille: ${sheetName}`);
      
//       const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//         header: 1,           // Utiliser la première ligne comme headers
//         raw: false,          // Convertir tout en string pour cohérence
//         defval: '',          // Valeur par défaut pour cellules vides
//         blankrows: false     // Ignorer les lignes vides
//       });
      
//       if (jsonData.length === 0) {
//         throw new Error("Fichier Excel vide");
//       }
      
//       // Récupérer les headers (première ligne)
//       const headers = jsonData[0];
//       console.log("📊 Headers Excel trouvés:", headers);
//       console.log("📊 Nombre de colonnes:", headers.length);
      
//       // Convertir en objets avec les headers comme clés
//       const data = [];
//       for (let i = 1; i < jsonData.length; i++) {
//         const rowArray = jsonData[i];
//         const rowObject = {};
        
//         // Mapper chaque valeur à son header
//         headers.forEach((header, index) => {
//           rowObject[header] = rowArray[index] || '';
//         });
        
//         // Debug les premières lignes
//         if (i <= 3) {
//           console.log(`📋 Ligne ${i}:`, rowObject);
//         }
        
//         // Vérifier si c'est une analyse valide (a un Analysis_ID)
//         const analysisId = rowObject['Analysis_ID'];
        
//         if (analysisId && analysisId !== '' && analysisId !== 'N.A.' && analysisId !== 'NA') {
//           data.push(rowObject);
          
//           // Debug les premiers IDs trouvés
//           if (data.length <= 5) {
//             console.log(`🆔 ID trouvé: "${analysisId}" dans la ligne ${i}`);
//           }
//         }
//       }
      
//       this.excelData = data;
//       this.isLoaded = true;
      
//       console.log(`✅ Excel chargé avec succès: ${data.length} analyses`);
      
//       if (data.length > 0) {
//         console.log("📋 Exemple première analyse complète:", data[0]);
//         console.log("🆔 Premiers IDs:", data.slice(0, 10).map(r => r['Analysis_ID']));
//       } else {
//         console.error("❌ Aucune donnée trouvée ! Vérifiez le contenu du fichier Excel");
//       }
      
//       return data;
      
//     } catch (error) {
//       console.error("❌ Erreur chargement Excel:", error);
//       this.excelData = [];
//       this.isLoaded = false;
//       return [];
//     }
//   }

//   // Rechercher une analyse par ID
//   static findAnalysisById(analysisId) {
//     if (!this.isLoaded || !this.excelData) {
//       console.warn("⚠️ Excel non chargé, impossible de rechercher l'analyse");
//       return null;
//     }

//     let cleanId = analysisId.toString()
//       .replace(/^Analysis_/, '')    // Enlever préfixe
//       .replace(/\.0$/, '')          // Enlever .0 à la fin
//       .trim();
    
//     console.log(`🔍 Recherche analyse: "${analysisId}" (nettoyé: "${cleanId}")`);
    
//     // Chercher l'analyse avec différentes variantes
//     const found = this.excelData.find(row => {
//       const rowId = row['Analysis_ID'];
//       if (!rowId) return false;
      
//       const cleanRowId = rowId.toString().trim();
      
//       // Tests de correspondance multiples
//       const matches = [
//         cleanRowId === analysisId,           // Exact match
//         cleanRowId === cleanId,              // ID nettoyé
//         `Analysis_${cleanRowId}` === analysisId,      // Avec préfixe
//         parseFloat(cleanRowId) === parseFloat(analysisId.toString())  // Comparaison numérique
//       ];
      
//       const isMatch = matches.some(m => m);
      
//       if (isMatch) {
//         console.log(`✅ Match trouvé! Excel: "${cleanRowId}" <-> Recherché: "${analysisId}"`);
//       }
      
//       return isMatch;
//     });

//     if (found) {
//       console.log(`✅ Analyse trouvée:`, found);
      
//       console.log(`🔍 [Excel] DOI: "${found.DOI}" (type: ${typeof found.DOI})`);
//       console.log(`🔍 [Excel] BMI: "${found.BMI}" (type: ${typeof found.BMI})`);
//       console.log(`🔍 [Excel] Country: "${found.Country}" (type: ${typeof found.Country})`);
//       console.log(`🔍 [Excel] Population subgroup: "${found['Population subgroup']}" (type: ${typeof found['Population subgroup']})`);
      
//     } else {
//       console.log(`❌ Analyse non trouvée: ${analysisId}`);
//       console.log("📋 Exemples d'IDs dans Excel:", this.excelData.slice(0, 10).map(r => r['Analysis_ID']));
//     }

//     return found;
//   }

//   // Obtenir toutes les données
//   static getAllData() {
//     return this.excelData || [];
//   }

//   static isExcelLoaded() {
//     return this.isLoaded;
//   }

//   static async analyzeExcelStructure(excelPath = './data/IA-DAS-Data1.xlsx') {
//     try {
//       const response = await fetch(excelPath);
//       const arrayBuffer = await response.arrayBuffer();
//       const workbook = XLSX.read(arrayBuffer);
      
//       console.log("🔍 ANALYSE STRUCTURE EXCEL:");
//       console.log("📊 Nombre de feuilles:", workbook.SheetNames.length);
//       console.log("📋 Noms des feuilles:", workbook.SheetNames);
      
//       workbook.SheetNames.forEach(sheetName => {
//         const worksheet = workbook.Sheets[sheetName];
//         const range = XLSX.utils.decode_range(worksheet['!ref']);
        
//         console.log(`📄 Feuille "${sheetName}":`);
//         console.log(`  - Plage: ${worksheet['!ref']}`);
//         console.log(`  - Lignes: ${range.e.r + 1}`);
//         console.log(`  - Colonnes: ${range.e.c + 1}`);
        
//         // Aperçu des headers
//         const headers = [];
//         for (let col = range.s.c; col <= range.e.c; col++) {
//           const cellAddress = XLSX.utils.encode_cell({r: 0, c: col});
//           const cell = worksheet[cellAddress];
//           headers.push(cell ? cell.v : '');
//         }
//         console.log(`  - Headers: ${headers.slice(0, 10).join(', ')}...`);
//       });
      
//     } catch (error) {
//       console.error("❌ Erreur analyse structure:", error);
//     }
//   }
// }

// document.addEventListener('DOMContentLoaded', async () => {
//   console.log("🚀 Chargement automatique du fichier Excel...");
  
//   // Option 1: Analyser d'abord la structure (optionnel)
//   // await ExcelLoader.analyzeExcelStructure();
  
//   // Option 2: Charger directement les données
//   await ExcelLoader.loadExcelData();
  
//   window.csvLoader = {
//     findAnalysisById: ExcelLoader.findAnalysisById.bind(ExcelLoader),
//     getAllData: ExcelLoader.getAllData.bind(ExcelLoader),
//     isCSVLoaded: ExcelLoader.isExcelLoaded.bind(ExcelLoader)
//   };
  
//   window.excelLoader = ExcelLoader; // Aussi disponible sous le vrai nom
  
//   console.log("✅ ExcelLoader disponible globalement (compatible avec csvLoader)");
// });
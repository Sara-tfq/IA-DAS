// Ici dans ce fichier se passe toute la partie de l'input 

async function rechercher() {
  const gender = document.getElementById('gender').value;
  const minAge = document.getElementById('minAge').value;

  const payload = {
    ...(gender && { gender }),
    ...(minAge && { minAge: parseInt(minAge) })
  };

  try {
    const response = await fetch('http://localhost:8000/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Erreur HTTP " + response.status);

    const data = await response.json();
    
    
    displayResults(data);
    
  } catch (err) {
    document.getElementById('results').textContent = "Erreur : " + err.message;
  }
}


function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  
  
  resultsDiv.innerHTML = '';
  
  
  if (!data || !data.results || !data.results.bindings) {
    resultsDiv.innerHTML = '<p>Aucun résultat trouvé</p>';
    return;
  }
  
  
  try {
    const graphComponent = new OntologyGraphComponent(resultsDiv, data);
    graphComponent.render();
  } catch (error) {
    console.error('Erreur lors du rendu du graphique:', error);
    resultsDiv.innerHTML = '<p>Erreur lors de l\'affichage des résultats</p>';
  }
}
// Ici dans ce fichier se passe toute la prtie de l'input 

async function rechercher() {
//   const sportName = document.getElementById('sport').value;
  const gender = document.getElementById('gender').value;
  const minAge = document.getElementById('minAge').value;
//   const maxAge = document.getElementById('maxAge').value;

  const payload = {
    ...(sportName && { sportName }),
    ...(gender && { gender }),
    ...(minAge && { minAge: parseInt(minAge) }),
    ...(maxAge && { maxAge: parseInt(maxAge) })
  };

  try {
    const response = await fetch('http://localhost:8002/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Erreur HTTP " + response.status);

    const data = await response.json();
    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById('results').textContent = "Erreur : " + err.message;
  }
}

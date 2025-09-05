// Fonctionnalité de date de dernière mise à jour
document.addEventListener('DOMContentLoaded', function() {
    loadLastUpdateDate();
});

async function loadLastUpdateDate() {
    try {
        // Récupérer la date de dernière mise à jour depuis l'API
        const response = await fetch('/api/ontology/last-update');
        
        if (response.ok) {
            const data = await response.json();
            const lastUpdate = new Date(data.lastUpdate);
            
            // Formater la date en français
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            const formattedDate = lastUpdate.toLocaleDateString('fr-FR', options);
            document.getElementById('lastUpdateDate').textContent = formattedDate;
        } else {
            // Si l'API n'est pas disponible, utiliser une date par défaut
            console.warn('API de mise à jour non disponible, utilisation de la date courante');
            setDefaultUpdateDate();
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de la date de mise à jour:', error);
        setDefaultUpdateDate();
    }
}

function setDefaultUpdateDate() {
    // Utiliser la date actuelle comme fallback
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formattedDate = now.toLocaleDateString('fr-FR', options);
    document.getElementById('lastUpdateDate').textContent = formattedDate;
}
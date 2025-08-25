

import re
import os

def replace_percent20_in_file(file_path, output_path=None):
    """
    Remplace tous les %20 par des underscores dans un fichier
    
    Args:
        file_path (str): Chemin vers le fichier d'entrée
        output_path (str, optional): Chemin vers le fichier de sortie. 
                                   Si None, écrase le fichier original
    """
    try:
        # Lire le fichier
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Remplacer %20 par _
        content_fixed = content.replace('%20', '_')
        
        # Optionnel: remplacer aussi les espaces dans les URIs par des underscores
        # Pattern pour capturer les URIs avec des espaces
        uri_pattern = r'(<http://[^>]*)\s+([^>]*>)'
        content_fixed = re.sub(uri_pattern, r'\1_\2', content_fixed)
        
        # Déterminer le fichier de sortie
        if output_path is None:
            output_path = file_path
        
        # Écrire le fichier corrigé
        with open(output_path, 'w', encoding='utf-8') as file:
            file.write(content_fixed)
        
        print(f"✅ Fichier traité avec succès: {file_path}")
        if output_path != file_path:
            print(f"   Sauvegardé dans: {output_path}")
        
        return True
        
    except FileNotFoundError:
        print(f"❌ Erreur: Fichier non trouvé - {file_path}")
        return False
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")
        return False

def replace_percent20_in_text(text):
    """
    Remplace %20 par des underscores dans une chaîne de caractères
    
    Args:
        text (str): Texte à traiter
        
    Returns:
        str: Texte avec %20 remplacés par _
    """
    return text.replace('%20', '_')

def batch_process_files(directory, file_extension=".ttl"):
    """
    Traite tous les fichiers d'une extension donnée dans un répertoire
    
    Args:
        directory (str): Répertoire à traiter
        file_extension (str): Extension des fichiers à traiter (par défaut .ttl)
    """
    processed_count = 0
    
    for filename in os.listdir(directory):
        if filename.endswith(file_extension):
            file_path = os.path.join(directory, filename)
            if replace_percent20_in_file(file_path):
                processed_count += 1
    
    print(f"\n🎉 Traitement terminé: {processed_count} fichier(s) traité(s)")

# Exemple d'utilisation
if __name__ == "__main__":
    # Option 1: Traiter un fichier spécifique
    # replace_percent20_in_file("mon_ontologie.ttl")
    
    # Option 2: Traiter un fichier et sauver sous un nouveau nom
    replace_percent20_in_file("data.ttl", "data-.ttl")
    
    # Option 3: Traiter une chaîne de texte
    example_text = """
    iadas:hasCategory "DEAB";
    iadas:hasVariableConcept <http://ia-das.org/taxonomy#Variable_VD_Eating%20disorders>;
    iadas:measure "Eating Attitude Test (EAT-26)";
    iadas:subClass1 "Eating disorders";
    """
    
    print("Texte original:")
    print(example_text)
    print("\nTexte corrigé:")
    print(replace_percent20_in_text(example_text))
    
    # Option 4: Traiter tous les fichiers .ttl d'un répertoire
    # batch_process_files("./ontologies/", ".ttl")
    
    # Pour ton cas spécifique, décommente cette ligne:
    # replace_percent20_in_file("ton_fichier_ontologie.ttl")
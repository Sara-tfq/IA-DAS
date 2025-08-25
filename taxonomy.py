#!/usr/bin/env python3
"""
Générateur de taxonomie IA-DAS
Convertit le fichier CSV de hiérarchie en ontologie RDF/Turtle
"""

import pandas as pd
import re
from typing import Set, Dict, List, Tuple

class TaxonomyGenerator:
    def __init__(self, csv_path: str):
        """
        Initialise le générateur avec le chemin du fichier CSV
        
        Args:
            csv_path: Chemin vers Class_hierarchy_V1Hierarchy.csv
        """
        self.csv_path = csv_path
        self.classes: Set[str] = set()
        self.relations: List[Tuple[str, str]] = []
        self.class_labels: Dict[str, str] = {}
        
    def to_uri_fragment(self, text: str) -> str:
        """
        Convertit un texte en identifiant URI valide
        "Dependence and Excessive Exercise" → "DependenceAndExcessiveExercise"
        
        Args:
            text: Texte à convertir
            
        Returns:
            Identifiant URI valide
        """
        if not text or pd.isna(text):
            return None
            
        # Supprimer les caractères spéciaux sauf espaces et tirets
        text = re.sub(r'[^\w\s-]', '', str(text))
        
        # Convertir en CamelCase
        words = text.split()
        uri = ''.join(word.capitalize() for word in words)
        
        # Supprimer les espaces restants
        uri = uri.replace(' ', '').replace('-', '')
        
        return uri
    
    def process_hierarchy(self):
        """
        Lit le CSV et extrait la hiérarchie complète
        """
        # Lire le CSV avec le bon délimiteur
        df = pd.read_csv(self.csv_path, delimiter=';', encoding='utf-8')
        
        print(f"Fichier chargé: {len(df)} lignes")
        print(f"Colonnes: {df.columns.tolist()[:10]}...")
        
        # Colonnes de hiérarchie
        hierarchy_cols = ['CLASS', 'sub-class 1', 'sub-class 2', 'sub-class 3', 'sub-class 4']
        
        for _, row in df.iterrows():
            parent = None
            
            for col in hierarchy_cols:
                if col in row and row[col] and not pd.isna(row[col]):
                    # Créer l'URI et garder le label original
                    uri = self.to_uri_fragment(row[col])
                    if uri:
                        self.classes.add(uri)
                        self.class_labels[uri] = str(row[col]).strip()
                        
                        # Ajouter la relation parent-enfant
                        if parent:
                            self.relations.append((uri, parent))
                        
                        parent = uri
        
        print(f"Classes extraites: {len(self.classes)}")
        print(f"Relations extraites: {len(self.relations)}")
    
    def generate_turtle(self, output_path: str):
        """
        Génère le fichier Turtle avec la taxonomie
        
        Args:
            output_path: Chemin du fichier .ttl à générer
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            # En-tête et préfixes
            f.write("""@prefix iadas: <http://ia-das.org/onto#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

# ============================================
# Taxonomie IA-DAS - Hiérarchie des concepts
# ============================================
# Générée automatiquement depuis Class_hierarchy_V1Hierarchy.csv
# Total: {} classes, {} relations

""".format(len(self.classes), len(self.relations)))
            
            # Classes racines (sans parents)
            child_classes = {child for child, _ in self.relations}
            root_classes = self.classes - child_classes
            
            f.write("# Classes racines\n")
            f.write("# ---------------\n\n")
            
            for cls in sorted(root_classes):
                f.write(f"iadas:{cls} a rdfs:Class ;\n")
                f.write(f'    rdfs:label "{self.class_labels[cls]}"@en ;\n')
                f.write(f'    rdfs:comment "Concept racine de la taxonomie IA-DAS"@fr .\n\n')
            
            # Organiser les classes par niveau
            f.write("# Hiérarchie des sous-classes\n")
            f.write("# ---------------------------\n\n")
            
            # Grouper par parent pour une meilleure lisibilité
            relations_by_parent: Dict[str, List[str]] = {}
            for child, parent in self.relations:
                if parent not in relations_by_parent:
                    relations_by_parent[parent] = []
                relations_by_parent[parent].append(child)
            
            # Écrire les sous-classes groupées par parent
            for parent in sorted(relations_by_parent.keys()):
                f.write(f"# Sous-classes de {self.class_labels.get(parent, parent)}\n")
                
                for child in sorted(relations_by_parent[parent]):
                    f.write(f"iadas:{child} a rdfs:Class ;\n")
                    f.write(f"    rdfs:subClassOf iadas:{parent} ;\n")
                    f.write(f'    rdfs:label "{self.class_labels[child]}"@en .\n\n')
    
    def generate_statistics(self):
        """
        Affiche des statistiques sur la taxonomie générée
        """
        print("\n=== STATISTIQUES DE LA TAXONOMIE ===")
        print(f"Nombre total de classes: {len(self.classes)}")
        print(f"Nombre de relations: {len(self.relations)}")
        
        # Classes racines
        child_classes = {child for child, _ in self.relations}
        root_classes = self.classes - child_classes
        print(f"Classes racines: {len(root_classes)}")
        for root in sorted(root_classes):
            print(f"  - {self.class_labels[root]}")
        
        # Profondeur
        print("\nExemples de hiérarchies:")
        examples_shown = 0
        for child, parent in self.relations[:5]:
            if examples_shown < 5:
                print(f"  {self.class_labels[parent]} → {self.class_labels[child]}")
                examples_shown += 1


def main():
    """
    Fonction principale
    """
    # Chemins des fichiers
    csv_path = "Class_hierarchy.csv"
    output_path = "ia-das-taxonomy.ttl"
    
    print("=== Générateur de Taxonomie IA-DAS ===\n")
    
    # Créer le générateur
    generator = TaxonomyGenerator(csv_path)
    
    # Traiter la hiérarchie
    print("1. Lecture du fichier CSV...")
    generator.process_hierarchy()
    
    # Générer le fichier Turtle
    print("\n2. Génération du fichier Turtle...")
    generator.generate_turtle(output_path)
    print(f"   Fichier généré: {output_path}")
    
    # Afficher les statistiques
    generator.generate_statistics()
    
    print("\n✅ Génération terminée avec succès!")
    print(f"   Le fichier {output_path} est prêt à être chargé dans Fuseki")


if __name__ == "__main__":
    main()
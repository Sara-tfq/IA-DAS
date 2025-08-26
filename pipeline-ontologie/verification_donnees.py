#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de vérification des données CSV vs Ontologie TTL
"""

import csv
import re
from pathlib import Path

def count_csv_analyses():
    """Compte les analyses dans le CSV"""
    csv_file = Path('data-csv-converted/IA-DAS-Data-unique-ids.csv')
    if not csv_file.exists():
        print(f"OK Fichier CSV non trouvé: {csv_file}")
        return 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        
        # Trouver colonne Analysis_ID
        try:
            id_index = headers.index('Analysis_ID')
        except ValueError:
            print("OK Colonne Analysis_ID non trouvée")
            return 0
        
        analysis_ids = set()
        for row in reader:
            if len(row) > id_index and row[id_index].strip():
                analysis_ids.add(row[id_index].strip())
        
        return len(analysis_ids)

def count_ttl_analyses():
    """Compte les analyses dans l'ontologie TTL"""
    ttl_file = Path('output/ia-das-ontology-clean.ttl')
    if not ttl_file.exists():
        print(f"OK Fichier TTL non trouvé: {ttl_file}")
        return 0
    
    with open(ttl_file, 'r', encoding='utf-8') as f:
        content = f.read()
        # Compter les instances d'Analysis
        count = content.count('rdf:type> <http://ia-das.org/onto#Analysis>')
        return count

def compare_specific_analysis(analysis_id="1"):
    """Compare une analyse spécifique entre CSV et TTL"""
    print(f"\nComparaison de l'analyse {analysis_id}")
    print("="*50)
    
    # Données CSV
    csv_file = Path('data-csv-converted/IA-DAS-Data-unique-ids.csv')
    csv_data = {}
    
    if csv_file.exists():
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            
            for row in reader:
                if len(row) > 2 and row[2] == analysis_id:  # Analysis_ID en colonne 2
                    for i, value in enumerate(row):
                        if i < len(headers) and value.strip():
                            csv_data[headers[i]] = value
                    break
    
    print("Donnees CSV:")
    for key, value in list(csv_data.items())[:10]:  # 10 premiers champs
        print(f"   {key}: {value[:50]}{'...' if len(value) > 50 else ''}")
    
    # Données TTL
    ttl_file = Path('output/ia-das-ontology-clean.ttl')
    if ttl_file.exists():
        with open(ttl_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Chercher l'analyse dans le TTL
            analysis_pattern = f'<http://ia-das.org/data#Analysis_{analysis_id}>'
            if analysis_pattern in content:
                print(f"\nDonnees TTL trouvees pour Analysis_{analysis_id}:")
                
                # Extraire quelques propriétés
                lines = content.split('\n')
                for line in lines:
                    if analysis_pattern in line and 'rdf:type' not in line:
                        # Nettoyer et afficher
                        clean_line = line.strip().rstrip(' .')
                        if len(clean_line) > 100:
                            clean_line = clean_line[:97] + '...'
                        print(f"   {clean_line}")
            else:
                print(f"Analysis_{analysis_id} non trouvee dans le TTL")

def check_sample_data():
    """Vérifie un échantillon de données"""
    print("\nVerification d'echantillon")
    print("="*50)
    
    # Variables VD
    ttl_file = Path('output/ia-das-ontology-clean.ttl')
    if ttl_file.exists():
        with open(ttl_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Compter différents types
            vd_count = content.count('rdf:type> <http://ia-das.org/onto#VariableDependante>')
            vi_count = content.count('rdf:type> <http://ia-das.org/onto#VariableIndependante>')
            relations_count = content.count('rdf:type> <http://ia-das.org/onto#Relations>')
            
            print(f"Types d'entites dans l'ontologie:")
            print(f"   Variables Dependantes: {vd_count}")
            print(f"   Variables Independantes: {vi_count}")
            print(f"   Relations: {relations_count}")
            
            # Échantillon de VD
            vd_pattern = r'<http://ia-das\.org/data#Variable_VD_(\d+)>'
            vd_matches = re.findall(vd_pattern, content)
            print(f"   IDs VD trouves (echantillon): {vd_matches[:10]}")

def main():
    """Fonction principale de vérification"""
    print("VERIFICATION DONNEES CSV vs ONTOLOGIE")
    print("="*60)
    
    # Compter analyses
    csv_count = count_csv_analyses()
    ttl_count = count_ttl_analyses()
    
    print(f"Nombre d'analyses:")
    print(f"   CSV: {csv_count}")
    print(f"   TTL: {ttl_count}")
    
    if csv_count == ttl_count and csv_count > 0:
        print("Nombre d'analyses coherent !")
    else:
        print("Difference detectee dans le nombre d'analyses")
    
    # Comparaison spécifique
    compare_specific_analysis("1")
    
    # Échantillon
    check_sample_data()
    
    print(f"\n{'='*60}")
    print("Verification terminee")

if __name__ == "__main__":
    main()
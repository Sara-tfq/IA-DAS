import pandas as pd
import re

def analyze_data_integrity(df_original, df_processed, operation_name="Traitement"):
    """
    Analyse l'intégrité des données avant et après traitement
    """
    print(f"\n{'='*60}")
    print(f"📊 ANALYSE D'INTÉGRITÉ - {operation_name.upper()}")
    print(f"{'='*60}")
    
    # 1. Comparaison des dimensions
    print("📏 DIMENSIONS:")
    print(f"   Avant : {df_original.shape[0]} lignes × {df_original.shape[1]} colonnes")
    print(f"   Après : {df_processed.shape[0]} lignes × {df_processed.shape[1]} colonnes")
    
    ligne_diff = df_processed.shape[0] - df_original.shape[0]
    col_diff = df_processed.shape[1] - df_original.shape[1]
    
    if ligne_diff != 0:
        print(f"   ⚠️  Différence lignes: {ligne_diff:+d}")
    else:
        print("   ✅ Aucune perte de lignes")
        
    if col_diff != 0:
        print(f"   ℹ️  Différence colonnes: {col_diff:+d} (suppression colonnes vides/unnamed normal)")
    else:
        print("   ✅ Aucune suppression de colonnes")
    
    # 2. Analyse des colonnes supprimées/ajoutées
    if col_diff != 0:
        print("\n🔄 CHANGEMENTS DE COLONNES:")
        cols_original = set(df_original.columns)
        cols_processed = set(df_processed.columns)
        
        cols_removed = cols_original - cols_processed
        cols_added = cols_processed - cols_original
        
        if cols_removed:
            print(f"   Supprimées ({len(cols_removed)}): {list(cols_removed)[:5]}{'...' if len(cols_removed) > 5 else ''}")
        if cols_added:
            print(f"   Ajoutées ({len(cols_added)}): {list(cols_added)}")
    
    # 3. Analyse des valeurs manquantes
    print("\n🔍 VALEURS MANQUANTES (colonnes principales):")
    key_columns = ['DOI', 'Analysis_ID', 'Title', 'Authors', 'Year']
    available_key_cols = [col for col in key_columns if col in df_processed.columns]
    
    for col in available_key_cols:
        if col in df_original.columns:
            missing_before = df_original[col].isnull().sum()
            missing_after = df_processed[col].isnull().sum()
            print(f"   {col}: {missing_before} → {missing_after} manquantes")
            
            if missing_after > missing_before:
                print(f"      ⚠️  +{missing_after - missing_before} valeurs devenues manquantes")
    
    # 4. Validation spécifique Analysis_ID
    if 'Analysis_ID' in df_processed.columns and 'Analysis_ID' in df_original.columns:
        print("\n🔢 VALIDATION ANALYSIS_ID:")
        
        # Compter les valeurs non-nulles
        valid_before = df_original['Analysis_ID'].count()
        valid_after = df_processed['Analysis_ID'].count()
        
        print(f"   Valeurs valides: {valid_before} → {valid_after}")
        
        if valid_after < valid_before:
            lost_values = valid_before - valid_after
            print(f"   ⚠️  {lost_values} valeurs perdues lors de la conversion")
            
            # Identifier les valeurs problématiques
            original_str = df_original['Analysis_ID'].astype(str)
            problematic = original_str[df_processed['Analysis_ID'].isnull() & df_original['Analysis_ID'].notnull()]
            if len(problematic) > 0:
                print(f"   Exemples de valeurs non converties: {problematic.head(3).tolist()}")
        else:
            print("   ✅ Aucune perte lors de la conversion")
    
    # 5. Détection des doublons
    print("\n🔄 DOUBLONS:")
    if 'Analysis_ID' in df_processed.columns:
        duplicates = df_processed['Analysis_ID'].duplicated().sum()
        print(f"   Analysis_ID dupliqués: {duplicates}")
    
    # 6. Échantillonnage pour validation manuelle
    print("\n🎯 ÉCHANTILLON POUR VALIDATION:")
    sample_cols = [col for col in ['Analysis_ID', 'DOI', 'Title'] if col in df_processed.columns]
    if sample_cols:
        sample = df_processed[sample_cols].head(3)
        for idx, row in sample.iterrows():
            print(f"   Ligne {idx+1}: {dict(row)}")
    
    # 7. Résumé de santé
    print(f"\n📋 RÉSUMÉ:")
    issues = []
    
    if ligne_diff < 0:
        issues.append(f"{abs(ligne_diff)} lignes perdues")
    if 'Analysis_ID' in df_processed.columns:
        null_analysis_id = df_processed['Analysis_ID'].isnull().sum()
        if null_analysis_id > 0:
            issues.append(f"{null_analysis_id} Analysis_ID invalides")
    
    if not issues:
        print("   ✅ Aucun problème détecté - données intègres")
    else:
        print("   ⚠️  Points d'attention: " + ", ".join(issues))
    
    print(f"{'='*60}\n")

def fix_csv_file():
    print("Correction du fichier CSV...")
    
    try:
        # Lire le CSV avec le bon délimiteur et en ignorant la première ligne vide
        df_original = pd.read_csv(
            "Sport_Hie.csv",
            delimiter=';',           # Délimiteur correct
            encoding='utf-8',
            low_memory=False,       # Éviter les warnings
            on_bad_lines='skip'     # Ignorer les lignes mal formatées
        )
        
        # Faire une copie pour le traitement
        df = df_original.copy()
        
        print(f"✓ Fichier lu: {df.shape[0]} lignes, {df.shape[1]} colonnes")
        
        # 1. Supprimer les colonnes Unnamed
        unnamed_cols = [col for col in df.columns if 'Unnamed:' in str(col)]
        if unnamed_cols:
            df = df.drop(columns=unnamed_cols)
            print(f"✓ Supprimé {len(unnamed_cols)} colonnes Unnamed")
        
        # 2. Supprimer les colonnes complètement vides
        empty_cols = df.columns[df.isnull().all()].tolist()
        if empty_cols:
            df = df.drop(columns=empty_cols)
            print(f"✓ Supprimé {len(empty_cols)} colonnes vides")
        
        # 3. Nettoyer les noms de colonnes (espaces en fin)
        df.columns = df.columns.str.strip()
        
        # 4. Corriger les types de données
        # Correction spéciale pour Analysis_ID : virgules -> points
        if 'Analysis_ID' in df.columns:
            print("🔧 Correction de Analysis_ID...")
            # Afficher quelques exemples avant correction
            print(f"   Exemples avant: {df['Analysis_ID'].head(3).tolist()}")
            
            # Nettoyer et remplacer les virgules par des points
            df['Analysis_ID'] = df['Analysis_ID'].astype(str).str.strip()  # Nettoyer espaces
            df['Analysis_ID'] = df['Analysis_ID'].str.replace(',', '.', regex=False)  # Virgule -> Point
            
            # Afficher quelques exemples après correction
            print(f"   Exemples après: {df['Analysis_ID'].head(3).tolist()}")
            
            # Convertir en float (nombre décimal)
            df['Analysis_ID'] = pd.to_numeric(df['Analysis_ID'], errors='coerce')
            print("✓ Analysis_ID corrigé et converti en décimal")
            
            # Vérifier s'il y a des valeurs qui n'ont pas pu être converties
            null_count = df['Analysis_ID'].isnull().sum()
            if null_count > 0:
                print(f"⚠️  Attention: {null_count} valeurs n'ont pas pu être converties (devenues NaN)")
        
        # Convertir Code en entier
        if 'Code' in df.columns:
            df['Code'] = pd.to_numeric(df['Code'], errors='coerce').astype('Int64')
            print("✓ Code converti en entier")
        
        # ===== ANALYSE D'INTÉGRITÉ =====
        analyze_data_integrity(df_original, df, "Nettoyage et conversion")
        
        # 5. Sauvegarder le fichier corrigé
        output_filename = "Sport-semi.csv"
        df.to_csv(
            output_filename,
            index=False,
            encoding='utf-8',
            sep=','  # Utiliser des virgules comme délimiteur standard
        )
        
        print(f"✅ Fichier corrigé sauvegardé: {output_filename}")
        print(f"   Dimensions finales: {df.shape[0]} lignes, {df.shape[1]} colonnes")
        
        # Afficher un échantillon des colonnes principales
        main_cols = ['DOI', 'Analysis_ID', 'Title', 'Authors', 'Year']
        available_cols = [col for col in main_cols if col in df.columns]
        if available_cols:
            print("\n📊 Échantillon des données finales:")
            print(df[available_cols].head(2))
        
        # Afficher des statistiques sur Analysis_ID après correction
        if 'Analysis_ID' in df.columns:
            print(f"\n📈 Statistiques Analysis_ID finales:")
            print(f"   Min: {df['Analysis_ID'].min()}")
            print(f"   Max: {df['Analysis_ID'].max()}")
            print(f"   Valeurs uniques: {df['Analysis_ID'].nunique()}")
            print(f"   Valeurs manquantes: {df['Analysis_ID'].isnull().sum()}")
        
        return df
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        print("\n🔍 Diagnostic alternatif...")
        
        # Essayer de lire ligne par ligne pour diagnostiquer
        with open("IA-Data.csv", 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        print(f"   Nombre total de lignes: {len(lines)}")
        print(f"   Première ligne: {lines[0][:100]}...")
        print(f"   Deuxième ligne (en-tête): {lines[1][:100]}...")
        
        return None

# Exécuter la correction
if __name__ == "__main__":
    fixed_df = fix_csv_file()
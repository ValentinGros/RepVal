# Structure des Branches - Projets Forkés

Ce repository contient maintenant deux projets indépendants organisés dans des branches séparées :

## 📋 Structure des Branches

### `main`
- Branche principale avec la configuration de merge
- Contient les fichiers de documentation et de configuration

### `project-a` - RepVal (Projet Avancé)
**Source :** https://github.com/ValentinGros/RepVal.git

**Fonctionnalités :**
- ✨ Système de niveaux hiérarchiques (1-13)
- 🌌 13 images PNG différentes pour chaque niveau
- 🔄 Mécanique orbitale (sprites de niveau inférieur orbitent autour des supérieurs)
- 🎨 Sélecteur d'images personnalisées (`image_selector.html`)
- 🎯 Système de collision pour éviter les chevauchements
- ⭐ Champ d'étoiles de fond
- 📏 Tailles dynamiques selon le niveau
- 💾 Configuration persistante (localStorage)

**Fichiers spécifiques :**
- `1blackhole.png` à `13asteroid.png` (13 images)
- `image_selector.html`
- `test_data_with_levels.json`
- `whoz_logo.png`, `links.png`, `bubble.png`

### `project-b` - Xefie88.github.io (Projet Simple)
**Source :** https://github.com/Xefie88/Xefie88.github.io.git

**Fonctionnalités :**
- 🎮 Mode démo automatique
- 🌟 Une seule image pour tous les sprites (`etoile2.png`)
- 🎯 Interface simplifiée
- 📊 Données chiffrées par défaut

**Fichiers spécifiques :**
- `etoile2.png`
- `test_particles.json`
- `test_demo.html`

### `merge-branch`
- Branche de travail pour les opérations de merge
- Point de départ pour fusionner les fonctionnalités des deux projets

## 🔄 Utilisation

### Basculer vers Project-A (Avancé)
```bash
git checkout project-a
```

### Basculer vers Project-B (Simple)
```bash
git checkout project-b
```

### Travailler sur le merge
```bash
git checkout merge-branch
```

## 📊 Comparaison

| Fonctionnalité | Project-A | Project-B |
|----------------|-----------|-----------|
| Images multiples | ✅ (13 PNG) | ❌ (1 PNG) |
| Système de niveaux | ✅ | ❌ |
| Mécanique orbitale | ✅ | ❌ |
| Mode démo | ❌ | ✅ |
| Sélecteur d'images | ✅ | ❌ |
| Complexité du code | 1238 lignes | 938 lignes |

## 🎯 Objectif

Cette structure permet de :
1. **Préserver** les deux projets dans leur état original
2. **Comparer** facilement les différences
3. **Merger** sélectivement les fonctionnalités souhaitées
4. **Maintenir** l'historique de développement de chaque projet

---
*Dernière mise à jour : 13 juin 2025*
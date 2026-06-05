# ERSE ACADEMY — Structure Modulaire

## Avant (monolithique)
```
index.html  ← 5498 lignes tout-en-un
```

## Après (modulaire)
```
erse-academy/
├── index.html          ← Shell HTML : 716 lignes (structure + pages virtuelles)
├── css/
│   └── main.css        ← Tous les styles : 600 lignes
└── js/
    ├── config.js       ← Firebase init + helpers (257 lignes)
    ├── db.js           ← Base de données + état global (282 lignes)
    ├── auth.js         ← Login, register, logout (256 lignes)
    ├── nav.js          ← Routing goPage(), dark mode (74 lignes)
    ├── home.js         ← Page accueil + compteurs (261 lignes)
    ├── courses.js      ← Cours PDF + système niveaux (178 lignes)
    ├── exams.js        ← Quiz, timer, anti-triche, boutique (1025 lignes)
    ├── leaderboard.js  ← Classement, certificats, profil, notifs (233 lignes)
    ├── planning.js     ← Planning révision + XP (134 lignes)
    ├── forum.js        ← Forum Firestore + badges (280 lignes)
    ├── firebase-sync.js← RTDB + auto-refresh (230 lignes)
    ├── admin.js        ← Panel admin complet (459 lignes)
    ├── energybot.js    ← Chatbot IA Groq (219 lignes)
    ├── utils.js        ← Search, modal, toast, légal (351 lignes)
    └── init.js         ← localStorage + onAuthStateChanged (136 lignes)
```

## Réduction
- Fichier unique : 5498 lignes
- Fichier le plus lourd maintenant : exams.js (1025 lignes)
- Moyenne des modules : ~275 lignes

## Pour utiliser
Ouvrir `index.html` dans un serveur local (pas file://) car Firebase nécessite HTTP.
```bash
npx serve .
# ou
python3 -m http.server 8080
```

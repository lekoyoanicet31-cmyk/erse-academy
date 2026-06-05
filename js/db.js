// ═══ db.js ═══
/* ═══════════════════════════════════════════
   BASE DE DONNÉES
═══════════════════════════════════════════ */
const DB = {
  users:[],
  subjects:[
    {id:1,name:'Mathématiques',icon:'📐',level:1,docs:2,active:true,desc:'Algèbre, analyse et outils mathématiques pour la physique',files:[
      {name:'Algèbre L1',driveId:'15iV_8nkjtuvanI12zwWUC3TyJbutuwdR'},
      {name:'Outils mathématiques',driveId:'1FFADYlsH4KJIRPAcmcExljjo0nFJTejA'},
    ]},
    {id:2,name:'Chimie Générale',icon:'⚗️',level:1,docs:1,active:true,desc:'Atomes, liaisons chimiques, structures électroniques',files:[
      {name:'Chimie générale',driveId:'1p7gnebd4e6rNYKXeU8jCZUnAym3JW8Ct'},
    ]},
    {id:3,name:'Chimie Organique',icon:'🧪',level:1,docs:1,active:true,desc:'Stéréochimie, réactions et mécanismes réactionnels',files:[
      {name:'Chimie organique générale',driveId:'1FLYhlFwoJXOfsR5FbuSXKa-Xlgo_fX4q'},
    ]},
    {id:4,name:'Chimie des Terres Rares',icon:'💎',level:2,docs:1,active:true,desc:'Propriétés électromagnétiques et applications industrielles',files:[
      {name:'Chimie des terres rares',driveId:'1-2ZDgNstthtOkJLF0KfJWVwKKnJTiRbP'},
    ]},
    {id:5,name:'Thermochimie & Équilibres',icon:'🔥',level:1,docs:0,active:true,desc:'Thermodynamique chimique, acides-bases, piles électrochimiques',files:[]},
    {id:6,name:'Mécanique du Point',icon:'⚙️',level:1,docs:1,active:true,desc:'Cinématique, dynamique et forces centrales',files:[
      {name:'Mécanique du point matériel',driveId:'1rz7eLc8o4ZmsUsgbbywFAJVwHgucxzJW'},
    ]},
    {id:7,name:'Électrocinétique',icon:'⚡',level:1,docs:1,active:true,desc:'Circuits, théorème de Thévenin, filtres et condensateurs',files:[
      {name:'Électrocinétique',driveId:'10Z8QFxsoZLLfpHob1ttWglKTK7tMfna5'},
    ]},
    {id:8,name:'Électromagnétisme',icon:'🧲',level:2,docs:1,active:true,desc:'Dipôles, champs électrique et magnétique, théorème de Gauss',files:[
      {name:'Électromagnétisme',driveId:'19ukXfBQ8RxIpVO5Cj7sgPGCvh8p1BokA'},
    ]},
    {id:9,name:'Optique Géométrique',icon:'🔭',level:2,docs:0,active:true,desc:'Miroirs sphériques, dioptres, lentilles et réfraction',files:[]},
    {id:10,name:'Statistiques',icon:'📊',level:2,docs:1,active:true,desc:'Méthodes statistiques univariées et bivariées',files:[
      {name:'Méthodes statistiques et analyse de données',driveId:'1oNLArK7zNIhPF5HTmBbNLItDyOSAcImo'},
    ]},
    {id:11,name:'Normes & Mesures',icon:'📏',level:1,docs:1,active:true,desc:'Normes, incertitudes et métrologie',files:[
      {name:'Normes et mesures',driveId:'1Fp3E-B83iDAFdqDzOyRps24JE6uGseLg'},
    ]},
    {id:12,name:'Sécurité & Environnement',icon:'🛡️',level:1,docs:1,active:true,desc:'Sécurité électrique, risques chimiques et environnement',files:[
      {name:'Sécurité environnementale',driveId:'1jCzk6XtiBUK5-GWOyZ3rCEpoGl6AXdaw'},
    ]},
    {id:13,name:'TEEO',icon:'✍️',level:1,docs:1,active:true,desc:'Techniques d\'expression écrite et orale',files:[
      {name:'Techniques d\'expression écrite et orale',driveId:'1cYtcXVxDtSdf_jAJ1xC4B2xpV2ep6tyz'},
    ]},
    {id:14,name:'Informatique & Programmation',icon:'💻',level:1,docs:0,active:true,desc:'Python, algorithmes et structures de données',files:[]},
    {id:15,name:'Anglais Scientifique',icon:'🌍',level:1,docs:0,active:true,desc:'Anglais appliqué aux énergies renouvelables',files:[]},
  ],
  exams:[
    {id:1,subjectId:1,title:'Mathématiques — Algèbre & Analyse',difficulty:'Intermédiaire',questions:[
      {q:'Dans le problème de migration Abomey-Calavi/Cotonou, si la moitié des habitants d\'Abomey-Calavi partent à Cotonou et un quart des habitants de Cotonou reviennent, quelle est la matrice M du système ?',opts:['M = (0,5 ; 0,25 / 0,5 ; 0,75)','M = (0,5 ; 0,5 / 0,25 ; 0,75)','M = (0,75 ; 0,25 / 0,5 ; 0,5)','M = (1 ; 0,25 / 0,5 ; 1)'],ans:0,exp:'a_{n+1} = 0,5a_n + 0,25c_n et c_{n+1} = 0,5a_n + 0,75c_n, ce qui donne M=(0,5;0,25/0,5;0,75).'},
      {q:'Pour le système (S) : x+y-z=2, 2x+3y-z=5, 3x+5y-2z=8, le rang de la matrice A associée est :',opts:['1','2','3','4'],ans:1,exp:'En effectuant les opérations élémentaires, on obtient 2 lignes non nulles, donc rang(A)=2.'},
      {q:'La diagonalisation de M = (0,5;0,25/0,5;0,75) donne les valeurs propres :',opts:['λ1=1 et λ2=0,25','λ1=0,5 et λ2=0,75','λ1=1 et λ2=0,5','λ1=0,25 et λ2=0,75'],ans:0,exp:'Le polynôme caractéristique donne λ²-1,25λ+0,25=0, soit λ1=1 et λ2=0,25.'},
      {q:'Si f1(x) = cos(2·arctan(x)), la simplification donne :',opts:['(1-x²)/(1+x²)','2x/(1+x²)','(1+x²)/(1-x²)','x²/(1+x²)'],ans:0,exp:'En posant t=arctan(x), cos(2t) = (1-tan²t)/(1+tan²t) = (1-x²)/(1+x²).'},
      {q:'Le domaine de définition de f : x → arcsin(1/x) est :',opts:['[-1,1]',']-∞,-1]∪[1,+∞[',']-1,0[∪]0,1[','ℝ'],ans:1,exp:'arcsin(u) est défini pour u∈[-1,1]. Donc 1/x∈[-1,1] implique |x|≥1.'},
      {q:'Pour la fonction g : x → x + th(x) définie sur ℝ+, elle est :',opts:['Décroissante','Constante','Strictement croissante','Non monotone'],ans:2,exp:'g\'(x) = 1 + 1/ch²(x) > 0 pour tout x, donc g est strictement croissante.'},
      {q:'∫₀^(π/4) tan²(x) dx =',opts:['1 - π/4','π/4 - 1','π/4','1'],ans:0,exp:'tan²x = 1/cos²x - 1 → ∫tan²x dx = tan(x) - x + C. Entre 0 et π/4 : 1 - π/4.'},
      {q:'Le développement limité à l\'ordre 2 de 1/(1+x) au voisinage de 0 est :',opts:['1 + x + x²','1 - x + x²','1 + x - x²','1 - x - x²'],ans:1,exp:'1/(1+x) = 1 - x + x² - x³ + ... donc à l\'ordre 2 : 1 - x + x².'},
      {q:'Si M = PDP⁻¹ avec D=(1,0/0,0.25), alors M^n =',opts:['PD^n P⁻¹','P^n D P⁻¹','D^n','P D^n P'],ans:0,exp:'Par récurrence, M^n = (PDP⁻¹)^n = PD^n P⁻¹.'},
      {q:'lim(n→+∞) M^n pour M=(0,5;0,25/0,5;0,75) est :',opts:['La matrice nulle','La matrice identité','(1/3;1/3/2/3;2/3)','(0,25;0,25/0,75;0,75)'],ans:2,exp:'Quand n→∞, λ2^n=0,25^n→0. La limite donne la projection sur le vecteur propre de λ1=1.'},
    ]},
    {id:2,subjectId:2,title:'Chimie Générale',difficulty:'Intermédiaire',questions:[
      {q:'L\'isotope ³⁵₁₇Cl possède :',opts:['17 protons et 18 neutrons','17 protons et 35 neutrons','35 protons et 17 neutrons','18 protons et 17 neutrons'],ans:0,exp:'Z=17 donne 17 protons. N = A-Z = 35-17 = 18 neutrons.'},
      {q:'La sous-couche qui se sature à 10 électrons est :',opts:['s','p','d','f'],ans:2,exp:'La sous-couche d contient 5 orbitales × 2 électrons = 10 électrons maximum.'},
      {q:'Le cuivre (Z=29) appartient à la famille des :',opts:['Gaz rares','Alcalino-terreux','Halogènes','Métaux de transition'],ans:3,exp:'Le cuivre est un métal de transition (bloc d), avec la configuration [Ar]3d¹⁰4s¹.'},
      {q:'Au sens de Brønsted, un acide est une espèce capable de :',opts:['Gagner un proton','Céder un proton','Gagner un électron','Céder un électron'],ans:1,exp:'Selon Brønsted-Lowry, un acide est un donneur de proton H⁺.'},
      {q:'Pour V = k[A]^α[B]^β, α et β sont :',opts:['Les ordres globaux','Les ordres partiels','Les constantes de vitesse','Les coefficients stœchiométriques'],ans:1,exp:'α est l\'ordre partiel par rapport à A et β l\'ordre partiel par rapport à B.'},
      {q:'Dans un système fermé :',opts:['Il y a échange de matière et d\'énergie','Il n\'y a aucun échange avec l\'extérieur','Il n\'y a pas d\'échange d\'énergie','Il n\'y a pas d\'échange de matière'],ans:3,exp:'Un système fermé échange de l\'énergie mais pas de matière avec le milieu extérieur.'},
      {q:'La pile Cu²⁺/Cu et Zn²⁺/Zn avec E°(Cu)=0,34V et E°(Zn)=-0,76V. La f.e.m est :',opts:['0,34 V','0,76 V','1,10 V','-0,42 V'],ans:2,exp:'f.e.m = E°cathode - E°anode = 0,34 - (-0,76) = 1,10 V.'},
      {q:'Une variable d\'état extensive est :',opts:['Indépendante de la quantité de matière','Proportionnelle à la quantité de matière','Identique en tout point du système','Uniquement thermique'],ans:1,exp:'Une variable extensive (volume, masse, enthalpie...) est proportionnelle à la quantité de matière.'},
      {q:'La configuration électronique de ₂₀Ca est :',opts:['[Ar]4s¹','[Ar]3d²','[Ar]4s²','[Ne]4s²3d²'],ans:2,exp:'Ca (Z=20) : 1s²2s²2p⁶3s²3p⁶4s² = [Ar]4s².'},
      {q:'Une orbitale atomique est définie par combien de nombres quantiques ?',opts:['1','2','3','4'],ans:2,exp:'Une orbitale est définie par n (principal), l (secondaire) et m (magnétique).'},
    ]},
    {id:3,subjectId:3,title:'Chimie Organique',difficulty:'Avancé',questions:[
      {q:'Un stéréoisomère de configuration implique :',opts:['Même formule brute, même enchaînement, configurations différentes','Même formule brute, enchaînements différents','Formules brutes différentes','Même formule développée'],ans:0,exp:'Les stéréoisomères de configuration ont même formule brute et même enchaînement d\'atomes, mais des arrangements spatiaux différents.'},
      {q:'Dans une réaction SN1, on obtient :',opts:['Un seul énantiomère (inversion de Walden)','Un mélange racémique','Le produit de rétention','Aucun produit'],ans:1,exp:'SN1 passe par un carbocation plan (sp²), l\'attaque peut se faire des deux côtés → mélange racémique.'},
      {q:'La réaction de l\'isooctane avec X₂=Br₂ sous hν est une réaction de :',opts:['Addition électrophile','Substitution nucléophile','Substitution radicalaire','Élimination'],ans:2,exp:'La réaction d\'un alcane avec un halogène sous irradiation lumineuse est une substitution radicalaire.'},
      {q:'L\'ozonolise réductrice d\'un hydrocarbure C₆H₁₂ donne du propanal. L\'hydrocarbure est :',opts:['Un alcane','Un alcyne','Un alcène symétrique C3=C3','Un cycloalcane'],ans:2,exp:'L\'ozonolise coupe la double liaison. Deux propanal (C₃) → l\'alcène est hex-3-ène CH₃CH₂CH=CHCH₂CH₃.'},
      {q:'Les solvants polaires aprotiques parmi {cyclohexane, DMSO, DCM, eau, aniline} sont :',opts:['Cyclohexane et aniline','DMSO et DCM','Eau et DMSO','Cyclohexane et DCM'],ans:1,exp:'DMSO et DCM sont polaires (liaisons polarisées) mais aprotiques (pas de H lié à O ou N électronégatif).'},
      {q:'Le nombre d\'insaturation NI de C₃₂H₃₀N₂Cl₂ est :',opts:['17','18','19','16'],ans:1,exp:'NI = (2×32 + 2 - 30 + 2 - 2)/2 = 36/2 = 18.'},
      {q:'La molécule D-(-)-érythrose est :',opts:['L et lévogyre','D et lévogyre','L et dextrogyre','D et dextrogyre'],ans:1,exp:'D indique la configuration relative (Fischer). (-) indique lévogyre (rotation optique mesurée).'},
      {q:'Pour classer les acides Y-CH₂-COOH par pKa, l\'acide le plus fort a le pKa :',opts:['4,76','2,90','2,59','1,68'],ans:3,exp:'Plus le pKa est faible, plus l\'acide est fort. pKa=1,68 correspond à Y=NO₂ (effet attracteur fort).'},
      {q:'La capsaïcine possède un stéréoisomère de :',opts:['Configuration Z/E','Configuration R/S','Conformation','Tautomère'],ans:1,exp:'La capsaïcine possède un carbone asymétrique (chirale), donc des stéréoisomères R/S.'},
      {q:'Les formes mésomères de l\'anisole montrent des charges sur :',opts:['Uniquement l\'oxygène','L\'oxygène et le cycle','Uniquement le méthyle','Aucune délocalisation'],ans:1,exp:'Le doublet non liant de l\'oxygène se délocalise dans le cycle, créant des charges en ortho et para.'},
    ]},
    {id:4,subjectId:4,title:'Chimie des Terres Rares',difficulty:'Intermédiaire',questions:[
      {q:'Les terres rares comprennent combien d\'éléments au total ?',opts:['15','17','21','14'],ans:1,exp:'Les terres rares = 15 lanthanides + Scandium (Sc) + Yttrium (Y) = 17 éléments.'},
      {q:'LaNi₅ absorbe l\'hydrogène pour former :',opts:['LaNi₅H₄','LaNi₅H₆','LaNi₅H₂','LaNi₅H₈'],ans:1,exp:'La réaction est LaNi₅ + 3H₂ → LaNi₅H₆.'},
      {q:'Les propriétés particulières des terres rares dans les technologies du 21ème siècle sont leurs propriétés :',opts:['Mécaniques','Électromagnétiques','Thermiques','Radioactives'],ans:1,exp:'Les terres rares ont des propriétés électromagnétiques dues à leurs électrons 4f non appariés.'},
      {q:'Ce, Pr, Tb — le degré d\'oxydation commun à tous est :',opts:['+1','+2','+3','+4'],ans:2,exp:'Le degré d\'oxydation +3 est le plus stable et commun à toutes les terres rares.'},
      {q:'Plus de 97% de la production mondiale de terres rares est détenue par :',opts:['Les USA','La Russie','La Chine','L\'Australie'],ans:2,exp:'La Chine détient la quasi-totalité de la production mondiale de terres rares.'},
      {q:'Parmi Argile, Kr, Nd, Pt, Hg, Xe, Gd — lesquels sont stratégiques ?',opts:['Kr et Xe','Nd, Pt et Gd','Argile et Hg','Tous'],ans:1,exp:'Nd (néodyme), Pt (platine) et Gd (gadolinium) sont des métaux critiques pour les technologies vertes.'},
      {q:'La structure électronique simplifiée de ₅₈Ce est :',opts:['[Xe]4f²','[Xe]4f¹5d¹','[Xe]5d²','[Kr]4f²5d¹'],ans:1,exp:'Ce (Z=58) a la configuration [Xe]4f¹5d¹6s².'},
      {q:'La technologie utilisant les terres rares pour améliorer les cellules PV est :',opts:['La supraconductivité','Le down/up-conversion luminescent','La magnétostriction','La catalyse hétérogène'],ans:1,exp:'Er, Yb permettent la conversion de photons pour mieux utiliser le spectre solaire dans les PV.'},
      {q:'La propriété des terres rares contribuant à réduire les gaz à effet de serre est :',opts:['Leur forte densité','Leur capacité catalytique','Leur radioactivité','Leur résistance à la corrosion'],ans:1,exp:'Les terres rares (Ce, La) sont utilisées comme catalyseurs pour réduire les émissions dans les pots catalytiques.'},
      {q:'La branche étudiant les spectres lumineux et leurs applications industrielles est :',opts:['La cristallographie','La spectroscopie','La thermodynamique','La mécanique quantique'],ans:1,exp:'La spectroscopie étudie l\'interaction entre la matière et le rayonnement électromagnétique.'},
    ]},
    {id:5,subjectId:5,title:'Thermochimie & Équilibres',difficulty:'Intermédiaire',questions:[
      {q:'H₂SO₄ à 49% en masse, ρ=1,385 kg/L. La masse de soluté dans 500 mL est :',opts:['339,3 g','692,5 g','245 g','480 g'],ans:0,exp:'masse solution = 1,385×500 = 692,5 g. Masse soluté = 692,5×0,49 = 339,3 g.'},
      {q:'La combustion de 200 L de CH₄ (CNT), ΔH°=-891 kJ/mol dégage :',opts:['~7 946 kJ','8 910 kJ','178,2 kJ','445,5 kJ'],ans:0,exp:'n(CH₄) = 200/22,4 = 8,93 mol. Q = 8,93×891 ≈ 7 954 kJ.'},
      {q:'L\'oxydation est une :',opts:['Prise d\'électrons','Perte d\'électrons','Prise de protons','Perte de protons'],ans:1,exp:'Oxydation = perte d\'électrons (OIL : Oxidation Is Loss).'},
      {q:'Un réducteur est une espèce susceptible de :',opts:['Gagner des électrons','Céder des électrons','Gagner des protons','Céder des protons'],ans:1,exp:'Un réducteur cède des électrons (il s\'oxyde).'},
      {q:'La molarité d\'H₂SO₄ (M=98) à 49% en masse, ρ=1,385 kg/L est :',opts:['3,46 mol/L','6,93 mol/L','4,9 mol/L','9,8 mol/L'],ans:1,exp:'C = (1385×0,49)/98 ≈ 6,93 mol/L.'},
      {q:'Dans V = k[A]^α[B]^β, k dépend de :',opts:['Des concentrations','De la température','Des deux','De rien'],ans:1,exp:'k est la constante de vitesse. Elle dépend de la température (loi d\'Arrhenius) mais pas des concentrations.'},
      {q:'À un acide fort est conjuguée :',opts:['Une base forte','Une base faible','Un acide faible','Un amphotère'],ans:1,exp:'Plus un acide est fort, plus sa base conjuguée est faible (ex: Cl⁻ conjuguée de HCl).'},
      {q:'L\'enthalpie est une fonction d\'état car :',opts:['Elle dépend du chemin suivi','Elle dépend uniquement des états initial et final','Elle est toujours positive','Elle est mesurable directement'],ans:1,exp:'Une fonction d\'état ne dépend que des états initial et final, indépendamment du chemin.'},
      {q:'La pile Daniell a comme anode :',opts:['Du cuivre','Du zinc','De l\'argent','Du fer'],ans:1,exp:'Dans la pile Daniell, le zinc est l\'anode (s\'oxyde : Zn→Zn²⁺+2e⁻) et le cuivre est la cathode.'},
      {q:'Une variable d\'état extensive est proportionnelle à :',opts:['La température','La pression','La quantité de matière','Le volume molaire'],ans:2,exp:'Une variable extensive (V, m, H, G...) est proportionnelle à la quantité de matière du système.'},
    ]},
    {id:6,subjectId:6,title:'Mécanique du Point',difficulty:'Intermédiaire',questions:[
      {q:'Une automobile accélère de 0 à 30 m/s en 10 s à accélération constante. Son accélération est :',opts:['3 m/s²','30 m/s²','300 m/s²','0,3 m/s²'],ans:0,exp:'a = Δv/Δt = (30-0)/10 = 3 m/s².'},
      {q:'La distance parcourue pendant l\'accélération de 0 à 30 m/s (a=3 m/s²) est :',opts:['300 m','150 m','450 m','100 m'],ans:1,exp:'v² = v₀²+2aΔx → 900 = 6Δx → Δx = 150 m.'},
      {q:'En coordonnées cylindriques, la vitesse d\'un point M est :',opts:['v = ṙeᵣ+rθ̇eθ+żeᵤ','v = ṙeᵣ+θ̇eθ+żeᵤ','v = reᵣ+rθeθ+zeᵤ','v = ṙeᵣ+ṙθ̇eθ'],ans:0,exp:'En cylindriques (r,θ,z) : v = ṙeᵣ + rθ̇eθ + żeᵤ.'},
      {q:'Pour un pendule en petites oscillations, la période est :',opts:['T=2π√(g/l)','T=2π√(l/g)','T=π√(l/g)','T=2√(l/g)'],ans:1,exp:'L\'équation φ̈+(g/l)φ=0 donne ω²=g/l → T=2π/ω=2π√(l/g).'},
      {q:'Un point M se déplace avec r=2acosθ et θ=ωt. La trajectoire est :',opts:['Une parabole','Un cercle','Une ellipse','Une droite'],ans:1,exp:'r=2acos(θ) est l\'équation polaire d\'un cercle de diamètre 2a.'},
      {q:'La seconde formule de Binet donne l\'accélération radiale :',opts:['aᵣ=-C²u²(u+d²u/dθ²)','aᵣ=C²u²(u+d²u/dθ²)','aᵣ=-C²(u+d²u/dθ²)','aᵣ=rθ̈'],ans:0,exp:'aᵣ = -C²u²(u + d²u/dθ²) avec u=1/r et C=r²θ̇=cte.'},
      {q:'Le PFD (2ème loi de Newton) s\'écrit :',opts:['ΣF=0','ΣF=ma','ΣF=mv','ΣF=m/a'],ans:1,exp:'La résultante des forces = masse × accélération. ΣF⃗ = ma⃗.'},
      {q:'En MCU, l\'accélération est :',opts:['Tangentielle uniquement','Nulle','Centripète (vers le centre)','Centrifuge (vers l\'extérieur)'],ans:2,exp:'En MCU, v=cte en module → acceleration tangentielle=0. L\'accélération est centripète : a=v²/R.'},
      {q:'La loi des aires pour une force centrale affirme que :',opts:['La vitesse est constante','r²θ̇=constante','rθ̇=constante','r²θ=constante'],ans:1,exp:'Pour une force centrale, le moment cinétique est conservé : C=r²θ̇=constante.'},
      {q:'La distance parcourue quand la vitesse passe de 10 à 20 m/s (a=3 m/s²) est :',opts:['50 m','100 m','150 m','25 m'],ans:0,exp:'v²-v₀²=2aΔx → 400-100=6Δx → Δx=300/6=50 m.'},
    ]},
    {id:7,subjectId:7,title:'Électrocinétique',difficulty:'Avancé',questions:[
      {q:'Le théorème de Thévenin : tout réseau linéaire vu de deux bornes peut être remplacé par :',opts:['Une résistance seule','Un générateur de courant parfait','Un générateur E_th en série avec R_th','Un condensateur'],ans:2,exp:'Thévenin : générateur de f.e.m. E_th (tension à vide) en série avec R_th (résistance équivalente).'},
      {q:'Pour le circuit RC série soumis à e(t)=E₀, l\'équation différentielle est :',opts:['RC(du/dt)+u=0','RC(du/dt)+u=E₀','R(du/dt)+u/C=E₀','L(di/dt)+Ri=E₀'],ans:1,exp:'Loi des mailles : e(t)=RC(du/dt)+u → RC(du/dt)+u=E₀.'},
      {q:'La capacité équivalente de C₁ et C₂ en série est :',opts:['C₁+C₂','C₁C₂/(C₁+C₂)','(C₁+C₂)/(C₁C₂)','C₁+C₂+2√(C₁C₂)'],ans:1,exp:'En série : 1/Ceq=1/C₁+1/C₂, soit Ceq=C₁C₂/(C₁+C₂).'},
      {q:'L\'énergie stockée dans un condensateur C chargé à U est :',opts:['CU','CU²','CU²/2','C²U/2'],ans:2,exp:'E_condensateur = QU/2 = CU²/2.'},
      {q:'La fonction de transfert d\'un filtre RC passe-bas est :',opts:['H(jω)=jωRC/(1+jωRC)','H(jω)=1/(1+jωRC)','H(jω)=1+jωRC','H(jω)=RC/(1+RC)'],ans:1,exp:'H = Z_C/(R+Z_C) = 1/(1+jRCω).'},
      {q:'La résonance dans un circuit RLC série se produit quand :',opts:['R=L/C','ω=1/√(LC)','ω=RC','ω²LC=R'],ans:1,exp:'À la résonance, ZL=ZC → Lω=1/(Cω) → ω₀=1/√(LC).'},
      {q:'Pour calculer R_th (Thévenin), on :',opts:['Mesure la tension à vide','Court-circuite les sources de tension et ouvre les sources de courant','Ajoute toutes les résistances','Divise E_th par le courant max'],ans:1,exp:'On éteint les sources indépendantes puis on calcule R vue des bornes.'},
      {q:'L\'inductance équivalente de 3 bobines L identiques en série est :',opts:['L/3','3L','L','√3×L'],ans:1,exp:'En série : L_eq = L₁+L₂+L₃ = 3L.'},
      {q:'u(t)=25cos(250t)mV, i(t)=14sin(250t)mA. La valeur de L est :',opts:['L≈7,1 mH','L≈14,3 mH','L≈3,6 mH','L≈25 mH'],ans:0,exp:'Z_L=U/I=25/14≈1,786 Ω. Z_L=Lω → L=1,786/250≈7,1 mH.'},
      {q:'La capacité C_eq du circuit : C₁=10μF, C₂=22μF, C₃=10μF, C₄=22μF, C₅=10μF, C₆=8μF :', opts:['≈ 3,6 μF','≈ 82 μF','≈ 44 μF','≈ 10 μF'],ans:0,exp:'Il faut appliquer les formules série/parallèle successivement selon le schéma. Le résultat est environ 3,6 μF.'},
    ]},
    {id:8,subjectId:8,title:'Électromagnétisme',difficulty:'Avancé',questions:[
      {q:'Le potentiel créé par un dipôle électrostatique en un point M distant r est :',opts:['V_M=qd/(4πε₀r²)','V_M=p·cosθ/(4πε₀r²)','V_M=p/(4πε₀r)','V_M=qd·cosθ/(4πε₀r)'],ans:1,exp:'V_M = p·cosθ/(4πε₀r²) où p=qd est le moment dipolaire.'},
      {q:'Le champ magnétique à l\'intérieur d\'un solénoïde parcouru par i(t)=I₀cos(ωt) est :',opts:['B=μ₀nI₀cos(ωt)','B=μ₀I₀cos(ωt)','B=nI₀cos(ωt)','B=μ₀nI₀sin(ωt)'],ans:0,exp:'B = μ₀ni. Ici B(t) = μ₀nI₀cos(ωt).'},
      {q:'Un dipôle électrostatique dans un champ uniforme E⃗ possède :',opts:['Une seule position d\'équilibre','Deux positions d\'équilibre','Aucune position d\'équilibre','Trois positions d\'équilibre'],ans:1,exp:'Le dipôle a deux positions d\'équilibre : p⃗ parallèle à E⃗ (stable) et antiparallèle (instable).'},
      {q:'Le théorème de Green-Ostrogradski relie :',opts:['La circulation à son rotationnel','Le flux d\'un champ à sa divergence','Le gradient à la divergence','Le rotationnel au gradient'],ans:1,exp:'∯S F⃗·dS⃗ = ∭V div(F⃗)dV. Il relie flux et divergence.'},
      {q:'L\'énergie potentielle d\'un dipôle p⃗ dans un champ E⃗ est :',opts:['E_p=p·E·sinθ','E_p=-p⃗·E⃗=-pEcosθ','E_p=p·E·cosθ','E_p=p²E'],ans:1,exp:'E_p = -p⃗·E⃗ = -pEcosθ. Minimale (stable) quand θ=0 (alignement).'},
      {q:'Un champ F⃗ est conservatif si et seulement si :',opts:['div(F⃗)=0','rot(F⃗)=0⃗','∇F=0','F⃗=constante'],ans:1,exp:'F⃗ est conservatif ⟺ rot(F⃗)=0⃗. Il existe alors φ tel que F⃗=grad(φ).'},
      {q:'La puissance volumique Joule dans un conducteur de conductivité γ et densité j⃗ est :',opts:['p=j²/γ','p=j²γ','p=j·γ','p=γ/j²'],ans:0,exp:'p = j⃗·E⃗ = j²/γ (car E⃗=j⃗/γ selon la loi d\'Ohm locale).'},
      {q:'Le moment résultant exercé sur un dipôle p⃗ dans E⃗ est :',opts:['M⃗=p⃗×E⃗','M⃗=p⃗·E⃗','M⃗=E⃗×p⃗','M⃗=p⃗/E'],ans:0,exp:'Le couple : M⃗ = p⃗×E⃗. Son module est M=pEsinθ.'},
      {q:'Pour le cylindre chargé (σ>0) d\'axe (z\'z), le champ à l\'extérieur (r>R) est :',opts:['Nul','Uniforme','En 1/r radial','En 1/r² radial'],ans:2,exp:'Par Gauss, pour r>R : E=σR/(ε₀r) en coordonnées cylindriques (∝1/r).'},
      {q:'Dans l\'approximation dipolaire (a≪r), le potentiel devient :',opts:['V_M≈qd/(4πε₀r²)','V_M≈p·cosθ/(4πε₀r²)','V_M≈p/(4πε₀r³)','V_M≈0'],ans:1,exp:'Pour a≪r, on garde le premier terme non nul : V_M=p·cosθ/(4πε₀r²).'},
    ]},
    {id:9,subjectId:9,title:'Optique Géométrique',difficulty:'Intermédiaire',questions:[
      {q:'La relation de conjugaison d\'un miroir sphérique est :',opts:['1/SA\'-1/SA=2/SC','1/SA\'+1/SA=2/R','1/SA\'-1/SA=2/R','SA\'×SA=R²/4'],ans:2,exp:'1/SA\'-1/SA=2/R=1/f\' (R=SC le rayon algébrique).'},
      {q:'Les lois de Descartes pour la réfraction donnent :',opts:['n₁sinθ₁=n₂sinθ₂','n₁cosθ₁=n₂cosθ₂','n₁θ₁=n₂θ₂','sinθ₁/sinθ₂=n₁/n₂'],ans:0,exp:'La loi de Snell-Descartes : n₁·sinθ₁ = n₂·sinθ₂.'},
      {q:'La distance focale image f\'₂ d\'un dioptre sphérique R=3cm, n₁=1, n₂=1,5 est :',opts:['9 cm','6 cm','3 cm','12 cm'],ans:0,exp:'f\'₂ = n₂R/(n₂-n₁) = 1,5×3/0,5 = 9 cm.'},
      {q:'Un système formé de deux lentilles est afocal si :',opts:['Sa distance focale est infinie','O₁O₂=f\'₁+f\'₂','Les deux foyers coïncident','La vergence est nulle'],ans:1,exp:'Système afocal ⟺ O₁O₂=f\'₁+f\'₂.'},
      {q:'Le grandissement transversal γ d\'un miroir sphérique est :',opts:['γ=SA/SA\'','γ=SA\'/SA','γ=-SA\'/SA','γ=f/SA'],ans:2,exp:'γ = A\'B\'/AB = -SA\'/SA (le signe - vient de la convention des miroirs).'},
      {q:'Un rayon lumineux dans l\'air frappe un liquide (α=56° avec l\'horizontale, déviation θ=13,5°). L\'angle d\'incidence est :',opts:['56°','34°','13,5°','42,5°'],ans:1,exp:'L\'angle d\'incidence = 90°-56° = 34° (mesuré par rapport à la normale).'},
      {q:'La vergence δ d\'un dioptre sphérique séparant n₁ et n₂ de rayon R est :',opts:['δ=(n₂-n₁)/R','δ=n₂/R','δ=(n₁-n₂)/R','δ=n₁n₂/R'],ans:0,exp:'δ = (n₂-n₁)/R en dioptries.'},
      {q:'La méthode de Huygens pour construire le rayon réfracté consiste à :',opts:['Tracer le rayon symétrique','Construire des ondelettes secondaires et leur enveloppe','Utiliser la loi des cosinus','Inverser le vecteur vitesse'],ans:1,exp:'Huygens : chaque point du front d\'onde est source d\'ondelettes secondaires. Leur enveloppe donne le nouveau front.'},
      {q:'Pour un miroir concave SC=-1m, l\'image d\'un objet sur un écran à 5m est :',opts:['Virtuelle droite','Réelle renversée','Virtuelle renversée','Réelle droite'],ans:1,exp:'f=R/2=-0,5m. SA\'=5m (écran) → image réelle. Grandissement négatif → image renversée.'},
      {q:'Le déplacement Δᵣ des deux rayons réfléchis d\'une lame de verre (e, n) pour angle i est :',opts:['e/cosθ','2e·sinθ/cosθ','2e·sin(i-θ)/cosθ','2e·sin(i)'],ans:2,exp:'Δᵣ = 2e·sin(i-θ)/cosθ (formule exacte de déplacement dans une lame à faces parallèles).'},
    ]},
    {id:10,subjectId:10,title:'Statistiques',difficulty:'Intermédiaire',questions:[
      {q:'Le coefficient de corrélation r² entre x et y est :',opts:['[cov(x,y)]²/(V(x)V(y))','cov(x,y)/(σ(x)σ(y))','[cov(x,y)]²/[σ(x)σ(y)]²','cov(x,y)²'],ans:0,exp:'r²=[cov(x,y)]²/(V(x)·V(y)).'},
      {q:'Pour x̄=5,5, ȳ=18,75, cov(x,y)=17,9, V(x)=9, l\'équation de la droite y en x est :',opts:['y≈-1,6x+0,4','y≈1,99x+7,8','y≈0,39x-1,81','y≈0,4x-1,6'],ans:1,exp:'b=cov/V(x)=17,9/9≈1,99. a=ȳ-b·x̄=18,75-1,99×5,5≈7,8.'},
      {q:'Pour la série [0;2[→14, [2;4[→16, [4;6[→25, [6;8[→15, la médiane est dans :',opts:['[2;4[','[4;6[','[6;8[','[0;2['],ans:1,exp:'N=100. Effectifs cumulés: 14, 30, 55. La 50ème valeur est dans [4;6[.'},
      {q:'L\'erreur relative sur R=U/I est :',opts:['ΔR=ΔU+ΔI','ΔR/R=ΔU/U+ΔI/I','ΔR=√(ΔU²+ΔI²)','ΔR=ΔU×ΔI'],ans:1,exp:'Pour un quotient : ΔR/R=ΔU/U+ΔI/I.'},
      {q:'La valeur estimée R_cal par régression linéaire forcée à l\'origine est :',opts:['U₁/I₁','Moyenne de U_i/I_i','Σ(U_i×I_i)/Σ(I_i²)','ΣU_i/ΣI_i'],ans:2,exp:'Méthode des moindres carrés (U=RI) : R_estimé=Σ(U_i×I_i)/Σ(I_i²).'},
      {q:'Entre D₁ et D₉ (1er et 9ème décile), il y a :',opts:['50% des données','80% des données','90% des données','10% des données'],ans:1,exp:'D₁ coupe les 10% inférieurs, D₉ les 10% supérieurs → entre D₁ et D₉ = 80% des données.'},
      {q:'Le mode M₀ d\'une série groupée en intervalles est :',opts:['La valeur centrale de l\'intervalle le plus fréquent','La moyenne des valeurs extrêmes','La valeur médiane','L\'intervalle le moins fréquent'],ans:0,exp:'Pour des données groupées, le mode est la valeur centrale de la classe modale.'},
      {q:'Si r=0,98, cela indique :',opts:['Pas de corrélation','Corrélation négative forte','Corrélation positive très forte','Données non liées'],ans:2,exp:'r∈[-1,1]. r=0,98≈1 indique une corrélation linéaire positive très forte.'},
      {q:'L\'écart-type σ(X) est la racine carrée de :',opts:['La moyenne','La variance','L\'étendue','La médiane'],ans:1,exp:'σ(X) = √V(X) où V(X) = Σf_i(x_i-x̄)²/N.'},
      {q:'Pour estimer ŷ pour x=24 sur la droite y=a+bx :',opts:['Directement ȳ','ŷ=a+b×24','La valeur de σ','Le coefficient r'],ans:1,exp:'On substitue x=24 dans la droite de régression y=a+bx pour obtenir l\'estimation ŷ.'},
    ]},
    {id:11,subjectId:11,title:'Normes & Mesures',difficulty:'Intermédiaire',questions:[
      {q:'L\'incertitude absolue sur D₂-D₁ avec D₁=(19,5±0,1)mm, D₂=(26,7±0,1)mm est :',opts:['±0,1 mm','±0,2 mm','±0,01 mm','±0,3 mm'],ans:1,exp:'Δ(D₂-D₁) = ΔD₁+ΔD₂ = 0,1+0,1 = 0,2 mm.'},
      {q:'L\'erreur relative de R₁=(1200,0±0,5)Ω est :',opts:['0,5%','0,042%','0,5 Ω','4,2%'],ans:1,exp:'ΔR₁/R₁ = 0,5/1200 = 4,17×10⁻⁴ ≈ 0,042%.'},
      {q:'La divergence de V⃗ = -yi⃗ + (x+1)j⃗ + zk⃗ est :',opts:['-1','0','1','2'],ans:2,exp:'div(V⃗) = ∂(-y)/∂x + ∂(x+1)/∂y + ∂z/∂z = 0+0+1 = 1.'},
      {q:'Le rotationnel de V⃗ = -yi⃗ + (x+1)j⃗ + zk⃗ est :',opts:['rot=i⃗','rot=2j⃗','rot=2k⃗','rot=0'],ans:2,exp:'rot(V⃗)_z = ∂(x+1)/∂x - ∂(-y)/∂y = 1-(-1) = 2 → rot = 2k⃗.'},
      {q:'Le gradient en coordonnées cylindriques (ρ,φ,z) est :',opts:['grad(f)=∂f/∂ρ·eᵨ+(1/ρ)∂f/∂φ·eφ+∂f/∂z·ez','grad(f)=∂f/∂ρ·eᵨ+∂f/∂φ·eφ','grad(f)=(1/ρ)∂f/∂ρ·eᵨ+∂f/∂φ·eφ','grad(f)=∂²f/∂ρ²·eᵨ'],ans:0,exp:'En cylindriques : grad(f) = ∂f/∂ρ·eᵨ + (1/ρ)∂f/∂φ·eφ + ∂f/∂z·ez.'},
      {q:'Un champ F⃗ est conservatif si et seulement si :',opts:['div(F⃗)=0','rot(F⃗)=0⃗','∇F=0','F⃗=constante'],ans:1,exp:'F⃗ est conservatif ⟺ rot(F⃗)=0⃗. Il existe alors φ tel que F⃗=grad(φ).'},
      {q:'Le Laplacien en coordonnées sphériques est :',opts:['Δf=∂²f/∂r²','Δf=(1/r²)∂(r²∂f/∂r)/∂r + termes angulaires','Δf=∂²f/∂r²+∂²f/∂θ²','Δf=(1/r)∂f/∂r'],ans:1,exp:'Δf=(1/r²)∂(r²∂f/∂r)/∂r + (1/r²sinθ)∂(sinθ·∂f/∂θ)/∂θ + (1/r²sin²θ)∂²f/∂φ².'},
      {q:'Le passage cartésien→cylindrique donne :',opts:['x=ρcosφ, y=ρsinφ, z=z','x=ρsinφ, y=ρcosφ, z=z','x=ρcosθsinφ, y=ρsinθsinφ, z=ρcosφ','x=rcosθ, y=rsinθ, z=r'],ans:0,exp:'En cylindriques : x=ρcosφ, y=ρsinφ, z=z.'},
      {q:'Pour F⃗=(3x²+6xy²)i⃗+(6x²y+4y³)j⃗, le potentiel U tel que F⃗=grad(U) est :',opts:['U=x³+3x²y²+y⁴','U=3x²+6xy²','U=x³y+3y³','U=6xy'],ans:0,exp:'∂U/∂x=3x²+6xy² → U=x³+3x²y²+g(y). g\'(y)=4y³ → g(y)=y⁴.'},
      {q:'Pour A⃗=(3x²+6y)i⃗-14yzj⃗+20xz²k⃗, la circulation entre O et M(1,1,1) :',opts:['Dépend du chemin','Est nulle','Est identique quel que soit le chemin','Vaut toujours 1'],ans:0,exp:'Si rot(A⃗)≠0, A⃗ n\'est pas conservatif et la circulation dépend du chemin.'},
    ]},
    {id:12,subjectId:12,title:'Sécurité & Environnement',difficulty:'Débutant',questions:[
      {q:'Parmi ces règles de sécurité en laboratoire, laquelle est INCORRECTE ?',opts:['Porter des lunettes de protection','Fumer est autorisé si le local est ventilé','Ne jamais pipeter à la bouche','Connaître les sorties de secours'],ans:1,exp:'Il est strictement interdit de fumer dans un laboratoire (risques d\'explosion et contamination).'},
      {q:'Cl₂ (42×10⁻⁴ mol/L) dans 500mL d\'eau. Dans 20m³ non ventilé (Vm=24L/mol), la teneur est :',opts:['2,52×10⁻⁶ mol/L','1,26×10⁻⁴ mol/L','2,52×10⁻⁴ mol/L','5,04×10⁻⁶ mol/L'],ans:0,exp:'n(Cl₂)=2,1×10⁻³ mol. V_gaz=0,0504L. Teneur=0,0504/(20×10³)=2,52×10⁻⁶ mol/L.'},
      {q:'Sans prise de terre, quand on touche une carcasse défectueuse :',opts:['Rien','Un courant traverse le corps vers le sol','Le disjoncteur se déclenche','La tension est nulle'],ans:1,exp:'Sans prise de terre, le corps humain constitue le chemin de retour → risque d\'électrocution.'},
      {q:'Le rôle du disjoncteur différentiel est de :',opts:['Mesurer la tension','Protéger contre les surcharges uniquement','Détecter les courants de fuite et couper','Réguler la fréquence'],ans:2,exp:'Le DD détecte la différence aller/retour (courant de fuite). Si Δi>30mA, il coupe.'},
      {q:'La prise de terre permet de :',opts:['Augmenter la tension','Dévier les courants de défaut vers la terre','Couper l\'alimentation','Mesurer l\'impédance'],ans:1,exp:'La prise de terre offre un chemin de faible résistance pour les courants de fuite, protégeant les personnes.'},
      {q:'L\'habilitation électrique est :',opts:['Un diplôme universitaire','Une attestation de capacité à travailler sur installations électriques','Une autorisation de construire','Un outil de mesure'],ans:1,exp:'L\'habilitation électrique est une attestation délivrée par l\'employeur reconnaissant l\'aptitude à effectuer des travaux électriques.'},
      {q:'En cas d\'accident électrique, que faire EN PREMIER ?',opts:['Toucher la victime pour la dégager','Couper l\'alimentation électrique avant toute intervention','Appeler les secours sans rien faire','Verser de l\'eau'],ans:1,exp:'PRIORITÉ : couper l\'alimentation avant de toucher la victime. Toucher une victime sous tension peut électrocuter le secouriste.'},
      {q:'Pour faire des économies d\'énergie dans l\'habitat, on peut :',opts:['Laisser les appareils en veille','Améliorer l\'isolation thermique','Augmenter la puissance des ampoules','Ouvrir les fenêtres en hiver'],ans:1,exp:'L\'isolation thermique réduit les besoins en chauffage/climatisation, principal poste de consommation.'},
      {q:'Le courant de fuite est :',opts:['Le courant normal du circuit','La différence entre courant aller et retour','Le courant dans le neutre','Le courant de court-circuit'],ans:1,exp:'Le courant de fuite = différence entre I_aller et I_retour. En cas de défaut d\'isolement, ce courant passe par la terre ou le corps.'},
      {q:'Pour économiser l\'énergie dans le transport, on peut :',opts:['Augmenter la vitesse','Favoriser le covoiturage et transports en commun','Éviter les énergies renouvelables','Construire plus de routes'],ans:1,exp:'Le covoiturage et les transports en commun réduisent le nombre de véhicules, diminuant la consommation d\'énergie.'},
    ]},
    {id:13,subjectId:13,title:'TEEO',difficulty:'Débutant',questions:[
      {q:'La lettre administrative à forme personnelle est celle qu\'un :',opts:['Ministre adresse à un président d\'ONG','Recteur adresse à un préfet','Ministre du Bénin adresse à celui du Cameroun','Subordonné adresse à son supérieur'],ans:0,exp:'La forme personnelle s\'utilise entre personnes de rang très différent. Ex: Ministre→Président ONG.'},
      {q:'Dans une lettre administrative, la référence est :',opts:['Facultative','Obligatoire','Interdite','Optionnelle'],ans:1,exp:'Dans toute lettre administrative, la référence est OBLIGATOIRE.'},
      {q:'Dans le style administratif, le supérieur hiérarchique :',opts:['Demande à son subordonné','Informe le subordonné','Sollicite l\'avis du subordonné','Consulte le subordonné'],ans:1,exp:'Le supérieur INFORME/INSTRUIT. Le subordonné DEMANDE/SOLLICITE. C\'est le sens descendant de l\'information.'},
      {q:'La formule «vouloir bien» s\'emploie :',opts:['Du subordonné vers le supérieur','Du supérieur vers le subordonné','Entre pairs','Dans les lettres privées uniquement'],ans:1,exp:'«Je vous serais obligé de vouloir bien...» est utilisée par le supérieur envers le subordonné.'},
      {q:'Les discussions WhatsApp entre deux individus sont une communication :',opts:['De masse','Interpersonnelle','De groupe','Institutionnelle'],ans:1,exp:'Communication interpersonnelle = échange direct entre deux personnes.'},
      {q:'Dans «Les voitures que papa a dessinées», le participe s\'accorde car :',opts:['Le nom est pluriel','Le COD \'que\' (=voitures) est placé avant avoir','Le sujet est féminin','Il n\'y a pas d\'accord'],ans:1,exp:'Le PP avec avoir s\'accorde avec le COD si celui-ci est placé AVANT le verbe. \'que\'=voitures → dessinéES.'},
      {q:'Le journal télévisé est une communication :',opts:['Interpersonnelle','De groupe','De masse','Administrative'],ans:2,exp:'Le JT diffuse un message identique à un très large public → communication de MASSE.'},
      {q:'Le code dans la communication est :',opts:['Le message lui-même','L\'ensemble des règles guidant la production du message','Le canal de transmission','Le bruit'],ans:1,exp:'Le code = règles partagées permettant d\'encoder et décoder le message (ex: la langue française).'},
      {q:'La communication de groupe s\'assimile à la communication de masse car :',opts:['Elles sont verbales','Elles supposent une interaction entre interlocuteurs différents','Elles utilisent les mêmes médias','Elles sont formelles'],ans:1,exp:'Les deux impliquent plusieurs interlocuteurs différents qui échangent ou reçoivent un message.'},
      {q:'La lettre de motivation doit contenir obligatoirement :',opts:['Uniquement les diplômes','L\'objet, les motivations et les compétences en lien avec le poste','La liste de tous les emplois','Uniquement les coordonnées'],ans:1,exp:'Une lettre de motivation comprend : accroche, présentation adaptée, motivations spécifiques, compétences pertinentes, formule de politesse.'},
    ]},
    {id:14,subjectId:14,title:'Informatique & Programmation',difficulty:'Débutant',questions:[
      {q:'Quelle est la sortie de print(3 * "ab") en Python ?',opts:['"ababab"','"3ab"','"ab3"','Erreur'],ans:0,exp:'En Python, l\'opérateur * avec une chaîne répète la chaîne. 3*"ab" = "ababab".'},
      {q:'Que renvoie len([1, [2, 3]]) ?',opts:['3','2','4','Erreur'],ans:1,exp:'La liste contient 2 éléments de premier niveau : 1 et [2,3]. len()=2.'},
      {q:'Quelle méthode ajoute un élément à la fin d\'une liste ?',opts:['list.insert()','list.add()','list.append()','list.push()'],ans:2,exp:'list.append(x) ajoute x à la fin. insert(i,x) insère à la position i. add() n\'existe pas.'},
      {q:'for n in range(2, 6, 2): print(n) affiche :',opts:['2, 4, 6','2, 4','2, 3, 4, 5','6'],ans:1,exp:'range(2,6,2) génère 2, 4 (de 2 à 6 exclu, pas de 2).'},
      {q:'Comment vérifier si la clé "age" existe dans un dictionnaire d ?',opts:['d.has_key("age")','if "age" in d.keys()','if "age" in d','Les options B et C sont correctes'],ans:3,exp:'En Python 3, "age" in d et "age" in d.keys() fonctionnent tous les deux.'},
      {q:'Quelle est la valeur de bool("0") en Python ?',opts:['False','True','0','Erreur'],ans:1,exp:'Toute chaîne non vide est True. "0" est une chaîne non vide → bool("0")=True.'},
      {q:'Pour sortir d\'une boucle while en Python, on utilise :',opts:['exit()','break','stop','return'],ans:1,exp:'break interrompt immédiatement la boucle la plus proche.'},
      {q:'def f2(n): return 2*n-1. f1(a,b) retourne 3 si a<b sinon 4. print(f2(f1(5.3,3.4))) affiche :',opts:['5','7','3','9'],ans:1,exp:'f1(5.3,3.4): 5.3>3.4 → retourne 4. f2(4)=2×4-1=7.'},
      {q:'whyle True: print("ok") → l\'erreur est :',opts:['True doit être False','"ok" doit être entre parenthèses','whyle est mal orthographié (doit être while)','print n\'est pas une fonction'],ans:2,exp:'Le mot-clé Python est "while" (sans y). "whyle" → SyntaxError.'},
      {q:'liste_courses.clear() :',opts:['Supprime la liste définitivement','Vide la liste (elle reste mais est vide)','Copie la liste','Trie la liste'],ans:1,exp:'clear() supprime tous les éléments mais la liste existe toujours (devient []).'},
    ]},
    {id:15,subjectId:15,title:'Anglais Scientifique',difficulty:'Débutant',questions:[
      {q:'"Solar panel" en français est :',opts:['Panneau solaire','Capteur solaire','Cellule photovoltaïque','Miroir solaire'],ans:0,exp:'"Solar panel" = panneau solaire. Il peut être photovoltaïque (électricité) ou thermique (chaleur).'},
      {q:'"What does the sun give?" — The correct answer is :',opts:['Water','Wind','Energy / Light','Heat only'],ans:2,exp:'The sun gives energy, which can be captured by solar panels to produce electricity.'},
      {q:'"Wind turbines use ____ to make energy." — Le mot manquant est :',opts:['Sun','Wind','Water','Coal'],ans:1,exp:'A wind turbine uses wind to make energy. Les éoliennes convertissent l\'énergie cinétique du vent.'},
      {q:'"Energetic Self-sufficiency" en français signifie :',opts:['Efficacité énergétique','Autosuffisance énergétique','Économie d\'énergie','Gaspillage énergétique'],ans:1,exp:'"Self-sufficiency" = autosuffisance. Capacité à produire sa propre énergie.'},
      {q:'"Wind power" en français est :',opts:['Énergie solaire','Énergie hydraulique','Énergie éolienne','Énergie géothermique'],ans:2,exp:'"Wind power" = énergie éolienne (du vent). "Solar"=solaire, "Hydro"=hydraulique.'},
      {q:'"Is renewable energy clean?" — The correct answer is :',opts:['No, it pollutes','Yes, it has a minimal carbon footprint','It depends on the country','It is not sustainable'],ans:1,exp:'Renewable energy sources have a minimal carbon footprint (texte du cours).'},
      {q:'"Unlimited resources" en français signifie :',opts:['Ressources limitées','Ressources renouvelables','Ressources illimitées','Ressources naturelles'],ans:2,exp:'"Unlimited" = illimité. Différent de "renewable" (renouvelable).'},
      {q:'"Environment-friendly" en français est :',opts:['Environnement fragile','Respectueux de l\'environnement','Pollution environnementale','Dégradation environnementale'],ans:1,exp:'"Environment-friendly" = respectueux de l\'environnement, écologique.'},
      {q:'Five components of an electricity transmission network include :',opts:['Transformers, power lines, substations, switches, meters','Turbines, generators, water, coal, gas','Solar panels, batteries, wind turbines, dams, nuclear plants','Cables, light bulbs, sockets, switches, fuses'],ans:0,exp:'A transmission network: transformers, power lines (HT), substations, switches (disjoncteurs), meters (compteurs).'},
      {q:'How would you introduce yourself? The correct structure is :',opts:['My name is... I am a student in ERSE...','I called... student...','Am I... ERSE student...','Hello, I am friend...'],ans:0,exp:'Présentation correcte : "Hello! My name is [Name]. I am a student in [domain]. I am interested in renewable energy because [reason]."'},
    ]},
  ],
  students:[
    {id:1,name:'Kofi Mensah',initials:'KM',color:'#185FA5',level:2,passed:4,avgScore:87,certs:4,email:'kofi@erse.ac'},
    {id:2,name:'Amina Diallo',initials:'AD',color:'#0F6E56',level:3,passed:6,avgScore:91,certs:6,email:'amina@erse.ac'},
    {id:3,name:'Léa Gbossou',initials:'LG',color:'#993556',level:1,passed:2,avgScore:76,certs:2,email:'lea@erse.ac'},
    {id:4,name:'Yao Koffi',initials:'YK',color:'#854F0B',level:2,passed:3,avgScore:82,certs:3,email:'yao@erse.ac'},
    {id:5,name:'Nadia Souza',initials:'NS',color:'#534AB7',level:3,passed:7,avgScore:94,certs:7,email:'nadia@erse.ac'},
    {id:6,name:'Omar Bello',initials:'OB',color:'#185FA5',level:1,passed:1,avgScore:72,certs:1,email:'omar@erse.ac'},
    {id:7,name:'Fatou Sané',initials:'FS',color:'#3B6D11',level:2,passed:5,avgScore:88,certs:5,email:'fatou@erse.ac'},
    {id:8,name:'Jules Akpan',initials:'JA',color:'#993C1D',level:1,passed:2,avgScore:78,certs:2,email:'jules@erse.ac'},
  ],
  notifications:[
    {id:1,title:'Bienvenue sur ERSE ACADEMY !',sub:'Découvrez vos cours et passez vos premiers examens.',ic:'🎓',bg:'#b0d4f4',unread:true,time:'Maintenant'},
    {id:2,title:'Nouveau cours disponible',sub:'Cours 3 — Intégrales ajouté en Mathématiques L1.',ic:'📐',bg:'#c0dd97',unread:true,time:'Il y a 2h'},
    {id:3,title:'EnergyBot est prêt !',sub:'Configurez votre clé API pour accéder à l\'assistant IA.',ic:'⚡',bg:'#F0C96A',unread:false,time:'Il y a 1j'},
  ],
  certificates:[],
  shop:[],
  bannedEmails:[],
  nextId:300,
  COLORS:['#185FA5','#0F6E56','#993556','#854F0B','#534AB7','#3B6D11','#993C1D','#3C3489'],
};

/* ═══════════════════════════════════════════
   ÉTAT
═══════════════════════════════════════════ */
let currentUser=null;
let curExamId=null,curQ=0,score=0,answered=false,userAnswers=[];
let deferredPrompt=null;
let editSubjectId=null;
let lbFilter=0;
let darkMode=false;
let ebCtx={id:'general',icon:'🎓',name:'Toutes matières',desc:'Assistant général'};
let ebHistory=[];
let ebTyping=false;
const GROQ_PROXY_URL='https://groq-proxy.erse-academy.workers.dev';
const GITHUB_RAW='https://raw.githubusercontent.com/lekoyoanicet31-cmyk/erse-academy/main/cours/';
function downloadPdf(driveId,name){
  const url='https://drive.google.com/uc?export=download&id='+driveId;
  window.open(url,'_blank');
  toast('Téléchargement de "'+name+'"...','ok');
}
function previewPdf(driveId,subId,idx){
  const el=document.getElementById('pdf-embed-'+subId+'-'+idx);
  if(!el)return;
  if(el.style.display==='none'||el.style.display===''){
    const fileUrl=encodeURIComponent('https://drive.google.com/uc?export=download&id='+driveId);
    el.innerHTML='<iframe src="https://docs.google.com/viewer?url='+fileUrl+'&embedded=true" width="100%" height="500" style="border:none;border-radius:8px;" allowfullscreen></iframe>';
    el.style.display='block';
  } else {
    el.style.display='none';
    el.innerHTML='';
  }
}
let qCount=0;


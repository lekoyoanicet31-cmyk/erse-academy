// ═══ energybot-ui.js ═══
// 1) Tiroir latéral d'EnergyBot (matières).
// 2) Ajuste la hauteur de la zone EnergyBot à l'écran réel : retire la barre de
//    navigation fixe du bas (mobile) pour que la zone de saisie ne passe jamais
//    dessous, et suit le clavier virtuel.

function toggleEbSidebar(force){
  const sidebar = document.getElementById('eb-sidebar');
  const backdrop = document.getElementById('eb-sidebar-backdrop');
  if(!sidebar || !backdrop) return;
  const shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', shouldOpen);
  backdrop.classList.toggle('show', shouldOpen);
}

function fitEbLayout(){
  const page = document.getElementById('pg-energybot');
  const layout = page && page.querySelector('.eb-layout');
  if(!page || !layout || !page.classList.contains('on')) return;

  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  // Clavier virtuel ouvert : la barre du bas est cachée derrière lui, on ne la retire pas
  const keyboardOpen = !!vv && (window.innerHeight - vv.height) > 120;

  let navH = 0;
  const nav = document.getElementById('bottom-nav');
  if(nav && !keyboardOpen){
    const cs = getComputedStyle(nav);
    if(cs.display !== 'none' && cs.position === 'fixed') navH = nav.offsetHeight;
  }
  const top = Math.max(layout.getBoundingClientRect().top, 0);
  const h = Math.max(160, Math.round(vh - top - navH));
  page.style.setProperty('--eb-h', h + 'px');
}

(function initEbFit(){
  const page = document.getElementById('pg-energybot');
  if(!page) return;
  // À chaque ouverture de la page EnergyBot : on remonte en haut puis on ajuste
  new MutationObserver(() => {
    if(page.classList.contains('on')){
      window.scrollTo(0, 0);
      requestAnimationFrame(() => requestAnimationFrame(fitEbLayout));
    }
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', fitEbLayout);
  window.addEventListener('orientationchange', () => setTimeout(fitEbLayout, 250));
  if(window.visualViewport) window.visualViewport.addEventListener('resize', fitEbLayout);
  if(page.classList.contains('on')) fitEbLayout();
})();

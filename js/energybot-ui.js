// ═══ energybot-ui.js ═══
// Ouvre/ferme le tiroir latéral d'EnergyBot en version mobile (<768px).
// N'a aucun effet en version tablette/desktop où la sidebar est fixe.

function toggleEbSidebar(force){
  const sidebar = document.getElementById('eb-sidebar');
  const backdrop = document.getElementById('eb-sidebar-backdrop');
  if(!sidebar || !backdrop) return;
  const shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', shouldOpen);
  backdrop.classList.toggle('show', shouldOpen);
}

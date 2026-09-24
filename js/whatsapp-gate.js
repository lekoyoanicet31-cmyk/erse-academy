/* ══ WHATSAPP GATE — bloque l'accès à la boutique tant que l'utilisateur
   n'a pas cliqué sur "j'ai rejoint la chaîne WhatsApp".
   ⚠️ C'est un gate DÉCLARATIF, pas une vraie vérification : rien ne permet
   de confirmer côté client qu'un utilisateur a réellement rejoint la chaîne. ══ */

(function () {
  const CHANNEL_URL = "https://whatsapp.com/channel/0029VbCWEMk4Crfd6srHg01q";
  const STORAGE_KEY = "erse_whatsapp_joined";

  function isUnlocked() {
    return localStorage.getItem(STORAGE_KEY) === "1";
  }

  function showGate() {
    const overlay = document.getElementById("wg-overlay");
    if (overlay) overlay.style.display = "flex";
  }

  function hideGate() {
    const overlay = document.getElementById("wg-overlay");
    if (overlay) overlay.style.display = "none";
    const btn = document.getElementById("wg-confirm-btn");
    if (btn) {
      btn.disabled = true;
      btn.style.cursor = "not-allowed";
      btn.style.color = "var(--muted,#9ca3af)";
    }
  }

  // Ouvre le lien WhatsApp et active le bouton de confirmation
  window.openChannelAndArm = function () {
    window.open(CHANNEL_URL, "_blank", "noopener");
    const btn = document.getElementById("wg-confirm-btn");
    if (btn) {
      btn.disabled = false;
      btn.style.cursor = "pointer";
      btn.style.color = "#25D366";
      btn.style.borderColor = "#25D366";
    }
  };

  // Confirme et débloque la boutique
  window.unlockShop = function () {
    localStorage.setItem(STORAGE_KEY, "1");
    hideGate();
    if (typeof window.__wgOriginalGoPage === "function") {
      window.__wgOriginalGoPage("boutique");
    }
  };

  // Ferme le modal et renvoie vers l'accueil
  window.wgClose = function () {
    hideGate();
    if (typeof window.__wgOriginalGoPage === "function") {
      window.__wgOriginalGoPage("accueil");
    }
  };

  // Attend que goPage() (défini dans nav.js) existe avant de le wrapper
  function armGate() {
    if (typeof window.goPage !== "function") {
      setTimeout(armGate, 30);
      return;
    }
    if (window.__wgOriginalGoPage) return; // déjà armé

    window.__wgOriginalGoPage = window.goPage;

    window.goPage = function (page) {
      if (page === "boutique" && !isUnlocked()) {
        showGate();
        return;
      }
      return window.__wgOriginalGoPage.apply(this, arguments);
    };
  }

  armGate();
})();

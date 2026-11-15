/*
 * component-oeuvre-3d-crumb.js — le fil d'Ariane de la fiche 3D (snippets/oeuvre-3d-crumb.liquid)
 * ----------------------------------------------------------------------------------------------
 * Maquette 7a « Menu : le chevron ouvre tout le chemin », validée par Walid le 15/11/2026. Le chevron
 * de la capsule ouvre le chemin entier et le referme ; toucher ailleurs (le voile qui couvre l'écran,
 * l'en-tête, la barre d'achat) ou Échap le referme aussi, comme une rangée des chips. Le voile garde
 * pour lui le toucher qui referme : la scène ne le reçoit pas. Le dessin et les mouvements sont dans
 * input.css (règles .oeuvre-3d-crumb*), qui suit aussi la scène : la capsule s'efface quand une rangée
 * s'ouvre et laisse sa place à « Retour ».
 * La bascule Toile | Poster remplace la page sans la recharger (product-twin-toggle.js) : la capsule de
 * la fiche jumelle arrive avec son propre chemin, et ce script la reprend (connectedCallback).
 */
if (!customElements.get('oeuvre-3d-crumb')) {
  class Oeuvre3dCrumb extends HTMLElement {
    connectedCallback() {
      this.toggle = this.querySelector('[data-crumb-toggle]');
      this.closer = this.querySelector('[data-crumb-closer]');
      if (!this.toggle || this.bound) return;
      this.bound = true;
      this.toggle.addEventListener('click', this.onToggle);
      if (this.closer) this.closer.addEventListener('click', this.onCloser);
      this.addEventListener('focusout', this.onFocusOut);
    }

    disconnectedCallback() {
      this.setOpen(false);
    }

    get isOpen() {
      return this.hasAttribute('open');
    }

    setOpen(open) {
      if (!this.toggle || open === this.isOpen) return;
      this.toggleAttribute('open', open);
      this.toggle.setAttribute('aria-expanded', String(open));
      const method = open ? 'addEventListener' : 'removeEventListener';
      document[method]('keydown', this.onKey);
      document[method]('pointerdown', this.onPointerDown, true);
    }

    onToggle = () => this.setOpen(!this.isOpen);

    onCloser = () => this.setOpen(false);

    // Échap referme et rend le focus au chevron, s'il était dans le chemin.
    onKey = (event) => {
      if (event.key !== 'Escape') return;
      const inside = this.contains(document.activeElement);
      this.setOpen(false);
      if (inside) this.toggle.focus({ preventScroll: true });
    };

    // Un toucher hors de la capsule et de son voile (en-tête, barre d'achat) referme ; il garde son effet.
    onPointerDown = (event) => {
      if (!this.contains(event.target)) this.setOpen(false);
    };

    // Le clavier quitte le chemin (Tab après le dernier lien) : il se referme derrière lui.
    onFocusOut = (event) => {
      if (this.isOpen && event.relatedTarget && !this.contains(event.relatedTarget)) this.setOpen(false);
    };
  }

  customElements.define('oeuvre-3d-crumb', Oeuvre3dCrumb);
}

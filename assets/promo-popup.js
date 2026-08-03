/**
 * <promo-popup> — encart promo « bon de 15 € », fiche produit uniquement.
 *
 * Brief : growth/POPUP-BRIEF-CLAUDE-DESIGN.md
 *
 * ⛔ GARDE-FOU SEO — la règle la plus importante du fichier.
 *    100 % du chiffre d'affaires vient du référencement organique et 70,8 % du trafic est
 *    mobile. Google déclasse les pages dont le contenu est masqué à l'arrivée depuis les
 *    résultats de recherche. L'encart ne s'ouvre donc JAMAIS sur la première page vue
 *    d'une session : il faut au minimum une 2e page ET un engagement réel.
 *
 * ⛔ NON MODAL — pas d'aria-modal, pas de piège de focus : la page reste utilisable.
 *    Le focus va sur le titre à l'ouverture et revient à son origine à la fermeture.
 *
 * ⛔ IDEMPOTENCE — assets/tw-global.js est inclus deux fois sur certaines pages et ce
 *    script peut être réévalué après un swap de #MainContent (bascule Poster/Toile).
 *    Toute initialisation doit pouvoir être rejouée sans effet de bord.
 *
 * ⛔ ART. 82 (loi Informatique et Libertés) — le stockage local ne contient QUE des
 *    entiers et des horodatages, jamais d'e-mail ni d'identifiant, n'est jamais transmis,
 *    et expire au bout de 30 jours. C'est ce qui le fait tenir dans l'exemption
 *    « strictement nécessaire » sans recueil de consentement.
 */

(() => {
  if (window.customElements.get('promo-popup')) return;

  const PV_KEY = 'mma_pv_count'; // sessionStorage — entier (alimenté par tw-global.js)
  const SEEN_KEY = 'mma_promo_seen_at'; // localStorage — horodatage ms de la dernière fermeture
  const SUB_KEY = 'mma_promo_sub_at'; // localStorage — horodatage ms du dernier envoi réussi
  const CODE_KEY = 'mma_promo_until'; // localStorage — horodatage ms de fin de validité
  const SEEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours
  const TIMEOUT = 8000;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const readInt = (store, key) => {
    try {
      return parseInt(store.getItem(key), 10) || 0;
    } catch (e) {
      return 0;
    }
  };
  const write = (store, key, value) => {
    try {
      store.setItem(key, String(value));
    } catch (e) {
      /* mode privé / quota : on dégrade sans casser la page */
    }
  };

  /* ⛔ Le compteur de pages vues vit dans assets/tw-global.js, PAS ici.
     Ce fichier n'est chargé que sur les fiches produit : y compter les pages ne compterait
     que les fiches produit vues, et un visiteur arrivé de Google sur une collection puis
     passé sur une fiche resterait à 1 — l'encart ne s'afficherait jamais pour lui.
     Ici on se contente de LIRE la clé. */

  class PromoPopup extends HTMLElement {
    connectedCallback() {
      if (this.__init) return; // idempotence
      this.__init = true;

      this.card = this.querySelector('[data-promo-card]');
      this.form = this.querySelector('form');
      this.emailInput = this.querySelector('[data-promo-email]');
      this.consentInput = this.querySelector('[data-promo-consent]');
      this.emailError = this.querySelector('[data-promo-email-error]');
      this.consentError = this.querySelector('[data-promo-consent-error]');
      this.submitBtn = this.querySelector('[data-promo-submit]');
      this.retryBtn = this.querySelector('[data-promo-retry]');
      this.copyBtn = this.querySelector('[data-promo-copy]');
      this.statusEl = this.querySelector('[data-promo-status]');
      this.screens = {
        1: this.querySelector('[data-promo-screen="1"]'),
        2: this.querySelector('[data-promo-screen="2"]'),
      };

      if (!this.card || !this.form) return;

      /* Posé ici et pas dans le Liquid : {% form %} n'accepte pas d'attribut libre de façon
         vérifiée dans ce thème. Sans lui, la validation native du navigateur intercepte le
         submit avant notre handler (bulle système, ni aria-live ni aria-invalid). */
      this.form.setAttribute('novalidate', 'novalidate');

      this.code = this.dataset.code || '';
      this.delay = (parseInt(this.dataset.delay, 10) || 15) * 1000;
      this.minPages = parseInt(this.dataset.minPages, 10) || 2;
      this.cartCount = parseInt(this.dataset.cartCount, 10) || 0;
      this.submitLabel = this.submitBtn ? this.submitBtn.textContent.trim() : '';
      this.copyLabel = this.copyBtn ? this.copyBtn.textContent.trim() : '';
      this.engaged = 0;
      this.opener = null;

      this.bind();

      /* Un code déjà obtenu et encore valide : on ne redemande jamais l'e-mail,
         on se contente de la pastille en ligne dans la fiche. */
      if (this.hasLiveCode()) {
        this.mountBadge();
        return;
      }

      if (this.eligible()) this.startTimer();
    }

    /* ---------- éligibilité ---------- */

    hasLiveCode() {
      const until = readInt(localStorage, CODE_KEY);
      return until > 0 && Date.now() < until;
    }

    eligible() {
      if (this.cartCount > 0) return false; // on ne dérange pas quelqu'un qui achète déjà
      if (readInt(sessionStorage, PV_KEY) < this.minPages) return false; // ⛔ jamais à l'atterrissage
      const seen = readInt(localStorage, SEEN_KEY);
      if (seen && Date.now() - seen < SEEN_TTL) return false;
      return true;
    }

    cookieBannerVisible() {
      const banner = document.getElementById('cookies-banner');
      if (!banner || banner.classList.contains('hidden')) return false;
      return banner.getBoundingClientRect().height > 0;
    }

    /* ---------- déclenchement ---------- */

    startTimer() {
      const tick = () => {
        if (document.visibilityState !== 'visible') return; // timer suspendu onglet inactif
        this.engaged += 1000;
        if (this.engaged >= this.delay && !this.cookieBannerVisible()) {
          clearInterval(this.timer);
          this.open();
        }
      };
      this.timer = setInterval(tick, 1000);
    }

    /* ---------- ouverture / fermeture ---------- */

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.opener = document.activeElement;
      this.classList.remove('hidden');
      this.positionCard();

      /* Mobile : l'encart PREND LA PLACE du bouton d'achat flottant, il ne le recouvre
         jamais. Même mécanique que le studio (body.studio-cta-floating dans input.css). */
      document.body.classList.add('promo-popup-open');

      /* Focaliser le titre de l'écran RÉELLEMENT affiché : rouvert depuis la pastille,
         l'encart est sur l'écran 2 et forcer l'écran 1 ici volerait le focus. */
      this.show(this.currentScreen || 1);

      /* ⛔ Les handlers sont des références STABLES créées une seule fois dans bind().
         Les recréer ici en ferait de nouvelles fonctions à chaque ouverture : close() n'en
         retirerait qu'une et les précédentes fuiteraient sur document. Symptôme constaté au
         banc d'essai : rouvrir depuis la pastille refermait aussitôt l'encart, parce que le
         clic remontait jusqu'à un écouteur périmé. addEventListener est idempotent pour une
         même référence, donc pas de doublon possible.
         Le setTimeout laisse le clic d'ouverture finir de se propager avant d'écouter. */
      setTimeout(() => document.addEventListener('click', this.onDocClick), 0);
      document.addEventListener('keydown', this.onEsc);
      window.addEventListener('resize', this.onResize);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.add('hidden');
      document.body.classList.remove('promo-popup-open');
      document.removeEventListener('click', this.onDocClick);
      document.removeEventListener('keydown', this.onEsc);
      window.removeEventListener('resize', this.onResize);
      write(localStorage, SEEN_KEY, Date.now());

      /* Restitution du focus — removeTrapFocus est défini dans assets/tw-global.js */
      if (typeof removeTrapFocus === 'function') {
        removeTrapFocus(this.opener instanceof HTMLElement ? this.opener : null);
      } else if (this.opener instanceof HTMLElement) {
        this.opener.focus();
      }

      if (this.hasLiveCode()) this.mountBadge();
    }

    onResize = () => this.positionCard();

    /* Desktop : ancré AU-DESSUS du bouton d'achat (offset = sa hauteur réelle + 16 px).
       Sans cet offset, à 1280 px le bouton et la carte se recouvrent sur 33 px. */
    positionCard() {
      const buy = document.querySelector('.float-buy-button');
      const h = buy ? buy.offsetHeight : 0;
      this.card.style.setProperty('--promo-bottom', h ? `${h + 40}px` : '7rem');
    }

    /* ---------- écrans ---------- */

    /* ⛔ Bascule par CLASSE, jamais par l'attribut `hidden` : sur un élément portant `flex`,
       `[hidden]{display:none}` (couche base) perd contre `.flex` (couche utilities) et
       l'élément reste VISIBLE. `.hidden` est émise après `.flex`, elle gagne. */
    show(screen) {
      this.currentScreen = screen;
      this.screens[1].classList.toggle('hidden', screen !== 1);
      this.screens[1].classList.toggle('flex', screen === 1);
      this.screens[2].classList.toggle('hidden', screen !== 2);
      this.screens[2].classList.toggle('flex', screen === 2);
      const title = this.screens[screen].querySelector('[data-promo-title]');
      if (!title) return;
      /* Le nom accessible du dialogue doit pointer sur le titre VISIBLE : chaque écran a le
         sien, et référencer celui de l'écran masqué laisserait le dialogue sans nom. */
      if (title.id) this.card.setAttribute('aria-labelledby', title.id);
      title.focus();
    }

    setError(el, on) {
      if (el) el.classList.toggle('hidden', !on);
    }

    /* ---------- soumission ---------- */

    bind() {
      /* Références stables — cf. le commentaire dans open() */
      this.onDocClick = (e) => {
        if (this.isOpen && !this.card.contains(e.target) && this.state !== 'sending') this.close();
      };
      this.onEsc = (e) => {
        if (e.key === 'Escape' && this.isOpen && this.state !== 'sending') this.close();
      };

      this.querySelectorAll('[data-promo-close]').forEach((b) =>
        b.addEventListener('click', () => this.close())
      );

      this.form.addEventListener('submit', (e) => {
        e.preventDefault(); // ⛔ un POST natif rechargerait la page et détruirait l'écran 2
        this.submit();
      });

      if (this.emailInput) {
        this.emailInput.addEventListener('input', () => this.setError(this.emailError, false));
      }
      if (this.consentInput) {
        this.consentInput.addEventListener('change', () => this.setError(this.consentError, false));
      }
      if (this.copyBtn) {
        this.copyBtn.addEventListener('click', () => this.copy());
      }
      if (this.retryBtn) {
        this.retryBtn.addEventListener('click', () => this.submit(true));
      }
    }

    setSending(on) {
      this.state = on ? 'sending' : 'idle';
      if (this.submitBtn) {
        this.submitBtn.disabled = on;
        this.submitBtn.textContent = on ? this.submitBtn.dataset.sending || '…' : this.submitLabel;
      }
      if (this.emailInput) this.emailInput.disabled = on;
      if (this.consentInput) this.consentInput.disabled = on;
      this.querySelectorAll('[data-promo-close]').forEach((b) => {
        b.disabled = on;
      });
    }

    async submit(isRetry) {
      if (!isRetry) {
        const email = (this.emailInput.value || '').trim();
        if (!EMAIL_RE.test(email)) {
          this.setError(this.emailError, true);
          this.emailInput.setAttribute('aria-invalid', 'true');
          this.emailInput.focus();
          return;
        }
        this.emailInput.setAttribute('aria-invalid', 'false');
        this.setError(this.emailError, false);

        if (!this.consentInput.checked) {
          this.setError(this.consentError, true);
          this.consentInput.focus();
          return;
        }
        this.setError(this.consentError, false);
      }

      /* ⛔ Construire le FormData AVANT setSending : la spec HTML exclut les contrôles
         `disabled` du form data set. Verrouiller les champs d'abord ferait partir un POST
         sans `contact[email]` — personne ne serait inscrit, et l'échec serait invisible
         puisque l'écran 2 s'affiche de toute façon. Bug constaté au banc d'essai. */
      const payload = new FormData(this.form);
      this.setSending(true);

      /* « Déjà inscrit » : Shopify répond de façon identique pour une adresse connue et une
         nouvelle, il n'existe AUCUN signal serveur exploitable. On s'appuie sur le seul fait
         vérifiable localement — un envoi déjà réussi dans ce navigateur. ⛔ Surtout pas
         SEEN_KEY, qui est écrite à chaque fermeture (y compris sur « Plus tard ») : le
         message « Vous êtes déjà inscrit » serait alors mensonger. */
      const knownHere = readInt(localStorage, SUB_KEY) > 0;

      let ok = true;
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), TIMEOUT);
        try {
          const res = await fetch(this.form.action, {
            method: 'POST',
            body: payload,
            signal: ctrl.signal,
          });
          ok = res.ok;
        } finally {
          clearTimeout(to); // sinon le timer survit au rejet du fetch
        }
      } catch (e) {
        ok = false;
      }

      this.setSending(false);
      if (ok) write(localStorage, SUB_KEY, Date.now());
      this.grantCode(ok ? (knownHere ? 'already' : '') : 'network');
    }

    /* Le code vient d'un réglage admin : il est connu côté client et s'affiche TOUJOURS.
       La vente est primaire, l'abonnement est secondaire — un échec réseau ne doit
       jamais priver le client de son bon. */
    grantCode(state) {
      const until = Date.parse(this.dataset.until || '') || Date.now() + SEEN_TTL;
      write(localStorage, CODE_KEY, until);
      write(localStorage, SEEN_KEY, Date.now());

      if (this.statusEl) {
        const msg =
          state === 'network'
            ? this.statusEl.dataset.network
            : state === 'already'
              ? this.statusEl.dataset.already
              : '';
        this.statusEl.textContent = msg || '';
        this.statusEl.classList.toggle('hidden', !msg);
      }
      if (this.retryBtn) this.retryBtn.classList.toggle('hidden', state !== 'network');

      this.show(2);
    }

    async copy() {
      try {
        await navigator.clipboard.writeText(this.code);
      } catch (e) {
        return;
      }
      const done = this.copyBtn.dataset.copied;
      if (!done) return;
      this.copyBtn.textContent = done;
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.copyBtn.textContent = this.copyLabel;
      }, 1800);
    }

    /* ---------- pastille de retour ---------- */

    mountBadge() {
      if (document.querySelector('[data-promo-badge]')) return; // idempotence
      const tpl = this.querySelector('[data-promo-badge-template]');
      const host = document.querySelector('main-product-blocks');
      if (!tpl || !host) return;

      const node = tpl.content.firstElementChild.cloneNode(true);
      node.addEventListener('click', (e) => {
        e.stopPropagation(); // ce clic ne doit pas remonter jusqu'au handler de fermeture
        this.show(2);
        this.open();
        this.opener = e.currentTarget; // après open(), qui écrase opener avec activeElement
      });
      host.insertBefore(node, host.firstChild);
    }
  }

  window.customElements.define('promo-popup', PromoPopup);
})();

/**
 * <promo-popup> — encart promo « bon de 15 € », fiche produit uniquement.
 *
 * Brief : growth/POPUP-BRIEF-CLAUDE-DESIGN.md
 *
 * ⛔ GARDE-FOU SEO — la règle la plus importante du fichier.
 *    100 % du chiffre d'affaires vient du référencement organique et 70,8 % du trafic est
 *    mobile. Ce que Google sanctionne n'est pas le MOMENT de l'affichage mais l'OBSTRUCTION :
 *    sa documentation distingue « interstitials » (voile sur toute la page, à éviter) de
 *    « dialogs » (recouvrement partiel, toléré) et recommande les bannières occupant une
 *    petite fraction de l'écran. D'où la règle : sur MOBILE, jamais de voile, jamais de
 *    plein écran — et sur la page d'atterrissage, un signe d'engagement réel est exigé en
 *    plus du délai (scroll d'un écran, ou choix d'un format/cadre/contour).
 *    ⚠️ Le délai n'a JAMAIS été une protection SEO : le moteur de rendu de Google accélère
 *    son horloge quand la page est inactive, un setTimeout est traversé.
 *
 * ⛔ DEUX CONTRATS D'ACCESSIBILITÉ selon la largeur (voir isModal / applyModality).
 *    MOBILE : bannière basse sans voile — NON MODALE, ni aria-modal ni piège de focus.
 *    DESKTOP : carte centrée sur voile — MODALE, donc aria-modal + piège de focus + verrou
 *    de scroll. Un voile sans ces obligations serait pire que pas de voile du tout.
 *    Dans les deux cas le focus va sur le titre à l'ouverture et revient à son origine.
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
      this.delay = (parseInt(this.dataset.delay, 10) || 10) * 1000;
      this.minPages = parseInt(this.dataset.minPages, 10) || 2;
      this.cartCount = parseInt(this.dataset.cartCount, 10) || 0;
      this.submitLabel = this.submitBtn ? this.submitBtn.textContent.trim() : '';
      this.copyLabel = this.copyBtn ? this.copyBtn.textContent.trim() : '';
      this.engaged = 0;
      this.opener = null;

      this.bind();

      /* Avant toute décision : effacer ce qui a dépassé sa durée annoncée. */
      this.purgeStaleKeys();

      /* Un code déjà obtenu et encore valide : on ne redemande jamais l'e-mail,
         on se contente de la pastille en ligne dans la fiche. */
      if (this.hasLiveCode()) {
        this.mountBadge();
        return;
      }

      if (this.eligible()) {
        this.signal = false;
        this.watchEngagement();
        this.startTimer();
      }
    }

    /* ---------- hygiène du stockage local ---------- */

    /* ⛔ Purge des clés devenues inutiles. Ce n'est pas cosmétique : la politique de
       confidentialité annonce une conservation de 30 jours maximum au titre de l'exemption
       de l'art. 82 (traceur strictement nécessaire). Une clé qui survivrait indéfiniment
       rendrait cette mention FAUSSE. Le code doit tenir la promesse du texte. */
    purgeStaleKeys() {
      const now = Date.now();
      const until = readInt(localStorage, CODE_KEY);
      if (until > 0 && now >= until) {
        try {
          localStorage.removeItem(CODE_KEY);
        } catch (e) {
          /* mode privé : rien à faire */
        }
      }
      [SEEN_KEY, SUB_KEY].forEach((k) => {
        const ts = readInt(localStorage, k);
        if (ts > 0 && now - ts >= SEEN_TTL) {
          try {
            localStorage.removeItem(k);
          } catch (e) {
            /* idem */
          }
        }
      });
    }

    /* ---------- éligibilité ---------- */

    hasLiveCode() {
      const until = readInt(localStorage, CODE_KEY);
      return until > 0 && Date.now() < until;
    }

    /* Le nombre de pages vues ne BLOQUE plus : il module l'exigence d'engagement.
       Google ne condamne pas le MOMENT de l'affichage, il condamne l'OBSTRUCTION — sa doc
       distingue explicitement « interstitials » (voile sur toute la page, à éviter) et
       « dialogs » (recouvrement partiel, toléré), et recommande justement les bannières
       occupant une petite fraction de l'écran. Notre encart est de ce second type.
       À l'inverse, exiger une 2e page vue éteignait l'encart pour la majorité des sessions :
       70,8 % du trafic est mobile et arrive en direct depuis la recherche, sur la fiche. */
    eligible() {
      if (this.cartCount > 0) return false; // on ne dérange pas quelqu'un qui achète déjà
      const seen = readInt(localStorage, SEEN_KEY);
      if (seen && Date.now() - seen < SEEN_TTL) return false;
      return true;
    }

    /* Sur la page d'ATTERRISSAGE, le délai seul ne suffit pas : il faut un signe d'intérêt
       réel. Ailleurs dans la session, la navigation est déjà ce signe. */
    needsEngagementSignal() {
      return readInt(sessionStorage, PV_KEY) < this.minPages;
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

        /* ⛔ Le compteur ne tourne PAS tant que le bandeau cookies est à l'écran.
           Sinon l'engagement s'accumule pendant que le visiteur lit le bandeau : s'il met 20 s
           à l'accepter, le délai est déjà dépassé et l'encart s'ouvre dans la seconde qui suit.
           Deux fenêtres coup sur coup, c'est agressif et ça se fait fermer par réflexe.
           En mettant le compteur en pause, le délai repart à zéro APRÈS la fermeture du
           bandeau : le visiteur retrouve la page seule pendant tout le délai. */
        if (this.cookieBannerVisible()) {
          this.engaged = 0;
          return;
        }

        this.engaged += 1000;
        if (this.engaged < this.delay) return;
        if (this.needsEngagementSignal() && !this.signal) return; // page d'atterrissage : on attend un geste
        clearInterval(this.timer);
        this.open();
      };
      this.timer = setInterval(tick, 1000);
    }

    /* Signaux d'intérêt réel sur la fiche. Le premier suffit, puis on se débranche.
       `passive` et `once` : aucun coût sur le scroll, aucune fuite d'écouteur. */
    watchEngagement() {
      if (!this.needsEngagementSignal()) {
        this.signal = true;
        return;
      }
      const fire = () => {
        this.signal = true;
        window.removeEventListener('scroll', onScroll);
      };
      const onScroll = () => {
        // avoir dépassé la hauteur d'un écran = être passé sous le bloc prix
        if (window.scrollY >= window.innerHeight * 0.6) fire();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      // choix d'un format, d'un cadre, d'un contour, ouverture de la galerie…
      document.addEventListener('change', fire, { once: true, passive: true });
    }

    /* ---------- ouverture / fermeture ---------- */

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.opener = document.activeElement;
      this.classList.remove('hidden');

      /* Mobile : l'encart PREND LA PLACE du bouton d'achat flottant, il ne le recouvre
         jamais. Même mécanique que le studio (body.studio-cta-floating dans input.css). */
      document.body.classList.add('promo-popup-open');

      this.applyModality();

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
      /* Un redimensionnement peut faire franchir le point de bascule desktop/mobile :
         la modalité doit suivre, sinon on garde un piège de focus sans voile, ou l'inverse. */
      window.addEventListener('resize', this.onResize);
    }

    /* ⛔ DEUX CONTRATS SELON LA LARGEUR.
       Desktop : la carte est centrée sur un voile plein écran — c'est une modale de fait,
       donc aria-modal + piège de focus + verrou de scroll. Un contrat à moitié tenu (un
       voile sans les obligations) serait pire que pas de voile du tout.
       Mobile : bannière basse, aucun voile, la page reste utilisable — donc NI aria-modal,
       NI piège de focus. Le voile est `hidden md:block` : la combinaison « voile + arrivée
       depuis la recherche mobile », seule réellement sanctionnée par Google, est donc
       impossible par construction, sans avoir besoin d'un garde-fou en JS. */
    isModal() {
      return window.matchMedia('(min-width: 768px)').matches;
    }

    applyModality() {
      const modal = this.isModal();
      if (modal) {
        this.card.setAttribute('aria-modal', 'true');
        document.body.classList.add('overflow-hidden');
        this.scopeFocusables();
        this.card.addEventListener('keydown', this.onTrap);
      } else {
        this.card.removeAttribute('aria-modal');
        document.body.classList.remove('overflow-hidden');
        this.card.removeEventListener('keydown', this.onTrap);
      }
    }

    releaseModality() {
      this.card.removeAttribute('aria-modal');
      document.body.classList.remove('overflow-hidden');
      this.card.removeEventListener('keydown', this.onTrap);
    }

    /* Bornes du piège de focus. On filtre sur offsetParent : l'écran masqué contient des
       champs focalisables qui ne doivent pas entrer dans le cycle. */
    scopeFocusables() {
      const sel = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const list = Array.from(this.card.querySelectorAll(sel)).filter((el) => el.offsetParent !== null);
      this.firstFocusable = list[0] || null;
      this.lastFocusable = list[list.length - 1] || null;
    }

    /* trapFocus (assets/tw-global.js) est un HANDLER keydown, pas un piège clé en main :
       signature (event, premier, dernier). Repli local s'il venait à disparaître. */
    onTrap = (e) => {
      if (e.key !== 'Tab' || !this.firstFocusable) return;
      if (typeof window.trapFocus === 'function') {
        window.trapFocus(e, this.firstFocusable, this.lastFocusable);
        return;
      }
      if (e.shiftKey && document.activeElement === this.firstFocusable) {
        this.lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === this.lastFocusable) {
        this.firstFocusable.focus();
        e.preventDefault();
      }
    };

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.add('hidden');
      document.body.classList.remove('promo-popup-open');
      document.removeEventListener('click', this.onDocClick);
      document.removeEventListener('keydown', this.onEsc);
      window.removeEventListener('resize', this.onResize);
      this.releaseModality();
      write(localStorage, SEEN_KEY, Date.now());

      /* Restitution du focus — removeTrapFocus est défini dans assets/tw-global.js */
      if (typeof removeTrapFocus === 'function') {
        removeTrapFocus(this.opener instanceof HTMLElement ? this.opener : null);
      } else if (this.opener instanceof HTMLElement) {
        this.opener.focus();
      }

      if (this.hasLiveCode()) this.mountBadge();
    }

    onResize = () => {
      if (this.isOpen) this.applyModality();
    };

    /* Desktop : ancré AU-DESSUS du bouton d'achat (offset = sa hauteur réelle + 16 px).
       Sans cet offset, à 1280 px le bouton et la carte se recouvrent sur 33 px. */

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

      /* ⛔ ON N'ÉCOUTE PLUS `submit` — le bouton est en type="button" et on écoute son CLIC.
         Constaté en production le 2026-08-04 : `e.preventDefault()` ne suffisait pas. Shopify
         attache son propre écouteur `submit` (protection hCaptcha des formulaires client,
         ce_storefront_forms_captcha_hcaptcha.v1.5.2) qui intercepte l'événement, fait son
         preventDefault, puis RE-SOUMET le formulaire nativement une fois le captcha résolu.
         Résultat mesuré : la page naviguait vers
           ?contact[tags]=promo-popup&form_type=customer#PromoPopupForm
         l'encart était détruit, et le client — pourtant bien inscrit par notre fetch — ne
         voyait JAMAIS l'écran 2 ni son code.
         En ne déclenchant aucun événement `submit`, l'écouteur de Shopify ne se réveille pas :
         plus de navigation, et le badge « Protégé par hCaptcha » disparaît par la même
         occasion. Contrepartie assumée : ce formulaire n'est plus couvert par la protection
         anti-spam de Shopify — il ne demande qu'un e-mail, et le minimum de 80 € protège la
         remise elle-même. */
      if (this.submitBtn) {
        this.submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.submit();
        });
      }
      /* La touche Entrée dans un champ déclenche une soumission implicite : on l'intercepte
         AVANT qu'elle ne génère l'événement, sinon on rejoue exactement le bug ci-dessus. */
      if (this.emailInput) {
        this.emailInput.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          this.submit();
        });
      }

      /* Dernier rempart, volontairement PASSIF : on annule sans rappeler submit(). Un second
         appel ici doublerait l'envoi quand le clic a déjà fait le travail. Et si Shopify
         re-soumet malgré tout, ce preventDefault n'y changera rien — d'où les deux gardes
         ci-dessus, qui empêchent l'événement d'exister plutôt que de tenter de l'annuler. */
      this.form.addEventListener('submit', (e) => e.preventDefault());

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
      /* Epoch en secondes fourni par le Liquid (data-until-ts), pas une chaîne à parser :
         Date.parse() sur une date nue l'interprète à minuit UTC et décalait la validité. */
      const untilSec = parseInt(this.dataset.untilTs, 10) || 0;
      const until = untilSec > 0 ? untilSec * 1000 : Date.now() + SEEN_TTL;
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

/*
 * <custom-art-studio> — Studio de personnalisation « poster perso foot » (mission M3).
 *
 * Rendu par sections/tw-custom-art-studio.liquid. Overlay plein écran mobile / modal desktop,
 * machine à états en 4 étapes : photo → équipe → prénom+numéro → format+finition,
 * puis écrans : attente storytelling → révélation (→ panier / autre version / sauvegarde).
 *
 * Conventions reprises du thème :
 * - focus trap : réutilise window.trapFocus (assets/tw-global.js), repli local sinon ;
 * - ajout panier : mêmes contrats DOM que MainProductBlocks (assets/main-product.js) :
 *   POST /cart/add.js?sections=tw-cart-drawer,tw-header-painting, maj #bubble-nb-product,
 *   re-render #shopify-section-tw-cart-drawer, clic #cart-button (ouvre le tiroir) ;
 * - prix : réutilise Product.formatPrice (assets/layout-product.js) quand dispo ;
 * - aucun texte utilisateur en dur ici : tout vient du JSON [data-studio-config]
 *   (clés locales sections.custom_art_studio + settings de la section).
 *
 * Mode réel (mission M6) — contrats back-end /api/custom-art/* :
 * - réponses enveloppées { success, data: {...} } -> déballées par api() ;
 * - auth de session : le token renvoyé par POST /jobs est mémorisé puis joint à TOUS les
 *   appels suivants (en-tête x-custom-art-session + credentials:'include') ;
 * - statuts de job : pending | generating | judging | ready | failed | manual_review | expired ;
 *   failed / manual_review -> écran « Faire réaliser par un artiste » (décision plan §0.15) ;
 * - reveal-next : runner-ups instantanés, sinon nouvelle génération (attente + polling) ;
 * - caps anti-abus : 429 (forte affluence) et 403 / emailRequired (e-mail requis) -> messages
 *   FR propres, formulaire e-mail proposé là où c'est actionnable ;
 * - mockups (moteur de rendu externe) : streaming post-reveal via le polling du job
 *   (cellules squelette -> images + lien zoom), dégradation gracieuse si le moteur est down.
 *
 * Reveal WebGL : au reveal, un nœud <perspective-canvas> est RECRÉÉ dans
 * [data-studio-webgl-slot] (pattern « popup » de snippets/tw-main-product-perspective.liquid)
 * avec l'aperçu généré en texture (URL CORS-ok requise) + le cadre/format choisis (état figé
 * via perspective-config.state). Repli image + cadre CSS si WebGL indisponible
 * (prefers-reduced-motion, vieux mobiles, Save-Data, texture refusée).
 *
 * Mode mock (setting de section) : équipes en fixture locale, génération simulée ~8 s,
 * œuvre de démonstration construite en SVG (couleurs de l'équipe + prénom + numéro),
 * mockups simulés en streaming, prénom « ARTISTE » -> scénario manual_review (écran artiste).
 * Permet de parcourir tout le studio sans back-end (cf. dev-harness/custom-art-studio.html).
 * SANS EFFET DE BORD boutique : l'ajout panier est court-circuité (message démo, aucun
 * POST /cart/add.js) car le job mock n'existe pas côté back-end.
 */
(() => {
  if (customElements.get('custom-art-studio')) return;

  const STEPS = ['photo', 'team', 'name', 'format'];
  // Livrable A (studio config-driven) — repli foot utilisé tant que le metafield studio.config
  // n'est pas posé sur le produit : le studio live tourne dessus -> zéro régression pendant le
  // chantier. Dès que studio.config existe, c'est lui qui pilote l'ordre/les types des étapes.
  const FOOT_FALLBACK_STEPS = [
    { name: 'photo', type: 'photo', required: true, consent: { required: true }, payloadKey: 'photo', checkpointLabel: { fr: 'Photo', en: 'Photo' } },
    { name: 'team', type: 'choice', required: true, payloadKey: 'teamId', checkpointLabel: { fr: 'Équipe', en: 'Team' } },
    {
      name: 'name', type: 'group', required: true, checkpointLabel: { fr: 'Prénom', en: 'Name' },
      children: [
        { name: 'playerName', type: 'text', required: true, minLength: 1, maxLength: 12, payloadKey: 'playerName' },
        { name: 'playerNumber', type: 'number', required: true, min: 1, max: 99, integer: true, payloadKey: 'playerNumber' },
      ],
    },
    {
      name: 'format', type: 'format', required: true, checkpointLabel: { fr: 'Format', en: 'Format' },
      roles: [
        { role: 'size', payloadKey: 'format', resolve: 'dimensions' },
        { role: 'frame', payloadKey: 'frame', resolve: 'slug' },
      ],
    },
  ];
  // Constantes additionnelles du payload foot (jointes à chaque génération).
  const FOOT_FALLBACK_PAYLOAD_EXTRA = { consent: '1' };
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
  const HEIC_EXT = /\.(heic|heif)$/i;
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo
  const MIN_DIMENSION = 512; // pré-check côté client (le back-end revalide)
  const POLL_INTERVAL = 2000;
  const POLL_TIMEOUT = 180000; // garde-fou : job jamais conclu côté back-end -> erreur franche
  const POLL_MAX_NETWORK_ERRORS = 8; // ~16 s de réseau KO d'affilée -> erreur franche
  const MOCKUP_POLL_INTERVAL = 3000; // streaming des mises en situation après le reveal
  const MOCKUP_TIMEOUT = 120000; // moteur de rendu down -> on retire les squelettes restants
  const MOCK_DURATION = 8000;
  const REAL_DURATION_ESTIMATE = 28000; // ~20-30 s annoncés, barre plafonnée à 90 %
  const MOCK_MANUAL_REVIEW_NAME = 'ARTISTE'; // prénom déclencheur du scénario artiste en mock

  // Résolution des options par NOM (l'ordre des options Shopify n'est pas garanti).
  const OPTION_FORMAT_RE = /format|taille|dimension/;
  const OPTION_FRAME_RE = /cadre|finition|frame|encadrement/;

  // Teintes des finitions pour le repli image + cadre CSS (WebGL indisponible). Tons calés
  // sur FRAME_COLOR de component-perspective-canvas.js — données produit, pas couleurs thème.
  const FRAME_FALLBACK_COLOR = {
    blanc: '#EDEAE3',
    noir: '#3B3B40',
    argent: '#9EA1A8',
    chene: '#BDB096',
    noyer: '#66422B',
  };

  // Classes du CTA quand il flotte en bas d'écran (préfixe `mobile:` = sans effet desktop).
  // Littéraux conservés ici pour rester détectables par le scan Tailwind (assets/**/*.js).
  const CTA_FLOAT_CLASSES = ['mobile:fixed', 'mobile:bottom-3', 'mobile:inset-x-4', 'mobile:z-30'];
  // Classe posée sur <body> quand le CTA flotte : masque le float-buy-button classique
  // sur mobile (règle dédiée dans input.css) pour ne jamais superposer deux CTA d'achat.
  const CTA_FLOATING_BODY_CLASS = 'studio-cta-floating';

  // Fixture mock — 15 équipes (données dynamiques : couleurs en hex assumées,
  // ce ne sont PAS des couleurs du thème). La vraie bibliothèque vient du back-end (M4).
  const MOCK_TEAMS = [
    { id: 'paris', name: 'Paris', colors: ['#0a3a7c', '#d01e2f'] },
    { id: 'marseille', name: 'Marseille', colors: ['#36a3dc', '#ffffff'] },
    { id: 'lyon', name: 'Lyon', colors: ['#1a3668', '#d01e2f'] },
    { id: 'monaco', name: 'Monaco', colors: ['#d01e2f', '#ffffff'] },
    { id: 'lille', name: 'Lille', colors: ['#d01e2f', '#1a2d5a'] },
    { id: 'rennes', name: 'Rennes', colors: ['#d01e2f', '#0c0c0c'] },
    { id: 'nice', name: 'Nice', colors: ['#cf0a2c', '#0c0c0c'] },
    { id: 'lens', name: 'Lens', colors: ['#fcd116', '#d01e2f'] },
    { id: 'nantes', name: 'Nantes', colors: ['#fcd116', '#0a7c3a'] },
    { id: 'strasbourg', name: 'Strasbourg', colors: ['#36a3dc', '#ffffff'] },
    { id: 'toulouse', name: 'Toulouse', colors: ['#5b3fbb', '#ffffff'] },
    { id: 'bordeaux', name: 'Bordeaux', colors: ['#0c1f3f', '#ffffff'] },
    { id: 'saint-etienne', name: 'Saint-Étienne', colors: ['#0a7c3a', '#ffffff'] },
    { id: 'reims', name: 'Reims', colors: ['#d01e2f', '#ffffff'] },
    { id: 'montpellier', name: 'Montpellier', colors: ['#1a3668', '#f08418'] },
  ];

  // Coche inline (copie de snippets/icon-checkmark.liquid) pour le badge « équipe sélectionnée »
  // du sélecteur d'équipe : renderTeams construit du HTML en chaîne, donc pas de {% render %}.
  const CHECK_SVG_INLINE = '<svg class="block w-3" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 9" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.35.643a.5.5 0 01.006.707l-6.77 6.886a.5.5 0 01-.719-.006L.638 4.845a.5.5 0 11.724-.69l2.872 3.011 6.41-6.517a.5.5 0 01.707-.006h-.001z" fill="currentColor"/></svg>';
  // Coche du stepper (14px via w-3.5, sizée sur le svg car renderStepper construit du HTML en chaîne).
  const STEP_CHECK_SVG = '<svg class="block h-auto w-3.5" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 9" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.35.643a.5.5 0 01.006.707l-6.77 6.886a.5.5 0 01-.719-.006L.638 4.845a.5.5 0 11.724-.69l2.872 3.011 6.41-6.517a.5.5 0 01.707-.006h-.001z" fill="currentColor"/></svg>';

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  // Crest bicolore NET. Le linear-gradient(135deg, c0 50%, c1 50%) bavait sur la diagonale
  // (anti-aliasing -> on voyait un peu de chaque couleur de l'autre côté, bord « découpé »).
  // Ici : carré plein c0 + triangle c1 (moitié bas-droite) -> UNE seule arête nette. Le cercle
  // vient du parent (overflow-hidden rounded-full). Forward-compatible : remplacer rect+path par
  // un <image href> (logo astro, photo…) garde le même conteneur circulaire.
  const crestSvg = (c0, c1) =>
    `<svg viewBox="0 0 100 100" class="block h-full w-full" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="${escapeHtml(c0 || '#888888')}"></rect><path d="M100 0V100H0Z" fill="${escapeHtml(c1 || c0 || '#888888')}"></path></svg>`;

  const normalize = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  // Teinte CSS de la finition choisie (null = sans cadre / inconnue).
  const frameFallbackColor = (label) => {
    const n = normalize(label);
    if (!n || n.indexOf('sans') !== -1) return null;
    const key = Object.keys(FRAME_FALLBACK_COLOR).find((k) => n.indexOf(k) !== -1);
    return key ? FRAME_FALLBACK_COLOR[key] : null;
  };

  // Valeur API du format depuis le libellé d'option (« 30x40 cm » -> '30x40') :
  // le back-end attend l'enum '30x40' | '60x80', jamais le libellé brut (422 sinon).
  const formatApiValue = (label) => {
    const m = String(label || '').match(/(\d{2,3})\s*[x×*]\s*(\d{2,3})/);
    return m ? `${m[1]}x${m[2]}` : '';
  };

  // Slug API de la finition (« Cadre noyer » -> 'cadre-noyer', « Sans cadre » -> 'none') :
  // même normalisation que le back-end (VariantMapping), qui refuse les libellés bruts.
  const frameApiValue = (label) => {
    const n = normalize(label).trim();
    if (!n) return '';
    if (n.indexOf('sans') !== -1) return 'none';
    return n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  // Couleurs d'équipe en TABLEAU [principale, secondaire] : l'API les renvoie en objet
  // { primary, secondary } (bibliothèque admin), la fixture mock en tableau.
  const teamColorsArray = (colors) => {
    if (Array.isArray(colors)) return colors;
    if (colors && typeof colors === 'object') {
      return [colors.primary, colors.secondary].filter(Boolean);
    }
    return null;
  };

  class CustomArtStudio extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const configNode = this.querySelector('[data-studio-config]');
      this.config = configNode ? JSON.parse(configNode.textContent) : {};
      this.i18n = this.config.i18n || {};
      // Config-driven : la liste ORDONNÉE des étapes vient du metafield studio.config (injecté
      // par la section dans config.studio). Repli foot si absent (migration progressive).
      this.studioConfig = this.config.studio && typeof this.config.studio === 'object' ? this.config.studio : null;
      // Locale courante (injectée par la section depuis request.locale) pour résoudre les
      // maps i18n {fr,en,…} de studio.config. Repli 'fr'.
      this.locale = (typeof this.config.locale === 'string' && this.config.locale) ? this.config.locale : 'fr';
      this.studioSteps = (this.studioConfig && Array.isArray(this.studioConfig.steps) && this.studioConfig.steps.length)
        ? this.studioConfig.steps
        : FOOT_FALLBACK_STEPS;
      this.stepNames = this.studioSteps.map((step) => step.name);
      this.storageKey = `mma-studio:${this.config.productId || 'product'}`;

      this.dialog = this.querySelector('[data-studio-dialog]');
      this.footer = this.querySelector('[data-studio-footer]');
      this.backButton = this.querySelector('[data-studio-back]');
      this.nextButton = this.querySelector('[data-studio-next]');
      this.stepTitle = this.querySelector('[data-step-title]');
      this.stepIndicator = this.querySelector('[data-step-indicator]'); // optionnel
      this.stepCheckpoints = this.querySelector('[data-step-checkpoints]');
      this.stepNodes = this.querySelectorAll('[data-cp-node]');
      this.stepLineFills = this.querySelectorAll('[data-cp-line-fill]');
      this.resumeNote = this.querySelector('[data-resume-note]');

      this.photoFile = null;
      this.photoObjectUrl = null;
      this.teams = null;
      this.pollTimer = null;
      this.progressTimer = null;
      this.mockupTimer = null;
      this.mockMockupTimers = [];
      this.lastFocused = null;

      this.state = {
        step: 'photo',
        screen: 'steps', // steps | wait | reveal | error | artist
        fields: {}, // valeurs génériques par step.name (config-driven), en parallèle des clés foot
        consent: false,
        teamId: null,
        teamName: null,
        teamColors: null,
        playerName: '',
        playerNumber: '',
        selectedOptions: {},
        variantId: this.config.defaultVariantId || null,
        jobId: null,
        sessionToken: null, // renvoyé par POST /jobs, joint à tous les appels suivants
        email: '', // mémorisé à la 1re saisie -> pré-rempli partout ensuite
        status: null,
        previewUrl: null,
        revealCount: 0,
        mockups: null, // [{ psd, status, url }] — streaming post-reveal
        artistRequested: null, // jobId dont la demande artiste a déjà été envoyée
      };

      this.restoreState();
      // Snapshot avant les bind : le syncVariant initial de bindFormatStep réécrit
      // state.selectedOptions depuis les radios par défaut.
      this.restoredOptions = { ...(this.state.selectedOptions || {}) };
      this.bindStickyCta();
      this.bindOpenClose();
      this.bindPhotoStep();
      this.bindTeamStep();
      this.bindNameStep();
      this.bindFormatStep();
      this.bindRevealScreen();
      this.bindErrorScreen();
      this.bindArtistScreen();
      this.applyRestoredFields();
      this.renderStepper();
    }

    disconnectedCallback() {
      this.stopTimers();
      this.ctaObserver?.disconnect();
      document.body.classList.remove(CTA_FLOATING_BODY_CLASS);
      if (this.photoObjectUrl) URL.revokeObjectURL(this.photoObjectUrl);
    }

    /* ------------------------------------------------------------------ utils */

    q(selector) {
      return this.querySelector(selector);
    }

    // Résout une valeur i18n de studio.config : chaîne brute, ou map {fr,en,…} via la locale
    // courante (repli fr puis ''). Sert aux titres/labels/erreurs pilotés par la config.
    t(value) {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') return value[this.locale] || value.fr || '';
      return '';
    }

    persist() {
      try {
        const { step, screen, consent, fields, teamId, teamName, teamColors, playerName,
          playerNumber, selectedOptions, variantId, jobId, sessionToken, email, status,
          previewUrl, revealCount, mockups, artistRequested } = this.state;
        sessionStorage.setItem(this.storageKey, JSON.stringify({
          step, screen, consent, fields, teamId, teamName, teamColors, playerName,
          playerNumber, selectedOptions, variantId, jobId, sessionToken, email, status,
          previewUrl, revealCount, mockups, artistRequested,
        }));
      } catch (e) { /* stockage indisponible (navigation privée) : non bloquant */ }
    }

    restoreState() {
      try {
        const raw = sessionStorage.getItem(this.storageKey);
        if (!raw) return;
        Object.assign(this.state, JSON.parse(raw));
        // Backfill de l'état générique depuis les clés foot historiques (sessionStorage antérieur
        // au champ `fields`) -> la validation par type reste cohérente après un reload.
        if (!this.state.fields || typeof this.state.fields !== 'object') this.state.fields = {};
        if (this.state.teamId && this.state.fields.team == null) this.state.fields.team = this.state.teamId;
        if (this.state.playerName && this.state.fields.playerName == null) this.state.fields.playerName = this.state.playerName;
        if (this.state.playerNumber && this.state.fields.playerNumber == null) this.state.fields.playerNumber = this.state.playerNumber;
        // La photo (File) n'est pas persistable : sans photo ni job en cours,
        // on repart de l'étape photo en gardant les autres réponses.
        if (!this.state.jobId && !this.state.previewUrl && this.state.step !== 'photo') {
          this.state.step = 'photo';
          this.state.screen = 'steps';
          this.shouldShowResumeNote = true;
        }
      } catch (e) { /* state corrompu : on repart à zéro */ }
    }

    clearPersisted() {
      try { sessionStorage.removeItem(this.storageKey); } catch (e) { /* no-op */ }
    }

    stopTimers() {
      clearInterval(this.pollTimer);
      clearTimeout(this.mockTimer);
      clearInterval(this.progressTimer);
      clearInterval(this.mockupTimer);
      (this.mockMockupTimers || []).forEach(clearTimeout);
      this.mockMockupTimers = [];
      this.pollTimer = this.mockTimer = this.progressTimer = this.mockupTimer = null;
    }

    /* ------------------------------------------------------------- API réelle */

    // Appel back-end : déballe l'enveloppe { success, data } et porte l'auth de session
    // (en-tête x-custom-art-session + credentials:'include') dès que le token est connu —
    // il est renvoyé par POST /jobs et mémorisé ici à chaque réponse qui le renouvelle.
    async api(path, options = {}) {
      const headers = Object.assign({}, options.headers || {});
      if (this.state.sessionToken) headers['x-custom-art-session'] = this.state.sessionToken;
      const response = await fetch(
        `${this.config.backendUrl}${path}`,
        Object.assign({}, options, { headers, credentials: 'include' }),
      );
      let payload = null;
      try { payload = await response.json(); } catch (e) { /* réponse sans corps JSON */ }
      const data = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
        ? payload.data
        : (payload && typeof payload === 'object' ? payload : {});
      const token = data.token || data.sessionToken || (payload && payload.token);
      if (token && token !== this.state.sessionToken) {
        this.state.sessionToken = token;
        this.persist();
      }
      return { response, data };
    }

    // Cap « e-mail requis » : le back-end répond 429 avec code 'email_required'
    // (contrat CustomArtController) ; les formes 403 / emailRequired restent tolérées.
    isEmailRequired(response, data) {
      return Boolean((data && (data.code === 'email_required' || data.emailRequired))
        || response.status === 403);
    }

    // Message FR propre pour les caps anti-abus (e-mail requis testé AVANT le 429
    // générique : le cap « e-mail requis » arrive lui aussi en HTTP 429).
    capsMessage(response, data) {
      if (this.isEmailRequired(response, data)) return this.i18n.error_email_required;
      if (response.status === 429) return this.i18n.error_rate_limited;
      return null;
    }

    // URL d'aperçu du contrat back-end : `preview` est une CHAÎNE (URL proxifiée avec
    // en-tête ACAO pour la texture WebGL) ; formes previewUrl / preview.url tolérées.
    previewFrom(data) {
      if (!data) return null;
      if (typeof data.preview === 'string' && data.preview) return data.preview;
      return data.previewUrl || (data.preview && data.preview.url) || null;
    }

    formatPrice(cents) {
      try {
        // Product est déclaré par `class Product {...}` au top-level de layout-product.js :
        // binding lexical global, PAS une propriété de window — d'où le test par typeof.
        if (typeof Product === 'function' && window.productPriceModel) return Product.formatPrice(cents);
      } catch (e) { /* repli local ci-dessous */ }
      const symbol = this.config.currencySymbol || '€';
      return `${(cents / 100).toFixed(2).replace('.', ',')} ${symbol}`;
    }

    /* --------------------------------------------------------- CTA flottant */

    // Même pattern que le float-buy-button (assets/main-product.js, initObserver) :
    // le CTA reste en flux quand la section est visible, et se fixe en bas d'écran
    // (mobile uniquement) quand elle sort du viewport. Pendant qu'il flotte,
    // body.studio-cta-floating masque le float-buy-button classique (input.css)
    // pour éviter deux CTA d'achat superposés sur la fiche.
    bindStickyCta() {
      const cta = this.q('[data-studio-cta]');
      if (!cta || typeof IntersectionObserver !== 'function') return;
      this.ctaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target !== this) return;
          const floating = !entry.isIntersecting;
          CTA_FLOAT_CLASSES.forEach((cls) => cta.classList.toggle(cls, floating));
          document.body.classList.toggle(CTA_FLOATING_BODY_CLASS, floating);
        });
      }, { root: null, rootMargin: '0px', threshold: 0 });
      this.ctaObserver.observe(this);
    }

    /* ----------------------------------------------------------- open / close */

    bindOpenClose() {
      this.querySelectorAll('[data-studio-open]').forEach((button) => {
        button.addEventListener('click', () => this.open());
      });
      this.q('[data-studio-close]')?.addEventListener('click', () => this.attemptClose());
      this.q('[data-studio-backdrop]')?.addEventListener('click', () => this.attemptClose());
      // Fermeture au clic sur le flou : même mécanique que le cart-drawer — l'overlay global
      // du thème dispatche l'event 'overlayClick' (cf. tw-global.js). On ne réagit que si le
      // studio est ouvert (l'overlay est partagé avec le panier / les menus).
      document.addEventListener('overlayClick', () => {
        if (this.dialog && !this.dialog.classList.contains('hidden')) this.attemptClose();
      });
      this.onKeydown = this.onKeydown.bind(this);
    }

    open() {
      this.lastFocused = document.activeElement;
      // Visibilité par TOGGLE de `flex` (ajouté ici, retiré à la fermeture) : elle ne peut PAS
      // reposer sur le seul `hidden`, car une classe `md:flex` en dur l'emporterait sur `hidden`
      // en desktop -> dialogue ouvert par défaut. Fermé = `hidden`, ouvert = `flex`.
      this.dialog.classList.remove('hidden');
      this.dialog.classList.add('flex');
      // Flou d'arrière-plan : on RÉUTILISE l'overlay global du thème (#overlay-content,
      // posé au niveau du layout -> son backdrop-filter fonctionne, contrairement à un fond
      // interne à la section que des parents transformés cassent). Même mécanisme que le
      // cart-drawer / les menus. Blur renforcé pour le studio, réinitialisé à la fermeture.
      const overlay = document.getElementById('overlay-content');
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.backdropFilter = 'blur(6px)';
        overlay.style.webkitBackdropFilter = 'blur(6px)';
      }
      document.body.classList.add('overflow-hidden');
      this.dialog.addEventListener('keydown', this.onKeydown);

      if (this.shouldShowResumeNote && this.resumeNote) {
        this.resumeNote.hidden = false;
        this.shouldShowResumeNote = false;
      }

      if (this.state.screen === 'artist' && this.state.jobId) {
        this.showArtist();
      } else if (this.state.screen === 'reveal' && this.state.previewUrl) {
        this.showReveal(this.state.previewUrl, false);
        // Reprise du streaming des mises en situation interrompu par la fermeture.
        if (this.config.mock) {
          if (!this.mockupsSettled(this.state.mockups)) this.resetMockMockups();
        } else {
          this.startMockupWatch();
        }
      } else if (this.state.screen === 'wait' && this.state.jobId && !this.config.mock) {
        this.showScreen('wait');
        this.startWaitProgress(REAL_DURATION_ESTIMATE);
        this.startPolling();
      } else {
        this.state.screen = 'steps';
        this.showStep(this.state.step);
      }
      this.q('[data-studio-close]')?.focus();
    }

    attemptClose() {
      // Fermeture immédiate, sans confirmation : l'état est persisté (sessionStorage) et les
      // saisies restent en mémoire -> l'utilisateur rouvre exactement là où il s'était arrêté.
      // (Le window.confirm précédent était une friction inutile : rien n'est jamais perdu.)
      this.close();
    }

    close() {
      this.stopTimers();
      // En mock, le « job » n'existe pas côté serveur : on revient aux étapes.
      if (this.state.screen === 'wait' && this.config.mock) this.state.screen = 'steps';
      this.persist();
      this.dialog.classList.add('hidden');
      this.dialog.classList.remove('flex');
      const overlay = document.getElementById('overlay-content');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.backdropFilter = '';
        overlay.style.webkitBackdropFilter = '';
      }
      this.dialog.removeEventListener('keydown', this.onKeydown);
      document.body.classList.remove('overflow-hidden');
      this.lastFocused?.focus?.();
    }

    onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.attemptClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = this.getFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (typeof window.trapFocus === 'function') {
        window.trapFocus(event, first, last);
        return;
      }
      // Repli local (harness hors thème) — même logique que tw-global.js.
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }

    getFocusables() {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(this.dialog.querySelectorAll(selector))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    /* ------------------------------------------------------- machine à états */

    showStep(stepName) {
      this.stopTimers();
      this.state.screen = 'steps';
      this.state.step = stepName;

      this.querySelectorAll('[data-studio-screen]').forEach((screen) => { screen.hidden = true; });
      this.querySelectorAll('[data-studio-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.studioPanel !== stepName;
      });

      const index = this.stepNames.indexOf(stepName);
      this.stepTitle.textContent = this.t((this.studioSteps[index] || {}).title) || (this.config.stepTitles || {})[stepName] || '';
      if (this.stepIndicator) {
        this.stepIndicator.hidden = false;
        this.stepIndicator.textContent = (this.i18n.step_indicator || '')
          .replace('[step]', index + 1)
          .replace('[total]', this.stepNames.length);
      }
      this.updateCheckpoints(index);

      // classe + attribut : la classe Tailwind `flex` du footer/dots écrase l'attribut hidden seul.
      this.footer.hidden = false;
      this.footer.classList.remove('hidden');
      this.backButton.hidden = index === 0;
      this.nextButton.textContent = index === this.stepNames.length - 1 ? this.i18n.generate : this.i18n.next;
      this.updateNextDisabled();

      if (stepName === 'team' && !this.teams) this.loadTeams();
      this.persist();
    }

    // Construit le stepper (pastilles + connecteurs) DEPUIS la config -> nombre d'étapes VARIABLE,
    // labels depuis checkpointLabel (i18n). Re-requête les noeuds après (re)génération du markup.
    renderStepper() {
      const ol = this.stepCheckpoints;
      if (!ol) return;
      ol.innerHTML = this.studioSteps.map((step, i) => {
        const connector = i === 0 ? ''
          : '<span class="absolute left-[-50%] right-1/2 top-[13px] h-0.5 overflow-hidden rounded-full bg-main-10"><span data-cp-line-fill class="block h-full w-0 rounded-full bg-buy-button transition-[width] duration-500 ease-out motion-reduce:transition-none"></span></span>';
        const label = escapeHtml(this.t(step.checkpointLabel) || this.t(step.title) || '');
        return `<li class="relative flex flex-1 flex-col items-center text-center">${connector}`
          + '<span data-cp-node class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-main-20 bg-secondary text-2xs font-bold text-main-50 transition-all duration-300 motion-reduce:transition-none">'
          + `<span data-cp-num class="absolute transition-all duration-300 motion-reduce:transition-none">${i + 1}</span>`
          + `<span data-cp-check class="absolute flex items-center justify-center text-main opacity-0 scale-50 transition-all duration-300 motion-reduce:transition-none">${STEP_CHECK_SVG}</span>`
          + '</span>'
          + `<span class="mt-2 text-2xs leading-tight text-main-70">${label}</span></li>`;
      }).join('');
      this.stepNodes = this.querySelectorAll('[data-cp-node]');
      this.stepLineFills = this.querySelectorAll('[data-cp-line-fill]');
    }

    /* Pastilles numérotées + connecteurs : passé = rempli (couleur marque), courant = mis en
       avant, à venir = atténué ; les connecteurs se remplissent à mesure -> progression nette. */
    updateCheckpoints(index) {
      if (this.stepCheckpoints) {
        this.stepCheckpoints.hidden = false;
        this.stepCheckpoints.classList.remove('hidden');
      }
      if (this.stepNodes) {
        this.stepNodes.forEach((node, i) => {
          const done = i < index;
          const current = i === index;
          const upcoming = i > index;
          // Fond TOUJOURS opaque (masque le connecteur qui passe derrière) : aplat couleur de
          // marque quand validé, blanc sinon. La couleur de marque (salmon clair) sert d'aplat,
          // jamais de texte -> numéro et coche en brun foncé (text-main) pour rester lisibles.
          node.classList.toggle('bg-buy-button', done);
          node.classList.toggle('bg-secondary', !done);
          node.classList.toggle('border-buy-button', done || current);
          node.classList.toggle('border-main-20', upcoming);
          // Halo doux autour de l'étape en cours.
          node.classList.toggle('ring-4', current);
          node.classList.toggle('ring-buy-button-20', current);
          // Numéro : lisible (brun foncé) en cours, atténué pour les étapes à venir.
          node.classList.toggle('text-main', current);
          node.classList.toggle('text-main-50', upcoming);
          // Chiffre -> coche : cross-fade + léger pop (les deux sont superposés au même centre).
          const num = node.querySelector('[data-cp-num]');
          const check = node.querySelector('[data-cp-check]');
          if (num) {
            num.classList.toggle('opacity-0', done);
            num.classList.toggle('scale-50', done);
          }
          if (check) {
            check.classList.toggle('opacity-0', !done);
            check.classList.toggle('scale-50', !done);
          }
        });
      }
      if (this.stepLineFills) {
        // Le connecteur n°j précède l'étape (j+1) : rempli dès qu'on a atteint cette étape.
        this.stepLineFills.forEach((fill, j) => {
          fill.style.width = index >= j + 1 ? '100%' : '0%';
        });
      }
    }

    showScreen(screenName) {
      this.state.screen = screenName;
      this.querySelectorAll('[data-studio-panel]').forEach((panel) => { panel.hidden = true; });
      this.querySelectorAll('[data-studio-screen]').forEach((screen) => {
        screen.hidden = screen.dataset.studioScreen !== screenName;
      });
      this.footer.hidden = true;
      this.footer.classList.add('hidden');
      if (this.stepIndicator) this.stepIndicator.hidden = true;
      if (this.stepCheckpoints) {
        this.stepCheckpoints.hidden = true;
        this.stepCheckpoints.classList.add('hidden');
      }
      const heading = this.q(`[data-studio-screen="${screenName}"] h3`);
      if (heading) this.stepTitle.textContent = heading.textContent;
      this.persist();
    }

    stepIsValid(stepName) {
      const step = (this.studioSteps || []).find((s) => s.name === stepName);
      return step ? this.stepTypeValid(step) : false;
    }

    // Validation GÉNÉRIQUE pilotée par le TYPE d'étape (config-driven) : contraintes lues dans
    // l'objet step (consent, minLength, min/max…), valeur dans state.fields[name] (sauf photo =
    // File à part, format = variantId). Un groupe valide ses enfants (ET logique).
    stepTypeValid(step) {
      const fields = this.state.fields || {};
      switch (step.type) {
        case 'photo': {
          const consentOk = !step.consent || step.consent.required === false || this.state.consent;
          return Boolean(this.photoFile && consentOk);
        }
        case 'choice':
          return step.required === false ? true : Boolean(fields[step.name]);
        case 'text': {
          const v = String(fields[step.name] || '').trim();
          if (!v) return step.required === false;
          if (step.minLength && v.length < step.minLength) return false;
          if (step.maxLength && v.length > step.maxLength) return false;
          return true;
        }
        case 'number': {
          const raw = fields[step.name];
          if (raw === '' || raw == null) return step.required === false;
          const n = parseInt(raw, 10);
          if (!Number.isInteger(n)) return false;
          if (step.min != null && n < step.min) return false;
          if (step.max != null && n > step.max) return false;
          return true;
        }
        case 'date':
          return fields[step.name] ? true : step.required === false;
        case 'format':
          return Boolean(this.state.variantId);
        case 'group':
          return (step.children || []).every((child) => this.stepTypeValid(child));
        default:
          return false;
      }
    }

    updateNextDisabled() {
      if (this.state.screen !== 'steps') return;
      this.nextButton.disabled = !this.stepIsValid(this.state.step);
    }

    bindErrorScreen() {
      this.backButton.addEventListener('click', () => {
        const index = this.stepNames.indexOf(this.state.step);
        if (index > 0) this.showStep(this.stepNames[index - 1]);
      });
      this.nextButton.addEventListener('click', () => {
        if (!this.stepIsValid(this.state.step)) return;
        const index = this.stepNames.indexOf(this.state.step);
        if (index === this.stepNames.length - 1) this.startGeneration();
        else this.showStep(this.stepNames[index + 1]);
      });
      this.q('[data-studio-retry]')?.addEventListener('click', () => this.showStep('photo'));
      // Cap « 3e essai+ = e-mail requis » : l'e-mail saisi débloque et relance la génération.
      this.q('[data-error-email-form]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = this.q('[data-error-email]');
        if (!input || !input.checkValidity()) {
          input?.reportValidity();
          return;
        }
        this.state.email = input.value;
        this.persist();
        this.startGeneration();
      });
    }

    /* ---------------------------------------------------------- étape photo */

    bindPhotoStep() {
      this.querySelectorAll('[data-photo-input]').forEach((input) => {
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (file) this.handlePhoto(file);
          input.value = '';
        });
      });
      this.q('[data-photo-replace]')?.addEventListener('click', () => {
        this.querySelectorAll('[data-photo-input]')[this.querySelectorAll('[data-photo-input]').length - 1]?.click();
      });
      const consent = this.q('[data-consent]');
      consent?.addEventListener('change', () => {
        this.state.consent = consent.checked;
        this.setPhotoError(null);
        this.persist();
        this.updateNextDisabled();
      });
    }

    async handlePhoto(file) {
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
        || (!file.type && HEIC_EXT.test(file.name));
      if (!ACCEPTED_TYPES.includes(file.type) && !isHeic) {
        this.setPhotoError(this.i18n.photo_error_type);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.setPhotoError(this.i18n.photo_error_size);
        return;
      }

      const dimensions = await this.readImageSize(file);
      if (dimensions && (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION)) {
        this.setPhotoError(this.i18n.photo_error_small);
        return;
      }
      if (!dimensions && !isHeic) {
        this.setPhotoError(this.i18n.photo_error_unreadable);
        return;
      }

      this.photoFile = file;
      this.setPhotoError(null);

      const wrapper = this.q('[data-photo-preview-wrapper]');
      const preview = this.q('[data-photo-preview]');
      if (this.photoObjectUrl) URL.revokeObjectURL(this.photoObjectUrl);
      if (dimensions) {
        this.photoObjectUrl = URL.createObjectURL(file);
        preview.src = this.photoObjectUrl;
        wrapper.hidden = false;
      } else {
        // HEIC non décodable par le navigateur : pas d'aperçu, mais fichier accepté.
        wrapper.hidden = true;
      }
      this.persist();
      this.updateNextDisabled();
    }

    readImageSize(file) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        image.src = url;
      });
    }

    setPhotoError(message) {
      const zone = this.q('[data-photo-error]');
      if (!zone) return;
      zone.textContent = message || '';
      zone.hidden = !message;
    }

    /* ---------------------------------------------------------- étape équipe */

    bindTeamStep() {
      this.q('[data-team-search]')?.addEventListener('input', (event) => {
        this.renderTeams(event.target.value);
      });
      this.q('[data-team-retry]')?.addEventListener('click', () => this.loadTeams());
      // Délégation : les radios équipe sont générées dynamiquement.
      this.q('[data-team-grid]')?.addEventListener('change', (event) => {
        const input = event.target.closest('[data-team-input]');
        if (!input) return;
        const team = (this.teams || []).find((item) => String(item.id) === input.value);
        if (!team) return;
        this.state.teamId = team.id;
        this.state.teamName = team.name;
        this.state.teamColors = team.colors;
        this.state.fields.team = team.id;
        this.updateTeamConfirm();
        const requiredError = this.q('[data-team-required-error]');
        if (requiredError) requiredError.hidden = true;
        this.updateJersey();
        this.persist();
        this.updateNextDisabled();
      });
    }

    async loadTeams() {
      const loading = this.q('[data-team-loading]');
      const errorZone = this.q('[data-team-error]');
      loading.hidden = false;
      errorZone.hidden = true;
      try {
        if (this.config.mock) {
          this.teams = MOCK_TEAMS;
        } else {
          const { response, data } = await this.api('/api/custom-art/teams');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const teams = Array.isArray(data) ? data : data.teams || [];
          // Couleurs normalisées en tableau (l'API les renvoie en objet primary/secondary).
          this.teams = teams.map((team) => Object.assign({}, team, {
            colors: teamColorsArray(team.colors),
          }));
        }
        loading.hidden = true;
        this.renderTeams(this.q('[data-team-search]')?.value || '');
      } catch (e) {
        loading.hidden = true;
        errorZone.hidden = false;
      }
    }

    renderTeams(filterValue) {
      const grid = this.q('[data-team-grid]');
      const empty = this.q('[data-team-empty]');
      if (!grid || !this.teams) return;
      const filter = normalize(filterValue);
      const matches = this.teams.filter((team) => {
        if (!filter) return true;
        const haystack = [team.name, team.slug, ...(team.aliases || [])].map(normalize).join(' ');
        return haystack.includes(filter);
      });

      grid.innerHTML = matches.map((team) => {
        const colors = team.colors || ['#444444', '#dddddd'];
        const checked = String(team.id) === String(this.state.teamId) ? ' checked' : '';
        // Carte CLIQUABLE (relief neu + bordure + hover + active) avec crest bicolore + nom.
        // Sélection à indices REDONDANTS (jamais la couleur seule) : bordure terra (brun foncé,
        // contraste AA) + teinte marque via has-[:checked] sur la carte ; BADGE COCHE + nom en
        // gras via peer-checked (dégradation gracieuse si :has() indisponible). Couleurs d'équipe
        // = style inline (dynamiques). data-allow-empty : le crest n'a pas d'enfant (fond seul) ->
        // exempté de la règle globale *:empty{display:none}.
        return `<li>
          <label class="group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-main-10 bg-secondary p-2.5 text-center shadow-neu-xs transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-main-5 hover:shadow-neu-md active:scale-[0.98] has-[:checked]:border-terra has-[:checked]:bg-buy-button-10 has-[:checked]:shadow-neu-md motion-reduce:transition-none motion-reduce:active:scale-100">
            <input type="radio" name="studio-team" value="${escapeHtml(team.id)}" class="peer sr-only" data-team-input${checked}>
            <span class="pointer-events-none absolute right-1.5 top-1.5 z-10 hidden h-5 w-5 place-items-center rounded-full bg-terra text-secondary shadow-neu-xs peer-checked:grid" aria-hidden="true">${CHECK_SVG_INLINE}</span>
            <span class="block h-14 w-14 overflow-hidden rounded-full border border-main-20 shadow-neu-xs peer-focus-visible:ring-2 peer-focus-visible:ring-main peer-focus-visible:ring-offset-2 sm:h-16 sm:w-16" aria-hidden="true">${crestSvg(colors[0], colors[1] || colors[0])}</span>
            <span class="line-clamp-2 min-h-[2rem] text-xs font-medium leading-tight text-main-80 peer-checked:font-bold peer-checked:text-main">${escapeHtml(team.name)}</span>
          </label>
        </li>`;
      }).join('');
      empty.hidden = matches.length > 0;
      this.updateTeamConfirm();
    }

    // Confirmation persistante du choix : « Équipe sélectionnée : <nom> » + mini-crest des vraies
    // couleurs. Appelée au changement de sélection ET en fin de renderTeams (filtre/restauration).
    updateTeamConfirm() {
      const box = this.q('[data-team-confirm]');
      if (!box) return;
      if (!this.state.teamId) {
        box.classList.add('hidden');
        box.classList.remove('flex');
        return;
      }
      const nameEl = this.q('[data-team-confirm-name]');
      const swatch = this.q('[data-team-confirm-swatch]');
      if (nameEl) nameEl.textContent = this.state.teamName || '';
      if (swatch) {
        const c = this.state.teamColors || ['#444444', '#dddddd'];
        swatch.innerHTML = crestSvg(c[0], c[1] || c[0]);
      }
      box.classList.remove('hidden');
      box.classList.add('flex');
    }

    /* ------------------------------------------------ étape prénom + numéro */

    bindNameStep() {
      const nameInput = this.q('[data-player-name]');
      const numberInput = this.q('[data-player-number]');

      nameInput?.addEventListener('input', () => {
        // Auto-majuscules + charset lettres / espaces / tirets / apostrophes, 12 max.
        const cleaned = nameInput.value
          .toLocaleUpperCase('fr')
          .replace(/[^A-ZÀ-ÖØ-ÞŒÆ' -]/g, '')
          .slice(0, 12);
        if (nameInput.value !== cleaned) nameInput.value = cleaned;
        this.state.playerName = cleaned;
        this.state.fields.playerName = cleaned;
        this.setNameError(null);
        this.updateJersey();
        this.persist();
        this.updateNextDisabled();
      });

      numberInput?.addEventListener('input', () => {
        const digits = numberInput.value.replace(/\D/g, '').slice(0, 2);
        if (numberInput.value !== digits) numberInput.value = digits;
        this.state.playerNumber = digits;
        this.state.fields.playerNumber = digits;
        this.setNameError(null);
        this.updateJersey();
        this.persist();
        this.updateNextDisabled();
      });
    }

    setNameError(message) {
      const zone = this.q('[data-name-error]');
      if (!zone) return;
      zone.textContent = message || '';
      zone.hidden = !message;
    }

    updateJersey() {
      const body = this.q('[data-jersey-body]');
      const nameText = this.q('[data-jersey-name]');
      const numberText = this.q('[data-jersey-number]');
      if (!body || !nameText || !numberText) return;
      const colors = this.state.teamColors;
      if (colors) {
        // Couleurs d'équipe = données dynamiques → fill inline (par-dessus fill-main/fill-secondary).
        body.style.fill = colors[0];
        nameText.style.fill = colors[1] || '#ffffff';
        numberText.style.fill = colors[1] || '#ffffff';
      }
      if (this.state.playerName) nameText.textContent = this.state.playerName;
      if (this.state.playerNumber) numberText.textContent = this.state.playerNumber;
    }

    /* ------------------------------------------- étape format + finition */

    bindFormatStep() {
      this.querySelectorAll('[data-studio-option]').forEach((radio) => {
        radio.addEventListener('change', () => this.syncVariant());
      });
      this.syncVariant();
    }

    selectedOptionValues() {
      const values = {};
      this.querySelectorAll('[data-studio-option]:checked').forEach((radio) => {
        values[radio.dataset.optionPosition] = radio.value;
      });
      return values;
    }

    // Valeur de l'option cochée dont le NOM matche le motif (data-option-name émis par
    // le Liquid). L'ordre des options du produit Shopify n'est pas garanti : ne jamais
    // supposer « option1 = Format, option2 = Finition ».
    selectedOptionByName(pattern) {
      const radio = Array.from(this.querySelectorAll('[data-studio-option]:checked'))
        .find((candidate) => pattern.test(normalize(candidate.dataset.optionName || '')));
      return radio ? radio.value : '';
    }

    syncVariant() {
      const priceZone = this.q('[data-studio-price]');
      const unavailable = this.q('[data-variant-unavailable]');
      if (this.config.hasOnlyDefaultVariant) {
        this.state.variantId = this.config.defaultVariantId;
        this.persist();
        this.updateNextDisabled();
        return;
      }
      const selected = this.selectedOptionValues();
      this.state.selectedOptions = selected;
      const variant = (this.config.variants || []).find((candidate) =>
        (!selected['1'] || candidate.option1 === selected['1'])
        && (!selected['2'] || candidate.option2 === selected['2'])
        && (!selected['3'] || candidate.option3 === selected['3']));

      if (variant && variant.available !== false) {
        this.state.variantId = variant.id;
        if (priceZone) priceZone.textContent = this.formatPrice(variant.price);
        const revealPrice = this.q('[data-reveal-price]');
        if (revealPrice) revealPrice.textContent = this.formatPrice(variant.price);
        if (unavailable) unavailable.hidden = true;
      } else {
        this.state.variantId = null;
        if (unavailable) unavailable.hidden = false;
      }
      this.persist();
      this.updateNextDisabled();
    }

    /* ------------------------------------------------------------ génération */

    // Assemble le FormData de génération depuis la config (steps + state.fields + résolution
    // format/frame). Reproduit EXACTEMENT le payload foot (mêmes champs/valeurs/ORDRE) -> zéro
    // régression back-end ; se généralise aux autres produits via leurs steps/payloadKey.
    buildPayload() {
      const fd = new FormData();
      const fields = this.state.fields || {};
      const appendStep = (step) => {
        const key = step.payloadKey || step.name;
        switch (step.type) {
          case 'photo':
            if (this.photoFile) fd.append(key, this.photoFile);
            break;
          case 'choice':
          case 'text':
          case 'number':
          case 'date': {
            const v = fields[step.name];
            if (v != null && v !== '') fd.append(key, v);
            break;
          }
          case 'group':
            (step.children || []).forEach(appendStep);
            break;
          case 'format':
            // Format/finition en SECOURS (slug API), résolus par nom d'option ; la variante reste
            // la source de vérité (variantId), envoyée APRÈS (ordre identique au foot actuel).
            (step.roles || []).forEach((role) => {
              const label = this.selectedOptionByName(role.role === 'frame' ? OPTION_FRAME_RE : OPTION_FORMAT_RE);
              const value = role.resolve === 'slug' ? frameApiValue(label) : formatApiValue(label);
              if (value) fd.append(role.payloadKey || role.role, value);
            });
            if (this.state.variantId) fd.append('variantId', this.state.variantId);
            break;
          default:
            break;
        }
      };
      this.studioSteps.forEach(appendStep);
      const extra = (this.studioConfig && this.studioConfig.payload && this.studioConfig.payload.extra)
        || FOOT_FALLBACK_PAYLOAD_EXTRA;
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
      if (this.state.email) fd.append('email', this.state.email);
      return fd;
    }

    async startGeneration() {
      // Étape incomplète (ex. photo perdue après restauration) : on y ramène l'utilisateur.
      const firstInvalid = this.stepNames.find((step) => !this.stepIsValid(step));
      if (firstInvalid) {
        this.showStep(firstInvalid);
        return;
      }
      this.showScreen('wait');

      if (this.config.mock) {
        this.startWaitProgress(MOCK_DURATION);
        this.mockTimer = setTimeout(() => {
          this.state.jobId = `mock-${Date.now()}`;
          this.state.revealCount = 0;
          // Scénario de test de l'écran artiste (manual_review) : prénom « ARTISTE ».
          if (this.state.playerName.trim() === MOCK_MANUAL_REVIEW_NAME) {
            this.state.status = 'manual_review';
            this.persist();
            this.showArtist();
            return;
          }
          this.showReveal(this.mockArtworkUrl(0));
          this.resetMockMockups();
        }, MOCK_DURATION);
        return;
      }

      this.startWaitProgress(REAL_DURATION_ESTIMATE);
      try {
        // Payload assemblé depuis la config (cf. buildPayload) : identique au foot (mêmes
        // champs/valeurs/ordre), généralisé aux autres produits via leurs steps.
        const formData = this.buildPayload();
        const { response, data } = await this.api('/api/custom-art/jobs', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const caps = this.capsMessage(response, data);
          if (caps) {
            // E-mail requis : l'e-mail débloque l'essai -> formulaire sur l'écran d'erreur.
            this.showError(caps, { emailRequired: this.isEmailRequired(response, data) });
            return;
          }
          // Pré-checks back-end (visage non détecté, photo refusée…) : message du serveur.
          this.showError(data.error || data.message || this.i18n.generation_error);
          return;
        }
        // Le token de session renvoyé ici est mémorisé par api() et joint à tout le reste.
        this.state.jobId = data.jobId || data.uuid || data.id;
        this.state.revealCount = 0;
        this.state.mockups = null;
        this.state.status = data.status || 'pending';
        this.persist();
        this.startPolling();
      } catch (e) {
        this.showError(this.i18n.generation_error);
      }
    }

    startPolling() {
      clearInterval(this.pollTimer);
      this.pollStartedAt = Date.now();
      this.pollErrorCount = 0;
      this.pollTimer = setInterval(() => this.pollJob(), POLL_INTERVAL);
    }

    async pollJob() {
      // Garde-fou : job jamais conclu (worker bloqué…) -> on ne polle pas indéfiniment.
      if (Date.now() - this.pollStartedAt > POLL_TIMEOUT) {
        clearInterval(this.pollTimer);
        this.showError(this.i18n.generation_error);
        return;
      }
      try {
        const { response, data } = await this.api(`/api/custom-art/jobs/${this.state.jobId}`);
        if (response.status === 404 || response.status === 410) {
          clearInterval(this.pollTimer);
          this.showError(this.i18n.generation_error);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.pollErrorCount = 0;
        this.state.status = data.status;
        if (data.status === 'ready') {
          clearInterval(this.pollTimer);
          this.state.mockups = Array.isArray(data.mockups) ? data.mockups : this.state.mockups;
          this.showReveal(this.previewFrom(data));
          this.startMockupWatch();
        } else if (data.status === 'manual_review' || data.status === 'failed') {
          // Échec définitif OU photo à confier à un artiste (décision plan §0.15).
          clearInterval(this.pollTimer);
          this.persist();
          this.showArtist();
        } else if (data.status === 'expired') {
          clearInterval(this.pollTimer);
          this.showError(data.message || data.error || this.i18n.generation_error);
        }
        // pending / generating / judging : on laisse la barre storytelling avancer.
      } catch (e) {
        // Erreur réseau ponctuelle : on retente au tick suivant — mais pas indéfiniment.
        this.pollErrorCount = (this.pollErrorCount || 0) + 1;
        if (this.pollErrorCount >= POLL_MAX_NETWORK_ERRORS) {
          clearInterval(this.pollTimer);
          this.showError(this.i18n.generation_error);
        }
      }
    }

    startWaitProgress(duration) {
      const bar = this.q('[data-wait-bar]');
      const text = this.q('[data-wait-text]');
      const phases = this.config.waitPhases || [];
      const startedAt = Date.now();
      let phaseIndex = -1;
      const tick = () => {
        const elapsed = Date.now() - startedAt;
        const percent = Math.min(90, (elapsed / duration) * 90);
        if (bar) bar.style.width = `${percent}%`;
        const nextPhase = Math.min(phases.length - 1, Math.floor((percent / 90) * phases.length));
        if (nextPhase !== phaseIndex) {
          phaseIndex = nextPhase;
          if (text) text.textContent = phases[phaseIndex] || '';
        }
      };
      tick();
      clearInterval(this.progressTimer);
      this.progressTimer = setInterval(tick, 500);
    }

    showError(message, options = {}) {
      this.stopTimers();
      const zone = this.q('[data-error-message]');
      if (zone && message) zone.textContent = message;
      // Cap « e-mail requis » : formulaire e-mail directement sur l'écran d'erreur,
      // pré-rempli si l'adresse est déjà connue ; sa soumission relance la génération.
      const emailForm = this.q('[data-error-email-form]');
      if (emailForm) {
        emailForm.hidden = !options.emailRequired;
        if (options.emailRequired) {
          const input = this.q('[data-error-email]');
          if (input && this.state.email && !input.value) input.value = this.state.email;
        }
      }
      this.showScreen('error');
    }

    /* ------------------------------------------------------------ révélation */

    showReveal(url, persistState = true) {
      this.stopTimers();
      const bar = this.q('[data-wait-bar]');
      if (bar) bar.style.width = '100%';
      this.state.previewUrl = url;
      this.state.status = 'ready';
      const image = this.q('[data-reveal-image]');
      if (image && url) {
        image.src = url;
        image.hidden = false;
      }
      const feedback = this.q('[data-reveal-feedback]');
      if (feedback) feedback.hidden = true;
      this.mountPerspective(url);
      this.renderMockups();
      this.showScreen('reveal');
      if (persistState) this.persist();
    }

    /* --------------------------------------------------- reveal WebGL (3D) */

    webglAvailable() {
      if (this._webglAvailable !== undefined) return this._webglAvailable;
      try {
        const probe = document.createElement('canvas');
        this._webglAvailable = Boolean(
          window.WebGLRenderingContext
          && (probe.getContext('webgl') || probe.getContext('experimental-webgl')),
        );
      } catch (e) {
        this._webglAvailable = false;
      }
      return this._webglAvailable;
    }

    // Repli image + cadre CSS : la bordure de la figure prend la teinte de la finition
    // choisie (donnée produit dynamique -> style inline, pas d'équivalent Tailwind).
    applyFallbackFrame() {
      const frame = this.q('[data-reveal-frame]');
      if (!frame) return;
      const color = frameFallbackColor(this.selectedOptionByName(OPTION_FRAME_RE));
      frame.style.borderColor = color || 'transparent';
    }

    // Monte le visualiseur 3D (toile + cadre/format choisis) avec l'aperçu généré en
    // texture — pattern « popup » de tw-main-product-perspective : le nœud
    // <perspective-canvas> est RECRÉÉ à chaque reveal (l'ancien libère son contexte GL
    // via disconnectedCallback). Le slot reste caché tant que le 1er rendu n'est pas
    // présenté (évènement perspective:ready) : si le WebGL est indisponible
    // (motion-reduce, vieux mobile, Save-Data, texture refusée), la figure image + cadre
    // CSS reste le rendu final. L'URL d'aperçu DOIT être servie CORS-ok (crossorigin
    // anonymous géré par component-perspective-canvas).
    mountPerspective(url) {
      const slot = this.q('[data-studio-webgl-slot]');
      const figure = this.q('[data-reveal-figure]');
      this.applyFallbackFrame();
      if (figure) figure.hidden = false;
      if (!slot) return;
      slot.hidden = true;
      slot.innerHTML = '';
      if (!url) return;
      if (!customElements.get('perspective-canvas')) return; // script non chargé (repli)
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!this.webglAvailable()) return;

      const cfg = {
        ariaLabel: this.i18n.webgl_preview_label,
        raw: { src: url },
        // État FIGÉ (pas de painting-variant-picker dans le studio) : finition + format
        // résolus par NOM d'option, interprétés par syncStateFromDOM (config.state).
        state: {
          border: 'white',
          frame: this.selectedOptionByName(OPTION_FRAME_RE),
          size: this.selectedOptionByName(OPTION_FORMAT_RE),
        },
      };
      // Chevrons échappés : un « </script> » dans le JSON inline casserait le parsing HTML.
      const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
      slot.innerHTML = '<perspective-canvas class="block w-full" data-context="studio">'
        + `<canvas class="perspective-canvas-gl block w-full aspect-square opacity-0 transition-opacity duration-500 ease-out" role="img" aria-label="${escapeHtml(this.i18n.webgl_preview_label)}">${escapeHtml(this.i18n.webgl_canvas_caption)}</canvas>`
        + `<script type="application/json" class="perspective-config">${json}</scr` + 'ipt>'
        + '</perspective-canvas>';
      slot.addEventListener('perspective:ready', () => {
        slot.hidden = false;
        if (figure) figure.hidden = true;
      }, { once: true });
    }

    /* ------------------------------------------- mises en situation (mockups) */

    mockupsSettled(list) {
      return !list || !list.length
        || list.every((m) => !m || m.status === 'done' || m.status === 'failed' || (!m.status && m.url));
    }

    // Streaming réel : on continue d'interroger le job après le reveal pour remplir la
    // galerie au fil des rendus du moteur externe. Moteur down -> au bout du délai, les
    // squelettes restants sont retirés (le reveal et le panier n'en dépendent jamais).
    startMockupWatch() {
      if (this.config.mock) return;
      clearInterval(this.mockupTimer);
      if (!this.state.jobId) return;
      if (Array.isArray(this.state.mockups) && this.state.mockups.length
        && this.mockupsSettled(this.state.mockups)) return; // déjà complets
      this.mockupWatchStartedAt = Date.now();
      this.mockupTimer = setInterval(() => this.pollMockups(), MOCKUP_POLL_INTERVAL);
    }

    async pollMockups() {
      if (this.state.screen !== 'reveal' || !this.state.jobId) {
        clearInterval(this.mockupTimer);
        return;
      }
      if (Date.now() - this.mockupWatchStartedAt > MOCKUP_TIMEOUT) {
        clearInterval(this.mockupTimer);
        this.state.mockups = (this.state.mockups || [])
          .filter((m) => m && m.url && (m.status === 'done' || !m.status));
        this.persist();
        this.renderMockups();
        return;
      }
      try {
        const { response, data } = await this.api(`/api/custom-art/jobs/${this.state.jobId}`);
        if (!response.ok) return; // tick suivant
        if (Array.isArray(data.mockups)) {
          this.state.mockups = data.mockups;
          this.persist();
          this.renderMockups();
        }
        const list = this.state.mockups || [];
        if (list.length && this.mockupsSettled(list)) clearInterval(this.mockupTimer);
      } catch (e) { /* erreur réseau ponctuelle : tick suivant */ }
    }

    renderMockups() {
      const zone = this.q('[data-mockup-zone]');
      const grid = this.q('[data-mockup-grid]');
      if (!zone || !grid) return;
      const items = (this.state.mockups || []).filter((m) => m && m.status !== 'failed');
      if (!items.length) {
        zone.hidden = true;
        grid.innerHTML = '';
        this._mockupSig = '';
        return;
      }
      // Signature : on ne re-rend (et re-décode les images) que si quelque chose a changé.
      const sig = JSON.stringify(items.map((m) => [m.status || '', m.url || '']));
      if (sig === this._mockupSig) return;
      this._mockupSig = sig;
      zone.hidden = false;
      grid.innerHTML = items.map((m) => {
        const done = m.url && (m.status === 'done' || !m.status);
        if (done) {
          // Lien zoom : la mise en situation s'ouvre en grand dans un nouvel onglet.
          return `<li>
            <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener"
              class="group block overflow-hidden rounded-xl border border-main-10 shadow-neu-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main"
              aria-label="${escapeHtml(this.i18n.mockup_zoom)}">
              <img src="${escapeHtml(m.url)}" alt="${escapeHtml(this.i18n.mockup_alt)}"
                width="600" height="600" loading="lazy" decoding="async"
                class="aspect-square w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105">
            </a>
          </li>`;
        }
        // Cellule squelette : se remplit au fil du streaming.
        return `<li>
          <div class="aspect-square w-full animate-pulse rounded-xl bg-main-10 motion-reduce:animate-none" role="status" aria-label="${escapeHtml(this.i18n.mockups_loading)}"></div>
        </li>`;
      }).join('');
    }

    // Mock : 3 mises en situation simulées qui « tombent » en streaming (~1,4 s d'écart).
    resetMockMockups() {
      (this.mockMockupTimers || []).forEach(clearTimeout);
      this.mockMockupTimers = [];
      this.state.mockups = [{ status: 'rendering' }, { status: 'rendering' }, { status: 'rendering' }];
      this.persist();
      this.renderMockups();
      this.state.mockups.forEach((mockup, index) => {
        this.mockMockupTimers.push(setTimeout(() => {
          mockup.status = 'done';
          mockup.url = this.mockMockupUrl(index);
          this.persist();
          this.renderMockups();
        }, 1400 * (index + 1)));
      });
    }

    /* ------------------------------------- écran « Faire réaliser par un artiste » */

    // status manual_review (photo refusée / 2 rounds sans candidat retenu) ou échec
    // définitif : écran chaleureux — un artiste prend le relais, aperçu sous 24 h par
    // e-mail (décision plan §0.15). L'essai n'est pas décompté côté back-end.
    showArtist() {
      this.stopTimers();
      const form = this.q('[data-artist-form]');
      const feedback = this.q('[data-artist-feedback]');
      const alreadySent = this.state.artistRequested
        && this.state.artistRequested === this.state.jobId;
      if (form) form.hidden = Boolean(alreadySent);
      if (feedback) {
        feedback.textContent = alreadySent ? this.i18n.artist_success : '';
        feedback.hidden = !alreadySent;
      }
      const emailInput = this.q('[data-artist-email]');
      if (emailInput && this.state.email && !emailInput.value) emailInput.value = this.state.email;
      this.showScreen('artist');
    }

    bindArtistScreen() {
      const form = this.q('[data-artist-form]');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = this.q('[data-artist-email]');
        const feedback = this.q('[data-artist-feedback]');
        const button = form.querySelector('button[type="submit"]');
        if (!emailInput.checkValidity()) {
          emailInput.reportValidity();
          return;
        }
        if (button) button.disabled = true;
        try {
          if (!this.config.mock) {
            // Même endpoint que la sauvegarde : le job est déjà en manual_review côté
            // back-end, l'e-mail y rattache le client (aperçu envoyé sous 24 h).
            const { response } = await this.api(
              `/api/custom-art/jobs/${this.state.jobId}/save`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value }),
              },
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          }
          this.state.email = emailInput.value;
          this.state.artistRequested = this.state.jobId;
          this.persist();
          form.hidden = true;
          feedback.textContent = this.i18n.artist_success;
          feedback.hidden = false;
        } catch (e) {
          feedback.textContent = this.i18n.artist_error;
          feedback.hidden = false;
        } finally {
          if (button) button.disabled = false;
        }
      });
    }

    bindRevealScreen() {
      this.q('[data-studio-add-to-cart]')?.addEventListener('click', () => this.addToCart());
      this.q('[data-studio-reveal-next]')?.addEventListener('click', () => this.revealNext());

      const saveToggle = this.q('[data-studio-save-toggle]');
      const saveForm = this.q('[data-studio-save-form]');
      saveToggle?.addEventListener('click', () => {
        const expanded = saveToggle.getAttribute('aria-expanded') === 'true';
        saveToggle.setAttribute('aria-expanded', String(!expanded));
        saveForm.hidden = expanded;
        if (!expanded) {
          const emailInput = this.q('[data-save-email]');
          if (emailInput && this.state.email && !emailInput.value) emailInput.value = this.state.email;
          emailInput?.focus();
        }
      });
      saveForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        this.saveCreation();
      });
    }

    async revealNext() {
      const button = this.q('[data-studio-reveal-next]');
      button.disabled = true;
      try {
        this.state.revealCount += 1;
        if (this.config.mock) {
          this.showReveal(this.mockArtworkUrl(this.state.revealCount));
          this.resetMockMockups();
          return;
        }
        const { response, data } = await this.api(
          `/api/custom-art/jobs/${this.state.jobId}/reveal-next`,
          { method: 'POST' },
        );
        const previewUrl = this.previewFrom(data);
        if (response.ok && previewUrl) {
          // Runner-up n°2 / n°3 : révélation instantanée.
          this.state.mockups = Array.isArray(data.mockups) ? data.mockups : this.state.mockups;
          this.showReveal(previewUrl);
          this.startMockupWatch();
        } else if (this.isEmailRequired(response, data)) {
          // Cap d'essais anonymes atteint : on guide vers la sauvegarde par e-mail.
          const saveToggle = this.q('[data-studio-save-toggle]');
          const feedback = this.q('[data-save-feedback]');
          saveToggle?.setAttribute('aria-expanded', 'true');
          this.q('[data-studio-save-form]').hidden = false;
          if (feedback) {
            feedback.textContent = this.i18n.email_required_for_retry;
            feedback.hidden = false;
          }
          const emailInput = this.q('[data-save-email]');
          if (emailInput && this.state.email && !emailInput.value) emailInput.value = this.state.email;
          emailInput?.focus();
        } else if (response.status === 429) {
          // Cap de volume (forte affluence) : message en place, on reste sur le reveal.
          const feedback = this.q('[data-reveal-feedback]');
          if (feedback) {
            feedback.textContent = this.i18n.error_rate_limited;
            feedback.hidden = false;
          }
        } else if (data.status === 'generating' || data.status === 'pending' || data.status === 'judging') {
          // Runner-ups épuisés, caps OK : nouvelle génération -> attente storytelling.
          // Le back-end renvoie un NOUVEAU jobId (contrat reveal-next) : c'est lui qu'on
          // polle désormais, avec un compteur de révélations et des mockups remis à zéro.
          if (data.jobId) this.state.jobId = data.jobId;
          this.state.revealCount = 0;
          this.state.mockups = null;
          this.state.status = data.status;
          this.persist();
          this.showScreen('wait');
          this.startWaitProgress(REAL_DURATION_ESTIMATE);
          this.startPolling();
        } else if (data.status === 'manual_review' || data.status === 'failed') {
          this.showArtist();
        } else {
          this.showError(data.error || data.message || this.i18n.generation_error);
        }
      } catch (e) {
        this.showError(this.i18n.generation_error);
      } finally {
        button.disabled = false;
      }
    }

    async saveCreation() {
      const emailInput = this.q('[data-save-email]');
      const feedback = this.q('[data-save-feedback]');
      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }
      try {
        if (!this.config.mock) {
          const { response } = await this.api(
            `/api/custom-art/jobs/${this.state.jobId}/save`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailInput.value }),
            },
          );
          if (response.status === 429) {
            feedback.textContent = this.i18n.error_rate_limited;
            feedback.hidden = false;
            return;
          }
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        }
        // Adresse mémorisée : pré-remplie ensuite (écran artiste, e-mail requis, etc.).
        this.state.email = emailInput.value;
        this.persist();
        feedback.textContent = this.i18n.save_success;
      } catch (e) {
        feedback.textContent = this.i18n.save_error;
      }
      feedback.hidden = false;
    }

    /* ----------------------------------------------------------- ajout panier */

    async addToCart() {
      const button = this.q('[data-studio-add-to-cart]');
      const feedback = this.q('[data-cart-feedback]');

      // Garde-fou mock : le job n'existe pas côté back-end, donc AUCUN ajout au panier
      // réel (le template peut tourner sur la boutique live avec mock_mode actif).
      // Même message que sur le harness : démonstration sans effet de bord.
      if (this.config.mock) {
        feedback.textContent = this.i18n.cart_added_mock;
        feedback.hidden = false;
        return;
      }

      button.disabled = true;
      feedback.hidden = true;

      const properties = {
        _job_id: this.state.jobId,
        [this.i18n.prop_name]: this.state.playerName,
        [this.i18n.prop_number]: this.state.playerNumber,
        [this.i18n.prop_team]: this.state.teamName,
        [this.i18n.prop_preview]: this.state.previewUrl,
      };

      try {
        // Même contrat que MainProductBlocks.buyFetch (assets/main-product.js).
        const response = await fetch('/cart/add.js?sections=tw-cart-drawer,tw-header-painting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{
              id: this.state.variantId || this.config.defaultVariantId,
              quantity: 1,
              properties,
            }],
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();

        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();
        this.updateCartBubble(cart.item_count);

        const drawer = document.getElementById('shopify-section-tw-cart-drawer');
        if (drawer && json.sections && json.sections['tw-cart-drawer']) {
          drawer.innerHTML = new DOMParser()
            .parseFromString(json.sections['tw-cart-drawer'], 'text/html')
            .querySelector('#shopify-section-tw-cart-drawer').innerHTML;
        }

        this.clearPersisted();
        this.close();
        setTimeout(() => document.getElementById('cart-button')?.click(), 300);
      } catch (e) {
        feedback.textContent = this.i18n.cart_error;
        feedback.hidden = false;
      } finally {
        button.disabled = false;
      }
    }

    updateCartBubble(count) {
      const bubble = document.getElementById('bubble-nb-product');
      if (!bubble) return;
      const srText = (this.i18n.cart_count_sr || '').replace('[count]', count);
      const visible = count > 0 && count < 100 ? `<span aria-hidden="true">${count}</span>` : '';
      bubble.innerHTML = `${visible}<span class="sr-only">${escapeHtml(srText)}</span>`;
    }

    /* -------------------------------------------------- œuvre mock (SVG local) */

    mockArtworkUrl(variation) {
      // Image de reveal du setting si fournie ; sinon œuvre SVG construite localement
      // (couleurs de l'équipe + prénom + numéro) pour un parcours mock crédible.
      if (this.config.mockRevealImage && variation === 0) return this.config.mockRevealImage;
      const colors = this.state.teamColors || ['#444444', '#dddddd'];
      const angles = [30, 120, 210, 300];
      const angle = angles[variation % angles.length];
      const name = escapeHtml(this.state.playerName || '');
      const number = escapeHtml(this.state.playerNumber || '');
      const watermark = escapeHtml(this.i18n.mock_watermark || '');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1365" viewBox="0 0 1024 1365">
        <defs>
          <linearGradient id="sky" gradientTransform="rotate(${angle})">
            <stop offset="0" stop-color="#10131c"/>
            <stop offset="1" stop-color="${escapeHtml(colors[0])}"/>
          </linearGradient>
        </defs>
        <rect width="1024" height="1365" fill="url(#sky)"/>
        <ellipse cx="512" cy="330" rx="640" ry="260" fill="#ffffff" opacity="0.08"/>
        <ellipse cx="512" cy="1240" rx="760" ry="210" fill="#1d4023" opacity="0.85"/>
        <path d="M362 560 L470 480 Q512 510 554 480 L662 560 L730 660 L650 720 L640 690 L640 1120 Q512 1160 384 1120 L384 690 L374 720 L294 660 Z" fill="${escapeHtml(colors[0])}" stroke="#0c0c0c" stroke-opacity="0.35" stroke-width="6"/>
        <text x="512" y="760" text-anchor="middle" font-family="sans-serif" font-size="78" font-weight="700" letter-spacing="6" fill="${escapeHtml(colors[1] || '#ffffff')}">${name}</text>
        <text x="512" y="1020" text-anchor="middle" font-family="sans-serif" font-size="270" font-weight="700" fill="${escapeHtml(colors[1] || '#ffffff')}">${number}</text>
        <g opacity="0.28" fill="#ffffff" font-family="sans-serif" font-size="44" font-weight="700">
          <text x="512" y="420" text-anchor="middle" transform="rotate(-24 512 420)">${watermark}</text>
          <text x="512" y="900" text-anchor="middle" transform="rotate(-24 512 900)">${watermark}</text>
          <text x="512" y="1280" text-anchor="middle" transform="rotate(-24 512 1280)">${watermark}</text>
        </g>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    // Mise en situation mock : petite scène d'intérieur SVG (mur + meuble + œuvre
    // encadrée aux couleurs de l'équipe) — uniquement pour le parcours de démonstration.
    mockMockupUrl(variation) {
      const colors = this.state.teamColors || ['#444444', '#dddddd'];
      const walls = ['#ece4da', '#dfe4e8', '#e7e0d2'];
      const wall = walls[variation % walls.length];
      const name = escapeHtml(this.state.playerName || '');
      const number = escapeHtml(this.state.playerNumber || '');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="${wall}"/>
        <rect y="430" width="600" height="170" fill="#cbb9a2"/>
        <rect x="46" y="464" width="240" height="96" rx="14" fill="#8a7a68"/>
        <rect x="318" y="492" width="60" height="68" rx="6" fill="#6e5a45"/>
        <rect x="196" y="116" width="208" height="274" fill="#1c1c22"/>
        <rect x="208" y="128" width="184" height="250" fill="${escapeHtml(colors[0])}"/>
        <ellipse cx="300" cy="168" rx="120" ry="34" fill="#ffffff" opacity="0.12"/>
        <text x="300" y="244" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="700" letter-spacing="2" fill="${escapeHtml(colors[1] || '#ffffff')}">${name}</text>
        <text x="300" y="336" text-anchor="middle" font-family="sans-serif" font-size="76" font-weight="700" fill="${escapeHtml(colors[1] || '#ffffff')}">${number}</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    /* ------------------------------------------------- restauration des champs */

    applyRestoredFields() {
      const consent = this.q('[data-consent]');
      if (consent) consent.checked = Boolean(this.state.consent);
      const nameInput = this.q('[data-player-name]');
      if (nameInput) nameInput.value = this.state.playerName || '';
      const numberInput = this.q('[data-player-number]');
      if (numberInput) numberInput.value = this.state.playerNumber || '';
      const selected = this.restoredOptions || {};
      Object.entries(selected).forEach(([position, value]) => {
        const radio = Array.from(this.querySelectorAll(`[data-studio-option][data-option-position="${position}"]`))
          .find((candidate) => candidate.value === value);
        if (radio) radio.checked = true;
      });
      this.updateJersey();
      this.syncVariant();
    }
  }

  customElements.define('custom-art-studio', CustomArtStudio);
})();

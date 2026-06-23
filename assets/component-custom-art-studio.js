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
 * Reveal IN-PLACE (sur l'étape Format) : l'aperçu généré remplace le placeholder dans le MÊME
 * <perspective-canvas> du slot [data-studio-format-webgl-slot] (texture CORS-ok requise) + le
 * cadre/format choisis (état figé via perspective-config.state). Repli <img> statique (poster
 * générique puis image finale au reveal) si WebGL indisponible (prefers-reduced-motion, vieux
 * mobiles, Save-Data, texture refusée) — cf. mountFormatPreview/canUse3D/swapFallbackImg.
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
    { name: 'photo', type: 'photo', required: true, consent: { required: true }, faceAngle: 'front', payloadKey: 'photo', checkpointLabel: { fr: 'Photo', en: 'Photo' } },
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
  const REAL_DURATION_ESTIMATE = 40000; // défaut prudent (1re génération only) ; calibré ensuite (local puis back-end)
  // Calibrage auto : on mémorise la durée des dernières vraies générations pour ajuster la barre.
  const GEN_DURATIONS_KEY = 'mma-studio:genDurations';
  const GEN_DURATIONS_KEEP = 5;        // moyenne glissante sur les 5 dernières
  const GEN_DURATION_MIN = 10000;      // bornes anti-aberration (barre)
  const GEN_DURATION_MAX = 90000;
  const GEN_PROGRESS_CAP = 98;         // plafond de la barre (jamais 100 % avant la vraie fin)
  const GEN_ESTIMATE_KEY = 'mma-studio:genEstimate'; // cache de l'estimation GLOBALE (back-end)
  // Mémoire DURABLE (localStorage) : au-delà de ce délai, on NE reprend PAS un reveal/une génération
  // (le job back-end a pu expirer -> éviter reveal-next/ajout panier sur un job mort). Conservateur,
  // bien en deçà de l'expiration serveur. Les SAISIES restent ; seul l'état de job est réinitialisé.
  const RESUME_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours
  const MOCK_MANUAL_REVIEW_NAME = 'ARTISTE'; // prénom déclencheur du scénario artiste en mock
  // Autres prénoms déclencheurs de TEST en mock (mock_mode UNIQUEMENT, aucun effet en prod) :
  // valider chaque écran sans génération payante. cf. startGeneration().
  const MOCK_FAIL_NAME = 'ECHEC';     // -> écran artiste (statut « failed »)
  const MOCK_ERROR_NAME = 'ERREUR';   // -> écran d'erreur générique (404 / timeout / réseau)
  const MOCK_EXPIRE_NAME = 'EXPIRE';  // -> écran d'erreur (création expirée J+30 ; texte réel = back-end)
  const MOCK_SLOW_NAME = 'LENT';      // -> attente longue (~24 s) pour observer le placeholder/overlay
  const MOCK_SLOW_DURATION = 24000;
  // Normalise un prénom pour le comparer aux déclencheurs (insensible à la casse et aux accents).
  // Plage des diacritiques combinants U+0300–U+036F construite via new RegExp (échappements ASCII,
  // insensibles à toute normalisation Unicode du source).
  const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');
  const normTriggerName = (s) => (s || '').trim().toUpperCase().normalize('NFD').replace(DIACRITICS_RE, '');

  // Résolution des options par NOM (l'ordre des options Shopify n'est pas garanti).
  const OPTION_FORMAT_RE = /format|taille|dimension/;
  const OPTION_FRAME_RE = /cadre|finition|frame|encadrement/;
  const OPTION_BORDER_RE = /bordure|border/;

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

  // Décode les entités HTML (inverse d'escapeHtml). textarea = décodeur SÛR : son contenu est du
  // RCDATA (les balises éventuelles restent du texte, rien n'est exécuté). Sert à « dé-échapper »
  // les libellés i18n produits par le filtre Liquid `t` (qui HTML-échappe : ' -> &#39;, & -> &amp;…)
  // avant un rendu en textContent. Le garde sur '&' évite de toucher le DOM pour le cas courant.
  const decodeEntities = (value) => {
    const s = String(value ?? '');
    if (s.indexOf('&') === -1) return s;
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    return ta.value;
  };

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
      // Le filtre Liquid `t` HTML-échappe ses sorties (' -> &#39;, & -> &amp;…). Comme on réinjecte
      // ensuite ces libellés via textContent (ex. save_success « C'est noté »), on décode UNE fois
      // les entités à l'ingestion pour retrouver le texte humain — sinon « C&#39;est noté » s'affiche
      // littéralement. Couvre toutes les langues sans toucher les fichiers de locale ; les usages
      // innerHTML repassent tous par escapeHtml() donc restent sûrs (et corrigés au passage).
      for (const key in this.i18n) {
        if (typeof this.i18n[key] === 'string') this.i18n[key] = decodeEntities(this.i18n[key]);
      }
      // Config-driven : la liste ORDONNÉE des étapes vient du metafield studio.config (injecté
      // par la section dans config.studio). Repli foot si absent (migration progressive).
      this.studioConfig = this.config.studio && typeof this.config.studio === 'object' ? this.config.studio : null;
      // Type de produit (foot/horoscope/…) envoyé au back-end (jobs + photo-check) pour la
      // segmentation des stats (durée moyenne par type) et les contrôles. Repli 'foot'.
      this.productType = (this.studioConfig && this.studioConfig.productType) || 'foot';
      // Locale courante (injectée par la section depuis request.locale) pour résoudre les
      // maps i18n {fr,en,…} de studio.config. Repli 'fr'.
      // Normalisée sur 2 lettres : request.locale.iso_code peut valoir « fr-CA », « en-GB »… et
      // les maps i18n de la config sont indexées par code court (fr/en/de/nl/es).
      this.locale = ((typeof this.config.locale === 'string' && this.config.locale) ? this.config.locale : 'fr').toLowerCase().slice(0, 2);
      this.studioSteps = (this.studioConfig && Array.isArray(this.studioConfig.steps) && this.studioConfig.steps.length)
        ? this.studioConfig.steps
        : FOOT_FALLBACK_STEPS;
      this.stepNames = this.studioSteps.map((step) => step.name);
      // faceAngle (config A) : angle de visage attendu par l'œuvre -> pilote la consigne photo ET le
      // juge photo (vérifie que la photo correspond). Repli 'front'. `_photoVerdicts` = cache
      // hash -> verdict : on ne re-juge JAMAIS deux fois la même photo (économie de tokens).
      this.photoFaceAngle = ((this.studioSteps.find((s) => s.type === 'photo') || {}).faceAngle) || 'front';
      // Flag d'activation du juge photo (config). OFF par défaut -> dormant tant que l'endpoint
      // back-end /photo-check n'est pas livré (on n'affiche pas « indisponible » en prod). On l'active
      // via la config (metafield studio.config) une fois le back-end prêt.
      this.photoCheckEnabled = ((this.studioSteps.find((s) => s.type === 'photo') || {}).photoCheck) === true;
      this._photoVerdicts = {};
      this._applyPhotoCaption(); // consigne photo adaptée à l'angle de l'œuvre
      // Mode « sans génération » (config-driven). Un produit perso à DESIGN FIXE (ex : poster foot
      // N&B, prénom+numéro imprimés sur un visuel existant) n'a pas de génération IA : il désactive
      // le bloc generation -> pas de photo/attente/reveal ; à la dernière étape on AJOUTE AU PANIER
      // directement (prénom/numéro en propriétés de commande). Marqueur EXPLICITE `generation.enabled
      // === false` : par défaut (bloc absent OU enabled!==false) = AVEC génération -> le foot, dont la
      // config n'a pas de bloc generation, reste inchangé.
      this.hasGeneration = !(this.studioConfig && this.studioConfig.generation && this.studioConfig.generation.enabled === false);
      this.storageKey = `mma-studio:${this.config.productId || 'product'}`;

      this.dialog = this.querySelector('[data-studio-dialog]');
      this.footer = this.querySelector('[data-studio-footer]');
      this.navRow = this.querySelector('[data-studio-nav-row]'); // rangée « Retour » / « Une autre version »
      this.backButton = this.querySelector('[data-studio-back]');
      this.revealNextLink = this.querySelector('[data-studio-reveal-next]'); // lien « Une autre version » (reveal)
      this.saveButton = this.querySelector('[data-studio-save-toggle]');     // bouton « Sauvegarder » (haut droite, reveal)
      this.nextButton = this.querySelector('[data-studio-next]');
      this.nextWrap = this.querySelector('[data-studio-next-wrap]'); // wrapper du bouton coulissant
      this.stepTitle = this.querySelector('[data-step-title]');
      this.stepIndicator = this.querySelector('[data-step-indicator]'); // optionnel
      this.stepCheckpoints = this.querySelector('[data-step-checkpoints]');
      this.stepNodes = this.querySelectorAll('[data-cp-node]');
      this.stepLineFills = this.querySelectorAll('[data-cp-line-fill]');
      this.resumeNote = this.querySelector('[data-resume-note]');
      // Texte par défaut de la note (« Bon retour… ») capturé une fois : setResumeNote() le restaure
      // après avoir affiché une note temporaire (chargement / lien périmé). cf. A1.
      this._resumeNoteDefault = this.resumeNote ? this.resumeNote.textContent.trim() : '';
      // Promo « façon bloc buy » (réglages de la section) + contenu d'achat capturé côté Liquid
      // (snippets regular/promotion-in-cart-button) : le JS clone ce template dans le bouton du pied
      // et n'actualise que les prix (.main-price / .crossed-price) selon la variante choisie.
      this.promo = (this.config.promo && typeof this.config.promo === 'object') ? this.config.promo : null;
      this.buyContentTemplate = this.querySelector('[data-studio-buy-content]');

      this.photoFile = null;
      this.photoObjectUrl = null;
      this.teams = null;
      this.pollTimer = null;
      this.progressTimer = null;
      this.mockupTimer = null;
      this.mockMockupTimers = [];
      this.lastFocused = null;
      this.guestLink = false; // mode « invité par lien » (?ca_job) : mémoire éphémère, actions verrouillées

      this.state = {
        // 1re étape de CETTE config (foot : 'photo' ; produit sans photo : sa 1re étape).
        // Jamais 'photo' en dur -> sinon un produit no-gen ouvrirait sur un step inexistant.
        step: this.stepNames[0],
        screen: 'steps', // steps | reveal | error | artist (l'attente a fusionné dans reveal)
        // Sous-état de l'étage Format in-place : 'form' (options visibles) | 'generating' (vague +
        // bouton-barre) | 'ready' (vraie image + bouton « Ajouter au panier »). cf. enterGeneratingStage/showReveal.
        stage: 'form',
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
        imageStale: false, // true = une donnée de l'image a changé -> régé requise au prochain « Continuer »
        mockups: null, // [{ psd, status, url }] — streaming post-reveal
        artistRequested: null, // jobId dont la demande artiste a déjà été envoyée
      };

      this.restoreState();
      // Garde-fou config-driven : un step persisté absent de CETTE config (ex : 'photo' hérité,
      // ou config modifiée) -> on repart de la 1re étape plutôt que d'afficher un écran vide.
      if (!this.stepNames.includes(this.state.step)) this.state.step = this.stepNames[0];
      // Snapshot avant les bind : le syncVariant initial de bindFormatStep réécrit
      // state.selectedOptions depuis les radios par défaut.
      this.restoredOptions = { ...(this.state.selectedOptions || {}) };
      // Reprise par LIEN e-mail (?ca_job=<uuid>) : le back-end mint ces liens dans l'e-mail de
      // sauvegarde, mais le thème ne les lisait jamais (0 occurrence avant A1). On capture l'uuid
      // ici ; open() le consomme (resumeFromJob), en PRIORITÉ sur la reprise locale.
      try {
        const caJob = new URLSearchParams(window.location.search).get('ca_job');
        if (caJob && caJob.trim()) {
          this._pendingCaJob = caJob.trim();
          // On RETIRE ?ca_job de l'URL (sans recharger) une fois l'uuid copié en mémoire : sinon un
          // reload/partage/favori ré-entrerait perpétuellement en mode invité (et l'uuid d'un job tiers
          // traînerait dans la barre d'adresse). L'ouverture auto de CE chargement reste OK (déjà capturé).
          try {
            const u = new URL(window.location.href);
            u.searchParams.delete('ca_job');
            window.history.replaceState(window.history.state, '', u);
          } catch (e2) { /* history indispo : non bloquant */ }
        }
      } catch (e) { /* URLSearchParams indispo : reprise locale seule */ }
      this.bindStickyCta();
      this.bindOpenClose();
      this.bindPhotoStep();
      this.bindTeamStep();
      this.bindNameStep();
      this.bindFormatStep();
      this.bindVariantGuides();
      this.bindRevealScreen();
      this.bindErrorScreen();
      this.bindArtistScreen();
      this.applyRestoredFields();
      this.renderStepper();
      this.renderGenericPanels();
      this.bindGenericInputs();
      // Lien e-mail (?ca_job) : OUVERTURE AUTO du studio au chargement, direct sur le reveal du job
      // partagé (décision Walid). setTimeout(0) (et non rAF, mis en pause dans un onglet non visible) :
      // s'exécute APRÈS les scripts `defer` -> perspective-canvas est défini (reveal WebGL, pas repli).
      // _pendingCaJob est consommé par open() -> une seule ouverture auto.
      if (this._pendingCaJob) {
        setTimeout(() => { if (this._pendingCaJob) this.open(); }, 0);
      }
    }

    disconnectedCallback() {
      this.stopTimers();
      this.ctaObserver?.disconnect();
      document.body.classList.remove(CTA_FLOATING_BODY_CLASS);
      if (this.photoObjectUrl) URL.revokeObjectURL(this.photoObjectUrl);
      clearTimeout(this._fmtPreviewTimer);
    }

    /* ------------------------------------------------------------------ utils */

    q(selector) {
      return this.querySelector(selector);
    }

    // Fond mur texturé (même asset que la toile) placé DERRIÈRE le canvas WebGL : distingue le
    // blanc d'un tirage clair du blanc du fond de la modale. `.decor-bg` est whitelisté contre la
    // règle *:empty{display:none}. Vide si l'asset n'est pas fourni par la config.
    decorBgHtml() {
      const wall = this.config && this.config.wallTexture;
      if (!wall) return '';
      return '<div class="decor-bg absolute inset-0 bg-repeat bg-center bg-[length:256px_256px]"'
        + ` style="background-image:url('${wall}')" aria-hidden="true"></div>`;
    }

    // Résout une valeur i18n de studio.config : chaîne brute, ou map {fr,en,…} via la locale
    // courante (repli fr puis ''). Sert aux titres/labels/erreurs pilotés par la config.
    t(value) {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') return value[this.locale] || value.fr || '';
      return '';
    }

    persist() {
      // Mode « invité par lien » (?ca_job) : mémoire ÉPHÉMÈRE — on n'écrit jamais le localStorage
      // (le job vu n'est pas forcément rattaché à la session de CE navigateur ; éviter qu'une visite
      // ultérieure sans lien réactive des actions verrouillées 403). cf. A1 / enterGuestLink.
      if (this.guestLink) return;
      try {
        const { step, screen, stage, consent, fields, teamId, teamName, teamColors, playerName,
          playerNumber, selectedOptions, variantId, jobId, sessionToken, email, status,
          previewUrl, revealCount, imageStale, mockups, artistRequested } = this.state;
        // Mémoire DURABLE (localStorage) : survit à la fermeture du navigateur -> on ré-affiche
        // direct la création à la réouverture (cf. open()), sans pousser à régénérer.
        localStorage.setItem(this.storageKey, JSON.stringify({
          step, screen, stage, consent, fields, teamId, teamName, teamColors, playerName,
          playerNumber, selectedOptions, variantId, jobId, sessionToken, email, status,
          previewUrl, revealCount, imageStale, mockups, artistRequested,
          savedAt: Date.now(), // horodatage de fraîcheur (garde TTL à la reprise, cf. restoreState)
        }));
      } catch (e) { /* stockage indisponible (navigation privée) : non bloquant */ }
    }

    restoreState() {
      try {
        let raw = null;
        try { raw = localStorage.getItem(this.storageKey); } catch (e) { /* idem */ }
        // Migration douce : une session ouverte avant le passage en durable est encore en sessionStorage.
        if (!raw) { try { raw = sessionStorage.getItem(this.storageKey); } catch (e) { /* no-op */ } }
        if (!raw) return;
        const saved = JSON.parse(raw);
        Object.assign(this.state, saved);
        // Garde de FRAÎCHEUR (mémoire durable) : un reveal/une génération mémorisé trop ancien -> le job
        // back-end a pu expirer. On NE reprend PAS l'état de job (sinon reveal-next/ajout panier sur un
        // job mort = coût + commande non productible) : on garde les SAISIES et on repart proprement.
        // savedAt absent = migration sessionStorage de la session EN COURS (fraîche) -> pas de reset.
        // L'écran ARTISTE (stage='form' mais screen='artist' + jobId) échappait à la garde -> on l'inclut :
        // sinon une réouverture des semaines plus tard ré-affiche l'artiste sur un job mort (renvoi e-mail
        // -> boucle d'erreur). Tout état de JOB trop ancien repart proprement.
        const tooOld = saved.savedAt && (Date.now() - saved.savedAt) > RESUME_TTL_MS;
        if (tooOld && (this.state.stage === 'ready' || this.state.stage === 'generating'
            || (this.state.screen === 'artist' && this.state.jobId))) {
          this.state.stage = 'form';
          this.state.screen = 'steps';
          this.state.previewUrl = null;
          this.state.jobId = null;
          this.state.sessionToken = null;
          this.state.status = null;
          this.state.revealCount = 0;
          this.state.mockups = null;
          this.state.artistRequested = null;
          this.state.imageStale = true; // données potentiellement modifiées entre-temps -> régé propre
        }
        // Backfill de l'état générique depuis les clés foot historiques (sessionStorage antérieur
        // au champ `fields`) -> la validation par type reste cohérente après un reload.
        if (!this.state.fields || typeof this.state.fields !== 'object') this.state.fields = {};
        if (this.state.teamId && this.state.fields.team == null) this.state.fields.team = this.state.teamId;
        if (this.state.playerName && this.state.fields.playerName == null) this.state.fields.playerName = this.state.playerName;
        if (this.state.playerNumber && this.state.fields.playerNumber == null) this.state.fields.playerNumber = this.state.playerNumber;
        // La photo (File) n'est pas persistable : sans photo ni job en cours, on repart de la
        // 1re étape en gardant les autres réponses. Produit SANS étape photo (design fixe) :
        // rien à perdre -> on reprend là où on en était (pas de reset).
        const hasPhotoStep = this.studioSteps.some((s) => s.type === 'photo');
        if (hasPhotoStep && !this.state.jobId && !this.state.previewUrl && this.state.step !== this.stepNames[0]) {
          this.state.step = this.stepNames[0];
          this.state.screen = 'steps';
          this.shouldShowResumeNote = true;
        }
      } catch (e) { /* state corrompu : on repart à zéro */ }
    }

    clearPersisted() {
      try { localStorage.removeItem(this.storageKey); } catch (e) { /* no-op */ }
      try { sessionStorage.removeItem(this.storageKey); } catch (e) { /* no-op */ }
    }

    stopTimers() {
      clearInterval(this.pollTimer);
      clearTimeout(this.mockTimer);
      clearInterval(this.progressTimer);
      clearInterval(this.mockupTimer);
      clearTimeout(this._revealChromeTimer); // repli du chrome d'achat différé (cf. showReveal)
      clearTimeout(this._webglFallbackTimer); // backstop repli <img> si l'init WebGL n'aboutit jamais
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
      // A11y (WCAG 4.1.2) : le déclencheur réel (bouton d'achat détourné ou [data-studio-open])
      // annonce qu'il ouvre une fenêtre de personnalisation et son état déployé.
      const trigger = this.lastFocused;
      if (trigger && trigger.setAttribute) {
        trigger.setAttribute('aria-haspopup', 'dialog');
        if (this.dialog && this.dialog.id) trigger.setAttribute('aria-controls', this.dialog.id);
        trigger.setAttribute('aria-expanded', 'true');
        this._trigger = trigger;
      }
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
        this.setResumeNote(this._resumeNoteDefault); // texte par défaut garanti (immunisé d'un message A1 antérieur)
        this.shouldShowResumeNote = false;
      }

      // Reprise par LIEN e-mail (?ca_job) : PRIORITÉ absolue sur la reprise locale, consommée une
      // seule fois (cf. A1). Le focus va d'abord au bouton « fermer », puis resumeFromJob (async)
      // route selon le statut du job (GET public, aucun cap possible).
      if (this._pendingCaJob) {
        const uuid = this._pendingCaJob;
        this._pendingCaJob = null;
        this.q('[data-studio-close]')?.focus();
        this.resumeFromJob(uuid);
        return;
      }

      // Reprise IN-PLACE (mémoire durable localStorage) : le reveal/la génération vivent sur l'étape
      // Format (screen reste 'steps'), donc on route sur le STAGE, pas sur un écran séparé.
      this.routeResume();
      this.q('[data-studio-close]')?.focus();
    }

    // Routage de reprise LOCAL (mémoire durable localStorage) : artiste / reveal prêt / génération en
    // cours / parcours normal. Extrait d'open() pour être réutilisé après une reprise par lien périmée
    // (enterGuestExpired). Ne lit QUE l'état local — aucun appel réseau, donc AUCUN cap (cf. A3).
    routeResume() {
      const fmtStep = this.stepNames.includes('format') ? 'format' : this.stepNames[this.stepNames.length - 1];
      if (this.state.screen === 'artist' && this.state.jobId) {
        this.showArtist();
      } else if (this.state.stage === 'ready' && this.state.previewUrl) {
        // Création terminée : on remonte l'étape Format puis on ré-affiche DIRECT l'image finale
        // dans le visualiseur (pas de régénération, pas de coût) — « on lui raffiche de suite ».
        this.state.screen = 'steps';
        this.showStep(fmtStep);
        this.showReveal(this.state.previewUrl, false);
      } else if (this.state.stage === 'generating' && this.state.jobId && !this.config.mock
                 && this.state.screen !== 'error' && this.state.screen !== 'artist') {
        // Génération RÉELLE en cours, interrompue par la fermeture : on reprend l'étape Format,
        // le placeholder + la barre, ET le polling là où il en était. (Exclut les écrans erreur/artiste :
        // défense en profondeur, en plus du reset de stage par showError.)
        this.state.screen = 'steps';
        this.showStep(fmtStep);
        this.enterGeneratingStage();
        this.startWaitProgress(this._estimateGenDuration());
        this.startPolling();
      } else {
        this.state.screen = 'steps';
        this.showStep(this.state.step);
        // A2 : aucune reprise locale -> on demande au back-end le DERNIER job de la session
        // (GET /jobs/last, cookie de session). S'il existe -> bascule sur le reveal ; sinon (204)
        // parcours normal. Lecture seule, JAMAIS de cap (cf. A3). Produits à génération uniquement.
        if (this.hasGeneration) this.resumeLastJob();
      }
    }

    /* -------------------------------------------- reprise par lien e-mail (?ca_job) — A1 */

    // Reprise « invité par lien » : le GET /jobs/:uuid est PUBLIC (preview visible sans session),
    // mais reveal-next/save y sont 403 -> on ré-affiche le reveal en mode invité (« Une autre
    // version » + « Sauvegarder » masqués) ; l'ACHAT reste possible (panier Shopify, pas le
    // back-end custom-art). Mémoire éphémère : guestLink coupe persist() (cf. A1).
    async resumeFromJob(uuid) {
      this.guestLink = true; // dès l'entrée : la note de chargement ne doit pas persister l'état
      const fmtStep = this.stepNames.includes('format') ? 'format' : this.stepNames[this.stepNames.length - 1];
      // Mock (harness/démo) : pas de back-end -> on simule selon l'uuid (test sans coût).
      if (this.config.mock) { this.resumeFromJobMock(uuid, fmtStep); return; }
      // Pendant le GET : on pose l'étape Format (le reveal y vit) + une note de chargement discrète.
      this.state.screen = 'steps';
      this.showStep(fmtStep);
      this.setResumeNote(this.i18n.resume_loading);
      try {
        const { response, data } = await this.api(`/api/custom-art/jobs/${encodeURIComponent(uuid)}`);
        if (response.status === 404 || response.status === 410 || !response.ok) { this.enterGuestExpired(); return; }
        const status = data.status;
        if (status === 'expired') { this.enterGuestExpired(); return; }
        if (status === 'manual_review' || status === 'failed') {
          // Le job est déjà pris en charge (l'e-mail de reprise a été émis à la sauvegarde) : on
          // montre l'écran artiste en mode « déjà envoyé » (pas de formulaire 403 sans session).
          this.state.jobId = uuid;
          this.state.artistRequested = uuid;
          this.showArtist();
          return;
        }
        const preview = this.previewFrom(data);
        if (status === 'ready' && preview) { this.enterGuestLink(uuid, data, preview, fmtStep); return; }
        // Job non concluant via lien (pending/judging…) : cas improbable -> message doux + local.
        this.enterGuestExpired();
      } catch (e) {
        this.enterGuestExpired();
      }
    }

    // Simulation mock de resumeFromJob (harness) : uuid contenant « expire »/« 404 » -> lien périmé ;
    // « artist »/« echec »/« fail » -> écran artiste ; sinon -> reveal invité prêt. Aucun coût.
    resumeFromJobMock(uuid, fmtStep) {
      const u = normalize(uuid);
      this.state.screen = 'steps';
      this.showStep(fmtStep);
      if (u.indexOf('expire') !== -1 || u.indexOf('404') !== -1) { this.enterGuestExpired(); return; }
      if (u.indexOf('artist') !== -1 || u.indexOf('echec') !== -1 || u.indexOf('fail') !== -1) {
        this.state.jobId = uuid;
        this.state.artistRequested = uuid;
        this.showArtist();
        return;
      }
      this.enterGuestLink(uuid, {}, this.mockArtworkUrl(0), fmtStep);
    }

    // Entre en mode « invité par lien » et ré-affiche le reveal du job partagé. previewUrl ramené
    // SANS persister (persist() est déjà coupé par guestLink). Le chrome du reveal masquera « Une
    // autre version » + « Sauvegarder » (403 sans session) via this.guestLink (cf. showReveal).
    enterGuestLink(uuid, data, preview, fmtStep) {
      this.guestLink = true;
      this.state.jobId = uuid;
      this.state.previewUrl = preview;
      this.state.status = 'ready';
      this.state.stage = 'ready';
      this.state.imageStale = false;
      // Best-effort : si le GET expose les métadonnées du job, on pré-remplit l'affichage panier
      // (sinon _job_id suffit côté production). Noms de champs back-end tolérés au plus large.
      if (data) {
        if (data.playerName != null) this.state.playerName = data.playerName;
        if (data.playerNumber != null) this.state.playerNumber = String(data.playerNumber);
        if (data.teamName != null) this.state.teamName = data.teamName;
        if (data.email != null && !this.state.email) this.state.email = data.email;
      }
      this.setResumeNote(null);
      this.showStep(fmtStep);
      this.showReveal(preview, false);
    }

    // Lien e-mail périmé / introuvable : message DOUX (pas une erreur dure) + bascule sur le parcours
    // LOCAL normal (l'utilisateur garde ses propres saisies / son dernier reveal local s'il en a un).
    enterGuestExpired() {
      this.guestLink = false; // on quitte le mode invité -> la mémoire durable locale reprend la main
      this.setResumeNote(this.i18n.resume_link_expired);
      this.routeResume();
    }

    // Affiche/masque la note de reprise (haut du corps). msg falsy -> on RESTAURE le texte par défaut
    // du DOM (« Bon retour… ») et on masque, pour ne pas polluer la note « photo perdue » (open()).
    setResumeNote(msg) {
      if (!this.resumeNote) return;
      this.resumeNote.textContent = msg || this._resumeNoteDefault || '';
      this.resumeNote.hidden = !msg;
    }

    /* --------------------------------------- reprise « dernier job de la session » (/jobs/last) — A2 */

    // À l'ouverture, sans reprise locale ni ?ca_job : on demande au back-end le DERNIER job de la
    // session (GET /jobs/last, authentifié par cookie + x-custom-art-session). LECTURE SEULE, JAMAIS
    // de cap (204 si rien à reprendre / session inconnue). Couvre le retour « même appareil,
    // localStorage vidé ». Une seule tentative par chargement. Job de SA session -> actions complètes.
    async resumeLastJob() {
      if (this._lastJobChecked) return;
      this._lastJobChecked = true;
      if (this.config.mock) { this.resumeLastJobMock(); return; }
      try {
        const { response, data } = await this.api('/api/custom-art/jobs/last');
        if (response.status === 204 || !response.ok) return; // rien à reprendre -> parcours normal
        if (!this._canApplyLastJob()) return; // l'utilisateur a déjà avancé/interagi -> on ne le yanke pas
        const status = data.status;
        if (status === 'manual_review' || status === 'failed') {
          this.state.jobId = data.uuid || data.jobId || data.id;
          this.persist();
          this.showArtist();
          return;
        }
        const preview = this.previewFrom(data);
        if (status === 'ready' && preview) {
          // On VALIDE que l'image charge AVANT de basculer/persister : un job 'ready' à l'image CDN
          // morte figerait sinon un reveal cassé en localStorage (persisté) et court-circuiterait un
          // /jobs/last frais pendant 3 j. Image KO -> on ignore en silence (parcours normal).
          const probe = new Image();
          probe.onload = () => { if (this._canApplyLastJob()) this.applyLastJob(data, preview); };
          probe.onerror = () => { /* aperçu mort -> on ne reprend pas ce job */ };
          probe.src = preview;
        }
      } catch (e) { /* silencieux : parcours normal */ }
    }

    // Simulation mock (harness) : ?ca_last=ready -> reveal (session, actions complètes) ;
    // ?ca_last=artist -> écran artiste ; absent/none -> 204 (parcours normal). Aucun coût.
    resumeLastJobMock() {
      let v = '';
      try { v = normalize(new URLSearchParams(window.location.search).get('ca_last') || ''); } catch (e) { /* no-op */ }
      if (!v || v === 'none') return;
      if (!this._canApplyLastJob()) return;
      if (v.indexOf('artist') !== -1 || v.indexOf('fail') !== -1 || v.indexOf('echec') !== -1) {
        this.state.jobId = 'mock-last';
        this.persist();
        this.showArtist();
        return;
      }
      this.applyLastJob({ uuid: 'mock-last', teamName: 'Paris' }, this.mockArtworkUrl(0));
    }

    // Garde anti-yank : on n'applique le « dernier job » que si l'utilisateur est TOUJOURS à l'écran
    // de départ (1re étape, rien saisi, studio ouvert) — sinon l'appel async résoudrait pendant qu'il
    // édite et le téléporterait vers un vieux reveal.
    _canApplyLastJob() {
      return this.state.screen === 'steps'
        && this.state.stage === 'form'
        && !this.photoFile
        && this.state.step === this.stepNames[0]
        && Boolean(this.dialog && this.dialog.classList.contains('flex'));
    }

    // Bascule sur le reveal du dernier job de la session. guestLink=false (job de SA session ->
    // « Une autre version »/« Sauvegarder » actives + mémoire DURABLE : on persiste pour réhydrater
    // le localStorage de cet appareil -> la prochaine ouverture est instantanée).
    applyLastJob(data, preview) {
      const fmtStep = this.stepNames.includes('format') ? 'format' : this.stepNames[this.stepNames.length - 1];
      this.guestLink = false;
      this.state.jobId = data.uuid || data.jobId || data.id;
      this.state.previewUrl = preview;
      this.state.status = 'ready';
      this.state.stage = 'ready';
      this.state.imageStale = false;
      if (data.teamName != null) this.state.teamName = data.teamName;
      if (data.playerName != null) this.state.playerName = data.playerName;
      if (data.playerNumber != null) this.state.playerNumber = String(data.playerNumber);
      if (data.email != null && !this.state.email) this.state.email = data.email;
      this.state.screen = 'steps';
      this.showStep(fmtStep);
      this.showReveal(preview, true); // persist=true -> réhydrate le localStorage (reprise instantanée ensuite)
    }

    attemptClose() {
      // Fermeture immédiate, sans confirmation : l'état est persisté (sessionStorage) et les
      // saisies restent en mémoire -> l'utilisateur rouvre exactement là où il s'était arrêté.
      // (Le window.confirm précédent était une friction inutile : rien n'est jamais perdu.)
      this.close();
    }

    close() {
      this.stopTimers();
      // En mock, le « job » n'existe pas côté serveur : pendant la génération on revient aux étapes.
      if (this.state.stage === 'generating' && this.config.mock) this.state.screen = 'steps';
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
      this._trigger?.setAttribute?.('aria-expanded', 'false');
      this.lastFocused?.focus?.();
    }

    onKeydown(event) {
      // Une bulle d'info (native <dialog data-studio-guide> en top-layer) est ouverte : elle gère
      // son propre Échap/Tab. On NE piège PAS, sinon Échap fermerait tout le studio au lieu de la bulle.
      if (this.dialog.querySelector('[data-studio-guide][open]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        // Popover « Sauvegarder » ouvert : Échap ferme le POPOVER seul, pas tout le studio.
        if (this.saveButton && this.saveButton.getAttribute('aria-expanded') === 'true') {
          this.closeSavePopover();
          this.saveButton.focus();
          return;
        }
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
      // Sortie de la mise en scène in-place (génération/reveal) -> on RESTAURE l'UI Format normale :
      // options visibles, visualiseur à sa demi-largeur, bouton redevenu un bouton (pas une barre).
      this.state.stage = 'form';
      clearTimeout(this._fmtAnim);
      // Chrome du reveal masqué hors reveal : « Une autre version », « Sauvegarder » + son popover.
      this._setHidden(this.revealNextLink, true);
      this._setHidden(this.saveButton, true);
      this.saveButton?.setAttribute('aria-expanded', 'false');
      this.q('[data-studio-save-form]')?.setAttribute('hidden', '');
      const optsReset = this.q('[data-fmt-options]');
      if (optsReset) {
        optsReset.classList.remove('hidden');
        // Nettoie les styles inline posés par l'animation de sortie (sinon options invisibles au retour).
        [].concat(Array.from(optsReset.querySelectorAll('fieldset')), [this.q('[data-studio-price-line]')]).filter(Boolean)
          .forEach((el) => { el.style.opacity = ''; el.style.transform = ''; el.style.transition = ''; el.style.transitionDelay = ''; });
      }
      const fmtSlotReset = this.q('[data-studio-format-webgl-slot]');
      if (fmtSlotReset) {
        const rowReset = fmtSlotReset.parentElement;
        if (rowReset) rowReset.style.display = ''; // rétablit le flex 2 colonnes
        fmtSlotReset.style.width = '';
        fmtSlotReset.style.flexShrink = '';
        fmtSlotReset.style.marginLeft = '';
        fmtSlotReset.style.marginRight = '';
        fmtSlotReset.classList.remove('md:w-full', 'md:-mr-4', 'studio-fmt-grow', 'max-w-sm');
        fmtSlotReset.classList.add('md:w-1/2');
        const pc0 = fmtSlotReset.querySelector('perspective-canvas');
        if (pc0) { pc0.classList.remove('studio-fmt-grow', 'max-w-sm'); pc0.classList.add('max-w-xs'); }
        const fb0 = fmtSlotReset.querySelector('[data-fmt-fallback-img]');
        if (fb0) { fb0.classList.remove('studio-fmt-grow', 'max-w-sm'); fb0.classList.add('max-w-xs'); fb0.style.display = ''; }
      }
      if (this.nextButton) {
        this.nextButton.classList.remove('studio-gen-bar');
        this.nextButton.removeAttribute('aria-busy');
        this.nextButton.disabled = false;
      }

      this.querySelectorAll('[data-studio-screen]').forEach((screen) => { screen.hidden = true; });
      this.querySelectorAll('[data-studio-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.studioPanel !== stepName;
      });
      this._applyRevealBg(); // stage remis à 'form' ci-dessus -> retire le beige (sélection/étapes amont)

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
      this._setHidden(this.backButton, index === 0);
      // La rangée nav (Retour / Une autre version) suit « Retour » : cachée si pas de retour ET pas de
      // reveal (le lien « Une autre version » est masqué hors reveal -> rangée = visibilité de Retour).
      this._setHidden(this.navRow, index === 0);
      // Dernière étape d'un produit SANS génération (poster) -> le bouton du pied DEVIENT le bouton
      // d'achat « façon fiche toile » (prix + promo dedans, cloné du template). Sinon libellé simple.
      const isLast = index === this.stepNames.length - 1;
      const isBuyStep = isLast && !this.hasGeneration;
      // Prix + promo DANS le bouton du pied (façon « Ajouter au panier ») dès la dernière étape : achat
      // direct (poster) OU étape Format d'un produit à génération (foot, bouton « Continuer »/« Générer »).
      const priceInButton = isLast;
      // Image déjà générée et inchangée -> « Continuer » (le clic ré-affiche le reveal, AUCUNE régé) ;
      // sinon « Générer » (lance/relance la génération facturée).
      const imageReady = this.hasGeneration && this.state.previewUrl && !this.state.imageStale;
      const nextLabel = isLast
        ? (this.hasGeneration ? (imageReady ? this.i18n.next : this.i18n.generate) : (this.i18n.add_to_cart || this.i18n.generate))
        : this.i18n.next;
      this.setNextButtonContent(nextLabel, priceInButton);
      // Étape Format d'un produit à génération : bouton façon achat (prix+promo) MAIS libellé d'ACTION
      // (Continuer/Générer), pas « Ajouter au panier » -> on remplace le texte du clone (is_dynamic_variant
      // = false : .cart-button-text porte bien le libellé). updateBuyButtons tient le prix à jour par variante.
      if (priceInButton && this.hasGeneration) {
        const nextText = this.nextButton && this.nextButton.querySelector('.cart-button-text');
        if (nextText) nextText.textContent = nextLabel;
      }
      // Prix dans le bouton -> on masque la ligne « PRIX … » du panneau format (doublon).
      // Toggle de la CLASSE `hidden` (et pas seulement l'attribut) : la classe `flex` du <p> écraserait
      // l'attribut hidden seul (même gotcha que le footer/dots).
      const priceLine = this.q('[data-studio-price-line]');
      if (priceLine) priceLine.classList.toggle('hidden', priceInButton);
      // Bandeau date promo du pied : visible seulement quand le bouton est « Ajouter au panier ».
      const promoDate = this.q('[data-studio-promo-date]');
      if (promoDate) promoDate.classList.toggle('hidden', !isBuyStep);
      this.updateNextDisabled();

      // Largeur de modale : large (2 colonnes) à l'étape format, normale ailleurs.
      this.setModalWidth(stepName === 'format');

      // A11y : au changement d'étape (modale ouverte), déplacer le focus sur le titre de l'étape
      // -> annonce le nouveau contexte au lecteur d'écran + replace l'ordre de tabulation. À
      // l'OUVERTURE, open() refocalise le bouton « fermer » juste après (priorité), pas de conflit.
      if (this.dialog && this.dialog.classList.contains('flex') && this.stepTitle) {
        this.stepTitle.setAttribute('tabindex', '-1');
        this.stepTitle.focus({ preventScroll: true });
      }

      // Aperçu WebGL « format » (poster) : monté à l'ENTRÉE de l'étape format, LIBÉRÉ partout
      // ailleurs -> garantit un seul contexte WebGL. (syncVariant le re-monte sur changement.)
      if (stepName === 'format') {
        this.mountFormatPreview();
      } else {
        const fmtSlot = this.q('[data-studio-format-webgl-slot]');
        if (fmtSlot) { fmtSlot.innerHTML = ''; fmtSlot.hidden = true; }
      }

      if (stepName === 'team' && !this.teams) this.loadTeams();
      this.persist();
    }

    /* ---------------------------------------- bouton d'achat (prix + promo « façon fiche toile ») */

    // Bouton principal du pied : contenu « acheter » (texte + prix + promo, structure des snippets
    // regular/promotion-in-cart-button clonée du template) sur la dernière étape d'un produit SANS
    // génération ; libellé simple (Continuer / Générer) sinon. Le clic reste géré par data-studio-next.
    setNextButtonContent(label, isBuy) {
      const btn = this.nextButton;
      if (!btn) return;
      if (isBuy && this.buyContentTemplate && this.buyContentTemplate.content) {
        btn.setAttribute('data-studio-buy', '');
        btn.innerHTML = '';
        btn.appendChild(this.buyContentTemplate.content.cloneNode(true));
        this.updateBuyButtons();
      } else {
        btn.removeAttribute('data-studio-buy');
        btn.innerHTML = `<span class="cart-button-text inline-block py-4 md:py-5">${escapeHtml(label)}</span>`;
      }
    }

    // Variante Shopify actuellement choisie (objet complet, pour le prix + compare_at_price).
    currentVariant() {
      const id = this.state.variantId || this.config.defaultVariantId;
      return (this.config.variants || []).find((v) => v.id === id) || null;
    }

    // Réplique Product.getPriceDiscounted (assets/layout-product.js) : « % » -> prix*(100-d)/100 ;
    // montant fixe -> prix - d*100 (la remise est en unités monétaires, les prix en centimes).
    priceDiscounted(price, discount, unit) {
      const d = Number(discount) || 0;
      if (unit === '%') return Math.round((price * (100 - d)) / 100);
      return price - d * 100;
    }

    // Actualise les prix dans TOUS les boutons d'achat affichés ([data-studio-buy] : pied + reveal)
    // selon la variante choisie. On ne touche qu'aux montants (.main-price / .crossed-price /
    // .reduction-price) — la structure vient des snippets réutilisés (regular/promotion-in-cart-button).
    updateBuyButtons() {
      const variant = this.currentVariant();
      if (!variant) return;
      const price = variant.price;
      const promoOn = this.promo && Number(this.promo.discount) > 0;
      this.querySelectorAll('[data-studio-buy]').forEach((btn) => {
        const main = btn.querySelector('.main-price');
        const crossed = btn.querySelector('.crossed-price');
        const reduction = btn.querySelector('.reduction-price');
        if (crossed) {
          if (promoOn) {
            // Remise artificielle (réglage section) : prix barré = plein, prix affiché = remisé.
            const newPrice = this.priceDiscounted(price, this.promo.discount, this.promo.unit);
            if (main) main.textContent = this.formatPrice(newPrice);
            crossed.textContent = this.formatPrice(price);
          } else if (variant.compare_at_price && variant.compare_at_price > price) {
            // Promo Shopify native (prix barré posé sur la variante).
            if (main) main.textContent = this.formatPrice(price);
            crossed.textContent = this.formatPrice(variant.compare_at_price);
            if (reduction) reduction.textContent = `- ${this.formatPrice(variant.compare_at_price - price)}`;
          } else if (main) {
            main.textContent = this.formatPrice(price);
          }
        } else if (main) {
          main.textContent = this.formatPrice(price);
        }
      });
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
      this.setModalWidth(false); // écrans hors-étapes (attente/reveal/erreur) -> largeur normale
      this.persist();
    }

    // Élargit la modale (desktop/iPad) à l'étape FORMAT (2 colonnes -> on profite de l'espace,
    // toutes les options visibles) et la remet à sa largeur normale ailleurs (single-column).
    setModalWidth(wide) {
      const modal = this.q('[data-studio-modal]');
      if (!modal) return;
      modal.classList.toggle('md:max-w-3xl', wide);
      modal.classList.toggle('md:max-w-xl', !wide);
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
          return Boolean(this.photoFile && consentOk && this.state.photoOk);
        }
        case 'choice':
          return step.required === false ? true : Boolean(fields[step.name]);
        case 'text': {
          const v = String(fields[step.name] || '').trim();
          if (!v) return step.required === false;
          if (step.minLength && v.length < step.minLength) return false;
          if (step.maxLength && v.length > step.maxLength) return false;
          // Garde-fou de format optionnel (ex. poids numérique) — bloque « Continuer » tant
          // que la saisie ne matche pas le motif fourni par la config.
          if (step.pattern) { try { if (!new RegExp(step.pattern).test(v)) return false; } catch (e) { /* motif invalide → ignoré */ } }
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
      // Hors écran d'étapes (reveal/achat, attente, erreur) -> le bouton-barre doit rester VISIBLE.
      if (this.state.screen !== 'steps') {
        if (this.nextWrap) this.nextWrap.classList.remove('is-collapsed');
        this._armMotion();
        return;
      }
      const ok = this.stepIsValid(this.state.step);
      this.nextButton.disabled = !ok;
      // Le bouton « Continuer » coulisse : présent uniquement quand l'étape est valide (guide l'utilisateur).
      if (this.nextWrap) this.nextWrap.classList.toggle('is-collapsed', !ok);
      this._armMotion();
    }

    // Active les transitions du bouton coulissant APRÈS le 1er rendu : l'état initial (souvent replié,
    // ex. étape photo vide) est posé sans animation -> aucun flash à l'ouverture du studio.
    _armMotion() {
      if (this._motionArmed) return;
      this._motionArmed = true;
      // setTimeout (et non rAF) : se déclenche même onglet en arrière-plan ; l'état initial est déjà
      // posé (sans transition) avant ce tick -> pas de flash, et l'anim s'active de façon fiable ensuite.
      setTimeout(() => this.classList.add('studio-motion'), 60);
    }

    bindErrorScreen() {
      this.backButton.addEventListener('click', () => {
        // Au reveal, le 1er « Retour » = revenir à l'ÉDITION Format (on RE-rend l'étape courante) :
        // les options réapparaissent, l'image générée reste affichée (mountFormatPreview la réutilise
        // -> changer cadre/taille la recadre SANS régé), le bouton redevient « Continuer ». Un 2e
        // « Retour » remonte alors le parcours normalement (vers prénom/numéro/photo).
        if (this.state.stage === 'ready') { this.showStep(this.state.step); return; }
        const index = this.stepNames.indexOf(this.state.step);
        if (index > 0) this.showStep(this.stepNames[index - 1]);
      });
      this.nextButton.addEventListener('click', () => {
        // Reveal IN-PLACE : le bouton-barre plein est devenu « Ajouter au panier » -> achat.
        if (this.state.stage === 'ready') { this.addToCart(); return; }
        if (!this.stepIsValid(this.state.step)) return;
        const index = this.stepNames.indexOf(this.state.step);
        if (index === this.stepNames.length - 1) {
          // Dernière étape : génération IA (foot) OU ajout panier direct (produit design fixe).
          if (this.hasGeneration) {
            // Image déjà générée et champs (prénom/numéro/photo/équipe) inchangés -> on RÉ-AFFICHE le
            // reveal sans AUCUN appel back-end (donc sans régénération facturée). Sinon on (re)génère :
            // c'est le cas après un changement d'info présente dans l'image (compté côté back-end).
            if (this.state.previewUrl && !this.state.imageStale) this.showReveal(this.state.previewUrl);
            else this.startGeneration();
          } else this.directAddToCart();
        } else this.showStep(this.stepNames[index + 1]);
      });
      // Touche ENTRÉE dans un champ de saisie d'une étape = clic « Continuer ». Le bouton est
      // désactivé tant que l'étape n'est pas valide -> Entrée n'avance que si tout est rempli.
      // On laisse les <form> (e-mails sauvegarde/artiste/erreur) gérer leur propre submit, et la
      // recherche d'équipe (type=search) ne valide pas l'étape (exclue par le filtre de type).
      this.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        if (this.state.screen !== 'steps') return;
        const t = event.target;
        if (!t || t.tagName !== 'INPUT') return;
        const type = (t.getAttribute('type') || 'text').toLowerCase();
        if (['text', 'number', 'tel', 'date', 'email'].indexOf(type) === -1) return;
        if (t.closest('form')) return;
        event.preventDefault();
        if (!this.nextButton.disabled) this.nextButton.click();
      });
      this.q('[data-studio-retry]')?.addEventListener('click', () => this.showStep(this.stepNames[0]));
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
      // « Changer de photo » : pas de bouton dédié — les boutons d'upload restent visibles au-dessus.
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
      this.markImageStale(); // photo = donnée présente dans l'image -> régé requise au prochain « Continuer »
      this.setPhotoError(null);
      // Avec juge -> bloquée tant que non validée ; sans juge (flag OFF) -> validée d'office (= avant).
      this.state.photoOk = !this.photoCheckEnabled;

      if (this.photoObjectUrl) URL.revokeObjectURL(this.photoObjectUrl);
      // HEIC non décodable par le navigateur -> pas de vignette (null), mais fichier accepté.
      this.photoObjectUrl = dimensions ? URL.createObjectURL(file) : null;
      // Juge OFF -> on montre quand même la photo (bandeau neutre). Juge ON -> _checkPhoto rend loading puis verdict.
      if (!this.photoCheckEnabled) this._renderPhotoVerdict('neutral');
      if (this.photoCheckEnabled) this._checkPhoto(file); // juge photo (qualité + angle), dédup par hash
      this.persist();
      this.updateNextDisabled();
    }

    // Juge photo : valide la photo (qualité + correspondance d'angle faceAngle) AVANT de laisser
    // continuer. Économie de tokens : (1) dédup par hash -> on ne re-juge jamais la même photo ;
    // (2) photo réduite à 768px pour l'appel ; (3) modèle cheap côté back-end. Fail-open si la
    // vérif est indisponible (le back-end re-checke de toute façon à la génération).
    async _checkPhoto(file) {
      this.state.photoOk = false;
      this.updateNextDisabled();
      let hash = '';
      try { hash = await this._hashFile(file); } catch (e) { hash = ''; }
      if (hash && this._photoVerdicts[hash]) {
        // Même photo déjà jugée -> verdict mémorisé, AUCUN appel back-end.
        this._applyPhotoVerdict(this._photoVerdicts[hash], { same: !this._photoVerdicts[hash].ok });
        return;
      }
      this._renderPhotoVerdict('loading');
      let verdict;
      try {
        if (this.config.mock) {
          await new Promise((r) => setTimeout(r, 500));
          verdict = this._mockPhotoVerdict(file);
        } else {
          const blob = await this._downscalePhoto(file, 768, 0.85);
          const fd = new FormData();
          fd.append('photo', blob, 'photo.jpg');
          fd.append('faceAngle', this.photoFaceAngle);
          if (hash) fd.append('hash', hash);
          if (this.productType) fd.append('productType', this.productType);
          const { response, data } = await this.api('/api/custom-art/photo-check', { method: 'POST', body: fd });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          verdict = { ok: !!data.ok, issues: Array.isArray(data.issues) ? data.issues : [], faceAngleDetected: typeof data.faceAngleDetected === 'string' ? data.faceAngleDetected : '' };
        }
      } catch (e) {
        // Vérif indisponible -> on N'EMPÊCHE PAS la vente (fail-open). Pré-check back-end à la génération.
        this._renderPhotoVerdict('error');
        this.state.photoOk = true;
        this.updateNextDisabled();
        return;
      }
      if (hash) this._photoVerdicts[hash] = verdict;
      this._applyPhotoVerdict(verdict, {});
    }

    _applyPhotoVerdict(verdict, opts) {
      // 3 états : refusée (ok=false) / acceptée mais pas idéale (angle détecté ≠ angle de l'œuvre)
      // / parfaite. Le « warn » N'EMPÊCHE PAS de continuer (permissif), il informe seulement.
      let kind = 'ok';
      if (!verdict.ok) {
        kind = 'bad';
      } else if (verdict.faceAngleDetected && verdict.faceAngleDetected !== 'none' && verdict.faceAngleDetected !== this.photoFaceAngle) {
        kind = 'warn';
      }
      this._renderPhotoVerdict(kind, verdict, opts || {});
      this.state.photoOk = !!verdict.ok;
      this.persist();
      this.updateNextDisabled();
    }

    // Hash SHA-256 (hex) des octets ORIGINAUX -> clé de dédup déterministe (même fichier = même hash).
    async _hashFile(file) {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Réduit la photo (max maxPx, JPEG) pour l'appel au juge : moins de tokens image, plus rapide.
    _downscalePhoto(file, maxPx, quality) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
        img.src = url;
      });
    }

    // Mock (mode démo) : un nom de fichier contenant « bad/mauvais/ko » simule un refus, sinon OK.
    _mockPhotoVerdict(file) {
      const name = ((file && file.name) || '').toLowerCase();
      if (/bad|mauvais|ko/.test(name)) return { ok: false, issues: ['too_dark', 'angle_mismatch'], faceAngleDetected: 'back' };
      // « warn/face » -> photo acceptée mais angle ≠ œuvre (état ambre) ; sinon angle = œuvre (vert).
      if (/warn|face/.test(name)) return { ok: true, issues: [], faceAngleDetected: this.photoFaceAngle === 'front' ? 'profile' : 'front' };
      return { ok: true, issues: [], faceAngleDetected: this.photoFaceAngle };
    }

    // Bandeau HORIZONTAL : la photo uploadée à GAUCHE, le verdict à DROITE (à hauteur de l'image),
    // même langage couleur que les cartes exemple du dessus (vert OK / ambre pas-idéal / rouge refus)
    // -> on compare sa photo aux exemples d'un coup d'œil, sans pop-up séparée.
    // États : loading / neutral (juge OFF) / ok / warn / error / bad.
    _renderPhotoVerdict(kind, verdict, opts) {
      const el = this.q('[data-photo-verdict]');
      if (!el) return;
      opts = opts || {};
      el.hidden = false;
      const base = 'mt-3 flex items-center gap-3 rounded-xl border-2 p-3 text-left';
      const thumb = this.photoObjectUrl
        ? '<img src="' + this.photoObjectUrl + '" alt="' + escapeHtml(this.i18n.photo_preview_alt || '') + '" class="h-20 w-20 shrink-0 rounded-lg object-cover">'
        : '';
      const col = (inner) => '<div class="min-w-0 flex-1">' + inner + '</div>';

      if (kind === 'loading') {
        el.className = base + ' border-main-10 bg-main-2';
        el.innerHTML = thumb + col('<p class="text-sm text-main-70">' + escapeHtml(this.i18n.photo_check_loading || 'Analyse de votre photo…') + '</p>');
        return;
      }
      if (kind === 'error') {
        el.className = base + ' border-main-10 bg-main-2';
        el.innerHTML = thumb + col('<p class="text-sm text-main-70">' + escapeHtml(this.i18n.photo_check_error || '') + '</p>');
        return;
      }
      if (kind === 'neutral') {
        el.className = base + ' border-main-10 bg-main-2';
        el.innerHTML = thumb + col('<p class="text-sm font-medium text-main">' + escapeHtml(this.i18n.photo_added || '') + '</p>');
        return;
      }
      if (kind === 'ok') {
        el.className = base + ' border-[#5a8a6a] bg-[#eef5ec]';
        el.innerHTML = thumb + col('<p class="text-sm font-semibold text-[#3f6a53]">✓ ' + escapeHtml(this.i18n.photo_check_ok || 'Photo parfaite') + '</p>');
        return;
      }
      if (kind === 'warn') {
        el.className = base + ' border-[#e0a64e] bg-[#fdf4e3]';
        el.innerHTML = thumb + col('<p class="text-sm font-semibold text-[#854f0b]">⚠ ' + escapeHtml(this.i18n.photo_check_warn_title || '') + '</p>'
          + '<p class="mt-0.5 text-xs leading-snug text-[#854f0b]">' + escapeHtml(this._photoWarnMessage()) + '</p>');
        return;
      }
      el.className = base + ' border-[#a93514] bg-[#faf0ec]';
      const intro = opts.same ? (this.i18n.photo_check_same || '') : (this.i18n.photo_check_title_bad || '');
      const msgs = this._photoIssueMessages((verdict && verdict.issues) || []);
      el.innerHTML = thumb + col('<p class="text-sm font-semibold text-[#a93514]">' + escapeHtml(intro) + '</p>'
        + '<ul class="mt-0.5 list-disc space-y-0.5 pl-4 text-xs leading-snug text-[#a93514]">'
        + msgs.map((m) => '<li>' + escapeHtml(m) + '</li>').join('')
        + '</ul>');
    }

    // Codes d'issues -> messages i18n (dé-dupliqués). « angle_mismatch » -> message selon faceAngle.
    _photoIssueMessages(issues) {
      const angleKey = this.photoFaceAngle === 'profile' ? 'photo_issue_angle_profile'
        : this.photoFaceAngle === 'back' ? 'photo_issue_angle_back'
        : this.photoFaceAngle === 'three-quarter' ? 'photo_issue_angle_three_quarter'
        : 'photo_issue_angle_front';
      const map = {
        no_face: 'photo_issue_no_face',
        multiple_faces: 'photo_issue_multiple_faces',
        too_dark: 'photo_issue_too_dark',
        blurry: 'photo_issue_blurry',
        face_too_small: 'photo_issue_face_too_small',
        obstructed: 'photo_issue_obstructed',
        low_quality: 'photo_issue_low_quality',
        nsfw: 'photo_issue_nsfw',
        angle_mismatch: angleKey,
      };
      const out = [];
      (issues || []).forEach((code) => {
        const msg = this.i18n[map[code]] || this.i18n.photo_issue_generic || '';
        if (msg && out.indexOf(msg) === -1) out.push(msg);
      });
      if (!out.length) out.push(this.i18n.photo_issue_generic || '');
      return out;
    }

    // Message « accepté mais pas idéal » selon l'angle attendu par l'œuvre (état ambre).
    _photoWarnMessage() {
      const key = this.photoFaceAngle === 'profile' ? 'photo_warn_angle_profile'
        : this.photoFaceAngle === 'back' ? 'photo_warn_angle_back'
        : this.photoFaceAngle === 'three-quarter' ? 'photo_warn_angle_three_quarter'
        : 'photo_warn_angle_front';
      return this.i18n[key] || '';
    }

    // Consigne photo adaptée à faceAngle (config A) : « …de face / de profil / de dos / de trois-quarts ».
    _applyPhotoCaption() {
      const el = this.q('[data-photo-caption]');
      if (!el) return;
      const key = this.photoFaceAngle === 'profile' ? 'photo_caption_profile'
        : this.photoFaceAngle === 'back' ? 'photo_caption_back'
        : this.photoFaceAngle === 'three-quarter' ? 'photo_caption_three_quarter'
        : 'photo_caption_front';
      const txt = this.i18n[key];
      if (txt) el.textContent = txt;
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
        this.markImageStale(); // l'équipe pilote le maillot dans l'image -> régé requise
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
          <label class="group relative flex h-full min-h-[118px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-main-10 bg-secondary p-2.5 text-center shadow-neu-xs transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-main-5 hover:shadow-neu-md active:scale-[0.98] has-[:checked]:border-[#5a8a6a] has-[:checked]:bg-[#eef5ec] has-[:checked]:shadow-neu-md motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-[126px]">
            <input type="radio" name="studio-team" value="${escapeHtml(team.id)}" class="peer sr-only" data-team-input${checked}>
            <span class="pointer-events-none absolute right-1.5 top-1.5 z-10 hidden h-5 w-5 place-items-center rounded-full bg-[#4f8061] text-secondary shadow-neu-xs peer-checked:grid" aria-hidden="true">${CHECK_SVG_INLINE}</span>
            <span class="block h-14 w-14 overflow-hidden rounded-full border border-main-20 shadow-neu-xs peer-focus-visible:ring-2 peer-focus-visible:ring-main peer-focus-visible:ring-offset-2 sm:h-16 sm:w-16" aria-hidden="true">${crestSvg(colors[0], colors[1] || colors[0])}</span>
            <span class="line-clamp-2 text-xs font-medium leading-tight text-main-80 peer-checked:font-bold peer-checked:text-main">${escapeHtml(team.name)}</span>
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
        this.markImageStale(); // le prénom est imprimé dans l'image -> régé requise
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
        this.markImageStale(); // le numéro est imprimé dans l'image -> régé requise
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
      // Corps élargi : on réduit simplement la taille du prénom quand il est long, pour qu'il tienne dans le dos.
      const len = (nameText.textContent || '').length;
      nameText.setAttribute('font-size', len <= 7 ? '17' : len <= 9 ? '14' : '11');
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

    // Comme selectedOptionByName mais renvoie le HANDLE du métaobjet (data-render-key) plutôt
    // que le libellé traduit -> finition (cadre) STABLE hors français (cf. visualiseur 3D toile).
    // Repli sur le libellé si le produit n'a pas de métaobjet de finition configuré.
    selectedRenderKeyByName(pattern) {
      const radio = Array.from(this.querySelectorAll('[data-studio-option]:checked'))
        .find((candidate) => pattern.test(normalize(candidate.dataset.optionName || '')));
      return radio ? (radio.dataset.renderKey || radio.value) : '';
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
        // Prix DANS le bouton d'achat (pied poster + reveal foot), promo incluse.
        this.updateBuyButtons();
        if (unavailable) unavailable.hidden = true;
      } else {
        this.state.variantId = null;
        if (unavailable) unavailable.hidden = false;
      }
      this.persist();
      this.updateNextDisabled();

      // Aperçu « format » : reflète la nouvelle TAILLE/CADRE (re-mount débounce, uniquement sur
      // l'étape format -> n'allume jamais un contexte WebGL ailleurs).
      if (this.state.step === 'format') {
        clearTimeout(this._fmtPreviewTimer);
        this._fmtPreviewTimer = setTimeout(() => this.mountFormatPreview(), 120);
      }
    }

    /* ------------------------------ bulles d'info format/finition (design fiches toile) */

    // Famille d'une option par son NOM (mêmes regex que selectedOptionByName) -> détermine
    // quels métaobjets/quelle bulle (taille/cadre/bordure). null = option non guidée.
    optionFamily(name) {
      const n = normalize(name || '');
      if (OPTION_FRAME_RE.test(n)) return 'frame';
      if (OPTION_FORMAT_RE.test(n)) return 'size';
      if (OPTION_BORDER_RE.test(n)) return 'border';
      return null;
    }

    // Valeur cochée pour une famille donnée (ex. cadre sélectionné -> « Cadre noyer »).
    selectedValueForFamily(family) {
      const radio = Array.from(this.querySelectorAll('[data-studio-option]:checked'))
        .find((r) => this.optionFamily(r.dataset.optionName) === family);
      return radio ? radio.value : null;
    }

    // Affiche, dans la bulle d'une famille, l'item correspondant à la valeur sélectionnée.
    // Repli : si aucun item ne matche (libellé qui a dérivé du nom de métaobjet), on montre le 1er
    // plutôt qu'une bulle vide.
    updateGuideItem(family) {
      const value = this.selectedValueForFamily(family);
      const items = Array.from(this.querySelectorAll(`[data-studio-guide-item="${family}"]`));
      if (!items.length) return;
      const matched = items.some((item) => item.dataset.value === value);
      items.forEach((item, i) => {
        const show = matched ? item.dataset.value === value : i === 0;
        item.classList.toggle('hidden', !show);
      });
    }

    // Met à jour le libellé du bouton info (cadre/bordure -> nom choisi ; taille -> garde « Guide »).
    updateGuideName(family) {
      if (family === 'size') return;
      const span = this.q(`[data-studio-guide-name="${family}"]`);
      const value = this.selectedValueForFamily(family);
      if (span && value) span.textContent = value;
    }

    bindVariantGuides() {
      // Bouton info -> ouvre la bulle (dialog) de la famille, en montrant l'item sélectionné.
      this.querySelectorAll('[data-studio-guide-open]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const family = btn.dataset.studioGuideOpen;
          const dialog = this.q(`[data-studio-guide="${family}"]`);
          if (!dialog || typeof dialog.showModal !== 'function') return;
          this.updateGuideItem(family);
          dialog.showModal();
        });
      });
      // Fermeture : bouton X + clic sur le fond.
      this.querySelectorAll('[data-studio-guide]').forEach((dialog) => {
        dialog.querySelector('[data-studio-guide-close]')?.addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
      });
      // À chaque changement de variante : maj du nom affiché + de la bulle si elle est ouverte.
      this.querySelectorAll('[data-studio-option]').forEach((radio) => {
        radio.addEventListener('change', () => {
          const family = this.optionFamily(radio.dataset.optionName);
          if (!family) return;
          this.updateGuideName(family);
          const dialog = this.q(`[data-studio-guide="${family}"]`);
          if (dialog && dialog.open) this.updateGuideItem(family);
        });
      });
      // Init des libellés (cadre/bordure -> nom du choix par défaut).
      ['frame', 'border'].forEach((family) => this.updateGuideName(family));
    }

    /* ------------------------------------------ panneaux génériques (text/number/date) */

    // Pour les étapes dont AUCUN panneau de section dédié n'existe (un nouveau produit) : on génère
    // un panneau d'input. Le foot réutilise ses panneaux existants (photo/team/name/format) ;
    // choice/format/photo gardent les leurs ; le groupe maillot reste spécifique au foot.
    findStepDeep(name) {
      for (const step of this.studioSteps) {
        if (step.name === name) return step;
        if (step.type === 'group') {
          const child = (step.children || []).find((c) => c.name === name);
          if (child) return child;
        }
      }
      return null;
    }

    // Sélecteur d'HEURE 24 h localisé (FR « 14 h 05 », DE/NL/ES « 14:05 ») pour les locales non-EN :
    // l'input natif <type=time> affiche 12 h/24 h selon le NAVIGATEUR, pas la langue du site → on
    // force le 24 h via 2 <select>. EN garde l'input natif (12 h AM/PM, validé par Walid).
    timeSelectsHtml(step, name, id) {
      const sep = this.locale === 'fr' ? 'h' : ':';
      const hoursLabel = escapeHtml(this.i18n.hours || 'Heures');
      const minutesLabel = escapeHtml(this.i18n.minutes || 'Minutes');
      const pad = (n) => String(n).padStart(2, '0');
      let hOpts = '<option value=""></option>';
      for (let h = 0; h < 24; h++) hOpts += `<option value="${pad(h)}">${pad(h)}</option>`;
      let mOpts = '<option value=""></option>';
      for (let m = 0; m < 60; m++) mOpts += `<option value="${pad(m)}">${pad(m)}</option>`;
      const selCls = 'rounded-xl border border-main-10 bg-secondary px-3 py-3 text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main';
      return `<div data-time-field="${name}" role="group" aria-labelledby="${id}-label" class="mb-1 flex items-center gap-2">`
        + `<select data-time-part="h" id="${id}" aria-label="${hoursLabel}" class="${selCls}">${hOpts}</select>`
        + `<span aria-hidden="true" class="font-medium text-main-70">${sep}</span>`
        + `<select data-time-part="m" aria-label="${minutesLabel}" class="${selCls}">${mOpts}</select>`
        + '</div>';
    }

    genericPanelHtml(step) {
      const name = escapeHtml(step.name);
      const label = escapeHtml(this.t(step.label) || this.t(step.title) || '');
      const help = escapeHtml(this.t(step.help) || '');
      const placeholder = escapeHtml(this.t(step.placeholder) || '');
      const id = `studio-field-${name}`;
      const isCustomTime = step.type === 'date' && step.mode === 'time' && this.locale !== 'en';
      let field;
      if (isCustomTime) {
        field = this.timeSelectsHtml(step, name, id);
      } else {
        let inputType = 'text';
        let attrs = '';
        if (step.type === 'number') {
          inputType = 'number';
          attrs = `inputmode="numeric"${step.min != null ? ` min="${step.min}"` : ''}${step.max != null ? ` max="${step.max}"` : ''}`;
        } else if (step.type === 'date') {
          inputType = step.mode === 'time' ? 'time' : 'date';
        }
        field = `<input type="${inputType}" id="${id}" data-generic-input data-field="${name}" data-ftype="${escapeHtml(step.type)}" autocomplete="off" placeholder="${placeholder}" ${attrs}`
          + ' class="mb-1 w-full rounded-xl border border-main-10 bg-secondary px-4 py-3 text-main placeholder:text-main-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main">';
      }
      return `<div data-studio-panel="${name}" hidden>`
        + `<label ${isCustomTime ? `id="${id}-label"` : `for="${id}"`} class="mb-1 block text-xs uppercase tracking-wide text-main-70">${label}</label>`
        + field
        + (help ? `<p class="mb-4 text-xs text-main-70">${help}</p>` : '')
        + '</div>';
    }

    renderGenericPanels() {
      const host = this.q('[data-studio-generic-panels]');
      if (!host) return;
      const GENERIC = { text: true, number: true, date: true };
      const toRender = this.studioSteps.filter((step) => GENERIC[step.type] && !this.q(`[data-studio-panel="${step.name}"]`));
      host.innerHTML = toRender.map((step) => this.genericPanelHtml(step)).join('');
      host.querySelectorAll('[data-generic-input]').forEach((input) => {
        const v = (this.state.fields || {})[input.dataset.field];
        if (v != null) input.value = v;
      });
      // Repeuple les sélecteurs d'heure custom (valeur stockée "HH:MM").
      host.querySelectorAll('[data-time-field]').forEach((grp) => {
        const v = (this.state.fields || {})[grp.dataset.timeField];
        if (!v) return;
        const [h, m] = String(v).split(':');
        const hs = grp.querySelector('[data-time-part="h"]');
        const ms = grp.querySelector('[data-time-part="m"]');
        if (hs && h != null) hs.value = h;
        if (ms && m != null) ms.value = m;
      });
    }

    bindGenericInputs() {
      const host = this.q('[data-studio-generic-panels]');
      if (!host) return;
      host.addEventListener('input', (event) => {
        const input = event.target.closest('[data-generic-input]');
        if (!input) return;
        const name = input.dataset.field;
        const ftype = input.dataset.ftype;
        const step = this.findStepDeep(name) || {};
        let v = input.value;
        if (ftype === 'number') {
          const maxLen = step.max != null ? String(step.max).length : undefined;
          v = v.replace(/\D/g, '');
          if (maxLen) v = v.slice(0, maxLen);
        } else if (ftype === 'text') {
          if (step.transform === 'uppercase') v = v.toLocaleUpperCase('fr');
          if (step.charset === 'letters') v = v.replace(/[^A-ZÀ-ÖØ-ÞŒÆ' -]/gi, '');
          if (step.maxLength) v = v.slice(0, step.maxLength);
        }
        if (input.value !== v) input.value = v;
        this.state.fields[name] = v;
        this.persist();
        this.updateNextDisabled();
      });
      // Sélecteurs d'heure custom (heures + minutes) → valeur combinée "HH:MM" (vide si incomplet).
      host.addEventListener('change', (event) => {
        const sel = event.target.closest('[data-time-part]');
        if (!sel) return;
        const grp = sel.closest('[data-time-field]');
        if (!grp) return;
        const name = grp.dataset.timeField;
        const h = (grp.querySelector('[data-time-part="h"]') || {}).value || '';
        const m = (grp.querySelector('[data-time-part="m"]') || {}).value || '';
        this.state.fields[name] = (h !== '' && m !== '') ? `${h}:${m}` : '';
        this.persist();
        this.updateNextDisabled();
      });
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
      if (this.productType) fd.append('productType', this.productType);
      if (this.state.email) fd.append('email', this.state.email);
      return fd;
    }

    async startGeneration() {
      // Étape incomplète (ex. photo perdue après restauration) : on y ramène l'utilisateur.
      const firstInvalid = this.stepNames.find((step) => !this.stepIsValid(step));
      if (firstInvalid) {
        this.showStep(firstInvalid);
        // Cas « photo oubliée à la reprise » (File non persistable) alors qu'une image existe déjà :
        // on EXPLIQUE le renvoi à l'upload au lieu d'un saut muet (UX du chemin « régénérer »).
        const invalidStep = (this.studioSteps || []).find((s) => s.name === firstInvalid);
        if (invalidStep && invalidStep.type === 'photo' && this.state.previewUrl && this.i18n.photo_reupload_hint) {
          this.setPhotoError(this.i18n.photo_reupload_hint);
        }
        return;
      }
      // Une génération ACTIVE sort du mode « invité par lien » : ce job devient celui de la session
      // courante -> on réautorise la mémoire durable locale. cf. A1.
      this.guestLink = false;
      this.enterGeneratingStage();

      if (this.config.mock) {
        // Prénom déclencheur (mock_mode UNIQUEMENT) -> permet de valider CHAQUE écran sans coût.
        const trigger = normTriggerName(this.state.playerName);
        const duration = trigger === MOCK_SLOW_NAME ? MOCK_SLOW_DURATION : MOCK_DURATION;
        this.startWaitProgress(duration);
        this.mockTimer = setTimeout(() => {
          this.state.jobId = `mock-${Date.now()}`;
          this.state.revealCount = 0;
          // ARTISTE = photo confiée à un artiste (manual_review) ; ECHEC = échec définitif.
          // Les deux mènent au MÊME écran « artiste » (cf. pollJob : manual_review|failed -> showArtist).
          if (trigger === MOCK_MANUAL_REVIEW_NAME || trigger === MOCK_FAIL_NAME) {
            this.state.status = trigger === MOCK_FAIL_NAME ? 'failed' : 'manual_review';
            this.persist();
            this.showArtist();
            return;
          }
          // ERREUR = erreur générique (404/timeout/réseau) ; EXPIRE = création expirée (J+30).
          // Même écran d'erreur ; en prod le texte « expiré » vient du back-end (data.message).
          if (trigger === MOCK_ERROR_NAME || trigger === MOCK_EXPIRE_NAME) {
            this.state.status = trigger === MOCK_EXPIRE_NAME ? 'expired' : 'failed';
            this.persist();
            this.showError(this.i18n.generation_error);
            return;
          }
          this.showReveal(this.mockArtworkUrl(0));
          this.resetMockMockups();
        }, duration);
        return;
      }

      this.genStartedAt = Date.now();
      this.startWaitProgress(this._estimateGenDuration());
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
        // Estimation GLOBALE (back-end) si fournie : on recale la barre + on la met en cache pour les
        // prochains lancements (instantané, et partagée par tous les utilisateurs via le back-end).
        if (data && data.estimatedMs > 0) { this._cacheGenEstimate(data.estimatedMs); this._retuneWait(data.estimatedMs); }
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
        // Estimation GLOBALE aussi renvoyée pendant 'processing' (back-end) : recale la barre si le
        // visiteur a rechargé en pleine génération, et met l'estimation en cache pour la prochaine fois.
        if (data.estimatedMs > 0) { this._cacheGenEstimate(data.estimatedMs); this._retuneWait(data.estimatedMs); }
        if (data.status === 'ready') {
          clearInterval(this.pollTimer);
          // Calibrage auto : mémorise la durée réelle (uniquement une vraie génération de cette session).
          if (!this.config.mock && this.genStartedAt) { this._recordGenDuration(Date.now() - this.genStartedAt); this.genStartedAt = null; }
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
      this._waitStartedAt = Date.now();
      this._waitTau = Math.max(GEN_DURATION_MIN, duration) / 1.8; // départ DOUX, ~82 % vers la durée estimée
      let phaseIndex = -1;
      const tick = () => {
        const elapsed = Date.now() - this._waitStartedAt;
        // Courbe ASYMPTOTIQUE : monte vite, puis ralentit, mais PROGRESSE TOUJOURS (jamais figée),
        // sans jamais atteindre 100 % avant la vraie fin (100 % = transformation du bouton au reveal).
        // -> fini le blocage sec à 90 % quand la génération dépasse l'estimation.
        const percent = GEN_PROGRESS_CAP * (1 - Math.exp(-elapsed / this._waitTau));
        if (bar) bar.style.width = `${percent}%`;
        const fill = this.q('[data-gen-fill]');
        if (fill) fill.style.width = `${percent}%`;
        const nextPhase = Math.min(phases.length - 1, Math.floor((percent / GEN_PROGRESS_CAP) * phases.length));
        if (nextPhase !== phaseIndex) {
          phaseIndex = nextPhase;
          if (text) text.textContent = phases[phaseIndex] || '';
        }
      };
      tick();
      clearInterval(this.progressTimer);
      this.progressTimer = setInterval(tick, 500);
    }

    // Recale la durée estimée EN COURS DE ROUTE (ex. estimation globale renvoyée par le back-end au
    // lancement) : la courbe asymptotique reste continue (à faible avancement l'ajustement est invisible).
    _retuneWait(durationMs) {
      if (durationMs > 0) this._waitTau = Math.max(GEN_DURATION_MIN, Math.min(GEN_DURATION_MAX, durationMs)) / 1.8;
    }

    // Durée annoncée par la barre, par ordre de préférence : (1) estimation GLOBALE mise en cache
    // (renvoyée par le back-end, partagée par tous), (2) repli : moyenne glissante des vraies
    // générations de CE navigateur, (3) défaut. Bornée pour ignorer les valeurs aberrantes.
    _estimateGenDuration() {
      try {
        const cached = parseInt(localStorage.getItem(GEN_ESTIMATE_KEY) || '', 10);
        if (cached > 0) return Math.max(GEN_DURATION_MIN, Math.min(GEN_DURATION_MAX, cached));
        const arr = JSON.parse(localStorage.getItem(GEN_DURATIONS_KEY) || '[]');
        if (Array.isArray(arr) && arr.length) {
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          return Math.max(GEN_DURATION_MIN, Math.min(GEN_DURATION_MAX, Math.round(avg)));
        }
      } catch (e) { /* localStorage indispo -> repli */ }
      return REAL_DURATION_ESTIMATE;
    }

    // Met en cache l'estimation GLOBALE renvoyée par le back-end -> dispo instantanément au prochain
    // lancement (et partagée par tous via le back-end). cf. startGeneration / _estimateGenDuration.
    _cacheGenEstimate(ms) {
      try { if (ms > 0) localStorage.setItem(GEN_ESTIMATE_KEY, String(Math.round(ms))); } catch (e) { /* indispo */ }
    }

    // Enregistre la durée d'une vraie génération réussie (moyenne glissante des 5 dernières).
    _recordGenDuration(ms) {
      if (!(ms > 0) || ms > GEN_DURATION_MAX * 2) return; // ignore aberrant (job très long / horloge)
      try {
        let arr = JSON.parse(localStorage.getItem(GEN_DURATIONS_KEY) || '[]');
        if (!Array.isArray(arr)) arr = [];
        arr.push(Math.round(ms));
        if (arr.length > GEN_DURATIONS_KEEP) arr = arr.slice(-GEN_DURATIONS_KEEP);
        localStorage.setItem(GEN_DURATIONS_KEY, JSON.stringify(arr));
      } catch (e) { /* localStorage indispo -> on n'enregistre pas */ }
    }

    showError(message, options = {}) {
      this.stopTimers();
      // L'écran d'erreur n'est PAS un état de génération en cours : on remet le stage à 'form' pour
      // qu'à la réouverture (mémoire durable) open() ne relance PAS le polling d'un job mort (sinon
      // l'utilisateur retombe sur la barre « Création en cours… » au lieu de l'écran d'erreur).
      this.state.stage = 'form';
      const zone = this.q('[data-error-message]');
      if (zone && message) zone.textContent = message;
      // Cap « e-mail requis » : formulaire e-mail directement sur l'écran d'erreur,
      // pré-rempli si l'adresse est déjà connue ; sa soumission relance la génération.
      const emailRequired = !!options.emailRequired;
      const emailForm = this.q('[data-error-email-form]');
      if (emailForm) {
        emailForm.hidden = !emailRequired;
        if (emailRequired) {
          const input = this.q('[data-error-email]');
          if (input && this.state.email && !input.value) input.value = this.state.email;
        }
      }
      // « Réessayer » (= relancer le parcours) n'a de sens que pour un ÉCHEC réel. Sur le cap
      // « e-mail requis », réessayer retombe sur le même cap (il FAUT l'e-mail pour débloquer) ->
      // on masque le bouton, seul le formulaire e-mail est actionnable.
      this._setHidden(this.q('[data-studio-retry]'), emailRequired);
      // Titre de l'en-tête adapté au cas. L'écran d'erreur n'a pas de <h3> -> showScreen ne le réécrit
      // pas, sinon il garderait « Création… » de l'étape d'attente (en contradiction avec le message).
      if (this.stepTitle) {
        const errTitle = emailRequired
          ? (this.i18n.error_title_email || this.i18n.error_title)
          : this.i18n.error_title;
        if (errTitle) this.stepTitle.textContent = errTitle;
      }
      this.showScreen('error');
    }

    /* ------------------------------------------------------------ révélation */

    // Marque l'aperçu généré comme PÉRIMÉ : une donnée présente DANS l'image (prénom, numéro, photo,
    // équipe) a changé -> le prochain « Continuer » à la dernière étape relancera une génération
    // (décomptée côté back-end). Changer le cadre/la taille ne l'appelle PAS (simple recadrage WebGL
    // de la même image utilisateur). Sans effet tant qu'aucune image n'a encore été générée.
    markImageStale() {
      this.state.imageStale = true;
    }

    _applyRevealBg() {
      const body = this.q('[data-studio-body]');
      if (!body) return;
      // Beige (= mur du visualiseur) sur TOUT le corps dès qu'on est sur l'étape du tableau (format) :
      // sélection de format, génération ET reveal -> le « milieu » est uniforme, plus de blanc autour du
      // visualiseur (haut/bas), corps `grow` -> pleine hauteur (mobile OK). Étapes amont (photo/équipe/
      // nom) inchangées ; header (steps) et footer (bouton) jamais touchés.
      const onArtworkStep = this.state.step === 'format';
      body.classList.toggle('bg-[#fcf8ef]', onArtworkStep);
    }

    // REVEAL IN-PLACE (sur l'étape Format, sans changer d'écran) : la dernière vague essuie le
    // placeholder vers la VRAIE image dans le MÊME visualiseur (hot-swap, pas de remontage), le
    // bouton-barre plein devient « Ajouter au panier ». Le repli image + les écrans séparés ne
    // sont plus utilisés pour le chemin heureux.
    showReveal(url, persistState = true, opts = {}) {
      this.stopTimers();
      this.state.previewUrl = url;
      this.state.status = 'ready';
      this.state.stage = 'ready';
      this.state.imageStale = false; // l'image affichée correspond aux champs actuels (pas de régé requise)
      this._applyRevealBg(); // stage 'ready' -> corps beige plein (milieu du tableau)
      // Mise en page « visualiseur plein » garantie : si on arrive ici via « Continuer » (image déjà
      // prête) sans passer par la génération, les options sont encore visibles -> on les masque et on
      // étend le slot. Idempotent quand on vient de la génération (déjà fait par animateIntoGeneration).
      this.q('[data-fmt-options]')?.classList.add('hidden');
      this._fillFormatSlot(false);
      const fill = this.q('[data-gen-fill]');
      if (fill) fill.style.width = '100%'; // barre (= bouton) pleine
      const feedback = this.q('[data-reveal-feedback]');
      if (feedback) feedback.hidden = true;

      // Chrome d'ACHAT du reveal in-place : bouton « Ajouter au panier » + « Retour »/« Une autre
      // version » (rangée du pied) + « Sauvegarder » (haut droite) + titre. On ne le présente qu'une
      // fois la VRAIE image affichée (pas « cliquable avant de voir le résultat »).
      clearTimeout(this._revealChromeTimer);
      let chromeShown = false;
      const showRevealChrome = () => {
        if (chromeShown) return;
        // L'utilisateur a pu naviguer (Retour/fermeture) pendant la vague -> on n'impose pas le chrome
        // d'achat hors contexte reveal (l'event différé/le repli deviennent inoffensifs).
        if (this.state.stage !== 'ready') return;
        chromeShown = true;
        clearTimeout(this._revealChromeTimer);
        this.setNextReady();   // bouton plein -> « Ajouter au panier » (prix + promo)
        this._setHidden(this.navRow, false);
        this._setHidden(this.backButton, false);
        // Mode « invité par lien » (?ca_job, sans session) : « Une autre version » et « Sauvegarder »
        // renverraient 403 -> on les laisse masqués ; l'achat (panier Shopify) reste disponible. cf. A1.
        this._setHidden(this.revealNextLink, !!this.guestLink);
        if (this.revealNextLink) this.revealNextLink.disabled = !!this.guestLink;
        this._setHidden(this.saveButton, !!this.guestLink);
        if (this.stepTitle && this.i18n.reveal_title) this.stepTitle.textContent = this.i18n.reveal_title;
      };

      const pc = this.q('[data-studio-format-webgl-slot] perspective-canvas');
      const pcUsable = Boolean(pc && pc.gl); // canvas RÉELLEMENT initialisé (sinon init KO -> repli <img>)
      if (pcUsable && pc._gen && typeof pc.finishGenerating === 'function') {
        // GÉNÉRATION en cours : la dernière vague essuie le placeholder vers la vraie image. Le bouton
        // reste la barre « Création en cours… » pendant la vague, puis devient « Ajouter au panier »
        // à la fin (event perspective:revealed). Repli temporisé si l'event ne vient pas.
        pc.addEventListener('perspective:revealed', showRevealChrome, { once: true });
        this._revealChromeTimer = setTimeout(showRevealChrome, 4000);
        pc.finishGenerating(url);
      } else if (opts.wave && pcUsable && typeof pc.revealSwap === 'function') {
        // « UNE AUTRE VERSION » : on est DÉJÀ au reveal -> le chrome d'achat reste en place, et l'image
        // fait la MÊME vague (essuyage de la version actuelle vers la nouvelle). Pas de fausse attente.
        showRevealChrome();
        pc.revealSwap(url);
      } else if (pc && !pc.gl && typeof pc.setTexture === 'function') {
        // REPRISE (fermeture puis réouverture sur le reveal) : showStep('format') vient de RE-MONTER le
        // <perspective-canvas> via mountFormatPreview, mais son init WebGL est ASYNC -> pc.gl pas encore
        // prêt ICI (showReveal s'exécute synchrone juste après). On ATTEND 'perspective:ready' puis on pose
        // la texture, au lieu de basculer tout de suite sur _fallbackToImg — qui DÉTRUIRAIT le canvas et
        // afficherait l'image BRUTE en grand (bug). Si l'init échoue vraiment, le backstop 4 s de
        // mountFormatPreview retombe proprement sur le repli <img>.
        pc.addEventListener('perspective:ready', () => {
          if (typeof pc.setTexture === 'function') pc.setTexture(url);
        }, { once: true });
        showRevealChrome();
      } else {
        // Pas de vague (continue / reprise / sans WebGL OU canvas KO) : image posée direct -> chrome
        // immédiat. Un canvas monté mais non initialisé (pcUsable faux) bascule sur le repli <img>.
        if (pcUsable && typeof pc.finishGenerating === 'function') pc.finishGenerating(url);
        else if (pcUsable && typeof pc.setTexture === 'function') pc.setTexture(url);
        else if (this.q('[data-studio-format-webgl-slot] [data-fmt-fallback-img]')) this.swapFallbackImg(url);
        else this._fallbackToImg(url); // canvas KO sans repli encore monté -> on remplace par le <img>
        showRevealChrome();
      }
      if (persistState) this.persist();
    }

    // Entre dans l'étage de GÉNÉRATION : visualiseur (placeholder générique) + overlay « atelier en
    // cours » dans l'écran reveal, chrome d'achat masqué, galerie d'un cycle précédent masquée.
    // Remplace l'ancien écran d'attente séparé (le visualiseur devient le héros continu).
    // GÉNÉRATION IN-PLACE : on RESTE sur l'étape Format (pas de changement d'écran). On masque les
    // options / prix / retour / stepper, on élargit le visualiseur, le bouton « Générer » devient la
    // BARRE qui se remplit, et on lance la VAGUE (poster <-> toile) sur le visualiseur Format déjà monté.
    enterGeneratingStage() {
      this.state.stage = 'generating';
      this._applyRevealBg(); // stage 'generating' -> corps beige plein dès le placeholder
      this._setHidden(this.navRow, true);       // masque « Retour » + « Une autre version »
      this._setHidden(this.saveButton, true);
      this.saveButton?.setAttribute('aria-expanded', 'false');
      const genSaveForm = this.q('[data-studio-save-form]');
      if (genSaveForm) genSaveForm.hidden = true;
      if (this.stepIndicator) this.stepIndicator.hidden = true;
      if (this.stepCheckpoints) { this.stepCheckpoints.hidden = true; this.stepCheckpoints.classList.add('hidden'); }
      const mockZone = this.q('[data-mockup-zone]');
      if (mockZone) mockZone.hidden = true; // pas de mockups d'un cycle précédent pendant la génération
      this.setNextGenerating();   // le bouton devient la barre « Création en cours… »
      this.startFormatWave();     // la vague démarre sur le visualiseur Format
      if (this.stepTitle && this.i18n.wait_title) this.stepTitle.textContent = this.i18n.wait_title;
      this.animateIntoGeneration(); // options qui s'effacent (quinconce) -> visualiseur qui grandit
      this.persist();
    }

    // Transition FLUIDE vers la génération : les options s'effacent (opacité + glissement latéral, en
    // quinconce), puis le visualiseur s'agrandit (petit -> grand) et passe en PLEIN BORD des deux côtés
    // (fond commun, plus de bande blanche à droite). Coupé proprement en motion-reduce.
    // PLEIN CADRE du visualiseur Format (options masquées en amont) : sort le slot du flex, marges
    // négatives -> il couvre TOUT le modal (fond commun, pas de bande blanche), poster un peu plus
    // grand. `animate` = effet « petit -> grand » (entrée en génération) ; sinon application sèche
    // (ex. reveal atteint via « Continuer » sans repasser par la génération). Idempotent.
    _fillFormatSlot(animate) {
      const slot = this.q('[data-studio-format-webgl-slot]');
      if (!slot) return;
      const row = slot.parentElement;
      if (row) row.style.display = 'block';
      slot.classList.remove('md:w-1/2');
      slot.style.width = '';
      slot.style.flexShrink = '';
      slot.style.marginLeft = '-1rem';
      slot.style.marginRight = '-1rem';
      const pc = slot.querySelector('perspective-canvas');
      const fb = slot.querySelector('[data-fmt-fallback-img]');
      if (pc) { pc.classList.remove('max-w-xs'); pc.classList.add('max-w-sm'); }
      if (fb) { fb.classList.remove('max-w-xs'); fb.classList.add('max-w-sm'); } // repli <img> grandit comme le canvas
      if (animate) {
        const growEl = pc || fb || slot; // sans WebGL : on anime le <img> de repli, sinon le slot
        growEl.classList.add('studio-fmt-grow');
        setTimeout(() => growEl.classList.remove('studio-fmt-grow'), 750);
      }
    }

    animateIntoGeneration() {
      const opts = this.q('[data-fmt-options]');
      const fillSlot = () => this._fillFormatSlot(true);
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !opts) {
        if (opts) opts.classList.add('hidden');
        fillSlot();
        return;
      }
      // 1) Options : fondu + glissement latéral, EN QUINCONCE (Format, Finition, prix…).
      const leavers = [].concat(
        Array.from(opts.querySelectorAll('fieldset')),
        [this.q('[data-studio-price-line]')],
      ).filter(Boolean);
      leavers.forEach((el, i) => {
        el.style.transition = 'opacity 0.45s ease, transform 0.5s ease';
        el.style.transitionDelay = (i * 0.12) + 's';
      });
      void opts.offsetWidth; // force un reflow -> la transition part bien de l'état initial (opacité 1)
      leavers.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(30px)';
      });
      // 2) Une fois les options parties : on les retire du flux et le visualiseur grandit pour remplir.
      clearTimeout(this._fmtAnim);
      this._fmtAnim = setTimeout(() => { opts.classList.add('hidden'); fillSlot(); }, 760);
    }

    // Lance la vague (mode génération du moteur) sur le <perspective-canvas> du visualiseur Format.
    // Sans WebGL (repli sobre) : pas de canvas -> seule la barre signale la progression.
    startFormatWave() {
      const pc = this.q('[data-studio-format-webgl-slot] perspective-canvas');
      if (!pc) return;
      const go = () => { if (typeof pc.startGenerating === 'function') pc.startGenerating(); };
      if (pc.gl && pc.ready) go();
      else pc.addEventListener('perspective:ready', go, { once: true });
    }

    // Le bouton du pied DEVIENT la barre de progression : piste claire (.studio-gen-bar) + remplissage
    // [data-gen-fill] (largeur pilotée par startWaitProgress) + label « Création en cours… ». Non cliquable.
    setNextGenerating() {
      const btn = this.nextButton;
      if (!btn) return;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.removeAttribute('data-studio-buy');
      btn.classList.add('studio-gen-bar');
      const label = this.i18n.wait_title || 'Création en cours…';
      btn.innerHTML =
        '<span data-gen-fill data-allow-empty class="absolute inset-y-0 left-0 w-0 bg-buy-button transition-[width] duration-500 ease-out motion-reduce:transition-none" aria-hidden="true"></span>'
        + '<span class="relative z-10 cart-button-text inline-block py-4 md:py-5">' + escapeHtml(label) + '</span>';
    }

    // Fin de génération : le bouton plein redevient un vrai bouton « Ajouter au panier » (prix + promo).
    setNextReady() {
      const btn = this.nextButton;
      if (!btn) return;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('studio-gen-bar');
      this.setNextButtonContent(this.i18n.add_to_cart || '', true);
      this.updateBuyButtons();
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

    /* Aperçu WebGL « format » (poster) : monte un <perspective-canvas> en mode PAPIER dans le
       panneau Format, reflétant la TAILLE + le CADRE choisis. Le moteur en mode studio ignore le
       DOM (config.state figé) -> on RE-MONTE le nœud à chaque changement (pattern « popup », le
       cache de texture rend le re-décodage gratuit). Un seul contexte WebGL : on libère le slot
       du reveal d'abord. Replis identiques au reveal (script absent / reduced-motion / pas de WebGL). */
    mountFormatPreview() {
      const slot = this.q('[data-studio-format-webgl-slot]');
      if (!slot) return;
      slot.innerHTML = '';
      // Après une génération, l'IMAGE GÉNÉRÉE reste dans le visualiseur Format (on ne la « bouge »
      // jamais) : changer cadre/taille la recadre en direct (re-mount), sans régénérer. Avant toute
      // génération, on retombe sur le poster générique (placeholder).
      const src = this.state.previewUrl || (this.config.posterPreview && this.config.posterPreview.src);
      if (!src) { slot.hidden = true; return; }
      // Repli SANS 3D (WebGL indispo / reduced-motion / Save-Data / script absent) : POSTER STATIQUE
      // (<img>) au lieu de masquer le slot -> le reveal a TOUJOURS un visuel + la barre signale la
      // progression. La vraie image y est posée au reveal (swapFallbackImg). cf. chantier B.
      if (!this.canUse3D()) {
        slot.innerHTML = this.decorBgHtml() + this.fallbackImgHtml(src);
        const fb = slot.querySelector('[data-fmt-fallback-img]');
        if (fb) fb.onerror = () => this._fallbackImgError(fb); // 404 -> poster générique, jamais mur vide
        slot.hidden = false;
        return;
      }
      const cfg = {
        ariaLabel: this.i18n.webgl_preview_label,
        material: 'paper',
        raw: { src: src },
        state: {
          border: 'white',
          frame: this.selectedRenderKeyByName(OPTION_FRAME_RE),
          size: this.selectedOptionByName(OPTION_FORMAT_RE),
        },
      };
      const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
      // Fond mur en SIBLING (remplit la bande pleine largeur du slot) + poster centré au-dessus.
      slot.innerHTML = this.decorBgHtml()
        + '<perspective-canvas class="relative z-10 mx-auto block w-full max-w-xs" data-context="studio">'
        + `<canvas class="perspective-canvas-gl block w-full" style="aspect-ratio:4/5" role="img" aria-label="${escapeHtml(this.i18n.webgl_preview_label)}">${escapeHtml(this.i18n.webgl_canvas_caption)}</canvas>`
        + `<script type="application/json" class="perspective-config">${json}</scr` + 'ipt>'
        + '</perspective-canvas>';
      slot.hidden = false;
      // BACKSTOP : le pré-check canUse3D() peut passer alors que l'init du VRAI canvas échoue ensuite
      // (éviction « too many WebGL contexts », getContext/shader KO) -> aucune frame, aucun
      // perspective:ready. Si le canvas n'est toujours pas prêt après le délai, on bascule sur le repli
      // <img> pour ne JAMAIS laisser un visualiseur vide avec un bouton d'achat actif au-dessus.
      clearTimeout(this._webglFallbackTimer);
      this._webglFallbackTimer = setTimeout(() => {
        const pc = slot.querySelector('perspective-canvas');
        if (pc && (!pc.gl || !pc.ready)) this._fallbackToImg(src);
      }, 4000);
    }

    // Bascule le visualiseur Format vers le repli <img> statique en cours de route (init WebGL échouée
    // tardivement). Au reveal, pose la vraie image finale ; sinon le placeholder/poster passé. Idempotent.
    _fallbackToImg(src) {
      const slot = this.q('[data-studio-format-webgl-slot]');
      if (!slot) return;
      const imgSrc = (this.state.stage === 'ready' && this.state.previewUrl)
        || src || (this.config.posterPreview && this.config.posterPreview.src);
      if (!imgSrc) return;
      slot.innerHTML = this.decorBgHtml() + this.fallbackImgHtml(imgSrc);
      const fb = slot.querySelector('[data-fmt-fallback-img]');
      if (fb) fb.onerror = () => this._fallbackImgError(fb);
      slot.hidden = false;
    }

    // Erreur de chargement du repli <img> : dernier recours = le poster générique (jamais un mur vide).
    // Si même le poster échoue, on masque (pas d'icône cassée). L'ACHAT reste valide (le job porte
    // l'image côté serveur) -> on ne bloque pas le bouton sur un simple aléa CDN de l'aperçu.
    _fallbackImgError(fb) {
      if (!fb) return;
      const poster = this.config.posterPreview && this.config.posterPreview.src;
      if (poster && fb.src !== poster && !fb.dataset.triedPoster) {
        fb.dataset.triedPoster = '1';
        fb.style.display = '';
        fb.src = poster;
        return;
      }
      fb.style.display = 'none';
    }

    // True si le visualiseur 3D (WebGL) est utilisable. Sinon -> repli <img> statique (chantier B).
    // Conditions de repli : script perspective-canvas absent, prefers-reduced-motion, mode Save-Data
    // (économie de données), ou WebGL indisponible (vieux mobile / contexte refusé).
    canUse3D() {
      if (!customElements.get('perspective-canvas')) return false;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
      // Aligné sur le gate INTERNE du moteur (component-perspective-canvas init) : il refuse aussi
      // l'init en 2g/slow-2g (pas seulement Save-Data) -> sans ce miroir, on monterait un canvas qui
      // n'init jamais = visualiseur vide. (Le repli a posteriori dans mountFormatPreview couvre le reste.)
      if (conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) return false;
      return this.webglAvailable();
    }

    // Markup du poster STATIQUE de repli (sans 3D) : même placement que le <canvas> (centré, max-w-xs
    // -> il grandit comme lui via _fillFormatSlot). object-contain -> image entière, jamais rognée.
    fallbackImgHtml(src) {
      return '<img data-fmt-fallback-img'
        + ` src="${escapeHtml(src)}" alt="${escapeHtml(this.i18n.webgl_preview_label)}"`
        + ' decoding="async" class="relative z-10 mx-auto block w-full max-w-xs max-h-[58vh] rounded-xl object-contain shadow-neu-sm">';
    }

    // Repli sans WebGL : pose la vraie image générée dans le <img> de repli au reveal (et à « Une
    // autre version »). 404/réseau -> on masque (pas d'icône cassée).
    swapFallbackImg(url) {
      const fb = this.q('[data-studio-format-webgl-slot] [data-fmt-fallback-img]');
      if (!fb || !url) return;
      delete fb.dataset.triedPoster; // nouvelle image -> on autorise à nouveau le recours poster
      fb.onerror = () => this._fallbackImgError(fb);
      fb.style.display = '';
      fb.src = url;
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
      if (!this.q('[data-mockup-zone]')) return; // mises en situation retirées du reveal -> pas de polling
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
      if (!this.q('[data-mockup-zone]')) return; // mises en situation retirées du reveal
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
      this.setResumeNote(null); // la note « Nous retrouvons… » n'a de sens que sur le reveal, pas l'artiste
      // Cohérence de stage (comme showError) : l'écran artiste n'est PAS une génération en cours -> on
      // remet stage='form' pour qu'une réouverture (mémoire durable) ne relance pas le polling d'un job
      // mort. Défense en profondeur : open()/routeResume excluent déjà screen==='artist'. cf. chantier C.
      this.state.stage = 'form';
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
      // Clic EN DEHORS du popover « Sauvegarder » (et hors de son déclencheur) -> on le referme.
      this.dialog.addEventListener('pointerdown', (event) => {
        if (!this.saveButton || this.saveButton.getAttribute('aria-expanded') !== 'true') return;
        if (event.target.closest('[data-studio-save-toggle]')) return;
        if (saveForm && saveForm.contains(event.target)) return;
        this.closeSavePopover();
      });
    }

    // Referme le popover « Sauvegarder » sans toucher au reste du studio (Échap / clic extérieur).
    closeSavePopover() {
      if (this.saveButton) this.saveButton.setAttribute('aria-expanded', 'false');
      this.q('[data-studio-save-form]')?.setAttribute('hidden', '');
    }

    // Bascule de visibilité ROBUSTE : l'attribut `hidden` SEUL est écrasé par une classe d'affichage
    // (inline-flex/flex) -> on bascule AUSSI la classe Tailwind `hidden` (qui, elle, l'emporte).
    // L'attribut reste posé pour l'arbre d'accessibilité. (Gotcha thème : cf. footer/dots.)
    _setHidden(el, hidden) {
      if (!el) return;
      el.hidden = hidden;
      el.classList.toggle('hidden', hidden);
    }

    async revealNext() {
      const button = this.q('[data-studio-reveal-next]');
      button.disabled = true;
      try {
        this.state.revealCount += 1;
        if (this.config.mock) {
          this.showReveal(this.mockArtworkUrl(this.state.revealCount), true, { wave: true });
          this.resetMockMockups();
          return;
        }
        const { response, data } = await this.api(
          `/api/custom-art/jobs/${this.state.jobId}/reveal-next`,
          { method: 'POST' },
        );
        const previewUrl = this.previewFrom(data);
        if (response.ok && previewUrl) {
          // Runner-up n°2 / n°3 : image déjà prête côté serveur -> on l'amène avec la MÊME vague
          // (essuyage vers la nouvelle version), pas un swap sec. (wave: true)
          this.state.mockups = Array.isArray(data.mockups) ? data.mockups : this.state.mockups;
          this.showReveal(previewUrl, true, { wave: true });
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
          this.enterGeneratingStage();
          this.startWaitProgress(this._estimateGenDuration());
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
      // Reveal in-place : le bouton d'achat EST le bouton-barre du pied (data-studio-next), il n'y a
      // plus de [data-studio-add-to-cart] dédié -> repli sur nextButton (évite un null-deref réel).
      const button = this.q('[data-studio-add-to-cart]') || this.nextButton;
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

    // Ajout panier DIRECT (produit personnalisé SANS génération : design fixe, prénom/numéro
    // imprimés). Pas de back-end, pas de garde-fou mock (rien à mocker). Les champs marqués
    // cartProperty deviennent des propriétés de la ligne de commande (lisibles pour l'impression) ;
    // la variante choisie (format/finition) porte le format. Mêmes contrats DOM que addToCart.
    async directAddToCart() {
      const firstInvalid = this.stepNames.find((step) => !this.stepIsValid(step));
      if (firstInvalid) { this.showStep(firstInvalid); return; }

      const button = this.nextButton;
      button.disabled = true;
      const feedback = this.q('[data-studio-cart-feedback]');
      if (feedback) feedback.hidden = true;

      try {
        const response = await fetch('/cart/add.js?sections=tw-cart-drawer,tw-header-painting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{
              id: this.state.variantId || this.config.defaultVariantId,
              quantity: 1,
              properties: this.buildCartProperties(),
            }],
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();

        const cart = await (await fetch('/cart.js')).json();
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
        if (feedback) { feedback.textContent = this.i18n.cart_error; feedback.hidden = false; }
      } finally {
        button.disabled = false;
      }
    }

    // Met en forme une valeur de champ pour l'AFFICHAGE (panier/commande, checkpoint) selon la
    // locale du site. Les inputs natifs date/time renvoient une valeur canonique (date = ISO
    // YYYY-MM-DD, time = "HH:MM" 24 h) ; on la rend lisible et localisée pour la personne qui
    // imprime le poster (FR 22/01/2024 · 18h45, EN 01/22/2024 · 6:45 PM, DE 22.01.2024, NL 22-01-2024).
    displayFieldValue(step, raw) {
      const v = String(raw == null ? '' : raw).trim();
      if (!v) return v;
      if (step && step.type === 'date') {
        if (step.mode === 'time') {
          const tm = v.match(/^(\d{1,2}):(\d{2})/);
          if (!tm) return v;
          let h = parseInt(tm[1], 10);
          const m = tm[2];
          if (this.locale === 'en') {
            const ampm = h < 12 ? 'AM' : 'PM';
            let h12 = h % 12; if (h12 === 0) h12 = 12;
            return `${h12}:${m} ${ampm}`;
          }
          const hh = String(h).padStart(2, '0');
          return this.locale === 'fr' ? `${hh}h${m}` : `${hh}:${m}`;
        }
        const dm = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!dm) return v;
        const [, y, mo, d] = dm;
        if (this.locale === 'en') return `${mo}/${d}/${y}`;
        if (this.locale === 'de') return `${d}.${mo}.${y}`;
        if (this.locale === 'nl') return `${d}-${mo}-${y}`;
        return `${d}/${mo}/${y}`; // fr, es, défaut
      }
      return v;
    }

    // Propriétés de ligne de commande depuis les étapes marquées cartProperty (mode sans génération).
    // Clé = libellé lisible (cartProperty.label i18n, sinon checkpointLabel/label/title), valeur = saisie.
    buildCartProperties() {
      const props = {};
      const fields = this.state.fields || {};
      const collect = (step) => {
        if (step.type === 'group') { (step.children || []).forEach(collect); return; }
        if (!step.cartProperty) return;
        const value = this.displayFieldValue(step, fields[step.name]);
        if (value == null || value === '') return;
        let label = (step.cartProperty && typeof step.cartProperty === 'object' && step.cartProperty.label)
          ? this.t(step.cartProperty.label)
          : (this.t(step.checkpointLabel) || this.t(step.label) || this.t(step.title) || step.name);
        // Anti-écrasement : si deux libellés résolvent à l'identique, on retombe sur le name (unique).
        if (label in props) label = step.name;
        props[label] = value;
      };
      this.studioSteps.forEach(collect);
      return props;
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

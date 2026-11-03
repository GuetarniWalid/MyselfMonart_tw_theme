/*
 * product-selection.js — le choix du visiteur, transmis par UN événement (fiche-3d, ticket 05)
 * ----------------------------------------------------------------------------------------------
 * À chaque choix sur la fiche toile ou poster (taille, bordure, cadre, couleur du cadre, contour
 * blanc), à la souris, au doigt ou au clavier, UN SEUL événement part sur `document` :
 *
 *   document.addEventListener('mma:selection-change', (e) => { const s = e.detail; ... });
 *
 * Il part APRÈS les réactions de la fiche (prix et bouton d'achat, disponibilités, couleur du
 * cadre recopiée en propriété de ligne, bascule automatique vers un cadre disponible) : ces
 * rebonds internes n'envoient pas d'événement de plus, le détail décrit l'état final.
 *
 *   e.detail = {
 *     changed:     'size' | 'border' | 'frame' | 'whiteBorder' | null,
 *                  // option que le visiteur vient de choisir. null : la fiche a changé seule, sans
 *                  // geste du visiteur (bascule automatique vers une option disponible, au chargement
 *                  // ou après la bascule toile/poster) ; l'état transmis reste à jour.
 *     variant:     { id, title, price, compareAtPrice, available } | null,
 *                  // variante Shopify, prix en centimes ; null si la combinaison n'existe pas.
 *                  // Prix catalogue : une remise du bloc d'achat (promotion_discount) n'y est pas
 *                  // appliquée, le prix affiché reste celui du bouton.
 *     options:     [{ position, kind, value, key }],
 *                  // options cochées, dans l'ordre Shopify (option1..3). kind : 'size' | 'border'
 *                  // | 'frame' | null. value : valeur Shopify, traduite. key : handle du métaobjet
 *                  // (bordure, cadre de toile), stable dans toutes les langues, ou null.
 *                  // Poster : l'option « Cadres » vaut « Sans cadre » ou « Avec cadre ».
 *     frameColor:  { name, key } | null,
 *                  // poster : couleur du cadre (propriété de ligne, pas une variante) ;
 *                  // null = sans cadre, ou toile (son cadre est l'option kind 'frame')
 *     whiteBorder: true | false | null,
 *                  // poster : contour blanc (passe-partout, propriété de ligne) ; null = option absente
 *   }
 *
 * État courant à tout moment (au chargement, après la bascule toile/poster `mma:soft-navigation`) :
 *   window.MMASelection.read()   // même forme, changed: null
 *
 * L'adresse suit la variante (history.replaceState, ?variant=<id>) : un lien partagé rouvre la même
 * variante, au même prix (le serveur rend selected_or_first_available_variant). La couleur du cadre
 * et le contour blanc, propriétés de ligne, ne sont pas dans l'adresse.
 *
 * Chargé par snippets/painting-variant-picker.liquid, qui déclare le type de chaque rangée
 * (data-option-kind). Écouteurs posés une seule fois sur `window` : ils survivent au remplacement
 * de #MainContent (bascule toile/poster, assets/product-twin-toggle.js) sans doublon, et ne
 * dépendent pas de l'ordre de chargement des scripts. Le studio des posters personnalisés a ses
 * propres radios (data-studio-*) : il n'est pas concerné.
 *
 * Le calcul (buildSelection, withVariantParam) est pur et testé : scripts/product-selection.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------

  // snapshot = { variants: `product.variants | json`, choices: radios cochés [{ position, kind,
  // value, key, frameMode?, colorName?, colorHandle? }], whiteBorder: 'on' | 'off' | null, changed }
  function buildSelection(snapshot) {
    const options = snapshot.choices
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ position: c.position, kind: c.kind, value: c.value, key: c.key }));
    const valueAt = (position) => {
      const option = options.find((o) => o.position === position);
      return option ? option.value : null;
    };
    // Même règle que VariantPicker.getVariantData (assets/main-product.js) : option absente = null.
    const match = snapshot.variants.find(
      (v) => v.option1 === valueAt(1) && v.option2 === valueAt(2) && v.option3 === valueAt(3),
    );
    // Poster : la pastille « Avec cadre » cochée porte la couleur (data-frame-mode="framed").
    const framed = snapshot.choices.find((c) => c.frameMode === 'framed');
    return {
      changed: snapshot.changed,
      variant: match
        ? {
            id: match.id,
            title: match.title,
            price: match.price,
            compareAtPrice: match.compare_at_price,
            available: match.available,
          }
        : null,
      options,
      frameColor: framed ? { name: framed.colorName, key: framed.colorHandle } : null,
      whiteBorder: snapshot.whiteBorder == null ? null : snapshot.whiteBorder === 'on',
    };
  }

  // Adresse de la page avec ?variant=<id> ; les autres paramètres et l'ancre sont gardés. Déjà sur
  // cette variante : l'adresse revient telle quelle (aucun réencodage, aucune écriture d'historique).
  function withVariantParam(href, variantId) {
    const url = new URL(href);
    if (url.searchParams.get('variant') === String(variantId)) return href;
    url.searchParams.set('variant', String(variantId));
    return url.toString();
  }

  // Node (tests) : seul le calcul pur est exporté.
  if (typeof window === 'undefined') {
    module.exports = { buildSelection, withVariantParam };
    return;
  }

  // ---- Navigateur ------------------------------------------------------------------------------

  // Garde anti double-inclusion : le script est rendu par le sélecteur de la fiche, et la bascule
  // toile/poster peut le recharger.
  if (window.MMASelection) return;

  const EVENT = 'mma:selection-change';
  const VARIANT_RADIO = 'painting-variant-picker input[type="radio"]';
  const WHITE_BORDER_RADIO = 'input[type="radio"][data-white-border]';

  function isChoice(target) {
    return (
      !!target &&
      typeof target.matches === 'function' &&
      (target.matches(VARIANT_RADIO) || target.matches(WHITE_BORDER_RADIO))
    );
  }

  // Type d'option, déclaré par le sélecteur sur la rangée (data-option-kind).
  function kindOf(input) {
    const row = input.closest('[data-option-kind]');
    return row ? row.dataset.optionKind : null;
  }

  // Le visiteur agit-il ? Une vraie interaction (clic, toucher, touche) lève le drapeau pour la tâche
  // en cours ; il retombe à la tâche suivante. Les bascules automatiques de la fiche (.click() au
  // chargement, après la bascule toile/poster) arrivent hors de ces tâches : changed y vaut null.
  // isTrusted ne suffit pas sur le `change` lui-même : Chromium le marque fiable même après un
  // .click() du script (mesuré).
  let visitorActing = false;
  let visitorTimer = 0;
  function noteVisitorInput(e) {
    if (!e.isTrusted) return;
    visitorActing = true;
    clearTimeout(visitorTimer);
    visitorTimer = setTimeout(() => {
      visitorActing = false;
    }, 0);
  }
  ['pointerdown', 'click', 'keydown'].forEach((type) => window.addEventListener(type, noteVisitorInput, true));

  // Variantes du produit affiché, relues quand le nœud change (bascule toile/poster).
  let variantsNode = null;
  let variants = [];
  function readVariants() {
    const node = document.getElementById('variants-data-json');
    if (node !== variantsNode) {
      variantsNode = node;
      try {
        variants = node ? JSON.parse(node.textContent) : [];
      } catch (e) {
        variants = [];
      }
    }
    return variants;
  }

  function readChoices() {
    return Array.from(document.querySelectorAll(VARIANT_RADIO))
      .filter((input) => input.checked)
      .map((input) => {
        const position = /^option(\d+)$/.exec(input.name);
        if (!position) return null;
        return {
          position: Number(position[1]),
          kind: kindOf(input),
          value: input.value,
          key: input.dataset.renderKey || null,
          frameMode: input.dataset.frameMode || null,
          colorName: input.dataset.colorName || null,
          colorHandle: input.dataset.colorHandle || null,
        };
      })
      .filter(Boolean);
  }

  function readWhiteBorder() {
    if (!document.querySelector(WHITE_BORDER_RADIO)) return null;
    const checked = document.querySelector(WHITE_BORDER_RADIO + ':checked');
    return checked ? checked.dataset.whiteBorder : null;
  }

  function read(changed) {
    return buildSelection({
      variants: readVariants(),
      choices: readChoices(),
      whiteBorder: readWhiteBorder(),
      changed,
    });
  }

  function publish(changed) {
    const selection = read(changed);
    if (selection.variant) {
      const next = withVariantParam(window.location.href, selection.variant.id);
      if (next !== window.location.href) {
        // history.state gardé : la bascule toile/poster y range son marqueur de retour arrière.
        try {
          window.history.replaceState(window.history.state, '', next);
        } catch (e) {
          // Adresse inchangée (navigateur qui refuse) : le choix reste valable.
        }
      }
    }
    document.dispatchEvent(new CustomEvent(EVENT, { detail: selection }));
  }

  // UN événement par choix. La capture sur `window` (1er nœud traversé) retient le `change` qui
  // ouvre le choix ; la remontée sur `window` (dernier nœud traversé, après tous les écouteurs de
  // la page) publie l'état final. Un `change` imbriqué (bascule automatique vers un cadre
  // disponible, par .click() pendant le premier) arrive pendant que le premier est encore en cours
  // de propagation : il est ignoré, son effet figure dans l'état final. Un choix dont la
  // propagation aurait été stoppée avant `window` (eventPhase revenu à NONE) ne bloque pas le
  // suivant.
  let pendingChoice = null;
  window.addEventListener(
    'change',
    (e) => {
      if (pendingChoice && pendingChoice.event.eventPhase !== Event.NONE) return;
      pendingChoice = isChoice(e.target)
        ? { event: e, changed: visitorActing ? kindOf(e.target) : null }
        : null;
    },
    true,
  );
  window.addEventListener('change', (e) => {
    if (!pendingChoice || pendingChoice.event !== e) return;
    const { changed } = pendingChoice;
    pendingChoice = null;
    publish(changed);
  });

  window.MMASelection = { EVENT, read: () => read(null) };
})();

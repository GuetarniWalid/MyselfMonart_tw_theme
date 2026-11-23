/*
 * collection-filtres.js — la ligne des filtres de la nouvelle page collection (ticket 06 de .scratch/collection-design)
 * ----------------------------------------------------------------------------------------------------------------
 * Chargé par la ligne elle-même (snippets/collection-filtres.liquid, rendue par sections/collection-grille.liquid),
 * donc sur cette page seulement. Le serveur écrit tout : les familles, leurs valeurs et leurs nombres, les textes dans
 * la langue de la page (« Voir les 103 tableaux », « Couleur · 2 », la phrase de la zone parlée). Le script choisit
 * quand demander une page filtrée, et pose dans la page ce que le serveur renvoie.
 *
 * - Ordinateur (900 px et plus) : chaque famille est un menu (<details>). Un clic sur une valeur change la grille
 *   derrière, le menu reste ouvert ; il se ferme au clic en dehors, avec Échap (le focus revient au bouton), ou par
 *   fermerMenu() (l'en-tête qui part, ticket 07).
 * - Téléphone : le bouton d'une famille ouvre le panneau posé en bas, le <dialog> #feuille, ouvert par showModal(), où
 *   le script déplace le panneau de la famille. C'est un brouillon : la grille ne bouge pas avant « Voir les N
 *   tableaux », dont le nombre suit chaque toucher ; la croix, le voile, Échap et le retour du téléphone ferment sans
 *   rien changer (le panneau ouvert a son entrée d'historique : Retour le ferme, sans défaire le dernier filtre).
 * - Une seule requête par changement : la grille et l'entrée de la page (#nombre-haut), en une fois, par le rendu des
 *   sections de Shopify (?sections=…), jamais la page entière. « Voir » reprend la réponse du dernier brouillon.
 * - Ensuite : la ligne, les filtres actifs, la grille (sa suite repart du premier lot, ses liens ?page=N portent les
 *   filtres), le nombre du haut, la zone parlée ; une entrée d'historique (pushState) ; Retour et Suivant refont la
 *   page de leur adresse (popstate). Si la ligne était collée, on remonte au début des résultats, jamais en haut.
 * - La mesure : chaque changement appliqué part sur document, mma:filter-applied, { famille, valeur, action,
 *   resultats } ; assets/posthog-tracking.js le transmet en filter_applied.
 * Ce qu'il corrige de assets/collection-tag-filter.js (les pages d'aujourd'hui) : une requête par changement (il en
 * faisait deux, dont la page entière), plus de retour en haut de la page, l'écoute de popstate, un brouillon.
 *
 * Le calcul pur est testé sous Node : scripts/collection-filtres.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------------------------

  // Ce qui ne passe pas d'une adresse filtrée à la suivante : la page (un choix repart du premier lot), les demandes de
  // sections, le tri et les filtres, que le formulaire redonne.
  const HORS_CHOIX = ['page', 'section_id', 'sections', 'sort_by'];

  /* L'adresse d'un choix : le chemin de la collection, les paramètres de l'adresse actuelle qui ne sont pas un choix
     (la vue ?view=refonte, une campagne), puis les paires du formulaire (filtres de la boutique, tri), une fois
     chacune, sans le tri de la collection. Comme le ferait le formulaire envoyé sans script. */
  function adresseFiltree(chemin, recherche, paires, triDefaut) {
    const params = new URLSearchParams(recherche);
    [...params.keys()].forEach((cle) => {
      if (cle.startsWith('filter.') || HORS_CHOIX.includes(cle)) params.delete(cle);
    });
    const vues = new Set();
    paires.forEach(([cle, valeur]) => {
      if (valeur === '' || (cle === 'sort_by' && valeur === triDefaut)) return;
      const paire = `${cle}=${valeur}`;
      if (vues.has(paire)) return;
      vues.add(paire);
      params.append(cle, valeur);
    });
    const requete = params.toString();
    return requete ? `${chemin}?${requete}` : chemin;
  }

  // La même adresse, demandée au rendu des sections de Shopify : le HTML de chaque section, dans un objet JSON.
  function adresseSections(adresse, ids) {
    return `${adresse}${adresse.includes('?') ? '&' : '?'}sections=${ids.join(',')}`;
  }

  // Ce qui fait une page de résultats : ses paramètres, dans n'importe quel ordre, sans la page ni les sections.
  function signature(recherche) {
    const params = new URLSearchParams(recherche);
    ['page', 'section_id', 'sections'].forEach((cle) => params.delete(cle));
    return [...params].map(([cle, valeur]) => `${cle}=${valeur}`).sort().join('&');
  }

  /* Le changement appliqué, pour la mesure. avant, apres : { tri, valeurs: [{ famille, cle, nom }] }. Des valeurs
     ajoutées (ensemble, depuis le panneau du téléphone), ou retirées (de plusieurs familles : « Tout effacer »), ou le
     tri ; rien n'a changé : null. */
  function decrireChangement(avant, apres) {
    const cles = (etat) => new Set(etat.valeurs.map((v) => v.cle));
    const avantCles = cles(avant);
    const apresCles = cles(apres);
    const ajouts = apres.valeurs.filter((v) => !avantCles.has(v.cle));
    const retraits = avant.valeurs.filter((v) => !apresCles.has(v.cle));
    const noms = (liste) => liste.map((v) => v.nom).join(', ');
    if (ajouts.length) return { famille: ajouts[0].famille, valeur: noms(ajouts), action: 'ajout' };
    if (retraits.length) {
      const familles = new Set(retraits.map((v) => v.famille));
      if (!apres.valeurs.length && familles.size > 1) return { famille: 'tout', valeur: noms(retraits), action: 'effacer' };
      return { famille: retraits[0].famille, valeur: noms(retraits), action: 'retrait' };
    }
    if (avant.tri !== apres.tri) return { famille: 'tri', valeur: apres.tri, action: 'tri' };
    return null;
  }

  // La recherche d'un thème : sans accent ni capitale (« elep » trouve « Éléphant »).
  const normaliser = (texte) => String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const correspond = (nom, requete) => normaliser(nom).includes(normaliser(requete));

  // Node (tests) : le calcul seul.
  if (typeof window === 'undefined') {
    module.exports = { adresseFiltree, adresseSections, signature, decrireChangement, correspond };
    return;
  }

  // ---- Navigateur ----------------------------------------------------------------------------------------------

  const ORDI = window.matchMedia('(min-width: 900px)');
  const PREFIXE_SECTION = 'shopify-section-';
  // L'entrée d'historique du panneau du téléphone : Retour le ferme (fiche du spécialiste des filtres, § 8).
  const ETAT_PANNEAU = 'filtresPanneau';

  /* Un défilement d'un coup (« instant » : un navigateur plus ancien ne le connaît pas). L'en-tête qui suit le doigt
     (assets/collection-entete.js, ticket 07) l'apprend juste avant : ce saut n'est pas un geste du doigt. entete :
     'reste' (l'en-tête ne bouge pas) ou 'revient' (il revient en entier). */
  function defiler(top, entete) {
    document.dispatchEvent(new CustomEvent('mma:saut-voulu', { detail: { entete } }));
    try {
      window.scrollTo({ top, behavior: 'instant' });
    } catch (erreur) {
      window.scrollTo(0, top);
    }
  }

  // Les textes rendus par le serveur, d'un morceau de page à l'autre (« Voir les 103 tableaux »…).
  function copierTextes(ici, la, selecteurs) {
    selecteurs.forEach((selecteur) => {
      const cible = ici.querySelector(selecteur);
      const source = la.querySelector(selecteur);
      if (cible && source) cible.textContent = source.textContent;
    });
  }

  const visible = (element) => element.getClientRects().length > 0;
  const panneauEnHistoire = () => !!(window.history.state && window.history.state[ETAT_PANNEAU]);

  class CollectionFiltres extends HTMLElement {
    connectedCallback() {
      if (this.pret) return;
      this.form = this.querySelector('.filtres-form');
      this.feuille = this.querySelector('.filtres-feuille');
      if (!this.form) return;
      this.pret = true;
      // Le panneau posé en bas existe-t-il ? Sinon (navigateur ancien), la famille s'ouvre sur place, comme sans script.
      this.modal = !!this.feuille && typeof this.feuille.showModal === 'function';
      this.sequence = 0; // le dernier changement demandé : une réponse plus ancienne ne se pose pas
      this.requete = null; // la requête en cours : { adresse, promesse, controleur }
      this.derniere = null; // la dernière réponse : { adresse, grille, entree }
      this.feuilleOuverte = null; // le panneau du téléphone ouvert, et son brouillon
      this.enAttente = null; // la famille d'un menu ouvert, telle que le serveur l'a rendue ensuite
      this.etatApplique = this.etat();
      this.signatureAffichee = signature(window.location.search);

      this.addEventListener('change', (e) => this.surChangement(e));
      this.addEventListener('input', (e) => {
        if (e.target.matches('.filtres-cherche')) this.chercher(e.target.closest('.filtres-panneau'));
      });
      this.addEventListener('keydown', (e) => {
        // Entrée dans la recherche d'un thème n'envoie pas le formulaire.
        if (e.key === 'Enter' && e.target.matches('.filtres-cherche')) e.preventDefault();
      });
      this.addEventListener('click', (e) => this.surClic(e));
      this.addEventListener('toggle', (e) => this.surBascule(e), true);
      this.form.addEventListener('submit', (e) => this.surEnvoi(e));
      if (this.feuille) this.feuille.addEventListener('close', () => this.surFermeture());
      this.surClicPage = (e) => this.clicPage(e);
      this.surTouche = (e) => {
        if (e.key === 'Escape' && this.querySelector('.filtres-famille[open]')) {
          e.preventDefault();
          this.fermerMenu(true);
        }
      };
      this.surRetour = () => this.retour();
      this.surMode = () => {
        if (this.feuilleOuverte) this.feuille.close();
        this.fermerMenu(false);
        this.majMode();
      };
      document.addEventListener('click', this.surClicPage);
      document.addEventListener('keydown', this.surTouche);
      window.addEventListener('popstate', this.surRetour);
      ORDI.addEventListener('change', this.surMode);
      this.majMode();
      this.setAttribute('data-pret', '');
    }

    disconnectedCallback() {
      if (!this.pret) return;
      document.removeEventListener('click', this.surClicPage);
      document.removeEventListener('keydown', this.surTouche);
      window.removeEventListener('popstate', this.surRetour);
      ORDI.removeEventListener('change', this.surMode);
      this.pret = false;
    }

    // ---- L'état du formulaire ----

    // L'adresse du choix que montre le formulaire.
    adresse() {
      const paires = [...new FormData(this.form)];
      return adresseFiltree(window.location.pathname, window.location.search, paires, this.dataset.triDefaut || '');
    }

    etat() {
      const choixTri = this.form.elements.sort_by;
      return {
        tri: choixTri ? choixTri.value : '',
        valeurs: [...this.form.querySelectorAll('.filtres-case:checked')].map((c) => ({
          famille: (c.closest('[data-famille]') || {}).dataset?.famille || '',
          cle: `${c.name}=${c.value}`,
          nom: c.dataset.nom || '',
        })),
      };
    }

    // Cocher ou décocher une valeur ; un thème réuni (deux valeurs dans Search & Discovery) emporte l'autre avec lui.
    cocher(caseAcocher, oui) {
      caseAcocher.checked = oui;
      const puce = caseAcocher.closest('.filtres-puce');
      if (puce) puce.querySelectorAll('[data-jumeau]').forEach((jumeau) => { jumeau.disabled = !oui; });
    }

    choisirTri(valeur) {
      const choixTri = this.form.elements.sort_by;
      if (!choixTri) return;
      choixTri.value = valeur;
      if (choixTri.value !== valeur) choixTri.selectedIndex = 0;
    }

    // « Effacer la couleur » : seulement s'il y a un choix dans la famille.
    majEffacer(panneau) {
      const effacer = panneau.querySelector('.filtres-effacer');
      if (effacer) effacer.hidden = !panneau.querySelector('.filtres-case:checked');
    }

    // Sur téléphone, le bouton d'une famille ouvre un panneau ; sur ordinateur, un menu.
    majMode() {
      this.querySelectorAll('summary.filtres-fac').forEach((bouton) => {
        if (ORDI.matches || !this.modal) bouton.removeAttribute('aria-haspopup');
        else bouton.setAttribute('aria-haspopup', 'dialog');
      });
    }

    premierBouton() {
      return this.querySelector('summary.filtres-fac');
    }

    // ---- Les gestes ----

    surChangement(e) {
      const cible = e.target;
      if (cible.matches('.filtres-case')) {
        this.cocher(cible, cible.checked);
        if (this.feuilleOuverte) this.majBrouillon();
        else this.appliquer();
      } else if (cible.name === 'sort_by') {
        this.appliquer();
      }
    }

    surClic(e) {
      const bouton = e.target.closest('summary.filtres-fac');
      if (bouton) {
        if (!ORDI.matches && this.modal) {
          e.preventDefault();
          this.ouvrirFeuille(bouton.parentElement);
        }
        return;
      }
      if (e.target.closest('[data-fermer]')) {
        if (this.feuilleOuverte) this.feuille.close();
        return;
      }
      const effacer = e.target.closest('[data-effacer]');
      if (effacer) {
        e.preventDefault();
        this.effacerFamille(effacer.closest('.filtres-panneau'));
        return;
      }
      // Le voile du panneau : un clic hors du panneau tombe sur le <dialog> lui-même.
      if (e.target === this.feuille && this.feuilleOuverte) this.feuille.close();
    }

    // « Voir les N tableaux » : dans le panneau du téléphone, il applique le brouillon ; dans un menu, la grille est déjà
    // à jour, le menu se ferme. Le choix montré n'est pas encore celui de la grille : il s'applique.
    surEnvoi(e) {
      e.preventDefault();
      if (this.feuilleOuverte) {
        this.feuilleOuverte.valide = true;
        this.feuille.close();
        return;
      }
      this.fermerMenu(true);
      if (signature(new URL(this.adresse(), window.location.origin).search) !== this.signatureAffichee) this.appliquer();
    }

    // Un menu de l'ordinateur s'ouvre ou se ferme ; la suite des thèmes s'ouvre ou se replie.
    surBascule(e) {
      const details = e.target;
      if (details.matches('.filtres-tous')) {
        const champ = details.querySelector('.filtres-cherche');
        if (!details.open) {
          // Repliée, la suite oublie sa recherche : les thèmes du haut reparaissent tous.
          if (champ && champ.value) {
            champ.value = '';
            this.chercher(details.closest('.filtres-panneau'));
          }
          return;
        }
        if (champ) champ.focus({ preventScroll: true });
        const menu = details.closest('.filtres-famille[open]');
        if (menu) this.placerMenu(menu);
        return;
      }
      if (!details.matches('.filtres-famille')) return;
      if (!details.open) {
        this.poserEnAttente(details);
        return;
      }
      // Sur téléphone, une famille ne s'ouvre pas sur place : son panneau est posé en bas.
      if (!ORDI.matches && this.modal) {
        details.open = false;
        return;
      }
      this.querySelectorAll('.filtres-famille[open]').forEach((autre) => {
        if (autre !== details) autre.open = false;
      });
      if (!ORDI.matches) return;
      this.placerMenu(details);
      const premiere = details.querySelector('.filtres-case');
      if (premiere) premiere.focus({ preventScroll: true });
    }

    // Hors de la ligne : les filtres actifs et « Voir les 327 tableaux, sans filtre » ; un clic ailleurs ferme le menu.
    clicPage(e) {
      const lien = e.target.closest('#resume [data-retirer], #resume [data-retirer-tri], [data-tout]');
      if (lien && !this.contains(lien)) {
        e.preventDefault();
        this.retirer(lien);
        return;
      }
      const ouvert = this.querySelector('.filtres-famille[open]');
      if (ouvert && ORDI.matches && !ouvert.contains(e.target)) this.fermerMenu(false);
    }

    // Une pastille des filtres actifs, « Tout effacer », ou « Voir les 327 tableaux, sans filtre ».
    retirer(lien) {
      if (lien.hasAttribute('data-tout')) {
        this.form.querySelectorAll('.filtres-case').forEach((c) => this.cocher(c, false));
        this.choisirTri('best-selling');
        this.appliquer({ focus: () => this.premierBouton() });
        return;
      }
      if (lien.hasAttribute('data-retirer-tri')) {
        this.choisirTri('best-selling');
      } else {
        // La case de ce filtre : la sienne, ou celle du thème réuni dont il est l'autre valeur.
        const puce = [...this.form.querySelectorAll('.filtres-puce')].find((p) => [...p.querySelectorAll('input')]
          .some((champ) => champ.name === lien.dataset.retirer && champ.value === lien.dataset.valeur));
        const caseAcocher = puce && puce.querySelector('.filtres-case');
        if (caseAcocher) this.cocher(caseAcocher, false);
      }
      // Ensuite, le focus va à la pastille suivante (parmi celles qui se voient : sur ordinateur, celle du tri est
      // cachée) ; s'il n'y en a plus, au premier bouton de la ligne.
      const pastillesVisibles = () => [...document.querySelectorAll('#resume .filtres-pastille')].filter(visible);
      const rang = pastillesVisibles().indexOf(lien);
      this.appliquer({
        focus: () => {
          const pastilles = pastillesVisibles();
          return pastilles[Math.min(Math.max(rang, 0), pastilles.length - 1)] || this.premierBouton();
        },
      });
    }

    effacerFamille(panneau) {
      if (!panneau) return;
      panneau.querySelectorAll('.filtres-case').forEach((c) => this.cocher(c, false));
      const premiere = () => panneau.querySelector('.filtres-case');
      if (this.feuilleOuverte) {
        this.majBrouillon();
        if (premiere()) premiere().focus();
      } else {
        this.appliquer({ focus: premiere });
      }
    }

    // ---- Le panneau du téléphone : un brouillon ----

    /* Le panneau d'une famille, déplacé dans le <dialog> posé en bas, ouvert par showModal(). Une entrée d'historique,
       à la même adresse : Retour (le bouton du navigateur, le geste de l'iPhone) ferme le panneau sans quitter la page
       ni défaire le dernier filtre. */
    ouvrirFeuille(famille) {
      const panneau = famille.querySelector('.filtres-panneau');
      if (!panneau) return;
      const voir = panneau.querySelector('.filtres-voir');
      const titre = panneau.querySelector('.filtres-panneau-titre');
      this.feuilleOuverte = {
        famille,
        panneau,
        valide: false,
        cases: [...panneau.querySelectorAll('.filtres-case')].map((c) => [c, c.checked]),
        adresse: this.adresse(),
        voir: voir ? voir.textContent : '',
      };
      if (titre) this.feuille.setAttribute('aria-labelledby', titre.id);
      this.feuille.append(panneau);
      this.feuille.showModal();
      document.body.classList.add('overflow-hidden');
      window.history.pushState({ [ETAT_PANNEAU]: true }, '');
      if (titre) titre.focus();
    }

    // Chaque toucher : « Effacer la couleur » tout de suite, puis le nombre de « Voir les N tableaux » demandé au
    // serveur ; la grille ne bouge pas.
    majBrouillon() {
      const ouverte = this.feuilleOuverte;
      const { panneau } = ouverte;
      this.majEffacer(panneau);
      const voir = panneau.querySelector('.filtres-voir');
      const adresse = this.adresse();
      if (adresse === ouverte.adresse) {
        if (voir) voir.textContent = ouverte.voir;
        return;
      }
      if (voir) voir.setAttribute('aria-busy', 'true');
      this.charger(adresse)
        .then((reponse) => {
          if (this.feuilleOuverte !== ouverte || this.adresse() !== adresse) return;
          const rendu = this.lire(reponse.grille).querySelector(`.filtres-panneau[data-famille="${panneau.dataset.famille}"]`);
          if (rendu) copierTextes(panneau, rendu, ['.filtres-voir', '.filtres-aucun']);
        })
        .catch(() => {})
        .finally(() => {
          if (voir) voir.removeAttribute('aria-busy');
        });
    }

    /* Le panneau se ferme : « Voir » applique le brouillon, à la place de l'entrée d'historique du panneau ; la croix,
       le voile, Échap et le retour du téléphone l'oublient (l'entrée du panneau s'en va avec lui). */
    surFermeture() {
      const ouverte = this.feuilleOuverte;
      if (!ouverte) return;
      this.feuilleOuverte = null;
      document.body.classList.remove('overflow-hidden');
      const { famille, panneau } = ouverte;
      if (!ouverte.valide) {
        ouverte.cases.forEach(([c, coche]) => this.cocher(c, coche));
        const voir = panneau.querySelector('.filtres-voir');
        if (voir) voir.textContent = ouverte.voir;
        this.majEffacer(panneau);
      }
      famille.append(panneau);
      const bouton = famille.querySelector('summary');
      if (bouton) bouton.focus({ preventScroll: true });
      const change = ouverte.valide && this.adresse() !== ouverte.adresse;
      if (change) this.appliquer({ remplacer: panneauEnHistoire() });
      else if (panneauEnHistoire()) window.history.back();
    }

    // ---- Les menus de l'ordinateur ----

    fermerMenu(rendreFocus) {
      const ouvert = this.querySelector('.filtres-famille[open]');
      if (!ouvert) return;
      ouvert.open = false;
      const bouton = ouvert.querySelector('summary');
      if (rendreFocus && bouton) bouton.focus({ preventScroll: true });
    }

    // Le menu reste dans l'écran : décalé vers la gauche s'il dépasse à droite ; la page descend juste assez s'il
    // dépasse en bas, au plus jusqu'à coller la ligne sous l'en-tête, qui ne bouge pas pendant ce saut.
    placerMenu(famille) {
      const panneau = famille.querySelector('.filtres-panneau');
      if (!panneau) return;
      panneau.style.removeProperty('--decale');
      const boite = panneau.getBoundingClientRect();
      const bord = document.documentElement.clientWidth - 16;
      if (boite.right > bord) panneau.style.setProperty('--decale', `${Math.round(bord - boite.right)}px`);
      const depasse = boite.bottom - (window.innerHeight - 16);
      const marge = this.getBoundingClientRect().top - this.hautCollee();
      const descente = Math.min(depasse, marge);
      if (descente > 4) defiler(window.scrollY + descente, 'reste');
    }

    // Le menu ouvert, rendu de nouveau par le serveur, prend sa nouvelle forme une fois fermé.
    poserEnAttente(famille) {
      const nouvelle = this.enAttente;
      if (!nouvelle || nouvelle.dataset.famille !== famille.dataset.famille || famille.open || !famille.isConnected) return;
      this.enAttente = null;
      const avaitFocus = famille.contains(document.activeElement);
      famille.replaceWith(nouvelle);
      this.majMode();
      const bouton = nouvelle.querySelector('summary');
      if (avaitFocus && bouton) bouton.focus({ preventScroll: true });
    }

    // ---- Appliquer ----

    /* Une requête : la grille et l'entrée de la page pour cette adresse. La même adresse déjà demandée (le brouillon du
       panneau) ou reçue : sa réponse. Une autre demande annule celle en cours. */
    charger(adresse) {
      if (this.derniere && this.derniere.adresse === adresse) return Promise.resolve(this.derniere);
      if (this.requete && this.requete.adresse === adresse) return this.requete.promesse;
      if (this.requete) this.requete.controleur.abort();
      const ids = this.idsSections();
      const controleur = new AbortController();
      // Sans en-tête Accept : avec « application/json », Shopify répond la collection en JSON ({ collection }) et non les
      // sections (relevé en ligne le 23/11/2026) ; le script retombait alors sur la page entière à chaque choix.
      const promesse = fetch(adresseSections(adresse, ids), { signal: controleur.signal })
        .then((reponse) => {
          if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
          return reponse.json();
        })
        .then((json) => {
          if (!json || typeof json[ids[0]] !== 'string') throw new Error('section absente de la réponse');
          this.derniere = { adresse, grille: json[ids[0]], entree: ids[1] ? json[ids[1]] : null };
          return this.derniere;
        })
        .finally(() => {
          if (this.requete && this.requete.promesse === promesse) this.requete = null;
        });
      this.requete = { adresse, promesse, controleur };
      return promesse;
    }

    // La section de la grille, et celle de l'entrée de la page, où se trouve le nombre du haut (#nombre-haut).
    idsSections() {
      const ids = [this.dataset.section];
      const nombre = document.getElementById('nombre-haut');
      const section = nombre && nombre.closest('.shopify-section');
      if (section && section.id.startsWith(PREFIXE_SECTION)) {
        const entree = section.id.slice(PREFIXE_SECTION.length);
        if (entree !== ids[0]) ids.push(entree);
      }
      return ids;
    }

    /* Appliquer le choix du formulaire (ou, au retour arrière, l'adresse de l'historique) : la grille à 35 % pendant
       la réponse, puis tout ce qui dépend du choix, l'historique (une entrée de plus, ou celle du panneau remplacée),
       la zone parlée, la mesure, le focus. */
    async appliquer({ adresse = this.adresse(), historique = true, remplacer = false, focus = null } = {}) {
      const numero = ++this.sequence;
      const avant = this.etatApplique;
      const etaitCollee = this.estCollee();
      this.occupe(true);
      let reponse;
      try {
        reponse = await this.charger(adresse);
      } catch (erreur) {
        if (erreur.name === 'AbortError' || numero !== this.sequence) return;
        // Le serveur ne rend pas la section : il rend la page entière de ce choix.
        window.location.assign(adresse);
        return;
      }
      if (numero !== this.sequence) return;
      if (historique) {
        if (remplacer) window.history.replaceState({ filtres: true }, '', adresse);
        else window.history.pushState({ filtres: true }, '', adresse);
      }
      this.poser(reponse);
      this.etatApplique = this.etat();
      this.signatureAffichee = signature(new URL(adresse, window.location.origin).search);
      this.annoncer();
      if (etaitCollee) this.remonter();
      if (historique) {
        const changement = decrireChangement(avant, this.etatApplique);
        if (changement) {
          const detail = { ...changement, resultats: Number(this.dataset.total) || 0 };
          document.dispatchEvent(new CustomEvent('mma:filter-applied', { detail }));
        }
      }
      const cible = focus && focus();
      if (cible) cible.focus({ preventScroll: true });
    }

    // Retour ou Suivant : le panneau ouvert se ferme ; une autre adresse, la page de cette adresse, sans nouvelle
    // entrée d'historique.
    retour() {
      if (this.feuilleOuverte) this.feuille.close();
      this.fermerMenu(false);
      if (signature(window.location.search) === this.signatureAffichee) return;
      this.appliquer({ adresse: window.location.pathname + window.location.search, historique: false });
    }

    occupe(oui) {
      const grille = document.querySelector('#grille .refonte-grille-dedans');
      if (grille) grille.setAttribute('aria-busy', oui ? 'true' : 'false');
    }

    lire(html) {
      return new DOMParser().parseFromString(html, 'text/html');
    }

    // Ce que le serveur a rendu pour ce choix, posé dans la page.
    poser(reponse) {
      const rendu = this.lire(reponse.grille);
      const ligne = rendu.getElementById('barre');
      if (ligne) this.majLigne(ligne);
      const resume = document.getElementById('resume');
      const nouveauResume = rendu.getElementById('resume');
      if (resume && nouveauResume) resume.replaceWith(nouveauResume);
      // La grille, sa suite et ses liens ?page=N : leur <infinite-scroll> lit l'adresse, déjà celle du choix.
      const grille = document.querySelector('#grille .refonte-grille-dedans');
      const nouvelleGrille = rendu.querySelector('.refonte-grille-dedans');
      if (grille && nouvelleGrille) {
        grille.replaceWith(nouvelleGrille);
        if (window.removeSkeletonOnImagesLoad) window.removeSkeletonOnImagesLoad(nouvelleGrille);
        // Les <script> reçus ne s'exécutent pas : le reflet des posters (assets/oeuvre-card-reflet.js), un module.
        nouvelleGrille.querySelectorAll('script[type="module"][src]').forEach((script) => import(script.src));
      } else {
        this.occupe(false);
      }
      // Le nombre de l'interrupteur Posters | Toiles (ticket 02) : l'élément du serveur, avec son mot au pluriel.
      if (reponse.entree) {
        const nombre = this.lire(reponse.entree).getElementById('nombre-haut');
        const actuel = document.getElementById('nombre-haut');
        if (nombre && actuel) actuel.replaceWith(nombre);
      }
    }

    // La ligne : les familles fermées remplacées ; le menu ouvert gardé (son focus, sa recherche), ses mots et ses
    // nombres mis à jour ; le nombre ; le tri, dont le <select> reste.
    majLigne(nouvelle) {
      ['data-total', 'data-annonce', 'data-tri-defaut'].forEach((nom) => {
        const valeur = nouvelle.getAttribute(nom);
        if (valeur !== null) this.setAttribute(nom, valeur);
      });
      const ouvert = this.querySelector('.filtres-famille[open]');
      this.querySelectorAll('.filtres-famille').forEach((famille) => {
        const rendue = nouvelle.querySelector(`.filtres-famille[data-famille="${famille.dataset.famille}"]`);
        if (!rendue) return;
        if (famille === ouvert) {
          this.majFamille(famille, rendue);
          this.enAttente = rendue;
          return;
        }
        const avaitFocus = famille.contains(document.activeElement);
        famille.replaceWith(rendue);
        const bouton = rendue.querySelector('summary');
        if (avaitFocus && bouton) bouton.focus({ preventScroll: true });
      });
      const compte = this.querySelector('.filtres-compte');
      const nouveauCompte = nouvelle.querySelector('.filtres-compte');
      if (compte && nouveauCompte) compte.replaceWith(nouveauCompte);
      const tri = this.querySelector('.filtres-tri');
      const nouveauTri = nouvelle.querySelector('.filtres-tri');
      if (tri && nouveauTri) {
        tri.toggleAttribute('data-actif', nouveauTri.hasAttribute('data-actif'));
        ['.filtres-tri-tel', '.filtres-tri-ordi'].forEach((selecteur) => {
          const ici = tri.querySelector(selecteur);
          const la = nouveauTri.querySelector(selecteur);
          if (ici && la) ici.replaceWith(la);
        });
        const choixTri = tri.querySelector('select');
        const nouveauChoix = nouveauTri.querySelector('select');
        if (choixTri && nouveauChoix) choixTri.value = nouveauChoix.value;
      }
      this.majMode();
    }

    // Le menu ouvert, sans le remplacer : son bouton, ses cases et leurs nombres, son pied, ses phrases.
    majFamille(famille, rendue) {
      const bouton = famille.querySelector('summary');
      const nouveauBouton = rendue.querySelector('summary');
      if (bouton && nouveauBouton) {
        bouton.toggleAttribute('data-actif', nouveauBouton.hasAttribute('data-actif'));
        copierTextes(bouton, nouveauBouton, ['.filtres-fac-nom']);
      }
      const rendues = new Map([...rendue.querySelectorAll('.filtres-case')].map((c) => [`${c.name}=${c.value}`, c]));
      famille.querySelectorAll('.filtres-case').forEach((c) => {
        const r = rendues.get(`${c.name}=${c.value}`);
        if (!r) return;
        this.cocher(c, r.checked);
        copierTextes(c.closest('.filtres-puce'), r.closest('.filtres-puce'), ['.filtres-nb']);
      });
      copierTextes(famille, rendue, ['.filtres-voir', '.filtres-aucun', '.filtres-tous-plus']);
      const effacer = famille.querySelector('.filtres-effacer');
      const nouvelEffacer = rendue.querySelector('.filtres-effacer');
      if (effacer && nouvelEffacer) {
        effacer.hidden = nouvelEffacer.hidden;
        effacer.setAttribute('href', nouvelEffacer.getAttribute('href') || '');
      }
    }

    // La zone parlée de la grille : « 103 tableaux. Filtres : Bleu. », dite une fois la page posée.
    annoncer() {
      const statut = document.getElementById('statut');
      if (!statut) return;
      statut.textContent = '';
      window.requestAnimationFrame(() => {
        statut.textContent = this.dataset.annonce || '';
      });
    }

    // La hauteur où la ligne se colle (--barre-top, que pose assets/collection-entete.js).
    hautCollee() {
      return parseFloat(window.getComputedStyle(this).top) || 0;
    }

    // La hauteur de l'en-tête entier (--tete-h, que pose assets/collection-entete.js) ; sans elle, la hauteur où la
    // ligne se colle.
    hauteurEntete() {
      const hauteur = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--tete-h'));
      return Number.isFinite(hauteur) ? hauteur : this.hautCollee();
    }

    estCollee() {
      const ancre = document.getElementById('ancre-barre');
      return !!ancre && ancre.getBoundingClientRect().top < this.hautCollee() - 0.5;
    }

    // Au début des résultats : l'en-tête revient, la ligne à sa place juste dessous, puis les filtres actifs et la
    // grille ; jamais en haut de la page.
    remonter() {
      const ancre = document.getElementById('ancre-barre');
      if (ancre) defiler(ancre.getBoundingClientRect().top + window.scrollY - this.hauteurEntete(), 'revient');
    }

    // La recherche d'un thème : les thèmes de ce nom, dans les deux listes ; aucun : la phrase qui le dit.
    chercher(panneau) {
      if (!panneau) return;
      const champ = panneau.querySelector('.filtres-cherche');
      const requete = champ ? champ.value : '';
      let trouves = 0;
      panneau.querySelectorAll('.filtres-puce').forEach((puce) => {
        const garde = correspond(puce.dataset.nom || '', requete);
        puce.hidden = !garde;
        if (garde) trouves += 1;
      });
      const aucun = panneau.querySelector('.filtres-aucun');
      if (aucun) aucun.hidden = trouves > 0;
    }
  }

  if (!customElements.get('collection-filtres')) customElements.define('collection-filtres', CollectionFiltres);
})();

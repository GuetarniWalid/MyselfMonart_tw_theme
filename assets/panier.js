/*
 * panier.js — le panier « B · Les tuiles » (ticket 14 de .scratch/collection-design, choix de Walid du 27/11/2026)
 * ------------------------------------------------------------------------------------------------------
 * <panier-contenu> : le contenu du tiroir de la vue de test (snippets/panier-tiroir.liquid, dans <cart-drawer>, dont
 * assets/cart-drawer.js fait les gestes) et de la page panier de test (sections/panier-page.liquid, /cart?view=refonte).
 * - − et + changent la quantité d'une ligne. À 1, la corbeille la retire : une ligne « … a été retiré du panier.
 *   Annuler » prend sa place et la remet telle qu'elle était (variante, quantité, propriétés : cadre, contour blanc,
 *   aperçu…). Aucune question « Êtes-vous sûr ? ».
 * - Le kit d'accrochage et les lots s'ajoutent d'un toucher, comme avec <quick-add-to-cart> (assets/cart-drawer.js) :
 *   la première variante porte les autres en propriétés _variantId_….
 * - Chaque changement est un appel de l'API du panier, qui demande à Shopify la section du panier des tuiles par son
 *   nom (data-section : panier-tiroir ou panier-page), avec l'adresse de la page (sections_url). Cette API ignore
 *   ?view=refonte (relevé le 27/11/2026) : demandé sous son nom, tw-cart-drawer y reviendrait au tiroir d'aujourd'hui.
 *   Le contenu rendu remplace celui-ci ; le focus revient où il était (data-focus) ; le changement est annoncé aux
 *   lecteurs d'écran par la zone parlée, qui est hors du contenu et ne change jamais.
 * - Panier vide : les tuiles du menu de la page (snippets/menu-telephone.liquid, rayon de la page), recopiées en
 *   boutons, sans adresse ; un toucher suit le lien du menu (le cocon : le tiroir vide n'a aucun lien de plus).
 * - Page : la barre « Paiement sécurisé · total » du téléphone se cache dès que le bouton du récapitulatif est à
 *   l'écran ; « Continuer les achats » ramène à la dernière collection vue, sinon à la première tuile du menu.
 * Script classique, sans dépendance. Logique pure exportée sous Node : scripts/panier.test.cjs.
 */
(function () {
  'use strict';

  /* Les quantités à envoyer à /cart/update.js quand une ligne vendue en lot passe de `avant` à `apres` : la ligne par sa
     clé ; les variantes ajoutées avec elle (propriétés _variantId_…, data-lies) suivent du même écart, jamais sous zéro.
     Au retrait, c'est ce que fait le tiroir d'aujourd'hui (changeItemAndLinkedIdsQuantity, assets/cart-drawer.js).
     lies : [{ variante, quantite }], la quantité de chacune dans le panier. */
  function quantitesDuLot(cle, avant, apres, lies) {
    const updates = { [cle]: apres };
    for (const { variante, quantite } of lies) updates[variante] = Math.max(0, quantite + (apres - avant));
    return updates;
  }

  /* Les articles d'un ajout groupé (kit d'accrochage, lot) : chaque variante, en `quantite` exemplaires ; la première
     porte les autres en propriétés _variantId_1, _variantId_2… (le contrat de <quick-add-to-cart>). */
  function articlesDuGroupe(ids, quantite) {
    return ids.map((id, rang) => ({
      id: Number(id),
      quantity: quantite,
      properties: rang === 0 ? Object.fromEntries(ids.slice(1).map((autre, i) => [`_variantId_${i + 1}`, autre])) : {},
    }));
  }

  // Une phrase traduite (snippets/panier-textes.liquid), ses repères [nom] remplis.
  function phrase(modele, valeurs) {
    return Object.entries(valeurs).reduce((texte, [nom, valeur]) => texte.split(`[${nom}]`).join(String(valeur)), String(modele || ''));
  }

  if (typeof window === 'undefined') {
    module.exports = { quantitesDuLot, articlesDuGroupe, phrase };
    return;
  }
  if (window.customElements.get('panier-contenu')) return;

  const adresseDeLaPage = () => window.location.pathname + window.location.search;
  const locale = () => (typeof window.getLocale === 'function' ? window.getLocale() : '');
  // Le dernier retrait, pour « Annuler » : la ligne telle qu'elle était, son nom, sa place, et ses lignes liées.
  let retrait = null;

  class PanierContenu extends HTMLElement {
    connectedCallback() {
      if (this.branche) return;
      this.branche = true;
      this.addEventListener('click', this.surClic);
      this.querySelector('klarna-placement')?.setAttribute('data-locale', locale());
      this.poserLesTuiles();
      if (retrait) this.poserAnnuler();
      if (this.dataset.vue === 'page') {
        this.suivreLaBarre();
        this.continuerVersLaCollection();
      }
    }

    disconnectedCallback() {
      this.observateur?.disconnect();
    }

    get textes() {
      if (!this.lus) {
        try {
          this.lus = JSON.parse(this.querySelector('[data-panier-textes]')?.textContent || '{}');
        } catch (e) {
          this.lus = {};
        }
      }
      return this.lus;
    }

    total() {
      return (this.querySelector('[data-panier-total]')?.textContent || '').trim();
    }

    surClic = (e) => {
      const bouton = e.target.closest('[data-panier]');
      if (!bouton || !this.contains(bouton)) return;
      const action = bouton.dataset.panier;
      if (action === 'continuer') {
        // Dans le tiroir, « Continuer les achats » le ferme ; sur la page, c'est un lien.
        if (this.dataset.vue === 'tiroir') {
          e.preventDefault();
          this.closest('cart-drawer')?.close();
        }
        return;
      }
      if (action === 'tuile') {
        this.suivreLaTuile(bouton);
        return;
      }
      if (this.getAttribute('aria-busy') === 'true') return;
      if (action === 'annuler') {
        this.annuler();
        return;
      }
      if (action === 'kits' || action === 'lot') {
        this.ajouter(bouton);
        return;
      }
      const ligne = bouton.closest('.panier-ligne');
      if (!ligne) return;
      const avant = Number(ligne.dataset.quantite) || 0;
      const apres = action === 'plus' ? avant + 1 : action === 'moins' ? avant - 1 : 0;
      this.changer(ligne, avant, Math.max(0, apres), bouton.dataset.focus);
    };

    /* ---- Les changements ---- */

    // Les lignes vendues avec celle-ci en lot (data-lies, variantes) et leur quantité dans le panier.
    lignesLiees(ligne) {
      return (ligne.dataset.lies || '').split(',').filter(Boolean).map((variante) => {
        const liee = this.querySelector(`.panier-ligne[data-variante="${variante}"]`);
        return { variante, quantite: liee ? Number(liee.dataset.quantite) || 0 : 0 };
      });
    }

    async changer(ligne, avant, apres, focus) {
      const cle = ligne.dataset.cle;
      const nom = ligne.dataset.nom;
      const lies = this.lignesLiees(ligne);
      let proprietes = {};
      try {
        proprietes = JSON.parse(ligne.dataset.proprietes || '{}') || {};
      } catch (e) {
        proprietes = {};
      }
      const souvenir = {
        nom,
        cle,
        place: [...this.querySelectorAll('[data-panier-liste] > .panier-ligne')].indexOf(ligne),
        ligne: { id: Number(ligne.dataset.variante), quantity: avant, properties: proprietes },
        lies,
      };
      retrait = null;
      const resultat = lies.length
        ? await this.envoyer('update', { updates: quantitesDuLot(cle, avant, apres, lies) })
        : await this.envoyer('change', { id: cle, quantity: apres });
      if (!resultat) return;
      const { nouveau } = resultat;
      const total = nouveau.total();
      if (apres > 0) {
        nouveau.focusSur(focus);
        nouveau.annoncer(phrase(nouveau.textes.quantite, { article: nom, quantite: apres, total }));
        return;
      }
      retrait = souvenir;
      nouveau.poserAnnuler();
      nouveau.focusSur('annuler');
      nouveau.annoncer(Number(nouveau.dataset.nombre) > 0 ? phrase(nouveau.textes.retrait, { article: nom, total }) : nouveau.textes.vide);
    }

    async annuler() {
      const souvenir = retrait;
      if (!souvenir) return;
      retrait = null;
      // Les lignes du lot reprennent leur quantité, puis la ligne revient telle qu'elle était.
      if (souvenir.lies.length) {
        try {
          await fetch(`${window.routes.cart_update_url}.js`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: Object.fromEntries(souvenir.lies.map(({ variante, quantite }) => [variante, quantite])) }),
          });
        } catch (e) {
          // La ligne revient quand même ; le lot garde ce qu'il a.
        }
      }
      const resultat = await this.envoyer('add', { items: [souvenir.ligne] });
      if (!resultat) {
        retrait = souvenir;
        return;
      }
      const { nouveau } = resultat;
      nouveau.focusSur(`titre-${souvenir.cle}`) || nouveau.focusSur(nouveau.querySelector(`.panier-ligne[data-variante="${souvenir.ligne.id}"] [data-focus^="titre-"]`)?.dataset.focus);
      nouveau.annoncer(phrase(nouveau.textes.revenu, { article: souvenir.nom, total: nouveau.total() }));
    }

    async ajouter(bouton) {
      const ids = (bouton.dataset.articles || '').split(',').filter(Boolean);
      const quantite = Number(bouton.dataset.quantite) || 1;
      if (!ids.length) return;
      retrait = null;
      const resultat = await this.envoyer('add', { items: articlesDuGroupe(ids, quantite) });
      if (!resultat) return;
      const { json, nouveau } = resultat;
      // Ajout réussi, annoncé à la mesure (assets/posthog-tracking.js), comme l'ajout rapide d'aujourd'hui.
      document.dispatchEvent(new CustomEvent('mma:cart-add', { detail: { source: 'bundle', items: json.items } }));
      const titre = nouveau.querySelector(`.panier-ligne[data-variante="${ids[0]}"] [data-focus^="titre-"]`);
      nouveau.focusSur(titre?.dataset.focus);
      const total = nouveau.total();
      nouveau.annoncer(bouton.dataset.panier === 'kits'
        ? phrase(quantite === 1 ? nouveau.textes.kitsUn : nouveau.textes.kitsPlus, { count: quantite, total })
        : phrase(nouveau.textes.ajoute, { article: bouton.dataset.nom || '', total }));
    }

    /* Un appel de l'API du panier (route : add, change ou update), qui demande la section du panier des tuiles par son
       nom, rendue à l'adresse de la page. Rend { json, nouveau } : la réponse, et le contenu rendu, déjà en place. */
    async envoyer(route, donnees) {
      this.setAttribute('aria-busy', 'true');
      try {
        const reponse = await fetch(`${window.routes[`cart_${route}_url`]}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...donnees, sections: [this.dataset.section], sections_url: adresseDeLaPage() }),
        });
        const json = await reponse.json().catch(() => ({}));
        if (!reponse.ok) throw new Error(json.description || json.message || '');
        const html = json.sections && json.sections[this.dataset.section];
        const nouveau = html ? this.remplacer(html) : null;
        if (!nouveau) {
          // La section n'a pas pu se rendre : la page, rechargée, montre le panier tel qu'il est.
          window.location.reload();
          return null;
        }
        return { json, nouveau };
      } catch (erreur) {
        this.removeAttribute('aria-busy');
        this.annoncer(erreur.message || this.textes.erreur);
        return null;
      }
    }

    // Le contenu rendu par Shopify prend la place de celui-ci, défilé au même endroit.
    remplacer(html) {
      const nouveau = new DOMParser().parseFromString(html, 'text/html').querySelector('panier-contenu');
      if (!nouveau) return null;
      nouveau.querySelector('klarna-placement')?.setAttribute('data-locale', locale());
      const defile = this.querySelector('[data-panier-defile]');
      const haut = defile ? defile.scrollTop : 0;
      this.replaceWith(nouveau);
      const nouveauDefile = nouveau.querySelector('[data-panier-defile]');
      if (nouveauDefile) nouveauDefile.scrollTop = haut;
      // Le compteur du bouton du panier, traduit (assets/cart-count.js).
      window.MMACartCount?.render(Number(nouveau.dataset.nombre) || 0);
      return nouveau;
    }

    // Le focus sur l'élément qui porte cette clé (data-focus) ; sinon sur le titre du tiroir. Rend vrai s'il l'a trouvé.
    focusSur(cle) {
      const cible = cle ? this.querySelector(`[data-focus="${window.CSS.escape(cle)}"]`) : null;
      const repli = this.querySelector('[data-focus="titre"]') || this.querySelector('[data-focus="payer"]');
      (cible || repli)?.focus();
      return !!cible;
    }

    // La zone parlée de la section (hors de ce contenu, elle ne change jamais) dit le texte, vidée juste avant.
    annoncer(texte) {
      const zone = (this.closest('.shopify-section') || document).querySelector('[data-panier-annonce]');
      if (!zone || !texte) return;
      zone.textContent = '';
      window.setTimeout(() => {
        zone.textContent = texte;
      }, 80);
    }

    // La ligne « … a été retiré du panier. Annuler », à la place de la ligne retirée (ou en tête du panier vide).
    poserAnnuler() {
      if (!retrait || this.querySelector('.panier-annule')) return;
      const liste = this.querySelector('[data-panier-liste]');
      const conteneur = liste || this.querySelector('.panier-vide');
      if (!conteneur) return;
      const ligne = document.createElement(liste ? 'li' : 'p');
      ligne.className = 'panier-annule';
      const texte = document.createElement('span');
      texte.textContent = phrase(this.textes.retire, { article: retrait.nom });
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'panier-annule-bouton';
      bouton.dataset.panier = 'annuler';
      bouton.dataset.focus = 'annuler';
      bouton.textContent = this.textes.annuler || '';
      ligne.append(texte, bouton);
      if (liste) liste.insertBefore(ligne, liste.querySelectorAll(':scope > .panier-ligne')[retrait.place] || null);
      else conteneur.prepend(ligne);
    }

    /* ---- Le panier vide : les tuiles du menu ---- */

    // Les tuiles du menu de la page : celles du rayon de la page (l'onglet coché d'abord), sinon du premier.
    tuilesDuMenu() {
      const menu = document.querySelector('.menu-tel');
      if (!menu) return [];
      const coche = menu.querySelector('.menu-tel-onglet input[checked]');
      const rayon = menu.querySelector(`.menu-tel-rayon[data-rayon="${coche ? coche.value : '1'}"]`) || menu.querySelector('.menu-tel-rayon');
      return rayon ? [...rayon.querySelectorAll('.menu-tel-tuiles > .c-emb')] : [];
    }

    // Chaque tuile du menu, recopiée en bouton : le même dessin, sans adresse.
    poserLesTuiles() {
      const liste = this.querySelector('[data-panier-tuiles]');
      if (!liste || liste.children.length) return;
      this.tuilesDuMenu().forEach((tuile, rang) => {
        const copie = tuile.cloneNode(true);
        const lien = copie.querySelector('a.c-emb-lien');
        if (!lien) return;
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = lien.className;
        bouton.dataset.panier = 'tuile';
        bouton.dataset.rang = String(rang);
        bouton.append(...lien.childNodes);
        lien.replaceWith(bouton);
        copie.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
        liste.append(copie);
      });
    }

    // Le toucher d'une tuile suit le lien du menu à la même place (la vue de test garde sa vue : collection-refonte-essai).
    suivreLaTuile(bouton) {
      this.tuilesDuMenu()[Number(bouton.dataset.rang)]?.querySelector('a.c-emb-lien')?.click();
    }

    /* ---- La page ---- */

    // La barre du téléphone se cache dès que le bouton du récapitulatif est à l'écran, ou passé.
    suivreLaBarre() {
      const barre = this.querySelector('.panier-barre');
      const bouton = this.querySelector('[data-panier-bouton]');
      if (!barre || !bouton || !('IntersectionObserver' in window)) return;
      this.observateur = new IntersectionObserver(([entree]) => {
        barre.toggleAttribute('data-cachee', entree.isIntersecting || entree.boundingClientRect.top < 0);
      }, { threshold: 0.6 });
      this.observateur.observe(bouton);
    }

    // « Continuer les achats » : la collection d'où l'on vient, sinon la première tuile du menu.
    continuerVersLaCollection() {
      const lien = this.querySelector('a[data-panier="continuer"]');
      if (!lien) return;
      try {
        const avant = document.referrer ? new URL(document.referrer) : null;
        if (avant && avant.origin === window.location.origin && /\/collections\/[^/]+\/?$/.test(avant.pathname)) {
          lien.href = avant.href;
          return;
        }
      } catch (e) {
        // Adresse illisible : la tuile du menu.
      }
      const tuile = this.tuilesDuMenu()[0]?.querySelector('a.c-emb-lien');
      if (tuile) lien.href = tuile.href;
    }
  }

  window.customElements.define('panier-contenu', PanierContenu);

  // Le tiroir se ferme : la ligne « Annuler » s'en va avec lui.
  document.addEventListener('CartDrawerClose', () => {
    retrait = null;
    document.querySelectorAll('cart-drawer .panier-annule').forEach((ligne) => ligne.remove());
  });
})();

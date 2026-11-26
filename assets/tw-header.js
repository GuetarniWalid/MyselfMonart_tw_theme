/*
 * L'en-tête qui suit le doigt, sur la nouvelle page collection (ticket 07 de .scratch/collection-design)
 * ----------------------------------------------------------------------------------------------------------------
 * Un mode de <sticky-header> (plus bas), pris quand <html> porte data-refonte-page (layout/collection.liquid, qui
 * reconnaît la page à sa section). Partout ailleurs, l'en-tête garde son mode de toujours (onScroll : il se cache et
 * revient par ses classes, à des seuils, et se cache en bas de page).
 * - L'en-tête part quand on descend et revient quand on remonte, au rythme du doigt : son décalage (0 : il est là ;
 *   sa hauteur : il est parti) augmente de ce qu'on descend et diminue de ce qu'on remonte, à chaque image, posé en
 *   transform: translateY(), sans transition. Il ne part pas tant que le bandeau d'annonce, au-dessus, se voit.
 * - Sa hauteur, mesurée (et remesurée quand elle change), va sur :root : --tete-h (ce qui prend le focus s'arrête
 *   sous l'en-tête et la ligne, assets/collection-refonte.css). La feuille la donne déjà (90 px) : rien n'est écrit tant
 *   qu'elle est juste, car l'écrire sur :root refait les styles de toute la page.
 * - La ligne des filtres (#barre, ticket 06) se colle juste dessous : --barre-top = hauteur − décalage, puis en haut
 *   de l'écran quand il est parti ; sans valeur posée, elle se colle sous l'en-tête entier. Elle porte la classe « collee » quand elle est collée à cette place : son ancre
 *   (#ancre-barre) est passée au-dessus, et la fin de sa section (la grille) ne l'emporte pas encore.
 * - Quand l'en-tête part (plus de 2 px), ses menus se ferment, comme hide() ailleurs, et le menu ouvert de la ligne
 *   (ordinateur) aussi : fermerMenu(), le focus qui était dans la ligne revenant à son bouton.
 * - Un script de la page qui la fait défiler lui-même l'annonce juste avant, sur document : mma:saut-voulu,
 *   { entete: 'reste' | 'revient' } (assets/collection-filtres.js, <infinite-scroll> d'assets/collection.js). Ce saut
 *   ne compte pas comme un geste du doigt : l'en-tête reste où il est, ou revient en entier.
 * - preventHeaderReveal reste respecté : l'en-tête ne revient pas pendant la remontée en cours (33 ms sans remonter
 *   suffisent, comme onScroll). Il revient à l'ouverture de la recherche (reveal()) et quand le focus entre dedans : le
 *   clavier ne va jamais sur un lien caché.
 * - Un seul écouteur de défilement, passif. Chaque image (requestAnimationFrame) lit la mise en page, puis écrit. Le
 *   rebond de Safari, au-delà du haut ou du bas de la page, ne compte pas.
 * Le calcul d'une image est pur, testé sous Node : scripts/tw-header.test.cjs.
 */
class EnteteQuiSuit {
  /* Une image. avant : ce que l'image d'avant a posé, { decalage, y } : le décalage, de 0 (l'en-tête est là) à sa
     hauteur (il est parti), et la position du défilement qu'elle a lue.
     lu : ce que cette image vient de lire, { y, max, hauteur, bandeau, saut, retenu, ancre, fin } : window.scrollY ;
     le défilement le plus bas (scrollHeight − innerHeight) ; la hauteur de l'en-tête ; le bas du bandeau d'annonce,
     dans la page ; un saut voulu (null, 'reste' ou 'revient') ; retenu, après preventHeaderReveal ; et, dans l'écran,
     le haut de l'ancre de la ligne et sa fin, la plus haute place où elle se colle avant que le bas de sa section ne
     l'emporte (null sans ligne).
     Rend { decalage, y, haut, collee, fermer } : le nouveau décalage, la position gardée, la hauteur où la ligne se
     colle, la ligne collée à cette place ou non, et s'il faut fermer les menus. */
  static calculerImage(avant, lu) {
    // Au-delà de ce décalage, l'en-tête est parti : les menus se ferment.
    const PARTI = 2;
    // Le rebond de Safari : au-delà du haut ou du bas de la page, le défilement compte pour 0.
    const y = Math.min(Math.max(0, lu.y), Math.max(0, lu.max));
    let voulu;
    if (lu.saut === 'revient') voulu = 0;
    else if (lu.saut === 'reste') voulu = avant.decalage;
    else voulu = avant.decalage + (lu.retenu ? Math.max(0, y - avant.y) : y - avant.y);
    // Borné entre 0 et sa hauteur ; et jamais plus loin que ce dont il a dépassé le bas du bandeau d'annonce : tant que
    // le bandeau se voit, l'en-tête reste, puis il part avec la page.
    const decalage = Math.min(Math.max(voulu, 0), lu.hauteur, Math.max(0, y - lu.bandeau));
    const haut = lu.hauteur - decalage;
    // Collée : son ancre est passée au-dessus de la hauteur où elle se colle, et le bas de sa section l'y laisse.
    const collee = lu.ancre != null && lu.ancre < haut - 0.5 && lu.fin >= haut - 0.5;
    const fermer = !lu.saut && y !== avant.y && decalage > PARTI;
    return { decalage, y, haut, collee, fermer };
  }

  constructor(stickyHeader) {
    this.stickyHeader = stickyHeader;
    this.header = stickyHeader.header;
    this.annonce = document.getElementById('shopify-section-tw-announcement-bar');
    this.etat = { decalage: 0, y: Math.max(0, window.scrollY) };
    this.hauteur = 0;
    this.remesurer = true;
    this.saut = null;
    this.retenu = false;
    this.retenuJusqua = 0;
    this.prevue = 0;
    // Ce qui est posé, pour n'écrire que ce qui change.
    this.pose = { hauteur: null, transform: '', barre: null, haut: null };

    // L'autre mode le fait glisser par la transition de ses classes ; ici, il suit chaque image.
    this.header.style.transition = 'none';
    window.addEventListener('scroll', this.planifier, { passive: true });
    window.addEventListener('resize', this.remesurerPuisPlanifier);
    if ('ResizeObserver' in window) new ResizeObserver(this.remesurerPuisPlanifier).observe(this.header);
    document.addEventListener('mma:saut-voulu', (e) => {
      this.saut = e.detail && e.detail.entete === 'revient' ? 'revient' : 'reste';
      this.planifier();
    });
    stickyHeader.addEventListener('preventHeaderReveal', () => {
      this.retenu = true;
      this.retenuJusqua = 0;
    });
    this.header.addEventListener('focusin', () => this.revenir());
    this.planifier();
  }

  /* L'en-tête revient en entier : la recherche s'ouvre (reveal() de <sticky-header>), ou le focus entre dedans (le
     navigateur a déjà fait défiler la page vers lui : le mode d'ailleurs le laissait caché, le focus sur un lien
     invisible). */
  revenir() {
    this.saut = 'revient';
    this.planifier();
  }

  planifier = () => {
    if (!this.prevue) this.prevue = window.requestAnimationFrame(this.poserImage);
  };

  remesurerPuisPlanifier = () => {
    this.remesurer = true;
    this.planifier();
  };

  poserImage = (temps) => {
    this.prevue = 0;
    if (this.retenu && this.retenuJusqua && temps > this.retenuJusqua) {
      this.retenu = false;
      this.retenuJusqua = 0;
    }

    // Lire.
    if (this.remesurer) {
      this.hauteur = this.header.getBoundingClientRect().height;
      this.remesurer = false;
    }
    const barre = document.getElementById('barre');
    const ancre = barre && document.getElementById('ancre-barre');
    const y = window.scrollY;
    // Un bandeau caché ne retient rien.
    const bandeau = this.annonce ? this.annonce.getBoundingClientRect() : null;
    const lu = {
      y,
      max: document.documentElement.scrollHeight - window.innerHeight,
      hauteur: this.hauteur,
      bandeau: bandeau && bandeau.height ? bandeau.bottom + y : 0,
      saut: this.saut,
      retenu: this.retenu,
      ancre: ancre ? ancre.getBoundingClientRect().top : null,
      fin: ancre ? this.finDeLigne(barre) : null,
    };
    this.saut = null;
    const suite = EnteteQuiSuit.calculerImage(this.etat, lu);
    // preventHeaderReveal tient tant qu'on remonte, et 33 ms après.
    if (this.retenu && suite.y < this.etat.y) this.retenuJusqua = temps + 33;

    // Écrire. La hauteur que donne la feuille est déjà là : ne l'écrire que si celle de l'en-tête en diffère.
    if (this.pose.hauteur === null) {
      this.pose.hauteur = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--tete-h'));
    }
    if (this.hauteur !== this.pose.hauteur) {
      document.documentElement.style.setProperty('--tete-h', `${this.hauteur}px`);
      this.pose.hauteur = this.hauteur;
    }
    const decalage = this.auPixel(suite.decalage);
    const transform = decalage ? `translateY(${-decalage}px)` : '';
    if (transform !== this.pose.transform) {
      this.header.style.transform = transform;
      this.pose.transform = transform;
    }
    if (barre) {
      const haut = this.auPixel(suite.haut);
      // Une ligne neuve (au chargement, ou rendue de nouveau après un filtre) se colle d'elle-même sous l'en-tête entier.
      const la = barre === this.pose.barre ? this.pose.haut : this.hauteur;
      if (haut !== la) barre.style.setProperty('--barre-top', `${haut}px`);
      this.pose.barre = barre;
      this.pose.haut = haut;
      barre.classList.toggle('collee', suite.collee);
    }
    if (suite.fermer) this.fermerLesMenus(barre);
    this.etat = { decalage: suite.decalage, y: suite.y };
  };

  // La fin de la ligne, dans l'écran : la plus haute place où elle se colle avant que le bas de sa section (la grille,
  // où seulement elle se colle) ne l'emporte avec la dernière rangée.
  finDeLigne(barre) {
    const section = barre.parentElement;
    const style = window.getComputedStyle(section);
    return section.getBoundingClientRect().bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth) - barre.offsetHeight;
  }

  // L'en-tête part : ses menus se ferment (comme hide() ailleurs), et celui de la ligne des filtres ; le focus qui
  // était dans la ligne revient au bouton du menu.
  fermerLesMenus(barre) {
    this.stickyHeader.closeDesktopDropdown();
    this.stickyHeader.closeMobileMenu();
    if (barre && typeof barre.fermerMenu === 'function') barre.fermerMenu(barre.contains(document.activeElement));
  }

  // Au pixel de l'écran : l'en-tête et la ligne restent nets.
  auPixel(valeur) {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(valeur * ratio) / ratio;
  }
}

/*
 * Le menu du téléphone, nouveau dessin (snippets/menu-telephone.liquid, .menu-tel d'input.css)
 * ----------------------------------------------------------------------------------------------------------------
 * Créé par <sticky-header>, qui l'ouvre et le ferme, quand son menu est celui-là ; avec le menu d'avant, rien. Les
 * onglets et les groupes marchent sans lui : des boutons radio et des <details>. Il fait le reste :
 * - à l'ouverture, la hauteur du panneau (--menu-haut : ce qui est au-dessus de lui ; le bandeau d'annonce se voit ou
 *   non) et le focus sur lui ;
 * - le groupe qui s'ouvre (le précédent se ferme : <sticky-header>) reste en vue pendant qu'il se déplie ; la rangée
 *   montre la collection de la page en cours, si elle y est ;
 * - à la fermeture, tout revient à son état du départ (data-ouvert : le groupe ouvert d'abord).
 */
class MenuTelephone {
  constructor(panneau) {
    this.panneau = panneau;
    this.defile = panneau.querySelector('.menu-tel-defile');
    this.groupes = panneau.querySelectorAll('.menu-tel-groupe');
    this.pays = panneau.querySelector('.menu-tel-pays');
    // Sur ordinateur (passerSurOrdinateur), ses groupes sont tous ouverts : rien à suivre, et leurs titres ne les ferment pas.
    this.surOrdinateur = false;
    this.groupes.forEach((groupe) => {
      groupe.addEventListener('toggle', () => groupe.open && !this.surOrdinateur && this.suivre(groupe));
      groupe.querySelector('summary')?.addEventListener('click', (e) => this.surOrdinateur && e.preventDefault());
    });
    panneau.addEventListener('change', (e) => {
      if (e.target.name === 'menu-tel-onglet') this.defile.scrollTop = 0;
    });
  }

  ouvrir(entete) {
    // L'en-tête parti en partie (il suit le doigt, ou revient) sera là en entier : le panneau commencera plus bas.
    const haut = this.panneau.getBoundingClientRect().top - Math.min(0, entete.getBoundingClientRect().top);
    this.panneau.style.setProperty('--menu-haut', `${Math.round(haut)}px`);
    this.defile.scrollTop = 0;
    this.groupes.forEach((groupe) => groupe.open && this.montrerLaPage(groupe));
  }

  fermer() {
    this.groupes.forEach((groupe) => {
      groupe.open = groupe.hasAttribute('data-ouvert');
    });
    if (this.pays) this.pays.open = false;
  }

  /* Le panneau passe au menu d'ordinateur (MenuOrdinateur), qui l'ouvre sous l'en-tête, ou revient au téléphone. Sur
     ordinateur, il n'est plus un dialogue (le reste de la page n'est pas bloqué) : sa liste prend le nom qu'il avait, la
     bascule portant déjà celui de « Navigation principale » ; ses groupes sont tous ouverts, leurs titres ne sont plus que
     des titres (ni clic, ni tabulation). De retour au téléphone, tout revient comme au départ. */
  passerSurOrdinateur(oui) {
    if (oui === this.surOrdinateur) return;
    this.surOrdinateur = oui;
    const liste = this.panneau.querySelector('nav');
    if (oui) {
      this.attributs = ['role', 'aria-modal', 'aria-label'].map((nom) => [nom, this.panneau.getAttribute(nom)]);
      this.attributs.forEach(([nom]) => this.panneau.removeAttribute(nom));
      this.nomListe = liste ? liste.getAttribute('aria-label') : null;
      const nom = this.attributs[2][1];
      if (liste && nom) liste.setAttribute('aria-label', nom);
    } else {
      this.attributs.forEach(([nom, valeur]) => valeur !== null && this.panneau.setAttribute(nom, valeur));
      if (liste && this.nomListe !== null) liste.setAttribute('aria-label', this.nomListe);
    }
    this.groupes.forEach((groupe) => {
      const titre = groupe.querySelector('summary');
      if (oui) groupe.open = true;
      if (!titre) return;
      if (oui) titre.setAttribute('tabindex', '-1');
      else titre.removeAttribute('tabindex');
    });
    if (!oui) this.fermer();
  }

  // Le dernier élément qui prend le focus : dans la liste des pays si elle est ouverte, sinon son bouton.
  dernier() {
    if (!this.pays) return null;
    return (this.pays.open && this.pays.querySelector('.last-focusable')) || this.pays.querySelector('summary');
  }

  // Le groupe se déplie (0,28 s, input.css) : à chaque image, sa fin reste au-dessus du bas, et sa tête en vue.
  suivre(groupe) {
    this.montrerLaPage(groupe);
    const fin = performance.now() + 360;
    const image = (temps) => {
      const vue = this.defile.getBoundingClientRect();
      const place = groupe.getBoundingClientRect();
      const pas = Math.min(Math.max(0, place.bottom - vue.bottom), place.top - vue.top);
      if (pas) this.defile.scrollTop += pas;
      if (groupe.open && temps < fin) window.requestAnimationFrame(image);
    };
    window.requestAnimationFrame(image);
  }

  // La collection de la page en cours, au milieu de sa rangée.
  montrerLaPage(groupe) {
    const lien = groupe.querySelector('[aria-current="page"]');
    const embleme = lien && lien.closest('.c-emb');
    if (!embleme) return;
    const rangee = embleme.parentElement;
    rangee.scrollLeft = embleme.offsetLeft - (rangee.clientWidth - embleme.offsetWidth) / 2;
  }
}

/*
 * Le menu d'ordinateur, « la bascule » (ticket 13 de .scratch/collection-design : snippets/menu-ordinateur.liquid,
 * input.css « Le menu d'ordinateur »)
 * ----------------------------------------------------------------------------------------------------------------
 * Dès 768 px, dans le nouvel en-tête : un bouton par rayon, et une seule pastille qui glisse de l'un à l'autre. Un rayon
 * ouvre le menu du téléphone (MenuTelephone), habillé en panneau sous l'en-tête : le même <details>, ouvert au rayon
 * choisi (son bouton radio coché), tous ses groupes ouverts. Les états du téléphone et ceux de l'ordinateur ne se
 * mélangent jamais : aLaMain() dit quand le <details> est à l'ordinateur, et tout revient comme au téléphone sous 768 px.
 * La logique des gestes est pure (suite, testée sous Node : scripts/menu-ordinateur.test.cjs) : un état
 * { ouvert, par, vise, courant } (le rayon ouvert, 0 sinon ; ce qui l'a ouvert ; le rayon que la souris vise ; celui de la
 * page, 0 sur une page sans rayon) et un geste rendent le nouvel état et ce qu'il faut faire.
 */
class MenuOrdinateur {
  /* Les délais des gestes, en millisecondes : l'arrêt de la souris avant d'ouvrir (Baymard : 300 à 500 ms) ; menu ouvert,
     le passage d'un rayon à l'autre ; la sortie de la souris avant de fermer (Nielsen Norman Group). */
  static OUVRE = 300;
  static CHANGE = 140;
  static FERME = 500;

  /* Un geste → { etat, faire }. Les gestes : entre et sort (la souris sur un rayon), minuterie (ouvre ou ferme),
     clic (par la souris, le toucher ou le clavier), zone-entre et zone-sort (la souris dans l'en-tête et le panneau),
     echap, dehors (un clic à côté), focus-sort, entete-part (l'en-tête part, ou une autre fermeture demandée), va (le
     clavier passe à un rayon), bas (flèche bas), telephone (sous 768 px). Ce qu'il faut faire : { pastille } (le rayon
     qu'elle marque, 0 : aucun), { ouvrir, avant } (0 : le rideau ; sinon, d'un rayon à l'autre), { fermer, focus,
     instant }, { planifier, rayon, delai }, { annuler }, { entrer } (le focus va dans le panneau). */
  static suite(avant, geste) {
    const etat = { ...avant };
    const faire = [];
    const pastille = () => faire.push({ pastille: MenuOrdinateur.cible(etat) });
    const ouvrir = (rayon, par) => {
      faire.push({ annuler: 'ouvre' }, { annuler: 'ferme' });
      if (etat.ouvert !== rayon) faire.push({ ouvrir: rayon, avant: etat.ouvert });
      etat.ouvert = rayon;
      etat.par = par;
      etat.vise = 0;
      pastille();
    };
    const fermer = (focus = false, instant = false) => {
      faire.push({ annuler: 'ouvre' }, { annuler: 'ferme' });
      if (etat.ouvert) faire.push({ fermer: etat.ouvert, focus, instant });
      etat.ouvert = 0;
      etat.par = null;
      etat.vise = 0;
      pastille();
    };
    switch (geste.type) {
      case 'entre':
        faire.push({ annuler: 'ferme' }, { annuler: 'ouvre' });
        etat.vise = etat.ouvert === geste.rayon ? 0 : geste.rayon;
        pastille();
        if (etat.vise) faire.push({ planifier: 'ouvre', rayon: geste.rayon, delai: etat.ouvert ? MenuOrdinateur.CHANGE : MenuOrdinateur.OUVRE });
        break;
      case 'sort':
        if (etat.vise === geste.rayon) {
          etat.vise = 0;
          faire.push({ annuler: 'ouvre' });
          pastille();
        }
        break;
      case 'minuterie':
        // Épinglé (un clic, le toucher, le clavier), il le reste quand la souris passe à un autre rayon.
        if (geste.quoi === 'ouvre' && etat.vise === geste.rayon) ouvrir(geste.rayon, etat.ouvert && etat.par !== 'survol' ? etat.par : 'survol');
        else if (geste.quoi === 'ferme') fermer();
        break;
      case 'clic':
        if (etat.ouvert !== geste.rayon) ouvrir(geste.rayon, geste.par === 'souris' ? 'clic' : geste.par);
        else if (etat.par === 'survol' && geste.par === 'souris') {
          // Ouvert au survol juste avant : le clic l'épingle, il ne le referme pas sous la main.
          etat.par = 'clic';
          faire.push({ annuler: 'ferme' });
        } else fermer();
        break;
      case 'zone-entre':
        faire.push({ annuler: 'ferme' });
        break;
      case 'zone-sort':
        if (etat.ouvert && etat.par === 'survol') faire.push({ planifier: 'ferme', delai: MenuOrdinateur.FERME });
        break;
      case 'echap':
        if (etat.ouvert) fermer(Boolean(geste.focusDedans));
        break;
      case 'dehors':
      case 'focus-sort':
      case 'entete-part':
        fermer();
        break;
      case 'telephone':
        fermer(false, true);
        break;
      case 'va':
        if (etat.ouvert && etat.ouvert !== geste.rayon) ouvrir(geste.rayon, 'clavier');
        break;
      case 'bas':
        if (etat.ouvert !== geste.rayon) ouvrir(geste.rayon, 'clavier');
        faire.push({ entrer: true });
        break;
      default:
        break;
    }
    return { etat, faire };
  }

  /* La courbe et les durées du mouvement (input.css les reprend pour le rideau) : la pastille glisse en 0,42 s, d'un
     rayon à l'autre le contenu change en 0,32 s ; le rideau remonte en 0,24 s. Avec « mouvements réduits », au plus un
     fondu de 0,12 s. */
  static COURBE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  static GLISSE = 420;
  static CHANGEMENT = 320;
  static REPLI = 240;
  static FONDU = 120;

  constructor(stickyHeader, nav) {
    this.entete = stickyHeader;
    this.tel = stickyHeader.menuTelephone;
    this.details = stickyHeader.detailsParent;
    this.menu = stickyHeader.menu;
    this.nav = nav;
    this.cadre = stickyHeader.querySelector('.menu-ordi-entete');
    this.barre = stickyHeader.querySelector('.menu-ordi-barre');
    this.voile = stickyHeader.querySelector('.menu-ordi-voile');
    this.pastille = nav.querySelector('.menu-ordi-pastille');
    this.ombre = nav.querySelector('.menu-ordi-pastille-ombre');
    this.boutDroit = nav.querySelectorAll('.menu-ordi-pastille-bout')[1];
    this.milieu = nav.querySelector('.menu-ordi-pastille-milieu');
    this.boutons = [...nav.querySelectorAll('.menu-ordi-rayon')];
    this.rayons = [...this.menu.querySelectorAll('.menu-tel-rayon')];
    this.ordinateur = window.matchMedia('(min-width: 768px)');
    this.reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
    const courant = this.boutons.findIndex((b) => b.getAttribute('aria-current') === 'true') + 1;
    this.etat = { ouvert: 0, par: null, vise: 0, courant };
    this.minuteries = {};
    this.main = false;
    this.pointeur = 'mouse';
    this.posee = null;
    this.changement = null;
    this.charges = new Set();

    // La souris, le toucher, le clavier sur les rayons.
    nav.addEventListener('pointerdown', (e) => (this.pointeur = e.pointerType), true);
    this.boutons.forEach((bouton, i) => {
      const rayon = i + 1;
      bouton.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.geste({ type: 'entre', rayon }));
      bouton.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.geste({ type: 'sort', rayon }));
      bouton.addEventListener('click', (e) => {
        const par = e.detail === 0 ? 'clavier' : this.pointeur === 'touch' ? 'toucher' : 'souris';
        this.geste({ type: 'clic', rayon, par });
      });
      bouton.addEventListener('keydown', (e) => this.clavier(e, rayon));
    });
    // La souris dans l'en-tête et le panneau (qui est dedans) ; le focus dans la bascule et le panneau. Qui s'en approche
    // (la souris, le doigt, le clavier) fait venir les images de tous les rayons.
    this.barre.addEventListener('pointerenter', (e) => {
      this.chargerTout();
      if (e.pointerType === 'mouse') this.geste({ type: 'zone-entre' });
    });
    this.barre.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.geste({ type: 'zone-sort' }));
    nav.addEventListener('focusin', () => this.chargerTout());
    for (const zone of [nav, this.menu]) {
      zone.addEventListener('focusout', (e) => {
        if (this.etat.ouvert && e.relatedTarget && !this.dansLaZone(e.relatedTarget)) this.geste({ type: 'focus-sort' });
      });
    }
    this.menu.addEventListener('keydown', (e) => this.tabulation(e));
    // Un clic ou un toucher à côté (le voile, le bandeau, la page) ; Échap.
    document.addEventListener('pointerdown', (e) => this.etat.ouvert && !this.barre.contains(e.target) && this.geste({ type: 'dehors' }), true);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.etat.ouvert && this.geste({ type: 'echap', focusDedans: this.dansLaZone(document.activeElement) }));
    // Sous 768 px, le menu redevient celui du téléphone ; au-dessus, la pastille reprend sa place.
    this.ordinateur.addEventListener('change', () => {
      if (this.ordinateur.matches) this.placerPastille(MenuOrdinateur.cible(this.etat), false);
      else {
        this.geste({ type: 'telephone' });
        this.rendre();
      }
    });
    // La pastille suit la largeur des mots (la police qui arrive, une fenêtre qu'on élargit).
    if ('ResizeObserver' in window) new ResizeObserver(() => this.placerPastille(MenuOrdinateur.cible(this.etat), false)).observe(nav);
    // Une fenêtre qui change : la place sous l'en-tête et la taille des emblèmes se mesurent de nouveau.
    let attente = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(attente);
      attente = window.setTimeout(() => {
        if (!this.main || !this.ordinateur.matches || this.changement) return;
        this.mesurer();
        this.mesurerPanneau();
      }, 250);
    });
    this.placerPastille(MenuOrdinateur.cible(this.etat), false);
    // Au repos, une fois la page chargée (après le premier tableau) : le panneau se prépare, caché, avec les images du
    // rayon de la page. Le premier survol le trouve prêt.
    const auRepos = () => {
      if (document.readyState !== 'complete' || !this.ordinateur.matches) return;
      if (window.requestIdleCallback) window.requestIdleCallback(() => this.preparer(), { timeout: 2000 });
      else window.setTimeout(() => this.preparer(), 200);
    };
    auRepos();
    window.addEventListener('load', auRepos, { once: true });
    this.ordinateur.addEventListener('change', auRepos);
  }

  // Le <details> du téléphone est à l'ordinateur : ses gestes du téléphone n'y touchent pas.
  aLaMain() {
    return this.main;
  }

  geste(geste) {
    const { etat, faire } = MenuOrdinateur.suite(this.etat, geste);
    this.etat = etat;
    let pastille = null;
    for (const f of faire) {
      if ('pastille' in f) pastille = f.pastille;
      else if (f.planifier) {
        window.clearTimeout(this.minuteries[f.planifier]);
        this.minuteries[f.planifier] = window.setTimeout(() => this.geste({ type: 'minuterie', quoi: f.planifier, rayon: f.rayon }), f.delai);
      } else if (f.annuler) window.clearTimeout(this.minuteries[f.annuler]);
      else if (f.ouvrir) {
        if (f.avant) this.changer(f.avant, f.ouvrir);
        else this.deplier(f.ouvrir);
      } else if (f.fermer) this.replier(f.fermer, f);
      else if (f.entrer) {
        const lien = this.liens()[0];
        if (lien) lien.focus();
      }
    }
    if (pastille !== null) this.placerPastille(pastille, true);
    this.boutons.forEach((b, i) => b.setAttribute('aria-expanded', String(this.etat.ouvert === i + 1)));
  }

  // Le rayon que la pastille marque : celui que la souris vise, sinon l'ouvert, sinon celui de la page (0 : aucun).
  static cible(etat) {
    return etat.vise || etat.ouvert || etat.courant || 0;
  }

  dansLaZone(element) {
    return Boolean(element) && (this.nav.contains(element) || this.menu.contains(element));
  }

  section(rayon) {
    return this.rayons.find((s) => Number(s.dataset.rayon) === Number(rayon)) || null;
  }

  // Le rayon qu'on regarde : le seul qui se voit (data-vu). Les autres restent rendus, cachés (input.css) : passer de
  // l'un à l'autre ne refait ni leurs styles ni leur mise en page.
  montrer(rayon) {
    this.rayons.forEach((s) => s.toggleAttribute('data-vu', Number(s.dataset.rayon) === Number(rayon)));
  }

  // Ce qui prend le focus dans le panneau, dans l'ordre : les liens du rayon ouvert, puis « Suivre ma commande ».
  liens() {
    const rayon = this.section(this.etat.ouvert);
    if (!rayon) return [];
    return [...rayon.querySelectorAll('a[href], button'), ...this.menu.querySelectorAll('.menu-tel-pied a[href]')].filter((x) => x.getClientRects().length);
  }

  clavier(e, rayon) {
    const n = this.boutons.length;
    const aller = (k) => {
      const j = ((k - 1 + n) % n) + 1;
      this.boutons[j - 1].focus();
      this.geste({ type: 'va', rayon: j });
    };
    if (e.key === 'ArrowDown') this.geste({ type: 'bas', rayon });
    else if (e.key === 'ArrowRight') aller(rayon + 1);
    else if (e.key === 'ArrowLeft') aller(rayon - 1);
    else if (e.key === 'Home') aller(1);
    else if (e.key === 'End') aller(n);
    else if (e.key === 'Tab' && !e.shiftKey && this.etat.ouvert === rayon && this.liens().length) {
      // Le panneau est posé avant l'en-tête dans la page : au clavier, il se lit comme s'il suivait son rayon.
      this.liens()[0].focus();
    } else return;
    e.preventDefault();
  }

  // Maj+Tab depuis le premier lien revient au rayon ; Tab depuis le dernier va au rayon suivant (ou à la recherche), et
  // le menu se ferme.
  tabulation(e) {
    if (e.key !== 'Tab' || !this.etat.ouvert) return;
    const liens = this.liens();
    const bouton = this.boutons[this.etat.ouvert - 1];
    if (e.shiftKey && document.activeElement === liens[0]) {
      e.preventDefault();
      bouton.focus();
    } else if (!e.shiftKey && document.activeElement === liens[liens.length - 1]) {
      e.preventDefault();
      const suivant = this.boutons[this.etat.ouvert] || this.entete.querySelector('#open-search-loup');
      this.geste({ type: 'focus-sort' });
      if (suivant) suivant.focus();
    }
  }

  /* Le panneau passe à l'ordinateur (MenuTelephone.passerSurOrdinateur : plus un dialogue, tous ses groupes ouverts).
     Son onglet de téléphone (le bouton radio) ne change pas : sur ordinateur, c'est data-vu qui montre un rayon. */
  prendre() {
    if (this.main) return;
    this.main = true;
    this.tel.passerSurOrdinateur(true);
    // La plus longue rangée (input.css : la taille des emblèmes, en largeur).
    const colonnes = Math.max(1, ...[...this.menu.querySelectorAll('.menu-tel-rangee')].map((r) => r.children.length));
    this.menu.style.setProperty('--colonnes', colonnes);
  }

  /* La taille des emblèmes, en hauteur (input.css) : la feuille la tire de la hauteur de l'écran, des rangées du rayon qui
     en a le plus (--rangees) et de ce qui, dans le panneau, ne grandit pas avec elles (--fixe : marges, noms, nombres, et
     les lignes de plus des noms longs). Mesurés ici, chaque rayon montré à son tour, jusqu'à ce que la mesure ne change
     plus (la taille change, les noms se coupent autrement). Au repos de la page, et de nouveau quand la fenêtre change.
     Chaque rayon finit ainsi mis en page avec ses styles à jour : le montrer plus tard ne refait rien. */
  mesurerPanneau() {
    const menu = this.menu;
    if (!this.details.open || !this.rayons.length) return;
    const vu = this.rayons.find((s) => s.hasAttribute('data-vu'));
    // Caché au repos (content-visibility), le panneau se montre le temps de la mesure : rien ne se peint entre-temps.
    menu.style.contentVisibility = 'visible';
    for (let tour = 0; tour < 3; tour++) {
      let pire = null;
      for (const rayon of this.rayons) {
        this.montrer(rayon.dataset.rayon);
        const rangees = rayon.querySelectorAll('.menu-tel-groupe').length;
        const cadre = rayon.querySelector('.c-emb[data-taille="menu"] .c-emb-cadre');
        if (!rangees || !cadre) continue;
        const fixe = menu.scrollHeight - 1.3 * rangees * cadre.getBoundingClientRect().width;
        if (!pire || rangees > pire.rangees || (rangees === pire.rangees && fixe > pire.fixe)) pire = { rangees, fixe };
      }
      if (!pire) break;
      const fixe = `${Math.ceil(pire.fixe)}px`;
      if (menu.style.getPropertyValue('--fixe') === fixe && menu.style.getPropertyValue('--rangees') === String(pire.rangees)) break;
      menu.style.setProperty('--rangees', pire.rangees);
      menu.style.setProperty('--fixe', fixe);
    }
    menu.style.contentVisibility = '';
    this.montrer(vu ? vu.dataset.rayon : this.etat.ouvert || this.etat.courant || 1);
  }

  // Tout revient comme au téléphone : le <details> fermé, le panneau, ses groupes et leurs titres, ses rayons.
  rendre() {
    if (!this.main) return;
    this.annulerChangement();
    this.main = false;
    this.details.open = false;
    this.vagues(null);
    this.menu.removeAttribute('data-ordi');
    this.tel.passerSurOrdinateur(false);
    this.rayons.forEach((s) => s.removeAttribute('data-vu'));
    this.voile.removeAttribute('data-vu');
  }

  /* La hauteur au-dessus du panneau, en haut de la page (le bandeau d'annonce et l'en-tête entier) : la taille des
     emblèmes en dépend (input.css), elle ne change pas quand on défile. Son nom n'est pas --menu-haut, que le menu du
     téléphone pose sur le panneau lui-même quand il s'ouvre. */
  mesurer() {
    const annonce = document.getElementById('shopify-section-tw-announcement-bar');
    const haut = (annonce ? annonce.offsetHeight : 0) + this.barre.offsetHeight + 2;
    if (haut !== this.haut) {
      this.haut = haut;
      this.cadre.style.setProperty('--panneau-haut', `${haut}px`);
    }
  }

  // Le panneau, prêt et caché : rendu une fois, mesuré, avec les images du rayon de la page.
  preparer() {
    if (!this.ordinateur.matches || this.details.open) return;
    this.prendre();
    this.mesurer();
    this.menu.dataset.ordi = 'repos';
    this.montrer(this.etat.ouvert || this.etat.courant || 1);
    this.details.open = true;
    this.mesurerPanneau();
    this.chargerImages(this.etat.ouvert || this.etat.courant || 1);
  }

  // Les images d'un rayon, demandées et décodées d'avance : elles sont là dès la première image du rideau.
  chargerImages(rayon) {
    const section = this.section(rayon);
    if (!section || this.charges.has(section)) return;
    this.charges.add(section);
    section.querySelectorAll('.c-emb img').forEach((image) => {
      if (image.loading === 'lazy') image.loading = 'eager';
      if (image.decode) image.decode().catch(() => {});
    });
  }

  /* Sur ordinateur seulement (au téléphone, son menu charge ses images quand il s'ouvre), et la page chargée : jamais
     avant ses premiers tableaux. Ouvrir le menu plus tôt fait venir les images de son rayon (deplier). */
  chargerTout() {
    if (this.ordinateur.matches && document.readyState === 'complete') this.rayons.forEach((s) => this.chargerImages(s.dataset.rayon));
  }

  /* Le rideau descend : le panneau se découpe de haut en bas, son contenu monte par vagues, le voile arrive. Tout se lit
     d'abord, tout s'écrit ensuite : aucune mise en page forcée, la page dessine dans la foulée. */
  deplier(rayon) {
    this.annulerChangement();
    window.clearTimeout(this.finRepli);
    const menu = this.menu;
    const revient = menu.dataset.ordi === 'ferme';
    const premier = !this.details.open;
    this.preparer();
    this.montrer(rayon);
    this.chargerImages(rayon);
    // Pas encore prêt (ouvert avant le repos de la page) : il se pose fermé, puis le rideau part.
    if (premier) void menu.offsetHeight;
    if (!revient && !this.reduit.matches) this.vagues(this.section(rayon));
    menu.dataset.ordi = 'ouvert';
    this.voile.setAttribute('data-vu', '');
  }

  /* Les vagues (input.css) : sur le rayon qui s'ouvre et sur le pied du panneau, le temps qu'elles passent ; les autres
     rayons, cachés, n'ont rien à refaire. Sans section : elles s'arrêtent. */
  vagues(section) {
    window.clearTimeout(this.finVagues);
    this.menu.querySelectorAll('[data-vagues]').forEach((x) => x.removeAttribute('data-vagues'));
    if (!section) return;
    const pied = this.menu.querySelector('.menu-tel-pied');
    for (const x of [section, pied]) if (x) x.setAttribute('data-vagues', '');
    this.finVagues = window.setTimeout(() => this.vagues(null), 650);
  }

  // Le rideau remonte, le voile s'efface ; le panneau redevient prêt et caché. Le focus qui était dedans revient au rayon.
  replier(rayon, { focus, instant }) {
    this.annulerChangement();
    const menu = this.menu;
    const dedans = menu.contains(document.activeElement);
    this.vagues(null);
    menu.dataset.ordi = 'ferme';
    this.voile.removeAttribute('data-vu');
    const fin = () => {
      if (!this.etat.ouvert && menu.dataset.ordi === 'ferme') menu.dataset.ordi = 'repos';
    };
    window.clearTimeout(this.finRepli);
    if (instant || this.reduit.matches) fin();
    else this.finRepli = window.setTimeout(fin, MenuOrdinateur.REPLI + 20);
    if (focus || dedans) this.boutons[rayon - 1].focus({ preventScroll: true });
  }

  /* D'un rayon à l'autre, menu ouvert : le nouveau arrive de 24 px du côté où l'on va, l'ancien part de l'autre côté ; la
     hauteur du panneau suit, découpée (clip-path), sans saut. */
  changer(avant, apres) {
    const menu = this.menu;
    const vieux = this.section(avant);
    const neuf = this.section(apres);
    this.chargerImages(apres);
    if (this.reduit.matches || !vieux || !neuf || vieux === neuf) {
      this.annulerChangement();
      this.montrer(apres);
      return;
    }
    // Un changement en cours : chacun repart d'où il en est.
    const ou = (el) => {
      const style = window.getComputedStyle(el);
      return { opacity: style.opacity, transform: style.transform };
    };
    const enCours = this.changement;
    const departVieux = enCours && enCours.neuf === vieux ? ou(vieux) : { opacity: 1, transform: 'none' };
    const departNeuf = enCours && enCours.vieux === neuf ? ou(neuf) : null;
    const hauteurAvant = this.hauteurVue();
    // « Suivre ma commande » : d'où on le voit maintenant.
    const pied = menu.querySelector('.menu-tel-pied');
    const piedAvant = pied ? pied.getBoundingClientRect().top : 0;
    this.annulerChangement();
    // L'ancien rayon reste là, par-dessus, le temps de partir (data-part, input.css).
    vieux.setAttribute('data-part', '');
    this.montrer(apres);
    const hauteurApres = menu.offsetHeight;
    const piedApres = pied ? pied.getBoundingClientRect().top : 0;
    const sens = apres > avant ? 1 : -1;
    const options = { duration: MenuOrdinateur.CHANGEMENT, easing: MenuOrdinateur.COURBE };
    const part = vieux.animate([departVieux, { opacity: 0, transform: `translateX(${-24 * sens}px)` }], options);
    const arrive = neuf.animate([departNeuf || { opacity: 0, transform: `translateX(${24 * sens}px)` }, { opacity: 1, transform: 'none' }], options);
    let hauteur = null;
    let glisse = null;
    const H = Math.ceil(Math.max(hauteurAvant, hauteurApres));
    if (Math.abs(hauteurAvant - hauteurApres) >= 1) {
      menu.style.minHeight = `${H}px`;
      hauteur = menu.animate([{ clipPath: `inset(0 0 ${H - hauteurAvant}px 0)` }, { clipPath: `inset(0 0 ${H - hauteurApres}px 0)` }], options);
      // Le pied suit le bord du panneau, de sa place d'avant à celle d'après (mesurée sans la hauteur gardée le temps du
      // changement) : il ne disparaît ni ne saute à la fin.
      if (pied) {
        const pendant = pied.getBoundingClientRect().top;
        glisse = pied.animate([{ transform: `translateY(${piedAvant - pendant}px)` }, { transform: `translateY(${piedApres - pendant}px)` }], options);
      }
    }
    const changement = { vieux, neuf, part, arrive, hauteur, glisse, H };
    this.changement = changement;
    arrive.finished.then(() => this.changement === changement && this.annulerChangement(), () => {});
  }

  // La hauteur du panneau telle qu'on la voit : pendant un changement, celle que découpe le clip-path.
  hauteurVue() {
    const c = this.changement;
    if (c && c.hauteur) {
      const bas = /inset\(\s*[\d.]+px\s+[\d.]+px\s+([\d.]+)px/.exec(window.getComputedStyle(this.menu).clipPath);
      if (bas) return c.H - Number(bas[1]);
    }
    return this.menu.offsetHeight;
  }

  annulerChangement() {
    const c = this.changement;
    if (!c) return;
    this.changement = null;
    c.part.cancel();
    c.arrive.cancel();
    if (c.hauteur) c.hauteur.cancel();
    if (c.glisse) c.glisse.cancel();
    c.vieux.removeAttribute('data-part');
    this.menu.style.minHeight = '';
  }

  /* La pastille, sous un rayon (0 : aucun). Elle glisse en 0,42 s, sa largeur épousant celle du mot ; là où il n'y en
     avait pas, elle apparaît en fondu en passant de 94 % à 100 % (et disparaît de même). Elle ne bouge que par les
     transformations de ses parts et son opacité, des animations que la carte graphique joue seule : la bascule garde ses
     60 images par seconde même quand la page travaille (le panneau qui s'ouvre). Sans anime : posée tout de suite. */
  placerPastille(rayon, anime) {
    const bouton = rayon ? this.boutons[rayon - 1] : null;
    if (!bouton || !bouton.offsetWidth) {
      if (!rayon && this.posee && this.posee.o) this.poser({ ...this.posee, o: 0, s: 0.94 }, anime);
      return;
    }
    const vers = { x: bouton.offsetLeft, w: bouton.offsetWidth, o: 1, s: 1 };
    const p0 = this.posee;
    if (p0 && p0.o === 1 && p0.x === vers.x && p0.w === vers.w) return;
    // Là où il n'y en avait pas, elle apparaît sur place.
    this.poser(vers, anime, p0 && p0.o ? null : { ...vers, o: 0, s: 0.94 });
    this.nav.setAttribute('data-pret', '');
  }

  /* vers, depuis : { x, w, o, s } : le bord gauche et la largeur qu'on voit, l'opacité, l'échelle autour du centre. Les
     parts (input.css) : le tout se déplace et prend l'échelle ; le bout droit se pose à la largeur, le milieu et l'ombre
     s'étirent jusqu'à lui. Leurs tailles d'arrivée sont posées d'emblée, et chaque transformation part de la place et de
     la largeur d'où vient la pastille : à la fin, plus rien n'est étiré, rien ne se repeint. */
  poser(vers, anime, depuis = null) {
    const p = this.pastille;
    const d = this.boutDroit.offsetWidth;
    const largeur = vers.w;
    const milieu = Math.max(1, largeur - d);
    const formes = (e) => [
      [p, `translateX(${e.x + (e.w * (1 - e.s)) / 2}px) scale(${e.s})`],
      [this.ombre, `scaleX(${e.w / largeur})`],
      [this.boutDroit, `translateX(${e.w - d}px)`],
      [this.milieu, `scaleX(${Math.max(0, e.w - d) / milieu})`],
    ];
    let de = depuis;
    if (!de && anime && this.posee) {
      // D'où elle est, ce qu'on voit : en plein glissement aussi.
      const matrice = (el) => {
        const t = window.getComputedStyle(el).transform;
        return new DOMMatrixReadOnly(t === 'none' ? undefined : t);
      };
      const m = matrice(p);
      const s = m.a || 1;
      const w = matrice(this.boutDroit).m41 + d;
      de = { x: m.m41 - (w * (1 - s)) / 2, w, s, o: parseFloat(window.getComputedStyle(p).opacity) };
    }
    p.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    this.ombre.style.width = `${largeur}px`;
    this.milieu.style.width = `${milieu}px`;
    const fin = formes(vers);
    for (const [el, t] of fin) el.style.transform = t;
    p.style.opacity = vers.o;
    this.posee = vers;
    if (!anime || !de) return;
    if (this.reduit.matches) {
      if (de.o !== vers.o) p.animate([{ opacity: de.o }, { opacity: vers.o }], { duration: MenuOrdinateur.FONDU, easing: 'ease' });
      return;
    }
    const options = { duration: MenuOrdinateur.GLISSE, easing: MenuOrdinateur.COURBE };
    const debut = formes(de);
    p.animate([{ transform: debut[0][1], opacity: de.o }, { transform: fin[0][1], opacity: vers.o }], options);
    if (de.w !== vers.w) for (let i = 1; i < fin.length; i++) fin[i][0].animate([{ transform: debut[i][1] }, { transform: fin[i][1] }], options);
  }

  // Une fermeture demandée d'ailleurs : l'en-tête qui part, la recherche ou le panier qui s'ouvrent.
  fermer() {
    if (this.etat.ouvert || this.etat.vise) this.geste({ type: 'entete-part' });
  }
}

class StickyHeader extends HTMLElement {
  constructor() {
    super();
    // Mobile navigation elements
    this.menuOpener = this.querySelector('.menu-opener');
    this.detailsParent = this.menuOpener.parentNode;
    this.menu = this.menuOpener.nextElementSibling;
    this.subDetails = this.menu.querySelectorAll('details');
    this.menuTelephone = this.menu.classList.contains('menu-tel') ? new MenuTelephone(this.menu) : null;
    // Le menu d'ordinateur du nouvel en-tête (ticket 13) : sa bascule ouvre ce même menu, habillé en panneau.
    const bascule = this.menuTelephone ? this.querySelector('.menu-ordi-rayons') : null;
    this.menuOrdi = bascule ? new MenuOrdinateur(this, bascule) : null;

    // Desktop navigation elements
    this.desktopNavButtons = this.querySelectorAll('.desktop-nav-button');
    this.desktopDropdowns = this.querySelectorAll('.desktop-dropdown');

    // Common elements
    this.overlay = document.getElementById('overlay-content');
    this.cartButton = document.getElementById('cart-button');
    this.body = document.body;
    this.headerBounds = {};
    this.currentScrollTop = 0;
    this.preventReveal = false;
    this.preventHide = false;
    this.isHide = false;
    this.header = this.parentElement;
    this.predictiveSearch = document.querySelector('predictive-search');

    // Desktop dropdown state tracking
    this.currentOpenDropdown = null;
    this.dropdownCloseTimeout = null;
    this.preventDropdownOpen = false; // Prevents dropdown from reopening after hamburger click
    this.lastTouchTime = 0; // Track last touch to ignore hover events on touch devices
  }

  connectedCallback() {
    document.addEventListener('overlayClick', async (e) => {
      if (!this.detailsParent.contains(e.target) && this.telephoneOuvert()) {
        this.renderBodyScrollable(true);
        await this.closeMobileMenu();
      }
    });

    this.menuOpener.addEventListener('click', async (e) => {
      e.preventDefault();
      // Sur ordinateur, le <details> est au menu d'ordinateur (et ce bouton, caché) : le téléphone n'y touche pas.
      if (this.menuOrdi?.aLaMain()) return;
      // Close desktop dropdown if open (for iPad/landscape mode)
      if (this.currentOpenDropdown) {
        this.closeDesktopDropdown();
        this.preventDropdownOpen = true;
        // Reset the flag after a delay for touch devices
        setTimeout(() => {
          this.preventDropdownOpen = false;
        }, 300);
      }

      const isOpen = this.detailsParent.open;
      if (isOpen) {
        this.renderBodyScrollable(true);
        await this.closeMobileMenu();
      } else {
        this.openMobileMenu(e);
      }
    });

    // Desktop navigation hover behavior
    this.desktopNavButtons.forEach((button) => {
      const sectionId = button.dataset.sectionId;
      const dropdown = this.querySelector(`#dropdown-${sectionId}`);

      if (!dropdown) return;

      // Track touch events to distinguish from mouse events
      button.addEventListener('touchstart', () => {
        this.lastTouchTime = Date.now();
      }, { passive: true });

      // Button hover - open dropdown (ignore if recent touch)
      button.addEventListener('mouseenter', () => {
        // Ignore mouseenter if it happened within 500ms of a touch (mobile Safari compatibility)
        if (Date.now() - this.lastTouchTime > 500 && !this.preventDropdownOpen) {
          this.openDesktopDropdown(dropdown, button);
        }
      });

      // Button click - toggle dropdown (important for touch devices)
      button.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.currentOpenDropdown === dropdown) {
          // If this dropdown is open, close it and prevent reopening on hover
          this.closeDesktopDropdown();
          this.preventDropdownOpen = true;

          // On touch devices, reset the flag after a short delay since mouseleave won't fire
          setTimeout(() => {
            this.preventDropdownOpen = false;
          }, 300);
        } else if (!this.preventDropdownOpen) {
          // If closed and not prevented, open it (for touch devices)
          this.openDesktopDropdown(dropdown, button);
        }
      });

      // Button keyboard support
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleDesktopDropdown(dropdown, button);
        } else if (e.key === 'Escape') {
          this.closeDesktopDropdown();
        }
      });

      // Dropdown hover - keep open
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(this.dropdownCloseTimeout);
      });

      dropdown.addEventListener('mouseleave', () => {
        this.closeDesktopDropdown();
      });

    });

    // Get the header container to reset the prevent flag
    const headerContainer = this.querySelector('.flex.items-center.justify-between');
    if (headerContainer) {
      headerContainer.addEventListener('mouseleave', () => {
        // Reset the prevent flag when mouse leaves the entire header
        this.preventDropdownOpen = false;
      });
    }

    // Special case: if there's only one button, open dropdown on header hover
    if (this.desktopNavButtons.length === 1) {
      const singleButton = this.desktopNavButtons[0];
      const sectionId = singleButton.dataset.sectionId;
      const singleDropdown = this.querySelector(`#dropdown-${sectionId}`);

      if (singleDropdown) {
        if (headerContainer) {
          // Track touches on the header container
          headerContainer.addEventListener('touchstart', () => {
            this.lastTouchTime = Date.now();
          }, { passive: true });

          headerContainer.addEventListener('mouseenter', () => {
            // Ignore mouseenter if it happened within 500ms of a touch
            if (Date.now() - this.lastTouchTime > 500 && !this.preventDropdownOpen) {
              this.openDesktopDropdown(singleDropdown, singleButton);
            }
          });

          headerContainer.addEventListener('mouseleave', () => {
            // Only close if not hovering over the dropdown itself
            this.dropdownCloseTimeout = setTimeout(() => {
              this.closeDesktopDropdown();
            }, 100);
          });
        }
      }
    }

    // Desktop dropdown: Show images on hover of collections, parent items, products, and pages
    this.desktopDropdowns.forEach((dropdown) => {
      const collectionItems = dropdown.querySelectorAll(
        '.desktop-nav-collection-item',
      );
      const parentItems = dropdown.querySelectorAll('.desktop-nav-parent-item');
      const productItems = dropdown.querySelectorAll(
        '.desktop-nav-product-item',
      );
      const pageItems = dropdown.querySelectorAll('.desktop-nav-page-item');
      const defaultImage = dropdown.querySelector('.desktop-nav-default-image');

      // Handle collection_only items
      collectionItems.forEach((collectionItem) => {
        const imageId = collectionItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          collectionItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid');
            });

            // Show this collection's image grid
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('grid');
          });

          collectionItem.addEventListener('mouseleave', () => {
            // Hide collection image grid
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('grid');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });

      // Handle set_of_collections items
      parentItems.forEach((parentItem) => {
        const imageId = parentItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          const dropdownGrid = parentItem.closest('.dropdown-grid');

          parentItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this item's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');

            // Change grid layout to 2 columns
            if (dropdownGrid) {
              dropdownGrid.classList.remove(
                'grid-cols-[200px_1fr]',
                'lg:grid-cols-[280px_1fr]',
              );
              dropdownGrid.classList.add(
                'grid-cols-[1fr_300px]',
                '2md:grid-cols-2',
              );
            }
          });

          parentItem.addEventListener('mouseleave', () => {
            // Hide collection image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }

            // Restore grid layout
            if (dropdownGrid) {
              dropdownGrid.classList.remove(
                'grid-cols-[1fr_300px]',
                '2md:grid-cols-2',
              );
              dropdownGrid.classList.add(
                'grid-cols-[200px_1fr]',
                'lg:grid-cols-[280px_1fr]',
              );
            }
          });
        }
      });

      // Handle product_only items
      productItems.forEach((productItem) => {
        const imageId = productItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          productItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this product's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');
          });

          productItem.addEventListener('mouseleave', () => {
            // Hide product image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });

      // Handle page_only items
      pageItems.forEach((pageItem) => {
        const imageId = pageItem.dataset.imageId;
        const imagePanel = imageId
          ? dropdown.querySelector(`#${imageId}`)
          : null;

        if (imagePanel) {
          pageItem.addEventListener('mouseenter', () => {
            // Hide default image
            if (defaultImage) {
              defaultImage.classList.add('hidden');
              defaultImage.classList.remove('grid');
            }

            // Hide all images first
            dropdown.querySelectorAll('.desktop-nav-image').forEach((img) => {
              img.classList.add('hidden');
              img.classList.remove('grid', 'flex');
            });

            // Show this page's image
            imagePanel.classList.remove('hidden');
            imagePanel.classList.add('flex');
          });

          pageItem.addEventListener('mouseleave', () => {
            // Hide page image
            imagePanel.classList.add('hidden');
            imagePanel.classList.remove('flex');

            // Show default image again
            if (defaultImage) {
              defaultImage.classList.remove('hidden');
              defaultImage.classList.add('grid');
            }
          });
        }
      });
    });

    this.subDetails.forEach((subDetail) => {
      // Only add submenu behavior to navigation submenus, not other details elements (e.g. localization)
      if (!subDetail.classList.contains('js-nav-submenu')) return;

      // Single-open accordion: close other submenus when one opens. Sur ordinateur, ils sont tous ouverts.
      subDetail.addEventListener('toggle', () => {
        if (subDetail.open && !this.menuOrdi?.aLaMain()) {
          // Close sibling submenus at the same level
          const parent = subDetail.closest('ul');
          parent.querySelectorAll('.js-nav-submenu').forEach((other) => {
            if (other !== subDetail && other.open) {
              other.open = false;
            }
          });
        }
      });
    });

    // Le bouton du panier reste visible pendant la recherche : il n'est plus caché aux lecteurs d'écran
    // (aria-hidden le laissait atteignable au clavier : jamais de focus sur un bouton caché).
    document.addEventListener('PredictiveSearchClose', () => {
      this.cartButton?.classList.replace('translate-y-0', 'translate-y-1/2');
      this.body.classList.remove('overflow-hidden');
    });
    document.addEventListener('PredictiveSearchOpen', () => {
      this.renderBodyScrollable(false);
      this.closeMobileMenu();
      this.reveal();
      this.cartButton?.classList.replace('translate-y-1/2', 'translate-y-0');
    });

    this.cartButton?.addEventListener('click', () => {
      this.renderBodyScrollable(false);
      this.closeMobileMenu();
      this.setOverlayAboveHeader(true);
      document.dispatchEvent(new CustomEvent('openCartDrawer'));
    });
    document.addEventListener('CartDrawerClose', () => {
      this.renderBodyScrollable(true);
      this.setOverlayAboveHeader(false);
    });

    this.addEventListener('keydown', (e) => {
      // Get focusable elements dynamically when mobile menu is open
      if (this.telephoneOuvert()) {
        const firstFocusable = this.menuOpener;
        const lastFocusable = this.menuTelephone?.dernier() ||
                              this.menu.querySelector('.last-focusable') ||
                              this.menu.querySelector('a:last-of-type') ||
                              this.menu.querySelector('button:last-of-type');
        if (firstFocusable && lastFocusable) {
          trapFocus(e, firstFocusable, lastFocusable);
        }
      }
    });
    this.hideHeaderOnScrollUp = () => (this.preventReveal = true);
    this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
    // Sur la nouvelle page collection (<html data-refonte-page>, layout/collection.liquid), l'en-tête suit le doigt
    // (EnteteQuiSuit, en tête de ce fichier ; ticket 07). Partout ailleurs, il se cache et revient par ses classes.
    if (document.documentElement.hasAttribute('data-refonte-page')) {
      this.suivi = new EnteteQuiSuit(this);
    } else {
      window.addEventListener('scroll', this.onScroll, false);
    }
    this.addEventListener('keyup', (evt) => {
      if (evt.code === 'Escape') {
        this.renderBodyScrollable(true);
        this.closeMobileMenu();
      }
    });
    this.measureFixHeaderHeight();
    this.preparerPhotosDuMenu();

    // Handle orientation/resize changes to reset state when switching between mobile/desktop
    // La hauteur seule (la barre du navigateur, le clavier) ne ferme rien : seul un changement de largeur compte.
    let resizeTimeout;
    let largeur = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === largeur) return;
      largeur = window.innerWidth;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Reset dropdown state when switching layouts
        this.preventDropdownOpen = false;
        this.lastTouchTime = 0;

        // Close desktop dropdown if switching to mobile
        if (window.innerWidth < 768) { // md breakpoint
          this.closeDesktopDropdown();
          // Force close mobile menu and reset its state completely
          if (this.telephoneOuvert()) {
            this.detailsParent.open = false;
            this.switchMobileMenuLogo(true);
            this.menu.classList.remove('open-nav');
            this.menu.classList.add('close-nav');
            this.showOverlay(false);
            this.resetMenuDisplay();
          }
          // Ensure body is scrollable
          this.renderBodyScrollable(true);
        }

        // Close mobile menu if switching to desktop
        if (window.innerWidth >= 768) {
          // Force close mobile menu completely when switching to desktop
          if (this.telephoneOuvert()) {
            this.detailsParent.open = false;
            this.switchMobileMenuLogo(true);
            this.menu.classList.remove('open-nav');
            this.menu.classList.add('close-nav');
            this.showOverlay(false);
            this.resetMenuDisplay();
          }
          this.renderBodyScrollable(true);
        }
      }, 100);
    });
  }

  // Le menu du téléphone est ouvert : son <details>, sauf quand l'ordinateur l'a (menuOrdi.aLaMain()).
  telephoneOuvert() {
    return this.detailsParent.open && !this.menuOrdi?.aLaMain();
  }

  closeMobileMenu = async () => {
    // Close desktop dropdown if open
    this.closeDesktopDropdown();

    if (!this.telephoneOuvert()) return;
    this.switchMobileMenuLogo(true);
    this.showOverlay(false);
    this.menu.classList.replace('open-nav', 'close-nav');
    // Le nouveau menu ne glisse pas avec « mouvements réduits » : pas de fin de transition à attendre.
    if (this.menuTelephone) await Promise.race([waitAnimEnd(this.menu), new Promise((fini) => setTimeout(fini, 260))]);
    else await waitAnimEnd(this.menu);
    // Le focus ne reste pas dans un menu caché : il revient à son bouton, sauf s'il est déjà parti ailleurs (la recherche,
    // ouverte depuis le menu, l'a pris pendant qu'il se fermait).
    const focusDedans = this.menu.contains(document.activeElement);
    this.detailsParent.open = false;
    this.resetMenuDisplay();
    if (this.menuTelephone && focusDedans) this.menuOpener.focus({ preventScroll: true });
  };

  resetMenuDisplay = () => {
    if (this.menuTelephone) {
      this.menuTelephone.fermer();
      return;
    }
    // Close all open submenus when mobile menu closes
    this.subDetails.forEach((detail) => {
      if (detail.classList.contains('js-nav-submenu')) {
        detail.open = false;
      }
    });
  };

  switchMobileMenuLogo(showBurger) {
    const burger = this.menuOpener
      .querySelector('.mobile-menu')
      .querySelector('.hamburger');
    const close = this.menuOpener
      .querySelector('.mobile-menu')
      .querySelector('.close');
    close.classList.toggle('hidden', showBurger);
    close.setAttribute('aria-hidden', '' + showBurger);
    burger.classList.toggle('hidden', !showBurger);
    burger.setAttribute('aria-hidden', '' + !showBurger);
  }

  openMobileMenu = () => {
    if (this.detailsParent.open) return;
    this.detailsParent.open = true;
    // Le nouveau menu prend ses mesures, encore hors de l'écran, puis glisse.
    this.menuTelephone?.ouvrir(this.header);
    this.menu.classList.replace('close-nav', 'open-nav');
    this.body.classList.add('overflow-hidden');
    this.switchMobileMenuLogo(false);
    this.showOverlay(true);

    if (this.menuTelephone) {
      this.menu.focus({ preventScroll: true });
      return;
    }
    // Focus first link or button in the mobile menu
    const firstFocusable = this.menu.querySelector('a, button');
    if (firstFocusable) {
      firstFocusable.focus();
    }
  };

  measureFixHeaderHeight() {
    this.headerBounds.bottom = this.header.offsetHeight;
  }

  onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (
      this.predictiveSearch &&
      this.predictiveSearch.getAttribute('aria-hidden') === 'false'
    )
      return;

    if (scrollTop < this.headerBounds.bottom) {
      requestAnimationFrame(this.reveal);
    } else if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight
    ) {
      requestAnimationFrame(this.hide);
    } else if (scrollTop > this.currentScrollTop) {
      if (!this.preventHide) {
        requestAnimationFrame(this.hide);
      } else {
        window.clearTimeout(this.isScrollingDown);

        this.isScrollingDown = setTimeout(() => {
          this.preventHide = false;
        }, 33);
      }
    } else if (scrollTop < this.currentScrollTop) {
      if (!this.preventReveal) {
        requestAnimationFrame(this.reveal);
      } else {
        window.clearTimeout(this.isScrollingUp);

        this.isScrollingUp = setTimeout(() => {
          this.preventReveal = false;
        }, 33);
      }
    }

    this.currentScrollTop = scrollTop;
  };

  hide = () => {
    if (this.isHide) return;
    this.closeDesktopDropdown();
    this.closeMobileMenu(true);
    this.header.classList.replace('translate-y-0', '-translate-y-full');
    this.cartButton?.classList.replace('translate-y-1/2', 'translate-y-0');
    this.preventReveal = true;
    this.isHide = true;
  };

  reveal = () => {
    // L'en-tête qui suit le doigt revient en entier (la recherche s'ouvre).
    if (this.suivi) {
      this.suivi.revenir();
      return;
    }
    if (!this.isHide) return;
    this.header.classList.replace('-translate-y-full', 'translate-y-0');
    this.cartButton?.classList.replace('translate-y-0', 'translate-y-1/2');
    this.preventHide = true;
    this.isHide = false;
  };

  renderBodyScrollable = (bool) => {
    this.body.classList.toggle('overflow-hidden', !bool);
  };

  setOverlayAboveHeader = (bool) => {
    this.wrapperOverlay =
      this.wrapperOverlay || document.getElementById('wrapper-overlay');
    this.wrapperOverlay.classList.toggle('relative', !bool);
    this.overlay.classList.toggle('z-40', bool);
  };

  showOverlay = (bool) => {
    this.overlay.classList.toggle('hidden', !bool);
    this.overlay.classList.toggle('!block', bool);
  };

  /* Les photos du menu d'ordinateur (snippets/tw-sticky-header.liquid) attendent, en loading="lazy" : la page ne les
     demande pas, et au téléphone, où ce menu reste caché, elles ne se chargent jamais. Là où il se montre (dès 768 px,
     md), elles se chargent d'avance, une fois la page chargée et le navigateur au repos : le premier survol les trouve
     prêtes. De même quand il apparaît plus tard (un téléphone ou une tablette qu'on tourne, une fenêtre qu'on élargit).
     Un menu ouvert avant cela n'a rien à demander : le navigateur charge de lui-même les photos qui se montrent, et
     d'abord elles (les demander toutes à l'ouverture les ferait attendre jusqu'à trois fois plus). */
  preparerPhotosDuMenu() {
    const ordinateur = window.matchMedia('(min-width: 768px)');
    const charger = () => {
      this.querySelectorAll('.desktop-dropdown-container img[loading="lazy"]').forEach((image) => {
        image.loading = 'eager';
      });
    };
    const auRepos = () => {
      if (document.readyState !== 'complete' || !ordinateur.matches) return;
      // Safari n'a pas requestIdleCallback.
      if (window.requestIdleCallback) window.requestIdleCallback(charger, { timeout: 2000 });
      else window.setTimeout(charger, 200);
    };
    auRepos();
    window.addEventListener('load', auRepos, { once: true });
    ordinateur.addEventListener('change', auRepos);
  }

  openDesktopDropdown = (dropdown, button) => {
    // Close any currently open dropdown
    if (this.currentOpenDropdown && this.currentOpenDropdown !== dropdown) {
      this.closeDesktopDropdown();
    }

    clearTimeout(this.dropdownCloseTimeout);

    // Open new dropdown
    dropdown.classList.remove('hidden');
    dropdown.setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true');

    // Show overlay
    this.showOverlay(true);

    // Prevent body scrolling when dropdown is open
    this.renderBodyScrollable(false);

    // Track current dropdown
    this.currentOpenDropdown = dropdown;

    // Make dropdown items focusable
    dropdown.querySelectorAll('li[tabindex]').forEach((li) => {
      li.setAttribute('tabindex', '0');
    });
  };

  closeDesktopDropdown = () => {
    // Le menu d'ordinateur du nouvel en-tête se ferme aussi (l'en-tête qui part, la recherche, le panier…).
    this.menuOrdi?.fermer();
    if (!this.currentOpenDropdown) return;

    const dropdown = this.currentOpenDropdown;
    const button = this.querySelector(`[aria-controls="${dropdown.id}"]`);

    // Hide dropdown
    dropdown.classList.add('hidden');
    dropdown.setAttribute('aria-hidden', 'true');
    if (button) button.setAttribute('aria-expanded', 'false');

    // Hide overlay
    this.showOverlay(false);

    // Re-enable body scrolling
    this.renderBodyScrollable(true);

    // Hide all children panels
    dropdown.querySelectorAll('.desktop-nav-children').forEach((panel) => {
      panel.classList.add('hidden');
    });

    // Remove focusability
    dropdown.querySelectorAll('li[tabindex]').forEach((li) => {
      li.setAttribute('tabindex', '-1');
    });

    this.currentOpenDropdown = null;
  };

  toggleDesktopDropdown = (dropdown, button) => {
    if (this.currentOpenDropdown === dropdown) {
      this.closeDesktopDropdown();
    } else {
      this.openDesktopDropdown(dropdown, button);
    }
  };
}
customElements.define('sticky-header', StickyHeader);

class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.cachedResults = {};
    this.input = this.querySelector('input[type="text"]');
    this.predictiveSearchResults = this.querySelector(
      '[data-predictive-search]',
    );
    this.overlay = document.getElementById('overlay-content');
    this.isOpen = false;
    this.StickyHeader = document.querySelector('sticky-header');
    this.deleteButton = this.querySelector('.delete');
    this.closeButton = this.querySelector('.close');
    this.openLoup = document.getElementById('open-search-loup');
    this.body = document.body;
    this.setupEventListeners();
    this.isInHeader = this.dataset.isInHeader === 'true';
  }

  setupEventListeners() {
    const form = this.querySelector('form');
    form.addEventListener('submit', this.onFormSubmit.bind(this));

    this.input.addEventListener('input', (e) => {
      debounce((event) => {
        this.onChange(event);
      }, 300)();

      this.changeLogo(e);
    });
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    document.addEventListener('overlayClick', this.close);
    this.openLoup?.addEventListener('click', this.open);
    this.overlay.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('overlayClick'));
    });
    this.deleteButton.addEventListener('click', () => {
      this.input.value = '';
      this.input.focus();
    });
    this.addEventListener('keyup', (evt) => {
      if (this.isInHeader && evt.code === 'Escape') {
        this.close();
      }
      if (evt.code === 'Enter' && evt.target.id === 'search') form.submit();
    });
    this.closeButton?.addEventListener(
      'keyup',
      (evt) => evt.code === 'Enter' && this.close(),
    );
    this.addEventListener('keydown', (e) => {
      if (!this.isInHeader) return;
      trapFocus(e, this.input, this.closeButton);
    });
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange = () => {
    const searchTerm = this.getQuery();
    if (!searchTerm.length) {
      this.closeList(true);
      this.classList.remove('bg-gradient-to-r', 'from-cyan-200', 'to-blue-200');
      return;
    }

    this.classList.add('bg-gradient-to-r', 'from-cyan-200', 'to-blue-200');
    this.getSearchResults(searchTerm);
  };

  onFormSubmit(event) {
    if (
      !this.getQuery().length ||
      this.querySelector('[aria-selected="true"] a')
    )
      event.preventDefault();
  }

  onFocus() {
    const searchTerm = this.getQuery();

    if (!searchTerm.length) return;

    if (this.getAttribute('results') === 'true') {
      this.openList();
    } else {
      this.getSearchResults(searchTerm);
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.closeList();
    });
  }

  changeLogo(e) {
    this.loupLogo = this.loupLogo || this.querySelector('.loup');
    const isClose = e.target.value.length;

    this.loupLogo.classList.toggle('opacity-0', isClose);
    this.loupLogo.classList.toggle('-translate-x-full', isClose);
    this.loupLogo.disabled = isClose;
    this.deleteButton.classList.toggle('opacity-0', !isClose);
    this.deleteButton.classList.toggle('translate-x-full', !isClose);
    this.deleteButton.disabled = !isClose;
  }

  switchOption(direction) {
    if (!this.getAttribute('open')) return;

    const moveUp = direction === 'up';
    const selectedElement = this.querySelector('[aria-selected="true"]');
    const allElements = this.querySelectorAll('li');
    let activeElement = this.querySelector('li');

    if (moveUp && !selectedElement) return;

    this.statusElement.textContent = '';

    if (!moveUp && selectedElement) {
      activeElement = selectedElement.nextElementSibling || allElements[0];
    } else if (moveUp) {
      activeElement =
        selectedElement.previousElementSibling ||
        allElements[allElements.length - 1];
    }

    if (activeElement === selectedElement) return;

    activeElement.setAttribute('aria-selected', true);
    if (selectedElement) selectedElement.setAttribute('aria-selected', false);

    this.setLiveRegionText(activeElement.textContent);
    this.input.setAttribute('aria-activedescendant', activeElement.id);
  }

  selectOption() {
    const selectedProduct = this.querySelector(
      '[aria-selected="true"] a, [aria-selected="true"] button',
    );

    if (selectedProduct) selectedProduct.click();
  }

  getSearchResults = (searchTerm) => {
    const queryKey = searchTerm.replace(' ', '-').toLowerCase();
    this.setLiveRegionLoadingState();

    if (this.cachedResults[queryKey]) {
      this.renderSearchResults(this.cachedResults[queryKey]);
      return;
    }

    fetch(
      `${routes.predictive_search_url}?q=${encodeURIComponent(
        searchTerm,
      )}&${encodeURIComponent('resources[type]')}=product&${encodeURIComponent(
        'resources[limit]',
      )}=10&section_id=tw-predictive-search-results`,
    )
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          this.closeList();
          throw error;
        }

        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector(
            '#shopify-section-tw-predictive-search-results',
          ).innerHTML;
        this.cachedResults[queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        this.closeList();
        throw error;
      });
  };

  setLiveRegionLoadingState() {
    this.statusElement =
      this.statusElement || this.querySelector('.predictive-search-status');
    this.loadingText =
      this.loadingText || this.getAttribute('data-loading-text');

    this.setLiveRegionText(this.loadingText);
    this.setAttribute('loading', true);
  }

  setLiveRegionText(statusText) {
    this.statusElement.setAttribute('aria-hidden', 'false');
    this.statusElement.textContent = statusText;

    setTimeout(() => {
      this.statusElement.setAttribute('aria-hidden', 'true');
    }, 1000);
  }

  renderSearchResults(resultsMarkup) {
    this.predictiveSearchResults.innerHTML = resultsMarkup;

    // Dédup jumeaux toile/poster selon le contexte de page, puis coupe à 4.
    const list = this.predictiveSearchResults.querySelector(
      '.predictive-search-results',
    );
    if (list && window.filterCategoryDuplicates) {
      window.filterCategoryDuplicates(list, this.dataset.searchScope || 'toile');
      list.querySelectorAll('li[data-pid]').forEach((el, i) => {
        if (i >= 4) el.remove();
      });
    }

    this.setAttribute('results', true);

    this.setLiveRegionResults();
    this.openList();

    // Apply unblur effect to newly loaded images
    if (window.removeSkeletonOnImagesLoad) {
      window.removeSkeletonOnImagesLoad(this.predictiveSearchResults);
    }
  }

  setLiveRegionResults() {
    this.removeAttribute('loading');
    this.setLiveRegionText(
      this.querySelector('[data-predictive-search-live-region-count-value]')
        .textContent,
    );
  }

  openList() {
    this.setAttribute('open', true);
    this.input.setAttribute('aria-expanded', true);
    this.isOpen = true;
    this.predictiveSearchResults.classList.remove('hidden');
  }

  closeList(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = '';
      this.removeAttribute('results');
    }

    const selected = this.querySelector('[aria-selected="true"]');
    if (selected) selected.setAttribute('aria-selected', false);

    this.input.setAttribute('aria-activedescendant', '');
    this.removeAttribute('open');
    this.input.setAttribute('aria-expanded', false);
    this.isOpen = false;
    this.predictiveSearchResults.classList.add('hidden');
  }

  open = () => {
    document.dispatchEvent(new CustomEvent('PredictiveSearchOpen'));
    this.overlay.classList.remove('hidden');
    this.input.removeAttribute('tabindex');
    this.closeButton.removeAttribute('tabindex');
    const results =
      this.querySelector('.predictive-search-results')?.children ?? [];
    Array.from(results).forEach((result) => {
      result.firstElementChild?.removeAttribute('tabindex');
    });
    this.classList.replace('-translate-y-full', 'translate-y-0');
    this.setAttribute('aria-hidden', 'false');
    this.classList.remove('pointer-events-none');
    this.input.focus();
  };

  close = () => {
    document.dispatchEvent(new CustomEvent('PredictiveSearchClose'));
    this.classList.replace('translate-y-0', '-translate-y-full');
    this.setAttribute('aria-hidden', 'true');
    this.classList.add('pointer-events-none');
    if (!this.overlay.classList.contains('hidden'))
      this.overlay.classList.add('hidden');
    const results = Array.from(
      this.querySelector('.predictive-search-results')?.children ?? [],
    );
    results.forEach((result) => {
      result.firstElementChild?.setAttribute('tabindex', '-1');
    });
    this.input.setAttribute('tabindex', '-1');
    this.openLoup.focus();
  };
}
customElements.define('predictive-search', PredictiveSearch);

/**
 * Déduplique les jumeaux toile/poster (même image, deux fiches liées par le
 * métafield link.painting/link.poster) dans un conteneur de résultats.
 *
 * On ne masque QUE les vrais doublons : une paire dont les deux membres sont
 * présents dans les résultats. Le membre conservé dépend du contexte (scope) :
 *  - scope 'poster' → on garde le poster, on retire la toile jumelle
 *  - scope 'toile'  → on garde la toile, on retire le poster jumeau
 * Les produits sans jumeau visible (orphelins) sont toujours conservés.
 *
 * Chaque élément doit porter : data-pid, data-poster ("1"|"0"), data-twin (id
 * du jumeau ou vide). La détection est pilotée par le lien (peu importe lequel
 * des deux membres le porte).
 *
 * @param {Element} container - conteneur dont on filtre les enfants [data-pid]
 * @param {string} scope - 'poster' | 'toile' (défaut 'toile')
 */
window.filterCategoryDuplicates = function (container, scope) {
  if (!container) return;
  const normScope = scope === 'poster' ? 'poster' : 'toile';
  const items = Array.from(container.querySelectorAll('[data-pid]'));
  if (!items.length) return;

  const byId = new Map();
  items.forEach((el) => byId.set(String(el.dataset.pid), el));

  const toHide = new Set();
  items.forEach((el) => {
    const twin = el.dataset.twin;
    if (!twin || !byId.has(twin)) return; // pas de jumeau visible → on garde
    const isPoster = el.dataset.poster === '1';
    let hideId;
    if (normScope === 'poster') {
      hideId = isPoster ? twin : el.dataset.pid; // retire la toile de la paire
    } else {
      hideId = isPoster ? el.dataset.pid : twin; // retire le poster de la paire
    }
    toHide.add(String(hideId));
  });

  toHide.forEach((pid) => {
    const el = byId.get(pid);
    if (el) el.remove();
  });
};

// Page /search : applique le même filtre anti-doublon à la grille de résultats,
// selon le scope transporté dans l'URL (?ps=poster|toile ; défaut toile).
(function initSearchResultsScope() {
  const grid = document.querySelector('[data-search-results-grid]');
  if (!grid) return;
  const ps = new URLSearchParams(window.location.search).get('ps');
  window.filterCategoryDuplicates(grid, ps === 'poster' ? 'poster' : 'toile');
})();

/**
 * Une entrée du sélecteur de pays du menu mobile (snippets/tw-sticky-header.liquid).
 * Chaque pays est un formulaire de localisation Shopify : Shopify renvoie lui-même vers la
 * page en cours, à son adresse traduite, dans le marché et la devise choisis, recherche
 * comprise. Il n'y a plus d'adresse à fabriquer ici. Le pays actuel reste un lien désactivé
 * sans adresse : un clic dessus ne fait rien.
 */
class LocalizationFlag extends HTMLElement {
  connectedCallback() {
    this.querySelector('a[aria-disabled="true"]')?.addEventListener('click', (e) => e.preventDefault());
  }
}
customElements.define('localization-flag', LocalizationFlag);

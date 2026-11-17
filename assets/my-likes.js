/* « Mes j'aime » (sections/my-likes.liquid) : les œuvres aimées, que le cœur des cartes garde dans localStorage
   (assets/my-like-button.js, clé productLikedHandles), chacune avec la carte de la collection. Shopify la rend
   dans le contexte du produit : /products/<handle>?section_id=my-likes-card (sections/my-likes-card.liquid),
   derrière le préfixe de langue et de marché. Image, prix, titres et vignette d'œuvre des nouveaux produits
   viennent donc du serveur, comme dans la collection ; il ne reste ici que ce qui est propre à cette page.
   Une œuvre aimée sur sa fiche se montre comme elle a été aimée : le cœur a gardé la ligne que l'achat
   ajoutait (clé productLikedLines). Sa carte est demandée pour la variante aimée (?variant=), que Shopify rend
   en objet, comme le panier ; la couleur du cadre d'un poster et son contour blanc, que la variante ne dit
   pas, se posent ici (dressPoster).
   Tests : scripts/my-likes.test.cjs. */
class MyLikes extends HTMLElement {
  /* Les cadres : handle de la couleur gardée d'un poster (_cadre, « cadre-noir-mat-1 », suffixe numérique ôté)
     → id du cadre que peint la vignette (data-frame). La table du panier (snippets/artwork-frame.liquid) et de
     la fiche 3D (FRAME_IDS de assets/component-oeuvre-3d.js) : scripts/artwork-frame.test.cjs compare les
     trois. */
  static FRAME_IDS = {
    'sans-cadre': 'sans',
    'cadre-blanc': 'blanc',
    'cadre-noir-mat': 'noir',
    'cadre-argent-ancien': 'argent',
    'cadre-chene-clair': 'chene',
    'cadre-noyer': 'noyer',
  };

  async connectedCallback() {
    const cards = await this.likedCards(this.likedHandles(), this.likedLines());
    this.hideLoader();
    if (cards.length === 0) {
      this.showEmptyMessage();
      return;
    }
    // Le cœur de chaque carte, aimé : son identifiant peut manquer dans productLikedIds (anciens j'aime).
    cards.forEach((card) => card.querySelector('button.like')?.classList.add('is-liked'));
    // Comme la grille de collection : les deux premières cartes chargent leur image tout de suite et en
    // priorité, les autres à l'approche de l'écran. La section les rend toutes en chargement immédiat : elle ne
    // connaît pas leur place.
    cards.slice(2).forEach((card) => card.querySelectorAll('img').forEach((img) => {
      img.loading = 'lazy';
      img.removeAttribute('fetchpriority');
    }));
    const grid = this.querySelector('template').content.firstElementChild.cloneNode();
    grid.append(...cards);
    this.append(grid);
    window.removeSkeletonOnImagesLoad?.(grid);
    // Les <script> d'une réponse de fetch ne s'exécutent pas : importer les modules des cartes (le reflet des
    // vignettes de poster, assets/oeuvre-card-reflet.js), comme le défilement infini (assets/collection.js).
    grid.querySelectorAll('script[type="module"][src]').forEach((script) => import(script.src));
  }

  /* Les handles aimés, sans doublon (un ancien double clic en gardait deux). */
  likedHandles() {
    try {
      const handles = JSON.parse(localStorage.getItem('productLikedHandles'));
      return Array.isArray(handles) ? [...new Set(handles)] : [];
    } catch (error) {
      return [];
    }
  }

  /* Les lignes gardées avec les j'aime donnés sur une fiche (assets/my-like-button.js, clé productLikedLines),
     par handle : { id, properties }. Seules comptent celles qui ont une variante, un nombre : une ligne
     illisible, ou un j'aime d'avant, laisse l'œuvre comme sans ligne. */
  likedLines() {
    const lines = new Map();
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem('productLikedLines'));
    } catch (error) {
      return lines;
    }
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return lines;
    Object.entries(stored).forEach(([handle, line]) => {
      if (!line || !/^\d+$/.test(String(line.id))) return;
      const properties = line.properties && typeof line.properties === 'object' ? line.properties : {};
      lines.set(handle, { id: String(line.id), properties });
    });
    return lines;
  }

  /* Les cartes, dans l'ordre des j'aime, six demandes à la fois au plus : la boutique répond 429 aux rafales.
     Celles qui ne viennent pas (produit retiré ou dépublié : 404 ; réseau) sont sautées, les autres
     s'affichent. */
  async likedCards(handles, lines) {
    const cards = [];
    let next = 0;
    const worker = async () => {
      while (next < handles.length) {
        const i = next++;
        cards[i] = await this.fetchCard(handles[i], lines.get(handles[i])).catch(() => null);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, handles.length) }, worker));
    return cards.filter(Boolean);
  }

  /* La carte d'une œuvre, prise dans l'enveloppe de sa section ; avec sa ligne gardée, celle de la variante
     aimée. Les handles sont traduits par langue : Shopify redirige d'un handle (ou d'un marché) à l'autre en
     gardant section_id et variant (relevés du 16 et du 17/11/2026). Une redirection qui perdrait section_id
     rendrait la fiche entière, avec les cartes d'autres œuvres : rien n'en est pris. */
  async fetchCard(handle, line) {
    const root = window.Shopify?.routes?.root || '/';
    const variant = line ? `variant=${line.id}&` : '';
    const response = await fetch(`${root}products/${encodeURIComponent(handle)}?${variant}section_id=my-likes-card`);
    if (!response.ok) return null;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const card = doc.querySelector('#shopify-section-my-likes-card anime-product-card');
    // La branche « aimée » de la carte (snippets/card-product.liquid), rendue pour la variante aimée. Une
    // variante que le produit n'a plus, Shopify l'ignore : la carte de toujours, laissée telle quelle.
    const liked = line && card && card.querySelector(`[data-liked-variant="${line.id}"]`);
    if (liked) this.dressPoster(liked, line.properties);
    return card;
  }

  /* Un poster tel qu'aimé. Shopify l'a rendu pour la variante : sous verre au cadre noir, ou en papier sans
     cadre, sans contour blanc. Comme au panier (snippets/cart-item-artwork.liquid), le contour blanc est celui
     de la ligne (_passe_partout), et le cadre prend sa couleur (_cadre). Une toile a déjà son cadre, celui de
     sa variante. */
  dressPoster(liked, properties) {
    const object = liked.querySelector('.oeuvre-card[data-kind="poster"]');
    if (!object) return;
    object.classList.toggle('no-contour', properties._passe_partout !== 'oui');
    if (object.dataset.look === 'verre') object.dataset.frame = MyLikes.posterFrame(properties._cadre);
  }

  /* Le cadre d'un poster sous verre, d'après la couleur gardée ; noir sans couleur connue. La règle du panier
     (snippets/artwork-frame.liquid) : le suffixe du handle s'ôte s'il reste le même nombre une fois relu
     (« -1 », pas « -01 »). */
  static posterFrame(handle) {
    const frame = MyLikes.FRAME_IDS[String(handle || '').replace(/-(?:0|[1-9]\d*)$/, '')];
    return frame && frame !== 'sans' ? frame : 'noir';
  }

  /* Une carte retirée par son cœur (assets/my-like-button.js). Plus aucune carte : la liste vide, même si
     productLikedIds garde une œuvre retirée de la boutique, qui n'a pas de carte. */
  removeCard(card) {
    card.remove();
    if (!this.querySelector('anime-product-card')) this.showEmptyMessage();
  }

  hideLoader() {
    this.nextElementSibling.classList.add('hidden');
  }

  showEmptyMessage() {
    document.querySelector('.empty-message')?.classList.remove('hidden');
  }
}
customElements.define('my-likes', MyLikes);

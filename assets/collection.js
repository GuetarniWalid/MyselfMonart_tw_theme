class InfiniteScroll extends HTMLElement {
  top = 'elem-top';
  bottom = 'elem-bottom';

  constructor() {
    super();
    this.numberOfPages = Number(this.dataset.pages);
    this.prevRatio;
    this.pages = Number(this.dataset.pages);
    this.page = Number(this.dataset.page);
    this.isFirstPage = this.page === 1;
    this.isLastPage = this.page === this.pages;

    // Preserve all query parameters (like filter.p.tag) when building pagination URLs
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('page'); // Remove existing page param if any
    const queryString = currentParams.toString();
    this.baseUrl = location.pathname + (queryString ? `?${queryString}&page=` : '?page=');

    this.sectionId = this.dataset.sectionId;
    // La page suivante se charge quand la fin approche à moins de `marge` px : 300 par défaut, data-marge pour une
    // autre (1200 sur la nouvelle page collection, sections/collection-grille.liquid).
    this.margin = Number(this.dataset.marge) || 300;
    this.previousPageExists =
      Number(this.previousElementSibling?.dataset?.page) === this.page - 1;
    this.nextPageExists =
      Number(this.nextElementSibling?.dataset?.page) === this.page + 1;
    this.paginationNavbar = document.querySelector('nav.pagination');
  }

  connectedCallback() {
    this.outlineEdges();
    if (!this.isLastPage && !this.nextPageExists) {
      if (this.dataset.bouton) this.watchEnd();
      else this.createFetcherObserver(this.bottom);
    }
    if (!this.isFirstPage && !this.previousPageExists)
      this.createFetcherObserver(this.top);
    this.createCurrentPageObserver();
  }

  // Un filtre a remplacé la grille : la fin d'un lot qui n'est plus là ne se guette plus, son bouton ne le pose plus.
  disconnectedCallback() {
    this.stopWatching();
  }

  /* La nouvelle page collection (sections/collection-grille.liquid ; data-bouton : l'id du bouton « Voir plus de
     tableaux », au bout des tableaux). Demande de Walid du 26/11/2026 : arrivé au pied de la page, on remonte un peu, la
     fin des tableaux se montre, la page suivante arrivait et poussait ce qu'on lisait. La suite ne vient donc seule que si
     l'on descend vers la fin des tableaux :
     - la fin arrive par le bas de l'écran, à `marge` px près (on descend dans les tableaux) : la page suivante se charge
       et se pose ;
     - elle arrive par le haut (on remonte depuis le guide ou les questions) : rien ne se pose, rien ne bouge ; la page
       suivante est seulement demandée, et le bouton la pose d'un coup ;
     - un lot en retard, quand la fin est déjà passée au-dessus du milieu de l'écran : si l'on descend encore (l'élan
       du doigt) et qu'elle se voit, il se pose sous nos yeux ; arrêté, ou plus bas qu'elle (on a filé vers le bas, on
       lit ce qui suit), il attend de même ;
     - remonté dans les tableaux plus loin que la marge, on redescend : la suite revient seule.
     Le bouton se montre tant qu'une page suivante existe, et marche toujours (une demande lente, hors ligne). */
  watchEnd() {
    this.plusButton = document.getElementById(this.dataset.bouton);
    if (this.plusButton) {
      this.onPlus = () => this.showNext(true);
      this.plusButton.addEventListener('click', this.onPlus);
      this.plusButton.hidden = false;
    }
    // Le dernier mouvement vers le bas, l'élan du doigt compris.
    this.lastY = window.scrollY;
    this.onScroll = () => {
      if (window.scrollY > this.lastY) this.lastDown = performance.now();
      this.lastY = window.scrollY;
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.endObserver = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1].isIntersecting) return;
      if (this.endAhead()) this.showNext();
      else this.nextBatch().catch(() => {});
    }, { rootMargin: `0px 0px ${this.margin}px 0px` });
    this.endObserver.observe(this.querySelector(`.${this.bottom}`));
  }

  stopWatching() {
    this.endObserver?.disconnect();
    this.endObserver = null;
    if (this.onScroll) window.removeEventListener('scroll', this.onScroll);
    if (this.plusButton) {
      this.plusButton.removeEventListener('click', this.onPlus);
      this.plusButton.removeAttribute('aria-busy');
    }
  }

  // La fin des tableaux est devant nous : sous le milieu de l'écran, ou plus bas.
  endAhead() {
    return this.querySelector(`.${this.bottom}`).getBoundingClientRect().top > window.innerHeight / 2;
  }

  // On descend encore (un défilement vers le bas il y a moins de 250 ms), et la fin des tableaux se voit.
  stillGoingDown() {
    if (!(performance.now() - this.lastDown < 250)) return false;
    return this.querySelector(`.${this.bottom}`).getBoundingClientRect().top >= 0;
  }

  // La page suivante, demandée une seule fois ; après un échec (hors ligne), le prochain besoin la redemande.
  nextBatch() {
    if (!this.nextRequest) {
      this.nextRequest = this.fetchPage(this.bottom).then((html) => {
        const node = this.parseNodeFromString(html);
        if (!node) throw new Error('page suivante sans tableaux');
        return node;
      });
      this.nextRequest.catch(() => {
        this.nextRequest = null;
      });
    }
    return this.nextRequest;
  }

  // asked : le bouton touché ; sinon, la fin arrivée par le bas de l'écran.
  async showNext(asked = false) {
    if (asked) {
      this.asked = true;
      this.plusButton?.setAttribute('aria-busy', 'true');
    }
    let node;
    try {
      node = await this.nextBatch();
    } catch (error) {
      this.plusButton?.removeAttribute('aria-busy');
      return;
    }
    // Déjà posée, ou un filtre a remplacé la grille pendant la demande.
    if (this.placed || !this.isConnected) return;
    // En retard : la fin est passée au-dessus du milieu de l'écran. Arrêté, ou plus bas qu'elle, on lit ce qui suit la
    // grille : le lot attend le bouton, ou qu'on redescende vers la fin.
    if (!this.asked && !this.endAhead() && !this.stillGoingDown()) return;
    this.placed = true;
    const button = this.plusButton;
    this.stopWatching();
    // La dernière page : plus rien à voir de plus.
    if (button && this.page + 1 >= this.pages) button.hidden = true;
    this.insertNode(node, this.bottom);
    this.announceBatch(node, this.bottom);
    // Au clavier comme au lecteur d'écran, on repart du premier des nouveaux tableaux, là où était le bouton.
    if (this.asked) node.querySelector('a[href]')?.focus({ preventScroll: true });
  }

  /* La page suivante posée après les tableaux, sans l'ancrage du défilement de Chrome : quand aucun tableau ne se voit
     plus au-dessus du bouton, il garderait à sa place ce qui suit la grille, et les nouveaux tableaux arriveraient hors
     de l'écran, au-dessus. */
  placeAfter(node) {
    const page = document.documentElement.style;
    page.overflowAnchor = 'none';
    this.after(node);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      page.overflowAnchor = '';
    }));
  }

  outlineEdges() {
    !this.isFirstPage &&
      this.firstElementChild.className !== this.top &&
      this.insertElemTo(this.top);
    !this.isLastPage &&
      this.lastElementChild.className !== this.bottom &&
      this.insertElemTo(this.bottom);
  }

  createFetcherObserver(direction) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (
          entry.isIntersecting &&
          entry.target.classList.contains(direction)
        ) {
          observer.disconnect();

          const htmlString = await this.fetchPage(direction);
          // Un filtre a remplacé la grille pendant la demande (assets/collection-filtres.js) : ce lot n'a plus de place,
          // et la suite de la nouvelle grille ne doit pas le compter.
          if (!this.isConnected) return;
          const nodeToInsert = this.parseNodeFromString(htmlString);
          this.insertNode(nodeToInsert, direction);
          this.announceBatch(nodeToInsert, direction);
        }
      });
    }, {
      rootMargin: `0px 0px ${this.margin}px 0px` // Trigger `margin` px (300 by default) before bottom sentinel visible
    });

    observer.observe(this.querySelector(`.${direction}`));
  }

  insertElemTo(place) {
    const elem = document.createElement('div');
    elem.classList.add(place);
    elem.style.display = 'block';
    place === this.top ? this.prepend(elem) : this.append(elem);
  }

  async fetchPage(direction) {
    const pageToLoad =
      direction === this.bottom ? this.page + 1 : this.page - 1;
    const response = await fetch(
      this.baseUrl + pageToLoad + '&section_id=' + this.sectionId,
    );
    const html = await response.text();
    return html;
  }

  insertNode(node, direction) {
    if (direction === this.bottom) {
      if (this.dataset.bouton) {
        // La nouvelle page collection : posée seulement quand on regarde les tableaux, plus bas (watchEnd).
        this.placeAfter(node);
      } else if (this.isFooterVisibleOrNear()) {
        // Check if footer is visible or near - if so, preserve scroll position
        this.keepSameScrollPositionBottom(node);
      } else {
        this.after(node);
      }
    } else {
      this.keepSameScrollPosition(node);
    }

    if (window.removeSkeletonOnImagesLoad) {
      window.removeSkeletonOnImagesLoad(node);
    }

    // Les <script> d'une page reçue par fetch ne s'exécutent pas. Le reflet des vignettes de poster
    // (assets/oeuvre-card-reflet.js) arrive en module avec ses cartes : l'importer le lance si la page n'en
    // avait pas encore. Un module ne s'exécute qu'une fois par page ; déjà lancé, il suit seul les cartes.
    node.querySelectorAll('script[type="module"][src]').forEach((script) => import(script.src));
  }

  /* Le lot arrivé, annoncé sur document : mma:collection-lot, { cards, direction }, son nombre de cartes et où il s'est
     posé ('down' : après, en descendant ; 'up' : avant, en remontant). Annoncé à l'image suivante, quand un lot du haut
     est posé lui aussi (keepSameScrollPosition). La nouvelle page collection en tient son compte (<collection-suite>,
     plus bas) ; ailleurs, personne ne l'écoute. */
  announceBatch(node, direction) {
    const cards = node?.querySelector('ul')?.childElementCount ?? 0;
    const detail = { cards, direction: direction === this.bottom ? 'down' : 'up' };
    requestAnimationFrame(() => {
      document.dispatchEvent(new CustomEvent('mma:collection-lot', { detail }));
    });
  }

  /* Un lot posé au-dessus (on remonte depuis ?page=N) : la page descend d'autant, pour garder la vue. Ce saut
     s'annonce juste avant, sur document (mma:saut-voulu) : sur la nouvelle page collection, l'en-tête qui suit le doigt
     (assets/tw-header.js, ticket 07) ne le prend pas pour un geste ; ailleurs, personne ne l'écoute. */
  keepSameScrollPosition(node) {
    const scrollPosition = window.scrollY;
    requestAnimationFrame(() => {
      document.dispatchEvent(new CustomEvent('mma:saut-voulu', { detail: { entete: 'reste' } }));
      this.before(node);
      const heightNode = node.getBoundingClientRect().height;
      window.scrollTo(0, scrollPosition + heightNode);
    });
  }

  isFooterVisibleOrNear() {
    const footer = document.querySelector('footer.footer');
    if (!footer) return false;

    const footerRect = footer.getBoundingClientRect();

    // Use visual viewport for better iOS compatibility
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // Calculate how much of the footer is visible in the viewport
    const footerHeight = footerRect.height;
    const footerVisibleTop = Math.max(0, footerRect.top);
    const footerVisibleBottom = Math.min(viewportHeight, footerRect.bottom);
    const footerVisibleHeight = Math.max(0, footerVisibleBottom - footerVisibleTop);
    const footerVisiblePercentage = (footerVisibleHeight / footerHeight) * 100;

    // Only preserve scroll if MORE than 25% of footer is visible in viewport
    if (footerVisiblePercentage > 25) {
      return true;
    }

    return false;
  }

  keepSameScrollPositionBottom(node) {
    const footer = document.querySelector('footer.footer');
    if (!footer || !node) {
      // Fallback to normal insertion if footer or node not found
      if (node) this.after(node);
      return;
    }

    // Get footer's current position relative to the viewport BEFORE insertion
    const footerTopBefore = footer.getBoundingClientRect().top;
    const scrollBefore = window.scrollY || document.documentElement.scrollTop;

    // Store scroll behavior and disable smooth scrolling temporarily
    const originalBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    // Insert the node
    this.after(node);

    // Force layout calculation to get accurate heights
    const nodeHeight = node.getBoundingClientRect().height;

    // Calculate where the footer should be kept
    const targetFooterTop = footerTopBefore;

    // Use requestAnimationFrame to adjust scroll after insertion
    requestAnimationFrame(() => {
      const footerTopAfter = footer.getBoundingClientRect().top;
      const scrollAfter = window.scrollY || document.documentElement.scrollTop;

      // Calculate how much to scroll to keep footer at same viewport position
      const scrollAdjustment = footerTopAfter - targetFooterTop;

      if (Math.abs(scrollAdjustment) > 1) {
        const targetScroll = scrollAfter + scrollAdjustment;
        window.scrollTo(0, targetScroll);
        document.documentElement.scrollTop = targetScroll;
        document.body.scrollTop = targetScroll;
      }

      if (Math.abs(scrollAdjustment) > 1) {
        const targetScroll = scrollAfter + scrollAdjustment;
        window.scrollTo(0, targetScroll);
        document.documentElement.scrollTop = targetScroll;
        document.body.scrollTop = targetScroll;
      }

      // Restore original scroll behavior
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = originalBehavior;
      }, 0);
    });
  }

  createCurrentPageObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            history.replaceState(null, null, this.baseUrl + this.page);
            this.activePaginateLinkToLastPageVisited();
            this.disablePaginateLinkToCurrentPage();
            this.addCurrentPageToPagination();
          }
        });
      },
      { rootMargin: '-50% 0px' },
    );

    observer.observe(this);
  }

  parseNodeFromString(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const node = doc.querySelector('infinite-scroll');
    return node;
  }

  activePaginateLinkToLastPageVisited() {
    const obsoleteLink = this.paginationNavbar.querySelector(
      'a[aria-disabled="true"]',
    );
    if (obsoleteLink) {
      obsoleteLink.removeAttribute('aria-disabled');
      obsoleteLink.removeAttribute('aria-current');
      obsoleteLink.classList.replace('bg-main-10', 'hover:bg-main-10');
      obsoleteLink.href = this.baseUrl + obsoleteLink.textContent;
    }

    const previousArrow = document.querySelector(
      'nav.pagination .previous-arrow',
    );
    const previousArrowRemoved = this.removePaginateArrow(
      previousArrow,
      this.isFirstPage,
    );
    const previousArrowCreated = this.createPaginateArrow(
      !previousArrowRemoved && !previousArrow && !this.isFirstPage,
      this.page - 1,
      true,
    );
    this.changePaginateArrow(
      !previousArrowRemoved && !previousArrowCreated && previousArrow,
      previousArrow,
      this.page - 1,
    );

    const nextArrow = document.querySelector('nav.pagination .next-arrow');
    const nextArrowRemoved = this.removePaginateArrow(
      nextArrow,
      this.isLastPage,
    );
    const nextArrowCreated = this.createPaginateArrow(
      !nextArrowRemoved && !nextArrow && !this.isLastPage,
      this.page + 1,
      false,
    );
    this.changePaginateArrow(
      !nextArrowRemoved && !nextArrowCreated && nextArrow,
      nextArrow,
      this.page + 1,
    );
  }

  removePaginateArrow(arrowNode, toRemove) {
    if (!arrowNode || !toRemove) return;
    arrowNode.parentNode.remove();
    return true;
  }

  createPaginateArrow(toCreate, page, atFirst) {
    if (!toCreate) return;
    const template = document.getElementById('pagination-arrow');
    const paginationArrow = template.content.cloneNode(true);
    const a = paginationArrow.querySelector('a');
    a.href = this.baseUrl + page;

    if (atFirst) {
      const label = template.dataset.prevLabel;
      a.setAttribute('aria-label', label);
      a.classList.add('previous-arrow');
      a.firstElementChild.classList.add('rotate-90');
    } else {
      const label = template.dataset.nextLabel;
      a.setAttribute('aria-label', label);
      a.classList.add('next-arrow');
      a.firstElementChild.classList.add('-rotate-90');
    }
    const ul = this.paginationNavbar.querySelector('ul');
    if (atFirst) ul.prepend(paginationArrow);
    else ul.appendChild(paginationArrow);
    return true;
  }

  changePaginateArrow(toChange, arrowNode, page) {
    if (!toChange) return;
    arrowNode.href = this.baseUrl + page;
  }

  disablePaginateLinkToCurrentPage() {
    const currentLink = this.paginationNavbar.querySelector(
      `a[aria-label="Page ${this.page}"]`,
    );
    if (!currentLink) return;
    currentLink.setAttribute('aria-disabled', 'true');
    currentLink.setAttribute('aria-current', 'page');
    currentLink.classList.replace('hover:bg-main-10', 'bg-main-10');
    currentLink.removeAttribute('href');
  }

  addCurrentPageToPagination() {
    // Rebuild pagination following the custom pattern
    const template = document.getElementById('pagination-number');
    const ul = this.paginationNavbar.querySelector('ul');

    // Remove all existing page number items (keep arrows)
    const existingItems = ul.querySelectorAll('li');
    existingItems.forEach(li => {
      if (!li.querySelector('.previous-arrow') && !li.querySelector('.next-arrow')) {
        li.remove();
      }
    });

    // Get reference points
    const prevArrow = ul.querySelector('.previous-arrow')?.parentElement;
    const nextArrow = ul.querySelector('.next-arrow')?.parentElement;
    const insertPoint = nextArrow || ul;
    const insertBefore = nextArrow ? true : false;

    // Helper to create page number li
    const createPageLi = (pageNum, isCurrent = false) => {
      const clone = template.content.cloneNode(true);
      const a = clone.querySelector('a');
      a.href = this.baseUrl + pageNum;
      a.textContent = pageNum;
      a.ariaLabel = a.ariaLabel.replace('#', pageNum);

      if (isCurrent) {
        a.setAttribute('role', 'link');
        a.setAttribute('aria-disabled', 'true');
        a.setAttribute('aria-current', 'page');
        a.classList.remove('hover:bg-main-10');
        a.classList.add('bg-main-10');
        a.removeAttribute('href');
      }

      return clone;
    };

    // Helper to create ellipsis li
    const createEllipsis = () => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'etc';
      span.textContent = '…';
      li.appendChild(span);
      return li;
    };

    // Helper to insert at correct position
    const insertLi = (element) => {
      if (insertBefore) {
        insertPoint.before(element);
      } else {
        insertPoint.appendChild(element);
      }
    };

    const current = this.page;
    const total = this.pages;
    const pages = [];

    // Build page array following the pattern
    if (current <= 2) {
      // Pages 1-2: show 1 2 3 ... last
      pages.push(1);
      if (total >= 2) pages.push(2);
      if (total >= 3) pages.push(3);
      if (total > 4) pages.push('...');
      if (total > 3) pages.push(total);
    } else if (current === 3) {
      // Page 3: show 1 2 3 4 ... last
      pages.push(1, 2, 3);
      if (total >= 4) pages.push(4);
      if (total > 5) pages.push('...');
      if (total > 4) pages.push(total);
    } else if (current === total) {
      // Last page: show 1 ... last-2 last-1 last
      pages.push(1);
      if (total > 4) pages.push('...');
      for (let i = Math.max(2, total - 2); i <= total; i++) {
        pages.push(i);
      }
    } else if (current === total - 1) {
      // Second to last: show 1 ... last-2 last-1 last
      pages.push(1);
      if (total > 4) pages.push('...');
      for (let i = Math.max(2, total - 2); i <= total; i++) {
        pages.push(i);
      }
    } else if (current === total - 2) {
      // Third to last: show 1 ... last-3 last-2 last-1 last
      pages.push(1);
      if (current > 4) pages.push('...');
      for (let i = Math.max(2, total - 3); i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Middle pages: show 1 ... current-1 current current+1 ... last
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }

    // Insert pages
    pages.forEach(page => {
      if (page === '...') {
        insertLi(createEllipsis());
      } else {
        insertLi(createPageLi(page, page === current));
      }
    });
  }
}
customElements.define('infinite-scroll', InfiniteScroll);

/* La suite par lots de la nouvelle page collection (sections/collection-grille.liquid, ticket 05 de
   .scratch/collection-design) : au bout du dernier lot, « 48 tableaux sur 327 » et une jauge, puis « Vous avez vu les
   327 tableaux. ». Le serveur l'écrit pour la page demandée, dans sa langue ; chaque lot arrivé en bas
   (mma:collection-lot, <infinite-scroll>) l'avance de ses cartes : le script ne change que le nombre, la jauge et ce
   qui se montre. La zone parlée de la grille (data-statut : son id) le dit aux lecteurs d'écran. Un lot posé en haut
   (arrivé sur ?page=3, on remonte) ne change rien : le compte est le rang du dernier tableau montré.
   Tests : scripts/collection-grille.test.cjs. */
class CollectionSuite extends HTMLElement {
  connectedCallback() {
    this.seen = Number(this.dataset.vus) || 0;
    this.total = Number(this.dataset.total) || 0;
    this.onBatch = (event) => this.advance(event.detail);
    document.addEventListener('mma:collection-lot', this.onBatch);
  }

  disconnectedCallback() {
    document.removeEventListener('mma:collection-lot', this.onBatch);
  }

  advance(batch) {
    if (!batch || batch.direction !== 'down' || !batch.cards) return;
    this.seen = Math.min(this.total, this.seen + batch.cards);
    const end = this.seen >= this.total;
    const seenNumber = this.querySelector('[data-vus]');
    const countLine = this.querySelector('.refonte-suite-compte');
    const gauge = this.querySelector('progress');
    const endLine = this.querySelector('.refonte-suite-fin');
    if (seenNumber) seenNumber.textContent = String(this.seen);
    if (gauge) {
      gauge.value = this.seen;
      gauge.hidden = end;
    }
    if (countLine) countLine.hidden = end;
    if (endLine) endLine.hidden = !end;
    // Ce qui se lit maintenant, dit aussi aux lecteurs d'écran.
    const status = document.getElementById(this.dataset.statut);
    const shownLine = end ? endLine : countLine;
    if (status && shownLine) status.textContent = shownLine.textContent.replace(/\s+/g, ' ').trim();
  }
}
customElements.define('collection-suite', CollectionSuite);

class ClickProduct extends HTMLElement {
  connectedCallback() {
    this.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const link = this.closest('li').querySelector('a');
        link.click();
      }
    });
  }
}
customElements.define('click-product', ClickProduct);

class animeProductCard extends HTMLElement {
  constructor() {
    super();
    this.li = this.querySelector('li');
    this.secondImage = this.querySelector('img+img');
    this.buttonSpans = this.querySelectorAll('click-product button span');
  }

  connectedCallback() {
    const options = {
      root: document.root,
      rootMargin: '0px',
      threshold: [0, 1],
    };
    const observer = new IntersectionObserver(this.animate.bind(this), options);
    observer.observe(this.li);
  }

  animate(entries) {
    if (entries[0].intersectionRatio === 1) {
      if(window.innerWidth > 639) return;
      this.revealImage();
      this.showButtonBorder();
    } else if (!entries[0].isIntersecting) {
      if(window.innerWidth > 639) return;
      this.hideImage();
      this.hideButtonBorder();
    }
  }

  revealImage() {
    if (!this.secondImage) return;
    this.secondImage.classList.add('opacity-100');
  }

  hideImage() {
    if (!this.secondImage) return;
    this.secondImage.classList.remove('opacity-100');
  }

  showButtonBorder() {
    this.buttonSpans.forEach((span) => {
      span.classList.add('delay-200')
      if (span.classList.contains('group-hover:w-full'))
        span.classList.replace('w-0', 'w-full');
      else span.classList.replace('h-0', 'h-full');
    });
  }

  hideButtonBorder() {
    this.buttonSpans.forEach((span) => {
      span.classList.remove('delay-200')
      if (span.classList.contains('group-hover:w-full'))
        span.classList.replace('w-full', 'w-0');
      else span.classList.replace('h-full', 'h-0');
    });
  }
}
customElements.define('anime-product-card', animeProductCard);

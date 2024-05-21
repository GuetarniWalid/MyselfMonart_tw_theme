class InfiniteScrollStrorage extends HTMLElement {
  constructor() {
    super();
    const urlParams = new URLSearchParams(window.location.search);
    this.page = urlParams.get('page') ?? this.dataset.page;
    this.url = location.pathname;
  }

  connectedCallback() {
    window.addEventListener('beforeunload', (e) => {
      this.saveInnerHTML();
      if (
        e.target.activeElement.tagName === 'A' &&
        e.target.activeElement.hostname === location.hostname &&
        e.target.activeElement.href.includes('/products/')
      ) {
        sessionStorage.setItem(
          this.createSessionKey('scroll-to-node-id'),
          e.target.activeElement.closest('li').id,
        );
      }
    });

    window.addEventListener('load', () => {
      const html = sessionStorage.getItem(this.createSessionKey('html'));
      if (!html) return;
      const { elemToViewId, elemToViewPosition } =
        this.constructInnerHtml(html);

      const elemToView = document.getElementById(elemToViewId);
      elemToView?.scrollIntoView({ block: elemToViewPosition });
    });
  }

  createSessionKey(name) {
    return `infinite-scroll-storage-${this.url}-${name}`;
  }

  constructInnerHtml(html) {
    const currentInfiniteScroll = this.firstElementChild;
    const currentPage = currentInfiniteScroll.dataset.page;
    let elemToViewId = sessionStorage.getItem(
      this.createSessionKey('scroll-to-node-id'),
    );
    let elemToViewPosition = 'center';
    sessionStorage.removeItem(this.createSessionKey('scroll-to-node-id'));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newInfiniteScrolls = Array.from(
      doc.querySelectorAll('infinite-scroll'),
    );

    const isCurrentPagePresent =
      newInfiniteScrolls.findIndex(
        (infiniteScroll) => infiniteScroll.dataset.page === currentPage,
      ) >= 0;

    if (!isCurrentPagePresent) {
      elemToViewId = currentInfiniteScroll.id;
      elemToViewPosition = 'start';
      newInfiniteScrolls.splice(currentPage - 1, 0, currentInfiniteScroll);
      this.innerHTML = newInfiniteScrolls
        .map((infiniteScroll) => infiniteScroll.outerHTML)
        .join('');
    } else {
      elemToViewPosition = elemToViewId ? 'center' : 'start';
      elemToViewId = elemToViewId ?? currentInfiniteScroll.id;
      this.innerHTML = html;
    }

    return { elemToViewId, elemToViewPosition };
  }

  saveInnerHTML() {
    const clone = this.cloneNode(true);
    clone.querySelectorAll('button.liked').forEach((buttonLiked) => {
      buttonLiked.classList.remove('liked');
    });
    sessionStorage.setItem(this.createSessionKey('html'), clone.innerHTML);
  }
}
customElements.define('infinite-scroll-storage', InfiniteScrollStrorage);

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
    this.baseUrl = location.pathname + '?page=';
    this.sectionId = this.dataset.sectionId;
    this.previousPageExists =
      Number(this.previousElementSibling?.dataset?.page) === this.page - 1;
    this.nextPageExists =
      Number(this.nextElementSibling?.dataset?.page) === this.page + 1;
    this.paginationNavbar = document.querySelector('nav.pagination');
  }

  connectedCallback() {
    this.outlineEdges();
    if (!this.isLastPage && !this.nextPageExists)
      this.createFetcherObserver(this.bottom);
    if (!this.isFirstPage && !this.previousPageExists)
      this.createFetcherObserver(this.top);
    this.createCurrentPageObserver();
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
          const nodeToInsert = this.parseNodeFromString(htmlString);
          this.insertNode(nodeToInsert, direction);
        }
      });
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
    direction === this.bottom
      ? this.after(node)
      : this.keepSameScrollPosition(node);
  }

  keepSameScrollPosition(node) {
    const scrollPosition = window.scrollY;
    requestAnimationFrame(() => {
      this.before(node);
      const heightNode = node.getBoundingClientRect().height;
      window.scrollTo(0, scrollPosition + heightNode);
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
    const template = document.getElementById('pagination-number');
    const paginationNumber = template.content.cloneNode(true);
    const liWithLink = paginationNumber.querySelector('li');
    const a = paginationNumber.querySelector('a');
    a.href = this.baseUrl + this.page;
    a.textContent = this.page;
    a.ariaLabel = a.ariaLabel.replace('#', this.page);
    const etcElem = this.paginationNavbar.querySelector('.etc')?.parentElement.cloneNode(true);
    const lis = this.paginationNavbar.querySelectorAll('ul li');

    for (const li of lis) {
      const liNumber = Number(li.textContent);
      if (this.page === liNumber) return;
      else if (!liNumber) continue;
      else if (this.page + 1 <= liNumber) {
        li.before(liWithLink);
        break;
      }
    }

    this.paginationNavbar.querySelectorAll('.etc').forEach((span) => {
      const prevLiNumber = Number(
        span.parentElement.previousElementSibling.textContent,
      );
      const nextLiNumber = Number(
        span.parentElement.nextElementSibling.textContent,
      );
      if (prevLiNumber + 1 === nextLiNumber) span.parentElement.remove();
    });

    this.paginationNavbar.querySelectorAll('ul li').forEach((li) => {
      const liNumber = Number(li.textContent);
      const nextliNumber = Number(li.nextElementSibling?.textContent);
      if (!liNumber || !nextliNumber || isNaN(liNumber) || isNaN(nextliNumber))
        return;
      if (liNumber + 1 !== nextliNumber) li.after(etcElem);
    });
  }
}
customElements.define('infinite-scroll', InfiniteScroll);

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

class MyLikeButton extends HTMLElement {
  connectedCallback() {
    const { likedLisHtml } = this.getLisStorage();
    likedLisHtml.forEach((likedLi) => {
      const id = likedLi.id;
      const liToLiked = document.getElementById(id);
      liToLiked?.querySelector('button.like').classList.add('bg-like');
    });

    this.addEventListener('click', () => {
      const likeButton = this.firstElementChild;
      const isLiked = likeButton.classList.contains('bg-like');
      likeButton.classList.toggle('bg-like', !isLiked);
      const liParent = this.closest('li');

      const { likedLisHtml, likedLisString } = this.getLisStorage();
      if (isLiked) {
        this.deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent);
      } else {
        this.saveLiInLocalStorage(likedLisHtml, likedLisString, liParent);
      }

      this.deleteLiInLikedPage(likedLisString.length === 0);
    });
  }

  getLisStorage() {
    const likedLis = localStorage.getItem('likedLis');
    const likedLisString = likedLis ? JSON.parse(likedLis) : [];
    const likedLisHtml = likedLisString.map((likedLi) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(likedLi, 'text/html');
      const li = doc.body.firstChild;
      return li;
    });
    return { likedLisHtml, likedLisString };
  }

  saveLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    likedLisString.push(liParent.outerHTML);
    likedLisHtml.push(liParent);
    localStorage.setItem('likedLis', JSON.stringify(likedLisString));
  }

  deleteLiInLocalStorage(likedLisHtml, likedLisString, liParent) {
    const index = likedLisHtml.findIndex(
      (likedLi) => likedLi.id === liParent.id,
    );
    likedLisString.splice(index, 1);
    likedLisHtml.splice(index, 1);
    localStorage.setItem('likedLis', JSON.stringify(likedLisString));
  }

  deleteLiInLikedPage(isLastLi) {
    const myLikesComponent = document.querySelector('my-likes');
    if (!myLikesComponent) return;
    this.closest('li').remove();
    if (isLastLi) myLikesComponent.showEmptyMessage();
  }
}
customElements.define('my-like-button', MyLikeButton);

class MyLikesButton extends HTMLElement {
  connectedCallback() {
    const likedLis = this.getLisStorage();
    if (likedLis.length > 0) {
      this.colorButton();
    }
  }

  getLisStorage() {
    const likedLis = localStorage.getItem('likedLis');
    return likedLis ? JSON.parse(likedLis) : [];
  }

  colorButton() {
    this.querySelector('.likes').classList.add('liked');
  }
}
customElements.define('my-likes-button', MyLikesButton);

class DropdownButton extends HTMLElement {
  constructor() {
    super();
    this.collectionDescription = document.querySelector(
      '.collection-description',
    );
    this.showButton = this.firstElementChild;
    this.hideButton = this.lastElementChild;
  }

  connectedCallback() {
    this.showButton.addEventListener('click', () => {
      this.collectionDescription.classList.remove('h-56');
      this.collectionDescription.classList.remove('after:bg-gradient-to-t');
      this.showButton.classList.add('hidden');
      this.hideButton.classList.remove('hidden');
    });

    this.hideButton.addEventListener('click', () => {
      this.collectionDescription.classList.add('h-56');
      this.collectionDescription.classList.add('after:bg-gradient-to-t');
      this.showButton.classList.remove('hidden');
      this.hideButton.classList.add('hidden');
    });
  }
}
customElements.define('dropdown-button', DropdownButton);

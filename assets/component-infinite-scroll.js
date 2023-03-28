class InfiniteScrollStrorage extends HTMLElement {
  constructor() {
    super();
    const urlParams = new URLSearchParams(window.location.search);
    this.page = urlParams.get('page') ?? this.dataset.page;
    this.url = location.pathname;
  }

  connectedCallback() {
    window.addEventListener('beforeunload', e => {
      sessionStorage.setItem(this.createSessionKey('html'), this.innerHTML);
      if (e.target.activeElement.tagName === 'A' && e.target.activeElement.hostname === location.hostname && e.target.activeElement.href.includes('/products/')) {
        sessionStorage.setItem(this.createSessionKey('scroll-to-node-id'), e.target.activeElement.closest('li').id);
      }
    });

    window.addEventListener('load', () => {
      const html = sessionStorage.getItem(this.createSessionKey('html'));
      if (!html) return;
      const { elemToViewId, elemToViewPosition } = this.constructInnerHtml(html);

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
    let elemToViewId = sessionStorage.getItem(this.createSessionKey('scroll-to-node-id'));
    let elemToViewPosition = 'center';
    sessionStorage.removeItem(this.createSessionKey('scroll-to-node-id'));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newInfiniteScrolls = Array.from(doc.querySelectorAll('infinite-scroll'));

    const isCurrentPagePresent = newInfiniteScrolls.findIndex(infiniteScroll => infiniteScroll.dataset.page === currentPage) >= 0;

    if (!isCurrentPagePresent) {
      elemToViewId = currentInfiniteScroll.id;
      elemToViewPosition = 'start';
      newInfiniteScrolls.splice(currentPage - 1, 0, currentInfiniteScroll);
      this.innerHTML = newInfiniteScrolls.map(infiniteScroll => infiniteScroll.outerHTML).join('');
    } else {
      elemToViewPosition = elemToViewId ? 'center' : 'start';
      elemToViewId = elemToViewId ?? currentInfiniteScroll.id;
      this.innerHTML = html;
    }

    return { elemToViewId, elemToViewPosition };
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
    this.previousPageExists = Number(this.previousElementSibling?.dataset?.page) === this.page - 1;
    this.nextPageExists = Number(this.nextElementSibling?.dataset?.page) === this.page + 1;
    this.paginationNavbar = document.querySelector('nav.pagination');
  }

  connectedCallback() {
    this.outlineEdges();
    if (!this.isLastPage && !this.nextPageExists) this.createFetcherObserver(this.bottom);
    if (!this.isFirstPage && !this.previousPageExists) this.createFetcherObserver(this.top);
    this.createCurrentPageObserver();
  }

  outlineEdges() {
    !this.isFirstPage && this.firstElementChild.className !== this.top && this.insertElemTo(this.top);
    !this.isLastPage && this.lastElementChild.className !== this.bottom && this.insertElemTo(this.bottom);
  }

  createFetcherObserver(direction) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(async entry => {
        if (entry.isIntersecting && entry.target.classList.contains(direction)) {
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
    const pageToLoad = direction === this.bottom ? this.page + 1 : this.page - 1;
    const response = await fetch(this.baseUrl + pageToLoad + '&section_id=' + this.sectionId);
    const html = await response.text();
    return html;
  }

  insertNode(node, direction) {
    direction === this.bottom ? this.after(node) : this.keepSameScrollPosition(node);
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
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            history.replaceState(null, null, this.baseUrl + this.page);
            this.activePaginateLinkToLastPageVisited();
            this.disablePaginateLinkToCurrentPage();
          }
        });
      },
      { rootMargin: '-50% 0px' }
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
    const obsoleteLink = this.paginationNavbar.querySelector('a[aria-disabled="true"]');
    obsoleteLink.removeAttribute('aria-disabled');
    obsoleteLink.removeAttribute('aria-current');
    obsoleteLink.removeAttribute('role');
    obsoleteLink.classList.remove('pagination__item--current', 'light');
    obsoleteLink.classList.add('link');
    obsoleteLink.href = this.baseUrl + obsoleteLink.textContent;
  }

  disablePaginateLinkToCurrentPage() {
    const currentLink = this.paginationNavbar.querySelector(`a[aria-label="Page ${this.page}"]`);
    currentLink.setAttribute('aria-disabled', 'true');
    currentLink.setAttribute('aria-current', 'page');
    currentLink.setAttribute('role', 'link');
    currentLink.classList.add('pagination__item--current', 'light');
    currentLink.classList.remove('link');
    currentLink.removeAttribute('href');
  }
}
customElements.define('infinite-scroll', InfiniteScroll);

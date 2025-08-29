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
    const etcElem = this.paginationNavbar
      .querySelector('.etc')
      ?.parentElement.cloneNode(true);
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

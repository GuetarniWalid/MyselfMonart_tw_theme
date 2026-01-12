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
    }, {
      rootMargin: '0px 0px 300px 0px' // Trigger 300px before bottom sentinel visible
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
      // Check if footer is visible or near - if so, preserve scroll position
      if (this.isFooterVisibleOrNear()) {
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
  }

  keepSameScrollPosition(node) {
    const scrollPosition = window.scrollY;
    requestAnimationFrame(() => {
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

class CollectionTagFilter extends HTMLElement {
  constructor() {
    super();
    this.filterCheckboxes = []; // All filter checkboxes
    this.clearButtons = []; // Clear all filters buttons
    this.productGrid = null;
    this.sectionId = null;
    this.collectionUrl = null;
  }

  connectedCallback() {
    // Find the product grid section (either infinite-scroll or ul.product-grid)
    this.productGrid = document.querySelector('infinite-scroll[data-section-id]') ||
                       document.querySelector('ul.product-grid[data-id]');
    if (!this.productGrid) return;

    // Get section ID from either data-section-id or data-id attribute
    this.sectionId = this.productGrid.dataset.sectionId || this.productGrid.dataset.id;

    // Build collection URL - handles both /collections/handle and /en/collections/handle
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    const collectionsIndex = pathParts.indexOf('collections');

    if (collectionsIndex !== -1 && pathParts.length > collectionsIndex + 1) {
      // Take all parts up to and including the collection handle
      // e.g., ['en', 'collections', 'paintings'] -> '/en/collections/paintings'
      // or ['collections', 'paintings'] -> '/collections/paintings'
      this.collectionUrl = '/' + pathParts.slice(0, collectionsIndex + 2).join('/');
    } else {
      // Fallback: use the full pathname without query string
      this.collectionUrl = window.location.pathname.split('?')[0];
    }

    // Find ALL filter checkboxes that have data-filter-param attribute
    this.filterCheckboxes = Array.from(document.querySelectorAll('input[data-filter-param]'));

    // Find all clear filter buttons
    this.clearButtons = Array.from(document.querySelectorAll('.clear-filters'));

    // Bind change event to all checkboxes
    this.filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.syncCheckboxes(e.target);
        this.applyFilters();
      });
    });

    // Bind click event to all clear buttons
    this.clearButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.clearAllFilters();
      });
    });

    // Initialize checkboxes based on current URL (for page refresh or direct URL access)
    this.initializeCheckboxesFromURL();

    // Update clear button visibility based on initial state
    this.updateClearButtonVisibility();
  }

  async applyFilters() {
    // Group checked checkboxes by their filter parameter
    const filtersByParam = new Map();

    this.filterCheckboxes
      .filter(cb => cb.checked)
      .forEach(cb => {
        const param = cb.dataset.filterParam;
        if (!filtersByParam.has(param)) {
          filtersByParam.set(param, []);
        }
        filtersByParam.get(param).push(cb.value);
      });

    // Build filter URL using Storefront Filtering API (OR logic)
    let filterUrl;
    if (filtersByParam.size === 0) {
      // No filters - show all products
      filterUrl = this.collectionUrl;
    } else {
      // Build URL with all active filters
      const params = new URLSearchParams();

      filtersByParam.forEach((values, param) => {
        // Remove duplicates and add each value to the params
        [...new Set(values)].forEach(value => {
          params.append(param, value);
        });
      });

      filterUrl = `${this.collectionUrl}?${params.toString()}`;
    }

    // Fetch filtered products
    try {
      // Fetch section HTML (for product grid and desktop sidebar)
      const separator = filterUrl.includes('?') ? '&' : '?';
      const sectionUrl = `${filterUrl}${separator}section_id=${this.sectionId}`;
      const sectionResponse = await fetch(sectionUrl);
      const sectionHtml = await sectionResponse.text();

      // Fetch full page HTML (for mobile filter drawer)
      const pageResponse = await fetch(filterUrl);
      const pageHtml = await pageResponse.text();

      // Parse and replace the product grid and filters
      this.replaceProductGrid(sectionHtml, pageHtml, filterUrl);

      // Update clear button visibility
      this.updateClearButtonVisibility();
    } catch (error) {
      console.error('Filter error:', error);
    }
  }

  updateFilterCounts(html) {
    try {
      // Parse the HTML to extract filter count data
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Find the JSON data with filter counts
      const filterDataScript = doc.querySelector('[data-filter-counts]');
      if (!filterDataScript) return;

      const filterData = JSON.parse(filterDataScript.textContent);

      // Update counts for each filter dynamically
      Object.keys(filterData).forEach(filterKey => {
        const filterValues = filterData[filterKey];
        if (filterValues && filterValues.length > 0) {
          this.updateCheckboxCountsFromData(filterValues, this.filterCheckboxes);
        }
      });
    } catch (error) {
      console.error('Error updating filter counts:', error);
    }
  }

  updateCheckboxCountsFromData(filterValues, checkboxArray) {
    // Create a map of value -> full label with count
    const countMap = new Map();
    filterValues.forEach(item => {
      const labelWithCount = `${item.label} (${item.count})`;
      countMap.set(item.value, labelWithCount);
    });

    // Update all existing checkboxes with the new counts
    checkboxArray.forEach(checkbox => {
      const newLabel = countMap.get(checkbox.value);
      // The label is the next sibling of the checkbox wrapper div
      const labelElement = checkbox.parentElement?.nextElementSibling;
      if (newLabel && labelElement && labelElement.tagName === 'LABEL') {
        labelElement.textContent = newLabel;
      }
    });
  }

  handleize(str) {
    // Convert to lowercase and replace spaces/special chars with hyphens (same as Shopify's handleize filter)
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
  }

  initializeCheckboxesFromURL() {
    // Parse current URL to check appropriate checkboxes on page load
    const urlParams = new URLSearchParams(window.location.search);

    // Check each checkbox if its value is in the URL for its filter parameter
    this.filterCheckboxes.forEach(checkbox => {
      const param = checkbox.dataset.filterParam;
      const valuesInUrl = urlParams.getAll(param);

      if (valuesInUrl.includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });
  }

  replaceProductGrid(sectionHtml, pageHtml, filterUrl) {
    // Parse both HTMLs
    const parser = new DOMParser();
    const sectionDoc = parser.parseFromString(sectionHtml, 'text/html');
    const pageDoc = parser.parseFromString(pageHtml, 'text/html');

    // Try to find infinite-scroll (with pagination) or ul.product-grid (without pagination)
    const newGrid = sectionDoc.querySelector('infinite-scroll') || sectionDoc.querySelector('ul.product-grid');
    const newPagination = sectionDoc.querySelector('nav.pagination');
    if (!newGrid) {
      console.error('Could not find product grid in fetched HTML');
      return;
    }

    // Find ALL current grid elements (infinite scroll creates multiple elements for multiple pages)
    const allCurrentGrids = document.querySelectorAll('infinite-scroll, ul.product-grid');
    if (allCurrentGrids.length === 0) return;

    // Update browser URL BEFORE replacing grid (so new infinite-scroll reads correct URL)
    history.pushState({ filtered: true }, '', filterUrl);

    // Remove all extra grids from infinite scroll (keep only the first one)
    allCurrentGrids.forEach((grid, index) => {
      if (index > 0) {
        grid.remove();
      }
    });

    // Replace or remove pagination navbar
    const currentPagination = document.querySelector('nav.pagination');
    if (newPagination) {
      if (currentPagination) {
        currentPagination.replaceWith(newPagination.cloneNode(true));
      } else {
        // Pagination didn't exist before but exists now
        const firstGrid = allCurrentGrids[0];
        if (firstGrid) firstGrid.after(newPagination.cloneNode(true));
      }
    } else if (currentPagination) {
      // No pagination in new results - remove old one
      currentPagination.remove();
    }

    // Replace the first grid with new content
    // Use outerHTML to force proper re-initialization of the custom element
    const firstGrid = allCurrentGrids[0];
    const newGridHTML = newGrid.outerHTML;
    firstGrid.outerHTML = newGridHTML;

    // Get reference to the newly inserted grid
    const insertedGrid = document.querySelector('infinite-scroll') || document.querySelector('ul.product-grid');

    // Re-initialize animations if needed
    if (window.removeSkeletonOnImagesLoad && insertedGrid) {
      window.removeSkeletonOnImagesLoad(insertedGrid);
    }

    // Replace filter sections with updated counts (from both section and page HTML)
    this.replaceFilterSections(sectionDoc, pageDoc);

    // Scroll to top of page to show filtered results from the beginning
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  replaceFilterSections(sectionDoc, pageDoc) {
    // Get currently checked filters to preserve their state
    const checkedFilters = new Set();
    this.filterCheckboxes.forEach(cb => {
      if (cb.checked) {
        checkedFilters.add(`${cb.dataset.filterParam}:${cb.value}`);
      }
    });

    // Capture the open/close state of all details elements BEFORE replacement
    const desktopDetailsState = this.captureDetailsState(document.querySelector('aside[aria-label]'));
    const mobileDetailsState = this.captureDetailsState(document.querySelector('filter-drawer'));

    // Replace desktop filter sidebar (from section HTML)
    const newSidebar = sectionDoc.querySelector('aside[aria-label]');
    const currentSidebar = document.querySelector('aside[aria-label]');
    if (newSidebar && currentSidebar) {
      currentSidebar.innerHTML = newSidebar.innerHTML;
      // Restore the open/close state for desktop
      this.restoreDetailsState(currentSidebar, desktopDetailsState);
    }

    // Replace mobile filter drawer content (from page HTML)
    const newDrawer = pageDoc.querySelector('filter-drawer');
    const currentDrawer = document.querySelector('filter-drawer');
    if (newDrawer && currentDrawer) {
      // Get the new content (everything except the outer filter-drawer tag)
      currentDrawer.innerHTML = newDrawer.innerHTML;
      // Restore the open/close state for mobile
      this.restoreDetailsState(currentDrawer, mobileDetailsState);

      // Re-attach close button listener (since the button was replaced)
      const newCloseButton = currentDrawer.querySelector('.close');
      if (newCloseButton) {
        newCloseButton.addEventListener('click', () => {
          // Close the drawer using the custom element's method
          currentDrawer.close();
        });
      }

      // Update focusable elements list for keyboard navigation
      const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      currentDrawer.focusableElementList = currentDrawer.querySelectorAll(focusableElements);
      currentDrawer.firstFocusableElement = currentDrawer.focusableElementList[0];
      currentDrawer.lastFocusableElement = currentDrawer.focusableElementList[currentDrawer.focusableElementList.length - 1];
    }

    // Re-find all checkboxes and buttons after replacing HTML
    this.filterCheckboxes = Array.from(document.querySelectorAll('input[data-filter-param]'));
    this.clearButtons = Array.from(document.querySelectorAll('.clear-filters'));

    // Re-check filters that were checked before
    this.filterCheckboxes.forEach(cb => {
      const key = `${cb.dataset.filterParam}:${cb.value}`;
      if (checkedFilters.has(key)) {
        cb.checked = true;
      }
    });

    // Re-attach event listeners to new checkboxes
    this.filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.syncCheckboxes(e.target);
        this.applyFilters();
      });
    });

    // Re-attach event listeners to clear buttons
    this.clearButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.clearAllFilters();
      });
    });

    // Update clear button visibility
    this.updateClearButtonVisibility();
  }

  captureDetailsState(container) {
    // Capture which details elements are open, identified by their summary text
    if (!container) return new Map();

    const detailsState = new Map();
    const detailsElements = container.querySelectorAll('details');

    detailsElements.forEach(details => {
      const summary = details.querySelector('summary');
      if (summary) {
        // Use the summary text as a unique identifier for this section
        const summaryText = summary.textContent.trim();
        detailsState.set(summaryText, details.open);
      }
    });

    return detailsState;
  }

  restoreDetailsState(container, detailsState) {
    // Restore the open/close state of details elements based on their summary text
    if (!container || !detailsState || detailsState.size === 0) return;

    const detailsElements = container.querySelectorAll('details');

    detailsElements.forEach(details => {
      const summary = details.querySelector('summary');
      if (summary) {
        const summaryText = summary.textContent.trim();
        // If we have saved state for this section, restore it
        if (detailsState.has(summaryText)) {
          details.open = detailsState.get(summaryText);
        }
      }
    });
  }

  syncCheckboxes(changedCheckbox) {
    // Sync between desktop and mobile checkboxes with the same value and filter param
    const value = changedCheckbox.value;
    const isChecked = changedCheckbox.checked;
    const filterParam = changedCheckbox.dataset.filterParam;

    // Find all checkboxes with the same value and filter parameter and sync them
    this.filterCheckboxes.forEach(cb => {
      if (cb !== changedCheckbox &&
          cb.value === value &&
          cb.dataset.filterParam === filterParam) {
        cb.checked = isChecked;
      }
    });
  }

  clearAllFilters() {
    // Uncheck all filter checkboxes
    this.filterCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Apply filters (which will show all products)
    this.applyFilters();
  }

  updateClearButtonVisibility() {
    // Show clear button only if at least one filter is checked
    const hasActiveFilters = this.filterCheckboxes.some(cb => cb.checked);

    this.clearButtons.forEach(button => {
      if (hasActiveFilters) {
        button.classList.remove('hidden');
      } else {
        button.classList.add('hidden');
      }
    });
  }
}

customElements.define('collection-tag-filter', CollectionTagFilter);

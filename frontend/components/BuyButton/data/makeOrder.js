export async function makeOrder(items) {
  const response = await fetch(
    '/cart/add.js?sections=tw-cart-drawer',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: getFetchBody(items),
    },
  );
  if (!response.ok) throw new Error("Une erreur inattendu s'est produite.");
  const json = await response.json();

  // Fetch current cart state to update bubble
  const cartResponse = await fetch('/cart.js');
  const cart = await cartResponse.json();

  renderNewSections(json, cart);
  const closeButton = document.getElementById('addons-drawer-close-button');
  closeButton.click();
  setTimeout(() => {
    const cartDrawerButton = document.getElementById('cart-button');
    cartDrawerButton.click();
  }, 300);
}

function getFetchBody(items) {
  const itemsData = items.map(item => ({
    id: item.variantId,
    quantity: 1,
    properties: item.properties,
  }))

  return JSON.stringify({
    items: itemsData,
  });
}

function renderNewSections({ sections }, cart) {
  // Update bubble manually with cart item count
  const bubble = document.getElementById('bubble-nb-product');
  console.log('bubble element:', bubble);
  console.log('cart item count:', cart.item_count);

  if (bubble) {
    if (cart.item_count > 0) {
      const itemCountHTML = cart.item_count < 100
        ? `<span aria-hidden="true">${cart.item_count}</span>`
        : '';
      const srOnlyHTML = `<span class="sr-only">Cart count: ${cart.item_count}</span>`;
      bubble.innerHTML = itemCountHTML + srOnlyHTML;
      console.log('✅ bubble updated successfully with count:', cart.item_count);
    } else {
      bubble.innerHTML = '';
      console.log('✅ bubble cleared (empty cart)');
    }
  } else {
    console.error('❌ bubble element not found in DOM');
  }

  // Update cart drawer section
  const sectionDrawer = document.getElementById(
    'shopify-section-tw-cart-drawer',
  );
  console.log('sectionDrawer element:', sectionDrawer);
  if (sectionDrawer) {
    const newSectionDrawer = getSectionInnerJSON(
      sections['tw-cart-drawer'],
      '#shopify-section-tw-cart-drawer',
    );
    if (newSectionDrawer !== null) {
      sectionDrawer.innerHTML = newSectionDrawer;
      console.log('✅ sectionDrawer updated successfully');
    } else {
      console.warn('⚠️ newSectionDrawer is null - selector not found in parsed HTML');
    }
  } else {
    console.error('❌ sectionDrawer element not found in DOM');
  }
}

function getSectionInnerJSON(json, selector) {
  const element = new DOMParser()
    .parseFromString(json, 'text/html')
    .querySelector(selector);
  return element ? element.innerHTML : null;
}

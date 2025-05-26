export async function makeOrder(items) {
  const response = await fetch(
    '/cart/add.js?sections=tw-cart-drawer,tw-header-painting',
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
  renderNewSections(json);
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

function renderNewSections({ items, sections }) {
  const bubble = document.getElementById('bubble-nb-product');
  const newBubble = getSectionInnerJSON(
    sections['tw-header-painting'],
    '#bubble-nb-product',
  );
  bubble.innerHTML = newBubble;

  const sectionDrawer = document.getElementById(
    'shopify-section-tw-cart-drawer',
  );
  const newSectionDrawer = getSectionInnerJSON(
    sections['tw-cart-drawer'],
    '#shopify-section-tw-cart-drawer',
  );
  sectionDrawer.innerHTML = newSectionDrawer;

  const variantTitleToFillElem = sectionDrawer.querySelector(
    '.variant-title-to-fill',
  );
  if (variantTitleToFillElem) {
    variantTitleToFillElem.textContent = items[0].variant_title;
  }

  const variantPriceToFillElem = sectionDrawer.querySelector(
    '.variant-price-to-fill',
  );
  if (variantPriceToFillElem) {
    const moneySymbol = variantPriceToFillElem.textContent.split('0')[0];
    variantPriceToFillElem.textContent = moneySymbol + items[0].price / 100;
  }
}

function getSectionInnerJSON(json, selector) {
  return new DOMParser()
    .parseFromString(json, 'text/html')
    .querySelector(selector).innerHTML;
}

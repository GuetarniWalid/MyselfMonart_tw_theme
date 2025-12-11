import createStore from 'teaful';

const initialStore = {
  id: window.variants[0].id,
  price: Number(window.variants[0].price) / 100 || 0,
  size: window.paintingOptions.size[0],
  border: window.paintingOptions.border[0],
  fixation: window.paintingOptions.fixation[0],
  frameCanvas: getDefaultOption(window.paintingOptions.frameCanvas),
  defaultFixation: getDefaultOption(window.paintingOptions.fixation),
  upsells: [],
  items: [{ variantId: window.variants[0].id, properties: {} }],
};

function onAfterUpdate({ store }) {
  const size = store.size.name;
  const border = store.border.name;

  const newVariant = getNewVariant(size, border);

  // Guard against undefined variant
  if (!newVariant) {
    console.error('No variant found for:', { size, border, originalBorder: store.border.name });
    console.log('Available variants:', window.variants);
    return;
  }

  if (store.id !== newVariant.id) {
    setVariantSelected.id(newVariant.id);
    setVariantSelected.price(Number(newVariant.price) / 100);
    if (isFixationAvailable(store) === false) {
      setVariantSelected.fixation(store.defaultFixation);
    }
    setVariantSelected.items([{ variantId: newVariant.id }]);
  }

  const upsells = getUpsells(store);
  if (!arraysShallowEqual(store.upsells, upsells)) {
    setVariantSelected.upsells(upsells);
    const properties = {}
    upsells.forEach((u, i) => {
      properties[`_variantId_${i}`] = u.variantId;
    });
    const customerDetailsPopup = document.getElementById('customer-details-popup');
    if (customerDetailsPopup) {
      const inputs = customerDetailsPopup.querySelectorAll('input');
      inputs.forEach((input) => {
        properties[input.name] = input.value;
      });
    }
    setVariantSelected.items([
      {
        variantId: newVariant.id,
        properties
      },
      ...upsells.map((u) => ({ variantId: u.variantId })),
    ]);
  }
}

function getDefaultOption(options) {
  if (!options || options.length === 0) return null;
  const lowestPriceOption = options.reduce((lowest, current) => {
    return current.price < lowest.price ? current : lowest;
  }, options[0]);
  return lowestPriceOption;
}

function getNewVariant(size, border) {
  return window.variants.find(
    (variant) =>
      variant.option1 === size &&
      variant.option2 === border,
  );
}

function isFixationAvailable(store) {
  // Check if fixation is available for the selected size
  if (!store.fixation) return false;
  const test = store.fixation.availableOn?.includes(store.size.key);
  return test;
}

function getUpsells(store) {
  // Size-based upsells: add fixation and frames based on size
  const upsells = [];

  // Add fixation if available for this size
  if (store.fixation && store.fixation.variantId && isFixationAvailable(store)) {
    upsells.push({
      variantId: store.fixation.variantId,
      price: store.fixation.price,
      name: store.fixation.name,
      type: store.fixation.type,
    });
  }

  // Add frames if available
  if (store.frameCanvas && store.frameCanvas.variantId) {
    upsells.push({
      variantId: store.frameCanvas.variantId,
      price: store.frameCanvas.price,
      name: store.frameCanvas.name,
      type: store.frameCanvas.type,
    });
  }

  return upsells.filter((u) => Boolean(u.variantId));
}

function arraysShallowEqual(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, i) => val.variantId === b[i].variantId)
  );
}

export const { useStore: useVariantSelected, setStore: setVariantSelected } =
  createStore(initialStore, onAfterUpdate);

import createStore from 'teaful';

const initialStore = {
  id: window.variants[0].id,
  price: Number(window.variants[0].price) / 100 || 0,
  size: window.paintingOptions.size[0],
  matter: window.paintingOptions.matter[0],
  thickness: window.paintingOptions.thickness[0],
  border: window.paintingOptions.border[0],
  shine: window.paintingOptions.shine[0],
  fixation: window.paintingOptions.fixation[0],
  frameCanvas: getDefaultOption(window.paintingOptions.frameCanvas),
  framePoster: getDefaultOption(window.paintingOptions.framePoster),
  frameHandmade: getDefaultOption(window.paintingOptions.frameHandmade),
  defaultFixation: getDefaultOption(window.paintingOptions.fixation),
  defaultOption3: getDefaultOption(window.variants).option3,
  upsells: [],
  items: [{ variantId: window.variants[0].id, properties: {} }],
};

function onAfterUpdate({ store }) {
  const { size, matter } = getSizeAndMatterNames(store);
  const option3 = getOption3(store);

  const newVariant = getNewVariant(size, matter, option3);

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
  const lowestPriceOption = options.reduce((lowest, current) => {
    return current.price < lowest.price ? current : lowest;
  }, options[0]);
  return lowestPriceOption;
}

function getSizeAndMatterNames(store) {
  return {
    size: store.size.name,
    matter: store.matter.name,
  };
}

function getOption3(store) {
  switch (store.matter.key) {
    case 'matterCanvas':
      return `${store.thickness.name}/${store.border.name}`;
    case 'matterAluminium':
      return `${store.shine.name}`;
    default:
      return 'Null';
  }
}

function getNewVariant(size, matter, option3) {
  return window.variants.find(
    (variant) =>
      variant.option1 === size &&
      variant.option2 === matter &&
      variant.option3 === option3,
  );
}

function isFixationAvailable(store) {
  const test = store.fixation.availableOn?.includes(
    `${store.size.key}/${store.matter.key}`,
  );
  return test;
}

function getUpsells(store) {
  switch (store.matter.key) {
    case 'matterPoster':
      return [
        {
          variantId: store.framePoster.variantId,
          price: store.framePoster.price,
          name: store.framePoster.name,
          type: store.framePoster.type,
        },
      ].filter((u) => Boolean(u.variantId));
    case 'matterCanvas':
      return [
        { variantId: store.fixation.variantId, 
          price: store.fixation.price,
          name: store.fixation.name,
          type: store.fixation.type,
        },
        {
          variantId: store.frameCanvas.variantId,
          price: store.frameCanvas.price,
          name: store.frameCanvas.name,
          type: store.frameCanvas.type,
        },
      ].filter((u) => Boolean(u.variantId));
    case 'matterHandmade':
      return [
        {
          variantId: store.frameHandmade.variantId,
          price: store.frameHandmade.price,
          name: store.frameHandmade.name,
          type: store.frameHandmade.type,
        },
      ].filter((u) => Boolean(u.variantId));
    default:
      return [
        { 
          variantId: store.fixation.variantId, 
          price: store.fixation.price,
          name: store.fixation.name,
          type: store.fixation.type,
        },
      ].filter((u) => Boolean(u.variantId));
  }
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

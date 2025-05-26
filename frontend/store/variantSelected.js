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
  frameCanvas: window.paintingOptions.frameCanvas[0],
  framePoster: window.paintingOptions.framePoster[0],
  defaultFixation: window.paintingOptions.fixation[0],
  defaultOption3: window.variants[0].option3,
  upsells: [],
  items: [{ variantId: window.variants[0].id }],
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
    setVariantSelected.items([
      { variantId: newVariant.id },
      ...upsells.map((u) => ({ variantId: u.variantId })),
    ]);
  }
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
      return store.defaultOption3;
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
        },
      ].filter((u) => Boolean(u.variantId));
    case 'matterCanvas':
      return [
        { variantId: store.fixation.variantId, price: store.fixation.price },
        {
          variantId: store.frameCanvas.variantId,
          price: store.frameCanvas.price,
        },
      ].filter((u) => Boolean(u.variantId));
    default:
      return [
        { variantId: store.fixation.variantId, price: store.fixation.price },
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

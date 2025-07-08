import createStore from 'teaful';
import { setVariantSelected } from './variantSelected.js';

export const { useStore: useCustomerDetails, setStore: setCustomerDetails } = createStore({}, onAfterUpdate);

function onAfterUpdate({ store }) {
  updateVariantSelectedProperties(store);
}

function updateVariantSelectedProperties(customerDetails) {
  const properties = {};
  Object.entries(customerDetails).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      properties[key] = value;
    }
  });

  setVariantSelected.items((currentItems) => {
    if (!currentItems || currentItems.length === 0) {
      return currentItems;
    }

    return currentItems.map((item) => {
      if (item.hasOwnProperty('properties')) {
        return {
          ...item,
          properties: {
            ...item.properties,
            ...properties
          }
        };
      }
      return item;
    });
  });
}


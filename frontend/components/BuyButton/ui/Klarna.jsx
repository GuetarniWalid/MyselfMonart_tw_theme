import React from 'react'

export default function Klarna({ purchaseAmount }) {

  const amountFormatted = purchaseAmount * 100;
  const currency = window.Shopify.currency.active;
  const locale = getLocale(currency);
  const toDisplay = displayKlarna(locale);
  

  function getLocale(currency) {
    if (currency === 'USD') {
      return 'en-US'; //not yet supported
    } else if (currency === 'GBP') {
      return 'en-GB';
    } else if (currency === 'CHF') {
      return 'fr-CH';
    } else if (currency === 'DKK') {
      return 'da-DK';
    } else if (currency === 'CAD') {
      return 'en-CA'; // not yet supported
    } else {
      const lang = window.Shopify.locale;
      switch (lang) {
        case 'es':
          return 'es-ES';
        case 'de':
          return 'de-DE';
        case 'it':
          return 'it-IT';
        case 'en':
          return 'en-FR';
        default:
          return 'fr-FR';
      }
    }
  }

  function displayKlarna(locale) {
    if (locale === 'en-US') return false;
    if(locale === 'en-CA') return false;
    return true;
  }

  if (!toDisplay) return null;

  return (
    <klarna-placement
      data-key="credit-promotion-badge"
      data-locale={locale}
      data-purchase-amount={amountFormatted}
    ></klarna-placement>
  )
}

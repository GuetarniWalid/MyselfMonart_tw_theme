export default function Klarna({ purchaseAmount }) {
  const amountFormatted = purchaseAmount * 100;
  const locale = getLocale();
  const toDisplay = shouldDisplayKlarna();
  
  if (!toDisplay) return null;

  return (
    <klarna-placement
      data-key="credit-promotion-badge"
      data-locale={locale}
      data-purchase-amount={amountFormatted}
    ></klarna-placement>
  )
}

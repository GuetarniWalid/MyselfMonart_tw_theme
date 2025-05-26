import BuyButton from './BuyButton';
import Selects from './Selects';

export default function MobileBottom({
  drawerOpen,
  mobileSummaryRef,
}) {  
  return (
    <div className='absolute bottom-0 w-full px-3 md:hidden'>
      <Selects 
        drawerOpen={drawerOpen}
        mobileSummaryRef={mobileSummaryRef}
      />
      <BuyButton
        drawerOpen={drawerOpen}
        withCustomerDetails={window.buyingWithCustomization}
      />
    </div>
  );
}

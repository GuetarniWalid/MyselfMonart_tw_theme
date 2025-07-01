import { useState, useRef, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import Painting from './Painting';
import MobileBottom from './MobileBottom';
import CloseButton from './CloseButton';
import DesktopRight from './DesktopRight';
import BackgroundImage from './BackgroundImage';
import BuyButton from './BuyButton';
import { FocusedElementProvider } from '../store/FocusedElementContext';

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(null);
  
  const isMobile = useIsMobile();
  const mobileSummaryRef = useRef(null);
  const desktopSelectorRef = useRef(null);
  const addonsDrawerRef = useRef(document.getElementById('addonsDrawer'));
  const radiosContainerRef = useRef(null);

  useEffect(() => {
    const config = {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      childList: false,
      subtree: false,
    };

    const callback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.attributeName === 'aria-hidden') {
          setDrawerOpen(
            mutation.target.getAttribute('aria-hidden') === 'false',
          );
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(addonsDrawerRef.current, config);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) {
      const focusableElements = Array.from(
        document
          .getElementById('addonsDrawer')
          .querySelectorAll('button, [tabindex]:not([tabindex="-1"])'),
      );
      focusableElements.forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
    }
  }, [drawerOpen]);

  //Desktop logic
  useEffect(() => {
    const scrollPosition = radiosContainerRef.current?.scrollTop;
    if (scrollPosition) {
      radiosContainerRef.current.scrollTop = scrollPosition;
    }
  }, [isMobile, radiosContainerRef.current]);

  return (
    <FocusedElementProvider>
      <BackgroundImage>
        <CloseButton
          addonsDrawerRef={addonsDrawerRef}
          drawerOpen={drawerOpen}
        />
        <div className="max-h-full overflow-hidden mx-3 min-w-[50%] lg:min-w-0">
          <Painting />
          {!isMobile && (
            <BuyButton
              drawerOpen={true}
              withCustomerDetails={window.buyingWithCustomization}
            />
          )}
        </div>
        <MobileBottom
          mobileSummaryRef={mobileSummaryRef}
          drawerOpen={drawerOpen}
        />
        <DesktopRight
          drawerOpen={drawerOpen}
          desktopSelectorRef={desktopSelectorRef}
        />
      </BackgroundImage>
    </FocusedElementProvider>
  );
}

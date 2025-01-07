import { useState, useMemo, useRef, useEffect } from 'react';
import useFormatOptions from '../hooks/useFormatOptions';
import useFormatOptionIndexListSelected from '../hooks/useFormatOptionIndexListSelected';
import useIsMobile from '../hooks/useIsMobile';
import Painting from './Painting';
import MobileBottom from './MobileBottom';
import CloseButton from './CloseButton';
import DesktopRight from './DesktopRight';
import BackgroundImage from './BackgroundImage';
import BuyButton from './BuyButton';

export default function App() {
  const initialoptionSets = useMemo(() => useFormatOptions(0, 0), []);
  const [optionIndecesSelected, setOptionIndecesSelected] = useState(
    new Array(initialoptionSets.length).fill(0),
  );
  const [currentOption, setCurrentOption] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [openSelectId, setOpenSelectId] = useState(null);

  const optionSets = useFormatOptions(
    optionIndecesSelected[0],
    optionIndecesSelected[1],
  );
  const newOptionIndecesSelected = useFormatOptionIndexListSelected(
    optionIndecesSelected,
    optionSets,
  );
  const isMobile = useIsMobile();
  const mobileSummaryRef = useRef(null);
  const desktopSelectorRef = useRef(null);
  const addonsDrawerRef = useRef(document.getElementById('addonsDrawer'));
  const CloseButtonRef = useRef(null);
  const radiosContainerRef = useRef(null);
  const focusedElemRef = useRef(null);

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
    <BackgroundImage
      focusedElemRef={focusedElemRef}
      setOpenSelectId={setOpenSelectId}
      setCurrentOption={setCurrentOption}
    >
      <CloseButton
        addonsDrawerRef={addonsDrawerRef}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
      />
      <div className="max-h-full overflow-hidden mx-3">
        <Painting
          currentOption={currentOption}
          optionSets={optionSets}
          optionIndecesSelected={newOptionIndecesSelected}
          setCurrentOption={setCurrentOption}
        />
        {!isMobile && (
          <BuyButton
            optionSets={optionSets}
            optionIndecesSelected={newOptionIndecesSelected}
            drawerOpen={true}
            withCustomerDetails={window.buyingWithCustomization}
            CloseButtonRef={CloseButtonRef}
          />
        )}
      </div>
      <MobileBottom
        optionIndecesSelected={newOptionIndecesSelected}
        setOptionIndecesSelected={setOptionIndecesSelected}
        optionSets={optionSets}
        mobileSummaryRef={mobileSummaryRef}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
        focusedElemRef={focusedElemRef}
        openSelectId={openSelectId}
        setOpenSelectId={setOpenSelectId}
      />
      <DesktopRight
        optionSets={optionSets}
        optionIndecesSelected={newOptionIndecesSelected}
        setOptionIndecesSelected={setOptionIndecesSelected}
        setCurrentOption={setCurrentOption}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
        desktopSelectorRef={desktopSelectorRef}
        focusedElemRef={focusedElemRef}
        openSelectId={openSelectId}
        setOpenSelectId={setOpenSelectId}
      />
    </BackgroundImage>
  );
}

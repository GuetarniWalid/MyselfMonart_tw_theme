import { useState, useMemo, useRef, useEffect } from 'react';
import useFormatOptions from '../hooks/useFormatOptions';
import useFormatOptionIndexListSelected from '../hooks/useFormatOptionIndexListSelected';
import useIsMobile from '../hooks/useIsMobile';
import Painting from './Painting';
import MobileBottom from './MobileBottom';
import CloseButton from './CloseButton';
import DesktopRight from './DesktopRight';
import BuyButton from './BuyButton';

export default function App() {
  const initialoptionSets = useMemo(() => useFormatOptions(0, 0), []);
  const [selectIndexSelected, setSelectIndexSelected] = useState(null);
  const [optionIndexListSelected, setOptionIndexListSelected] = useState(
    new Array(initialoptionSets.length).fill(0),
  );
  const [currentOption, setCurrentOption] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(null);
  const optionSets = useFormatOptions(
    optionIndexListSelected[0],
    optionIndexListSelected[1],
  );
  const newOptionIndexListSelectedFormatted = useFormatOptionIndexListSelected(
    optionIndexListSelected,
    optionSets,
  );
  const isMobile = useIsMobile();
  const mobileSummaryRef = useRef(null);
  const desktopSelectorRef = useRef(null);
  const addonsDrawerRef = useRef(document.getElementById('addonsDrawer'));
  const CloseButtonRef = useRef(null);
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

  function handleClick(event) {
    if (
      isMobile &&
      mobileSummaryRef.current &&
      !mobileSummaryRef.current.contains(event.target)
    ) {
      setSelectIndexSelected(null);
    }
    if (
      !isMobile &&
      desktopSelectorRef.current &&
      !desktopSelectorRef.current.contains(event.target)
    ) {
      setSelectIndexSelected(null);
    }
  }

  //Desktop logic
  const scrollPosition = radiosContainerRef.current?.scrollTop;
  useEffect(() => {
    if (scrollPosition) {
      radiosContainerRef.current.scrollTop = scrollPosition;
    }
  }, [isMobile, radiosContainerRef]);

  return (
    <div
      className="relative w-full h-full flex justify-center items-center md:px-8"
      onClick={handleClick}
    >
      <CloseButton
        addonsDrawerRef={addonsDrawerRef}
        drawerOpen={drawerOpen}
        CloseButtonRef={CloseButtonRef}
      />
      <div className="flex flex-col gap-6 md:gap-8 md:flex-row md:items-center justify-center h-full w-full max-w-6xl">
        {isMobile ? (
          <Painting
            currentOption={currentOption}
            optionSets={optionSets}
            optionIndexListSelected={newOptionIndexListSelectedFormatted}
            setCurrentOption={setCurrentOption}
          />
        ) : (
          <div className="h-5/6 flex flex-col gap-5 w-1/2">
            <Painting
              currentOption={currentOption}
              optionSets={optionSets}
              optionIndexListSelected={newOptionIndexListSelectedFormatted}
              setCurrentOption={setCurrentOption}
            />
            <BuyButton
              optionSets={optionSets}
              optionIndexListSelected={newOptionIndexListSelectedFormatted}
              drawerOpen={drawerOpen}
            />
          </div>
        )}
        <div className="sm:flex items-center md:flex-1 md:h-full">
          <div
            className="w-full px-4 md:h-full md:px-0 md:overflow-y-auto md:py-20 scrollbar-hidden"
            ref={radiosContainerRef}
          >
            {isMobile ? (
              <MobileBottom
                optionIndexListSelected={newOptionIndexListSelectedFormatted}
                setOptionIndexListSelected={setOptionIndexListSelected}
                optionSets={optionSets}
                selectIndexSelected={selectIndexSelected}
                setSelectIndexSelected={setSelectIndexSelected}
                mobileSummaryRef={mobileSummaryRef}
                setCurrentOption={setCurrentOption}
                drawerOpen={drawerOpen}
                CloseButtonRef={CloseButtonRef}
              />
            ) : (
              <DesktopRight
                optionSets={optionSets}
                optionIndexListSelected={newOptionIndexListSelectedFormatted}
                selectIndexSelected={selectIndexSelected}
                setSelectIndexSelected={setSelectIndexSelected}
                setOptionIndexListSelected={setOptionIndexListSelected}
                setCurrentOption={setCurrentOption}
                drawerOpen={drawerOpen}
                CloseButtonRef={CloseButtonRef}
                desktopSelectorRef={desktopSelectorRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

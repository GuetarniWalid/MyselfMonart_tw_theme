import { useState, useMemo, useRef, useEffect, createContext } from 'react';
import { createPortal } from 'react-dom';
import useFormatOptions from './hooks/useFormatOptions';
import useFormatOptionIndexListSelected from './hooks/useFormatOptionIndexListSelected';
import useIsMobile from './hooks/useIsMobile';
import Painting from './components/Painting';
import MobileBottom from './components/MobileBottom';
import CloseButton from './components/CloseButton';
import PopupInfo from './components/PopupInfo';
import DesktopRight from './components/DesktopRight';

export const InfoToShowContext = createContext();

export default function App() {
  const initialoptionSets = useMemo(() => useFormatOptions(0, 0), []);
  const [selectIndexSelected, setSelectIndexSelected] = useState(null);
  const [optionIndexListSelected, setOptionIndexListSelected] = useState(
    new Array(initialoptionSets.length).fill(0),
  );
  const [currentOption, setCurrentOption] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [infoToShow, setInfoToShow] = useState(null);
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
  const addonsDrawerRef = useRef(document.getElementById('addonsDrawer'));
  const CloseButtonRef = useRef(null);

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

  function handleClick(event) {
    if (
      mobileSummaryRef.current &&
      !mobileSummaryRef.current.contains(event.target)
    ) {
      setSelectIndexSelected(null);
    }
  }

  return (
    <InfoToShowContext.Provider value={setInfoToShow}>
      <div
        className="relative w-full h-full flex flex-col gap-6 md:flex-row md:h-4/5 justify-center max-w-6xl"
        onClick={handleClick}
      >
        <CloseButton
          addonsDrawerRef={addonsDrawerRef}
          drawerOpen={drawerOpen}
          CloseButtonRef={CloseButtonRef}
        />
        <Painting
          currentOption={currentOption}
          optionSets={optionSets}
          optionIndexListSelected={newOptionIndexListSelectedFormatted}
          setCurrentOption={setCurrentOption}
        />
        <div className="sm:flex items-center md:flex-1">
          <div className="w-full px-4 md:px-0">
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
              />
            )}
          </div>
        </div>
        {infoToShow &&
          createPortal(
            <PopupInfo infoToShow={infoToShow} setInfoToShow={setInfoToShow} />,
            document.getElementById('addonsDrawer'),
          )}
      </div>
    </InfoToShowContext.Provider>
  );
}

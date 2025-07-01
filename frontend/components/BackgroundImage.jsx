import { setCurrentOption } from '../store/currentOption';
import { setOpenSelectId } from '../store/openSelectId';
import { useFocusedElementRef } from '../store/FocusedElementContext';

const BackgroundImage = ({children}) => {
  const focusedElementRef = useFocusedElementRef();

  function handleClick(event) {
    event.preventDefault();
    document.getElementById('addons-drawer-close-button').focus();
    focusedElementRef.current = null;
    setOpenSelectId(null);
    setCurrentOption(null);
  }

  return (
    <div
      className="relative w-full h-full flex justify-center md:pr-8 bg-repeat py-3 md:bg-secondary"
      onClick={handleClick}
      id="background-image"
    >
      <style>
        {`
          #background-image {
            background-image: url(https://cdn.shopify.com/s/files/1/0623/2388/4287/files/background-neubrutalism.jpg?v=1751380458);
          }
        `}
      </style>
        {children}
    </div>
  );
};

export default BackgroundImage;

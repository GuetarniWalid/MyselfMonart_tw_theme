import { useState } from 'react';
import data from '../data/data';
const { background } = data;

const BackgroundImage = ({children}) => {
  const [openSelectId, setOpenSelectId] = useState(null);

  //To close select when clicking outside
  function handleClick(event) {
    if (
      !event.target.id?.includes(openSelectId) &&
      !event.target.ariaActiveDescendantElement?.id?.includes(openSelectId)
    ) {
      setOpenSelectId(null);
    }
  }

  return (
    <div
      className="relative w-full h-full flex justify-center md:pr-8 bg-repeat py-3 md:bg-secondary"
      onClick={handleClick}
      id="background-image"
    >
      <style>
        {`
          @media (max-width: 767px) {
            #background-image {
              background-image: url(${background.image.src});
            }
          }
        `}
      </style>
        {children}
    </div>
  );
};

export default BackgroundImage;

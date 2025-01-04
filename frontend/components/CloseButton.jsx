import { useEffect } from 'react';

export default function CloseButton({
  addonsDrawerRef,
  drawerOpen,
  CloseButtonRef,
}) {
  useEffect(() => {
    if (drawerOpen) CloseButtonRef.current.focus();
  }, [drawerOpen]);

  function handleClick() {
    addonsDrawerRef.current.classList.replace(
      'translate-x-0',
      'translate-x-full',
    );
    addonsDrawerRef.current.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    document.querySelector('.buy-button').focus();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  return (
    <button
      id='addons-drawer-close-button'
      className="absolute right-3 top-3 flex justify-center items-center rounded-lg w-10 h-10 overflow-hidden z-10 bg-white/30 backdrop-blur-xl md:backdrop-blur-none mobile:text-white md:bg-main-10 outline outline-1 outline-white/90 after:absolute after:inset-0 after:rounded-lg mobile:after:bg-[#848484]/40 mobile:after:backdrop-blur-xl after:-z-10"
      ref={CloseButtonRef}
      onClick={handleClick}
      tabIndex={drawerOpen ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7q.275-.275.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275q.275.275.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275z"
        />
      </svg>
    </button>
  );
}

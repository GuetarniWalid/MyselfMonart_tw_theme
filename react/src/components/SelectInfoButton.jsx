import React from 'react';

export default function SelectInfoButton() {
  function handleClick() {
    console.log('SelectInfoButton clicked');
  }

  return (
    <button
      className="bg-white h-full w-12 rounded flex justify-center items-center"
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 15 15"
      >
        <title>Information</title>
        <path
          fill="currentColor"
          d="M7.5 1C6.7 1 6 1.7 6 2.5S6.7 4 7.5 4S9 3.3 9 2.5S8.3 1 7.5 1M4 5v1s2 0 2 2v2c0 2-2 2-2 2v1h7v-1s-2 0-2-2V6c0-.5-.5-1-1-1z"
        />
      </svg>
    </button>
  );
}

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, PointerEvent } from "react";
import type { InfoTipProps } from "../types/Common";

const WIDTH = 288;
const GUTTER = 16;

// Opens on mouse hover and keyboard focus, and stays open after a click or tap
// until the next one, a click outside, Tab away or Esc. The text is also the
// button's description, so screen readers read it on focus.
const InfoTip = ({ label, children }: InfoTipProps) => {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  // Moves the box left or right so it stays inside the screen.
  const [place, setPlace] = useState({ shift: 0, width: WIDTH });
  const isOpen = isHovered || isFocused || isPinned;

  const close = () => {
    setIsHovered(false);
    setIsFocused(false);
    setIsPinned(false);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      // The box is placed from the wrapper, not the button (it has a -m-1).
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const screen = document.documentElement.clientWidth;
      const width = Math.min(WIDTH, screen - GUTTER * 2);
      const { left } = wrapper.getBoundingClientRect();
      const clamped = Math.min(Math.max(left, GUTTER), screen - GUTTER - width);
      setPlace({ shift: clamped - left, width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const handlePointer = (e: globalThis.PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [isOpen]);

  // Touch screens also send enter and leave, around the tap; the click handles those.
  const handleEnter = (e: PointerEvent) => {
    if (e.pointerType === "mouse") setIsHovered(true);
  };
  const handleLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") setIsHovered(false);
  };

  // Only keyboard focus opens it, so a tap doesn't open and then close it.
  const handleFocus = (e: FocusEvent<HTMLButtonElement>) => {
    if (e.currentTarget.matches(":focus-visible")) setIsFocused(true);
  };

  const handleClick = () => {
    if (isPinned) close();
    else setIsPinned(true);
  };

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      className="relative inline-flex"
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={isOpen}
        aria-describedby={id}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={close}
        className="-m-1 p-1 rounded-full text-gray-500 hover:text-gray-300 focus-visible:outline-2 focus-visible:outline-violet-400 transition-colors"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.25v2.75a.75.75 0 0 0 1.5 0V10a1 1 0 0 0-1-1H9Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {/* The top padding bridges the gap, so the mouse can move onto the box. */}
      <div
        id={id}
        role="tooltip"
        hidden={!isOpen}
        style={{ left: place.shift, width: place.width }}
        className="absolute top-full z-20 pt-2"
      >
        <div className="flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-800 p-3 text-left text-xs font-normal leading-relaxed text-gray-300 shadow-xl [&_b]:font-medium [&_b]:text-white [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoTip;

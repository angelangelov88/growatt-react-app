import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, PointerEvent } from "react";
import type { InfoTipProps } from "../types/Common";

const WIDTH = 320;
const GUTTER = 16;
const GAP = 8;

// Opens on mouse hover and keyboard focus, and stays open after a click or tap
// until the next one, a click outside, Tab away or Esc. The text is also the
// button's description, so screen readers read it on focus.
//
// The box is fixed to the screen, so it never makes the page longer (which made
// it jump at the bottom of the page). It opens below the icon, or above when
// there's more room there, and scrolls inside itself if neither side fits.
const InfoTip = ({ label, children }: InfoTipProps) => {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [place, setPlace] = useState({
    top: 0,
    left: 0,
    width: WIDTH,
    maxHeight: 0,
    isAbove: false,
  });
  const isOpen = isHovered || isFocused || isPinned;

  const close = () => {
    setIsHovered(false);
    setIsFocused(false);
    setIsPinned(false);
  };

  // Placed before it's painted, then kept next to the icon while the page
  // scrolls or resizes.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      const wrapper = wrapperRef.current;
      const box = boxRef.current;
      if (!wrapper || !box) return;
      const { clientWidth, clientHeight } = document.documentElement;
      const width = Math.min(WIDTH, clientWidth - GUTTER * 2);
      // Its height at the new width; + 2 for the border.
      box.style.width = `${String(width)}px`;
      const height = box.scrollHeight + 2;
      const icon = wrapper.getBoundingClientRect();
      const below = clientHeight - icon.bottom - GAP - GUTTER;
      const above = icon.top - GAP - GUTTER;
      const isAbove = height > below && above > below;
      const room = isAbove ? above : below;
      setPlace({
        top: isAbove ? icon.top - GAP - Math.min(height, room) : icon.bottom,
        left: Math.min(
          Math.max(icon.left, GUTTER),
          clientWidth - GUTTER - width,
        ),
        width,
        maxHeight: room,
        isAbove,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
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

  // The icon is lit while the box shows (not on CSS hover), so the two always
  // match: while the mouse is on the box, after a tap, and on keyboard focus.
  //
  // Fades and slides a little towards the icon. Hidden with visibility, not
  // display, so the fade out can finish and screen readers can still read it.
  const motion = isOpen
    ? "visible opacity-100 translate-y-0"
    : `invisible opacity-0 ${place.isAbove ? "translate-y-1" : "-translate-y-1"}`;

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      className="inline-flex"
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={isOpen}
        aria-describedby={id}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={close}
        className={`-m-1 p-1 rounded-full ${isOpen ? "text-gray-300" : "text-gray-500"} focus-visible:outline-2 focus-visible:outline-violet-400 transition-colors duration-150 ease-out motion-reduce:transition-none`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <circle cx="12" cy="7.75" r="0.75" fill="currentColor" />
        </svg>
      </button>
      {/* The padding on the icon's side bridges the gap, so the mouse can move
          onto the box. */}
      <div
        id={id}
        role="tooltip"
        style={{ top: place.top, left: place.left }}
        className={`fixed z-50 ${place.isAbove ? "pb-2" : "pt-2"} transition-[opacity,transform,visibility] duration-150 ease-out motion-reduce:transition-none ${motion}`}
      >
        <div
          ref={boxRef}
          style={{ width: place.width, maxHeight: place.maxHeight }}
          className="flex flex-col gap-2 overflow-y-auto overscroll-contain rounded-xl border border-gray-700 bg-gray-800 p-3 text-left text-xs font-normal leading-relaxed text-gray-300 shadow-xl [&_b]:font-medium [&_b]:text-strong [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-4"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoTip;

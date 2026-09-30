import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import type { AccountMenuProps } from "../types/Common";

const ITEM =
  "block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

// Small screens only: the header's account links behind a menu button, as they
// don't fit next to the logo. Closes on a choice, a click outside or Esc.
const AccountMenu = ({ email, onLogout, isLoggingOut }: AccountMenuProps) => {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    const handlePointer = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => {
          setIsOpen((v) => !v);
        }}
        className="rounded-xl bg-gray-800 p-2 text-gray-200 hover:bg-gray-700 transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          {isOpen ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <div
        id={id}
        hidden={!isOpen}
        className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-700 bg-gray-800 p-1.5 shadow-xl"
      >
        {email && (
          <p className="truncate border-b border-gray-700 px-3 pb-2 pt-1.5 mb-1 text-xs text-gray-400">
            {email}
          </p>
        )}
        <Link to="/" onClick={close} className={ITEM}>
          Dashboard
        </Link>
        <Link to="/activity" onClick={close} className={ITEM}>
          Activity
        </Link>
        <Link to="/settings" onClick={close} className={ITEM}>
          Settings
        </Link>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className={ITEM}
        >
          {isLoggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
};

export default AccountMenu;

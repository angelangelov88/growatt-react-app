import { useEffect, useRef } from "react";
import type { LoadMoreOnScrollOptions } from "../../types/Activity";

// Starts loading the next page a little before the end of the list comes into
// view. Does nothing where IntersectionObserver isn't available; the page's
// Load more button covers that.
const useLoadMoreOnScroll = ({
  ref,
  enabled,
  onLoad,
}: LoadMoreOnScrollOptions) => {
  // The latest onLoad, without re-creating the observer for each render.
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === "undefined")
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadRef.current();
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref, enabled]);
};

export default useLoadMoreOnScroll;

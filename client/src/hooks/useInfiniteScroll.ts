import { useEffect, useRef } from "react";

export function useInfiniteScroll(
  hasMore: boolean,
  isFetching: boolean,
  onLoadMore: () => void,
  rootMargin = "400px"
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const isFetchingRef = useRef(isFetching);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep refs current without recreating the observer
  hasMoreRef.current = hasMore;
  isFetchingRef.current = isFetching;
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootMargin]);

  return sentinelRef;
}

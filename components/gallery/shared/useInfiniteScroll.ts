import { useEffect, useRef } from "react";

export function useInfiniteScroll(
  fetchImages: () => void,
  loading: boolean,
  hasMore: boolean,
  imagesLength: number
) {
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore && imagesLength > 0) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fetchImages(), 100);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      clearTimeout(timeoutId);
      if (loaderRef.current) observer.unobserve(loaderRef.current);
      observer.disconnect();
    };
  }, [fetchImages, loading, hasMore, imagesLength]);

  return loaderRef;
}
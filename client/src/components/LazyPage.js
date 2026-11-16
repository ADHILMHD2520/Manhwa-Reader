import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
export function LazyPage({ page, onVisible }) {
    const container = useRef(null);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        const element = container.current;
        if (!element)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting)
                onVisible(page.pageNumber);
        }, 
        // Manhwa pages are often taller than the viewport, so a high intersection
        // threshold would never fire on smaller screens.
        { threshold: 0.15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [onVisible, page.pageNumber]);
    return (_jsxs("div", { className: `reader-page ${loaded ? "is-loaded" : ""}`, id: `page-${page.pageNumber}`, ref: container, children: [!loaded && _jsxs("div", { className: "page-placeholder", children: ["Loading page ", page.pageNumber, "\u2026"] }), _jsx("img", { src: page.imageUrl, alt: `Page ${page.pageNumber}`, loading: "eager", decoding: "async", onLoad: () => setLoaded(true) })] }));
}

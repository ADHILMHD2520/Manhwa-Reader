import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../api";

function getResumePoint(manhwaId) {
    try {
        const point = JSON.parse(localStorage.getItem(`manhwa-resume:${manhwaId}`) || "null");
        return point?.chapterId ? point : undefined;
    }
    catch {
        return undefined;
    }
}

export function PublicHomePage() {
    const [manhwa, setManhwa] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        publicApi.manhwaList()
            .then((items) => !cancelled && setManhwa(items))
            .catch(() => !cancelled && setError("The library is unavailable right now. Please try again shortly."))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, []);
    const visibleManhwa = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term)
            return manhwa;
        return manhwa.filter((item) => [item.title, item.author, item.artist, ...item.genres].join(" ").toLowerCase().includes(term));
    }, [manhwa, query]);
    return (_jsxs("main", { className: "public-page", children: [_jsxs("header", { className: "public-header", children: [_jsx(Link, { to: "/", className: "public-brand", children: "MANHWA" }), _jsxs("nav", { children: [_jsx("a", { href: "#library", children: "Library" }), _jsx(Link, { to: "/admin", children: "Admin" })] })] }), _jsxs("section", { className: "public-hero", children: [_jsx("p", { className: "eyebrow", children: "READ WITHOUT INTERRUPTION" }), _jsx("h1", { children: "Your next world is waiting." }), _jsx("p", { children: "Browse the library, choose a chapter, and read in a clean vertical scroll made for every screen." }), _jsx("label", { className: "library-search", children: _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Search titles, authors, or genres", "aria-label": "Search the library" }) })] }), _jsxs("section", { className: "public-library", id: "library", children: [_jsxs("div", { className: "public-section-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "LIBRARY" }), _jsx("h2", { children: query ? "Search results" : "Latest manhwa" })] }), !loading && _jsx("span", { children: `${visibleManhwa.length} title${visibleManhwa.length === 1 ? "" : "s"}` })] }), loading && _jsx("div", { className: "public-loading", children: "Loading library..." }), error && _jsx("p", { className: "public-error", children: error }), !loading && !error && !visibleManhwa.length && _jsx("p", { className: "public-empty", children: query ? "No matching manhwa found." : "No manhwa has been published yet." }), _jsx("div", { className: "manhwa-grid", children: visibleManhwa.map((item) => {
                        const resume = getResumePoint(item._id);
                        return _jsxs("article", { className: "public-card", children: [_jsx(Link, { to: `/manhwa/${item._id}`, className: "public-cover", children: _jsx("img", { src: item.coverImage, alt: `${item.title} cover` }) }), _jsxs("div", { className: "public-card-content", children: [_jsx("span", { className: `public-status status-${item.status}`, children: item.status }), _jsx("h3", { children: _jsx(Link, { to: `/manhwa/${item._id}`, children: item.title }) }), _jsx("p", { className: "public-byline", children: `By ${item.author}` }), _jsx("p", { className: "public-description", children: item.description }), _jsx("div", { className: "public-genres", children: item.genres.slice(0, 3).map((genre) => _jsx("span", { children: genre }, genre)) }), resume ? _jsx(Link, { className: "continue-reading-link", to: `/read/${item._id}/${resume.chapterId}`, children: "Continue reading" }) : _jsx(Link, { className: "read-title-link", to: `/manhwa/${item._id}`, children: "View chapters" })] })] }, item._id);
                    }) })] })] }));
}

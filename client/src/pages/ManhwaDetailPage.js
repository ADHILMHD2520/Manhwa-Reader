import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

export function ManhwaDetailPage() {
    const { manhwaId } = useParams();
    const [manhwa, setManhwa] = useState();
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!manhwaId)
            return;
        let cancelled = false;
        Promise.all([publicApi.manhwa(manhwaId), publicApi.chapters(manhwaId)])
            .then(([title, items]) => {
            if (cancelled)
                return;
            setManhwa(title);
            setChapters(items);
        })
            .catch(() => !cancelled && setError("This title is unavailable."))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [manhwaId]);
    if (loading)
        return _jsx("main", { className: "public-state", children: "Loading manhwa..." });
    if (error || !manhwa)
        return _jsxs("main", { className: "public-state", children: [_jsx("p", { children: error || "Manhwa not found." }), _jsx(Link, { to: "/", children: "Back to library" })] });
    const resume = getResumePoint(manhwa._id);
    const firstChapter = chapters[0];
    return (_jsxs("main", { className: "public-page", children: [_jsxs("header", { className: "public-header", children: [_jsx(Link, { to: "/", className: "public-brand", children: "MANHWA" }), _jsx(Link, { to: "/", className: "back-link", children: "Back to library" })] }), _jsxs("section", { className: "detail-hero", children: [_jsx("img", { className: "detail-cover", src: manhwa.coverImage, alt: `${manhwa.title} cover` }), _jsxs("div", { className: "detail-copy", children: [_jsx("span", { className: `public-status status-${manhwa.status}`, children: manhwa.status }), _jsx("h1", { children: manhwa.title }), _jsxs("p", { className: "detail-creators", children: ["Written by ", manhwa.author, " - Art by ", manhwa.artist] }), _jsx("p", { className: "detail-description", children: manhwa.description }), _jsx("div", { className: "public-genres", children: manhwa.genres.map((genre) => _jsx("span", { children: genre }, genre)) }), _jsxs("div", { className: "detail-actions", children: [resume && _jsx(Link, { className: "primary", to: `/read/${manhwa._id}/${resume.chapterId}`, children: "Continue reading" }), firstChapter && _jsx(Link, { className: resume ? "secondary-button" : "primary", to: `/read/${manhwa._id}/${firstChapter._id}`, children: resume ? "Start from Chapter 1" : "Start reading" })] })] })] }), _jsxs("section", { className: "chapter-directory", children: [_jsxs("div", { className: "public-section-heading", children: [_jsx("h2", { children: "Chapters" }), _jsx("span", { children: `${chapters.length} published` })] }), !chapters.length ? _jsx("p", { className: "public-empty", children: "Chapters will appear here when they are published." }) : _jsx("div", { className: "public-chapter-list", children: chapters.map((chapter) => _jsxs(Link, { to: `/read/${manhwa._id}/${chapter._id}`, className: "public-chapter", children: [_jsxs("div", { children: [_jsx("strong", { children: `Chapter ${chapter.chapterNumber}` }), _jsx("span", { children: chapter.title })] }), _jsx("span", { children: `${chapter.pageCount ?? 0} pages` })] }, chapter._id)) })] })] }));
}

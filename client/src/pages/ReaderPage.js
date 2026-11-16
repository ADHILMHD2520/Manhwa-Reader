import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { publicApi } from "../api";
import { LazyPage } from "../components/LazyPage";
function resumeKey(manhwaId) {
    return `manhwa-resume:${manhwaId}`;
}
function readResumePoint(manhwaId) {
    try {
        const raw = localStorage.getItem(resumeKey(manhwaId));
        const point = raw ? JSON.parse(raw) : undefined;
        return point && typeof point.chapterId === "string" && Number.isInteger(point.pageNumber) ? point : undefined;
    }
    catch {
        return undefined;
    }
}
function storeResumePoint(manhwaId, point) {
    localStorage.setItem(resumeKey(manhwaId), JSON.stringify(point));
}
export function ReaderPage() {
    const { manhwaId, chapterId } = useParams();
    const navigate = useNavigate();
    const [manhwa, setManhwa] = useState();
    const [chapters, setChapters] = useState([]);
    const [chapter, setChapter] = useState();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [showTopButton, setShowTopButton] = useState(false);
    const [resumePoint, setResumePoint] = useState();
    const currentPageRef = useRef(1);
    const saveTimer = useRef(undefined);
    useEffect(() => {
        if (!manhwaId)
            return;
        let cancelled = false;
        setLoading(true);
        setError("");
        Promise.all([publicApi.manhwa(manhwaId), publicApi.chapters(manhwaId)])
            .then(([nextManhwa, nextChapters]) => {
            if (cancelled)
                return;
            setManhwa(nextManhwa);
            setChapters(nextChapters);
            const savedPoint = readResumePoint(manhwaId);
            const validSavedPoint = savedPoint && nextChapters.some((item) => item._id === savedPoint.chapterId) ? savedPoint : undefined;
            setResumePoint(validSavedPoint);
            if (!chapterId && nextChapters[0]) {
                navigate(`/read/${manhwaId}/${validSavedPoint?.chapterId ?? nextChapters[0]._id}`, { replace: true });
            }
            if (!nextChapters.length)
                setError("There are no published chapters yet.");
        })
            .catch(() => !cancelled && setError("This manhwa could not be loaded."))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [chapterId, manhwaId, navigate]);
    useEffect(() => {
        if (!chapterId)
            return;
        let cancelled = false;
        setPages([]);
        setChapter(undefined);
        setLoading(true);
        currentPageRef.current = 1;
        setCurrentPage(1);
        setControlsVisible(true);
        Promise.all([publicApi.chapter(chapterId), publicApi.pages(chapterId), publicApi.progress(chapterId)])
            .then(([nextChapter, nextPages, pageNumber]) => {
            if (cancelled)
                return;
            const locallySaved = manhwaId ? readResumePoint(manhwaId) : undefined;
            const resumePage = locallySaved?.chapterId === chapterId ? locallySaved.pageNumber : pageNumber;
            const boundedPage = Math.max(1, Math.min(resumePage, nextPages.length));
            setChapter(nextChapter);
            setPages(nextPages);
            currentPageRef.current = boundedPage;
            setCurrentPage(boundedPage);
            if (manhwaId) {
                const point = { chapterId, pageNumber: boundedPage };
                storeResumePoint(manhwaId, point);
                setResumePoint(point);
            }
            window.setTimeout(() => document.getElementById(`page-${boundedPage}`)?.scrollIntoView({ block: "start" }), 80);
        })
            .catch(() => !cancelled && setError("This chapter is unavailable."))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
            if (saveTimer.current !== undefined)
                window.clearTimeout(saveTimer.current);
            void publicApi.saveProgress(chapterId, currentPageRef.current);
        };
    }, [chapterId, manhwaId]);
    const recordVisible = useCallback((pageNumber) => {
        if (!chapterId || !manhwaId || pageNumber === currentPageRef.current)
            return;
        currentPageRef.current = pageNumber;
        setCurrentPage(pageNumber);
        const point = { chapterId, pageNumber };
        storeResumePoint(manhwaId, point);
        setResumePoint(point);
        if (saveTimer.current !== undefined)
            window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => void publicApi.saveProgress(chapterId, pageNumber), 450);
    }, [chapterId, manhwaId]);
    useEffect(() => {
        // The top bar is only visible while the reader is at the very top of the chapter.
        const updateScrollState = () => {
            setShowTopButton(window.scrollY > 500);
            setControlsVisible(window.scrollY < 24);
        };
        window.addEventListener("scroll", updateScrollState, { passive: true });
        updateScrollState();
        return () => window.removeEventListener("scroll", updateScrollState);
    }, []);
    const currentIndex = chapters.findIndex((item) => item._id === chapterId);
    const previous = currentIndex > 0 ? chapters[currentIndex - 1] : undefined;
    const next = currentIndex >= 0 ? chapters[currentIndex + 1] : undefined;
    const chapterLabel = chapter ? `Chapter ${chapter.chapterNumber}: ${chapter.title}` : "Loading chapter";
    function changeChapter(id) {
        if (manhwaId)
            navigate(`/read/${manhwaId}/${id}`);
    }
    function scrollDownOnTap(event) {
        const target = event.target;
        // Leave links, buttons and the chapter dropdown alone.
        if (target.closest("a, button, select, option, input, label"))
            return;
        // Do not scroll when the person was selecting text.
        if (String(window.getSelection?.() ?? "").length > 0)
            return;
        window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: "smooth" });
    }
    function continueReading() {
        if (!resumePoint || !manhwaId)
            return;
        if (resumePoint.chapterId !== chapterId) {
            changeChapter(resumePoint.chapterId);
            return;
        }
        document.getElementById(`page-${resumePoint.pageNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (error)
        return _jsxs("main", { className: "reader-error", children: [_jsx("p", { children: error }), _jsx(Link, { to: "/", children: "Back to library" })] });
    return (_jsxs("main", { className: `reader-shell ${controlsVisible ? "" : "controls-hidden"}`, onClick: scrollDownOnTap, children: [_jsxs("header", { className: "reader-controls", children: [_jsxs("div", { className: "reader-title", children: [_jsx(Link, { to: "/", className: "brand", children: "M" }), _jsxs("div", { children: [_jsx("strong", { children: manhwa?.title ?? "Manhwa Reader" }), _jsx("span", { children: chapterLabel })] })] }), _jsxs("div", { className: "chapter-navigation", children: [_jsx("button", { className: "chapter-step", disabled: !previous, onClick: () => previous && changeChapter(previous._id), children: "\u2190 Previous" }), _jsxs("select", { "aria-label": "Choose chapter", value: chapterId ?? "", onChange: (event) => changeChapter(event.target.value), children: [_jsx("option", { value: "", disabled: true, children: "Choose chapter" }), chapters.map((item) => _jsxs("option", { value: item._id, children: ["Chapter ", item.chapterNumber, ": ", item.title] }, item._id))] }), _jsx("button", { className: "chapter-step", disabled: !next, onClick: () => next && changeChapter(next._id), children: "Next \u2192" }), _jsx("button", { className: "continue-button", disabled: !resumePoint, onClick: continueReading, children: "Continue reading" })] })] }), !loading && _jsxs("div", { className: "reader-progress", "aria-live": "polite", children: [Math.min(currentPage, pages.length), "/", pages.length] }), loading && _jsxs("div", { className: "reader-loading", children: [_jsx("span", { className: "spinner" }), "Loading chapter\u2026"] }), !loading && _jsx("section", { className: "page-stack", "aria-live": "polite", children: pages.map((page) => _jsx(LazyPage, { page: page, onVisible: recordVisible }, page.pageNumber)) }), !loading && _jsxs("footer", { className: "reader-footer", children: [_jsx("button", { disabled: !previous, onClick: () => previous && changeChapter(previous._id), children: "\u2190 Previous chapter" }), _jsxs("span", { children: [currentPage, " / ", pages.length] }), _jsx("button", { disabled: !next, onClick: () => next && changeChapter(next._id), children: "Next chapter \u2192" })] }), showTopButton && _jsx("button", { className: "reader-top-button", "aria-label": "Return to top", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }), children: "\u2191" })] }));
}

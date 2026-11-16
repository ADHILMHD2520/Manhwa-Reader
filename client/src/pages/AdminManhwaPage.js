import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { admin } from "../api";
import { ChapterList, ChapterUploadPanel } from "../components/ChapterUploadPanel";
const emptyForm = { title: "", description: "", author: "", artist: "", genres: "", status: "ongoing" };
function manhwaToForm(manhwa) {
    return { title: manhwa.title, description: manhwa.description, author: manhwa.author, artist: manhwa.artist, genres: manhwa.genres.join(", "), status: manhwa.status };
}
function errorMessage(error) {
    if (axios.isAxiosError(error))
        return error.response?.data?.message ?? error.message;
    return error instanceof Error ? error.message : "Request failed";
}
export function AdminManhwaPage() {
    const [manhwa, setManhwa] = useState([]);
    const [activeId, setActiveId] = useState();
    const [chapters, setChapters] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [cover, setCover] = useState();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const activeManhwa = manhwa.find((item) => item._id === activeId);
    const loadManhwa = useCallback(async () => {
        try {
            const data = await admin.manhwa();
            setManhwa(data);
        }
        catch (error) {
            setNotice(`Could not load admin data: ${errorMessage(error)}`);
        }
    }, []);
    const loadChapters = useCallback(async () => {
        if (!activeId)
            return setChapters([]);
        try {
            setChapters(await admin.chapters(activeId));
        }
        catch (error) {
            setNotice(errorMessage(error));
        }
    }, [activeId]);
    useEffect(() => { void loadManhwa(); }, [loadManhwa]);
    useEffect(() => { void loadChapters(); }, [loadChapters]);
    useEffect(() => {
        if (!chapters.some((chapter) => chapter.processingStatus === "pending" || chapter.processingStatus === "processing"))
            return;
        const timer = window.setInterval(() => void loadChapters(), 3_000);
        return () => window.clearInterval(timer);
    }, [chapters, loadChapters]);
    function selectManhwa(id) {
        const next = manhwa.find((item) => item._id === id);
        setActiveId(id || undefined);
        setForm(next ? manhwaToForm(next) : emptyForm);
        setCover(undefined);
        setNotice("");
    }
    function newManhwa() {
        setActiveId(undefined);
        setForm(emptyForm);
        setCover(undefined);
        setChapters([]);
        setNotice("");
    }
    async function submit(event) {
        event.preventDefault();
        if (!activeId && !cover)
            return setNotice("Choose a cover image before creating a manhwa.");
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (cover)
            data.append("coverImage", cover);
        setBusy(true);
        try {
            const saved = activeId ? await admin.updateManhwa(activeId, data) : await admin.createManhwa(data);
            await loadManhwa();
            setActiveId(saved._id);
            setForm(manhwaToForm(saved));
            setCover(undefined);
            setNotice(activeId ? "Manhwa details saved." : "Manhwa created. You can add chapter PDFs now.");
        }
        catch (error) {
            setNotice(errorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }
    async function deleteActive() {
        if (!activeManhwa || !window.confirm(`Delete ${activeManhwa.title}, every chapter, and its stored assets?`))
            return;
        setBusy(true);
        try {
            await admin.deleteManhwa(activeManhwa._id);
            await loadManhwa();
            newManhwa();
            setNotice("Manhwa deleted.");
        }
        catch (error) {
            setNotice(errorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("main", { className: "admin-page", children: [_jsxs("header", { className: "app-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "MANHWA CMS" }), _jsx("h1", { children: "Library management" })] }), _jsx("a", { href: "/", className: "quiet-link", children: "Open reader" })] }), _jsxs("div", { className: "admin-layout", children: [_jsxs("aside", { className: "library-sidebar", children: [_jsxs("div", { className: "sidebar-heading", children: [_jsx("h2", { children: "Manhwa" }), _jsx("button", { onClick: newManhwa, children: "+ New" })] }), !manhwa.length && _jsx("p", { className: "empty", children: "Create your first title." }), manhwa.map((item) => _jsxs("button", { className: `manhwa-item ${item._id === activeId ? "active" : ""}`, onClick: () => selectManhwa(item._id), children: [_jsx("img", { src: item.coverImage, alt: "" }), _jsx("span", { children: item.title })] }, item._id))] }), _jsxs("div", { className: "admin-content", children: [_jsxs("section", { className: "admin-panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: activeManhwa ? "Edit manhwa" : "Create manhwa" }), activeManhwa && _jsx("button", { className: "danger", onClick: () => void deleteActive(), disabled: busy, children: "Delete title" })] }), _jsxs("form", { className: "manhwa-form", onSubmit: submit, children: [_jsxs("label", { children: ["Title", _jsx("input", { required: true, value: form.title, onChange: (event) => setForm({ ...form, title: event.target.value }) })] }), _jsxs("label", { children: ["Author", _jsx("input", { required: true, value: form.author, onChange: (event) => setForm({ ...form, author: event.target.value }) })] }), _jsxs("label", { children: ["Artist", _jsx("input", { required: true, value: form.artist, onChange: (event) => setForm({ ...form, artist: event.target.value }) })] }), _jsxs("label", { children: ["Status", _jsxs("select", { value: form.status, onChange: (event) => setForm({ ...form, status: event.target.value }), children: [_jsx("option", { value: "ongoing", children: "Ongoing" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "hiatus", children: "Hiatus" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] })] }), _jsxs("label", { children: ["Genres", _jsx("input", { value: form.genres, placeholder: "Action, Fantasy", onChange: (event) => setForm({ ...form, genres: event.target.value }) })] }), _jsxs("label", { children: ["Cover image", _jsx("input", { type: "file", accept: "image/*", required: !activeManhwa, onChange: (event) => setCover(event.target.files?.[0]) })] }), _jsxs("label", { className: "wide", children: ["Description", _jsx("textarea", { required: true, rows: 5, value: form.description, onChange: (event) => setForm({ ...form, description: event.target.value }) })] }), _jsx("button", { className: "primary wide", type: "submit", disabled: busy, children: busy ? "Saving…" : activeManhwa ? "Save changes" : "Create manhwa" })] }), notice && _jsx("p", { className: "form-message", children: notice })] }), activeManhwa && _jsxs(_Fragment, { children: [_jsx(ChapterUploadPanel, { manhwa: activeManhwa, onChanged: loadChapters }), _jsx(ChapterList, { chapters: chapters, onChanged: loadChapters })] })] })] })] }));
}

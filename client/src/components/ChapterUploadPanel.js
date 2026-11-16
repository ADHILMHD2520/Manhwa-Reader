import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { admin } from "../api";
import { ProgressBar } from "./ProgressBar";
function chapterNumberFromName(filename, fallback) {
    const match = filename.match(/(?:chapter|ch\.?)[ _-]?(\d+(?:\.\d+)?)/i) ?? filename.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : fallback;
}
export function ChapterUploadPanel({ manhwa, onChanged }) {
    const [file, setFile] = useState();
    const [chapterNumber, setChapterNumber] = useState(1);
    const [title, setTitle] = useState("");
    const [progress, setProgress] = useState();
    const [message, setMessage] = useState("");
    const [bulkRows, setBulkRows] = useState([]);
    const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
    async function submitSingle(event) {
        event.preventDefault();
        if (!file)
            return setMessage("Choose a PDF first.");
        const form = new FormData();
        form.append("manhwaId", manhwa._id);
        form.append("chapterNumber", String(chapterNumber));
        form.append("title", title || `Chapter ${chapterNumber}`);
        form.append("pdf", file);
        setProgress(0);
        setMessage("Uploading PDF…");
        try {
            await admin.uploadChapter(form, setProgress);
            setMessage("Queued. The worker will publish it after processing completes.");
            setFile(undefined);
            setTitle("");
            await onChanged();
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Upload failed");
        }
        finally {
            setProgress(undefined);
        }
    }
    function chooseBulk(event) {
        const files = [...(event.target.files ?? [])];
        setBulkRows(files.map((bulkFile, index) => {
            const number = chapterNumberFromName(bulkFile.name, index + 1);
            return { file: bulkFile, chapterNumber: number, title: `Chapter ${number}` };
        }));
    }
    async function submitBulk() {
        if (!bulkRows.length)
            return;
        const duplicate = bulkRows.some((row, index) => bulkRows.findIndex((candidate) => candidate.chapterNumber === row.chapterNumber) !== index);
        if (duplicate)
            return setMessage("Bulk chapter numbers must be unique.");
        const form = new FormData();
        form.append("manhwaId", manhwa._id);
        form.append("chapters", JSON.stringify(bulkRows.map(({ chapterNumber: number, title: rowTitle }) => ({ chapterNumber: number, title: rowTitle }))));
        bulkRows.forEach((row) => form.append("pdfs", row.file));
        setProgress(0);
        setMessage("Uploading chapter PDFs…");
        try {
            const response = await admin.bulkUpload(form, setProgress);
            const failures = response.data.results.filter((result) => !result.ok).length;
            setMessage(failures ? `${failures} file(s) could not be queued; check their filenames and chapter numbers.` : "All PDFs are queued for processing.");
            setBulkRows([]);
            await onChanged();
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Bulk upload failed");
        }
        finally {
            setProgress(undefined);
        }
    }
    return (_jsxs("section", { className: "admin-panel upload-panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: "Add chapters" }), _jsx("span", { children: "PDFs are converted in the background" })] }), _jsxs("form", { className: "chapter-form", onSubmit: submitSingle, children: [_jsxs("label", { children: ["Chapter number", _jsx("input", { type: "number", min: "0", step: "0.1", value: chapterNumber, onChange: (event) => setChapterNumber(Number(event.target.value)) })] }), _jsxs("label", { children: ["Chapter title", _jsx("input", { value: title, placeholder: `Chapter ${chapterNumber}`, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("label", { children: ["Chapter PDF", _jsx("input", { type: "file", accept: "application/pdf,.pdf", onChange: (event) => setFile(event.target.files?.[0]) })] }), _jsx("button", { className: "primary", type: "submit", disabled: progress !== undefined, children: "Upload chapter" })] }), previewUrl && _jsxs("details", { className: "pdf-preview", children: [_jsx("summary", { children: "Preview selected PDF" }), _jsx("object", { data: previewUrl, type: "application/pdf", children: "Your browser cannot preview this PDF." })] }), _jsxs("div", { className: "bulk-area", children: [_jsxs("label", { children: ["Bulk chapter PDFs", _jsx("input", { type: "file", accept: "application/pdf,.pdf", multiple: true, onChange: chooseBulk })] }), bulkRows.length > 0 && _jsxs(_Fragment, { children: [_jsx("div", { className: "bulk-rows", children: bulkRows.map((row, index) => _jsxs("div", { className: "bulk-row", children: [_jsx("span", { title: row.file.name, children: row.file.name }), _jsx("input", { "aria-label": "Chapter number", type: "number", min: "0", step: "0.1", value: row.chapterNumber, onChange: (event) => setBulkRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, chapterNumber: Number(event.target.value) } : item)) }), _jsx("input", { "aria-label": "Chapter title", value: row.title, onChange: (event) => setBulkRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item)) })] }, `${row.file.name}-${index}`)) }), _jsxs("button", { type: "button", className: "secondary", disabled: progress !== undefined, onClick: () => void submitBulk(), children: ["Queue ", bulkRows.length, " PDFs"] })] })] }), progress !== undefined && _jsx(ProgressBar, { value: progress }), message && _jsx("p", { className: "form-message", children: message })] }));
}
export function ChapterList({ chapters, onChanged }) {
    const [previewing, setPreviewing] = useState();
    async function preview(chapter) {
        try {
            const url = await admin.previewPdf(chapter._id);
            setPreviewing(url);
        }
        catch {
            window.alert("The source PDF could not be opened.");
        }
    }
    async function edit(chapter) {
        const numberText = window.prompt("Chapter number", String(chapter.chapterNumber));
        const chapterTitle = window.prompt("Chapter title", chapter.title);
        if (numberText === null || chapterTitle === null)
            return;
        await admin.updateChapter(chapter._id, { chapterNumber: Number(numberText), title: chapterTitle });
        await onChanged();
    }
    async function remove(chapter) {
        if (!window.confirm(`Delete Chapter ${chapter.chapterNumber} and all its stored files?`))
            return;
        await admin.deleteChapter(chapter._id);
        await onChanged();
    }
    async function retry(chapter) {
        try {
            await admin.retryChapter(chapter._id);
            await onChanged();
        }
        catch {
            window.alert("The retry could not be scheduled.");
        }
    }
    return (_jsxs("section", { className: "admin-panel", children: [_jsxs("div", { className: "panel-heading", children: [_jsx("h2", { children: "Chapters" }), _jsxs("span", { children: [chapters.length, " total"] })] }), previewing && _jsx("div", { className: "modal", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "modal-card", children: [_jsx("button", { className: "icon-button", onClick: () => setPreviewing(undefined), children: "\u00D7" }), _jsx("iframe", { title: "Source PDF preview", src: previewing })] }) }), !chapters.length ? _jsx("p", { className: "empty", children: "No chapters yet." }) : _jsx("div", { className: "chapter-list", children: chapters.map((chapter) => _jsxs("article", { className: "chapter-row", children: [_jsxs("div", { children: [_jsxs("strong", { children: ["Chapter ", chapter.chapterNumber, ": ", chapter.title] }), _jsx("small", { children: chapter.pageCount ? `${chapter.pageCount} pages` : "Waiting for page scan" })] }), _jsxs("div", { className: `status status-${chapter.processingStatus}`, children: [_jsx("span", { children: chapter.processingStatus ?? "pending" }), chapter.processingStatus !== "completed" && _jsx(ProgressBar, { value: chapter.processingProgress ?? 0 }), chapter.processingError && _jsx("small", { className: "error-text", children: chapter.processingError })] }), _jsxs("div", { className: "row-actions", children: [_jsx("button", { onClick: () => void preview(chapter), children: "PDF" }), chapter.processingStatus === "failed" && _jsx("button", { onClick: () => void retry(chapter), children: "Retry" }), _jsx("button", { onClick: () => void edit(chapter), children: "Edit" }), _jsx("button", { className: "danger", onClick: () => void remove(chapter), children: "Delete" })] })] }, chapter._id)) })] }));
}

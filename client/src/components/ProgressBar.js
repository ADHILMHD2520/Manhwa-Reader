import { jsx as _jsx } from "react/jsx-runtime";
export function ProgressBar({ value }) {
    return (_jsx("div", { className: "progress-track", "aria-label": `${value}% complete`, children: _jsx("div", { className: "progress-value", style: { width: `${Math.max(0, Math.min(100, value))}%` } }) }));
}

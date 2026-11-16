import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { adminAuth, setAdminToken } from "../api";

export function AdminLogin({ onAuthenticated }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            const { accessToken } = await adminAuth.login(email, password);
            setAdminToken(accessToken);
            onAuthenticated();
        }
        catch (error) {
            setMessage(error.response?.data?.message ?? "Unable to sign in. Check your credentials.");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx("main", 
        { className: "admin-page admin-login-shell", children: _jsxs("section", 
            { className: "admin-login-card", children: [_jsx("p", { className: "eyebrow", children: "MANHWA CMS" }), _jsx("h1", { children: "Admin sign in" }), _jsx("p", { children: "Use the administrator credentials configured on the server." }), _jsxs("form", { onSubmit: submit, children: [_jsxs("label", { children: ["Email", _jsx("input", { type: "email", autoComplete: "username", value: email, onChange: (event) => setEmail(event.target.value), required: true })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", autoComplete: "current-password", value: password, onChange: (event) => setPassword(event.target.value), required: true })] }), _jsx("button", { className: "primary", type: "submit", disabled: busy, children: busy ? "Signing in..." : "Sign in" })] }), 
            message && _jsx("p", { className: "form-message login-error", children: message })] }) }));
}

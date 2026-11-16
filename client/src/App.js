import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { ReaderPage } from "./pages/ReaderPage";
import { PublicHomePage } from "./pages/PublicHomePage";
import { ManhwaDetailPage } from "./pages/ManhwaDetailPage";
export default function App() {
    return _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(PublicHomePage, {}) }), _jsx(Route, { path: "/manhwa/:manhwaId", element: _jsx(ManhwaDetailPage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminRoute, {}) }), _jsx(Route, { path: "/read/:manhwaId/:chapterId?", element: _jsx(ReaderPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] });
}

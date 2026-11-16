import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getAdminToken } from "../api";
import { AdminLogin } from "./AdminLogin";
import { AdminManhwaPage } from "../pages/AdminManhwaPage";

export function AdminRoute() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAdminToken()));
    useEffect(() => {
        const handleSignOut = () => setIsAuthenticated(false);
        window.addEventListener("manhwa:admin-signed-out", handleSignOut);
        return () => window.removeEventListener("manhwa:admin-signed-out", handleSignOut);
    }, []);
    if (!isAuthenticated) {
        return _jsx(AdminLogin, { onAuthenticated: () => setIsAuthenticated(true) });
    }
    return _jsx(AdminManhwaPage, {});
}

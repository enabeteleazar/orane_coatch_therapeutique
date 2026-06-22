import Home from "@/pages/Home";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/dashboard" || pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  return <Home />;
}

export default App;

import Home from "@/pages/Home";
import AdminBookingSlots from "@/pages/AdminBookingSlots";

function App() {
  if (window.location.pathname === "/admin/creneaux") {
    return <AdminBookingSlots />;
  }

  return <Home />;
}

export default App;

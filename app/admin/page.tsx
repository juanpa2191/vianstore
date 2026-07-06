import { redirect } from "next/navigation";

// La landing de /admin no tiene contenido propio en el MVP — la sub-nav vive en el layout
// y la primera pantalla útil es el listado de productos.
export default function AdminHomePage() {
  redirect("/admin/products");
}

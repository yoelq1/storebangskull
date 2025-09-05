// admin/admin-products.js
import { supabase } from "../supabase.js";

const form = document.getElementById("add-product-form");
const tableBody = document.getElementById("product-list");

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Gagal load produk:", error.message);
    return;
  }
  renderProducts(data);
}

function renderProducts(products) {
  tableBody.innerHTML = "";
  products.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>Rp${p.price}</td>
      <td><img src="${p.image_url}" width="50"></td>
      <td>
        <button onclick="deleteProduct(${p.id})">Hapus</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("product-name").value;
  const price = parseInt(document.getElementById("product-price").value);
  const image_url = document.getElementById("product-image").value;

  const { error } = await supabase.from("products").insert([{ name, price, image_url }]);
  if (error) {
    alert("Gagal tambah produk: " + error.message);
  } else {
    form.reset();
  }
});

window.deleteProduct = async (id) => {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    alert("Gagal hapus produk: " + error.message);
  }
};

// Realtime
supabase.channel("products-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
    loadProducts();
  })
  .subscribe();

loadProducts();

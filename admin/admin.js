import { supabase } from '../supabase.js';

// Ambil produk
async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*");
  const tbody = document.getElementById("product-table");
  if (error) {
    alert("Gagal load produk: " + error.message);
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>Rp ${p.price}</td>
      <td><img src="${p.image_url}" width="50"></td>
      <td>
        <button onclick="deleteProduct(${p.id})">Hapus</button>
      </td>
    </tr>
  `).join("");
}

// Tambah produk
document.getElementById("add-product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const image_url = document.getElementById("image_url").value;

  const { error } = await supabase.from("products").insert([{ name, price, image_url }]);
  if (error) {
    alert("Gagal tambah produk: " + error.message);
  } else {
    alert("Produk berhasil ditambahkan!");
    loadProducts();
  }
});

// Hapus produk
window.deleteProduct = async (id) => {
  if (confirm("Hapus produk ini?")) {
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  }
};

loadProducts();

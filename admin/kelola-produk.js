// ambil session admin
const productForm = document.getElementById("addProductForm");
const productTableBody = document.querySelector("#productTable tbody");

// render produk
async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Load error:", error);
    return;
  }

  productTableBody.innerHTML = "";
  data.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.name}</td>
      <td>Rp ${p.price}</td>
      <td><img src="${p.image_url}" width="80"></td>
      <td>
        <button onclick="deleteProduct('${p.id}')">Hapus</button>
      </td>
    `;
    productTableBody.appendChild(row);
  });
}

// tambah produk
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("productName").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const imageUrl = document.getElementById("productImage").value;

  const { error } = await supabase.from("products").insert([{ name, price, image_url: imageUrl }]);

  if (error) {
    alert("Gagal tambah produk: " + error.message);
    console.error(error);
  } else {
    alert("Produk berhasil ditambahkan!");
    productForm.reset();
    loadProducts();
  }
});

// hapus produk
async function deleteProduct(id) {
  if (!confirm("Yakin hapus produk ini?")) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    alert("Gagal hapus produk: " + error.message);
  } else {
    loadProducts();
  }
}

// realtime listener produk
supabase.channel("products-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts)
  .subscribe();

loadProducts();

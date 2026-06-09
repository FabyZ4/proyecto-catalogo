// ==========================================================================
// MÓDULO PRINCIPAL: CATÁLOGO, AUTENTICACIÓN Y FILTROS
// ==========================================================================

const contenedor = document.getElementById('lista-productos');
const btnAbrirLogin = document.getElementById('btnAbrirLogin');
const modalLogin = document.getElementById('modalLogin');
const btnPlus = document.getElementById('abrirForm'); 
const modalForm = document.getElementById('modalForm');
const modalDetalle = document.getElementById('modalDetalle');
const form = document.getElementById('form-producto');
const filtroEstado = document.getElementById('filtroEstado');

// ==========================================
// CONTROL DE MODALES (CORREGIDO Y BLINDADO)
// ==========================================

if (btnAbrirLogin) {
    btnAbrirLogin.addEventListener('click', () => {
        if (!modoAdmin) { 
            if (modalLogin) modalLogin.style.display = "flex"; 
        } else { 
            salirModoAdmin(); 
        }
    });
}

if (btnPlus) {
    btnPlus.onclick = () => { 
        editandoId = null; 
        form.reset(); 
        document.getElementById('edit-id').value = ""; 
        campoUrlHidden.value = ""; 
        archivosPendientes = []; 
        actualizarMiniaturasEditor(); 
        modalForm.style.display = "flex"; 
    };
}

// 🔥 ESCUCHADORES REFORZADOS PARA CERRAR MODALES CON LA 'X'
document.getElementById('cerrarLogin')?.addEventListener('click', () => {
    if (modalLogin) modalLogin.style.display = "none";
});

document.getElementById('cerrarModal')?.addEventListener('click', () => {
    if (modalForm) modalForm.style.display = "none";
});

document.getElementById('cerrarDetalle')?.addEventListener('click', () => {
    if (modalDetalle) modalDetalle.style.display = "none";
});

// --- Autenticación ---
document.getElementById('btnConfirmarLogin').onclick = async () => {
    const email = document.getElementById('usuarioAdmin').value; 
    const pass = document.getElementById('passAdmin').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

    if (error) {
        document.getElementById('errorLogin').innerText = "Invalido: " + error.message;
        document.getElementById('errorLogin').style.display = "block";
    } else {
        modoAdmin = true; entrarModoAdmin(); modalLogin.style.display = "none"; cargar(); 
    }
};

function entrarModoAdmin() {
    btnAbrirLogin.innerHTML = "&#128682;"; btnAbrirLogin.classList.add('admin-activo');
    if (filtroEstado) filtroEstado.style.setProperty('display', 'inline-block', 'important');
    if (btnPlus) btnPlus.style.display = "flex";
}

function salirModoAdmin() {
    supabaseClient.auth.signOut(); modoAdmin = false;
    btnAbrirLogin.innerHTML = "&#128274;"; btnAbrirLogin.classList.remove('admin-activo');
    if (filtroEstado) filtroEstado.style.setProperty('display', 'none', 'important');
    if (btnPlus) btnPlus.style.display = "none";
    cargar();
}

// --- Operaciones CRUD de Productos ---
async function cargar() {
    let query = supabaseClient.from('producto').select('id_producto, nombre_producto, precio, descripcion, disponible, imagen_url, id_categoria, id_tipo, categoria(nombre_categoria), tipo(nombre_tipo)');
    if (!modoAdmin) query = query.eq('disponible', true);
    const { data, error } = await query;
    if (!error) { productosBase = data; renderizarProductos(productosBase); }
}

function renderizarProductos(lista) {
    contenedor.innerHTML = '';
    lista.forEach(p => {
        const tieneFoto = p.imagen_url && p.imagen_url !== "null" && p.imagen_url.trim() !== "";
        const primeraFoto = tieneFoto ? p.imagen_url.split(',')[0].trim() : 'imagenes/placeholder.png';
        const div = document.createElement('div');
        div.className = `tarjeta ${modoAdmin && !p.disponible ? 'oculto-admin' : ''}`;
        div.onclick = (e) => { if (!e.target.classList.contains('btn-editar')) abrirDetalle(p.id_producto); };
        div.innerHTML = `
            <img src="${primeraFoto}">
            <h3>${p.nombre_producto || 'Sin nombre'}</h3>
            <p>${p.categoria?.nombre_categoria || 'General'}</p>
            <p class="precio">$${Number(p.precio || 0).toLocaleString('es-CL')}</p>
            ${modoAdmin ? `<button class="btn-editar" onclick="event.stopPropagation(); abrirEditar(${p.id_producto})">Editar</button>` : ''}
        `;
        contenedor.appendChild(div);
    });
}

function abrirDetalle(id) {
    const p = productosBase.find(x => Number(x.id_producto) === Number(id));
    if (!p) return;
    document.getElementById('detNombre').textContent = p.nombre_producto;
    document.getElementById('detPrecio').textContent = `$${Number(p.precio).toLocaleString('es-CL')}`;
    document.getElementById('detDescripcion').textContent = p.descripcion || "Sin descripción.";
    const divMiniaturas = document.getElementById('miniaturas');
    const fotoPrincipal = document.getElementById('fotoPrincipal');
    if (divMiniaturas) divMiniaturas.innerHTML = '';

    if (p.imagen_url && p.imagen_url.trim() !== "" && p.imagen_url !== "null") {
        const listaFotos = p.imagen_url.split(',').map(r => r.trim());
        fotoPrincipal.src = listaFotos[0];
        listaFotos.forEach((url, idx) => {
            const imgMin = document.createElement('img'); imgMin.src = url; if (idx === 0) imgMin.className = 'activa';
            imgMin.onclick = () => { document.querySelectorAll('#miniaturas img').forEach(i => i.classList.remove('activa')); imgMin.classList.add('activa'); fotoPrincipal.src = url; };
            divMiniaturas.appendChild(imgMin);
        });
    } else { fotoPrincipal.src = 'imagenes/placeholder.png'; }
    modalDetalle.style.setProperty('display', 'flex', 'important');
}

window.abrirEditar = (id) => {
    const p = productosBase.find(x => x.id_producto === id);
    if(!p) return;
    editandoId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('nombre').value = p.nombre_producto;
    document.getElementById('categoria').value = p.id_categoria;
    document.getElementById('tipo').value = p.id_tipo;
    document.getElementById('precio').value = p.precio;
    document.getElementById('imagen_url').value = p.imagen_url || "";
    document.getElementById('descripcion').value = p.descripcion || "";
    document.getElementById('disponible').checked = p.disponible;
    
    actualizarMiniaturasEditor(); 
    modalForm.style.display = "flex";
};

// Asegúrate de que esta sección en tu script.js use la cola global de forma limpia
form.onsubmit = async (e) => {
    e.preventDefault();

    let urlsAcumuladas = campoUrlHidden.value && campoUrlHidden.value.trim() !== "" 
        ? campoUrlHidden.value.split(',').map(r => r.trim()) 
        : [];

    // Llamamos asíncronamente a las funciones alojadas en storage.js
    if (archivosPendientes.length > 0) {
        for (let i = 0; i < archivosPendientes.length; i++) {
            // Aquí se conecta con el storage.js modular que sí comprime y genera el .jpg
            const urlSubida = await subirImagenASupabase(archivosPendientes[i]);
            if (urlSubida) urlsAcumuladas.push(urlSubida);
        }
    }

    const datosProducto = {
        nombre_producto: document.getElementById('nombre').value,
        precio: parseInt(document.getElementById('precio').value),
        descripcion: document.getElementById('descripcion').value,
        disponible: document.getElementById('disponible').checked,
        imagen_url: urlsAcumuladas.join(','), 
        id_categoria: parseInt(selectorCategoria.value) || null, 
        id_tipo: parseInt(selectorTipo.value) || null
    };

    const { error } = editandoId 
        ? await supabaseClient.from('producto').update(datosProducto).eq('id_producto', editandoId)
        : await supabaseClient.from('producto').insert([datosProducto]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        modalForm.style.display = "none";
        form.reset(); 
        editandoId = null; 
        archivosPendientes = []; // Vaciamos la cola de manera segura
        if (contenedorMiniaturas) contenedorMiniaturas.innerHTML = '';
        cargar(); 
    }
};

async function eliminarProducto(id) {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
        const producto = productosBase.find(x => x.id_producto === id);
        if (producto?.imagen_url && producto.imagen_url !== "null") {
            const urls = producto.imagen_url.split(',').map(r => r.trim());
            for (const url of urls) await eliminarImagenDeSupabase(url); // Borra las fotos físicas
        }
        await supabaseClient.from('producto').delete().eq('id_producto', id);
        cargar();
    }
}

// --- Filtros en Cascada ---
function aplicarFiltros() {
    let filtrados = [...productosBase];
    const txt = document.getElementById('buscadorNombre')?.value.toLowerCase().trim() || "";
    if (txt) filtrados = filtrados.filter(p => p.nombre_producto?.toLowerCase().includes(txt));
    
    const cat = document.getElementById('filtroCategoria')?.value || "Todos";
    if (cat !== "Todos") filtrados = filtrados.filter(p => p.categoria?.nombre_categoria === cat);
    
    if (modoAdmin) {
        const est = document.getElementById('filtroEstado')?.value || "todos";
        if (est === "visibles") filtrados = filtrados.filter(p => p.disponible);
        else if (est === "ocultos") filtrados = filtrados.filter(p => !p.disponible);
    }
    const ord = document.getElementById('ordenPrecio')?.value || "defecto";
    if (ord === "asc") filtrados.sort((a,b) => Number(a.precio) - Number(b.precio));
    else if (ord === "desc") filtrados.sort((a,b) => Number(b.precio) - Number(a.precio));

    renderizarProductos(filtrados);
}

document.getElementById('buscadorNombre')?.addEventListener('input', aplicarFiltros);
document.getElementById('filtroCategoria')?.addEventListener('change', aplicarFiltros);
document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);
document.getElementById('ordenPrecio')?.addEventListener('change', aplicarFiltros);

// Carga Inicial
cargarCategorias();
cargarTipos();
cargar();
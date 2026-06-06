// ==========================================
// 1. INICIALIZACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://qgtnezetemljrudcefef.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_x86K93yqFumhOTqrC7MCWA_KQQOw-mW";     

// Cambiamos el nombre de la constante para evitar conflictos de redundancia con la librería externa
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Selectores Globales ---
const contenedor = document.getElementById('lista-productos');
const btnAbrirLogin = document.getElementById('btnAbrirLogin');
const modalLogin = document.getElementById('modalLogin');
const btnPlus = document.getElementById('abrirForm'); 
const modalForm = document.getElementById('modalForm');
const modalDetalle = document.getElementById('modalDetalle');
const form = document.getElementById('form-producto');
const filtroEstado = document.getElementById('filtroEstado');
const campoUrlHidden = document.getElementById('imagen_url');
const selectorCategoria = document.getElementById('categoria'); 
const selectorTipo = document.getElementById('tipo');

let modoAdmin = false;
let editandoId = null;
let productosBase = [];

// ==========================================
// 2. CONTROL DEL BOTÓN CANDADO (LOGIN / LOGOUT)
// ==========================================
if (btnAbrirLogin) {
    btnAbrirLogin.addEventListener('click', () => {
        console.log("¡Botón candado pulsado! Modo Admin actual:", modoAdmin);
        if (!modoAdmin) {
            if (modalLogin) modalLogin.style.display = "flex";
        } else {
            salirModoAdmin();
        }
    });
}

// Control de cierres de Modales con la 'X'
document.getElementById('cerrarLogin').onclick = () => { modalLogin.style.display = "none"; };
document.getElementById('cerrarModal').onclick = () => { modalForm.style.display = "none"; };
document.getElementById('cerrarDetalle').onclick = () => { modalDetalle.style.display = "none"; };

// Botón '+' para nueva pieza
if (btnPlus) {
    btnPlus.onclick = () => { 
        editandoId = null; 
        form.reset(); 
        document.getElementById('edit-id').value = ""; 
        campoUrlHidden.value = ""; 
        modalForm.style.display = "flex"; 
    };
}

// ==========================================
// 3. AUTENTICACIÓN (PROCESAR INICIO DE SESIÓN)
// ==========================================
document.getElementById('btnConfirmarLogin').onclick = async () => {
    const email = document.getElementById('usuarioAdmin').value; 
    const pass = document.getElementById('passAdmin').value;
    const errorMsg = document.getElementById('errorLogin');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: pass
    });

    if (error) {
        errorMsg.innerText = "Credenciales incorrectas: " + error.message;
        errorMsg.style.display = "block";
    } else {
        modoAdmin = true;
        entrarModoAdmin(); 
        modalLogin.style.display = "none";
        errorMsg.style.display = "none";
        cargar(); 
    }
};

function entrarModoAdmin() {
    btnAbrirLogin.innerHTML = "&#128682;"; 
    btnAbrirLogin.title = "Cerrar Sesión Administrativa";
    btnAbrirLogin.classList.add('admin-activo');
    if (filtroEstado) filtroEstado.style.setProperty('display', 'inline-block', 'important');
    if (btnPlus) btnPlus.style.display = "flex";
}

function salirModoAdmin() {
    supabaseClient.auth.signOut();
    modoAdmin = false;
    btnAbrirLogin.innerHTML = "&#128274;"; 
    btnAbrirLogin.title = "Acceso Administrativo";
    btnAbrirLogin.classList.remove('admin-activo');
    if (filtroEstado) filtroEstado.style.setProperty('display', 'none', 'important');
    if (btnPlus) btnPlus.style.display = "none";
    cargar();
}

// ==========================================
// 4. OBTENER PRODUCTOS (SELECT)
// ==========================================
async function cargar() {
    let query = supabaseClient
        .from('producto')
        .select(`
            id_producto, nombre_producto, precio, descripcion, disponible, imagen_url, id_categoria, id_tipo,
            categoria ( nombre_categoria ),
            tipo ( nombre_tipo )
        `);

    if (!modoAdmin) {
        query = query.eq('disponible', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error cargando productos:", error);
        return;
    }

    productosBase = data;
    renderizarProductos(productosBase); 
}

function renderizarProductos(lista) {
    contenedor.innerHTML = '';
    if (!lista || lista.length === 0) {
        contenedor.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #8c7867;">No hay productos disponibles en el catálogo.</p>';
        return;
    }

    lista.forEach(p => {
        const tieneFoto = p.imagen_url && p.imagen_url !== "null" && p.imagen_url.trim() !== "";
        const primeraFoto = tieneFoto ? p.imagen_url : 'imagenes/placeholder.png';

        const div = document.createElement('div');
        div.className = `tarjeta ${modoAdmin && !p.disponible ? 'oculto-admin' : ''}`;
        
        div.onclick = function(e) {
            if (e.target.classList.contains('btn-editar')) return;
            abrirDetalle(p.id_producto);
        };

        div.innerHTML = `
            <img src="${primeraFoto}" onerror="this.onerror=null; this.src='imagenes/placeholder.png';">
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
    document.getElementById('fotoPrincipal').src = p.imagen_url || 'imagenes/placeholder.png';
    modalDetalle.style.setProperty('display', 'flex', 'important');
}

window.abrirEditar = (id) => {
    const p = productosBase.find(x => x.id_producto === id);
    if(!p) return;
    editandoId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('nombre').value = p.nombre_producto;
    document.getElementById('categoria').value = p.id_categoria;
    document.getElementById('precio').value = p.precio;
    document.getElementById('imagen_url').value = p.imagen_url || "";
    document.getElementById('descripcion').value = p.descripcion || "";
    document.getElementById('disponible').checked = p.disponible;
    modalForm.style.display = "flex";
};

// ==========================================
// 5. SUBIR IMÁGENES AL BUCKET DE STORAGE
// ==========================================
async function subirImagenASupabase(file) {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `productos/${fileName}`;

    const { data, error } = await supabaseClient.storage
        .from('imagenes-productos')
        .upload(filePath, file);

    if (error) {
        alert("Error al subir imagen: " + error.message);
        return null;
    }

    const { data: urlData } = supabaseClient.storage
        .from('imagenes-productos')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// ==========================================
// 6. GUARDAR O EDITAR PRODUCTO (INSERT / UPDATE)
// ==========================================
form.onsubmit = async (e) => {
    e.preventDefault();

    const archivoImagen = document.getElementById('inputArchivo').files[0];
    let urlImagenFinal = campoUrlHidden.value; 

    if (archivoImagen) {
        const urlSubida = await subirImagenASupabase(archivoImagen);
        if (urlSubida) urlImagenFinal = urlSubida;
    }

    const datosProducto = {
        nombre_producto: document.getElementById('nombre').value,
        precio: parseInt(document.getElementById('precio').value),
        descripcion: document.getElementById('descripcion').value,
        disponible: document.getElementById('disponible').checked,
        imagen_url: urlImagenFinal,
        id_categoria: parseInt(selectorCategoria.value) || null, 
        id_tipo: parseInt(document.getElementById('tipo').value) || null
    };

    if (editandoId) {
        const { error } = await supabaseClient
            .from('producto')
            .update(datosProducto)
            .eq('id_producto', editandoId);

        if (error) alert("Error al editar: " + error.message);
    } else {
        const { error } = await supabaseClient
            .from('producto')
            .insert([datosProducto]);

        if (error) alert("Error al guardar: " + error.message);
    }

    modalForm.style.display = "none";
    form.reset();
    editandoId = null;
    cargar(); 
};

// ==========================================
// 7. ELIMINAR PRODUCTO
// ==========================================
async function eliminarProducto(id) {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
        const { error } = await supabaseClient
            .from('producto')
            .delete()
            .eq('id_producto', id);

        if (error) alert("Error al eliminar: " + error.message);
        else cargar();
    }
}

// ==========================================
// 8. GESTIÓN DINÁMICA DE CATEGORÍAS (SUPABASE)
// ==========================================

// Función para cargar las categorías desde la base de datos en los selects
async function cargarCategorias() {
    const f = document.getElementById('filtroCategoria'); // Select de la barra principal
    const s = document.getElementById('categoria');       // Select dentro del formulario de pieza

    if (!f || !s) return;

    // Traemos las categorías ordenadas alfabéticamente
    const { data: cats, error } = await supabaseClient
        .from('categoria')
        .select('*')
        .order('nombre_categoria', { ascending: true });

    if (error) {
        console.error("Error al cargar categorías:", error);
        return;
    }

    // Reiniciamos los selectores
    f.innerHTML = '<option value="Todos">Todas las Categorías</option>';
    s.innerHTML = '';

    // Rellenamos las opciones con los datos reales de Supabase
    cats.forEach(c => {
        f.innerHTML += `<option value="${c.nombre_categoria}">${c.nombre_categoria}</option>`;
        s.innerHTML += `<option value="${c.id_categoria}">${c.nombre_categoria}</option>`;
    });
}

// --- Listeners para los botones de gestión de categorías ---

// 1. Agregar Nueva Categoría
const btnNuevaCat = document.getElementById('btnNuevaCat');
if (btnNuevaCat) {
    btnNuevaCat.onclick = async () => {
        const nombre = prompt("Nombre de la nueva categoría:");
        if (!nombre || nombre.trim() === "") return;

        const { error } = await supabaseClient
            .from('categoria')
            .insert([{ nombre_categoria: nombre.trim() }]);

        if (error) {
            alert("Error al crear la categoría: " + error.message);
        } else {
            alert("Categoría creada con éxito");
            await cargarCategorias(); // Refresca las listas desplegables
        }
    };
}

// 2. Editar Nombre de Categoría Existente
const btnEditarCat = document.getElementById('btnEditarCat');
if (btnEditarCat) {
    btnEditarCat.onclick = async () => {
        const idCat = selectorCategoria.value; // Obtiene el ID seleccionado
        const nombreActual = selectorCategoria.options[selectorCategoria.selectedIndex]?.text;
        
        if (!idCat) return alert("Selecciona una categoría válida para editar.");
        
        const nuevoNombre = prompt(`Cambiar el nombre de "${nombreActual}" por:`, nombreActual);
        if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre === nombreActual) return;

        const { error } = await supabaseClient
            .from('categoria')
            .update({ nombre_categoria: nuevoNombre.trim() })
            .eq('id_categoria', idCat);

        if (error) {
            alert("Error al renombrar: " + error.message);
        } else {
            await cargarCategorias();
            cargar(); // Refresca el catálogo por si cambió el nombre vinculado
        }
    };
}

// 3. Eliminar Categoría
const btnEliminarCat = document.getElementById('btnEliminarCat');
if (btnEliminarCat) {
    btnEliminarCat.onclick = async () => {
        const idCat = selectorCategoria.value;
        const nombreCat = selectorCategoria.options[selectorCategoria.selectedIndex]?.text;
        if (!idCat) return alert("Selecciona una categoría.");
        
        if (confirm(`¿Estás seguro de eliminar la categoría "${nombreCat}"?\nNota: Asegúrate de desvincular sus productos primero para evitar conflictos de llaves foráneas.`)) {
            const { error } = await supabaseClient
                .from('categoria')
                .delete()
                .eq('id_categoria', idCat);

            if (error) {
                alert("No se pudo eliminar. Verifique que no tenga productos asociados: " + error.message);
            } else {
                alert("Categoría eliminada con éxito");
                await cargarCategorias();
                cargar();
            }
        }
    };
}

// ==========================================
// 9. GESTIÓN DINÁMICA DE TIPOS DE VENTA (SUPABASE)
// ==========================================

// Función para cargar los tipos desde la tabla 'tipo' de Supabase
async function cargarTipos() {
    if (!selectorTipo) return;

    const { data: tipos, error } = await supabaseClient
        .from('tipo')
        .select('*')
        .order('nombre_tipo', { ascending: true });

    if (error) {
        console.error("Error al cargar tipos de venta:", error);
        return;
    }

    // Limpiamos y rellenamos el selector del formulario usando id_tipo y nombre_tipo
    selectorTipo.innerHTML = '';
    tipos.forEach(t => {
        selectorTipo.innerHTML += `<option value="${t.id_tipo}">${t.nombre_tipo}</option>`;
    });
}

// 1. Agregar Nuevo Tipo de Venta
const btnNuevoTipo = document.getElementById('btnNuevoTipo');
if (btnNuevoTipo) {
    btnNuevoTipo.onclick = async () => {
        const nombre = prompt("Nombre del nuevo tipo de venta (ej: Unitario, Set, Mayorista):");
        if (!nombre || nombre.trim() === "") return;

        const { error } = await supabaseClient
            .from('tipo')
            .insert([{ nombre_tipo: nombre.trim() }]);

        if (error) {
            alert("Error al crear el tipo de venta: " + error.message);
        } else {
            alert("Tipo de venta creado con éxito");
            await cargarTipos(); // Refresca el selector en el formulario
        }
    };
}

// 2. Editar Tipo de Venta Existente
const btnEditarTipo = document.getElementById('btnEditarTipo');
if (btnEditarTipo) {
    btnEditarTipo.onclick = async () => {
        const idTipo = selectorTipo.value;
        const nombreActual = selectorTipo.options[selectorTipo.selectedIndex]?.text;
        
        if (!idTipo) return alert("Selecciona un tipo de venta válido para editar.");
        
        const nuevoNombre = prompt(`Cambiar el nombre de "${nombreActual}" por:`, nombreActual);
        if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre === nombreActual) return;

        const { error } = await supabaseClient
            .from('tipo')
            .update({ nombre_tipo: nuevoNombre.trim() })
            .eq('id_tipo', idTipo);

        if (error) {
            alert("Error al renombrar: " + error.message);
        } else {
            await cargarTipos();
            cargar(); // Refresca el catálogo por si se muestra el tipo en tarjetas
        }
    };
}

// 3. Eliminar Tipo de Venta
const btnEliminarTipo = document.getElementById('btnEliminarTipo');
if (btnEliminarTipo) {
    btnEliminarTipo.onclick = async () => {
        const idTipo = selectorTipo.value;
        const nombreTipo = selectorTipo.options[selectorTipo.selectedIndex]?.text;
        if (!idTipo) return alert("Selecciona un tipo de venta.");
        
        if (confirm(`¿Estás seguro de eliminar el tipo "${nombreTipo}"?\nNota: Los productos asociados quedarán sin tipo definido.`)) {
            const { error } = await supabaseClient
                .from('tipo')
                .delete()
                .eq('id_tipo', idTipo);

            if (error) {
                alert("No se pudo eliminar: " + error.message);
            } else {
                alert("Tipo de venta eliminado con éxito");
                await cargarTipos();
                cargar();
            }
        }
    };
}

// Ejecución inicial limpia
cargarCategorias();
cargarTipos();
cargar();
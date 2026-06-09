// ==========================================
// 1. INICIALIZACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://qgtnezetemljrudcefef.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_x86K93yqFumhOTqrC7MCWA_KQQOw-mW";     

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
const inputArchivo = document.getElementById('inputArchivo');
const contenedorMiniaturas = document.getElementById('contenedorMiniaturas');

let modoAdmin = false;
let editandoId = null;
let productosBase = [];
let archivosPendientes = []; // Array custom para gestionar imágenes antes de subir

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
        archivosPendientes = []; // Limpiamos la cola de archivos nuevos
        actualizarMiniaturasEditor(); // Inicia completamente limpio
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
        const primeraFoto = tieneFoto ? p.imagen_url.split(',')[0].trim() : 'imagenes/placeholder.png';

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
    
    const divMiniaturas = document.getElementById('miniaturas');
    const fotoPrincipal = document.getElementById('fotoPrincipal');
    
    if (divMiniaturas) divMiniaturas.innerHTML = '';

    if (p.imagen_url && p.imagen_url.trim() !== "" && p.imagen_url !== "null") {
        const listaFotos = p.imagen_url.split(',').map(r => r.trim());
        fotoPrincipal.src = listaFotos[0];

        if (listaFotos.length > 0 && divMiniaturas) {
            listaFotos.forEach((url, index) => {
                const imgMin = document.createElement('img');
                imgMin.src = url;
                if (index === 0) imgMin.className = 'activa';

                imgMin.onclick = () => {
                    document.querySelectorAll('#miniaturas img').forEach(i => i.classList.remove('activa'));
                    imgMin.classList.add('activa');
                    fotoPrincipal.src = url;
                };

                divMiniaturas.appendChild(imgMin);
            });
        }
    } else {
        fotoPrincipal.src = 'imagenes/placeholder.png';
    }

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
    
    archivosPendientes = []; // Reiniciamos los archivos al abrir editor
    actualizarMiniaturasEditor(); 
    modalForm.style.display = "flex";
};

// ==========================================
// 5. GESTIÓN DE IMÁGENES EN BUCKET DE STORAGE
// ==========================================

// Versión corregida: Sincroniza la extensión real de compresión (.jpg)
async function subirImagenASupabase(file) {
    if (!file) return null;

    // 1. Interceptamos el archivo y obtenemos la versión JPEG comprimida en el navegador
    const archivoOptimizado = await comprimirImagen(file);

    // 2. CORREGIDO: Como comprimirImagen() siempre retorna un 'image/jpeg', 
    // forzamos la extensión a 'jpg' para que coincida perfectamente con el Storage.
    const fileName = `${Date.now()}.jpg`;
    const filePath = `productos/${fileName}`;

    // 3. Subimos el archivo optimizado real al bucket
    const { data, error } = await supabaseClient.storage
        .from('imagenes-productos')
        .upload(filePath, archivoOptimizado, {
            contentType: 'image/jpeg', // Le avisamos explícitamente a Supabase el tipo de contenido
            upsert: true
        });

    if (error) {
        alert("Error al subir imagen: " + error.message);
        return null;
    }

    const { data: urlData } = supabaseClient.storage
        .from('imagenes-productos')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

// Función blindada y unificada para eliminar físicamente un archivo del Storage usando su URL pública
async function eliminarImagenDeSupabase(urlPublica) {
    if (!urlPublica || urlPublica.includes('placeholder.png')) return;

    try {
        console.log("URL recibida para intentar borrar del Storage:", urlPublica);

        // 1. Quitamos cualquier parámetro de consulta o token que empiece con "?" al final de la URL
        const urlLimpia = urlPublica.split('?')[0];

        // 2. Extraemos la ruta interna después del nombre de tu bucket ('imagenes-productos')
        const partes = urlLimpia.split('/imagenes-productos/');
        if (partes.length < 2) {
            console.error("No se pudo procesar el nombre del bucket en la URL.");
            return;
        }
        
        // Pasamos de "object/public/imagenes-productos/productos/123.jpg" a estrictamente "productos/123.jpg"
        const rutaArchivo = decodeURIComponent(partes[1]);
        console.log("Ruta exacta calculada para enviar a Supabase:", rutaArchivo);

        // 3. Ejecutamos la orden de eliminación en el Storage de Supabase
        const { data, error } = await supabaseClient.storage
            .from('imagenes-productos')
            .remove([rutaArchivo]);

        if (error) {
            console.error("Supabase rechazó el borrado físico:", error.message);
        } else {
            console.log("¡Éxito! Archivo destruido físicamente del Storage:", data);
        }
    } catch (err) {
        console.error("Error inesperado en la función de borrado de archivos:", err);
    }
}

// Dibuja las fotos guardadas en el input oculto dentro del contenedor visual del editor
function actualizarMiniaturasEditor() {
    if (!contenedorMiniaturas) return;
    contenedorMiniaturas.innerHTML = '';
    
    const valorHidden = campoUrlHidden.value;
    const tieneRutas = valorHidden && valorHidden !== "null" && valorHidden.trim() !== "";
    const rutas = tieneRutas ? valorHidden.split(',').map(r => r.trim()) : [];
    
    rutas.forEach((url, i) => {
        if (!url || url === "null" || url.trim() === "") return;
        
        const d = document.createElement('div');
        d.className = 'miniatura-item';
        d.innerHTML = `
            <img src="${url}" onerror="this.onerror=null; this.src='imagenes/placeholder.png';">
            <button type="button" class="btn-borrar-foto" title="Eliminar Foto">&times;</button>
        `;
        
        d.querySelector('.btn-borrar-foto').onclick = async () => {
            if (confirm("¿Estás seguro de que quieres eliminar esta imagen permanentemente del servidor?")) {
                let arregloUrls = campoUrlHidden.value.split(',').map(r => r.trim());
                
                // Guardamos la URL de la foto seleccionada antes de sacarla del arreglo
                const urlAEliminar = arregloUrls[i];
                
                // Removemos la URL del arreglo de la base de datos
                arregloUrls.splice(i, 1);
                campoUrlHidden.value = arregloUrls.join(',');
                
                // Llamamos a la función asíncrona unificada para borrar el archivo del servidor
                await eliminarImagenDeSupabase(urlAEliminar);
                
                // Redibujamos las miniaturas remanentes en el panel del formulario
                actualizarMiniaturasEditor(); 
            }
        };
        
        contenedorMiniaturas.appendChild(d);
    });
}

// Función blindada para eliminar físicamente un archivo del Storage usando su URL pública
async function eliminarImagenDeSupabase(urlPublica) {
    if (!urlPublica || urlPublica.includes('placeholder.png')) return;

    try {
        console.log("URL recibida para intentar borrar del Storage:", urlPublica);

        // 1. Quitamos cualquier parámetro de consulta o token que empiece con "?" al final de la URL
        const urlLimpia = urlPublica.split('?')[0];

        // 2. Extraemos la ruta interna después del nombre de tu bucket ('imagenes-productos')
        const partes = urlLimpia.split('/imagenes-productos/');
        if (partes.length < 2) {
            console.error("No se pudo procesar el nombre del bucket en la URL.");
            return;
        }
        
        // Pasamos de "object/public/imagenes-productos/productos/123.jpg" a estrictamente "productos/123.jpg"
        const rutaArchivo = decodeURIComponent(partes[1]);
        console.log("Ruta exacta calculada para enviar a Supabase:", rutaArchivo);

        // 3. Ejecutamos la orden de eliminación en el Storage
        const { data, error } = await supabaseClient.storage
            .from('imagenes-productos')
            .remove([rutaArchivo]);

        if (error) {
            console.error("Supabase rechazó el borrado físico:", error.message);
        } else {
            console.log("¡Éxito! Archivo destruido físicamente del Storage:", data);
        }
    } catch (err) {
        console.error("Error inesperado en la función de borrado de archivos:", err);
    }
}

if (inputArchivo && contenedorMiniaturas) {
    inputArchivo.addEventListener('change', () => {
        const archivos = Array.from(inputArchivo.files);

        archivos.forEach((archivo) => {
            archivosPendientes.push(archivo); // Lo añadimos a nuestro array dinámico
            const reader = new FileReader();

            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'miniatura-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Previsualización">
                    <button type="button" class="btn-borrar-foto" title="Quitar">&times;</button>
                `;
                
                div.querySelector('.btn-borrar-foto').onclick = () => { 
                    div.remove(); 
                    // Al eliminar visualmente, también lo quitamos del array custom
                    const index = archivosPendientes.indexOf(archivo);
                    if (index > -1) {
                        archivosPendientes.splice(index, 1);
                    }
                };
                contenedorMiniaturas.appendChild(div);
            };

            reader.readAsDataURL(archivo);
        });
        
        // Limpiar el input para permitir volver a subir el mismo archivo si se desea
        inputArchivo.value = '';
    });
}

// Función para comprimir una imagen a un peso menor a 1 MB usando Canvas
function comprimirImagen(archivo) {
    return new Promise((resolve) => {
        // Si el archivo ya pesa menos de 1 MB (1024 * 1024 bytes), no hace falta comprimir
        if (archivo.size <= 1024 * 1024) {
            return resolve(archivo);
        }

        const reader = new FileReader();
        reader.readAsDataURL(archivo);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 1. Si la imagen es gigantesca en pixeles, reducimos sus dimensiones máximas a 1920px
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Dibujamos la imagen en el lienzo del canvas con el nuevo tamaño
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 2. Exportamos el canvas como un Blob JPEG con calidad del 75% (0.75)
                // Esto reduce drásticamente el peso manteniendo una excelente nitidez visual
                canvas.toBlob((blob) => {
                    // Convertimos el Blob de vuelta a un archivo File para que mantenga el nombre original
                    const archivoComprimido = new File([blob], archivo.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    console.log(`Imagen comprimida: De ${(archivo.size / 1024 / 1024).toFixed(2)} MB a ${(archivoComprimido.size / 1024 / 1024).toFixed(2)} MB`);
                    resolve(archivoComprimido);
                }, 'image/jpeg', 0.75);
            };
        };
    });
}

// ==========================================
// 6. GUARDAR O EDITAR PRODUCTO (INSERT / UPDATE)
// ==========================================
form.onsubmit = async (e) => {
    e.preventDefault();

    const archivosImagenes = archivosPendientes; // Usamos la cola limpia
    let urlsAcumuladas = [];

    if (campoUrlHidden.value && campoUrlHidden.value.trim() !== "") {
        urlsAcumuladas = campoUrlHidden.value.split(',').map(r => r.trim());
    }

    if (archivosImagenes.length > 0) {
        for (let i = 0; i < archivosImagenes.length; i++) {
            const urlSubida = await subirImagenASupabase(archivosImagenes[i]);
            if (urlSubida) {
                urlsAcumuladas.push(urlSubida);
            }
        }
    }

    const stringUrlFinal = urlsAcumuladas.join(',');

    const datosProducto = {
        nombre_producto: document.getElementById('nombre').value,
        precio: parseInt(document.getElementById('precio').value),
        descripcion: document.getElementById('descripcion').value,
        disponible: document.getElementById('disponible').checked,
        imagen_url: stringUrlFinal, 
        id_categoria: parseInt(selectorCategoria.value) || null, 
        id_tipo: parseInt(selectorTipo.value) || null
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
    if (contenedorMiniaturas) contenedorMiniaturas.innerHTML = '';
    form.reset();
    editandoId = null;
    archivosPendientes = []; // Vaciamos la cola tras guardar
    cargar(); 
};

// ==========================================
// 7. ELIMINAR PRODUCTO
// ==========================================
async function eliminarProducto(id) {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
        const producto = productosBase.find(x => x.id_producto === id);
        
        // Eliminar también las imágenes físicas asociadas a este producto en el Storage
        if (producto && producto.imagen_url && producto.imagen_url.trim() !== "" && producto.imagen_url !== "null") {
            const urls = producto.imagen_url.split(',').map(r => r.trim());
            for (const url of urls) {
                if (url) {
                    await eliminarImagenDeSupabase(url);
                }
            }
        }

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
async function cargarCategorias() {
    const f = document.getElementById('filtroCategoria'); 

    if (!f || !selectorCategoria) return;

    const { data: cats, error } = await supabaseClient
        .from('categoria')
        .select('*')
        .order('nombre_categoria', { ascending: true });

    if (error) {
        console.error("Error al cargar categorías:", error);
        return;
    }

    f.innerHTML = '<option value="Todos">Todas las Categorías</option>';
    selectorCategoria.innerHTML = '';

    cats.forEach(c => {
        f.innerHTML += `<option value="${c.nombre_categoria}">${c.nombre_categoria}</option>`;
        selectorCategoria.innerHTML += `<option value="${c.id_categoria}">${c.nombre_categoria}</option>`;
    });
}

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
            await cargarCategorias(); 
        }
    };
}

const btnEditarCat = document.getElementById('btnEditarCat');
if (btnEditarCat) {
    btnEditarCat.onclick = async () => {
        const idCat = selectorCategoria.value; 
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
            cargar(); 
        }
    };
}

const btnEliminarCat = document.getElementById('btnEliminarCat');
if (btnEliminarCat) {
    btnEliminarCat.onclick = async () => {
        const idCat = selectorCategoria.value;
        const nombreCat = selectorCategoria.options[selectorCategoria.selectedIndex]?.text;
        if (!idCat) return alert("Selecciona una categoría.");
        
        if (confirm(`¿Estás seguro de eliminar la categoría "${nombreCat}"?\nNota: Asegúrate de desvincular sus productos primero.`)) {
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

    selectorTipo.innerHTML = '';
    tipos.forEach(t => {
        selectorTipo.innerHTML += `<option value="${t.id_tipo}">${t.nombre_tipo}</option>`;
    });
}

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
            await cargarTipos(); 
        }
    };
}

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
            cargar(); 
        }
    };
}

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

// ==========================================
// 10. LÓGICA DE FILTROS, BUSCADOR Y ORDENAMIENTO
// ==========================================

// Función centralizada que aplica todos los filtros activos en cadena
function aplicarFiltros() {
    let productosFiltrados = [...productosBase];

    // 1. Filtro por Texto (Buscador por Nombre)
    const textoBusqueda = document.getElementById('buscadorNombre')?.value.toLowerCase().trim() || "";
    if (textoBusqueda !== "") {
        productosFiltrados = productosFiltrados.filter(p => 
            p.nombre_producto?.toLowerCase().includes(textoBusqueda)
        );
    }

    // 2. Filtro por Categoría Desplegable
    const filtroCat = document.getElementById('filtroCategoria')?.value || "Todos";
    if (filtroCat !== "Todos") {
        productosFiltrados = productosFiltrados.filter(p => 
            p.categoria?.nombre_categoria === filtroCat
        );
    }

    // 3. Filtro por Estado (Solo Admin: Visibles / Ocultos)
    if (modoAdmin) {
        const filtroEst = document.getElementById('filtroEstado')?.value || "todos";
        if (filtroEst === "visibles") {
            productosFiltrados = productosFiltrados.filter(p => p.disponible === true);
        } else if (filtroEst === "ocultos") {
            productosFiltrados = productosFiltrados.filter(p => p.disponible === false);
        }
    }

    // 4. Ordenamiento por Precio (Menor a Mayor / Mayor a Menor)
    const orden = document.getElementById('ordenPrecio')?.value || "defecto";
    if (orden === "asc") {
        productosFiltrados.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
    } else if (orden === "desc") {
        productosFiltrados.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
    }

    // Volvemos a pintar la grilla con el resultado final filtrado
    renderizarProductos(productosFiltrados);
}

// --- Vinculación de Eventos en el HTML ---

// Escuchador para el Buscador por texto (reacciona mientras escribes)
document.getElementById('buscadorNombre')?.addEventListener('input', aplicarFiltros);

// Escuchador para el selector de Categorías
document.getElementById('filtroCategoria')?.addEventListener('change', aplicarFiltros);

// Escuchador para el selector de Estado (Visible/Oculto para el Admin)
document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);

// Escuchador para el selector de Orden de Precios
document.getElementById('ordenPrecio')?.addEventListener('change', aplicarFiltros);

// Ejecución inicial limpia al cargar la ventana
cargarCategorias();
cargarTipos();
cargar();
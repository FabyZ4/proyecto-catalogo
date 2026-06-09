// ==========================================================================
// MÓDULO DE STORAGE: COMPRESIÓN, SUBIDA Y BORRADO DE FOTOS (.JPG SINCRONIZADO)
// ==========================================================================

const campoUrlHidden = document.getElementById('imagen_url');
const inputArchivo = document.getElementById('inputArchivo');
const contenedorMiniaturas = document.getElementById('contenedorMiniaturas');

// 1. COMPRIMIR IMAGEN (Retorna siempre un Blob .jpg liviano)
function comprimirImagen(archivo) {
    return new Promise((resolve) => {
        if (archivo.size <= 1024 * 1024) {
            return resolve(archivo); // Pasa directo si es menor a 1 MB
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
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const nombreBase = archivo.name.substring(0, archivo.name.lastIndexOf('.')) || archivo.name;
                    const archivoComprimido = new File([blob], `${nombreBase}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    console.log(`[Storage] Optimizado: De ${(archivo.size / 1024 / 1024).toFixed(2)} MB a ${(archivoComprimido.size / 1024 / 1024).toFixed(2)} MB`);
                    resolve(archivoComprimido);
                }, 'image/jpeg', 0.75);
            };
        };
    });
}

// 2. SUBIR AL BUCKET
async function subirImagenASupabase(file) {
    if (!file) return null;
    const archivoOptimizado = await comprimirImagen(file);
    const fileName = `${Date.now()}.jpg`; // Forzamos extensión limpia .jpg
    const filePath = `productos/${fileName}`;

    const { data, error } = await supabaseClient.storage
        .from('imagenes-productos')
        .upload(filePath, archivoOptimizado, { contentType: 'image/jpeg', upsert: true });

    if (error) {
        alert("Error al subir imagen: " + error.message);
        return null;
    }
    const { data: urlData } = supabaseClient.storage.from('imagenes-productos').getPublicUrl(filePath);
    return urlData.publicUrl;
}

// 3. BORRAR ARCHIVO REAL DE LA NUBE
async function eliminarImagenDeSupabase(urlPublica) {
    if (!urlPublica || urlPublica.includes('placeholder.png')) return;
    try {
        const urlLimpia = urlPublica.split('?')[0];
        const partes = urlLimpia.split('/imagenes-productos/');
        if (partes.length < 2) return;
        
        const rutaArchivo = decodeURIComponent(partes[1]);
        console.log("[Storage] Solicitando destrucción de archivo en Supabase:", rutaArchivo);

        const { data, error } = await supabaseClient.storage
            .from('imagenes-productos')
            .remove([rutaArchivo]);

        if (error) console.error("[Storage] Supabase rechazó el borrado:", error.message);
        else console.log("[Storage] ¡Destruido con éxito de la nube!", data);
    } catch (err) {
        console.error("[Storage] Error crítico en borrado:", err);
    }
}

// 4. RENDERIZAR MINIATURAS EN EL EDITOR
function actualizarMiniaturasEditor() {
    if (!contenedorMiniaturas) return;
    contenedorMiniaturas.innerHTML = '';
    const valorHidden = campoUrlHidden.value;
    const rutas = valorHidden && valorHidden !== "null" && valorHidden.trim() !== "" ? valorHidden.split(',') : [];
    
    rutas.forEach((url, i) => {
        if (!url || url.trim() === "") return;
        const d = document.createElement('div');
        d.className = 'miniatura-item';
        d.innerHTML = `
            <img src="${url.trim()}" onerror="this.onerror=null; this.src='imagenes/placeholder.png';">
            <button type="button" class="btn-borrar-foto" title="Eliminar Foto">&times;</button>
        `;
        
        d.querySelector('.btn-borrar-foto').onclick = async () => {
            if (confirm("¿Quieres eliminar esta imagen permanentemente del servidor?")) {
                let arregloUrls = campoUrlHidden.value.split(',').map(r => r.trim());
                const urlAEliminar = arregloUrls[i];
                arregloUrls.splice(i, 1);
                campoUrlHidden.value = arregloUrls.join(',');
                
                await eliminarImagenDeSupabase(urlAEliminar); // Borra físicamente
                actualizarMiniaturasEditor(); // Redibuja
            }
        };
        contenedorMiniaturas.appendChild(d);
    });
}

// 5. ESCUCHAR SELECCIÓN DE NUEVOS ARCHIVOS LOCALES
if (inputArchivo && contenedorMiniaturas) {
    inputArchivo.addEventListener('change', () => {
        const archivos = Array.from(inputArchivo.files);
        archivos.forEach((archivo) => {
            archivosPendientes.push(archivo);
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
                    const index = archivosPendientes.indexOf(archivo);
                    if (index > -1) archivosPendientes.splice(index, 1);
                };
                contenedorMiniaturas.appendChild(div);
            };
            reader.readAsDataURL(archivo);
        });
        inputArchivo.value = '';
    });
}
// ==========================================
// MÓDULO DE MANTENIMIENTO (CATEGORÍAS Y TIPOS)
// ==========================================
const selectorCategoria = document.getElementById('categoria'); 
const selectorTipo = document.getElementById('tipo');

async function cargarCategorias() {
    const f = document.getElementById('filtroCategoria'); 
    if (!f || !selectorCategoria) return;
    const { data: cats, error } = await supabaseClient.from('categoria').select('*').order('nombre_categoria', { ascending: true });
    if (error) return console.error("Error al cargar categorías:", error);

    f.innerHTML = '<option value="Todos">Todas las Categorías</option>';
    selectorCategoria.innerHTML = '';
    cats.forEach(c => {
        f.innerHTML += `<option value="${c.nombre_categoria}">${c.nombre_categoria}</option>`;
        selectorCategoria.innerHTML += `<option value="${c.id_categoria}">${c.nombre_categoria}</option>`;
    });
}

async function cargarTipos() {
    if (!selectorTipo) return;
    const { data: tipos, error } = await supabaseClient.from('tipo').select('*').order('nombre_tipo', { ascending: true });
    if (error) return console.error("Error al cargar tipos:", error);

    selectorTipo.innerHTML = '';
    tipos.forEach(t => {
        selectorTipo.innerHTML += `<option value="${t.id_tipo}">${t.nombre_tipo}</option>`;
    });
}

// Listeners de Categorías
document.getElementById('btnNuevaCat').onclick = async () => {
    const nombre = prompt("Nombre de la nueva categoría:");
    if (!nombre || !nombre.trim()) return;
    const { error } = await supabaseClient.from('categoria').insert([{ nombre_categoria: nombre.trim() }]);
    if (error) alert("Error: " + error.message); else { await cargarCategorias(); }
};

document.getElementById('btnEditarCat').onclick = async () => {
    const idCat = selectorCategoria.value;
    const nombreActual = selectorCategoria.options[selectorCategoria.selectedIndex]?.text;
    if (!idCat) return alert("Selecciona una categoría.");
    const nuevo = prompt(`Cambiar "${nombreActual}" por:`, nombreActual);
    if (!nuevo || !nuevo.trim() || nuevo === nombreActual) return;
    const { error } = await supabaseClient.from('categoria').update({ nombre_categoria: nuevo.trim() }).eq('id_categoria', idCat);
    if (error) alert("Error: " + error.message); else { await cargarCategorias(); cargar(); }
};

document.getElementById('btnEliminarCat').onclick = async () => {
    const idCat = selectorCategoria.value;
    const nombreCat = selectorCategoria.options[selectorCategoria.selectedIndex]?.text;
    if (!idCat) return alert("Selecciona una categoría.");
    if (confirm(`¿Eliminar la categoría "${nombreCat}"?`)) {
        const { error } = await supabaseClient.from('categoria').delete().eq('id_categoria', idCat);
        if (error) alert("Error (Verifique que no tenga productos asociados): " + error.message);
        else { await cargarCategorias(); cargar(); }
    }
};

// Listeners de Tipos de Venta
document.getElementById('btnNuevoTipo').onclick = async () => {
    const nombre = prompt("Nombre del nuevo tipo de venta:");
    if (!nombre || !nombre.trim()) return;
    const { error } = await supabaseClient.from('tipo').insert([{ nombre_tipo: nombre.trim() }]);
    if (error) alert("Error: " + error.message); else { await cargarTipos(); }
};

document.getElementById('btnEditarTipo').onclick = async () => {
    const idTipo = selectorTipo.value;
    const nombreActual = selectorTipo.options[selectorTipo.selectedIndex]?.text;
    if (!idTipo) return alert("Selecciona un tipo.");
    const nuevo = prompt(`Cambiar "${nombreActual}" por:`, nombreActual);
    if (!nuevo || !nuevo.trim() || nuevo === nombreActual) return;
    const { error } = await supabaseClient.from('tipo').update({ nombre_tipo: nuevo.trim() }).eq('id_tipo', idTipo);
    if (error) alert("Error: " + error.message); else { await cargarTipos(); cargar(); }
};

document.getElementById('btnEliminarTipo').onclick = async () => {
    const idTipo = selectorTipo.value;
    if (!idTipo) return alert("Selecciona un tipo.");
    if (confirm("¿Eliminar este tipo de venta?")) {
        const { error } = await supabaseClient.from('tipo').delete().eq('id_tipo', idTipo);
        if (error) alert("Error: " + error.message); else { await cargarTipos(); cargar(); }
    }
};
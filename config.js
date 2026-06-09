// Inicialización segura de Supabase
const SUPABASE_URL = "https://qgtnezetemljrudcefef.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_x86K93yqFumhOTqrC7MCWA_KQQOw-mW";     

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de estado compartidas globalmente
let modoAdmin = false;
let editandoId = null;
let productosBase = [];
let archivosPendientes = []; // Gestión de imágenes en cola

// Elementos del DOM compartidos globalmente entre módulos
const campoUrlHidden = document.getElementById('imagen_url');
const inputArchivo = document.getElementById('inputArchivo');
const contenedorMiniaturas = document.getElementById('contenedorMiniaturas');
const selectorCategoria = document.getElementById('categoria'); 
const selectorTipo = document.getElementById('tipo');
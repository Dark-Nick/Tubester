/**
 * ============================================================================
 * TubesTer - Script Principal (app.js)
 * ============================================================================
 * 
 * VERSIÓN 1.0.3
 * - Modo Ciego (Fase 3): Reproducción anti-spoilers con inicio aleatorio 15%-80%.
 * - Pantalla de Revelación (Fase 4): Video visible, Gran Año y Controles Duales.
 * - Despliegue PWA (Fase 5): Service Worker con Network-First y aceleración móvil.
 * - Temporizador de inicio de partida: inicio inmediato, cuenta regresiva o por clic.
 * - Herramienta de Registro: Captura guiada de cartas físicas con
 *   referencia, filtro de duplicados, persistencia y exportación.
 */

// ============================================================================
// 1. CONFIGURACIÓN Y ESTADO GLOBAL DEL JUEGO
// ============================================================================

/**
 * Parámetros globales del juego
 */
const CONFIG_JUEGO = {
    /** Duración en segundos que se reproducirá el fragmento en Modo Ciego */
    duracionFragmentoSegundos: 30,

    /** Reproduce la canción completa cuando la duración seleccionada es Chill */
    reproducirCancionCompleta: false,

    /** Inicio de la canción: inmediato, con cuenta regresiva de 2/3s o por clic */
    temporizadorInicio: "no",

    /** Porcentaje mínimo del track donde puede iniciar el audio (15%) */
    porcentajeMinInicio: 0.15,

    /** Porcentaje de seguridad antes de finalizar la canción (20% antes del final) */
    porcentajeMaxFin: 0.20
};

/**
 * Estado dinámico de la partida
 */
const estadoJuego = {
    cancionActual: null,          // Metadata de la canción en juego
    tiempoRestante: 30,           // Cuenta regresiva del temporizador
    intervaloTemporizador: null,  // ID del intervalo de la cuenta regresiva
    timestampInicio: 0,           // Segundo en que inició el fragmento a ciegas
    timestampCorte: 0,            // Segundo exacto donde finalizó el fragmento
    tiempoAgotado: false,         // Evita duplicar la revelación al terminar el audio
    temporizadorRevelacion: null, // Retraso previo a mostrar la canción revelada
    temporizadorInicio: null,     // Temporizador de cuenta regresiva antes de reproducir
    inicioReproduccionSolicitado: false, // Indica que ya se autorizó el inicio de la canción
    youtubeIds: [],               // Videos disponibles para la canción actual
    indiceYoutubeActual: 0,        // Video de respaldo que se está reproduciendo
    estaReproduciendo: false,     // Estado del reproductor
    reproductorListo: false,      // Indica si la YouTube IFrame API está lista
    saltoRealizado: false         // Evita saltos duplicados en la misma canción
};

// ============================================================================
// 2. INICIALIZACIÓN DE LA APLICACIÓN AL CARGAR EL DOM
// ============================================================================

/**
 * Conecta los elementos de la interfaz con la lógica del juego y del registro.
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- Referencias: Menú Principal ---
    const seccionMenu = document.getElementById("seccion-menu");
    const seccionConfiguracion = document.getElementById("seccion-configuracion");
    const btnNuevaPartida = document.getElementById("btn-nueva-partida");
    const btnVolverMenu = document.getElementById("btn-volver-menu");
    const btnPartidaClasica = document.getElementById("btn-partida-clasica");
    const btnAbrirRegistro = document.getElementById("btn-abrir-registro");

    // --- Referencias: Tarjeta del Juego ---
    const seccionJuego = document.getElementById("seccion-juego");
    const badgeModoJuego = document.getElementById("badge-modo-juego");
    const indicadorIdCarta = document.getElementById("indicador-id-carta");
    const indicadorMarca = document.getElementById("indicador-marca");
    const cortinaCiega = document.getElementById("cortina-ciega");
    const ecualizadorOndas = document.querySelector(".ecualizador-ondas");
    const textoCortina = document.getElementById("texto-cortina");
    const contadorInicio = document.getElementById("contador-inicio");
    const btnForzarPlay = document.getElementById("btn-forzar-play");
    const ayudaTemporizadorInicio = document.getElementById("ayuda-temporizador-inicio");

    // --- Referencias: Bloque Modo Ciego (Fase 3) ---
    const bloqueModoCiego = document.getElementById("bloque-modo-ciego");
    const temporizadorSegundos = document.getElementById("temporizador-segundos");
    const barraProgresoRelleno = document.getElementById("barra-progreso-relleno");
    const estadoReproduccion = document.getElementById("estado-reproduccion");
    const btnPlayPause = document.getElementById("btn-play-pause");
    const btnRevelar = document.getElementById("btn-revelar");
    const btnCancelarJuego = document.getElementById("btn-cancelar-juego");

    // --- Referencias: Bloque de Revelación (Fase 4) ---
    const bloqueRevelacion = document.getElementById("bloque-revelacion");
    const revelacionAno = document.getElementById("revelacion-ano");
    const revelacionCancion = document.getElementById("revelacion-cancion");
    const revelacionArtista = document.getElementById("revelacion-artista");
    const revelacionAlbum = document.getElementById("revelacion-album");
    const revelacionFecha = document.getElementById("revelacion-fecha");
    const estadoRevelacion = document.getElementById("estado-revelacion");
    const btnReproducirInicio = document.getElementById("btn-reproducir-inicio");
    const btnContinuarCorte = document.getElementById("btn-continuar-corte");
    const btnToggleVideo = document.getElementById("btn-toggle-video");
    const btnSiguienteCarta = document.getElementById("btn-siguiente-carta");
    const btnTerminarPartida = document.getElementById("btn-terminar-partida");

    // --- Referencias: Panel de Error ---
    const seccionResultado = document.getElementById("seccion-resultado");
    const codigoEscaneado = document.getElementById("codigo-escaneado");
    const btnReintentar = document.getElementById("btn-reintentar");
    const btnTerminarSesion = document.getElementById("btn-terminar-sesion");

    // --- Referencias: Modales Principales ---
    const modalScanner = document.getElementById("modal-scanner");
    const btnCerrarScanner = document.getElementById("btn-cerrar-scanner");
    const btnCancelarScanner = document.getElementById("btn-cancelar-scanner");
    const scannerError = document.getElementById("scanner-error");

    // --- Referencias: Modal de Registro de Nuevas Cartas (V1.0) ---
    const modalRegistro = document.getElementById("modal-registro");
    const btnCerrarRegistro = document.getElementById("btn-cerrar-registro");
    const selectVersionRegistro = document.getElementById("select-version-registro");
    const inputReferenciaCarta = document.getElementById("input-referencia-carta");
    const btnCancelarCarta = document.getElementById("btn-cancelar-carta");
    const btnAgregarCarta = document.getElementById("btn-agregar-carta");
    const contenedorScannerRegistro = document.getElementById("contenedor-scanner-registro");
    const alertaRegistro = document.getElementById("alerta-registro");
    const contadorPendientes = document.getElementById("contador-pendientes");
    const listaPendientes = document.getElementById("lista-pendientes");
    const btnCopiarPendientes = document.getElementById("btn-copiar-pendientes");
    const btnDescargarPendientes = document.getElementById("btn-descargar-pendientes");
    const btnLimpiarPendientes = document.getElementById("btn-limpiar-pendientes");

    // Variables internas
    let cancionesDB = [];
    let html5QrCode = null;
    let isScanning = false;
    let ytPlayer = null;

    // Variables del escáner de registro continuo
    let html5QrCodeRegistro = null;
    let isScanningRegistro = false;
    let bloqueoEscaneoRegistro = false;
    let codigoCartaEscaneada = null;

    // Cartas pendientes acumuladas (persisten en localStorage)
    const claveCartasPendientes = "tubester_cartas_pendientes";
    const cartasPendientesGuardadas = localStorage.getItem(claveCartasPendientes)
        || localStorage.getItem("hitster_cartas_pendientes")
        || "[]";
    let cartasPendientes = JSON.parse(cartasPendientesGuardadas);

    // =========================================================================
    // 3. CARGA DE BASE DE DATOS (canciones.json / canciones.js)
    // =========================================================================

    /**
     * Carga el catálogo de canciones:
     * 1. Carga inmediata desde window.CANCIONES_LOCALES (inmune a CORS en file://)
     * 2. Sincronización vía fetch a canciones.json para entornos con servidor / GitHub Pages.
     */
    async function cargarBaseDeDatos() {
        if (Array.isArray(window.CANCIONES_LOCALES) && window.CANCIONES_LOCALES.length > 0) {
            cancionesDB = window.CANCIONES_LOCALES;
            console.log(`[TubesTer] Catálogo local cargado: ${cancionesDB.length} canciones.`);
        }

        try {
            const respuesta = await fetch("./canciones.json");
            if (respuesta.ok) {
                const data = await respuesta.json();
                if (Array.isArray(data) && data.length > 0) {
                    cancionesDB = data;
                    console.log(`[TubesTer] Catálogo sincronizado vía fetch: ${cancionesDB.length} canciones.`);
                }
            }
        } catch (error) {
            console.log("[TubesTer] Servidor local / modo archivo activo. Usando canciones.js");
        }
    }

    /**
     * Busca una canción por cualquiera de sus IDs o por coincidencia en URL
     * @param {string} idBuscado - ID ingresado o leído en el QR
     * @returns {Object|null} - Objeto de la canción o null si no existe
     */
    function buscarCancionPorId(idBuscado) {
        if (!idBuscado || !cancionesDB || cancionesDB.length === 0) return null;

        const idNormalizado = idBuscado.trim().toUpperCase();
        const idCompacto = idNormalizado.replace(/[\s\-_]/g, "");

        return cancionesDB.find(c => {
            const idsCancion = Array.isArray(c.ids) ? c.ids : [];
            const idsNormalizados = idsCancion
                .filter(id => typeof id === "string")
                .map(id => id.trim().toUpperCase());

            return idsNormalizados.includes(idNormalizado) ||
                   idsNormalizados.some(idCancion => {
                       const idCancionCompacto = idCancion.replace(/[\s\-_]/g, "");
                       return idCancionCompacto === idCompacto ||
                              idNormalizado.endsWith("/" + idCancion) ||
                              idNormalizado.includes(idCancion);
                   });
        }) || null;
    }

    // =========================================================================
    // 4. INTEGRACIÓN DE YOUTUBE IFRAME API
    // =========================================================================

    /**
     * Carga de forma asíncrona el script oficial de la YouTube IFrame API
     */
    function cargarYouTubeIframeAPI() {
        if (window.YT && window.YT.Player) {
            inicializarReproductorYouTube();
            return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    /**
     * Callback global requerido por YouTube IFrame API al terminar de cargar.
     */
    window.onYouTubeIframeAPIReady = function() {
        console.log("[TubesTer] YouTube IFrame API lista para su uso.");
        inicializarReproductorYouTube();
    };

    /**
     * Crea una sola instancia del reproductor y conecta sus callbacks de estado.
     */
    function inicializarReproductorYouTube() {
        if (ytPlayer) return;

        try {
            ytPlayer = new YT.Player("youtube-player", {
                height: "100%",
                width: "100%",
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin && window.location.origin !== "null" ? window.location.origin : undefined
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onError: onPlayerError
                }
            });
        } catch (err) {
            console.error("[TubesTer] Error al inicializar YT.Player:", err);
        }
    }

    /**
     * Callback de YouTube cuando el reproductor ya puede recibir comandos.
     */
    function onPlayerReady() {
        console.log("[TubesTer] Reproductor de YouTube listo y vinculado.");
        estadoJuego.reproductorListo = true;
        if (estadoJuego.cancionActual && estadoJuego.youtubeIds.length > 0) {
            reproducirYoutubeActual();
        }
    }

    /**
     * Intenta el siguiente video de respaldo o muestra el error final de reproducción.
     * @param {Object} event - Evento de error enviado por YouTube.
     */
    function onPlayerError(event) {
        console.error("[TubesTer] Error del reproductor YouTube:", event.data);
        if (pasarAlSiguienteYoutube(event.data)) return;

        const mensaje = "No se pudo reproducir la canción. Se agotaron los enlaces de respaldo.";
        detenerTemporizadorInicio();
        estadoJuego.inicioReproduccionSolicitado = false;
        const estadoVisible = bloqueRevelacion.classList.contains("oculto")
            ? estadoReproduccion
            : estadoRevelacion;
        estadoVisible.textContent = mensaje;
        btnForzarPlay.classList.add("oculto");
    }

    /**
     * Avanza al siguiente enlace de respaldo disponible.
     * @param {number|string} codigoError - Código o causa del video fallido.
     * @returns {boolean} Indica si había otro enlace para intentar.
     */
    function pasarAlSiguienteYoutube(codigoError) {
        const siguienteIndice = estadoJuego.indiceYoutubeActual + 1;
        if (siguienteIndice >= estadoJuego.youtubeIds.length) return false;

        console.warn(`[TubesTer] Falló el video ${estadoJuego.indiceYoutubeActual + 1}; probando respaldo ${siguienteIndice + 1}.`, codigoError);
        detenerTemporizadorInicio();
        estadoJuego.indiceYoutubeActual = siguienteIndice;
        if (!bloqueModoCiego.classList.contains("oculto")) {
            detenerTemporizador();
            estadoJuego.saltoRealizado = false;
        }
        estadoJuego.estaReproduciendo = false;
        estadoJuego.inicioReproduccionSolicitado = false;
        const estadoVisible = bloqueRevelacion.classList.contains("oculto")
            ? estadoReproduccion
            : estadoRevelacion;
        estadoVisible.textContent = `Video no disponible. Probando respaldo ${siguienteIndice + 1} de ${estadoJuego.youtubeIds.length}...`;
        reproducirYoutubeActual();
        return true;
    }

    /**
     * Prepara o reproduce el enlace actual según el temporizador de inicio configurado.
     */
    function reproducirYoutubeActual() {
        if (!ytPlayer || !estadoJuego.reproductorListo) return;

        const videoId = estadoJuego.youtubeIds[estadoJuego.indiceYoutubeActual];
        if (!videoId) {
            estadoReproduccion.textContent = "No hay enlaces de YouTube válidos para esta canción.";
            btnForzarPlay.classList.add("oculto");
            return;
        }

        try {
            if (!estadoJuego.inicioReproduccionSolicitado && CONFIG_JUEGO.temporizadorInicio !== "no") {
                ytPlayer.mute();
                ytPlayer.cueVideoById({ videoId, startSeconds: 0 });

                if (CONFIG_JUEGO.temporizadorInicio === "click") {
                    textoCortina.textContent = "Cuando quieras, pulsa para empezar";
                    contadorInicio.classList.add("oculto");
                    btnForzarPlay.textContent = "▶️ Iniciar canción";
                    btnForzarPlay.classList.remove("oculto");
                } else {
                    btnForzarPlay.classList.add("oculto");
                    iniciarCuentaRegresivaInicio(Number(CONFIG_JUEGO.temporizadorInicio));
                }
                return;
            }

            iniciarReproduccionSolicitada(false);
        } catch (error) {
            console.error("[TubesTer] No se pudo cargar un video de YouTube:", error);
            if (!pasarAlSiguienteYoutube(error)) {
                const estadoVisible = bloqueRevelacion.classList.contains("oculto")
                    ? estadoReproduccion
                    : estadoRevelacion;
                estadoVisible.textContent = "No se pudo cargar la canción. Se agotaron los enlaces de respaldo.";
                detenerTemporizadorInicio();
                estadoJuego.inicioReproduccionSolicitado = false;
                btnForzarPlay.classList.add("oculto");
            }
        }
    }

    /**
     * Muestra la cuenta regresiva previa y autoriza la reproducción al llegar a cero.
     * @param {number} segundos - Duración inicial de la cuenta regresiva.
     */
    function iniciarCuentaRegresivaInicio(segundos) {
        detenerTemporizadorInicio();
        let restante = segundos;
        textoCortina.textContent = "La canción empieza en";
        contadorInicio.textContent = restante;
        contadorInicio.classList.remove("oculto");

        const actualizarCuentaRegresiva = () => {
            restante -= 1;
            contadorInicio.textContent = restante;
            if (restante > 0) {
                estadoJuego.temporizadorInicio = setTimeout(actualizarCuentaRegresiva, 1000);
                return;
            }

            estadoJuego.temporizadorInicio = setTimeout(() => {
                estadoJuego.temporizadorInicio = null;
                iniciarReproduccionSolicitada(true);
            }, 350);
        };

        estadoJuego.temporizadorInicio = setTimeout(actualizarCuentaRegresiva, 1000);
    }

    /**
     * Cancela la cuenta regresiva previa y oculta su indicador.
     */
    function detenerTemporizadorInicio() {
        if (estadoJuego.temporizadorInicio) {
            clearTimeout(estadoJuego.temporizadorInicio);
            estadoJuego.temporizadorInicio = null;
        }
        contadorInicio.classList.add("oculto");
    }

    /**
     * Inicia el audio cuando corresponde, usando el video ya preparado si está disponible.
     * @param {boolean} videoPreparado - Indica si el reproductor ya cargó el video en pausa.
     */
    function iniciarReproduccionSolicitada(videoPreparado) {
        if (!ytPlayer || !estadoJuego.reproductorListo || !estadoJuego.cancionActual) return;

        detenerTemporizadorInicio();
        estadoJuego.inicioReproduccionSolicitado = true;
        textoCortina.textContent = "Música en reproducción a ciegas";
        btnForzarPlay.classList.add("oculto");

        try {
            if (videoPreparado) {
                ytPlayer.playVideo();
            } else {
                const videoId = estadoJuego.youtubeIds[estadoJuego.indiceYoutubeActual];
                if (!videoId) return;
                ytPlayer.mute();
                ytPlayer.loadVideoById({ videoId, startSeconds: 0 });
                ytPlayer.playVideo();
            }
        } catch (error) {
            console.error("[TubesTer] No se pudo iniciar la reproducción:", error);
            if (!pasarAlSiguienteYoutube(error)) {
                const estadoVisible = bloqueRevelacion.classList.contains("oculto")
                    ? estadoReproduccion
                    : estadoRevelacion;
                estadoVisible.textContent = "No se pudo iniciar la canción. Se agotaron los enlaces de respaldo.";
                estadoJuego.inicioReproduccionSolicitado = false;
                btnForzarPlay.classList.add("oculto");
            }
            return;
        }

        setTimeout(() => {
            if (estadoJuego.cancionActual && estadoJuego.inicioReproduccionSolicitado && !estadoJuego.estaReproduciendo) {
                btnForzarPlay.textContent = "▶️ Reintentar audio";
                btnForzarPlay.classList.remove("oculto");
            }
        }, 2500);
    }

    /**
     * Extrae el identificador de 11 caracteres desde una URL habitual de YouTube.
     * @param {string} url - URL completa o ID directo del video.
     * @returns {string|null} ID del video o null si el valor no es válido.
     */
    function extraerVideoId(url) {
        if (!url) return null;
        const texto = url.trim();
        if (/^[\w-]{11}$/.test(texto)) return texto;

        const patron = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
        const match = texto.match(patron);
        return match ? match[1] : null;
    }

    /**
     * Elige un punto de inicio aleatorio que deja espacio para reproducir el fragmento.
     * @param {number} duracionTotal - Duración total del video en segundos.
     * @returns {number} Segundo desde el que comenzará la escucha a ciegas.
     */
    function calcularTimestampAleatorio(duracionTotal) {
        const minInicio = Math.floor(duracionTotal * CONFIG_JUEGO.porcentajeMinInicio);
        const limiteMaxTrack = duracionTotal * (1 - CONFIG_JUEGO.porcentajeMaxFin);
        const maxInicio = Math.max(minInicio, Math.floor(limiteMaxTrack - CONFIG_JUEGO.duracionFragmentoSegundos));

        const inicioAleatorio = Math.floor(minInicio + Math.random() * (maxInicio - minInicio + 1));
        console.log(`[TubesTer] Duración total: ${duracionTotal}s | Rango permitido: [${minInicio}s - ${maxInicio}s] | Elegido: ${inicioAleatorio}s`);
        return inicioAleatorio;
    }

    /**
     * Sincroniza el estado del juego con los eventos del reproductor de YouTube.
     * @param {Object} event - Evento de cambio de estado del reproductor.
     */
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            estadoJuego.estaReproduciendo = true;
            actualizarBotonPlayPause(true);
            actualizarBotonToggleVideo(true);
            btnForzarPlay.classList.add("oculto");

            if (!estadoJuego.saltoRealizado && !bloqueModoCiego.classList.contains("oculto")) {
                const duracion = ytPlayer.getDuration();

                if (duracion && duracion > 10) {
                    ejecutarSaltoAleatorioYDesmutear(duracion);
                } else {
                    setTimeout(() => {
                        if (!estadoJuego.saltoRealizado && ytPlayer) {
                            const dur = ytPlayer.getDuration() || 180;
                            ejecutarSaltoAleatorioYDesmutear(dur);
                        }
                    }, 350);
                }
            } else {
                ecualizadorOndas.classList.add("sonando");
                if (!bloqueModoCiego.classList.contains("oculto")) {
                    estadoReproduccion.textContent = CONFIG_JUEGO.reproducirCancionCompleta
                        ? "🎧 Reproduciendo canción completa a ciegas..."
                        : "🎧 Reproduciendo fragmento a ciegas...";
                }
            }
        } else if (event.data === YT.PlayerState.PAUSED) {
            estadoJuego.estaReproduciendo = false;
            actualizarBotonPlayPause(false);
            actualizarBotonToggleVideo(false);
            ecualizadorOndas.classList.remove("sonando");
            if (estadoJuego.saltoRealizado && !estadoJuego.tiempoAgotado && !bloqueModoCiego.classList.contains("oculto")) {
                estadoReproduccion.textContent = "⏸️ Audio pausado";
            }
        } else if (event.data === YT.PlayerState.BUFFERING) {
            if (!bloqueModoCiego.classList.contains("oculto") && estadoJuego.inicioReproduccionSolicitado) {
                estadoReproduccion.textContent = "Cargando audio...";
            }
        } else if (event.data === YT.PlayerState.ENDED && !bloqueModoCiego.classList.contains("oculto")) {
            detenerTemporizador();
            tiempoAgotadoModoCiego();
        }
    }

    /**
     * Salta al fragmento elegido, activa el sonido y arranca el temporizador de escucha.
     * @param {number} duracion - Duración del video en segundos.
     */
    function ejecutarSaltoAleatorioYDesmutear(duracion) {
        estadoJuego.saltoRealizado = true;
        const puntoInicio = CONFIG_JUEGO.reproducirCancionCompleta
            ? 0
            : calcularTimestampAleatorio(duracion);
        estadoJuego.timestampInicio = puntoInicio;

        ytPlayer.seekTo(puntoInicio, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();

        ecualizadorOndas.classList.add("sonando");
        estadoReproduccion.textContent = CONFIG_JUEGO.reproducirCancionCompleta
            ? "🎧 Reproduciendo canción completa a ciegas..."
            : "🎧 Reproduciendo fragmento a ciegas...";
        const duracionDisponible = Math.max(1, duracion - puntoInicio);
        const duracionReproduccion = CONFIG_JUEGO.reproducirCancionCompleta
            ? duracionDisponible
            : Math.min(CONFIG_JUEGO.duracionFragmentoSegundos, duracionDisponible);
        iniciarTemporizador(duracionReproduccion);
    }

    // =========================================================================
    // 5. CONTROL DEL MODO CIEGO Y TEMPORIZADOR (FASE 3)
    // =========================================================================

    /**
     * Configura la ronda a ciegas y prepara la reproducción según la selección de inicio.
     * @param {Object} cancion - Canción encontrada en el catálogo.
     * @param {string} [idEscaneado] - ID leído, usado para mostrar el sufijo correcto.
     */
    function iniciarModoCiego(cancion, idEscaneado) {
        detenerTemporizadorInicio();
        estadoJuego.cancionActual = cancion;
        estadoJuego.saltoRealizado = false;
        estadoJuego.estaReproduciendo = false;
        estadoJuego.tiempoAgotado = false;
        estadoJuego.inicioReproduccionSolicitado = false;
        if (estadoJuego.temporizadorRevelacion) {
            clearTimeout(estadoJuego.temporizadorRevelacion);
            estadoJuego.temporizadorRevelacion = null;
        }

        seccionMenu.classList.add("oculto");
        seccionConfiguracion.classList.add("oculto");
        seccionResultado.classList.add("oculto");
        seccionJuego.classList.remove("oculto");
        document.querySelector(".contenedor-principal").classList.remove("revelacion-activa");
        indicadorMarca.classList.add("oculto");
        indicadorIdCarta.classList.remove("oculto");

        bloqueModoCiego.classList.remove("oculto");
        bloqueRevelacion.classList.add("oculto");
        cortinaCiega.classList.remove("oculto");

        badgeModoJuego.textContent = "🎧 Modo Ciego";
        badgeModoJuego.className = "badge-modo";
        const idCarta = String(idEscaneado || (Array.isArray(cancion.ids) ? cancion.ids[0] : "") || "");
        indicadorIdCarta.textContent = idCarta.slice(-5);
        estadoReproduccion.textContent = "Conectando con YouTube...";
        textoCortina.textContent = "Música en reproducción a ciegas";
        contadorInicio.classList.add("oculto");
        btnForzarPlay.classList.add("oculto");
        
        temporizadorSegundos.textContent = CONFIG_JUEGO.reproducirCancionCompleta
            ? "♪"
            : `${CONFIG_JUEGO.duracionFragmentoSegundos}s`;
        barraProgresoRelleno.style.width = "100%";
        barraProgresoRelleno.style.backgroundColor = "#1ed760";
        ecualizadorOndas.classList.remove("sonando");

        const enlacesYoutube = Array.isArray(cancion.youtube_urls) ? cancion.youtube_urls : [];
        estadoJuego.youtubeIds = enlacesYoutube.map(extraerVideoId).filter(Boolean);
        estadoJuego.indiceYoutubeActual = 0;
        if (estadoJuego.youtubeIds.length < enlacesYoutube.length) {
            console.warn(`[TubesTer] Se omitieron ${enlacesYoutube.length - estadoJuego.youtubeIds.length} enlaces de YouTube inválidos para ${cancion.titulo}.`);
        }
        if (estadoJuego.youtubeIds.length === 0) {
            estadoReproduccion.textContent = "Esta canción no tiene enlaces de YouTube válidos.";
            btnForzarPlay.classList.add("oculto");
            return;
        }

        if (!ytPlayer || !estadoJuego.reproductorListo) {
            estadoReproduccion.textContent = "Cargando motor de reproducción...";
            return;
        }

        reproducirYoutubeActual();
    }

    /**
     * Inicia el conteo del fragmento; el tiempo avanza solo mientras el audio se reproduce.
     * @param {number} segundosTotales - Duración de escucha en segundos.
     */
    function iniciarTemporizador(segundosTotales) {
        detenerTemporizador();
        estadoJuego.tiempoRestante = segundosTotales;
        const total = segundosTotales;

        actualizarVisualTemporizador(estadoJuego.tiempoRestante, total);

        estadoJuego.intervaloTemporizador = setInterval(() => {
            if (!estadoJuego.estaReproduciendo) return;

            estadoJuego.tiempoRestante -= 0.25;

            if (estadoJuego.tiempoRestante <= 0) {
                detenerTemporizador();
                tiempoAgotadoModoCiego();
            } else {
                actualizarVisualTemporizador(estadoJuego.tiempoRestante, total);
            }
        }, 250);
    }

    /**
     * Actualiza el tiempo restante y degrada la barra de progreso de verde a rojo.
     * @param {number} restante - Segundos que quedan en el fragmento.
     * @param {number} total - Duración inicial del fragmento.
     */
    function actualizarVisualTemporizador(restante, total) {
        const segEnteros = Math.ceil(restante);
        temporizadorSegundos.textContent = `${segEnteros}s`;
        const porcentaje = Math.max(0, Math.min(100, (restante / total) * 100));
        barraProgresoRelleno.style.width = `${porcentaje}%`;
        const transcurrido = 1 - porcentaje / 100;
        const rojo = Math.round(30 + (255 - 30) * transcurrido);
        const verde = Math.round(215 + (59 - 215) * transcurrido);
        const azul = Math.round(96 + (48 - 96) * transcurrido);
        barraProgresoRelleno.style.backgroundColor = `rgb(${rojo}, ${verde}, ${azul})`;
    }

    /**
     * Detiene el intervalo de escucha si hay uno activo.
     */
    function detenerTemporizador() {
        if (estadoJuego.intervaloTemporizador) {
            clearInterval(estadoJuego.intervaloTemporizador);
            estadoJuego.intervaloTemporizador = null;
        }
    }

    /**
     * Alterna entre pausar y reanudar la canción durante el modo ciego.
     */
    function togglePlayPause() {
        if (!ytPlayer || !estadoJuego.inicioReproduccionSolicitado) return;

        if (estadoJuego.estaReproduciendo) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.unMute();
            ytPlayer.playVideo();
        }
    }

    /**
     * Cambia el texto del control de escucha según el estado del reproductor.
     * @param {boolean} reproduciendo - Indica si el video está reproduciéndose.
     */
    function actualizarBotonPlayPause(reproduciendo) {
        btnPlayPause.textContent = reproduciendo ? "⏸️ Pausar" : "▶️ Reanudar";
    }

    /**
     * Guarda el punto de corte y programa la revelación de la canción tras dos segundos.
     */
    function tiempoAgotadoModoCiego() {
        if (estadoJuego.tiempoAgotado || !estadoJuego.cancionActual) return;

        estadoJuego.tiempoAgotado = true;
        console.log("[TubesTer] Tiempo agotado. Guardando corte.");
        if (ytPlayer && ytPlayer.getCurrentTime) {
            estadoJuego.timestampCorte = ytPlayer.getCurrentTime();
        }
        if (ytPlayer && ytPlayer.pauseVideo) {
            ytPlayer.pauseVideo();
        }
        estadoReproduccion.textContent = "⏱️ ¡Tiempo terminado! Revelando la canción en 2 segundos...";
        ecualizadorOndas.classList.remove("sonando");
        estadoJuego.temporizadorRevelacion = setTimeout(() => {
            estadoJuego.temporizadorRevelacion = null;
            revelarCarta();
        }, 2000);
    }

    // =========================================================================
    // 6. PANTALLA DE REVELACIÓN Y CONTROLES DUALES (FASE 4)
    // =========================================================================

    /**
     * Separa el año de la fecha de lanzamiento para la pantalla de revelación.
     * @param {string} fechaStr - Fecha con formato AAAA-MM-DD.
     * @returns {{anio: string, fechaCompleta: string}} Año y fecha que se mostrarán.
     */
    function extraerDatosFecha(fechaStr) {
        if (!fechaStr) return { anio: "----", fechaCompleta: "Desconocida" };
        const partes = fechaStr.split("-");
        const anio = partes[0] || "----";
        return {
            anio: anio,
            fechaCompleta: fechaStr
        };
    }

    /**
     * Sustituye la cortina, muestra los datos de la canción y reproduce desde el inicio.
     */
    function revelarCarta() {
        detenerTemporizadorInicio();
        detenerTemporizador();
        if (estadoJuego.temporizadorRevelacion) {
            clearTimeout(estadoJuego.temporizadorRevelacion);
            estadoJuego.temporizadorRevelacion = null;
        }

        if (!estadoJuego.tiempoAgotado && ytPlayer && ytPlayer.getCurrentTime) {
            estadoJuego.timestampCorte = ytPlayer.getCurrentTime();
        }

        const cancion = estadoJuego.cancionActual;
        if (!cancion) return;

        // Retirar cortina (video visible)
        cortinaCiega.classList.add("oculto");
        document.querySelector(".contenedor-principal").classList.add("revelacion-activa");
        indicadorIdCarta.classList.add("oculto");
        indicadorMarca.classList.remove("oculto");

        bloqueModoCiego.classList.add("oculto");
        bloqueRevelacion.classList.remove("oculto");

        badgeModoJuego.textContent = "🎉 Canción revelada";
        badgeModoJuego.className = "badge-modo revelado";

        const { anio, fechaCompleta } = extraerDatosFecha(cancion.lanzamiento);
        revelacionAno.textContent = anio;
        revelacionCancion.textContent = cancion.titulo;
        revelacionArtista.textContent = cancion.artista;
        revelacionAlbum.textContent = cancion.album || "Sencillo / Desconocido";
        revelacionFecha.textContent = fechaCompleta;

        estadoRevelacion.textContent = "▶️ Reproduciendo canción desde el inicio.";
        if (ytPlayer) {
            ytPlayer.seekTo(0, true);
            ytPlayer.unMute();
            ytPlayer.setVolume(100);
            ytPlayer.playVideo();
            actualizarBotonToggleVideo(true);
        } else {
            estadoRevelacion.textContent = "Usa el botón para iniciar la canción.";
            actualizarBotonToggleVideo(false);
        }

        console.log(`[TubesTer] Canción revelada: ${cancion.titulo} (${anio}) | Corte: ${Math.floor(estadoJuego.timestampCorte)}s`);
    }

    /**
     * Reinicia la canción revelada desde el segundo cero.
     */
    function reproducirDesdeInicio() {
        if (!ytPlayer) return;
        ytPlayer.seekTo(0, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();
        estadoRevelacion.textContent = "▶️ Festejo: Sonando desde el inicio (0:00)";
        actualizarBotonToggleVideo(true);
    }

    /**
     * Reanuda el video revelado desde el punto donde terminó el fragmento a ciegas.
     */
    function continuarDesdeCorte() {
        if (!ytPlayer) return;
        const puntoCorte = estadoJuego.timestampCorte || estadoJuego.timestampInicio || 0;
        ytPlayer.seekTo(puntoCorte, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();
        estadoRevelacion.textContent = `🔀 Continuando reproducción desde el segundo ${Math.floor(puntoCorte)}s`;
        actualizarBotonToggleVideo(true);
    }

    /**
     * Alterna la reproducción del video visible en la pantalla de revelación.
     */
    function toggleVideoRevelado() {
        if (!ytPlayer) return;
        if (estadoJuego.estaReproduciendo) {
            ytPlayer.pauseVideo();
            estadoRevelacion.textContent = "⏸️ Video en pausa";
            actualizarBotonToggleVideo(false);
        } else {
            ytPlayer.playVideo();
            estadoRevelacion.textContent = "▶️ Reproduciendo video";
            actualizarBotonToggleVideo(true);
        }
    }

    /**
     * Sincroniza icono, etiqueta accesible y tooltip del control de pausa/reanudación.
     * @param {boolean} reproduciendo - Indica si el video está reproduciéndose.
     */
    function actualizarBotonToggleVideo(reproduciendo) {
        const accion = reproduciendo ? "Pausar video" : "Reanudar video";
        btnToggleVideo.textContent = reproduciendo ? "⏸️" : "▶️";
        btnToggleVideo.setAttribute("aria-label", accion);
        btnToggleVideo.title = accion;
    }

    /**
     * Limpia el estado de la ronda actual y vuelve directamente al escáner del juego.
     */
    function siguienteCarta() {
        detenerTemporizadorInicio();
        if (ytPlayer && ytPlayer.stopVideo) {
            ytPlayer.stopVideo();
        }
        estadoJuego.estaReproduciendo = false;
        detenerTemporizador();
        if (estadoJuego.temporizadorRevelacion) {
            clearTimeout(estadoJuego.temporizadorRevelacion);
            estadoJuego.temporizadorRevelacion = null;
        }

        estadoJuego.cancionActual = null;
        estadoJuego.saltoRealizado = false;
        estadoJuego.tiempoAgotado = false;
        estadoJuego.timestampCorte = 0;
        estadoJuego.timestampInicio = 0;
        document.querySelector(".contenedor-principal").classList.remove("revelacion-activa");
        indicadorMarca.classList.add("oculto");
        indicadorIdCarta.classList.remove("oculto");

        iniciarScanner();
    }

    /**
     * Finaliza la partida desde el modo ciego.
     */
    function cancelarJuego() {
        finalizarPartida();
    }

    /**
     * Detiene reproductor y temporizadores, limpia la ronda y vuelve al menú principal.
     */
    function finalizarPartida() {
        detenerTemporizadorInicio();
        detenerTemporizador();
        if (estadoJuego.temporizadorRevelacion) {
            clearTimeout(estadoJuego.temporizadorRevelacion);
            estadoJuego.temporizadorRevelacion = null;
        }
        if (ytPlayer && ytPlayer.stopVideo) {
            ytPlayer.stopVideo();
        }

        estadoJuego.cancionActual = null;
        estadoJuego.saltoRealizado = false;
        estadoJuego.tiempoAgotado = false;
        estadoJuego.timestampCorte = 0;
        estadoJuego.timestampInicio = 0;
        seccionJuego.classList.add("oculto");
        seccionConfiguracion.classList.add("oculto");
        seccionResultado.classList.add("oculto");
        seccionMenu.classList.remove("oculto");
        document.querySelector(".contenedor-principal").classList.remove("revelacion-activa");
        indicadorMarca.classList.add("oculto");
        indicadorIdCarta.classList.remove("oculto");
        cortinaCiega.classList.remove("oculto");
        bloqueRevelacion.classList.add("oculto");
        bloqueModoCiego.classList.remove("oculto");
    }

    // =========================================================================
    // 7. PROCESAMIENTO DE CÓDIGOS QR
    // =========================================================================

    /**
     * Busca el ID escaneado y abre la ronda o el aviso de carta no registrada.
     * @param {string} rawId - Contenido leído del código QR.
     */
    function procesarCodigo(rawId) {
        const id = rawId.trim();
        const cancion = buscarCancionPorId(id);

        if (cancion) {
            console.log("[TubesTer] Carta identificada:", cancion);
            iniciarModoCiego(cancion, id);
        } else {
            seccionConfiguracion.classList.add("oculto");
            seccionMenu.classList.add("oculto");
            seccionJuego.classList.add("oculto");
            codigoEscaneado.textContent = id.slice(-5);
            seccionResultado.classList.remove("oculto");
        }
    }

    // =========================================================================
    // 8. ESCÁNER QR DEL JUEGO (html5-qrcode optimizado)
    // =========================================================================

    /**
     * Abre el modal e inicia la cámara para leer una carta durante la partida.
     */
    async function iniciarScanner() {
        if (typeof Html5Qrcode === "undefined") {
            alert("Error: La librería html5-qrcode no se pudo cargar. Revisa tu conexión a internet.");
            return;
        }

        // Si la cámara de registro estaba activa, la detenemos para liberar el hardware
        if (html5QrCodeRegistro && isScanningRegistro) {
            await detenerScannerRegistro();
        }

        scannerError.classList.add("oculto");
        scannerError.textContent = "";
        modalScanner.classList.remove("oculto");

        try {
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader");
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                () => {}
            );

            isScanning = true;
        } catch (err) {
            console.error("[TubesTer] Error al iniciar cámara:", err);
            mostrarErrorScanner(obtenerMensajeError(err));
        }
    }

    /**
     * Detiene la cámara del juego y cierra su modal.
     */
    async function detenerScanner() {
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop();
            } catch (err) {
                console.warn("[TubesTer] Error al detener escáner:", err);
            } finally {
                isScanning = false;
            }
        }
        modalScanner.classList.add("oculto");
    }

    /**
     * Callback del lector de juego: detiene la cámara y procesa el QR reconocido.
     * @param {string} decodedText - Texto decodificado del QR.
     */
    async function onScanSuccess(decodedText) {
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        await detenerScanner();
        procesarCodigo(decodedText);
    }

    /**
     * Convierte errores comunes de cámara en instrucciones comprensibles para el usuario.
     * @param {unknown} error - Error devuelto al iniciar la cámara.
     * @returns {string} Mensaje de error localizado.
     */
    function obtenerMensajeError(error) {
        const errorStr = String(error).toLowerCase();
        if (errorStr.includes("notallowederror") || errorStr.includes("permission")) {
            return "Permiso denegado: Por favor habilita el permiso de cámara en tu navegador.";
        }
        if (errorStr.includes("notfounderror") || errorStr.includes("devicesnotfound")) {
            return "No se encontró ninguna cámara disponible en tu dispositivo.";
        }
        return "No fue posible acceder a la cámara. Verifica los permisos del navegador.";
    }

    /**
     * Presenta un error en el modal del escáner de partida.
     * @param {string} mensaje - Mensaje que se mostrará.
     */
    function mostrarErrorScanner(mensaje) {
        scannerError.textContent = mensaje;
        scannerError.classList.remove("oculto");
    }

    // =========================================================================
    // 9. HERRAMIENTA DE REGISTRO DE CARTAS FÍSICAS (V1.0)
    // =========================================================================

    /**
     * Renderiza la lista visual de cartas pendientes acumuladas
     */
    function renderizarListaPendientes() {
        contadorPendientes.textContent = cartasPendientes.length;

        // Habilitar o deshabilitar botones según si hay cartas
        const hayCartas = cartasPendientes.length > 0;
        btnCopiarPendientes.disabled = !hayCartas;
        btnDescargarPendientes.disabled = !hayCartas;

        if (!hayCartas) {
            listaPendientes.innerHTML = `<p class="texto-vacio">Aún no has escaneado cartas en esta sesión.</p>`;
            return;
        }

        listaPendientes.innerHTML = "";
        cartasPendientes.forEach((carta, index) => {
            const item = document.createElement("div");
            item.className = "item-pendiente";
            const detalles = document.createElement("div");
            const id = document.createElement("span");
            id.className = "item-id";
            id.textContent = carta.id;
            const version = document.createElement("span");
            version.className = "item-version";
            version.textContent = carta.version;
            const referencia = document.createElement("span");
            referencia.className = "item-referencia";
            referencia.textContent = carta.referencia || "Sin referencia";
            detalles.append(id, version, referencia);

            const eliminar = document.createElement("button");
            eliminar.className = "btn-eliminar-item";
            eliminar.dataset.index = String(index);
            eliminar.title = "Eliminar";
            eliminar.setAttribute("aria-label", `Eliminar carta ${carta.id}`);
            eliminar.textContent = "×";
            item.append(detalles, eliminar);
            listaPendientes.appendChild(item);
        });

        // Eventos para eliminar cartas individuales
        listaPendientes.querySelectorAll(".btn-eliminar-item").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                eliminarCartaPendiente(idx);
            });
        });
    }

    /**
     * Guarda la lista de cartas pendientes en localStorage
     */
    function guardarCartasPendientes() {
        localStorage.setItem(claveCartasPendientes, JSON.stringify(cartasPendientes));
        renderizarListaPendientes();
    }

    /**
     * Elimina una carta de la lista acumulada y persiste el cambio.
     * @param {number} index - Posición de la carta dentro de la lista.
     */
    function eliminarCartaPendiente(index) {
        cartasPendientes.splice(index, 1);
        guardarCartasPendientes();
        mostrarAlertaRegistro("Carta eliminada de la lista.", "aviso");
    }

    /**
     * Muestra alertas en vivo dentro del modal de registro
     * @param {string} mensaje - Texto
     * @param {'exito'|'error'|'aviso'} tipo - Clase visual
     */
    function mostrarAlertaRegistro(mensaje, tipo = "exito") {
        alertaRegistro.textContent = mensaje;
        alertaRegistro.className = `alerta-registro ${tipo}`;
        alertaRegistro.classList.remove("oculto");

        clearTimeout(alertaRegistro.timeoutId);
        alertaRegistro.timeoutId = setTimeout(() => {
            alertaRegistro.classList.add("oculto");
        }, 3500);
    }

    /**
     * Inicia o reanuda el escáner de registro de cartas físicas
     */
    async function iniciarScannerRegistro() {
        if (typeof Html5Qrcode === "undefined") {
            alert("Error: La librería html5-qrcode no se pudo cargar.");
            return;
        }
        if (isScanningRegistro) return;

        // Si la cámara del juego principal estaba activa, la detenemos
        if (html5QrCode && isScanning) {
            await detenerScanner();
        }

        contenedorScannerRegistro.classList.remove("oculto");
        bloqueoEscaneoRegistro = false;
        mostrarAlertaRegistro("📷 Iniciando cámara...", "aviso");

        try {
            if (!html5QrCodeRegistro) {
                html5QrCodeRegistro = new Html5Qrcode("reader-registro");
            }

            const config = {
                fps: 10,
                qrbox: { width: 260, height: 260 }
                /* Sin aspectRatio forzado — usa la proporción nativa de la cámara */
            };

            await html5QrCodeRegistro.start(
                { facingMode: "environment" },
                config,
                (decodedText) => onScanRegistroSuccess(decodedText),
                () => {}
            );
            isScanningRegistro = true;
            mostrarAlertaRegistro("📷 Cámara lista. Centra el código QR dentro del recuadro.", "aviso");
        } catch (err) {
            console.error("[Registro] Error al iniciar cámara:", err);
            mostrarAlertaRegistro(obtenerMensajeErrorScannerRegistro(err), "error");
            await detenerScannerRegistro();
        }
    }

    /**
     * Traduce errores de permisos o disponibilidad de cámara del registro.
     * @param {unknown} error - Error devuelto al iniciar el lector de registro.
     * @returns {string} Mensaje de error localizado.
     */
    function obtenerMensajeErrorScannerRegistro(error) {
        const nombreError = error && error.name ? error.name : "";
        if (nombreError === "NotAllowedError" || nombreError === "PermissionDeniedError") {
            return "Permiso de cámara denegado. Habilita la cámara para este sitio en el navegador.";
        }
        if (nombreError === "NotFoundError" || nombreError === "DevicesNotFoundError") {
            return "No se encontró una cámara disponible en este dispositivo.";
        }
        if (nombreError === "NotReadableError" || nombreError === "TrackStartError") {
            return "La cámara está ocupada por otra aplicación. Ciérrala e inténtalo de nuevo.";
        }
        if (nombreError === "OverconstrainedError") {
            return "No se encontró una cámara compatible. Prueba con otra cámara del dispositivo.";
        }
        return "No fue posible iniciar la cámara. Revisa los permisos y que el sitio use HTTPS o localhost.";
    }

    /**
     * Detiene el visor de la cámara de registro
     */
    async function detenerScannerRegistro() {
        if (html5QrCodeRegistro && isScanningRegistro) {
            try {
                await html5QrCodeRegistro.stop();
            } catch (err) {
                console.warn("[Registro] Error al detener escáner:", err);
            } finally {
                isScanningRegistro = false;
            }
        }
        contenedorScannerRegistro.classList.add("oculto");
    }

    /**
     * Habilita o limpia los controles de referencia para una lectura pendiente.
     * @param {boolean} habilitado - Indica si hay una carta esperando confirmación.
     */
    function actualizarFormularioCartaEscaneada(habilitado) {
        inputReferenciaCarta.disabled = !habilitado;
        btnCancelarCarta.disabled = !habilitado;
        btnAgregarCarta.disabled = !habilitado;
        if (!habilitado) {
            inputReferenciaCarta.value = "";
        }
    }

    /**
     * Callback cuando la cámara de registro lee un código QR
     */
    function onScanRegistroSuccess(decodedText) {
        if (bloqueoEscaneoRegistro) return;

        const idLeido = decodedText.trim();
        if (!idLeido) return;
        bloqueoEscaneoRegistro = true;
        detenerScannerRegistro();
        if (modalRegistro.classList.contains("oculto")) return;

        // 1. Validar si ya existe en la base de datos oficial (canciones.json / canciones.js)
        const existeEnDB = buscarCancionPorId(idLeido);
        if (existeEnDB) {
            if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
            mostrarAlertaRegistro(`⚠️ Carta YA registrada en la base de datos (${existeEnDB.artista} - ${existeEnDB.titulo})`, "error");
            setTimeout(() => {
                if (!modalRegistro.classList.contains("oculto")) iniciarScannerRegistro();
            }, 2000);
            return;
        }

        // 2. Validar si ya se escaneó en la sesión actual
        const yaEnPendientes = cartasPendientes.some(c => c.id.toUpperCase() === idLeido.toUpperCase());
        if (yaEnPendientes) {
            if (navigator.vibrate) navigator.vibrate(120);
            mostrarAlertaRegistro(`ℹ️ Ya habías escaneado esta carta hace un momento (${idLeido})`, "aviso");
            setTimeout(() => {
                if (!modalRegistro.classList.contains("oculto")) iniciarScannerRegistro();
            }, 2000);
            return;
        }

        // Pausa el escaneo hasta que se agregue o descarte la carta.
        codigoCartaEscaneada = idLeido;
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
        actualizarFormularioCartaEscaneada(true);
        inputReferenciaCarta.focus();
        mostrarAlertaRegistro(`📝 Carta ${idLeido} escaneada. Escribe su nombre o referencia.`, "aviso");
    }

    /**
     * Descarta la lectura pendiente y reactiva la cámara de registro.
     */
    async function cancelarCartaEscaneada() {
        if (!codigoCartaEscaneada) return;
        codigoCartaEscaneada = null;
        actualizarFormularioCartaEscaneada(false);
        mostrarAlertaRegistro("Escaneo cancelado. Puedes escanear otra carta.", "aviso");
        await iniciarScannerRegistro();
    }

    /**
     * Valida y guarda la carta escaneada antes de continuar con la siguiente lectura.
     */
    async function agregarCartaEscaneada() {
        if (!codigoCartaEscaneada) return;
        const referencia = inputReferenciaCarta.value.trim();
        if (!referencia) {
            mostrarAlertaRegistro("Escribe el nombre de la canción o una referencia antes de agregar.", "error");
            inputReferenciaCarta.focus();
            return;
        }

        const idLeido = codigoCartaEscaneada;
        cartasPendientes.push({
            id: idLeido,
            version: selectVersionRegistro.value,
            referencia,
            fecha: new Date().toLocaleDateString()
        });

        guardarCartasPendientes();
        codigoCartaEscaneada = null;
        actualizarFormularioCartaEscaneada(false);
        mostrarAlertaRegistro(`✅ Carta ${idLeido} agregada a la lista. Escaneando la siguiente...`, "exito");
        await iniciarScannerRegistro();
    }

    /**
     * Genera el listado de cartas pendientes con instrucciones para completar el catálogo.
     */
    function generarTextoPendientes() {
        let texto = `=== TUBESTER - NUEVAS CARTAS PARA AGREGAR ===\n`;
        texto += `Total de cartas: ${cartasPendientes.length}\n\n`;

        cartasPendientes.forEach((c, i) => {
            texto += `${i + 1}. ID: "${c.id}" | Versión: "${c.version}" | Nombre / referencia: "${c.referencia || ""}"\n`;
        });

        texto += `
INSTRUCCIONES CRÍTICAS PARA COMPLETAR EL CATÁLOGO Y LOS ENLACES:
Investiga cada canción de la lista usando su nombre o referencia como pista. Verifica los datos con fuentes confiables y NO INVENTES información bajo ninguna circunstancia. 

Para cada canción, busca obligatoriamente:
- El artista original.
- El título original, con su ortografía oficial.
- El álbum al que pertenece.
- La fecha de lanzamiento en formato AAAA-MM-DD.
- El género musical.
- **Enlaces de YouTube (REGLA ESTRICTA DE VERIFICACIÓN):**
  1. DEBES buscar en la web el video oficial de la canción en YouTube antes de escribir el enlace.
  2. Prioriza siempre el canal oficial del artista (ej. VEVO, canal verificado de la banda) o un lyric/audio oficial verificado.
  3. ESTRICTAMENTE PROHIBIDO ADIVINAR O INVENTAR IDs DE YOUTUBE. Si no estás 100% seguro de que el enlace existe y pertenece a esa canción, búscalo de nuevo. Los enlaces deben ser reales y funcionales (formato: "https://www.youtube.com/watch?v=...").
  4. Colócalos en el array "youtube_urls".

Genera un archivo .txt con todas las canciones. El archivo debe contener por cada canción un bloque como el especificado, sin comentarios ni texto adicional, con exactamente la estructura y el orden de propiedades usados:
{
  "ids": ["ID leído del QR de esta entrada"],
  "version": "versión elegida para esta entrada",
  "artista": "artista original",
  "titulo": "título original de la canción",
  "album": "álbum",
  "lanzamiento": "AAAA-MM-DD",
  "genero": "género musical",
  "youtube_urls": ["https://www.youtube.com/watch?v=..."]
}

Para cada objeto, coloca el ID indicado en la lista como primer dato dentro del array ids y la versión indicada como segundo atributo, version. Usa el nombre o referencia únicamente para identificar e investigar la canción; el título final debe ser el título original verificado. Mantén los nombres y el orden de las propiedades tal como aparecen en el ejemplo. Entrega únicamente el archivo .txt resultante.
        `;
        return texto;
    }

    /**
     * Copia la lista de cartas al portapapeles del dispositivo
     */
    async function copiarPendientesAlPortapapeles() {
        if (cartasPendientes.length === 0) return;

        const texto = generarTextoPendientes();
        try {
            await navigator.clipboard.writeText(texto);
            mostrarAlertaRegistro("📋 ¡Lista copiada al portapapeles! Pégala en el chat.", "exito");
        } catch (err) {
            // Fallback para navegadores antiguos
            const textarea = document.createElement("textarea");
            textarea.value = texto;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            mostrarAlertaRegistro("📋 ¡Lista copiada al portapapeles!", "exito");
        }
    }

    /**
     * Descarga la lista de cartas como archivo cartas_pendientes.txt
     */
    function descargarPendientesTxt() {
        if (cartasPendientes.length === 0) return;

        const texto = generarTextoPendientes();
        const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `tubester_cartas_pendientes_${Date.now()}.txt`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
        mostrarAlertaRegistro("⬇️ Archivo .txt descargado con éxito.", "exito");
    }

    /**
     * Vacía la lista persistida de cartas pendientes tras confirmación del usuario.
     */
    function limpiarPendientes() {
        if (cartasPendientes.length === 0) return;
        if (confirm("¿Estás seguro de vaciar toda la lista de cartas pendientes acumuladas?")) {
            cartasPendientes = [];
            guardarCartasPendientes();
            mostrarAlertaRegistro("Lista de cartas vaciada.", "aviso");
        }
    }

    // =========================================================================
    // 10. ASIGNACIÓN DE EVENTOS DEL DOM
    // =========================================================================

    // Menú principal y configuración de partida
    btnNuevaPartida.addEventListener("click", () => {
        seccionMenu.classList.add("oculto");
        seccionResultado.classList.add("oculto");
        seccionConfiguracion.classList.remove("oculto");
    });
    btnVolverMenu.addEventListener("click", () => {
        seccionConfiguracion.classList.add("oculto");
        seccionMenu.classList.remove("oculto");
    });
    document.querySelectorAll('input[name="duracion"]').forEach((opcion) => {
        opcion.addEventListener("change", () => {
            const duraciones = {
                melomano: 15,
                aficionado: 30,
                amusia: 60,
                chill: null
            };
            CONFIG_JUEGO.reproducirCancionCompleta = opcion.value === "chill";
            CONFIG_JUEGO.duracionFragmentoSegundos = duraciones[opcion.value];
        });
    });
    document.querySelectorAll('input[name="temporizador-inicio"]').forEach((opcion) => {
        opcion.addEventListener("change", () => {
            CONFIG_JUEGO.temporizadorInicio = opcion.value;
            const descripciones = {
                no: "Inicio inmediato",
                "3": "3 segundos para inicio",
                "2": "2 segundos para inicio",
                click: "Hasta que se dé clic en el reproductor"
            };
            ayudaTemporizadorInicio.textContent = descripciones[opcion.value];
        });
    });
    btnPartidaClasica.addEventListener("click", iniciarScanner);
    btnCerrarScanner.addEventListener("click", detenerScanner);
    btnCancelarScanner.addEventListener("click", detenerScanner);

    // Modo Ciego (Fase 3)
    btnPlayPause.addEventListener("click", togglePlayPause);
    btnRevelar.addEventListener("click", revelarCarta);
    btnCancelarJuego.addEventListener("click", cancelarJuego);

    btnForzarPlay.addEventListener("click", () => {
        if (!ytPlayer || !estadoJuego.reproductorListo) return;

        if (!estadoJuego.inicioReproduccionSolicitado) {
            iniciarReproduccionSolicitada(true);
        } else {
            ytPlayer.unMute();
            ytPlayer.playVideo();
            btnForzarPlay.classList.add("oculto");
        }
    });

    // Controles Duales de la Revelación (Fase 4)
    btnReproducirInicio.addEventListener("click", reproducirDesdeInicio);
    btnContinuarCorte.addEventListener("click", continuarDesdeCorte);
    btnToggleVideo.addEventListener("click", toggleVideoRevelado);
    btnSiguienteCarta.addEventListener("click", siguienteCarta);
    btnTerminarPartida.addEventListener("click", finalizarPartida);

    // Panel de error
    btnReintentar.addEventListener("click", iniciarScanner);
    btnTerminarSesion.addEventListener("click", finalizarPartida);

    // Modal de Registro de Nuevas Cartas (V1.0)
    // La cámara arranca automáticamente al abrir el modal
    btnAbrirRegistro.addEventListener("click", () => {
        codigoCartaEscaneada = null;
        actualizarFormularioCartaEscaneada(false);
        modalRegistro.classList.remove("oculto");
        renderizarListaPendientes();
        iniciarScannerRegistro();
    });

    /**
     * Cierra el registro tras detener la cámara y descartar cualquier lectura pendiente.
     */
    const cerrarModalRegistro = async () => {
        codigoCartaEscaneada = null;
        bloqueoEscaneoRegistro = true;
        actualizarFormularioCartaEscaneada(false);
        await detenerScannerRegistro();
        modalRegistro.classList.add("oculto");
    };

    btnCerrarRegistro.addEventListener("click", cerrarModalRegistro);
    btnCancelarCarta.addEventListener("click", cancelarCartaEscaneada);
    btnAgregarCarta.addEventListener("click", agregarCartaEscaneada);

    btnCopiarPendientes.addEventListener("click", copiarPendientesAlPortapapeles);
    btnDescargarPendientes.addEventListener("click", descargarPendientesTxt);
    btnLimpiarPendientes.addEventListener("click", limpiarPendientes);

    // Tecla Escape para cerrar modales
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!modalScanner.classList.contains("oculto")) detenerScanner();
            if (!modalRegistro.classList.contains("oculto")) cerrarModalRegistro();
        }
    });

    // =========================================================================
    // 11. ARRANQUE DE SERVICIOS Y PWA
    // =========================================================================
    cargarBaseDeDatos();
    cargarYouTubeIframeAPI();

    // Registro del Service Worker para funcionamiento como Progressive Web App (PWA)
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[TubesTer] PWA Service Worker registrado con éxito.'))
            .catch(err => console.log('[TubesTer] Error al registrar Service Worker:', err));
    }
});

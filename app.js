/**
 * ============================================================================
 * TubesTer - Script Principal (app.js)
 * ============================================================================
 * 
 * VERSIÓN 1.0.1
 * - Modo Ciego (Fase 3): Reproducción anti-spoilers con inicio aleatorio 15%-80%.
 * - Pantalla de Revelación (Fase 4): Video visible, Gran Año y Controles Duales.
 * - Despliegue PWA (Fase 5): Service Worker con Network-First y aceleración móvil.
 * - Herramienta de Registro (V1.0): Escaneo continuo de cartas físicas con
 *   filtro de duplicados, persistencia en localStorage y exportación en 1 clic.
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

    /** Ajustes de partida que se usarán en los modos correspondientes */
    chanceActivada: false,
    cantidadChances: 0,

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
    youtubeIds: [],               // Videos disponibles para la canción actual
    indiceYoutubeActual: 0,        // Video de respaldo que se está reproduciendo
    estaReproduciendo: false,     // Estado del reproductor
    reproductorListo: false,      // Indica si la YouTube IFrame API está lista
    saltoRealizado: false         // Evita saltos duplicados en la misma canción
};

// ============================================================================
// 2. INICIALIZACIÓN DE LA APLICACIÓN AL CARGAR EL DOM
// ============================================================================

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
    const btnForzarPlay = document.getElementById("btn-forzar-play");

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
    let bloqueoEscaneoRegistro = false; // Cooldown para no escanear dos veces la misma carta en 1 segundo

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

    window.onYouTubeIframeAPIReady = function() {
        console.log("[TubesTer] YouTube IFrame API lista para su uso.");
        inicializarReproductorYouTube();
    };

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

    function onPlayerReady() {
        console.log("[TubesTer] Reproductor de YouTube listo y vinculado.");
        estadoJuego.reproductorListo = true;
        if (estadoJuego.cancionActual && estadoJuego.youtubeIds.length > 0) {
            reproducirYoutubeActual();
        }
    }

    function onPlayerError(event) {
        console.error("[TubesTer] Error del reproductor YouTube:", event.data);
        if (pasarAlSiguienteYoutube(event.data)) return;

        const mensaje = "No se pudo reproducir la canción. Se agotaron los enlaces de respaldo.";
        const estadoVisible = bloqueRevelacion.classList.contains("oculto")
            ? estadoReproduccion
            : estadoRevelacion;
        estadoVisible.textContent = mensaje;
        btnForzarPlay.classList.add("oculto");
    }

    function pasarAlSiguienteYoutube(codigoError) {
        const siguienteIndice = estadoJuego.indiceYoutubeActual + 1;
        if (siguienteIndice >= estadoJuego.youtubeIds.length) return false;

        console.warn(`[TubesTer] Falló el video ${estadoJuego.indiceYoutubeActual + 1}; probando respaldo ${siguienteIndice + 1}.`, codigoError);
        estadoJuego.indiceYoutubeActual = siguienteIndice;
        if (!bloqueModoCiego.classList.contains("oculto")) {
            detenerTemporizador();
            estadoJuego.saltoRealizado = false;
        }
        estadoJuego.estaReproduciendo = false;
        const estadoVisible = bloqueRevelacion.classList.contains("oculto")
            ? estadoReproduccion
            : estadoRevelacion;
        estadoVisible.textContent = `Video no disponible. Probando respaldo ${siguienteIndice + 1} de ${estadoJuego.youtubeIds.length}...`;
        reproducirYoutubeActual();
        return true;
    }

    function reproducirYoutubeActual() {
        if (!ytPlayer || !estadoJuego.reproductorListo) return;

        const videoId = estadoJuego.youtubeIds[estadoJuego.indiceYoutubeActual];
        if (!videoId) {
            estadoReproduccion.textContent = "No hay enlaces de YouTube válidos para esta canción.";
            btnForzarPlay.classList.add("oculto");
            return;
        }

        try {
            ytPlayer.mute();
            ytPlayer.loadVideoById({ videoId, startSeconds: 0 });
            ytPlayer.playVideo();
            setTimeout(() => {
                if (estadoJuego.cancionActual && !estadoJuego.estaReproduciendo) {
                    btnForzarPlay.classList.remove("oculto");
                    btnForzarPlay.textContent = "▶️ Toca para iniciar audio";
                }
            }, 2500);
        } catch (error) {
            console.error("[TubesTer] No se pudo cargar un video de YouTube:", error);
            if (!pasarAlSiguienteYoutube(error)) {
                const estadoVisible = bloqueRevelacion.classList.contains("oculto")
                    ? estadoReproduccion
                    : estadoRevelacion;
                estadoVisible.textContent = "No se pudo cargar la canción. Se agotaron los enlaces de respaldo.";
                btnForzarPlay.classList.add("oculto");
            }
        }
    }

    function extraerVideoId(url) {
        if (!url) return null;
        const texto = url.trim();
        if (/^[\w-]{11}$/.test(texto)) return texto;

        const patron = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
        const match = texto.match(patron);
        return match ? match[1] : null;
    }

    function calcularTimestampAleatorio(duracionTotal) {
        const minInicio = Math.floor(duracionTotal * CONFIG_JUEGO.porcentajeMinInicio);
        const limiteMaxTrack = duracionTotal * (1 - CONFIG_JUEGO.porcentajeMaxFin);
        const maxInicio = Math.max(minInicio, Math.floor(limiteMaxTrack - CONFIG_JUEGO.duracionFragmentoSegundos));

        const inicioAleatorio = Math.floor(minInicio + Math.random() * (maxInicio - minInicio + 1));
        console.log(`[TubesTer] Duración total: ${duracionTotal}s | Rango permitido: [${minInicio}s - ${maxInicio}s] | Elegido: ${inicioAleatorio}s`);
        return inicioAleatorio;
    }

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
            if (!bloqueModoCiego.classList.contains("oculto")) {
                estadoReproduccion.textContent = "Cargando audio...";
            }
        } else if (event.data === YT.PlayerState.ENDED && !bloqueModoCiego.classList.contains("oculto")) {
            detenerTemporizador();
            tiempoAgotadoModoCiego();
        }
    }

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

    function iniciarModoCiego(cancion) {
        estadoJuego.cancionActual = cancion;
        estadoJuego.saltoRealizado = false;
        estadoJuego.tiempoAgotado = false;
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
        indicadorIdCarta.textContent = Array.isArray(cancion.ids) ? cancion.ids[0] : "";
        estadoReproduccion.textContent = "Conectando con YouTube...";
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
            btnForzarPlay.classList.remove("oculto");
            btnForzarPlay.textContent = "▶️ Toca para iniciar audio";
            return;
        }

        reproducirYoutubeActual();
    }

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

    function detenerTemporizador() {
        if (estadoJuego.intervaloTemporizador) {
            clearInterval(estadoJuego.intervaloTemporizador);
            estadoJuego.intervaloTemporizador = null;
        }
    }

    function togglePlayPause() {
        if (!ytPlayer) return;

        if (estadoJuego.estaReproduciendo) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.unMute();
            ytPlayer.playVideo();
        }
    }

    function actualizarBotonPlayPause(reproduciendo) {
        btnPlayPause.textContent = reproduciendo ? "⏸️ Pausar" : "▶️ Reanudar";
    }

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

    function extraerDatosFecha(fechaStr) {
        if (!fechaStr) return { anio: "----", fechaCompleta: "Desconocida" };
        const partes = fechaStr.split("-");
        const anio = partes[0] || "----";
        return {
            anio: anio,
            fechaCompleta: fechaStr
        };
    }

    function revelarCarta() {
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

    function reproducirDesdeInicio() {
        if (!ytPlayer) return;
        ytPlayer.seekTo(0, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();
        estadoRevelacion.textContent = "▶️ Festejo: Sonando desde el inicio (0:00)";
        actualizarBotonToggleVideo(true);
    }

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

    function actualizarBotonToggleVideo(reproduciendo) {
        const accion = reproduciendo ? "Pausar video" : "Reanudar video";
        btnToggleVideo.textContent = reproduciendo ? "⏸️" : "▶️";
        btnToggleVideo.setAttribute("aria-label", accion);
        btnToggleVideo.title = accion;
    }

    function siguienteCarta() {
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

    function cancelarJuego() {
        finalizarPartida();
    }

    function finalizarPartida() {
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

    function procesarCodigo(rawId) {
        const id = rawId.trim();
        const cancion = buscarCancionPorId(id);

        if (cancion) {
            console.log("[TubesTer] Carta identificada:", cancion);
            iniciarModoCiego(cancion);
        } else {
            seccionConfiguracion.classList.add("oculto");
            seccionMenu.classList.add("oculto");
            seccionJuego.classList.add("oculto");
            codigoEscaneado.textContent = id;
            seccionResultado.classList.remove("oculto");
        }
    }

    // =========================================================================
    // 8. ESCÁNER QR DEL JUEGO (html5-qrcode optimizado)
    // =========================================================================

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

    async function onScanSuccess(decodedText) {
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        await detenerScanner();
        procesarCodigo(decodedText);
    }

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
            item.innerHTML = `
                <div>
                    <span class="item-id">${carta.id}</span>
                    <span class="item-version">${carta.version}</span>
                </div>
                <button class="btn-eliminar-item" data-index="${index}" title="Eliminar">&times;</button>
            `;
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
     * Inicia el escáner continuo de registro de cartas físicas
     */
    async function iniciarScannerRegistro() {
        if (typeof Html5Qrcode === "undefined") {
            alert("Error: La librería html5-qrcode no se pudo cargar.");
            return;
        }

        // Si la cámara del juego principal estaba activa, la detenemos
        if (html5QrCode && isScanning) {
            await detenerScanner();
        }

        contenedorScannerRegistro.classList.remove("oculto");

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
                onScanRegistroSuccess,
                () => {}
            );

            isScanningRegistro = true;
        } catch (err) {
            console.error("[Registro] Error al iniciar cámara:", err);
            mostrarAlertaRegistro("No fue posible acceder a la cámara.", "error");
            detenerScannerRegistro();
        }
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
     * Callback cuando la cámara de registro lee un código QR
     */
    function onScanRegistroSuccess(decodedText) {
        if (bloqueoEscaneoRegistro) return;

        const idLeido = decodedText.trim();
        const versionSeleccionada = selectVersionRegistro.value;

        // 1. Validar si ya existe en la base de datos oficial (canciones.json / canciones.js)
        const existeEnDB = buscarCancionPorId(idLeido);
        if (existeEnDB) {
            bloqueoEscaneoRegistro = true;
            if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
            mostrarAlertaRegistro(`⚠️ Carta YA registrada en la base de datos (${existeEnDB.artista} - ${existeEnDB.titulo})`, "error");
            setTimeout(() => { bloqueoEscaneoRegistro = false; }, 2000);
            return;
        }

        // 2. Validar si ya se escaneó en la sesión actual
        const yaEnPendientes = cartasPendientes.some(c => c.id.toUpperCase() === idLeido.toUpperCase());
        if (yaEnPendientes) {
            bloqueoEscaneoRegistro = true;
            if (navigator.vibrate) navigator.vibrate(120);
            mostrarAlertaRegistro(`ℹ️ Ya habías escaneado esta carta hace un momento (${idLeido})`, "aviso");
            setTimeout(() => { bloqueoEscaneoRegistro = false; }, 2000);
            return;
        }

        // 3. Carta 100% Nueva: Agregar a pendientes
        bloqueoEscaneoRegistro = true;
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);

        cartasPendientes.push({
            id: idLeido,
            version: versionSeleccionada,
            fecha: new Date().toLocaleDateString()
        });

        guardarCartasPendientes();
        mostrarAlertaRegistro(`✅ ¡Carta nueva detectada! (${idLeido})`, "exito");

        // Cooldown de 1.8 segundos antes de escanear la siguiente carta de la baraja
        setTimeout(() => {
            bloqueoEscaneoRegistro = false;
        }, 1800);
    }

    /**
     * Genera el texto con el listado de cartas pendientes formateado para Antigravity
     */
    function generarTextoPendientes() {
        let texto = `=== TUBESTER - NUEVAS CARTAS PARA AGREGAR ===\n`;
        texto += `Total de cartas: ${cartasPendientes.length}\n\n`;

        cartasPendientes.forEach((c, i) => {
            texto += `${i + 1}. ID: "${c.id}" | Versión: "${c.version}"\n`;
        });

        texto += `\nInstrucción: "Busca los datos históricos de cada canción y agrégala a canciones.json usando ids (array), titulo, artista, album, lanzamiento, genero y youtube_urls (array con los enlaces de YouTube de respaldo)."`;
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
    document.querySelectorAll('input[name="chance"]').forEach((opcion) => {
        opcion.addEventListener("change", () => {
            CONFIG_JUEGO.chanceActivada = opcion.value !== "no";
            CONFIG_JUEGO.cantidadChances = opcion.value === "no" ? 0 : Number(opcion.value);
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
        if (ytPlayer) {
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
        modalRegistro.classList.remove("oculto");
        renderizarListaPendientes();
        iniciarScannerRegistro();
    });

    const cerrarModalRegistro = async () => {
        await detenerScannerRegistro();
        modalRegistro.classList.add("oculto");
    };

    btnCerrarRegistro.addEventListener("click", cerrarModalRegistro);

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

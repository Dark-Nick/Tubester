/**
 * ============================================================================
 * Hitster YouTube Edition - Script Principal (app.js)
 * ============================================================================
 * 
 * FASE 4: Pantalla de Revelación y Controles Duales
 * - Revelación del video oficial (retirada de la cortina anti-spoilers).
 * - Renderizado de la tarjeta visual ampliada con el Gran Año y metadata.
 * - Control Dual 1: Festejo / Reproducir desde el inicio (`seekTo(0)`).
 * - Control Dual 2: Continuar desde el corte exacto (`seekTo(timestampCorte)`).
 * - Control de Play/Pausa en video revelado.
 * - Ciclo de juego continuo: Botón "Siguiente Carta" para nueva ronda.
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
    const btnEscanear = document.getElementById("btn-escanear");
    const btnManual = document.getElementById("btn-manual");

    // --- Referencias: Tarjeta del Juego ---
    const seccionJuego = document.getElementById("seccion-juego");
    const badgeModoJuego = document.getElementById("badge-modo-juego");
    const indicadorIdCarta = document.getElementById("indicador-id-carta");
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

    // --- Referencias: Panel de Error ---
    const seccionResultado = document.getElementById("seccion-resultado");
    const codigoEscaneado = document.getElementById("codigo-escaneado");
    const btnReintentar = document.getElementById("btn-reintentar");

    // --- Referencias: Modales ---
    const modalScanner = document.getElementById("modal-scanner");
    const btnCerrarScanner = document.getElementById("btn-cerrar-scanner");
    const btnCancelarScanner = document.getElementById("btn-cancelar-scanner");
    const scannerError = document.getElementById("scanner-error");

    const modalManual = document.getElementById("modal-manual");
    const formManual = document.getElementById("form-manual");
    const inputCodigo = document.getElementById("input-codigo");
    const btnCerrarManual = document.getElementById("btn-cerrar-manual");
    const btnCancelarManual = document.getElementById("btn-cancelar-manual");

    // Variables internas
    let cancionesDB = [];
    let html5QrCode = null;
    let isScanning = false;
    let ytPlayer = null;

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
            console.log(`[Hitster] Catálogo local cargado: ${cancionesDB.length} canciones.`);
        }

        try {
            const respuesta = await fetch("./canciones.json");
            if (respuesta.ok) {
                const data = await respuesta.json();
                if (Array.isArray(data) && data.length > 0) {
                    cancionesDB = data;
                    console.log(`[Hitster] Catálogo sincronizado vía fetch: ${cancionesDB.length} canciones.`);
                }
            }
        } catch (error) {
            console.log("[Hitster] Servidor local / modo archivo activo. Usando canciones.js");
        }
    }

    /**
     * Busca una canción por ID normalizado o coincidencia en URL
     * @param {string} idBuscado - ID ingresado o leído en el QR
     * @returns {Object|null} - Objeto de la canción o null si no existe
     */
    function buscarCancionPorId(idBuscado) {
        if (!idBuscado || !cancionesDB || cancionesDB.length === 0) return null;

        const idNormalizado = idBuscado.trim().toUpperCase();
        const idCompacto = idNormalizado.replace(/[\s\-_]/g, "");

        return cancionesDB.find(c => {
            const idCancion = c.id.trim().toUpperCase();
            const idCancionCompacto = idCancion.replace(/[\s\-_]/g, "");

            return idCancion === idNormalizado || 
                   idCancionCompacto === idCompacto ||
                   idNormalizado.endsWith("/" + idCancion) || 
                   idNormalizado.includes(idCancion);
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
     * Callback obligatorio de YouTube cuando la API termina de cargarse
     */
    window.onYouTubeIframeAPIReady = function() {
        console.log("[Hitster] YouTube IFrame API lista para su uso.");
        inicializarReproductorYouTube();
    };

    /**
     * Instancia el reproductor de YouTube dentro de `.contenedor-video-ciego`
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
            console.error("[Hitster] Error al inicializar YT.Player:", err);
        }
    }

    function onPlayerReady() {
        console.log("[Hitster] Reproductor de YouTube listo y vinculado.");
        estadoJuego.reproductorListo = true;
    }

    function onPlayerError(event) {
        console.error("[Hitster] Error del reproductor YouTube:", event.data);
        let mensaje = "No se pudo reproducir este video.";

        switch (event.data) {
            case 2:
                mensaje = "Parámetro o ID de video de YouTube inválido.";
                break;
            case 5:
                mensaje = "Error del reproductor HTML5 de YouTube.";
                break;
            case 100:
                mensaje = "El video no existe o es privado.";
                break;
            case 101:
            case 150:
                mensaje = "⚠️ El propietario del video no permite reproducción embebida externa (Error 150).";
                break;
        }

        estadoReproduccion.textContent = mensaje;
        btnForzarPlay.classList.remove("oculto");
        btnForzarPlay.textContent = "Intentar reproducir";
    }

    /**
     * Extrae el ID de 11 caracteres desde una URL o ID directo de YouTube
     * @param {string} url - Enlace o identificador
     * @returns {string|null} - ID del video
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
     * Calcula el inicio aleatorio entre el 15% del track y el 20% antes del final
     * @param {number} duracionTotal - Duración en segundos de la pista
     * @returns {number} - Segundo exacto de inicio
     */
    function calcularTimestampAleatorio(duracionTotal) {
        const minInicio = Math.floor(duracionTotal * CONFIG_JUEGO.porcentajeMinInicio);
        const limiteMaxTrack = duracionTotal * (1 - CONFIG_JUEGO.porcentajeMaxFin);
        const maxInicio = Math.max(minInicio, Math.floor(limiteMaxTrack - CONFIG_JUEGO.duracionFragmentoSegundos));

        const inicioAleatorio = Math.floor(minInicio + Math.random() * (maxInicio - minInicio + 1));
        console.log(`[Hitster] Duración total: ${duracionTotal}s | Rango permitido: [${minInicio}s - ${maxInicio}s] | Elegido: ${inicioAleatorio}s`);
        return inicioAleatorio;
    }

    /**
     * Manejador de eventos de cambio de estado del reproductor
     */
    function onPlayerStateChange(event) {
        // YT.PlayerState.PLAYING = 1
        if (event.data === YT.PlayerState.PLAYING) {
            estadoJuego.estaReproduciendo = true;
            actualizarBotonPlayPause(true);
            actualizarBotonToggleVideo(true);
            btnForzarPlay.classList.add("oculto");

            // Si estamos en Modo Ciego y es el primer arranque, realizamos el salto aleatorio
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
                    estadoReproduccion.textContent = "🎧 Reproduciendo fragmento a ciegas...";
                }
            }
        }
        // YT.PlayerState.PAUSED = 2
        else if (event.data === YT.PlayerState.PAUSED) {
            estadoJuego.estaReproduciendo = false;
            actualizarBotonPlayPause(false);
            actualizarBotonToggleVideo(false);
            ecualizadorOndas.classList.remove("sonando");
            if (estadoJuego.saltoRealizado && !bloqueModoCiego.classList.contains("oculto")) {
                estadoReproduccion.textContent = "⏸️ Audio pausado";
            }
        }
        // YT.PlayerState.BUFFERING = 3
        else if (event.data === YT.PlayerState.BUFFERING) {
            if (!bloqueModoCiego.classList.contains("oculto")) {
                estadoReproduccion.textContent = "Cargando audio...";
            }
        }
    }

    /**
     * Salta al segundo aleatorio, desmutea el audio y arranca el temporizador de 30s
     * @param {number} duracion - Duración total detectada
     */
    function ejecutarSaltoAleatorioYDesmutear(duracion) {
        estadoJuego.saltoRealizado = true;
        const puntoInicio = calcularTimestampAleatorio(duracion);
        estadoJuego.timestampInicio = puntoInicio;

        // Saltamos al punto aleatorio
        ytPlayer.seekTo(puntoInicio, true);

        // Desmutear y asegurar volumen al 100%
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();

        ecualizadorOndas.classList.add("sonando");
        estadoReproduccion.textContent = "🎧 Reproduciendo fragmento a ciegas...";

        // Iniciar la cuenta regresiva de 30s
        iniciarTemporizador(CONFIG_JUEGO.duracionFragmentoSegundos);
    }

    // =========================================================================
    // 5. CONTROL DEL MODO CIEGO Y TEMPORIZADOR (FASE 3)
    // =========================================================================

    /**
     * Inicia la experiencia del Modo Ciego para la carta encontrada
     * @param {Object} cancion - Canción a reproducir
     */
    function iniciarModoCiego(cancion) {
        estadoJuego.cancionActual = cancion;
        estadoJuego.saltoRealizado = false;

        // Reset de vistas
        seccionMenu.classList.add("oculto");
        seccionResultado.classList.add("oculto");
        seccionJuego.classList.remove("oculto");

        // Activar Bloque Modo Ciego y ocultar Bloque de Revelación
        bloqueModoCiego.classList.remove("oculto");
        bloqueRevelacion.classList.add("oculto");
        cortinaCiega.classList.remove("oculto");

        // Cabecera
        badgeModoJuego.textContent = "🎧 Modo Ciego";
        badgeModoJuego.className = "badge-modo";
        indicadorIdCarta.textContent = cancion.id;
        estadoReproduccion.textContent = "Conectando con YouTube...";
        btnForzarPlay.classList.add("oculto");
        
        // Reset del temporizador visual
        temporizadorSegundos.textContent = `${CONFIG_JUEGO.duracionFragmentoSegundos}s`;
        barraProgresoRelleno.style.width = "100%";
        ecualizadorOndas.classList.remove("sonando");

        const videoId = extraerVideoId(cancion.youtube_url);
        if (!videoId) {
            alert("Error: El enlace no contiene un ID de video válido de YouTube.");
            cancelarJuego();
            return;
        }

        // Si el reproductor aún no terminó de cargar
        if (!ytPlayer || !estadoJuego.reproductorListo) {
            estadoReproduccion.textContent = "Cargando motor de reproducción...";
            btnForzarPlay.classList.remove("oculto");
            btnForzarPlay.textContent = "▶️ Toca para iniciar audio";
            return;
        }

        // Cargar video silenciado temporalmente (para evitar escuchar el intro antes del salto)
        try {
            ytPlayer.mute();
            ytPlayer.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
            ytPlayer.playVideo();

            // Timeout de seguridad para navegadores que bloquean autoplay inicial
            setTimeout(() => {
                if (!estadoJuego.estaReproduciendo) {
                    btnForzarPlay.classList.remove("oculto");
                    btnForzarPlay.textContent = "▶️ Toca para iniciar audio";
                }
            }, 2500);

        } catch (err) {
            console.error("[Hitster] Error al reproducir video:", err);
            btnForzarPlay.classList.remove("oculto");
            estadoReproduccion.textContent = "Toca para intentar reproducir.";
        }
    }

    /**
     * Inicia la cuenta regresiva del fragmento musical
     * @param {number} segundosTotales - Duración a descontar (30s)
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

    function actualizarVisualTemporizador(restante, total) {
        const segEnteros = Math.ceil(restante);
        temporizadorSegundos.textContent = `${segEnteros}s`;
        const porcentaje = Math.max(0, Math.min(100, (restante / total) * 100));
        barraProgresoRelleno.style.width = `${porcentaje}%`;
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

    /**
     * Se ejecuta al expirar el tiempo de 30 segundos
     */
    function tiempoAgotadoModoCiego() {
        console.log("[Hitster] Tiempo agotado. Guardando corte.");
        if (ytPlayer && ytPlayer.getCurrentTime) {
            estadoJuego.timestampCorte = ytPlayer.getCurrentTime();
        }
        if (ytPlayer && ytPlayer.pauseVideo) {
            ytPlayer.pauseVideo();
        }
        estadoReproduccion.textContent = "⏱️ ¡Tiempo terminado! Momento de revelar la carta.";
        ecualizadorOndas.classList.remove("sonando");

        // Al terminar el tiempo, revelar automáticamente la carta
        revelarCarta();
    }

    // =========================================================================
    // 6. PANTALLA DE REVELACIÓN Y CONTROLES DUALES (FASE 4)
    // =========================================================================

    /**
     * Extrae el año y la fecha legible de un string de lanzamiento (ej. "1984-04-02")
     * @param {string} fechaStr - Fecha en formato AAAA-MM-DD
     * @returns {Object} - Año y fecha formateada
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
     * Revela el video oficial de YouTube y la tarjeta visual con todos los datos
     */
    function revelarCarta() {
        detenerTemporizador();

        // 1. Guardar el segundo exacto donde se detuvo el fragmento
        if (ytPlayer && ytPlayer.getCurrentTime) {
            estadoJuego.timestampCorte = ytPlayer.getCurrentTime();
        }

        // 2. Pausar momentáneamente el video para dar paso a la deliberación
        if (ytPlayer && ytPlayer.pauseVideo) {
            ytPlayer.pauseVideo();
        }

        const cancion = estadoJuego.cancionActual;
        if (!cancion) return;

        // 3. Retirar la Cortina Anti-Spoilers (el video queda visible en pantalla)
        cortinaCiega.classList.add("oculto");

        // 4. Cambiar vistas internas: Ocultar controles del modo ciego y mostrar bloque de revelación
        bloqueModoCiego.classList.add("oculto");
        bloqueRevelacion.classList.remove("oculto");

        // 5. Actualizar la cabecera
        badgeModoJuego.textContent = "🎉 Carta Revelada";
        badgeModoJuego.className = "badge-modo revelado";

        // 6. Renderizar tarjeta visual ampliada con los datos de la canción
        const { anio, fechaCompleta } = extraerDatosFecha(cancion.lanzamiento);
        revelacionAno.textContent = anio;
        revelacionCancion.textContent = cancion.cancion;
        revelacionArtista.textContent = cancion.artista;
        revelacionAlbum.textContent = cancion.album || "Sencillo / Desconocido";
        revelacionFecha.textContent = fechaCompleta;

        estadoRevelacion.textContent = "Video revelado. Usa los controles para festejar o continuar.";
        actualizarBotonToggleVideo(false);

        console.log(`[Hitster] Carta revelada: ${cancion.cancion} (${anio}) | Corte guardado en: ${Math.floor(estadoJuego.timestampCorte)}s`);
    }

    /**
     * Control Dual 1: Festejo / Reproducir desde el inicio (segundo 0)
     */
    function reproducirDesdeInicio() {
        if (!ytPlayer) return;

        console.log("[Hitster] Control Dual: Reproduciendo desde el inicio (0:00)");
        ytPlayer.seekTo(0, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();

        estadoRevelacion.textContent = "▶️ Festejo: Sonando desde el inicio (0:00)";
        actualizarBotonToggleVideo(true);
    }

    /**
     * Control Dual 2: Continuar desde el corte exacto donde terminó el fragmento
     */
    function continuarDesdeCorte() {
        if (!ytPlayer) return;

        const puntoCorte = estadoJuego.timestampCorte || estadoJuego.timestampInicio || 0;
        console.log(`[Hitster] Control Dual: Continuando desde el corte (${Math.floor(puntoCorte)}s)`);

        ytPlayer.seekTo(puntoCorte, true);
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        ytPlayer.playVideo();

        estadoRevelacion.textContent = `🔀 Continuando reproducción desde el segundo ${Math.floor(puntoCorte)}s`;
        actualizarBotonToggleVideo(true);
    }

    /**
     * Alterna la reproducción/pausa del video en la pantalla de revelación
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
     * Actualiza el botón de Play/Pausa del video revelado
     * @param {boolean} reproduciendo - Si el video está en reproducción
     */
    function actualizarBotonToggleVideo(reproduciendo) {
        btnToggleVideo.textContent = reproduciendo ? "⏸️ Pausar Video" : "▶️ Reanudar Video";
    }

    /**
     * Prepara el sistema y regresa al menú para escanear la siguiente carta
     */
    function siguienteCarta() {
        // Detener reproducción
        if (ytPlayer && ytPlayer.stopVideo) {
            ytPlayer.stopVideo();
        }

        detenerTemporizador();

        // Reset de estados
        estadoJuego.cancionActual = null;
        estadoJuego.saltoRealizado = false;
        estadoJuego.timestampCorte = 0;
        estadoJuego.timestampInicio = 0;

        // Restaurar vistas
        seccionJuego.classList.add("oculto");
        cortinaCiega.classList.remove("oculto");
        bloqueRevelacion.classList.add("oculto");
        bloqueModoCiego.classList.remove("oculto");
        seccionMenu.classList.remove("oculto");

        console.log("[Hitster] Listo para la siguiente carta de la partida.");
    }

    /**
     * Cancela la partida y regresa al menú principal
     */
    function cancelarJuego() {
        siguienteCarta();
    }

    // =========================================================================
    // 7. PROCESAMIENTO DE CÓDIGOS (QR / MANUAL)
    // =========================================================================

    function procesarCodigo(rawId) {
        const id = rawId.trim();
        const cancion = buscarCancionPorId(id);

        if (cancion) {
            console.log("[Hitster] Carta identificada:", cancion);
            iniciarModoCiego(cancion);
        } else {
            seccionMenu.classList.remove("oculto");
            seccionJuego.classList.add("oculto");
            codigoEscaneado.textContent = id;
            seccionResultado.classList.remove("oculto");
        }
    }

    // =========================================================================
    // 8. CONTROL DEL ESCÁNER QR (html5-qrcode)
    // =========================================================================

    async function iniciarScanner() {
        if (typeof Html5Qrcode === "undefined") {
            alert("Error: La librería html5-qrcode no se pudo cargar. Revisa tu conexión a internet.");
            return;
        }

        scannerError.classList.add("oculto");
        scannerError.textContent = "";
        modalScanner.classList.remove("oculto");

        try {
            if (!html5QrCode) {
                // verbose: false evita saturar la memoria y el hilo principal del móvil
                html5QrCode = new Html5Qrcode("reader", false);
            }

            // Configuración optimizada para móviles (evita calentamiento y lag):
            // 1. fps: 8 (suficiente para detectar al instante y ahorra 40% de CPU).
            // 2. disableFlip: true (evita transformar la imagen de la cámara trasera).
            // 3. useBarCodeDetectorIfSupported: true (activa aceleración por hardware del procesador del móvil).
            const config = {
                fps: 8,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.max(200, Math.floor(minEdge * 0.75));
                    return { width: qrboxSize, height: qrboxSize };
                },
                aspectRatio: 1.0,
                disableFlip: true,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            const cameraConfig = {
                facingMode: "environment",
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            };

            await html5QrCode.start(
                cameraConfig,
                config,
                onScanSuccess,
                onScanFailure
            );

            isScanning = true;
        } catch (err) {
            console.error("[Hitster] Error al iniciar cámara:", err);
            mostrarErrorScanner(obtenerMensajeError(err));
        }
    }

    async function detenerScanner() {
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop();
            } catch (err) {
                console.warn("[Hitster] Error al detener escáner:", err);
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

    function onScanFailure(error) {}

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
    // 9. ASIGNACIÓN DE EVENTOS DEL DOM
    // =========================================================================

    // Menú principal
    btnEscanear.addEventListener("click", iniciarScanner);
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

    // Panel de error
    btnReintentar.addEventListener("click", () => {
        seccionResultado.classList.add("oculto");
        seccionMenu.classList.remove("oculto");
    });

    // Modal de ingreso manual
    btnManual.addEventListener("click", () => {
        inputCodigo.value = "";
        modalManual.classList.remove("oculto");
        inputCodigo.focus();
    });

    const cerrarModalManual = () => {
        modalManual.classList.add("oculto");
    };

    btnCerrarManual.addEventListener("click", cerrarModalManual);
    btnCancelarManual.addEventListener("click", cerrarModalManual);

    formManual.addEventListener("submit", (e) => {
        e.preventDefault();
        const codigo = inputCodigo.value.trim();
        if (codigo) {
            cerrarModalManual();
            procesarCodigo(codigo);
        }
    });

    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!modalScanner.classList.contains("oculto")) detenerScanner();
            if (!modalManual.classList.contains("oculto")) cerrarModalManual();
        }
    });

    // =========================================================================
    // 10. ARRANQUE DE SERVICIOS Y PWA
    // =========================================================================
    cargarBaseDeDatos();
    cargarYouTubeIframeAPI();

    // Registro del Service Worker para funcionamiento como Progressive Web App (PWA)
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[Hitster] PWA Service Worker registrado con éxito.'))
            .catch(err => console.log('[Hitster] Error al registrar Service Worker:', err));
    }
});

# 🎵 TubesTer v1.0.1

> **Nota importante:** Este proyecto es una versión pensada para utilizarse como plataforma de música basada en YouTube, **sin ánimo de lucro**, con el objetivo principal de ayudar y servir de alternativa a aquellas personas que no dispongan de Spotify.

¡Un juego web interactivo y ligero para descubrir canciones y ordenarlas cronológicamente, con reproducción de videos de YouTube!

## 🚀 Descripción del Proyecto y cambios de esta versión
**TubesTer** es una aplicación web diseñada para jugar con amigos, adivinar canciones, ordenar temas musicales cronológicamente y disfrutar de la música de forma lúdica directamente desde el navegador. Al estar desarrollada como una **PWA (Progressive Web App)**, ofrece un rendimiento fluido y una experiencia excelente.

Al iniciar una partida clásica puedes elegir entre fragmentos de **15, 30 o 60 segundos**, o escuchar la canción completa en modo **Chill**. También puedes configurar **Chance** como No o elegir entre 1 y 3 oportunidades. Al terminar el fragmento, la canción se revela después de una breve pausa y vuelve a reproducirse desde el inicio.

El visualizador de audio es una animación decorativa; no analiza directamente el sonido del reproductor de YouTube.

La pantalla de canción revelada prioriza el botón **Siguiente Carta** para facilitar rondas continuas en móviles; los controles de reproducción compactos incluyen etiquetas accesibles y ayuda emergente en escritorio.

El catálogo usa `ids` para asociar varias cartas físicas a una canción y `youtube_urls` para guardar enlaces de reproducción en orden de respaldo. Si un video falla, el reproductor prueba el siguiente enlace disponible. Ejemplo:

```json
{
  "ids": ["HIT_001", "EDICION_001"],
  "titulo": "Nombre de la canción",
  "artista": "Nombre del artista",
  "genero": "Rock",
  "youtube_urls": [
    "https://www.youtube.com/watch?v=VIDEO_PRINCIPAL",
    "https://www.youtube.com/watch?v=VIDEO_RESPALDO"
  ]
}
```

## 🛠️ Tecnologías Utilizadas
* **JavaScript (~60%):** Lógica del juego, manejo de eventos y control de reproducción[cite: 1].
* **CSS (~24.1%):** Estilos personalizados, diseño responsivo y atractiva interfaz de usuario[cite: 1].
* **HTML (~15.9%):** Estructura base de la aplicación[cite: 1].
* **PWA:** Configuración mediante Service Worker (`sw.js`) y `manifest.json`[cite: 1].

## 📁 Estructura del Repositorio
* `index.html` - Página principal de la interfaz[cite: 1].
* `app.js` - Lógica principal de funcionamiento y juego[cite: 1].
* `canciones.js` & `canciones.json` - Base de datos y catálogo de pistas musicales[cite: 1].
* `style.css` - Estilos visuales del proyecto[cite: 1].
* `sw.js` - Service Worker para la gestión offline de la PWA[cite: 1].
* `manifest.json` - Manifiesto de la aplicación web progresiva[cite: 1].
* `icono.svg` - Identidad visual / icono del proyecto[cite: 1].

## 📱 Cómo Jugar e Instalar la PWA
Para disfrutar de la mejor experiencia y asegurar que la base de datos cargue perfectamente, accede directamente a la plataforma en línea:

👉 **Enlace web:** [https://dark-nick.github.io/Tubester/] *(Recuerda activar GitHub Pages en la configuración de tu repositorio si aún no está activo).*

### ¿Cómo instalarla en tu celular como una aplicación?
1. Entra al enlace de la app desde el navegador de tu smartphone (**Chrome** en Android o **Safari** en iOS).
2. Despliega el menú del navegador (los tres puntos en la esquina superior derecha en Android, o el botón de compartir en iOS).
3. Selecciona la opción **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
4. ¡Listo! Se creará un acceso directo con el icono oficial del juego en tu pantalla de inicio para que lo uses como una aplicación nativa.

---
Desarrollado con inteligencIA, ingenierIA, conocimiento y pasión por [Dark-Nick](https://github.com/Dark-Nick)[cite: 1].

# Fan Festival Bingo 2026

Bingo fan-made de FFXIV para el Fan Festival. 100% estático, publicable gratis en GitHub Pages.

> Hecho por fans · No afiliado a SQUARE ENIX

## Cómo funciona

- Cada jugador entra con su nombre (WoL) y escribe 24 apuestas. La casilla central es FREE.
- `🔒 Validar y bloquear` comprueba duplicados y bloquea el cartón.
- El panel **En vivo** muestra ranking por aciertos / líneas.
- El panel **Presentador** lista todas las apuestas escritas. Al tocar una, se marca en todos los cartones (★). Toca de nuevo para deshacer.
- Clic en un jugador para ver su cartón.

## Publicar gratis en GitHub Pages (5 min)

Sí, se puede, es gratis para repos públicos:

1. Crea cuenta en https://github.com (si no tienes).
2. Crea un repo nuevo, por ejemplo `ffxiv-bingo`. **Public**, sin README inicial.
3. Sube estos archivos (`index.html`, `styles.css`, `app.js`, `omega.svg`):
```bash
cd ffxiv
git init
git add .
git commit -m "Bingo Fan Festival 2026"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ffxiv-bingo.git
git push -u origin main
```
4. En GitHub: `Settings → Pages → Deploy from a branch → main / (root) → Save`.
5. En 1-2 min tendrás tu URL: `https://TU_USUARIO.github.io/ffxiv-bingo/`

Cada vez que hagas `git push`, se republica solo.

> Alternativa sin terminal: en la web de GitHub, `Add file → Upload files` y sube los 4 archivos, luego activa Pages igual.

## Modo local vs en vivo ☁️

Tal como está, funciona **sin configurar nada** en modo local:
- Cada navegador guarda sus cartones en `localStorage`.
- Ideal para probar, o para jugar con un solo PC proyectado en Discord/TV.

Para **multijugador real** (cada amigo desde su móvil/PC y ranking en vivo), necesitas Firebase gratis (plan Spark):

1. Ve a https://console.firebase.google.com → Crear proyecto (sin Analytics vale).
2. `Build → Firestore Database → Crear base de datos → modo producción`.
   - Reglas para un bingo entre amigos (léelas, es abierto):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   Para algo más serio, limita por tiempo o pide ayuda y te las endurecemos.
3. `Build → Authentication → Sign-in method → Anonymous → Enable`.
4. `Project settings → Your apps → Web </> → copia el `firebaseConfig`.
5. Copia `firebase-config.example.js` a `firebase-config.js` y pega tu config:
```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
};
```
6. Sube / haz push de nuevo. La página detectará la config y pasará a `☁️ Modo en vivo` automáticamente.

## Estructura

- `index.html` – maquetación
- `styles.css` – tema oscuro / dorado FFXIV
- `app.js` – lógica (local + Firebase)
- `omega.svg` – logo (reemplaza el PNG en base64 de 100KB del HTML original)
- `firebase-config.js` – NO se sube (está en `.gitignore`). Solo `firebase-config.example.js`.

## Ideas siguientes

- [ ] Botón "cartón aleatorio" con 24 predicciones típicas
- [ ] Sonido + confetti al cantar línea
- [ ] QR para compartir sala

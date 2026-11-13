# PERFUMES MTM · Cliente

Catálogo Vite con 118 perfumes, combos manuales, fichas animadas, carrito persistente y finalización por WhatsApp. Incluye Three.js, GSAP, orden por nombre o precio, filtros Hombre/Mujer y movimiento reducido.

## Ejecutar

Requiere Node.js 24+.

```sh
npm ci
npm run dev
npm run build
```

El desarrollo usa http://localhost:5173 y el proxy `/api` hacia http://localhost:3001. Para una API en otro dominio, configurar `VITE_API_URL=https://tu-api/api/v1` en `.env` antes de construir. El hosting publica `dist/`. Solo se admite configuración pública en el cliente.

El backend está en https://github.com/Saubtw/perfumesmtm-api. Para las pruebas, clonar ambos repositorios como carpetas hermanas `perfumesmtm-client` y `perfumesmtm-api`, ejecutar `npm ci` en ambos y luego:

```sh
npx playwright install chromium
npm test
```

Playwright inicia ambos servidores, o reutiliza los que ya estén corriendo. Sin backend hermano se necesita una API local activa en el puerto 3001. Las pruebas no envían mensajes reales de WhatsApp ni invocan el asesor remoto.

## Combos y compra

`src/combos.js` es la lista manual: `enabled`, precio, composición exacta y orden de publicación. No se generan promociones automáticamente. Los precios individuales provienen de la API. Cualquier acción de agregar muestra el carrito; agregar desde una ficha cierra primero esa ficha. WhatsApp solicita únicamente el nombre y mantiene la selección después de abrirse.

Consultar `docs/cart-and-promotions.md` para las reglas de paquetes y restauración. Las fotografías y modelos necesarios están incluidos en `public/`. Las credenciales y las bases de datos no forman parte del repositorio.

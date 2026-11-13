# Carrito y combos

Los 118 precios autorizados se importan del catálogo comercial del Excel suministrado. El orden del archivo difiere del sitio: `scripts/import-pricing.py` vincula por marca y nombre, con tres equivalencias explícitas, y valida 118 referencias distintas. `api/data/pricing.json` solo contiene precios públicos, sin costos, márgenes ni datos de socios.

## Lista manual

`client/src/combos.js` es la única lista que decide qué paquetes se publican. Cada entrada contiene `id` estable, `enabled`, nombre, precio MXN, perfumes exactos como pares `[marca, nombre]`, descripción y tono visual. Para ocultar un paquete, cambiar `enabled` a `false`. Para agregar uno, crear una entrada con sus productos reales y un ID nuevo. El orden del archivo es el de las tarjetas.

No hay constructor, selector de perfumes ni generación automática de promociones. El carrito verifica la composición exacta; un conjunto distinto no recibe descuento. El ahorro se calcula contra los precios individuales actuales de las mismas referencias.

La lista inicial incluye las ocho composiciones del Excel:

| Combo | Precio MXN | Ahorro inicial MXN |
| --- | ---: | ---: |
| Cloud & Crystal: Cloud + Bright Crystal | 999 | 199 |
| Sauvage & Good Girl: Sauvage + Good Girl Eau de Parfum | 1,199 | 199 |
| Y & Le Male: Y Eau de Parfum + Le Male Elixir | 1,199 | 199 |
| Imagination & Baccarat: Imagination + Baccarat Rouge 540 | 1,399 | 199 |
| VIP · Cloud · Crystal: 212 VIP Black + Cloud + Bright Crystal | 1,399 | 448 |
| Le Beau · Roma · Blush: Le Beau Le Parfum + Donna Born in Roma Intense + Good Girl Blush | 1,799 | 348 |
| Herrera · Cloud · Crystal: 212 VIP Black + Good Girl Eau de Parfum + Cloud + Bright Crystal | 1,999 | 547 |
| Imagination · Baccarat · Tobacco: Imagination + Baccarat Rouge 540 + Tobacco Vanille | 2,099 | 298 |

Imagination & Baccarat y Imagination · Baccarat · Tobacco aparecen como «Bajo pedido», conforme al contexto del archivo. No se anuncia disponibilidad inmediata, envío gratuito ni fechas límite. Se conservan las fotografías originales sin fondos blancos añadidos a sus composiciones.

## Carrito y WhatsApp

`client/src/commerce.js` centraliza composición, totales, restauración y mensaje. El carrito guarda IDs, promoción y cantidad en `mtm-cart-v1` y recalcula los importes al recuperarse. Las cantidades de los combos modifican paquetes completos. Las selecciones del constructor anterior que ya no coinciden con un combo publicado se conservan como perfumes individuales a precio normal, con aviso visible.

Pulsar una fila del carrito abre la misma ficha del catálogo, animada desde esa fila al centro. Cerrar devuelve el foco a la fila sin cambiar el desplazamiento, incluso después de agregar unidades desde la ficha. Se respeta `prefers-reduced-motion`.

Finalizar solicita únicamente el nombre en un modal. Cancelar conserva el carrito. Continuar abre `https://wa.me/528714750620` usando `encodeURIComponent` y `noopener,noreferrer`. El mensaje empieza con `NUEVO PEDIDO DE "Nombre"`, separa los productos y combos con guiones e incluye cantidades, importes, ahorro y total MXN. Termina con: «Quedo pendiente de la confirmación de mi pedido y ponernos de acuerdo con la entrega. Gracias.». Abrir WhatsApp no vacía el carrito ni crea pedidos o movimientos de inventario.

Las pruebas interceptan `window.open` sin enviar mensajes reales. Verifican las ocho composiciones y sus ahorros, rechazo de paquetes arbitrarios, restauración de selecciones anteriores, cantidades, eliminación, nombre obligatorio y fichas animadas desde el carrito, en móvil, tableta y escritorio.

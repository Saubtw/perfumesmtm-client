# Administración de Perfumes MTM

Acceso directo: `/dashboard-admin`. No existe un botón público para entrar. La ruta exige correo y contraseña; conocer el enlace no permite consultar ni modificar datos privados. El propietario inicial es `albertosaut@gmail.com`. La contraseña se configuró directamente en Supabase Auth y no forma parte del código ni del cliente.

## Catálogo inicial

Se conservan 119 fichas. Solo 16 están habilitadas, cada una con una unidad comercial:

| ID | Perfume |
| --- | --- |
| 22 | Jean Paul Gaultier Le Male Elixir |
| 24 | Jean Paul Gaultier Ultra Male |
| 30 | Louis Vuitton Imagination |
| 35 | Valentino Uomo Born in Roma Intense |
| 42 | Afnan 9PM Rebel |
| 44 | Carolina Herrera 212 VIP Black |
| 50 | Versace Eros Eau de Parfum |
| 54 | Rasasi Hawas Ice |
| 65 | Giorgio Armani Acqua di Giò Profondo |
| 67 | Giorgio Armani Stronger With You Absolutely |
| 68 | Rabanne Invictus Victory Elixir |
| 75 | Xerjoff Erba Pura |
| 92 | Carolina Herrera Good Girl Eau de Parfum |
| 104 | Jean Paul Gaultier Gaultier Divine |
| 111 | Lancôme La Vie Est Belle |
| 119 | Chanel Coco Mademoiselle Intense |

Las otras 103 fichas permanecen ocultas y se pueden reactivar. Intense se agregó como ficha independiente y conserva oculta la versión original de Coco Mademoiselle. Se actualizaron nombre e imagen de Victory Elixir. Las dos imágenes suministradas se copiaron sin modificar; `api/data/image-provenance.json` registra origen y SHA-256.

La visibilidad es independiente del stock. Un perfume habilitado puede tener cero unidades; el proceso comercial sigue siendo confirmación por WhatsApp. Las seis unidades personales del pedido de 22 no ingresaron al inventario comercial.

## Operación

- **Catálogo:** buscar por nombre/marca, mostrar visibles u ocultos, cambiar precio de venta y guardar por perfume.
- **Marcas:** ocultar una marca retira sus productos y combos públicos sin perder las selecciones individuales.
- **Promociones:** crear o editar combos de 2–4 unidades, precio, descripción, color, orden y publicación. Solo se muestran si todas las referencias/marcas están visibles y el combo cuesta menos que la suma individual. Los ocho combos previos se conservaron desactivados para poder adaptarlos.
- **Stock y ventas:** registrar compras, ventas confirmadas y bajas. Una compra admite varias referencias y cantidad total del pedido, incluso si parte del pedido es personal. Cada venta requiere el precio real cobrado por unidad. En un combo, repartir el total entre las unidades.
- **Resultados:** ingresos, costo vendido, compras, bajas, utilidad bruta después de bajas, stock y valor al costo; periodos de 7/30/90 días o todo el historial, ventas por día y referencias más vendidas. No incluye gastos operativos ni pedidos inferidos de WhatsApp.
- **Cuentas:** el propietario crea administradores o cuentas de consulta y puede desactivarlas. Los administradores operan catálogo, marcas, promociones e inventario; consulta permite monitorear sin escribir. Solo el propietario administra cuentas.
- **Mi cuenta:** cambiar contraseña o correo de acceso con validación de la contraseña actual y volver a iniciar sesión.

## Costos de compra

| Tamaño total del pedido | Costo unitario MXN |
| --- | ---: |
| 1–4 | 500 |
| 5–9 | 400 |
| 10–19 | 350 |
| 20–34 | 310 |
| 35–49 | 290 |
| 50 o más | 270 |

Son costos del proveedor, no precios públicos de venta. El costo inicial comercial es 16 × $310 = **$4,960**, usando el tamaño del pedido completo (22). Se conserva el precio público anterior de cada perfume. Para la nueva ficha Intense se tomó inicialmente el precio Chanel existente ($699), editable desde el panel.

El inventario calcula costo promedio ponderado al comprar. Ventas y bajas usan el costo promedio vigente al momento del movimiento. La base bloquea filas en orden, evita stock negativo y acepta claves de idempotencia para que un reintento no duplique stock. Cada lote se registra en una transacción: si falla una línea, se revierte el lote entero.

Los resultados agregan **todo** el historial en la base. La lista operativa muestra hasta 1,000 lotes y 10,000 líneas recientes; la pantalla presenta los últimos 50 lotes. No confundir esos límites de consulta con los totales financieros.

## Protección y persistencia

Supabase Auth verifica la identidad. La cookie de acceso es HttpOnly, Secure en producción, SameSite configurable, con duración máxima de una hora y sin token en localStorage. Cada solicitud vuelve a validar al usuario y sus permisos activos. CORS y validación de Origin protegen cambios; la API limita intentos de acceso. Las credenciales de servicio permanecen en servidor. RLS y concesiones bloquean acceso directo de clientes a inventario, costos, cuentas, movimientos y auditoría. El catálogo público, sus detalles, relacionados y herramientas del asesor comparten el filtro de publicación.

El asesor de seguridad quedó sin avisos de RLS después de las políticas explícitas. Permanece un aviso de configuración previo: [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificó ese ajuste global de Auth.

Los perfiles de las versiones actualizadas se verificaron en las páginas oficiales de [Chanel Intense](https://www.chanel.com/us/fragrance/p/116660/coco-mademoiselle-eau-de-parfum-intense-spray/) y [Rabanne Victory Elixir](https://www.rabanne.com/uk/en_GB/fragrance/p/invictus-victory-elixir--000000000065188730). `api/data/version-details.json` conserva los textos específicos; `scripts/sync-version-details.mjs` los sincroniza sin copiar las descripciones de otras versiones.

Migraciones aplicadas al proyecto existente: `supabase/migrations/20261114200556_admin_inventory.sql` y `20261114202243_explicit_admin_policies.sql`. No se eliminaron productos. `sillage_inventory` es la fuente del stock nuevo; las columnas históricas de stock de `sillage_products` no se usan.

## Validación

- 10 pruebas API y 44 regresiones históricas de interfaz, más 4 pruebas del panel y publicación comercial.
- Prueba real `api/scripts/smoke-admin.ts`: acceso propietario, activación reversible de perfume y marca, promoción editable, cuenta temporal de consulta, bloqueo de escritura y revocación, rechazo de venta sin stock, costos iniciales y ausencia de datos privados en respuestas públicas. Las cuentas/promociones temporales se limpian.
- Prueba SQL con rollback: entrada, costo promedio, venta, idempotencia y rechazo de sobreventa; no quedaron ventas ficticias.
- Capturas de interfaz en 1440, 390 y 320 px bajo `docs/evidence/admin-*.png`.

Para ejecutar la prueba real se requieren `MTM_ADMIN_EMAIL` y `MTM_ADMIN_PASSWORD` en el entorno del proceso; nunca agregarlos al repositorio. El script supone el stock inicial intacto. `bootstrap-admin.ts` es una herramienta manual de configuración de propietario, no se ejecuta durante el arranque ni reinicia contraseñas automáticamente.

## Publicación

Construir cliente y API con `npm run build`. Vercel debe publicar la API y el cliente actualizados; `client/vercel.json` resuelve `/dashboard-admin` a la aplicación y mantiene el proxy existente `/api`. Las variables privadas de Supabase ya usadas por la API son suficientes, sin exponer claves nuevas al navegador. El cambio de base está aplicado; la interfaz requiere publicar los nuevos builds. En esta sesión Vercel no tenía una sesión CLI y la conexión GitHub ofrecía lectura sin permiso de push.

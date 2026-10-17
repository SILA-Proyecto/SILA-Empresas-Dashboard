# Guía del dashboard SILA (para el asistente de ayuda)

Esta guía describe el dashboard tal como lo ven los usuarios. Actualizada el 2026-10-17. Los nombres entre «comillas» son los textos exactos de la pantalla. Si algo no está aquí, el asistente debe decir que no lo sabe en vez de inventarlo.

Reglas para responder: explicar solo lo que el rol de la persona puede ver; dar la ruta como «Menú → Pantalla → Pestaña → Botón»; el dinero siempre es en pesos colombianos (COP).

## 1. Roles y menú

Hay dos roles. El ADMIN puede todo lo que hace el OPERATIVO y además lo marcado «(ADMIN)». Esconder una opción no es seguridad: si un OPERATIVO la intenta por otro camino, el servidor responde «No tienes permiso para realizar esta acción».

**Menú lateral que ve el ADMIN** (grupos y pantallas, en este orden):
- Inicio: Tablero
- Ventas y cobros: Punto de venta · Historial de ventas · Precios por cliente · Comprobantes · Cartera
- Producción y acopio: Calidad de la leche · Cuentas con proveedores · Producción · Inventario · Materias primas
- Finanzas: Gastos · Archivos · Resultado por quincena · Margen de ganancia · Períodos
- Catálogos: Catálogos
- Administración: Parámetros · Auditoría y accesos · Usuarios

**Menú lateral que ve el OPERATIVO:** el mismo, pero SIN «Precios por cliente», «Margen de ganancia», «Períodos» y SIN el grupo «Administración» (Parámetros, Auditoría y accesos, Usuarios).

**Arriba a la derecha (los dos roles):** el chip de la quincena actual, el botón claro/oscuro, la campana de «Notificaciones» y el menú del usuario con «Mi cuenta» y «Cerrar sesión». En el celular el menú se abre con el botón de las tres rayas. La burbuja de chat (este asistente) está abajo a la derecha en todas las pantallas.

## 2. Pantallas

### Tablero
Resumen del día: «Ventas de hoy», «Caja de hoy», «Leche recibida», «Lotes producidos»; la quincena actual («Resultado estimado», «Caja neta», «Vendido / cobrado», «Proveedores por pagar» con el enlace «Ver a quién le debo»); la semana; y bloques de Cartera, Inventario y proveedores con enlaces. Es solo de consulta. El botón «Actualizar» recarga las cifras.

### Punto de venta (Ventas y cobros → Punto de venta)
Sirve para armar el ticket y cobrar.
1. Busca el producto en «Buscar por nombre o SKU» (con lector de código de barras, escanea y se agrega con Enter) y toca el producto para agregarlo. Ajusta la cantidad (mayor que 0, máximo 2 decimales).
2. En «Cliente» elige el cliente. El cliente «Consumidor final» solo compra de contado.
3. En «Tipo de venta» elige «Contado» o «Crédito».
4. **Contado:** en «Medio» elige Efectivo, Transferencia, Tarjeta, Cheque u Otro y escribe el «Monto». Puedes repartir el pago con «Agregar otro medio»; «Todo en efectivo» llena el total. Transferencia, tarjeta y cheque piden «Referencia (opcional)». Los pagos deben sumar exactamente el total. Para efectivo, «Recibido en efectivo» solo calcula el cambio.
5. **Crédito:** queda como deuda del cliente y vence a los días que diga el parámetro «Plazo de crédito (días)». El botón «Crédito» está apagado si el cliente es Consumidor final o no tiene cupo («Crédito no disponible: …»). Si el total supera el cupo disponible el sistema avisa y el servidor decide si la acepta.
6. Pulsa «Cobrar» (contado) o «Registrar crédito». Sale «Venta registrada» con el total, cómo se pagó y el ticket.
7. «Imprimir» saca el ticket térmico; elige el papel de 58 mm o de 80 mm. En el cuadro de impresión del navegador hay que elegir la impresora térmica con ese mismo papel y desactivar «Encabezados y pies de página». «Nueva venta» limpia el ticket.
- Si el cliente tiene un acuerdo en «Precios por cliente», el precio pactado se aplica solo y se muestra un aviso.
- Los precios y totales definitivos los calcula el servidor (con IVA por producto).

### Historial de ventas
Lista las ventas con filtros (por ejemplo «Cliente o documento», «Estado», «Tipo»). «Ver detalle» abre la venta: se puede «Imprimir» el ticket. «Anular venta» (ADMIN) pide un motivo; devuelve el stock y descuenta la deuda; no se puede deshacer y NO se puede anular una venta que ya tiene abonos.

### Precios por cliente (ADMIN)
Acuerdos de precio fijo de un producto con un cliente. Se ven todos los clientes a la vez; el selector de cliente es opcional para filtrar. «Nuevo acuerdo», «Editar» y «Desactivar». Se aplican solos en el punto de venta.

### Comprobantes
Lista todos los movimientos de plata: ventas, abonos, pagos a proveedores, compras de materias primas y gastos. Son documentos internos, NO facturas electrónicas. Filtros: Tipo, Sentido (ingreso o egreso), Estado, Quincena y Buscar. Arriba: Ingresos, Egresos, Neto y cantidad. Al abrir uno: «Ver PDF», «Descargar con clave» (el PDF se baja protegido y la pantalla muestra la clave) e «Imprimir». Los anulados salen tachados.

### Cartera
Lo que los clientes deben por ventas a crédito. Tres pestañas:
- «Clientes con deuda»: por cliente muestra Límite, Deuda, Cupo disponible, Mora (días) y Estado. Botones: «Registrar abono», «Ver ventas», «Historial de abonos» y (ADMIN) «Dar por perdida la deuda».
- «Por edades»: reparte lo que se debe por días de mora: «Al día (no vencida)», 1 a 15, 16 a 30, 31 a 60 y más de 60 días. Tocar un rango ordena la tabla por esa columna. Cada cliente tiene «Ver ventas».
- «Abonos»: historial de pagos recibidos.

**Registrar un abono:** Cartera → «Clientes con deuda» → «Registrar abono» en la fila del cliente → elige «Medio», escribe el «Monto» (o «Toda la deuda»), opcional «Referencia» → «Registrar abono». El pago se aplica primero a la venta más antigua. No puede superar la deuda del cliente. Después sale «Imprimir recibo».

**Castigar cartera (ADMIN):** «Dar por perdida la deuda» da de baja TODA la deuda del cliente como incobrable. Pide un motivo (obligatorio) y escribir el nombre del cliente para confirmar. No se puede deshacer y resta en el resultado de la quincena en que se registra (la quincena de hoy debe estar abierta).

### Calidad de la leche (Producción y acopio)
Solo consulta: «Entregas de leche» (cada entrega con fecha, proveedor, litros, temperatura, acidez, si fue aprobada o rechazada y el motivo) y «Calidad por proveedor» (resumen de rechazos). Se puede filtrar y descargar a Excel. El botón «Registrar compra de leche» lleva a Materias primas → Compras.

### Materias primas (Producción y acopio)
Pestañas: «Materias primas» (stock, costo promedio), «Compras» y «Ajustes».
- ADMIN: «Nueva materia prima», «Editar», «Desactivar/Activar» y el «Stock mínimo» de cada una.
- **Comprar leche** (OPERATIVO o ADMIN): Compras → «Registrar compra» → materia prima «Leche» → «Proveedor (obligatorio)» → «Cantidad (LT)» → «Temperatura (°C)» y «Acidez (°Dornic)» (obligatorias) → «Fecha de la compra» → «Registrar compra de leche». **El OPERATIVO NO digita el valor del litro:** lo fija el precio pactado vigente con ese proveedor y, si no hay, el parámetro «Precio de la leche por defecto (COP por litro)». Solo el ADMIN puede escribir el «Valor total (COP)». Si la temperatura o la acidez superan los máximos de Parámetros, la entrega se guarda como RECHAZADA: no entra al inventario ni suma a lo que se le debe al proveedor.
- **Comprar otras materias primas** (azúcar, envases, etc.): solo ADMIN. Mismo botón, con «Valor total (COP)»; proveedor opcional (si no hay, se escribe «Comprado en»).
- «Pagada al comprar (contado)»: si es de contado no suma a lo que se le debe al proveedor. Con proveedor la compra empieza a crédito; sin proveedor siempre es de contado.
- **Anular una compra (ADMIN):** Compras → «Anular» (pide motivo): el stock baja y el costo promedio se recalcula. NO se puede anular si la materia prima ya se usó (en un lote) o se ajustó después; en ese caso se corrige con un ajuste de inventario (Ajustes → «Nuevo ajuste», tipo Corrección, solo ADMIN).
- **Ajustes** («Nuevo ajuste»): corrige el stock a mano; exige una «Observación»; no se edita ni se borra. El OPERATIVO solo puede Merma, Daño y Vencimiento (restan); el ADMIN también las correcciones.

### Cuentas con proveedores
Pestañas: «Saldos», «Pagos» y «Precios pactados». Lo que se compra a crédito se debe por quincena y se paga a la quincena en que se compró.
- «Saldos» → «Ver detalle» muestra las compras a crédito del proveedor.
- **Pagar a un proveedor (ADMIN):** «Saldos» → «Registrar pago» (o en Períodos → quincena → «Pagar») → elige «Quincena que se liquida», «Monto a pagar (COP)» (o «Pagar todo el saldo»), «Medio de pago», «Referencia del pago» y «Fecha del pago» → «Registrar pago».
- **Anular un pago (ADMIN):** pestaña «Pagos» → «Anular» (pide motivo); la deuda vuelve a subir.
- **Precio pactado por proveedor (ADMIN):** «Precios pactados» → «Fijar precio» (proveedor, materia prima, precio y «Rige desde»). Un precio no se edita: «Cambiar precio» crea uno nuevo y el anterior queda en el historial. Ese precio se usa al comprar leche.

### Producción
Pestañas «Lotes» y «Ajustes».
- **Producir un lote:** Lotes → «Nuevo lote» → «Producto», «Litros de leche usados» (el sistema sugiere los de la receta con «Usar sugerido»), «Cantidad obtenida», «Fecha de producción» y «Fecha de vencimiento» (si se deja vacía son 21 días después, según el parámetro «Vida útil de un lote nuevo (días)»). Descuenta la leche y los insumos de la receta y suma al stock del producto. No se edita ni se borra. «Ver costos» muestra lo que consumió el lote.
- Si no hay suficiente leche o falta algún insumo de la receta, el lote no se crea: hay que comprar más o ajustar.
- **Recetas:** Catálogos → Productos → «Receta» (ver) y «Editar receta» (ADMIN).
- **Ajustes de inventario** («Nuevo ajuste», también «Registrar ajuste» en Inventario): corrige el stock de un producto. OPERATIVO: Merma, Daño, Vencimiento, Muestra. ADMIN además: Ingreso inicial, Corrección (+) y Corrección (−). Exige «Observación».

### Inventario
«Stock por producto» (búsqueda por nombre o SKU) y «Alertas de caducidad» (lotes que vencen en los próximos N días). **Stock mínimo:** el ADMIN lo fija en Catálogos → Productos → «Mínimo» (en materias primas, en «Stock mínimo»); cuando el stock llega a ese valor o menos aparece en Notificaciones. 0 o vacío = sin alerta.

### Gastos
Pestañas «Gastos» y «Por categoría». «Registrar gasto»: «Categoría», «Concepto», «Monto (COP)» y «Fecha del gasto (opcional)». No se edita ni se borra: si hubo error, el ADMIN usa «Anular» (con motivo) y se registra el correcto. Las categorías vienen del sistema; el dashboard no las crea.

### Períodos (ADMIN)
Cada quincena es un candado. «Crear períodos de un año» crea las 24 quincenas. «Cerrar» bloquea el registro de ventas, compras, gastos y otros movimientos con fecha dentro de esa quincena; «Reabrir» la deja editable otra vez. Al abrir una quincena se ven «Cuentas de la quincena» (ventas, cobrado, compras, por pagar a proveedores) y la comparación con la quincena anterior.

### Resultado por quincena
Solo consulta: lo que ganó cada quincena (ventas sin IVA menos costo de producción, gastos y cartera castigada) y la plata que realmente entró y salió (caja). Se cambia de quincena con «Anterior» y «Siguiente». Los dos roles ven las mismas cifras.

### Margen de ganancia (ADMIN)
Cuánto se gana: lo vendido sin IVA menos el costo promedio de producir lo vendido. Es un cálculo ESTIMADO (no se sabe de qué lote salió cada unidad). Se elige el rango de fechas (atajos «Este mes», «Mes pasado», «Esta quincena», «Quincena anterior», «Últimos 30 días») y en «Ver por» se elige «Producto» o «Cliente». Resalta los márgenes bajos o negativos. Si algún producto no tiene producción registrada avisa «N líneas sin costo».

### Archivos
Pestañas: «Archivos» y «Ver documento»; el ADMIN además «Drive» y «Accesos». Guarda los PDF de los comprobantes y los archivos de la empresa: «Ver», «Descargar con clave» y «Detalle». El ADMIN puede «Subir archivo», «Nueva carpeta» (máximo 5 niveles; no se renombran ni se mueven) y «Archivar» (no borra). **El OPERATIVO solo ve los comprobantes que genera la aplicación**, no lo que sube el ADMIN.

### Catálogos
Pestañas «Clientes», «Proveedores» y «Productos».
- Clientes y proveedores: el OPERATIVO y el ADMIN pueden «Nuevo cliente»/«Nuevo proveedor» y «Editar». Solo el ADMIN fija el «Límite de crédito (COP)» y usa «Activar/Desactivar».
- Productos: solo el ADMIN crea y edita («Nuevo producto», «Precio», «Mínimo», «Activar/Desactivar»); todos pueden ver «Receta».

### Notificaciones
La campana muestra lo que necesita atención hoy: stock bajo, lotes por vencer, cartera, quincenas sin cerrar, leche por pagar y documentos con error. Desaparecen solas cuando se resuelven. «Marcar todas como leídas».

### Parámetros (ADMIN)
Valores de negocio que se cambian sin tocar el código; cada cambio queda en la auditoría. Grupos: «Crédito y ventas» (plazo de crédito en días, máximo de productos por venta, IVA propuesto), «Calidad de la leche» (temperatura y acidez máximas), «Leche y proveedores» (precio de la leche por defecto), «Producción» (vida útil de un lote) y «Seguridad de acceso» (intentos antes de bloquear, minutos de bloqueo, horas máximas de sesión).

### Usuarios (ADMIN)
«Nuevo usuario» (usuario, nombre, correo, rol), «Editar», activar/desactivar, «Desbloquear», «Ver sesiones», «Cerrar sus sesiones», «Restablecer clave» y «Restablecer segundo factor». **Crear, editar, restablecer clave y restablecer segundo factor piden el código de 6 dígitos del segundo factor del propio ADMIN** (o uno de sus códigos de respaldo). El restablecer clave muestra una clave temporal una sola vez («Copiar», «Ya la copié»). Sobre la propia cuenta no se puede desactivar ni restablecer («No puedes hacer esto sobre tu propia cuenta: lo hace otro administrador»).

### Auditoría y accesos (ADMIN)
Solo lectura, en pestañas: «Accesos» (quién entró y qué falló, incluidas las preguntas al asistente), «Cambios» (qué se modificó) y «Errores».

### Mi cuenta (menú del usuario)
«Mis datos» (nombre y correo; «Editar» pide el código), «Cambiar mi clave» (pide la clave actual y el código; cierra todas las sesiones), «Segundo factor» («Activar segundo factor» con una app de autenticación; el ADMIN lo debe tener), «Códigos de respaldo» («Generar códigos nuevos»; cada uno sirve una sola vez), dispositivos con cara o huella («Agregar este dispositivo», «Quitar») y «Mis sesiones» («Cerrar las demás», «Cerrar todas»). La sesión se cierra sola tras un rato sin actividad.

## 3. Problemas frecuentes

- **«El cliente no tiene cupo de crédito suficiente.»** El total supera el cupo disponible (Límite menos Deuda). Cobrar de contado, que el cliente abone, o pedir al ADMIN que suba el «Límite de crédito» en Catálogos → Clientes.
- **«La quincena está cerrada. No se pueden registrar movimientos en ella.»** La fecha del movimiento cae en una quincena cerrada. Cambiar la fecha a una quincena abierta o pedir al ADMIN que la «Reabra» en Períodos.
- **«Stock insuficiente para completar la operación.»** No hay suficiente producto (venta) o leche/insumos (lote). Revisar Inventario o Materias primas; si el stock real es otro, registrar un ajuste.
- **«El abono no es válido o supera la deuda del cliente.»** El abono no puede pasar de lo que el cliente debe. Usar «Toda la deuda» como máximo.
- **«No tienes permiso para realizar esta acción.»** Esa acción es solo del ADMIN (por ejemplo anular, cerrar quincenas, comprar materias primas distintas a la leche, pagar a proveedores).
- **No se puede anular una venta:** ya tiene abonos. **No se puede anular una compra:** la materia prima ya se usó; corregir con un ajuste.
- **Leche RECHAZADA:** la temperatura o la acidez superaron el máximo (se ve en Parámetros → «Calidad de la leche»). No entra al inventario ni a la cuenta del proveedor.
- **«Hay otra solicitud igual en proceso.»** Se dio doble clic. Esperar unos segundos y revisar el historial antes de repetir.
- **Cuenta bloqueada:** demasiados intentos fallidos. Se libera sola al pasar el tiempo de bloqueo o la libera el ADMIN con «Desbloquear» en Usuarios.
- **Código del segundo factor incorrecto o «Ese código ya fue usado»:** esperar a que la app genere uno nuevo (cambia cada 30 segundos) y escribirlo de nuevo; cada código sirve una sola vez. Con el teléfono perdido se usa un código de respaldo. Varios errores seguidos bloquean la cuenta.
- **«Tu sesión se cerró…»:** la sesión venció o se cerró desde otro lugar; volver a entrar.
- **El ticket sale en una hoja grande o con encabezados:** en el cuadro de impresión elegir la impresora térmica y el papel de 58 u 80 mm, y desactivar «Encabezados y pies de página».
- **«Has hecho muchas preguntas, intenta en un rato.»** El asistente permite 30 preguntas por hora.

## 4. Lo que el asistente NO puede hacer

Solo consulta: no registra ventas, no cambia datos, no anula nada. Para actuar, indicar la pantalla y los pasos. Puede equivocarse: las cifras importantes deben verificarse en la pantalla correspondiente.

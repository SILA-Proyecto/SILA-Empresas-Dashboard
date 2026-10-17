import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { OpcionSelector } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import type { ProductoOpcion } from './models/ajuste-tipos';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';

/**
 * Active products for selectors and dialogs, through the existing Catálogos repository.
 * SUPUESTO: AP-02. All pages are fetched (the API's page is at most 100 rows).
 * Must run in an injection context.
 */
export function cargarProductosActivos() {
  const repo = inject(CATALOGOS_REPOSITORY);
  const recurso = rxResource({ stream: () => todasLasPaginas((q) => repo.listarProductos({ activo: true, sort: 'nombre,asc', ...q })) });
  const productos = computed<ProductoOpcion[]>(() =>
    recurso.hasValue()
      ? recurso.value().items.map((p) => ({ id_producto: p.id_producto, nombre: p.nombre, codigo_sku: p.codigo_sku, unidad_medida: p.unidad_medida, stock: p.stock, precio_base: p.precio_base }))
      : [],
  );
  const opciones = computed<OpcionSelector[]>(() => productos().map((p) => ({ valor: p.id_producto, etiqueta: `${p.nombre} (${p.codigo_sku})` })));
  return { productos, opciones, cargando: recurso.isLoading, hayError: computed(() => !!recurso.error()), recargar: () => recurso.reload() };
}

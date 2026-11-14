# TERRA

TERRA compara terrenos volcánicos del Perú con tres referencias de la Luna y Marte: Mons Mouton, Hadley e InSight. El ranking prioriza candidatos para estudios de campo según su parecido topográfico.

## Ejecutar el proyecto

Con Node.js y Bun instalados, ejecuta desde la carpeta del proyecto:

```sh
bun install --frozen-lockfile
bun run dev
```

Abre [localhost:3000](http://localhost:3000). Las consultas en vivo y las imágenes requieren conexión. La búsqueda puede usar mediciones archivadas cuando coinciden con el sitio solicitado.

## Cómo se comparan los sitios

1. **Ranking.** TERRA toma nueve elevaciones a 2 km de separación en una ventana aproximada de 4 × 4 km. Compara el relieve y el gradiente P90, cada uno con un peso del 50 %. Una distancia menor indica mayor parecido en esas dos medidas.
2. **Revisión.** La ficha permite comparar hasta 81 puntos por sitio, con separaciones de 500 m, 1 km y 2 km.
3. **Análisis de área.** Los 13 candidatos archivados y las tres referencias cuentan con promedios por área en celdas de 500 m y 1 km. Para Andagua–Mons Mouton también se comparan los modelos terrestres GLO-30 y AW3D30.

INGEMMET aporta el catálogo de terrenos. El ranking usa elevaciones terrestres de SRTM, distribuidas por Open Topo Data, y elevaciones planetarias de NASA LOLA y MOLA. El análisis por área usa Copernicus GLO-30 en la Tierra. Las inspecciones del mapa añaden climatología de NASA POWER. Las imágenes de NASA GIBS sirven de contexto.

La resolución efectiva difiere entre modelos. La aptitud del sitio para una misión requiere comprobar materiales, pendientes locales y condiciones de operación.

### Fórmula del ranking

Para cada sitio, el relieve $R$ es la diferencia entre la mayor y la menor elevación de la malla. El gradiente $G$ es el percentil 90 de los 12 ángulos entre nodos vecinos horizontales y verticales. Cada ángulo se calcula como $\arctan(|\Delta z| / 2000)$ y se expresa en grados.

$$
d = 0.5\,\frac{|R_T-R_P|}{R_T+R_P+10}
  + 0.5\,\frac{|G_T-G_P|}{G_T+G_P+0.1}
$$

$T$ indica Tierra y $P$ la referencia planetaria. El relieve se expresa en metros y los gradientes, en grados. Los términos de 10 m y 0,1° estabilizan los cocientes cerca de cero. El cálculo requiere nueve elevaciones válidas por sitio. [Implementación del cálculo](lib/analog-math.ts).

### Resultados del catálogo archivado

| Referencia | Candidato con menor distancia | Distancia |
| --- | --- | ---: |
| Mons Mouton, Luna | Andagua (INGEMMET #55742) | 0,02736 |
| Hadley, Luna | INGEMMET #60825 | 0,07467 |
| InSight, Marte | INGEMMET #12660 | 0,12239 |

El análisis por área pondera la elevación de cada píxel por la superficie que ocupa dentro de la celda. Las celdas con cobertura incompleta quedan sin valor. Estas métricas complementan el ranking de nueve puntos.

## Datos y verificación

La sección **Datos** permite descargar las mediciones y sus fuentes en JSON. Para comprobar el proyecto y recalcular el ranking archivado:

```sh
bun run lint
bun run test
bun run build
bun run audit:results
```

- [Método y fórmulas](public/informe-metodologico.md)
- [Análisis por área y controles de calidad](docs/comparacion-area-completa.md)
- [Fuentes y recursos del reto](docs/recursos-reto.md)
- [Resultados del recálculo](docs/audit-results.json)

OpenAI Codex se usó para asistir en el desarrollo, las pruebas y la documentación. La declaración de uso está en [package.json](package.json).

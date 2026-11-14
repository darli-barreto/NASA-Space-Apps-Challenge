# Informe metodológico de TERRA

## Flujo de la demostración

1. Selecciona Mons Mouton, Hadley o Elysium–InSight. Cada referencia conserva su imagen orbital y sus elevaciones NASA PDS.
2. Busca en el catálogo de INGEMMET. La lista muestra todos los candidatos comparables del conjunto procesado.
3. Selecciona un candidato para actualizar el mapa y su enlace a Google Maps. La ficha muestra las imágenes comparativas con la ventana trazada, los valores y pesos, y un radar topográfico.

## Cálculo y lectura

La búsqueda compara nueve elevaciones por sitio, separadas 2 km en una malla de 4 × 4 km. Usa SRTM para Perú, LOLA para la Luna y MOLA para Marte. Las resoluciones nativas difieren.

El ranking combina la diferencia de relieve y la diferencia de gradiente P90. Divide cada diferencia absoluta por la suma de ambos valores más un estabilizador de 10 m o 0,1°. Multiplica cada diferencia normalizada por 50 % y suma los aportes. Una distancia menor indica mayor parecido topográfico. La sensibilidad incluye escenarios 25/75, 50/50 y 75/25.

El radar muestra relieve, gradiente P90, gradiente mediano y desviación frente a vecinos. Cada eje se escala de cero al máximo del par. Las cifras originales están en la tabla. El área de los polígonos carece de interpretación como porcentaje de analogía.

El perfil experimental de movilidad pondera terreno (45 %), operaciones (25 %), materiales (15 %), ambiente (10 %) y polvo y erosión (5 %). Agua y recursos, biología y subsuelo tienen peso cero para ese objetivo. La ficha registra el peso evaluado y la evidencia pendiente. En el piloto la topografía domina la evidencia comparable. Para confirmar utilidad operativa se necesitan mediciones de campo y revisión independiente.

## Fuentes de consulta

- [Capas oficiales de áreas naturales protegidas de SERNANP](https://geoportal.sernanp.gob.pe/)
- [Geoportal del Ministerio de Cultura](https://geoportal.cultura.gob.pe/mapa/portal)
- [NASA Planetary Data System](https://pds.nasa.gov/)

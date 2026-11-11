# CLARO — Mi espacio para organizarme

Aplicación web personal para organizar tareas, fechas, proyectos y asignaturas. La primera versión guarda los datos en IndexedDB en este navegador. No incluye sincronización entre dispositivos; usa Ajustes → Exportar JSON para conservar una copia.

La interfaz se adapta a escritorio, tablet y móvil. En iPhone utiliza navegación inferior, respeta las áreas seguras de la pantalla y presenta los formularios como paneles táctiles; se ha validado a 393 × 852 px, tamaño de referencia del iPhone 17 Pro.

## Desarrollo

Requiere Node.js 20 o superior. En el checkout existente:

```bash
npm ci
npm run dev
```

`npm run build` comprueba TypeScript y genera la versión de producción. `npm test` ejecuta las pruebas de la capa de datos. No hace falta crear otro worktree.

## Estructura

`src/data.ts` define los modelos y la persistencia. `src/App.tsx` contiene la navegación, las vistas y los formularios. `src/style.css` contiene el sistema visual responsive. Todas las vistas usan un mismo estado y se guardan en IndexedDB tras cada cambio.

## Estado

Incluye tareas con subtareas, estados y prioridades; bandeja de entrada; calendario mensual, semanal, diario y agenda; asignaturas; exámenes con temario y nivel de preparación; proyectos; plantillas editables de fotografía, audiovisual y preparación de exámenes; planificación semanal manual con carga diaria y compromisos; concentración; progreso; apariencia y copias JSON. La sincronización entre dispositivos y los recordatorios cuando la aplicación está cerrada quedan para futuras fases.

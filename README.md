# Bolivia Cinema - Sistema de Gestión de Cine y Boletería

Un sistema web integrado, moderno y de alta fidelidad diseñado específicamente para el mercado cinematográfico boliviano. Permite administrar salas de cine de tamaños fijos de forma rotativa, coordinar comunicaciones con distribuidoras de películas, auditar la boletería física sin elección manual para agilizar filas, y proveer un portal web interactivo para clientes con generación de comprobantes tributarios (NIT) y códigos de pago QR listos para el canal online boliviano.

La aplicación está construida utilizando **React 19 + TypeScript + Vite + Tailwind CSS**.

---

## 🎨 1. Presentación y Características Clave

* **Tres Roles Identificados**: 
  1. **Administrador/Gerente**: Configura la cartelera de películas, define tarifas, aprueba o rechaza ofertas de distribuidoras, analiza métricas de ocupación, reprograma funciones y audita transacciones generales del cine.
  2. **Cajero de Taquilla Física**: Terminal de ventas optimizada para velocidad (sin elección gráfica de asientos para maximizar el flujo en horas pico). Emite boletos físicos con impresión simulada al instante.
  3. **Cliente Online**: Explora la cartelera interactiva, accede a promociones automáticas 2x1 en películas con menos de 30% de ocupación, compra sus boletos ingresando NIT/Razón Social, y genera su código QR simulado para completar la reservación.
* **Barra de Ayuda Superior Interactiva**: Se ha incorporado una guía contextual con botón de ocultación opcional (cerrar con una **"X"** a la derecha) en la zona superior de todas las pantallas, liberando espacio y evitando el ruido visual cuando ya no sea necesaria. Además, incluye un acceso rápido de restauración de datos a valores semilla de muestra.

---

## 📂 2. Estructura del Proyecto y Contenido

El código fuente está modularizado de forma limpia para evitar archivos sobredimensionados, facilitar el mantenimiento y asegurar una carga eficiente:

```text
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx        # Panel administrativo con métricas, cartelera, reprogramación y distribuidoras.
│   │   ├── ClientPanel.tsx       # Interfaz pública del cliente para comprar en línea con simulación de QR y NIT.
│   │   ├── BoleteriaFisica.tsx   # Panel de taquilla ágil para boleteros (ventas físicas ultra rápidas).
│   │   └── LoginModal.tsx        # Cuadro de diálogo modal para iniciar sesión y registrar cuentas.
│   ├── App.tsx                   # Coordinador de navegación, layout global de la app y persistencia.
│   ├── apiService.ts             # Adaptador de llamadas API REST, transparente y con fallback simulación.
│   ├── data.ts                   # Datos iniciales semilla estáticos de películas y funciones en salas.
│   ├── types.ts                  # Declaraciones estables de interfaces TypeScript (Movie, Show, TicketRef, etc.).
│   ├── index.css                 # Importación global de Tailwind CSS y tipografías Inter.
│   └── main.tsx                  # Punto de entrada de renderizado de React en el DOM.
├── index.html                    # Estructura del cargador SPA HTML5.
├── package.json                  # Definición de dependencias npm, scripts dev, build y lint.
├── tsconfig.json                 # Configuración del compilador de TypeScript.
└── vite.config.ts                # Configuración del empaquetador rápido Vite.
```

---

## 🧠 3. Patrones de Diseño Utilizados

Para garantizar la estabilidad local y permitir una transición directa a un servidor de producción de gran escala, se implementaron los siguientes patrones arquitectónicos:

1. **Patrón de Adaptador de API (API Adapter Pattern)**: 
   Definido en `src/apiService.ts`. Todas las solicitudes HTTP pasan a través de un único adaptador que verifica la variable global `USE_REAL_BACKEND`. Si es falsa, simula latencia real y persiste en el `localStorage` del cliente. Si es verdadera, realiza fetch real contra las rutas del backend configurado en `API_BASE_URL`.
2. **Patrón de Estado Compartido Elevado (Lifted Shared State)**:
   Declarado en `src/App.tsx`. El estado de películas, funciones, tickets generados y correspondencia con distribuidoras es sincronizado y transmitido de manera descendente (*one-way data binding*) a los componentes hijos (`AdminPanel`, `BoleteriaFisica`, `ClientPanel`). Esto garantiza que cambios hechos por el administrador se reflejen de inmediato en las taquillas y el portal web.
3. **Persistencia mediante Estrategia Fallback**:
   El estado se lee en el primer render del almacenamiento local seguro del navegador. Si es la primera vez que se ejecuta, se desvía a los datos semilla cargados desde `src/data.ts`.
4. **Componentización de UI Basada en Funciones Puras**:
   Los botones, modales, alertas y tarjetas están declarados usando componentes funcionales con hooks integrados (`useState`, `useMemo`, `useEffect`) evitando re-renders innecesarios.

---

## 🚀 4. Guía de Ejecución Local (Offline)

### Requisitos Previos
Asegúrate de contar con **Node.js** (versión 18 o superior) y **npm** instalados en tu sistema operativo. Puedes descargarlo gratis desde [nodejs.org](https://nodejs.org/).

### Paso 1: Clonar o descomprimir el código
Abre tu terminal en la raíz de la carpeta del proyecto.

### Paso 2: Instalar dependencias
Instala todas las librerías necesarias ejecutando:
```bash
npm install
```
*Esto generará automáticamente un archivo `package-lock.json` optimizado específicamente para tu suite y versiones locales.*

### Paso 3: Ejecutar en modo desarrollo
Corre el servidor local de desarrollo interactivo:
```bash
npm run dev
```
La terminal te proporcionará una URL local (normalmente `http://localhost:3000`). Ábrela en tu navegador favorito. El hot-reload mantendrá actualizados tus cambios al instante cuando edites cualquier archivo.

### Paso 4: Validar y compilar para producción
Para compilar y empaquetar tu aplicación lista para subir a un hosting de producción clásico (como Netlify, Vercel, S3 o servidores estáticos locales):
```bash
npm run build
```
Esto generará una carpeta compacta llamada `/dist` conteniendo los archivos HTML, CSS y JS listos para producción.

---

## 📡 5. Instrucciones para Conectar con un Backend Real

Para pasar de un entorno simulado de localStorage a un servidor de base de datos de producción real, solo debes configurar unos sencillos parámetros:

### Paso 1: Activar el backend real
Abre el archivo `/src/apiService.ts` en tu editor de código e intercambia los valores de configuración en las líneas iniciales:

```typescript
// Cambiar a true para realizar peticiones HTTP REST reales:
export const USE_REAL_BACKEND = true;

// Define la dirección base de tu servidor de producción (reemplaza por la tuya):
export const API_BASE_URL = 'http://localhost:8080/api'; 
```

### Paso 2: Crear el Servidor Backend (Express, Python, Java o PHP)
El adaptador `apiService` espera recibir e interactuar con los siguientes endpoints API en formato **JSON**. Debes diseñar tu base de datos y tus controladores basados en estas solicitudes representativas:

#### 🎬 1. Endpoints de Películas (`/movies`)
* **`GET /api/movies`**: Retorna el listado completo de películas.
  * *Respuesta esperada (status 200)*:
    ```json
    [
      { "id": "m1", "title": "Inception", "genre": "Sci-Fi", "duration": 148, "rating": "PG-13", "posterUrl": "...", "description": "...", "basePrice": 35 }
    ]
    ```
* **`POST /api/movies`**: Crea una nueva película en base de datos.
  * *Request (Body)*: Un objeto de tipo película (`Movie`).
* **`DELETE /api/movies/:id`**: Elimina una película por su ID (debe ejecutar borrado en cascada para sus funciones correspondientes).

#### ⏰ 2. Endpoints de Funciones (`/shows`)
* **`GET /api/shows`**: Retorna las funciones activas del cine.
  * *Respuesta esperada*:
    ```json
    [
      { "id": "s1", "movieId": "m1", "date": "2026-06-11", "time": "15:00", "room": "Sala Grande A", "soldTickets": 10 }
    ]
    ```
* **`POST /api/shows`**: Registra un nuevo horario/sala de funciones.
* **`DELETE /api/shows/:id`**: Cancela una función.

#### 🎟️ 3. Endpoints de Transacciones/Boletos (`/tickets`)
* **`GET /api/tickets`**: Retorna los boletos emitidos (ventas).
  * *Respuesta esperada*:
    ```json
    [
      {
        "id": "t-12345",
        "showId": "s1",
        "movieTitle": "Inception",
        "room": "Sala Grande A",
        "dateTime": "2026-06-11 15:00",
        "pricePaid": 35,
        "channel": "Online",
        "purchaseDate": "2026-06-10T18:16:07Z",
        "customerNit": "10239485012",
        "businessName": "Pérez SRL",
        "qrString": "BoliviaCinema-s1|35|t-12345",
        "isPromo2x1": false
      }
    ]
    ```
* **`POST /api/tickets`**: Guarda una venta de boletos (Taquilla Física o Portal Online).
* **`DELETE /api/tickets/:id`**: Cancela/Anula un boleto o deuelve fondos.

#### 📧 4. Endpoints de Distribuidoras (`/emails`)
* **`GET /api/emails`**: Retorna las ofertas, licencias y correspondencia general de distribuidoras extranjeras.
* **`POST /api/emails`**: Agrega una propuesta de distribuidora a la bandeja.
* **`PUT /api/emails/:id`**: Actualiza el estado (`Aprobado`, `Rechazado`, `Pendiente`) de una oferta negociada.

---

## 🛠️ 6. Solución de Problemas del archivo `package-lock.json`
Si el sistema arrojaba errores al intentar descargar el proyecto o desplegarlo en la nube por anomalías en las arquitecturas de contenedor de dependencias:
1. **Hemos removido permanentemente el archivo `package-lock.json` binario cruzado** para evitar conflictos de sistema operativo.
2. Al ejecutar `npm install` localmente o en tu flujo de CI/CD de GitHub, el instalador generará un **nuevo candado (`package-lock.json`) nativo y óptimo**.
3. El proyecto se compila y completa exitosamente (`npm run lint` y `npm run build` pasan en verde).

---
*© 2026 Bolivia Cinema. Diseñado para un control tributario simplificado y ágil de boleterías físicas y digitales.*

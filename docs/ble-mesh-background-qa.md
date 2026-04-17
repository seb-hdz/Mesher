# QA manual: BLE mesh en segundo plano (Mesher)

No sustituye CI ni revisión de tiendas. Ejecutar en **hardware** (dos teléfonos o más) tras `npx expo prebuild` y un dev build con el plugin Mesher BLE.

## Android

1. Instalar la app en dos dispositivos, conceder Bluetooth (Connect / Scan / Advertise) y, en Android 13+, **notificaciones** al activar “Relay in background”.
2. Activar el interruptor **Relay in background** en Home. Debe aparecer una **notificación persistente** (“Mesher relay”).
3. Con el mesh en marcha (inicialización completada), enviar la app a **segundo plano** o apagar la pantalla **1–5 minutos**.
4. Comprobar en logcat: sin `SecurityException`, sin errores fatales del servicio en primer plano; el servicio no debe detenerse solo salvo política del OEM.
5. **Pasa / no pasa (ejemplos):** los dispositivos siguen intercambiando tráfico o, al volver a primer plano, el conteo de vecinos / inbox se actualiza sin reiniciar la app.

## iOS

1. **Solo dispositivo físico** (no simulador para BLE real).
2. En Ajustes del sistema, Bluetooth permitido para Mesher; la app declara `bluetooth-central` y `bluetooth-peripheral`.
3. Probar con y **sin** depurador de Xcode conectado (el debugger altera tiempos de vida).
4. Misma matriz de segundo plano / pantalla apagada que en Android, con expectativas **menos fuertes**: iOS puede diferir escaneo y trabajo en radio.
5. **Pasa / no pasa:** recuperación razonable al foreground o recepción diferida coherente con [ios-background-ble.md](./ios-background-ble.md).

## Límites

Fallos por batería agresiva, fabricante u OS no siempre son bugs de Mesher. Documentar OEM y versión de OS al archivar resultados.

## Skills opcionales del plan

La búsqueda de skills complementarias en skills.sh es **opcional**; no bloquea esta QA.

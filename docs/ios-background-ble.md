# iOS: BLE en segundo plano y expectativas (Mesher)

## Resumen

Mesher está pensado para **comunicación oportunista** en multitudes. En **iOS**, el sistema operativo **limita** cuánto tiempo y con qué agresividad una app puede **escanear o anunciar Bluetooth** cuando la app no está en primer plano.

## Qué implica para el producto

- Con la app **abierta** o en primer plano, el transporte BLE (cuando se integra vía `react-native-ble-plx` en un **development build**) puede comportarse de forma razonable.
- Con la app **en segundo plano** o la pantalla apagada, iOS puede **reducir o suspender** el scanning; no hay paridad con Android en todos los escenarios.
- `UIBackgroundModes` con `bluetooth-central` y `bluetooth-peripheral` en [app.json](../packages/mobile/app.json) **no garantizan** scanning continuo ilimitado; declaran intención para revisión de App Store y permiten ciertos modos de recuperación de eventos (central y GATT peripheral / restore en el módulo nativo).

## Qué debe esperar el usuario (UX)

- Mensajes pueden **demorar** hasta que la app vuelva a primer plano o hasta que el SO permita otro ciclo de radio.
- La UI debe ser **honesta**: “funciona mejor con la app abierta” es un mensaje razonable para el MVP.

## Próximos pasos técnicos

- Tras `npx expo prebuild`, integrar **react-native-ble-plx** (o equivalente) y validar en **dispositivos físicos** iOS y Android.
- Medir batería y tasa de descubrimiento en escenarios reales (bolsillo, pantalla off, multitud).

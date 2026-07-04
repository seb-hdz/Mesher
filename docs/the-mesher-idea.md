## Escenario planteado:

"Julia y su enamorado están en una rave donde hay 10 mil personas; y entre toda la gente Julia se pierde. Logra salir hacia los baños portátiles e intenta usar su celular para buscar a su enamorado pero por la cantidad de personas no hay señal y la reunión no ofrece wifi. ¿qué podría ayudar a que Julia pueda enviar un mensaje a su enamorado?

En base a este escenario inicial se plantearon las siguientes preguntas:

- habria forma de que si Julia o su enamorado envien un mensaje su dispositivo lo mantenga en "espera" hasta que el otro P2P este al alcance de escucharlo?
- habria una forma de conectar entre varios dispositivos masivamente in a sense of like a room? (but not a room because this is a different technology i understand)
- no nos limitemos a una pwa, que tal un app de react native con expo o ionic + capacitor con algun framework de frontend, u otras tecnologias varias para el desarrollo de apps (cualquier framework, lenguaje, siempre que sea codigo y no una UI/builder)

Ante lo cual el planificador nos dijo lo siguiente:
Este escenario es el "caso de uso de oro" para las redes Delay-Tolerant Networking (DTN) y los Gossip Protocols. En una rave con 10,000 personas, el aire está saturado de interferencias, pero tienes algo valioso: una densidad increíble de "nodos" (teléfonos) que se mueven constantemente.

Si Julia y su enamorado quieren encontrarse, no necesitan una "sala" (room) en un servidor; necesitan que su mensaje sea como un virus que se propaga por la multitud hasta encontrar al destinatario.

---

1. El concepto: Store-and-Forward (Almacenar y Reenviar)

Respondiendo a tu primera duda: Sí, es totalmente posible y es la base de la comunicación "asincrónica física".

En lugar de que Julia intente "llamar" a su novio, su app emite un paquete de datos que dice: "Soy Julia, busco a [ID de novio], este es mi mensaje".

- Si el novio no está cerca, el teléfono de Julia guarda el mensaje en una base de datos local (SQLite o Realm).
- Su celular busca constantemente "beacons" (señales) de otros teléfonos que tengan la misma app.
- Cuando detecta a alguien, le pasa una copia del mensaje.

2. ¿Cómo conectar a miles? El "Gossip Protocol"

En lugar de una "room" centralizada, usamos una red Mesh (malla) dinámica. No necesitas que Julia y su novio estén cerca; solo necesitas que haya una cadena de personas entre ellos, o que la gente se mueva (Data Mules).

Cómo funciona el "chisme" (Gossip):

- Julia envía el mensaje a las 5 personas más cercanas vía Bluetooth/Wi-Fi Direct.
- Esas 5 personas se mueven entre la multitud. Cuando pasan cerca de otros, sus teléfonos intercambian qué mensajes tienen y cuáles les faltan.
- El mensaje "salta" de dispositivo en dispositivo.
- Cuando el mensaje llega a su enamorado, su app reconoce su ID y le notifica.

3. Stack Tecnológico Sugerido (Native-level)

Para esto, una PWA se queda corta porque el navegador no permite que el proceso de búsqueda de dispositivos corra en el fondo (background) de forma agresiva. Necesitas React Native + Expo (con módulos nativos) o Capacitor.

A. El Protocolo: Wi-Fi Aware (NAN) o BLE

- Wi-Fi Aware (Neighbor Awareness Networking): Es el protocolo más "cool" y moderno para esto. Permite que los dispositivos Android (y algunos iOS) se descubran y envíen pequeños mensajes de datos sin conectarse a un router y sin gastar mucha batería.
- BLE (Bluetooth Low Energy): Para que funcione en iOS y Android simultáneamente. Usarías el teléfono como Peripheral (emisor) y Central (escáner) al mismo tiempo.

B. El Engine de la App: React Native

- Base de Datos: WatermelonDB o SQLite. Necesitas algo que soporte persistencia rápida para guardar los mensajes de "otros" que tu teléfono está transportando.
- Background Tasks: react-native-background-fetch o tareas nativas en Kotlin/Swift para que, aunque Julia guarde el celular en su bolsillo, el teléfono siga "chismeando" con los demás.

4. Arquitectura de la solución "Rave Mesh"
   | Componente | Tecnología | Función |
   | ---------- | -------------- | ------ |
   | Transporte | react-native-ble-manager / Wi-Fi Direct | El "cable" invisible entre teléfonos. |
   | Identidad | Public Key Cryptography (Ed25519) | Julia firma su mensaje. Solo su novio (con la llave privada) puede leerlo. Privacidad total en la malla. |
   | Lógica Mesh | Custom Gossip Logic | Decide a quién reenviar el mensaje para no saturar la red (ej. no reenviar a quien ya lo tiene). |
   | UI | Lit (dentro de Capacitor) o RN + Expo | Una interfaz simple que muestre "Nodos cercanos: 42" para dar tranquilidad a Julia. |

5. El reto técnico: La "Tormenta de Broadcast"
   Con 10,000 personas, si todos reenvían todo, la red colapsa. Aquí es donde entra tu seniority. Tendrías que implementar:

- Deduplicación: Si recibo el mismo mensaje que ya tengo, lo ignoro.
- TTL (Time to Live): El mensaje de Julia solo vive por 2 horas o 10 "saltos" entre personas.
- Priorización por cercanía: Si el GPS (aunque sea aproximado) detecta que Julia y su novio estaban en la "Zona A", priorizar que el mensaje se mueva hacia allá.

---

Las apps actuales fallan porque asumen internet. Lo que tú planteas es comunicación oportunista. Incluso si no hay una cadena humana completa en un momento dado, si alguien camina de la zona de baños (donde está Julia) hacia el escenario principal (donde está el novio), ese teléfono actúa como un "transporte físico" del mensaje.

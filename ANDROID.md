# Compilar la app Android (APK con notificaciones)

La app es el mismo proyecto React/Vite, empaquetado como app Android nativa con
[Capacitor](https://capacitorjs.com/). Esto habilita **recordatorios locales que
suenan a la hora exacta de cada tarea aunque la app esté cerrada**, 100% offline y
sin servidor (usan el `AlarmManager` de Android).

## Requisitos (una sola vez)

1. **JDK 21** (el que trae Android Studio sirve).
2. **Android Studio** (incluye el Android SDK).
   Descarga: https://developer.android.com/studio

## Generar el APK

Con Android Studio instalado, desde la raíz del proyecto:

```bash
npm install
npm run android:sync     # build web + copia a Android + sincroniza plugins
npm run android:open     # abre el proyecto en Android Studio
```

En Android Studio:
- Espera a que termine el *Gradle sync*.
- Menú **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
- Cuando termine, clic en **locate** para encontrar el archivo en
  `android/app/build/outputs/apk/debug/app-debug.apk`.

> Alternativa por línea de comandos (si tenés el SDK en el PATH):
> ```bash
> npm run android:apk
> # genera android/app/build/outputs/apk/debug/app-debug.apk
> ```

## Instalar en tu celular

1. Pasá el `app-debug.apk` al teléfono (cable, Drive, etc.).
2. Abrilo y aceptá "instalar apps de orígenes desconocidos".
3. Al abrir la app por primera vez, **aceptá el permiso de notificaciones**.

## Flujo de trabajo cuando cambies el código

Cada vez que edites el código web, re-sincronizá antes de recompilar:

```bash
npm run android:sync
```

Luego volvé a generar el APK en Android Studio (o con `android:apk`).

## Notas importantes sobre las notificaciones

- **Solo se programan tareas con fecha Y hora.** Una tarea sin hora no genera aviso
  (por diseño). Las instancias recurrentes traen la hora de su regla, así que cada
  ocurrencia diaria se agenda por separado.
- **Hora exacta:** el `AndroidManifest.xml` declara `USE_EXACT_ALARM` /
  `SCHEDULE_EXACT_ALARM` para que el aviso llegue puntual y no diferido. En apps
  instaladas por fuera de Play Store (sideload) este permiso se concede sin prompt.
- **Reinicio del teléfono:** el plugin reprograma las notificaciones tras un reboot
  (`RECEIVE_BOOT_COMPLETED`), así que no se pierden.
- **Ahorro de batería:** algunas capas de Android (Xiaomi/MIUI, Samsung, Huawei)
  matan apps en segundo plano agresivamente. Si notás avisos que no llegan, quitá la
  app de la "optimización de batería" en los ajustes del sistema.
- **Reprogramación automática:** las notificaciones se recalculan solas cada vez que
  creás, completás, editás o borrás una tarea; no hay que hacer nada manual.

## ¿Y la versión web/PWA?

El código web sigue funcionando igual como PWA en el navegador. En web, el módulo de
notificaciones (`src/notifications.ts`) detecta que no es plataforma nativa y no hace
nada — la app no se rompe, simplemente no programa avisos del sistema. Las
notificaciones de hora exacta solo están disponibles en el APK Android.

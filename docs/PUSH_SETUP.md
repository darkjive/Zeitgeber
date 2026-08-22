# Web Push einrichten (optional)

Zeitgeber läuft komplett ohne Server. Die Erinnerungen (§reminders) funktionieren
sofort **im Vordergrund und im Wandmodus** – ganz ohne das hier Beschriebene.

Dieser Leitfaden schaltet zusätzlich **echten Hintergrund-Push** frei: Hinweise
kommen dann auch an, wenn die App vollständig geschlossen ist. Dafür braucht es
eine kleine Serverschicht (schon im Code unter `api/`), die du einmal
konfigurierst. Ohne diese Schritte bleibt alles beim datensparsamen
Vordergrund-Betrieb – der Client erkennt den fehlenden Dienst und fällt sauber
zurück.

## Was gespeichert wird

Nur das Nötigste zum Zustellen: der Push-Endpunkt des Browsers samt Schlüssel,
grobe Koordinaten, Zeitzone, Sprache und die gewählten Kategorien. **Keine
Konten, keine Namen, kein Verlauf.** Ein Abo wird gelöscht, sobald du die
Erinnerungen ausschaltest (oder das Abo abläuft).

## 1. VAPID-Schlüssel erzeugen

```bash
npm run push:keys
```

Notiere `Public Key` und `Private Key`.

## 2. Datenspeicher anlegen (Upstash Redis)

Kostenlos über den **Vercel Marketplace** (Storage → Upstash) oder direkt bei
[upstash.com](https://upstash.com). Du brauchst die beiden REST-Werte:
`UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`. Wird die Integration
über Vercel angelegt, setzt Vercel diese Variablen automatisch.

## 3. Umgebungsvariablen bei Vercel setzen

Projekt → Settings → Environment Variables:

| Variable | Wert |
|---|---|
| `VAPID_PUBLIC_KEY` | Public Key aus Schritt 1 |
| `VAPID_PRIVATE_KEY` | Private Key aus Schritt 1 |
| `VAPID_SUBJECT` | `mailto:deine@mail.de` |
| `UPSTASH_REDIS_REST_URL` | aus Schritt 2 |
| `UPSTASH_REDIS_REST_TOKEN` | aus Schritt 2 |
| `CRON_SECRET` | ein langes, zufälliges Geheimnis |

Danach **neu deployen**, damit die Variablen greifen.

## 4. Den Zeitgeber einrichten

Der Endpunkt `GET /api/cron` prüft die fälligen Erinnerungen und stellt sie zu.
Er muss regelmäßig (etwa alle 15 Minuten) angestoßen werden.

**Variante A – kostenlos, über GitHub Actions** (empfohlen bei Vercel Hobby):
Der Workflow `.github/workflows/push-cron.yml` liegt schon bereit. Setze zwei
Repository-Secrets (Settings → Secrets and variables → Actions):

- `SUNCLOCK_CRON_URL` = `https://<deine-domain>/api/cron`
- `CRON_SECRET` = derselbe Wert wie oben

**Variante B – Vercel Cron** (braucht den Pro-Plan für Intervalle unter 1 Tag):
`vercel.json` um einen Cron ergänzen – Vercel schickt `CRON_SECRET` automatisch
als `Authorization: Bearer …` mit:

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "*/15 * * * *" }]
}
```

## 5. Prüfen

1. App öffnen → Menü → **Erinnerungen** → einschalten und Benachrichtigungen
   erlauben. Der Status sollte **„Hintergrund-Push aktiv"** anzeigen.
2. Den Zeitgeber einmal von Hand auslösen: in GitHub unter *Actions →
   „Push reminders (cron)" → Run workflow*, oder per
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron`.
   Die Antwort nennt `checked`/`sent`.
3. Ein echter Hinweis kommt, sobald ein Ereignis in sein Vorlauf-Fenster fällt
   (z. B. 20 Minuten vor Verschattungsbeginn der Südfassade an einem heißen Tag).

## Ausschalten

In der App die Erinnerungen ausschalten: Der Client meldet das Abo beim Browser
ab und löscht den Server-Eintrag über `POST /api/unsubscribe`. Tote Abos (vom
Browser verworfen) räumt der Cron-Lauf zusätzlich selbst auf.

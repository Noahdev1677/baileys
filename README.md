# WhatsApp Baileys

<p align="center">
  <img src="https://files.catbox.moe/2mltoe.png" alt="Thumbnail" />
</p>

## Overview

WhatsApp Baileys is a lightweight, WebSocket-based library that implements the WhatsApp Web/Multi-Device protocol for Node.js. It provides low-level access to the protocol as well as higher-level helpers to send and receive messages, manage groups, handle media, and construct interactive messages. Because it communicates directly over WebSocket rather than using browser automation, Baileys is resource-efficient and suitable for long-running automation services.

This README documents architecture, installation, core concepts, message types, pairing and session management, security considerations, deployment recommendations, and troubleshooting tips.

---

## Key Concepts

* **Socket (makeWASocket):** Core API exposing events and send functions.
* **Pairing / Authentication:** Supports QR and pairing-code login.
* **Session Storage:** Save auth credentials and device state.
* **Messages & Events:** `messages.upsert`, `presence.update`, `connection.update`, etc.

---

## Architecture & Design Notes

1. **WebSocket-first:** Direct connection to WhatsApp Web servers, minimizing resource usage.
2. **Event-based API:** Subscribe to events for reactive behavior.
3. **Modular message builders:** Payloads are plain JS objects.
4. **Session resilience:** Implement reconnection logic and persistent storage.

---

## Installation

**Recommended:** Node 20+ (or latest LTS)

```
npm install @whiskeysockets/baileys
```

Atau fork lain bila diperlukan:

```
npm install @isrul/baileys
```

---

# Quick Start (Minimal)

```js
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'

const authFile = './auth_info.json'
const authState = fs.existsSync(authFile) ? JSON.parse(fs.readFileSync(authFile)) : undefined

async function start() {
  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: true,
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) start()
    } else if (connection === 'open') {
      console.log('Connection opened')
    }
  })

  sock.ev.on('messages.upsert', async m => {
    console.log(JSON.stringify(m, null, 2))
  })

  sock.ev.on('creds.update', (creds) => {
    fs.writeFileSync(authFile, JSON.stringify(creds))
  })
}

start()
```

---

## Pairing & Authentication

* Scan QR via `printQRInTerminal: true`
* Pairing code available pada beberapa fork
* Simpan kredensial agar tidak perlu re‑pairing

---

## Session Management & Reconnection Strategies

1. Dengarkan `connection.update`
2. Auto reconnect kecuali status `loggedOut`
3. Gunakan penyimpanan kredensial yang aman
4. Untuk multi-session, gunakan proses/container terpisah

---

## Message Types & Examples

### Group Status Message V2

```js
await sock.sendMessage(jid, {
  groupStatusMessage: { text: "Hello World" }
})
```

### Album (Multiple Images)

```js
await sock.sendMessage(jid, {
  albumMessage: [
    { image: cihuy, caption: "First photo" },
    { image: { url: "https://example.com/2.jpg" }, caption: "Second photo" }
  ]
}, { quoted: m })
```

### Event Message

```js
await sock.sendMessage(jid, {
  eventMessage: {
    isCanceled: false,
    name: "Meeting",
    description: "Weekly sync",
    location: { degreesLatitude: 0, degreesLongitude: 0, name: "Office" },
    joinLink: "https://call.whatsapp.com/...",
    startTime: "1763019000",
    endTime: "1763026200",
    extraGuestsAllowed: false
  }
}, { quoted: m })
```

### Poll Result Message

```js
await sock.sendMessage(jid, {
  pollResultMessage: {
    name: "Survey",
    pollVotes: [
      { optionName: "A", optionVoteCount: "10" },
      { optionName: "B", optionVoteCount: "2" }
    ]
  }
}, { quoted: m })
```

### Interactive Message (copy button)

```js
await sock.sendMessage(jid, {
  interactiveMessage: {
    header: "Header",
    title: "Title",
    footer: "footer text",
    buttons: [{
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "copy code",
        id: "123456789",
        copy_code: "ABC123XYZ"
      })
    }]
  }
}, { quoted: m })
```

---

## Group Management

* Tambah/hapus member, promote/demote admin
* Gunakan event group-participants.update

---

## Security & Privacy Considerations

* Simpan kredensial secara aman
* Hindari spam untuk mencegah blokir
* Patuhi aturan WhatsApp

---

## Deployment & Scaling

* Single session: 1 process sudah cukup
* Multi session: gunakan container/process terpisah

---

## Troubleshooting

* Sering logout: cek penyimpanan creds
* Disconnect: cek error dari `lastDisconnect`
* Format pesan error: cek struktur payload

---

## License

* Upstream: MIT (cek repo masing-masing)

---

## Credits

* Upstream: Whiskeysockets / Baileys
* Community forks
* Modified by @Killertzy

---

## Final Notes

Gunakan wiki resmi dan repo upstream untuk detail protokol & perubahan terbaru.

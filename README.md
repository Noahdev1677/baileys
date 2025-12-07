# WhatsApp Baileys

<p align="center">
  <img src="https://files.catbox.moe/2mltoe.png" alt="Thumbnail" />
</p>Overview

WhatsApp Baileys is a lightweight, WebSocket-based library that implements the WhatsApp Web/Multi-Device protocol for Node.js. It provides low-level access to the protocol as well as higher-level helpers to send and receive messages, manage groups, handle media, and construct interactive messages. Because it communicates directly over WebSocket rather than using browser automation, Baileys is resource-efficient and suitable for long-running automation services. 
This README documents architecture, installation, core concepts, message types, pairing and session management, security considerations, deployment recommendations, and troubleshooting tips. It is written to serve both as an introduction for newcomers and as a technical reference for production deployments.
Sources & Credits
Official Baileys repository / primary upstream and releases: Whiskeysockets / Baileys. 
Official documentation / guide: Baileys Wiki (detailed protocol & usage notes). 
Examples & community forks (useful references for extended features and deployment patterns). 
Original base / modifications: this specific distribution is based on existing community forks and the original Baileys architecture. Acknowledged contributors for this repository: Original base by KyuuRzy (credited by derivatives/forks in the community) and Modified / maintained by @Killertzy (current modifier). Community forks and adaptations are common — check the upstream repo and wiki for the canonical protocol details. 

##Key Concepts

Socket (makeWASocket): Core API that exposes events and send functions. The socket is event-driven and asynchronous. 
Pairing / Authentication: Multi-Device pairing allows a second client (Baileys) to be authorized by scanning QR or using a pairing code. Baileys supports persistent session storage so sessions persist across restarts. 
Session Storage: Save authentication credentials and device states (in-memory, JSON, or DB-backed). Proper session persistence avoids frequent re-pairing. 
Messages & Events: messages.upsert, presence.update, group-participants.update, connection.update etc. Use event listeners to react to incoming updates. 

---

##Architecture & Design Notes

1. WebSocket-first: Uses a direct WebSocket approach to talk with WhatsApp Web servers, avoiding browser overhead and simplifying deployment in headless environments. This reduces memory and CPU usage. 
2. Event-based API: The socket acts as an EventEmitter; subscribe to events for messages, presence, connection updates, and more. This makes it easy to build reactive pipelines. 
3. Modular message builders: Message payloads are plain JS objects; building complex interactive messages involves providing structured fields (header, body, buttons, nativeFlowMessage, etc.). Use JSON.stringify for nested button param payloads where required.
4. Session resilience: Implement reconnection strategies on connection.update events; persist session data and avoid logging out programmatically to maintain continuity.

---

##Installation

recommended: node 20+ (or latest LTS)
npm install @whiskeysockets/baileys
 or forked / community variant sometimes used in examples:
 npm install @isrul/baileys  (only if you intentionally use that fork)

Refer to the official npm package and upstream repo for the exact package name/version you want to pin. 

---

#Quick Start (Minimal)

```import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'

// load saved auth state if exists
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
    // handle incoming messages
    console.log(JSON.stringify(m, null, 2))
  })

  // store credentials whenever they change
  sock.ev.on('creds.update', (creds) => {
    fs.writeFileSync(authFile, JSON.stringify(creds))
  })
}

start()
```
Example adapted from community examples and upstream docs. Implement robust error handling in production. 

---

##Pairing & Authentication

QR Pairing: Typical flow for interactive local use. Set printQRInTerminal: true to show QR in terminal. Scan from an existing WhatsApp mobile client to authorize. 
Pairing Code: Some forks and newer flows also support pairing by token/code for unattended pairing (read upstream docs). Use carefully as pairing-code semantics can differ by implementation. 
Auth persistence: Always persist the creds returned by Baileys to storage. If credentials are lost, session will need re-pairing. Use encrypted storage in production. 

---

##Session Management & Reconnection Strategies

1. Listen to connection.update for close, open, connecting states.
2. When disconnect occurs, inspect lastDisconnect.error and DisconnectReason. Reconnect automatically unless logged out. 
3. Graceful shutdown: close socket and avoid deleting saved credentials unless explicitly logging out.
4. Scale: for many concurrent sessions, separate processes or container instances per session may simplify state handling; use a central router/service to spawn sessions. Community guidance suggests multiple instances for higher scale. 

---

##Message Types & Examples

Below are canonical examples (these mirror community examples and the kind of payload Baileys accepts). Replace variables like jid, m, cihuy with your runtime objects.

##Group Status Message V2

```await sock.sendMessage(jid, {
  groupStatusMessage: { text: "Hello World" }
});
```

##Album (Multiple Images)

```await sock.sendMessage(jid, {
  albumMessage: [
    { image: cihuy, caption: "First photo" },
    { image: { url: "https://example.com/2.jpg" }, caption: "Second photo" }
  ]
}, { quoted: m });
```

##Event Message (Invitation)

```await sock.sendMessage(jid, {
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
}, { quoted: m });
```

##Poll Result Message

```await sock.sendMessage(jid, {
  pollResultMessage: {
    name: "Survey",
    pollVotes: [
      { optionName: "A", optionVoteCount: "10" },
      { optionName: "B", optionVoteCount: "2" }
    ]
  }
}, { quoted: m });```

##Interactive Message (copy button example)

```await sock.sendMessage(jid, {
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
}, { quoted: m });
```

More complex nativeFlowMessage payloads follow the same principle: nested structured JSON for messageParamsJson and buttons. Use the wiki and upstream examples to author flows. 

---

##Group Management

Add/remove participants, promote/demote admins, update group metadata via group update payloads and related events. Always check permissions and group policy before issuing administrative commands.
Use group-participants.update and group-update events to synchronize your internal state with group changes. 

---

##Security & Privacy Considerations

Credentials: Store creds securely (encrypted at rest). Do not commit to public repositories.
Data retention: Be mindful of storing message contents. If storing user messages, follow privacy rules and local regulations (GDPR, PDPA, etc.).
Rate limits & abuse: WhatsApp may throttle or block accounts displaying spammy behaviour. Use sensible sending rates and backoff strategies.
Legal: This library connects to WhatsApp Web; ensure your use complies with WhatsApp terms and any applicable laws.

---

##Deployment & Scaling

For single-session bots: a single process or container is sufficient. Persist state in local secure storage or a small DB.
For multiple sessions: partition sessions across processes/containers. Use a session router or supervisor to manage processes, and coordinate via a DB or message queue. Community threads discuss scaling patterns and resource recommendations for handling hundreds of sessions. 
Use process supervisors (PM2, systemd, Docker) and monitor resource usage. Implement health checks and automatic restarts.

---

##Troubleshooting & Common Issues

Frequent re-pairing: ensure persistent credentials and avoid deleting auth state.
Unexpected disconnects: inspect lastDisconnect.error and use reconnection logic; check network stability. 
Message format errors: validate payload shapes against example code; nested JSON strings are often required for complex button payloads.
Rate-limiting / temporary blocks: slow down message cadence and retry with exponential backoff.

---

##Contribution & Extending

Keep patches small and focused. Provide tests and examples for new message types.
If you intend to fork or redistribute, review upstream license and attribution requirements. Many Baileys forks use MIT license — ensure compatibility with your project. 

---

##License

Upstream Baileys is typically MIT-licensed; forks may apply their own license. Check the license file in the specific repository you base your code on before redistribution. 

---

##Credits

Upstream / Official: Whiskeysockets / Baileys (primary upstream implementation and docs). 
Community forks & examples: Many public forks and example repos provide extended usage patterns and production tips. See community repos and the Baileys wiki for examples. 
This repository: Based on community derivatives and upstream Baileys. Original base by KyuuRzy (community derivative/fork acknowledged). Modified and maintained by @Killertzy (current modifier). If you want the explicit fork URL for the KyuuRzy base included, provide the exact repo link and I will add it verbatim.

---

##Final Notes

Use the official wiki and repository as canonical references for protocol-level details and breaking changes. Keep dependencies updated and test on staging before production rollout. 
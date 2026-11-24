# Tax Automation Events

A proof of concept that connects a Python automation app to a NestJS backend over Socket.IO. When a return is submitted, Nest sends the return payload to Python, Python automates each form and reports its status back, and Nest validates and logs every event.

## Structure

```
taxwise-integration/
├── nest-backend/     NestJS backend (Socket.IO gateway + submit endpoint)
└── python-app/       Python GUI client (customtkinter + python-socketio)
```

## How it works

1. Start Nest, then run the Python app. Click **Connect** (the light turns green).
2. Submit a return with a `POST` to Nest. `clientId` and `returnId` are read from the URL.
3. Nest loads the return JSON (a dummy file for now), validates it with a DTO, and emits `return:submitted` to Python.
4. Python receives the payload and runs each form row (MIS, W2, 1099C, and so on).
5. For every row, Python emits status events back to Nest, which validates and logs them.
6. When all rows are done, Python emits `automation:completed`.

## Events

| Event | Emitted by | Listened by | Purpose |
|---|---|---|---|
| `return:submitted` | Nest | Python | Carries the return payload |
| `automation:started` | Python | Nest | Run begins |
| `form:started` | Python | Nest | A form row begins (with `startedAt`) |
| `form:in_progress` | Python | Nest | The form row is being automated |
| `form:completed` | Python | Nest | Row finished (with `durationSec`) |
| `form:failed` | Python | Nest | Row failed (with `error`) |
| `automation:completed` | Python | Nest | All rows done (with `failed` count) |


## Setup

### Nest backend

```
cd nest-backend
npm install
npm run start:dev
```

Runs on port 3000.

### Python app

```
cd python-app
python -m venv venv
venv\Scripts\activate
pip install customtkinter "python-socketio[client]" websocket-client
python app.py
```

### Dummy data

Create `nest-backend/src/dummy/job.json` with a return payload. This file contains sensitive data (SSNs, bank numbers), is listed in `.gitignore`, and must never be committed.

## Submitting a return (Postman)

```
POST http://localhost:3000/individual-return-details?clientId=1697&returnId=1270&userId=613&returnType=individual&fromPortal=false
```

- Python must be connected first, otherwise Nest replies `No Python client connected`.
- The response is `{ "ok": true, ... }` when the return was sent to Python.

## Validation and errors

- Incoming payloads and events are validated with DTO classes (`class-validator`).
- Handlers are wrapped in `safe()`, so a bad event returns `{ ok: false, error }` instead of crashing Nest.
- In Python, a failed row emits `form:failed` and the run continues with the next row.

## Current limitations

- `return:submitted` is broadcast to every connected Python. This is fine with one client; production needs targeting by the owner of the return.
- No authentication on the socket yet. Production should send the user's JWT on connect and have Nest verify it.
- Statuses are only logged, not saved to a database.
- Events are fire-and-forget (no acknowledgements).
- `fill_form` is a dummy (`sleep`); the real bot is not connected yet.
- Only the `individual` return type is implemented.

## Next steps

1. JWT on the socket connection, with returns sent only to the owner's socket.
2. Persist runs and form statuses in a database.
3. Acknowledgements and retries on events.
4. Real form automation in place of the dummy.
5. Business return forms.
6. Tests (pytest for the JSON helpers, Vitest for the DTOs).

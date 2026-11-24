

# Taxwise Automation: NestJS + Python (Socket.io)

This project connects a **NestJS backend server** with a **Python client** using Socket.io.

- **NestJS = backend server.** It holds the client's form data (JSON) and starts the automation.
- **Python = client.** It connects to the NestJS server, receives the JSON, logs it, and runs the Taxwise automation.

Before, the forms JSON was hardcoded inside the Python automation. Now the JSON comes from the backend, so the automation works with real data.

## Flow

```
AUTOMATE BUTTON
      |
      v
Request data  (POST /individual-return/submit)
      |
      v
NESTJS (backend server)
      |
      |  fetch client JSON
      v
PYTHON (client) receives JSON
      |
  +---+--------------+
  |                  |
  v                  v
LOG JSON       TAXWISE AUTOMATION
```

### Step by step

1. NestJS starts and runs the Socket.io server.
2. Python starts (`app.py`) and connects to the NestJS server. The connection stays open and waits for work.
3. The user presses the **Automate** button.
4. The button sends a request to NestJS (`POST /individual-return/submit`).
5. NestJS gets the client's JSON.
6. NestJS sends the JSON to Python with the `return:submitted` event.
7. Python receives the JSON, logs it, and starts the Taxwise automation.
8. While running, Python reports progress back to NestJS.

## The two responsibilities

### 1. Connection
Build and keep the Socket.io connection between the NestJS server and the Python client.

- NestJS is the server (the gateway in `src/websockets/`).
- Python is the client and connects to NestJS.
- Only a client with the correct `WORKER_TOKEN` is accepted.
- Python reconnects automatically if the server restarts.

### 2. Event triggering
When the Automate button is pressed, trigger the event that starts the form automation.

- The controller (`submit.controller.ts`) receives the button request.
- The gateway emits `return:submitted` to Python with the client JSON.
- Python then runs the automation and sends status events back as each form starts and finishes.

## Events

| Event | Direction | What it does |
|---|---|---|
| `return:submitted` | NestJS to Python | Sends the client JSON and starts the automation |
| `automation:start` | Python to NestJS | Python started a run |
| `form:status` | Python to NestJS | Progress of each form: started, in_progress, completed, failed |
| `automation:end` | Python to NestJS | The run finished |

Every event Python sends has a unique `eventId`, so the same event is never processed twice.

## Project structure

```
src/
  dto/                    Validation for incoming data
  dummy/                  Sample form JSON for testing
  types/                  safe-handler wrapper
  utils/                  validateDto helper
  websockets/             Socket.io gateway (NestJS server side)
  submit.controller.ts    Endpoint the Automate button calls
  app.module.ts
app.py                    Python client + Taxwise automation
```

## Setup

### NestJS (backend server)

```bash
npm install
cp .env.example .env      # set PORT and WORKER_TOKEN
npm run start:dev
```

### Python (client)

```bash
pip install "python-socketio[client]"
python app.py
```

Start NestJS first, then Python.


Use the JSON in `src/dummy/` as the body to test with real-looking data.

## Common problems

| Problem | Reason |
|---|---|
| Python cannot connect | Wrong `WORKER_TOKEN`, or NestJS is not running |
| Button does nothing | Python client is not connected |
| Python connects but does not run | Event name does not match `return:submitted` |

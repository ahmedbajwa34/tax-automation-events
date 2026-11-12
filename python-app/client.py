import json
import time
import socketio
from datetime import datetime, timezone
import uuid

class AutomationClient:
    def __init__(self, url="http://localhost:3000",
                 on_connect=None, on_disconnect=None):
        self.url = url
        self.job = None
        self.run_id = None
        self._timers = {}   # key -> (perf_counter start, iso start time)
        self.sio = socketio.Client(reconnection=True)

        @self.sio.event
        def connect():
            print("Connected to NestJS!")
            if on_connect:
                on_connect()

        @self.sio.event
        def disconnect():
            print("Disconnected from NestJS!")
            if on_disconnect:
                on_disconnect()

    def connect(self, retries=3, delay=2):
        for attempt in range(1, retries + 1):
            try:
                if not self.sio.connected:
                    self.sio.connect(self.url)
                return
            except socketio.exceptions.ConnectionError:
                if attempt == retries:
                    raise
                print(f"Connect failed, retry {attempt}/{retries}")
                time.sleep(delay)

    def disconnect(self):
        if self.sio.connected:
            self.sio.disconnect()

    def _call(self, event, data, retries=3, delay=2):
        data = {**data, "eventId": str(uuid.uuid4())}   # same id on every retry
        for attempt in range(1, retries + 1):
         try:
            res = self.sio.call(event, data, timeout=10)
            if isinstance(res, dict) and res.get("ok") is False:
                raise RuntimeError(
                    f"{event} rejected by Nest: {res.get('error')}")
            return res
         except (socketio.exceptions.TimeoutError,
                socketio.exceptions.BadNamespaceError,
                socketio.exceptions.ConnectionError):
            if attempt == retries:
                raise
            time.sleep(delay)
            
    def _now(self):
        return datetime.now(timezone.utc).isoformat()

    def _key(self, form, ref):
        return f"{form}:{json.dumps(ref, sort_keys=True)}"

    def _send_status(self, form, ref, status, **extra):
        self._call("form:status", {
            "runId": self.run_id,
            "form": form,
            "ref": ref,
            "status": status,
            "timestamp": self._now(),
            **extra,
        })

    def start_automation(self, job):
        self.job = job
        res = self._call("automation:start", {
            "returnId": job["returnId"],
            "taxYear": job["taxYear"],
            "returnType": job["returnType"],
        })
        self.run_id = res["runId"]

    def form_started(self, form, ref):
        started_at = self._now()
        self._timers[self._key(form, ref)] = (time.perf_counter(), started_at)
        self._send_status(form, ref, "started", startedAt=started_at)

    def form_in_progress(self, form, ref, detail=None):
        self._send_status(form, ref, "in_progress", detail=detail)

    def form_completed(self, form, ref):
        t0, started_at = self._timers.pop(self._key(form, ref))
        secs = round(time.perf_counter() - t0, 2)
        self._send_status(form, ref, "completed",
                          startedAt=started_at, endedAt=self._now(),
                          durationSec=secs)
        return secs

    def form_failed(self, form, ref, error):
        self._timers.pop(self._key(form, ref), None)
        self._send_status(form, ref, "failed", error=error)

    def end_automation(self, status="completed"):
        self._call("automation:end", {
            "runId": self.run_id,
            "status": status,
            "timestamp": self._now(),
        })
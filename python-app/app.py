import time
import threading
from datetime import datetime, timezone
import customtkinter as ctk
import socketio

URL = "http://localhost:3000"
sio = socketio.Client(reconnection=False)
busy = False

app = ctk.CTk()
app.title("TaxWise Automation")
app.geometry("500x320")

ctk.CTkLabel(app, text="TaxWise Automation", font=("Arial", 22, "bold")).pack(pady=25)
status = ctk.CTkLabel(app, text="● Disconnected", text_color="red")
status.pack(pady=5)
info = ctk.CTkLabel(app, text="Click Connect")
info.pack(pady=10)


def set_info(text):
    app.after(0, lambda: info.configure(text=text))


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]

def get_rows(payload, path):
    rows = [payload]
    for key in path.split("."):
        nxt = []
        for r in rows:
            if isinstance(r, dict):
                nxt += as_list(r.get(key))
        rows = nxt
    return rows


# (form name, key in payload, field shown as the status label)
FORMS = [
    ("MIS",     "mis",                         None),
    ("W2",      "w2",                          "employerName"),
    ("1099R",   "f1099r",                      "payerName"),
    ("1099SSA", "f1099SSA",                    "payerName"),
    ("1099DIV", "f1099SchB.ordinaryDividends", "payer"),
    ("1099INT", "f1099SchB.otherInterest",     "payer"),
    ("1098",    "f1098mortgage",               "recipientName"),
    ("1099B",   "f1099Stocks",                 "descriptionOfProperty"),
    ("1099G",   "f1099g",                      "payerName"),
    ("W2G",     "w2G",                         "payersName"),
    ("1099C",   "f1099c",                      "creditorName"),
]


def fill_form(name, row):
    time.sleep(2)            # fake automation, real bot goes here


def run(payload):
    global busy
    busy = True
    ids = {
        "clientId": payload["clientId"],
        "returnId": payload["returnId"],
        "userId": payload["userId"],
        "returnType": payload["returnType"],
        "taxYear": payload["taxYear"],
    }
    sio.emit("automation:started", ids)

    for name, path, label in FORMS:
        for i, row in enumerate(get_rows(payload, path), 1):
            base = {**ids, "form": name,
                    "ref": f"{row.get(label)} #{i}" if label else payload["returnId"]}
            t0 = time.perf_counter()
            set_info(f"{name} ({base['ref']}): in progress")
            sio.emit("form:started",
                     {**base, "startedAt": datetime.now(timezone.utc).isoformat()})
            sio.emit("form:in_progress", base)
            try:
                fill_form(name, row)
                secs = round(time.perf_counter() - t0, 2)
                sio.emit("form:completed", {**base, "durationSec": secs})
                set_info(f"{name} ({base['ref']}): completed in {secs}s")
            except Exception as e:
                sio.emit("form:failed", {**base, "error": str(e)})

    sio.emit("automation:completed", ids)
    set_info("All forms done. Waiting for a return...")
    busy = False


@sio.event
def connect():
    app.after(0, lambda: (
        status.configure(text="● Connected", text_color="green"),
        btn.configure(text="Disconnect", state="normal"),
        info.configure(text="Waiting for a return...")))


@sio.event
def disconnect():
    app.after(0, lambda: (
        status.configure(text="● Disconnected", text_color="red"),
        btn.configure(text="Connect", state="normal"),
        info.configure(text="Click Connect")))


@sio.on("return:submitted")
def on_return(payload):
    if not busy:
        threading.Thread(target=run, args=(payload,), daemon=True).start()


def do_connect():
    try:
        sio.connect(URL)
    except Exception as e:
        set_info(f"Connection failed: {e}")
        app.after(0, lambda: btn.configure(state="normal"))


def on_button():
    btn.configure(state="disabled")
    if sio.connected:
        sio.disconnect()
    else:
        threading.Thread(target=do_connect, daemon=True).start()


btn = ctk.CTkButton(app, text="Connect", command=on_button)
btn.pack(pady=15)

app.mainloop()
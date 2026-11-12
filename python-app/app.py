import json
import time
import threading
import customtkinter as ctk
from client import AutomationClient
import socketio

app = ctk.CTk()
app.title("TaxWise Automation")
app.geometry("500x350")

ctk.CTkLabel(app, text="TaxWise Automation",
             font=("Arial", 22, "bold")).pack(pady=30)

status = ctk.CTkLabel(app, text="● Disconnected", text_color="red")
status.pack(pady=10)

client = AutomationClient(
    on_connect=lambda: app.after(0, lambda: status.configure(
        text="● Connected", text_color="green")),
    on_disconnect=lambda: app.after(0, lambda: status.configure(
        text="● Disconnected", text_color="red")),
)


# ---------- job (later: from the backend) ----------
def get_job():
    with open("job.json", encoding="utf-8") as f:
        return json.load(f)


# ---------- JSON helpers ----------
def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def is_empty(v):
    if v is None or v is False:
        return True
    if isinstance(v, str):
        return v.strip() == ""
    if isinstance(v, dict):
        return all(is_empty(x) for x in v.values())
    if isinstance(v, list):
        return all(is_empty(x) for x in v)
    return False          # 0, True, numbers are real values


def is_blank(d):
    return is_empty(d)


def get_items(job, path, label=None, extra=()):
    """path: 'mis' | 'w2' | 'mis.dependentsAndNonDependents'"""
    data = job
    for key in path.split("."):
        data = data.get(key) if isinstance(data, dict) else None

    rows = [r for r in as_list(data) if not is_blank(r)]
    items = []
    seen = set()
    for i, r in enumerate(rows, 1):
        ref = {"returnId": r.get("returnId", job["returnId"])}
        if r.get("id") is not None:
            ref["id"] = r["id"]
        else:
            ref["n"] = i            # fallback for rows without an id (e.g. mis)
        if r.get("clientId") is not None:
            ref["clientId"] = r["clientId"]
        if label:
            ref[label] = r.get(label)
        for k in extra:
            ref[k] = r.get(k)

        key = json.dumps(ref, sort_keys=True)
        if key in seen:
            raise ValueError(f"Duplicate row in '{path}': {ref}")
        seen.add(key)
        items.append((ref, r))
    return items

# ---------- fake fills (replace with real automation later) ----------
def fill_mis(job, data, progress):
    time.sleep(2)

def fill_w2(job, data, progress):
    time.sleep(1)
    progress("entering employer info")
    time.sleep(2)

def fill_1099r(job, data, progress):
    time.sleep(2)

def fill_1099ssa(job, data, progress):
    time.sleep(2)

def fill_1099c(job, data, progress):
    time.sleep(5)


# ---------- forms ----------
RUN_ONLY = ["MIS", "W2", "1099C"]   # change to choose which forms run

ALL_FORMS = [
    {"name": "MIS",     "items": lambda j: get_items(j, "mis"),
     "fill": fill_mis},
    {"name": "W2",      "items": lambda j: get_items(j, "w2", "employerName"),
     "fill": fill_w2},
    {"name": "1099R",   "items": lambda j: get_items(j, "f1099r", "payerName"),
     "fill": fill_1099r},
    {"name": "1099SSA", "items": lambda j: get_items(j, "f1099SSA", "payerName"),
     "fill": fill_1099ssa},
    {"name": "1099C", "items": lambda j: get_items(j, "f1099c", "creditorName"),
     "fill": fill_1099c},
      # in ALL_FORMS
]
FORMS = [f for f in ALL_FORMS if f["name"] in RUN_ONLY]


def run_automation():
    started = False
    try:
        job = get_job()
        client.connect()
        client.start_automation(job)
        started = True
        any_failed = False

        for form in FORMS:
            name = form["name"]
            for ref, data in form["items"](job):
                client.form_started(name, ref)
                client.form_in_progress(name, ref)
                try:
                    form["fill"](job, data,
                                 lambda d, n=name, r=ref: client.form_in_progress(n, r, d))
                except Exception as e:
                    any_failed = True
                    client.form_failed(name, ref, str(e))
                    continue                     # next item / form
                client.form_completed(name, ref)

        client.end_automation("failed" if any_failed else "completed")

    except FileNotFoundError:
        print("job.json not found")
    except json.JSONDecodeError as e:
        print(f"job.json is invalid: {e}")
    except KeyError as e:
        print(f"Missing key in JSON: {e}")
    except (socketio.exceptions.ConnectionError, socketio.exceptions.TimeoutError) as e:
        print(f"Nest not reachable: {e}")
    except Exception as e:
        print(f"Run failed: {e}")
        if started:
            try:
                client.end_automation("failed")
            except Exception:
                pass
    finally:
        client.disconnect()
        app.after(0, lambda: btn.configure(state="normal"))


def on_click():
    btn.configure(state="disabled")
    threading.Thread(target=run_automation, daemon=True).start()


btn = ctk.CTkButton(app, text="Start Automation", command=on_click)
btn.pack(pady=20)

app.mainloop()
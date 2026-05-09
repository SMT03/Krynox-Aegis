#!/usr/bin/env python3
import sys
import glob

try:
    from bcc import BPF
except ImportError:
    # Fallback for Conda envs: add the system Python site-packages where python3-bcc is installed
    system_paths = glob.glob("/usr/lib/python3.*/site-packages")
    if system_paths:
        sys.path.append(system_paths[-1])  # Use latest version
    try:
        from bcc import BPF
    except ImportError:
        print("ERROR: bcc python module not found. Make sure python3-bcc is installed via DNF.")
        sys.exit(1)

import ctypes
import os
import signal
import threading

# Fallback for when 'sudo' strips Conda/User environment variables
# This forces the script to look in the user's local pip install directory
local_site_packages = glob.glob("/home/*/.local/lib/python3.*/site-packages")
for path in local_site_packages:
    if path not in sys.path:
        sys.path.append(path)

from fastapi import FastAPI
import uvicorn
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# Step 2: The Data Store & FastAPI
threat_logs = []
app = FastAPI(title="Krynox Aegis API")

@app.get("/threats")
def get_threats():
    return {"threats": threat_logs}

# Step 1: The AI Analysis Engine
def generate_threat_report(pid: int):
    # Initialize the Gemini model (Free Tier via Google AI Studio)
    llm = ChatGoogleGenerativeAI(
        model="gemini-flash-latest", 
        temperature=0.7,
        google_api_key="AIzaSyDrmgNUfXebn6hxtbdUyJR4R3n57T9QkKs" # Replace with your key from aistudio.google.com
    )
    
    system_prompt = (
        f"You are Krynox AI, the forensic analyst for Krynox Tech. A process with PID {pid} "
        "just attempted an unauthorized read of a Solana developer's id.json keypair. "
        "The Krynox kernel module instantly killed it. Generate a concise, 3-sentence "
        "technical post-mortem explaining the potential attack vector (e.g., wallet drainer, "
        "supply chain exploit) and confirming the hardware-level mitigation."
    )
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="Generate the post-mortem report.")
    ]
    
    response = llm.invoke(messages)
    return response.content

def process_threat_report_async(pid: int):
    try:
        report = generate_threat_report(pid)
        threat_logs.append({"pid": pid, "report": report})
        print(f"\n\033[93m[KRYNOX AI REPORT for PID {pid}]:\n{report}\033[0m\n")
    except Exception as e:
        print(f"\n\033[93m[KRYNOX AI ERROR]: Failed to generate report for PID {pid}: {e}\033[0m\n")

# Define the event structure to match the C code
class Event(ctypes.Structure):
    _fields_ = [
        ("pid", ctypes.c_uint),
        ("filename", ctypes.c_char * 256),
    ]

def print_event(cpu, data, size):
    event = ctypes.cast(data, ctypes.POINTER(Event)).contents
    try:
        filename = event.filename.decode('utf-8', 'replace')
    except Exception:
        filename = "<invalid utf-8>"

    try:
        # Get the name of the process from the PID
        with open(f"/proc/{event.pid}/comm", "r") as f:
            comm = f.read().strip()
        
        # If the process is the official solana-cli, let it live
        if comm == "solana":
            print(f"\033[94mKRYNOX INFO: Authorized access by official Solana CLI (PID {event.pid}).\033[0m")
            return

    except Exception:
        pass # Process might have already exited
    
    # Print the massive red terminal warning
    print("\n\033[91m\033[1mKRYNOX SENTINEL ALERT: Unauthorized access to Solana Keypair by PID {}!\033[0m".format(event.pid))
    print("\033[91mTarget file: {}\033[0m".format(filename))
    
    # Example of terminating the process:
    print("Attempting to terminate PID {}...".format(event.pid))
    try:
        os.kill(event.pid, signal.SIGKILL)
        print("Process {} terminated successfully.".format(event.pid))
    except ProcessLookupError:
        print("Process {} already exited.".format(event.pid))
    except PermissionError:
        print("Permission denied to terminate process {}.".format(event.pid))
    except Exception as e:
        print("Error killing process {}: {}".format(event.pid, e))
        
    # Step 3 (Continued): Fire off the generate_threat_report function in the background
    threading.Thread(target=process_threat_report_async, args=(event.pid,), daemon=True).start()

def run_bpf():
    print("Initializing Krynox Aegis eBPF Module...")
    
    # Load BPF program from source file
    bpf = BPF(src_file="krynox_core.bpf.c")
    
    # Open ring buffer to poll for events
    bpf["events"].open_ring_buffer(print_event)
    
    print("\033[92mKrynox Sentinel running...\033[0m Polling for events (Ctrl+C to exit)...")
    try:
        while True:
            bpf.ring_buffer_poll()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    # Step 3: Start the BCC polling in a daemon thread
    bpf_thread = threading.Thread(target=run_bpf, daemon=True)
    bpf_thread.start()
    
    # Start the FastAPI server on the main thread
    # This will block the main thread and keep the application alive
    uvicorn.run(app, host="0.0.0.0", port=8000)

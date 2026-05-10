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

from dotenv import load_dotenv
# Use the script's own directory to locate .env, so it works under sudo
_script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_script_dir, ".env"))

from fastapi import FastAPI
import uvicorn
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
import hashlib
import json
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction
from solders.message import MessageV0
from solders.transaction import VersionedTransaction

# Step 2: The Data Store & FastAPI
threat_logs = []
app = FastAPI(title="Krynox Aegis API")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/threats")
def get_threats():
    return {"threats": threat_logs}

# Step 1: The AI Analysis Engine
def generate_threat_report(pid: int):
    # Initialize the Groq model securely using environment variables
    # Ensure you have a .env file with GROQ_API_KEY=your_key
    llm = ChatGroq(
        temperature=0,
        groq_api_key=os.environ.get("GROQ_API_KEY"),
        model_name="meta-llama/llama-4-scout-17b-16e-instruct"
    )
    
    system_prompt = (
        f"You are the Krynox Cyber-Forensics Engine. A high-severity security event occurred: "
        f"Process PID {pid} attempted an unauthorized read of a Solana BIP39/secret keypair (id.json). "
        "The Krynox eBPF-LSM module synchronously intercepted the 'security_file_open' syscall and issued a SIGKILL. "
        "Generate a detailed technical forensic report. Include the following sections:\n"
        "1. **SYSCALL INTERCEPTION**: Detail the LSM hook enforcement.\n"
        "2. **ATTACK VECTOR**: Analyze potential T1552 (Unsecured Credentials) or supply-chain masquerading attempts.\n"
        "3. **HARDWARE-LEVEL MITIGATION**: Explain how VFS-layer protection ensured zero-byte exfiltration.\n"
        "4. **RISK ASSESSMENT**: Categorize the threat (e.g., Critical/Credential Theft) and confirm system integrity."
        "\nUse highly technical, professional EDR terminology. Keep it structured and authoritative."
    )
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="Generate the post-mortem report.")
    ]
    
    response = llm.invoke(messages)
    return response.content

def log_threat_to_devnet(ai_report_text: str, keypair_path: str = "/home/symtuh/.config/solana/id.json") -> str:
    client = Client("https://api.devnet.solana.com")
    
    with open(keypair_path, "r") as f:
        secret_key = json.load(f)
    keypair = Keypair.from_bytes(bytes(secret_key))

    # Check balance — warn if too low for tx fees (~5000 lamports)
    balance = client.get_balance(keypair.pubkey()).value
    if balance < 5000:
        raise Exception(f"Insufficient SOL on devnet ({balance} lamports). Run: solana airdrop 1 --url devnet")

    threat_hash = hashlib.sha256(ai_report_text.encode("utf-8")).hexdigest()
    memo_str = f"KRYNOX_AEGIS_THREAT_BLOCKED: {threat_hash}"
    
    memo_program_id = Pubkey.from_string("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo")
    
    instruction = Instruction(
        program_id=memo_program_id,
        accounts=[],
        data=memo_str.encode("utf-8")
    )
    
    recent_blockhash = client.get_latest_blockhash().value.blockhash
    
    msg = MessageV0.try_compile(
        payer=keypair.pubkey(),
        instructions=[instruction],
        address_lookup_table_accounts=[],
        recent_blockhash=recent_blockhash,
    )
    
    tx = VersionedTransaction(msg, [keypair])
    result = client.send_transaction(tx)

    # result.value is a Signature on success, or an RpcError on failure
    sig_str = str(result.value)
    if sig_str.startswith("Error") or "error" in sig_str.lower():
        raise Exception(f"RPC rejected transaction: {sig_str}")
    
    return sig_str

def process_threat_report_async(pid: int):
    # Initialize a placeholder so the dashboard sees the threat immediately
    threat_entry = {
        "pid": pid,
        "report": "Analyzing threat forensics via Groq AI...",
        "tx_signature": "Pending..."
    }
    threat_logs.append(threat_entry)

    try:
        report = generate_threat_report(pid)
        threat_entry["report"] = report
        print(f"\n\033[93m[KRYNOX AI REPORT for PID {pid}]:\n{report}\033[0m\n")
        
        try:
            tx_sig = log_threat_to_devnet(report)
            threat_entry["tx_signature"] = tx_sig
            print(f"\033[92m[DEVNET SUCCESS]: Audit log posted! TX Signature: {tx_sig}\033[0m\n")
        except Exception as devnet_err:
            threat_entry["tx_signature"] = f"Blockchain Error: {devnet_err}"
            print(f"\033[91m[DEVNET ERROR]: Failed to post audit log: {devnet_err}\033[0m\n")
            
    except Exception as e:
        threat_entry["report"] = f"Forensics Unavailable: {e}"
        threat_entry["tx_signature"] = "N/A"
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
        
        # If the process is the official solana-cli or our own sentinel, let it live
        if comm in ("solana", "python3"):
            print(f"\033[94mKRYNOX INFO: Authorized access by '{comm}' (PID {event.pid}).\033[0m")
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
        
    # Trigger critical desktop notification
    os.system('notify-send -u critical "KRYNOX TECH: THREAT BLOCKED" "Unauthorized access by PID {} was terminated in kernel-space."'.format(event.pid))
        
    # Step 3 (Continued): Fire off the generate_threat_report function in the background
    threading.Thread(target=process_threat_report_async, args=(event.pid,), daemon=True).start()

def run_bpf():
    print("Initializing Krynox Aegis eBPF Module...")
    
    # Load BPF program from source file
    bpf = BPF(src_file="krynox_core.bpf.c")
    
    # Register this sentinel's own PID in the kernel whitelist map.
    # This prevents bpf_send_signal(9) from killing us when log_threat_to_devnet
    # opens id.json to sign the Solana transaction.
    sentinel_pid = os.getpid()
    whitelist = bpf["whitelist_pids"]
    key = ctypes.c_uint32(sentinel_pid)
    val = ctypes.c_uint8(1)
    whitelist[key] = val
    print(f"\033[94m[KRYNOX] Sentinel PID {sentinel_pid} whitelisted in kernel map.\033[0m")

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

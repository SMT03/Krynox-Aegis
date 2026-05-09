# Krynox Aegis 🛡️
**Enterprise-Grade eBPF Security Monitor for Solana Developers**

Krynox Aegis is a zero-trust observability and security suite designed specifically for Solana developers on Linux (Fedora). It uses the power of **eBPF (Extended Berkeley Packet Filter)** to intercept, analyze, and instantly kill unauthorized attempts to access sensitive developer keypairs (`id.json`).

---

## 🚀 Features

- **Hardware-Level Enforcement:** Unlike user-space monitors that suffer from cache-based race conditions, Aegis hooks directly into the kernel's Virtual File System (VFS). When an unauthorized read occurs, `bpf_send_signal(9)` instantly terminates the process synchronously before the syscall finishes.
- **Symlink & Path Obfuscation Defeated:** Bypassing security via `fake_key.json -> id.json` symlinks is impossible. Aegis uses a deep Kernel Probe (`kprobe__security_file_open`) to read the fully-resolved `dentry` inode, not the raw string input.
- **Smart Whitelisting:** Official developer tools like the Solana CLI (`solana balance`) are recognized and permitted via `bpf_get_current_comm()`, preventing the suite from disrupting your actual workflow.
- **AI Forensic Post-Mortem (Gemini):** Every killed threat is automatically sent to Google Gemini Flash. The AI agent generates a live, 3-sentence technical post-mortem of the attack vector (e.g., wallet drainer) and streams it to the dashboard.
- **FastAPI Threat Dashboard:** While the eBPF ring buffer polls continuously in a background daemon thread, a FastAPI web server runs on the main thread, hosting your live JSON threat logs at `http://localhost:8000/threats`.
- **Conda-Native:** Built-in dynamic path resolution ensures that even when running under `sudo`, the Python monitor automatically locates your Conda environment's `~/.local` pip dependencies.

---

## 🛠️ Architecture

Krynox Aegis operates with a dual-tier architecture:
1. **The Core (`krynox_core.bpf.c`):** A lightweight, extremely fast C program loaded directly into the Linux kernel via libbpf/BCC.
2. **The Sentinel (`sentinel.py`):** A Python user-space daemon that processes the kernel ring buffer, interacts with the LLM API, and serves the FastAPI web dashboard.

## ⚙️ Installation & Usage

### Prerequisites
Ensure you have the required BCC headers and packages installed on Fedora:
```bash
sudo dnf install kernel-devel bcc-devel python3-bcc
```

### Setup Environment
```bash
conda create -n krynox-hackathon python=3.10
conda activate krynox-hackathon
pip install fastapi uvicorn langchain langchain-google-genai
```

### Running Krynox Aegis
1. Grab a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Place your key in `sentinel.py` at line 49.
3. Start the Sentinel (requires root privileges to load eBPF):

```bash
sudo python3 sentinel.py
```

### Testing the Defenses
While Sentinel is running, open a new terminal and attempt to maliciously read your keypair:
```bash
cat ~/.config/solana/id.json
```
You will immediately receive a **KILLED** signal in your terminal. Check the Sentinel console or visit `http://localhost:8000/threats` to see the AI-generated forensic report!

---

*Built for the Solana Hackathon* 🚀

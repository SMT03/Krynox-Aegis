# Security Policy

## Reporting a Vulnerability

The security of Solana developers' environments is a top priority. If you discover a security vulnerability within Krynox Aegis, please do not use the GitHub issue tracker. Instead, please open a private security advisory on GitHub or contact the author directly through GitHub's messaging features.

## Threat Model & MITRE ATT&CK Mapping

Krynox Aegis is designed to provide Zero-Trust hardware-level protection for sensitive cryptographic material. Below is a mapping of our kernel-space mitigations to the MITRE ATT&CK framework.

| MITRE Technique | Description | Krynox Aegis Mitigation |
|:---|:---|:---|
| **T1552: Unsecured Credentials** | Adversaries may search for private keys (e.g., `id.json`) to gain unauthorized access to blockchain accounts. | **LSM Hooking:** Krynox implements a `security_file_open` kprobe. Any process not explicitly whitelisted is denied access at the syscall entry, rendering the credentials unreachable even if discovered. |
| **T1036: Masquerading (Symlink Evasion)** | Adversaries may use symlinks or path obfuscation (e.g., `/tmp/link -> ~/.config/solana/id.json`) to bypass simple filename monitors. | **VFS Resolution:** Krynox resolves the underlying VFS dentry and inode information in kernel-space. By inspecting the `f_path.dentry->d_name.name` of the resolved target, it defeats masquerading regardless of the user-space path used. |
| **T1562: Impair Defenses** | Malicious processes may attempt to terminate the security monitor itself. | **Zero-Trust Whitelisting:** The Sentinel registers its own PID in a protected BPF_HASH map. The kernel module references this map before issuing SIGKILL, ensuring the defense cannot be self-sabotaged. |

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

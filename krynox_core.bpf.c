#ifdef __CLANG_STANDALONE__

// Standard libbpf code for clang to compile to .o
#include <linux/bpf.h>
#include <linux/ptrace.h>

#ifndef __section
#define __section(NAME) __attribute__((section(NAME), used))
#endif

#ifndef __uint
#define __uint(name, val) int (*name)[val]
#endif

char LICENSE[] __section("license") = "GPL";

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} events __section(".maps");

struct event_t {
    unsigned int pid;
    char filename[256];
};

struct trace_event_raw_sys_enter_openat {
    unsigned long long unused;
    long __syscall_nr;
    long dfd;
    const char *filename;
    long flags;
    unsigned short mode;
};

static void *(*bpf_ringbuf_reserve)(void *ringbuf, unsigned long long size, unsigned long long flags) = (void *) BPF_FUNC_ringbuf_reserve;
static void (*bpf_ringbuf_submit)(void *data, unsigned long long flags) = (void *) BPF_FUNC_ringbuf_submit;
static void (*bpf_ringbuf_discard)(void *data, unsigned long long flags) = (void *) BPF_FUNC_ringbuf_discard;
static long (*bpf_probe_read_user_str)(void *dst, unsigned int size, const void *unsafe_ptr) = (void *) BPF_FUNC_probe_read_user_str;
static unsigned long long (*bpf_get_current_pid_tgid)(void) = (void *) BPF_FUNC_get_current_pid_tgid;
static long (*bpf_get_current_comm)(void *buf, unsigned int size_of_buf) = (void *) BPF_FUNC_get_current_comm;
static long (*bpf_send_signal)(unsigned int sig) = (void *) BPF_FUNC_send_signal;

static __inline int is_solana_comm(void) {
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    if (comm[0] == 's' && comm[1] == 'o' && comm[2] == 'l' && comm[3] == 'a' && 
        comm[4] == 'n' && comm[5] == 'a' && comm[6] == '\0') {
        return 1;
    }
    return 0;
}

// Whitelist: allow the sentinel (python3) to read id.json for Devnet logging
static __inline int is_python_comm(void) {
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    if (comm[0] == 'p' && comm[1] == 'y' && comm[2] == 't' && comm[3] == 'h' && 
        comm[4] == 'o' && comm[5] == 'n' && comm[6] == '3' && comm[7] == '\0') {
        return 1;
    }
    return 0;
}

static __inline int has_id_json(const char *str) {
    #pragma unroll
    for (int i = 0; i < 256 - 7; i++) {
        if (str[i] == '\0') break;
        if (str[i] == 'i' && str[i+1] == 'd' && str[i+2] == '.' && 
            str[i+3] == 'j' && str[i+4] == 's' && str[i+5] == 'o' && str[i+6] == 'n') {
            return 1;
        }
    }
    return 0;
}

__section("tracepoint/syscalls/sys_enter_openat")
int handle_openat(struct trace_event_raw_sys_enter_openat *ctx) {
    unsigned int pid = bpf_get_current_pid_tgid() >> 32;

    struct event_t *e;
    e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e) {
        return 0;
    }

    e->pid = pid;
    long ret = bpf_probe_read_user_str(e->filename, sizeof(e->filename), ctx->filename);
    if (ret > 0) {
        if (has_id_json(e->filename)) {
            bpf_ringbuf_submit(e, 0);
            if (!is_solana_comm() && !is_python_comm()) {
                bpf_send_signal(9);
            }
            return 0;
        }
    }
    
    bpf_ringbuf_discard(e, 0);
    return 0;
}

#else

// BCC-specific code for sentinel.py
#include <uapi/linux/ptrace.h>
#include <linux/sched.h>
#include <linux/fs.h>
#include <linux/dcache.h>

BPF_RINGBUF_OUTPUT(events, 256);

// Whitelist map: PIDs that are allowed to open id.json without being killed.
// The sentinel registers itself here at startup.
BPF_HASH(whitelist_pids, u32, u8);

struct event_t {
    u32 pid;
    char filename[256];
};

static __inline int is_solana_comm(void) {
    char comm[16];
    bpf_get_current_comm(&comm, sizeof(comm));
    if (comm[0] == 's' && comm[1] == 'o' && comm[2] == 'l' && comm[3] == 'a' &&
        comm[4] == 'n' && comm[5] == 'a' && comm[6] == '\0') {
        return 1;
    }
    return 0;
}

static __inline int has_id_json(const char *str) {
    #pragma unroll
    for (int i = 0; i < 256 - 7; i++) {
        if (str[i] == '\0') break;
        if (str[i] == 'i' && str[i+1] == 'd' && str[i+2] == '.' &&
            str[i+3] == 'j' && str[i+4] == 's' && str[i+5] == 'o' && str[i+6] == 'n') {
            return 1;
        }
    }
    return 0;
}

int kprobe__security_file_open(struct pt_regs *ctx, struct file *file) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;

    // Skip whitelisted PIDs (e.g. the sentinel itself)
    if (whitelist_pids.lookup(&pid)) {
        return 0;
    }

    struct event_t *e = events.ringbuf_reserve(sizeof(struct event_t));
    if (!e) return 0;

    e->pid = pid;

    // Read the resolved filename directly from the VFS dentry!
    const unsigned char *name_ptr = file->f_path.dentry->d_name.name;
    bpf_probe_read_kernel_str(e->filename, sizeof(e->filename), name_ptr);

    if (has_id_json(e->filename)) {
        events.ringbuf_submit(e, 0);
        if (!is_solana_comm()) {
            bpf_send_signal(9);
        }
    } else {
        events.ringbuf_discard(e, 0);
    }
    return 0;
}

#endif

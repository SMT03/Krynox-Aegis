CC=clang
CFLAGS=-O2 -target bpf -D__CLANG_STANDALONE__ -Wall

all: krynox_core.o

krynox_core.o: krynox_core.bpf.c
	$(CC) $(CFLAGS) -c krynox_core.bpf.c -o krynox_core.o

clean:
	rm -f krynox_core.o

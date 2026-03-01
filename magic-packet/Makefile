CC = gcc
CFLAGS = -Wall -Wextra -O2
TARGET = wol

all: $(TARGET)

$(TARGET): wol.c
	$(CC) $(CFLAGS) -o $(TARGET) wol.c

clean:
	rm -f $(TARGET)

.PHONY: all clean

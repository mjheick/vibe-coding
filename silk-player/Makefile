CC = gcc
CFLAGS = -Wall -O2
TARGET = skype_voicemail_converter

all: $(TARGET)

$(TARGET): skype_voicemail_converter.c
	$(CC) $(CFLAGS) -o $(TARGET) skype_voicemail_converter.c

clean:
	rm -f $(TARGET) $(TARGET).exe temp_audio.silk temp_audio.pcm

.PHONY: all clean

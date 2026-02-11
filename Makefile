
TARGET := rlab

OBJS := main.o node_registry.o cmd_exec.o json_utils.o json.o jnum.o

CFLAGS := -O0 -g -ffunction-sections -fdata-sections -Wall -Wextra

LDFLAGS := -lm

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) $(LDFLAGS) -o $@

%.o: %.c
	$(CC) -c $< $(CFLAGS) -o $@

clean:
	rm -f $(TARGET) $(OBJS)



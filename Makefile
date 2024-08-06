
target := rlab

router-lab-obj := ./main.o ./json.o ./jnum.o

CFLAGS := -O0 -g -ffunction-sections -fdata-sections

LDFLAGS := -lm

all:$(target)

rlab:$(router-lab-obj)
	$(CC) $^ $(LDFLAGS) -o $@

%.o:%.c
	$(CC) -c $< $(CFLAGS) -o $@

clean:
	rm -f $(target) $(router-lab-obj)



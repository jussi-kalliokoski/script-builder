TESTS	:= $(wildcard *.test)
RESULTS	:= $(TESTS:%.test=results/%.result)

all: clean ${RESULTS}

results/%.result: %.test
	./test.js $^ $(patsubst %.result,%.expected,$@) > $@

clean:
	rm -f ${RESULTS}

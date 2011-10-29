TESTS	:= $(wildcard *.test)
RESULTS	:= $(TESTS:%.test=results/%.result)

all: clean ${RESULTS}
	./test-docs.js results/docs.expected > results/docs.result

results/%.result: %.test
	./test.js $^ $(patsubst %.result,%.expected,$@) > $@

clean:
	rm -f ${RESULTS}
	rm -f results/docs.result

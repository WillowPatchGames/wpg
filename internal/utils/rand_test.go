package utils

import (
	"testing"
)

func TestRandomFloat64(t *testing.T) {
	var tests = 100000
	if testing.Short() {
		tests = 10000
	}

	var values []float64 = make([]float64, tests)
	for i := 0; i < tests; i++ {
		values[i] = RandomFloat64()
		if values[i] < 0 {
			panic(values[i])
		}

		if values[i] >= 1 {
			panic(values[i])
		}
	}
}

func BenchmarkWords(b *testing.B) {
	_ = RandomWords()
	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		_ = RandomWords()
	}
}

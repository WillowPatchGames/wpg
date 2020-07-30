// +build gofuzz

package password

func Fuzz(data []byte) int {
	if len(data) < 4 {
		return -1
	}

	var obj *Scrypt = NewScrypt()

	err := obj.Unmarshal(data[4:])
	if err != nil {
		return 0
	}

	if obj.N > (1 << 8) {
		return -1
	}

	if obj.R > 8 {
		return -1
	}

	if obj.P > 8 {
		return -1
	}

	if obj.Len > 64 {
		return -1
	}

	_ = obj.Compare(data[0:4])

	return 1
}

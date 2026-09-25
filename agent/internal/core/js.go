// Package core is a Go port of the parts of packages/core the lock agent needs:
// weekly windows, task-gated status, focus sessions and computeBlocks.
//
// Snapshots arrive as JSON from the extension and are kept as generic values
// (map[string]any decoded with UseNumber) so that nothing the extension sends is
// lost when the agent stores and merges them. The helpers in this file reproduce
// the JavaScript comparison and truthiness rules the original code relies on, so
// the Go engine gives the same answers for the same snapshot. The golden tests in
// engine_test.go check that against the JavaScript engine.
package core

import (
	"encoding/json"
	"math"
	"strconv"
	"strings"
)

// Obj is a JSON object.
type Obj = map[string]any

type undefinedT struct{}

// Undefined stands for a missing property (JavaScript undefined).
var Undefined any = undefinedT{}

// IsUndefined reports whether v is Undefined.
func IsUndefined(v any) bool {
	_, ok := v.(undefinedT)
	return ok
}

// Get returns m[k], or Undefined when the key is missing or m is not an object.
func Get(v any, k string) any {
	m, ok := v.(Obj)
	if !ok {
		return Undefined
	}
	x, ok := m[k]
	if !ok {
		return Undefined
	}
	return x
}

// Arr returns v as a slice, or nil.
func Arr(v any) []any {
	a, _ := v.([]any)
	return a
}

// IsArray reports whether v is a JSON array.
func IsArray(v any) bool {
	_, ok := v.([]any)
	return ok
}

// Num converts like JavaScript's Number(): undefined is NaN, null is 0.
func Num(v any) float64 {
	switch x := v.(type) {
	case nil:
		return 0
	case undefinedT:
		return math.NaN()
	case json.Number:
		f, err := strconv.ParseFloat(string(x), 64)
		if err != nil {
			return math.NaN()
		}
		return f
	case float64:
		return x
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case bool:
		if x {
			return 1
		}
		return 0
	case string:
		s := strings.TrimSpace(x)
		if s == "" {
			return 0
		}
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return math.NaN()
		}
		return f
	default:
		return math.NaN()
	}
}

// IsNumber reports whether v is a JSON number.
func IsNumber(v any) bool {
	switch v.(type) {
	case json.Number, float64, int, int64:
		return true
	}
	return false
}

// IsInteger is Number.isInteger.
func IsInteger(v any) bool {
	if !IsNumber(v) {
		return false
	}
	f := Num(v)
	return !math.IsInf(f, 0) && !math.IsNaN(f) && f == math.Trunc(f)
}

// Truthy is JavaScript truthiness.
func Truthy(v any) bool {
	switch x := v.(type) {
	case nil, undefinedT:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case json.Number, float64, int, int64:
		f := Num(x)
		return f != 0 && !math.IsNaN(f)
	default:
		return true
	}
}

// StrictEq is === for JSON primitives (objects compare by identity in JS, so never equal here).
func StrictEq(a, b any) bool {
	switch x := a.(type) {
	case nil:
		return b == nil
	case undefinedT:
		_, ok := b.(undefinedT)
		return ok
	case string:
		y, ok := b.(string)
		return ok && x == y
	case bool:
		y, ok := b.(bool)
		return ok && x == y
	case json.Number, float64, int, int64:
		if !IsNumber(b) {
			return false
		}
		return Num(a) == Num(b)
	}
	return false
}

// Str is String(v) for the primitive cases the agent meets.
func Str(v any) string {
	switch x := v.(type) {
	case nil:
		return "null"
	case undefinedT:
		return "undefined"
	case string:
		return x
	case bool:
		if x {
			return "true"
		}
		return "false"
	case json.Number:
		return strconv.FormatFloat(Num(x), 'f', -1, 64)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	}
	b, _ := json.Marshal(v)
	return string(b)
}

// Lt is a < b with JavaScript number coercion (NaN compares false).
func Lt(a, b any) bool { return Num(a) < Num(b) }

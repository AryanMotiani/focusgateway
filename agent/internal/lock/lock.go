// Package lock handles snapshots for the agent. The extension sends its rules and
// the agent enforces them. A no-failsafe rule that is running right now can't be
// weakened by a sync: if it disappears or changes, the agent keeps enforcing the
// version it already had until that window ends.
package lock

import (
	"encoding/json"
	"fmt"
	"sort"

	"focusgateway/agent/internal/core"
)

// canon is JSON.stringify for comparing values the way lock.js does.
func canon(v any) string {
	switch x := v.(type) {
	case json.Number:
		b, _ := json.Marshal(core.Num(x))
		return string(b)
	case []any:
		s := "["
		for i, e := range x {
			if i > 0 {
				s += ","
			}
			s += canon(e)
		}
		return s + "]"
	case core.Obj:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		s := "{"
		for i, k := range keys {
			if i > 0 {
				s += ","
			}
			kb, _ := json.Marshal(k)
			s += string(kb) + ":" + canon(x[k])
		}
		return s + "}"
	}
	if core.IsUndefined(v) {
		return "null"
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func sortedIDs(v any) []any {
	ids := append([]any{}, core.Arr(v)...)
	sort.SliceStable(ids, func(i, j int) bool { return core.Str(ids[i]) < core.Str(ids[j]) })
	return ids
}

// same compares the parts of two rules that decide what gets blocked and when.
func same(a, b any) bool {
	key := func(r any) string {
		return canon([]any{core.Get(r, "days"), core.Get(r, "start"), core.Get(r, "end"), sortedIDs(core.Get(r, "siteIds")), core.Get(r, "failsafe"), core.Get(r, "mode")})
	}
	return key(a) == key(b)
}

// Validate returns a problem description, or "" when the snapshot is usable.
func Validate(s any) string {
	if _, ok := s.(core.Obj); !ok {
		if core.IsArray(s) {
			return "Snapshot.rules must be an array."
		}
		return "Snapshot must be an object."
	}
	for _, k := range []string{"rules", "tasks", "overrides", "customSites"} {
		if !core.IsArray(core.Get(s, k)) {
			return fmt.Sprintf("Snapshot.%s must be an array.", k)
		}
	}
	for _, r := range core.Arr(core.Get(s, "rules")) {
		mode := core.Get(r, "mode")
		if !core.Truthy(core.Get(r, "id")) || !(core.StrictEq(mode, "hard") || core.StrictEq(mode, "gated")) ||
			!core.IsArray(core.Get(r, "days")) || !core.IsArray(core.Get(r, "siteIds")) {
			return "Invalid rule in snapshot."
		}
		if !core.IsInteger(core.Get(r, "start")) || !core.IsInteger(core.Get(r, "end")) {
			return "Invalid rule times."
		}
	}
	return ""
}

// Merge applies incoming on top of previous, keeping every running no-failsafe rule
// from previous that incoming removed or changed. kept lists those rule ids.
func Merge(previous, incoming core.Obj, now int64) (merged core.Obj, kept []any) {
	kept = []any{}
	if previous == nil {
		return incoming, kept
	}
	rules := append([]any{}, core.Arr(incoming["rules"])...)
	customSites := append([]any{}, core.Arr(incoming["customSites"])...)
	for _, old := range core.Arr(core.Get(previous, "rules")) {
		if !core.IsLocked(old) || core.WindowAt(old, now) == nil {
			continue
		}
		idx := -1
		for i, r := range rules {
			if core.StrictEq(core.Get(r, "id"), core.Get(old, "id")) {
				idx = i
				break
			}
		}
		if idx == -1 {
			rules = append(rules, old)
		} else if same(rules[idx], old) {
			continue
		} else {
			rules[idx] = old
		}
		kept = append(kept, core.Get(old, "id"))
		for _, id := range core.Arr(core.Get(old, "siteIds")) {
			present := false
			for _, s := range customSites {
				if core.StrictEq(core.Get(s, "id"), id) {
					present = true
					break
				}
			}
			if present {
				continue
			}
			for _, s := range core.Arr(core.Get(previous, "customSites")) {
				if core.StrictEq(core.Get(s, "id"), id) {
					customSites = append(customSites, s)
					break
				}
			}
		}
	}
	merged = core.Obj{}
	for k, v := range incoming {
		merged[k] = v
	}
	merged["rules"] = rules
	merged["customSites"] = customSites
	return merged, kept
}

// LockedUntil is the latest end of a no-failsafe rule running at now, or 0 if none.
func LockedUntil(snapshot any, now int64) int64 {
	var until int64
	for _, r := range core.Arr(core.Get(snapshot, "rules")) {
		if !core.IsLocked(r) {
			continue
		}
		if w := core.WindowAt(r, now); w != nil && (until == 0 || w.End > until) {
			until = w.End
		}
	}
	return until
}

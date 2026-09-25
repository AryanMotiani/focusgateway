package lock

import (
	"encoding/json"
	"reflect"
	"strconv"
	"testing"
	"time"

	"focusgateway/agent/internal/core"
)

// Ported from the Node.js agent's test/agent.test.js ("lock merge").

func at(d, hh, mm int) int64 { return time.Date(2026, 9, d, hh, mm, 0, 0, time.Local).UnixMilli() }

func n(v int) json.Number { return json.Number(strconv.Itoa(v)) }

func rule(id string, failsafe bool) core.Obj {
	return core.Obj{"id": id, "name": "Night", "mode": "hard", "siteIds": []any{"youtube"}, "days": []any{n(1)}, "start": n(1260), "end": n(1380), "failsafe": failsafe}
}

func snap(rules ...any) core.Obj {
	if rules == nil {
		rules = []any{}
	}
	return core.Obj{"rules": rules, "tasks": []any{}, "overrides": []any{}, "customSites": []any{}, "focus": core.Obj{"active": nil}}
}

func ids(s core.Obj) []string {
	var out []string
	for _, r := range core.Arr(s["rules"]) {
		out = append(out, core.Str(core.Get(r, "id")))
	}
	return out
}

func TestKeepsRunningLockedRuleThatWasDeletedOrWeakened(t *testing.T) {
	locked, soft := rule("L", false), rule("S", true)
	prev := snap(locked, soft)
	deleted, _ := Merge(prev, snap(), at(21, 22, 0))
	if got := ids(deleted); !reflect.DeepEqual(got, []string{"L"}) {
		t.Fatalf("deleted: rules %v", got)
	}
	weaker := rule("L", false)
	weaker["end"] = n(1300)
	weakened, kept := Merge(prev, snap(weaker), at(21, 22, 0))
	if e := core.Num(core.Get(core.Arr(weakened["rules"])[0], "end")); e != 1380 {
		t.Fatalf("weakened: end %v, want 1380", e)
	}
	if !reflect.DeepEqual(kept, []any{"L"}) {
		t.Fatalf("kept %v", kept)
	}
}

func TestAcceptsChangesOnceTheWindowIsOver(t *testing.T) {
	r, kept := Merge(snap(rule("L", false)), snap(), at(21, 23, 30))
	if len(core.Arr(r["rules"])) != 0 || len(kept) != 0 {
		t.Fatalf("rules %v kept %v", r["rules"], kept)
	}
}

func TestUnchangedLockedRuleIsNotReportedAsKept(t *testing.T) {
	_, kept := Merge(snap(rule("L", false)), snap(rule("L", false)), at(21, 22, 0))
	if len(kept) != 0 {
		t.Fatalf("kept %v", kept)
	}
}

func TestKeepsCustomSitesOfKeptRules(t *testing.T) {
	l := rule("L", false)
	l["siteIds"] = []any{"mine"}
	prev := snap(l)
	prev["customSites"] = []any{core.Obj{"id": "mine", "domains": []any{"example.com"}}}
	merged, _ := Merge(prev, snap(), at(21, 22, 0))
	if len(core.Arr(merged["customSites"])) != 1 {
		t.Fatalf("custom site dropped: %v", merged["customSites"])
	}
}

func TestReportsHowLongTheLockLasts(t *testing.T) {
	if got := LockedUntil(snap(rule("L", false)), at(21, 22, 0)); got != at(21, 23, 0) {
		t.Fatalf("got %d want %d", got, at(21, 23, 0))
	}
	if got := LockedUntil(snap(rule("S", true)), at(21, 22, 0)); got != 0 {
		t.Fatalf("soft rule should not lock, got %d", got)
	}
}

func TestValidatesSnapshots(t *testing.T) {
	if p := Validate(snap(rule("L", false))); p != "" {
		t.Fatalf("valid snapshot rejected: %s", p)
	}
	if p := Validate(core.Obj{"rules": "x"}); p != "Snapshot.rules must be an array." {
		t.Fatalf("got %q", p)
	}
}

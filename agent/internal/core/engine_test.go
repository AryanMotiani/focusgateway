package core_test

import (
	"bytes"
	"encoding/json"
	"os"
	"reflect"
	"testing"
	"time"
	_ "time/tzdata" // the golden cases use America/New_York on every OS

	"focusgateway/agent/internal/core"
	"focusgateway/agent/internal/lock"
)

type golden struct {
	TZ     string `json:"tz"`
	Blocks []struct {
		Now         int64    `json:"now"`
		State       any      `json:"state"`
		Domains     []string `json:"domains"`
		LockedUntil *int64   `json:"lockedUntil"`
	} `json:"blocks"`
	Merges []struct {
		Now      int64    `json:"now"`
		Previous core.Obj `json:"previous"`
		Incoming core.Obj `json:"incoming"`
		Merged   any      `json:"merged"`
		Kept     []any    `json:"kept"`
	} `json:"merges"`
	Validation []struct {
		Snapshot any     `json:"snapshot"`
		Problem  *string `json:"problem"`
	} `json:"validation"`
}

// loadGolden reads cases produced by the JavaScript engine (scripts/gen-agent-golden.mjs)
// and switches the local zone to the one they were generated in.
func loadGolden(t *testing.T) golden {
	t.Helper()
	b, err := os.ReadFile("testdata/golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g golden
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	if err := d.Decode(&g); err != nil {
		t.Fatal(err)
	}
	loc, err := time.LoadLocation(g.TZ)
	if err != nil {
		t.Fatal(err)
	}
	old := time.Local
	time.Local = loc
	t.Cleanup(func() { time.Local = old })
	return g
}

// plain turns json.Number values into float64 so results can be compared deeply.
func plain(t *testing.T, v any) any {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestComputeBlocksMatchesJavaScript(t *testing.T) {
	g := loadGolden(t)
	if len(g.Blocks) < 100 {
		t.Fatalf("expected golden cases, got %d", len(g.Blocks))
	}
	nonEmpty := 0
	for i, c := range g.Blocks {
		got := core.ComputeBlocks(c.State, c.Now)
		want := c.Domains
		if want == nil {
			want = []string{}
		}
		if len(got) > 0 {
			nonEmpty++
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("case %d (now %s): got %v, want %v", i, time.UnixMilli(c.Now), got, want)
		}
		var wantUntil int64
		if c.LockedUntil != nil {
			wantUntil = *c.LockedUntil
		}
		if u := lock.LockedUntil(c.State, c.Now); u != wantUntil {
			t.Errorf("case %d lockedUntil: got %d, want %d", i, u, wantUntil)
		}
	}
	if nonEmpty == 0 {
		t.Fatal("no golden case blocks anything: the test would prove nothing")
	}
}

func TestMergeMatchesJavaScript(t *testing.T) {
	g := loadGolden(t)
	for i, c := range g.Merges {
		merged, kept := lock.Merge(c.Previous, c.Incoming, c.Now)
		if got, want := plain(t, merged), plain(t, c.Merged); !reflect.DeepEqual(got, want) {
			t.Errorf("merge case %d: snapshot differs\n got %v\nwant %v", i, got, want)
		}
		if got, want := plain(t, kept), plain(t, c.Kept); !reflect.DeepEqual(got, want) {
			t.Errorf("merge case %d: kept %v, want %v", i, got, want)
		}
	}
}

func TestValidateMatchesJavaScript(t *testing.T) {
	g := loadGolden(t)
	for i, c := range g.Validation {
		want := ""
		if c.Problem != nil {
			want = *c.Problem
		}
		if got := lock.Validate(c.Snapshot); got != want {
			t.Errorf("validation case %d: got %q, want %q", i, got, want)
		}
	}
}

func TestBundlesAreEmbedded(t *testing.T) {
	if len(core.Bundles()) < 10 {
		t.Fatal("embedded bundles.json looks empty")
	}
	d := core.DomainsForSites(core.Obj{}, []any{"youtube"})
	if len(d) == 0 || d[0] != "youtube.com" {
		t.Fatalf("youtube bundle: %v", d)
	}
}

func TestWindowsCrossMidnight(t *testing.T) {
	old := time.Local
	time.Local = time.UTC
	defer func() { time.Local = old }()
	// Monday 21 Sep 2026, 22:00 to 02:00
	rule := core.Obj{"days": []any{json.Number("1")}, "start": json.Number("1320"), "end": json.Number("120")}
	mon := time.Date(2026, 9, 21, 23, 0, 0, 0, time.UTC).UnixMilli()
	tue := time.Date(2026, 9, 22, 1, 30, 0, 0, time.UTC).UnixMilli()
	after := time.Date(2026, 9, 22, 2, 0, 0, 0, time.UTC).UnixMilli()
	if core.WindowAt(rule, mon) == nil || core.WindowAt(rule, tue) == nil {
		t.Fatal("window should cover late Monday and early Tuesday")
	}
	if core.WindowAt(rule, after) != nil {
		t.Fatal("window ends at 02:00")
	}
	// end == start means a full 24 hours
	full := core.Obj{"days": []any{json.Number("1")}, "start": json.Number("600"), "end": json.Number("600")}
	w := core.WindowAt(full, mon)
	if w == nil || w.End-w.Start != 24*3600*1000 {
		t.Fatalf("full-day window: %+v", w)
	}
}

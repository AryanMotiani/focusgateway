package core

import (
	"bytes"
	"encoding/json"
	"sort"
	"sync"

	"focusgateway/agent/internal/assets"
)

var (
	bundlesOnce sync.Once
	bundles     []any
)

// Bundles are the curated site bundles from packages/core/src/bundles.js
// (copied into internal/assets/bundles.json by scripts/sync-agent-bundles.mjs).
func Bundles() []any {
	bundlesOnce.Do(func() {
		var data struct {
			Bundles []any `json:"bundles"`
		}
		d := json.NewDecoder(bytes.NewReader(assets.BundlesJSON))
		d.UseNumber()
		if err := d.Decode(&data); err != nil {
			panic("embedded bundles.json is invalid: " + err.Error())
		}
		bundles = data.Bundles
	})
	return bundles
}

// IsLocked reports whether a rule is a hard block with no Failsafe (no escape hatch).
func IsLocked(rule any) bool {
	return StrictEq(Get(rule, "mode"), "hard") && StrictEq(Get(rule, "failsafe"), false)
}

func liveOverride(state any, ruleID any, now int64) bool {
	for _, o := range Arr(Get(state, "overrides")) {
		if StrictEq(Get(o, "ruleId"), ruleID) && Num(Get(o, "until")) > float64(now) {
			return true
		}
	}
	return false
}

// tasksForRule returns the top-level tasks attached to a task-gated rule.
func tasksForRule(state any, ruleID any) []any {
	var out []any
	for _, t := range Arr(Get(state, "tasks")) {
		if StrictEq(Get(t, "ruleId"), ruleID) && !Truthy(Get(t, "parentId")) {
			out = append(out, t)
		}
	}
	return out
}

// relevantTasks are the tasks that belong to the window w (see engine.js).
func relevantTasks(state, rule any, w *Window, prevEnd *int64, now int64) []any {
	var out []any
	for _, t := range tasksForRule(state, Get(rule, "id")) {
		startAt := Get(t, "startAt")
		if Truthy(startAt) && Num(startAt) >= float64(w.End) {
			continue
		}
		if StrictEq(Get(t, "status"), "done") && prevEnd != nil && Num(Get(t, "completedAt")) < float64(*prevEnd) {
			continue
		}
		fw := Get(t, "forwardedUntil")
		if Truthy(fw) && Num(fw) > float64(now) {
			continue
		}
		out = append(out, t)
	}
	return out
}

func pendingOf(tasks []any) []any {
	var out []any
	for _, t := range tasks {
		if !StrictEq(Get(t, "status"), "done") {
			out = append(out, t)
		}
	}
	return out
}

// GatedStatus is "blocked", "unlocked", "extended" or "inactive" for a task-gated rule.
func GatedStatus(state, rule any, now int64) (status string, pending []any) {
	if w := WindowAt(rule, now); w != nil {
		var prevEnd *int64
		if prev := PreviousWindow(rule, w.Start); prev != nil {
			prevEnd = &prev.End
		}
		rel := relevantTasks(state, rule, w, prevEnd, now)
		pending = pendingOf(rel)
		if len(rel) == 0 || len(pending) > 0 {
			return "blocked", pending
		}
		return "unlocked", pending
	}
	if last := PreviousWindow(rule, now); last != nil {
		var beforeEnd *int64
		if before := PreviousWindow(rule, last.Start); before != nil {
			beforeEnd = &before.End
		}
		var rel []any
		for _, t := range relevantTasks(state, rule, last, beforeEnd, now) {
			if Num(Get(t, "createdAt")) < float64(last.End) {
				rel = append(rel, t)
			}
		}
		if pending = pendingOf(rel); len(pending) > 0 {
			return "extended", pending
		}
	}
	return "inactive", nil
}

// FocusEndsAt is when a focus session ends (epoch ms, may be NaN for bad data).
func FocusEndsAt(f any) float64 {
	if e := Get(f, "endsAt"); Truthy(e) {
		return Num(e)
	}
	work, brk := Num(Get(f, "workMin")), Num(Get(f, "breakMin"))
	cycle := (work + brk) * 60_000
	return Num(Get(f, "startedAt")) + cycle*Num(Get(f, "iterations")) - brk*60_000
}

// DomainsForSites expands site ids (curated bundles first, then custom sites) into domains.
func DomainsForSites(state any, siteIDs any) []string {
	var out []string
	for _, id := range Arr(siteIDs) {
		var site any
		for _, b := range Bundles() {
			if StrictEq(Get(b, "id"), id) {
				site = b
				break
			}
		}
		if site == nil {
			for _, s := range Arr(Get(state, "customSites")) {
				if StrictEq(Get(s, "id"), id) {
					site = s
					break
				}
			}
		}
		for _, d := range Arr(Get(site, "domains")) {
			out = append(out, Str(d))
		}
	}
	return out
}

// ComputeBlocks returns the sorted set of domains blocked at now. It mirrors
// computeBlocks in packages/core/src/engine.js.
func ComputeBlocks(state any, now int64) []string {
	all := map[string]bool{}
	add := func(siteIDs any) {
		for _, d := range DomainsForSites(state, siteIDs) {
			all[d] = true
		}
	}
	for _, rule := range Arr(Get(state, "rules")) {
		switch {
		case StrictEq(Get(rule, "mode"), "hard"):
			if WindowAt(rule, now) == nil {
				continue
			}
			if !IsLocked(rule) && liveOverride(state, Get(rule, "id"), now) {
				continue
			}
			add(Get(rule, "siteIds"))
		case StrictEq(Get(rule, "mode"), "gated"):
			st, _ := GatedStatus(state, rule, now)
			if st != "blocked" && st != "extended" {
				continue
			}
			if liveOverride(state, Get(rule, "id"), now) {
				continue
			}
			add(Get(rule, "siteIds"))
		}
	}
	if f := Get(Get(state, "focus"), "active"); Truthy(f) {
		n := float64(now)
		if n >= Num(Get(f, "startedAt")) && n < FocusEndsAt(f) {
			add(Get(f, "siteIds"))
		}
	}
	out := make([]string, 0, len(all))
	for d := range all {
		out = append(out, d)
	}
	sort.Strings(out)
	return out
}

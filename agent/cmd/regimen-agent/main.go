// Command regimen-agent is the Regimen lock agent: one small binary that
// enforces your blocks system-wide through the hosts file and browser policies.
// Run it with no arguments to install, or see `regimen-agent help`.
package main

import (
	"os"
	// Embedded time zone data, so the agent reads the clock exactly like the browser
	// does even where the system zone database is missing or incomplete.
	_ "time/tzdata"

	"regimen/agent/internal/cli"
)

func main() {
	os.Exit(cli.Main(os.Args[1:]))
}

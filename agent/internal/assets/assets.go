// Package assets embeds the files the agent needs at run time, so it ships as a
// single binary. They are copies: edit the originals and run `npm run agent:bundles`.
package assets

import _ "embed"

// BundlesJSON is packages/core/src/bundles.js as JSON.
//
//go:embed bundles.json
var BundlesJSON []byte

// Troubleshooting is TROUBLESHOOTING.md, written next to the installed agent.
//
//go:embed TROUBLESHOOTING.md
var Troubleshooting []byte

// License is the MIT license text.
//
//go:embed LICENSE
var License []byte

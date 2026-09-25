package paths

// Config is config.json in the data folder. The field names match the files the
// earlier Node.js agent wrote, so upgrading keeps the pairing.
type Config struct {
	// PairCode is the one-time code printed by install and pair. Null once used.
	// It expires at PairExpiresAt (epoch ms), like the link code.
	PairCode      *string `json:"pairCode"`
	PairExpiresAt int64   `json:"pairExpiresAt,omitempty"`
	// LinkCode is a second one-time code that only travels inside the pairing link the
	// agent opens in the browser. It expires at LinkExpiresAt (epoch ms).
	LinkCode      *string `json:"linkCode,omitempty"`
	LinkExpiresAt int64   `json:"linkExpiresAt,omitempty"`
	// SecretHash is sha256(hex) of the secret the extension received when pairing.
	SecretHash        *string `json:"secretHash"`
	Strict            bool    `json:"strict"`
	ChromeExtensionID string  `json:"chromeExtensionId"`
	FirefoxXpiURL     string  `json:"firefoxXpiUrl"`
	InstalledAt       string  `json:"installedAt,omitempty"`
	PairedAt          string  `json:"pairedAt,omitempty"`
}

// ReadConfig returns the config and whether it exists.
func ReadConfig() (Config, bool) {
	var c Config
	ok := ReadJSON("config.json", &c)
	return c, ok
}

// Str returns a pointer to s, or nil for an empty string.
func Str(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Val dereferences a nullable string.
func Val(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

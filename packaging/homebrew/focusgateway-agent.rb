# Homebrew cask template for a tap (github.com/AryanMotiani/homebrew-focusgateway,
# file Casks/focusgateway-agent.rb). Replace version and sha256 (from the
# release's SHA256SUMS.txt) on every release. See packaging/README.md.
#
#   brew install --cask aryanmotiani/focusgateway/focusgateway-agent
cask "focusgateway-agent" do
  version "1.0.0"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/AryanMotiani/focusgateway/releases/download/v#{version}/FocusGateway.pkg"
  name "FocusGateway lock agent"
  desc "Makes FocusGateway site blocks apply to every browser and app"
  homepage "https://aryanmotiani.github.io/focusgateway/"

  depends_on macos: ">= :big_sur"

  pkg "FocusGateway.pkg"

  # The agent refuses to uninstall while a no-failsafe block is running.
  uninstall_preflight do
    system_command "/usr/local/bin/focusgateway-agent",
                   args: ["uninstall", "--yes"],
                   sudo: true
  end
  uninstall pkgutil: "app.focusgateway.agent"

  zap trash: "/Library/Application Support/FocusGateway"

  caveats <<~EOS
    The lock agent opens FocusGateway in your browser to pair with the extension.
    If it did not, run: sudo focusgateway-agent pair
  EOS
end

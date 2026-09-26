# Homebrew cask template for a tap (github.com/AryanMotiani/homebrew-regimen,
# file Casks/regimen-agent.rb). Replace version and sha256 (from the
# release's SHA256SUMS.txt) on every release. See packaging/README.md.
#
#   brew install --cask aryanmotiani/regimen/regimen-agent
cask "regimen-agent" do
  version "1.0.0"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"

  url "https://github.com/AryanMotiani/regimen/releases/download/v#{version}/Regimen.pkg"
  name "Regimen lock agent"
  desc "Makes Regimen site blocks apply to every browser and app"
  homepage "https://aryanmotiani.github.io/regimen/"

  depends_on macos: ">= :big_sur"

  pkg "Regimen.pkg"

  # The agent refuses to uninstall while a no-failsafe block is running.
  uninstall_preflight do
    system_command "/usr/local/bin/regimen-agent",
                   args: ["uninstall", "--yes", "--no-pause"],
                   sudo: true
  end
  uninstall pkgutil: "app.regimen.agent"

  zap trash: "/Library/Application Support/Regimen"

  caveats <<~EOS
    The lock agent opens Regimen in your browser to pair with the extension.
    If it did not, run: sudo regimen-agent pair
  EOS
end

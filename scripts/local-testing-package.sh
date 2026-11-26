#!/usr/bin/env bash
# Tests the npm package of Blyss as its users get it: packs it, then builds websites with the packed tarball.
#
# Usage, from the root of the Blyss repository:
#   scripts/local-testing-package.sh                         Test A only
#   scripts/local-testing-package.sh ../my-website           Test A and Test B
#
#   Test A  creates a throwaway website with `blyss init` and builds it.
#   Test B  (only with a path) builds a copy of an existing Blyss website; the website itself is left untouched.
#
# Needs: Bash, Node.js 24 or newer (with npm, which comes with Node.js), and an internet connection, because npm
# downloads the dependencies of Blyss. It prints "ok: ..." for each check and stops at the first "FAILED: ...".
#
# Terms used below:
#   npm           the package manager of Node.js; it installs packages into a folder named node_modules/.
#   package       code published on npmjs.com, here @blooniverse/blyss.
#   tarball       the package as a single .tgz file: exactly what npm would upload to npmjs.com.
#   package.json  a project's manifest: its name, version, dependencies and commands.
#
# Where the temporary files go: into $BLYSS_TEST_DIR, if set; else into the system's temporary folder, unless
# programs may not run there (a "noexec" mount, as in some containers), then into ~/.cache. Either way, the folder
# is removed when the script ends, also after a failure.

# Stop at the first failing command, at an unset variable, and at a failure inside a pipe (cmd1 | cmd2).
set -euo pipefail

# Runs a check, such as `test -f file` (does the file exist?), and reports it; stops the script if it fails.
check() {
  "$@" || { printf 'FAILED: %s\n' "$*" >&2; exit 1; }
  printf 'ok: %s\n' "$*"
}

# Whether programs may run from a folder. npm starts Blyss from node_modules/.bin/ inside the website, so that
# folder must allow it. The check writes a tiny script into the folder and tries to run it.
executable_dir() {
  local probe status=0
  probe="$(mktemp "$1/blyss-probe.XXXXXX")" || return 1
  printf '#!/bin/sh\n' > "$probe"
  chmod +x "$probe"
  "$probe" 2>/dev/null || status=$?
  rm -f "$probe"
  return $status
}

# The Blyss repository: the folder above this script's folder, wherever it was cloned to.
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The optional existing website, as an absolute path; it must be a Blyss website, so it needs a blyss.config.js.
website=""
if [ $# -gt 1 ]; then
  printf 'Usage: %s [path/to/existing/website]\n' "$0" >&2
  exit 2
elif [ $# -eq 1 ]; then
  website="$(cd "$1" && pwd)"
  check test -f "$website/blyss.config.js"
fi

# Create the temporary ("scratch") folder, and remove it when the script exits for any reason (trap ... EXIT).
base="${BLYSS_TEST_DIR:-${TMPDIR:-/tmp}}"
base="${base%/}"
if [ -z "${BLYSS_TEST_DIR:-}" ] && ! executable_dir "$base"; then
  base="${XDG_CACHE_HOME:-$HOME/.cache}"
  mkdir -p "$base"
fi
scratch="$(mktemp -d "$base/blyss-test.XXXXXX")"
trap 'rm -rf "$scratch"' EXIT
printf 'Scratch directory: %s\n' "$scratch"

# Build, test and pack Blyss.
#   npm ci    installs exactly the dependency versions recorded in package-lock.json, after deleting node_modules/.
#   npm test  builds the starter website and runs the test suite (see "scripts" in package.json).
#   npm pack  writes the tarball and prints its file name.
cd "$repo"
npm ci
npm test
tarball="$scratch/$(npm pack --silent --pack-destination "$scratch")"
printf 'Package tarball: %s\n' "$tarball"

# Installs the tarball into the website in the current folder, builds the website and checks the result.
#   npm install <tarball>   installs Blyss from the tarball instead of from npmjs.com, as if it had been published.
#                           --no-save and --package-lock=false leave package.json and package-lock.json unchanged.
#   npx --no-install blyss  runs the `blyss` command of the Blyss just installed. Two different tools, despite
#                           the similar names: npm installs packages, npx runs a command that a package provides.
#                           --no-install forbids npx to download anything: without it, npx could fetch "blyss"
#                           from npmjs.com, an unrelated package with the same short name.
#                        ‼️ Why not `npm run build`, as users do? That runs whatever "build" means in the website's
#                           package.json: in the starter it is just `blyss build`, but an existing website may
#                           add steps of its own, or have no "build" at all. npx runs Blyss itself, nothing else.
# The checks: Blyss is a real copy from the tarball (test ! -L: not a link to this repository), and the build
# made no public/index.html, which Blyss must never create (the server redirects / to a language instead).
install_and_build() {
  npm install --no-save --package-lock=false "$tarball"
  npx --no-install blyss build
  check test -f node_modules/@blooniverse/blyss/package.json
  check test ! -L node_modules/@blooniverse/blyss
  check test ! -e public/index.html
}

# Test A: a throwaway website created by `blyss init`, the way a new user starts.
#   npm exec --package=<tarball> -- blyss init site   runs `blyss init site` from the tarball without installing it,
#                                                     like `npx @blooniverse/blyss init site` after publishing.
cd "$scratch"
npm exec --yes --package="$tarball" -- blyss init site
cd site
install_and_build
check test -f .gitignore
check test -f public/en/index.html
check test -f public/de/index.html
check test -f public/sitemap.xml
printf 'Test A passed: throwaway website from blyss init.\n'

# Test B: a copy of an existing website. tar copies it without node_modules/ (installed packages), public/ (the
# generated website) and .git/ (its history), so that the real website stays exactly as it was.
if [ -n "$website" ]; then
  mkdir "$scratch/existing"
  (cd "$website" && tar -cf - --exclude=./node_modules --exclude=./public --exclude=./.git .) |
    (cd "$scratch/existing" && tar -xf -)
  cd "$scratch/existing"
  install_and_build
  check test -n "$(find public -type f -print -quit)"
  printf 'Test B passed: copy of %s.\n' "$website"
fi

printf 'Blyss package tests passed.\n'

# Root may read every file, so `npm test` skips its tests of unreadable files when run as root (as in some
# containers). Normal users and the CI workflow run them.
if [ "$(id -u)" -eq 0 ]; then
  printf 'Note: running as root, so npm test skipped its tests of unreadable files; CI runs them.\n'
fi

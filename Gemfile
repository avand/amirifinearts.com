# frozen_string_literal: true

source "https://rubygems.org"

# Built by GitHub's classic Pages builder, which does not read this file -- it
# builds with its own fixed set of gem versions, published at
# https://pages.github.com/versions.json. The `github-pages` gem is that same
# set expressed as a dependency, so a local `bundle exec jekyll build` runs the
# Jekyll, kramdown, and Liquid that production runs.
#
# `gem install jekyll` gets Jekyll 4; Pages is still on 3.10. Close enough to
# look fine, far enough apart to render differently.
#
# Bump this when GitHub bumps theirs; the Ruby they build on is in that same
# versions.json, and mise.toml tracks it.
gem "github-pages", "~> 232", group: :jekyll_plugins

# Not part of the Pages gem set and not needed to build. Octokit reaches for
# Faraday's retry middleware, which moved out of Faraday in v2, and without it
# every local build opens with a warning about a gem this site does not use.
gem "faraday-retry", group: :jekyll_plugins

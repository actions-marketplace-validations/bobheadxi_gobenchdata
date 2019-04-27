workflow "Benchmark Demo" {
  on = "push"
  resolves = ["gobenchdata to gh-pages"]
}

action "filter" {
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "gobenchdata to gh-pages" {
  uses = "./actions/ghpages"
  needs = ["filter"]
  secrets = ["GITHUB_TOKEN"]
}
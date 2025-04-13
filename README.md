<div align="center">
  <h3 align="center">Rulesets</h3>

  <p align="center">
    Automate PR workflows, enforce standards, and streamline reviews with Rulesets.
    <br />
    <a href="https://docs.rulesets.dev"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/wizenheimer/rulesets/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/wizenheimer/rulesets/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</div>

<img src="media/banner.png" alt="Rulesets Banner" />

**Rulesets** is a GitHub App to help teams enforce pull request standards and automate PR workflows. Define rules using a simple YAML file to automatically validate and take action on PRs based on your team's conventions.

## Features

- **Flexible Configuration** – Define rules using intuitive YAML syntax
- **Event-Driven** – Trigger on `pull_request` events like open, edit, and sync
- **Conditional Logic** – Apply rules only under specific conditions
- **Powerful Validations** – Check PR title, description, branch, file size, and more
- **Automated Actions** – Add labels, comment, assign reviewers, and more
- **Template Support** – Use variables in messages and comments

## How It Works

1. **Install** the Rulesets GitHub App on your repository.
2. **Create a config file**: `.github/Ruleset.yml`
3. **Define your rules**: use events, conditions, validations, and actions
4. Rules are **automatically applied** to pull requests when triggered

## Example Configuration

```yaml
ruleset:
  - name: "Conventional Commit Format"
    when:
      - "pull_request.opened"
      - "pull_request.edited"
    validate:
      - type: "title"
        match: "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(\\w+\\))?: .+"
        message: "PR title must follow conventional commit format"
    on_success:
      - label:
          add: ["conventional-format"]
    on_failure:
      - comment:
          body: "Please follow the conventional commit format for your PR title"
```

This example enforces Conventional Commit formats for PR titles, adds a label if valid, and comments if invalid.

## Quickstart

1. Install the GitHub App
2. Add a `.github/Ruleset.yml` file:

```yaml
ruleset:
  - name: "Basic PR Validation"
    when:
      - "pull_request.opened"
      - "pull_request.edited"
    validate:
      - type: "title"
        length:
          min: 10
        message: "PR title must be at least 10 characters"
      - type: "description"
        no_empty: true
        message: "PR description cannot be empty"
    on_success:
      - label:
          add: ["valid-pr"]
    on_failure:
      - comment:
          body: |
            Thanks for your contribution! Please ensure your PR meets our guidelines:

            - PR title should be descriptive and at least 10 characters
            - PR description should not be empty

            {{ validation_summary }}
```

## Common Use Cases

### Enforce Conventional Commits

```yaml
ruleset:
  - name: "Conventional Commits"
    when:
      - "pull_request.opened"
      - "pull_request.edited"
    validate:
      - type: "title"
        match: "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(\\w+\\))?: .+"
    on_failure:
      - comment:
          body: "Please follow the conventional commit format for your PR title"
```

### PR Size Limits

```yaml
ruleset:
  - name: "PR Size Limit"
    when:
      - "pull_request.opened"
      - "pull_request.synchronize"
    validate:
      - type: "size"
        files: 10
        total: 500
    on_failure:
      - label:
          add: ["large-pr"]
```

### Auto-Assign Reviewers

```yaml
ruleset:
  - name: "Auto Assign Reviewers"
    when:
      - "pull_request.opened"
    on_success:
      - requestReview:
          reviewers: ["username1", "username2"]
          teams: ["team-name"]
```

### Branch Naming Convention

```yaml
ruleset:
  - name: "Branch Naming"
    when:
      - "pull_request.opened"
    validate:
      - type: "branch"
        head:
          match: "^(feature|bugfix|hotfix)/[a-z0-9-_]+"
    on_failure:
      - comment:
          body: "Branch names should follow pattern: type/description"
```

## Documentation

- [Rules Syntax](https://docs.rulesets.dev/rules)
- [Available Validators](https://docs.rulesets.dev/validations)
- [Supported Actions](https://docs.rulesets.dev/actions)
- [More Examples](https://docs.rulesets.dev/examples)

---

## Benefits

- **Consistent PR Quality**: Enforce standards across the board
- **Automated Checks**: Reduce manual review overhead
- **Faster Reviews**: Focus on code, not checklists
- **Onboarding Made Easy**: New contributors learn standards fast
- **Customizable**: Tailor rules to your team's needs

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

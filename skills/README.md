# Hive agent skills

Agent skills that teach coding agents how to use GraphQL Hive. They follow the
[Agent Skills](https://skills.sh) format: each skill is a folder with a `SKILL.md` and optional
`references/`.

| Skill                  | Use it for                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| [`hive-ci`](./hive-ci) | Setting up Hive schema checks and publishing in CI/CD, on GitHub Actions or any other CI system. |

## Install

```sh
npx skills add graphql-hive/console --skill hive-ci
```

The skills link to the Hive documentation instead of copying it, so an agent always reads the
current CLI commands, error codes and CI/CD guide.

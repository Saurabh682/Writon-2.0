# 📦 External Agent & Skills Catalog Reference

> **Catalog Source**: [wshobson/agents (GitHub)](https://github.com/wshobson/agents)  
> **Last Indexed**: 2026-09-26  
> **Purpose**: A reference index of available plugins, agents, and skills from the multi-harness marketplace to pluck individually on demand without bloating the local environment.

---

## 🧭 How to Install Individual Skills On Demand

To add any specific skill to your local environment without installing the entire repository:

```bash
# Using npx skills (Direct from GitHub into current agent harness)
npx skills add wshobson/agents --skill <skill-name>

# Or using the GitHub CLI skill extension:
gh skill install wshobson/agents <skill-name>
```

---

## 🗂️ Catalog Index

### 1. Backend & API Engineering
| Plugin | Agents | Key Skills Available |
| :--- | :--- | :--- |
| `python-development` | `python-pro`, `django-pro`, `fastapi-pro` | `python-async-patterns`, `pydantic-v2-guide`, `sqlalchemy-2-patterns`, `pytest-fixtures-patterns` |
| `typescript-development` | `typescript-pro` | `ts-advanced-types`, `ts-morph-patterns`, `type-level-programming` |
| `nodejs-development` | `nodejs-architect` | `nodejs-stream-pipelines`, `fastify-plugins`, `worker-threads-patterns` |
| `go-development` | `golang-pro` | `go-concurrency-patterns`, `go-memory-profiling`, `go-interfaces-design` |
| `rust-development` | `rust-pro` | `rust-tokio-runtime`, `rust-lifetimes-guide`, `rust-unsafe-guidelines` |

### 2. Databases & Storage
| Plugin | Agents | Key Skills Available |
| :--- | :--- | :--- |
| `postgresql` | `postgres-architect` | `postgres-query-tuning`, `pgvector-indexing`, `postgres-partitioning` |
| `redis` | `redis-architect` | `redis-caching-patterns`, `redis-streams-pipelines`, `redis-distributed-locking` |
| `database-migrations` | `db-migration-reviewer` | `zero-downtime-migrations`, `schema-rollback-patterns` |

### 3. Frontend & Mobile
| Plugin | Agents | Key Skills Available |
| :--- | :--- | :--- |
| `react-development` | `react-architect` | `react-compiler-patterns`, `tanstack-query-v5`, `zustand-architecture` |
| `nextjs-development` | `nextjs-pro` | `next15-app-router`, `server-actions-best-practices`, `next-caching-deep-dive` |
| `mobile-development` | `mobile-developer` | `expo-sdk-patterns`, `react-native-reanimated`, `offline-first-mobile-sync` |
| `ui-ux-engineering` | `design-systems-lead` | `tailwind-v4-tokens`, `radix-primitives-a11y`, `framer-motion-patterns` |

### 4. DevOps, Cloud & Infrastructure
| Plugin | Agents | Key Skills Available |
| :--- | :--- | :--- |
| `docker-development` | `docker-specialist` | `multi-stage-docker-builds`, `rootless-docker-hardening` |
| `kubernetes` | `k8s-operator` | `helm-chart-patterns`, `k8s-pod-disruption-budgets`, `istio-service-mesh` |
| `terraform` | `iac-architect` | `terraform-module-design`, `terragrunt-dry-patterns` |
| `aws` / `gcp` | `cloud-architect` | `cloud-run-serverless`, `iam-least-privilege`, `s3-lifecycle-rules` |

### 5. Security & Testing
| Plugin | Agents | Key Skills Available |
| :--- | :--- | :--- |
| `security-auditing` | `security-reviewer` | `owasp-top-10-audit`, `jwt-secure-implementation`, `cors-csrf-hardening` |
| `e2e-testing` | `test-architect` | `playwright-parallel-sharding`, `playwright-visual-comparisons` |
| `performance-tuning` | `performance-engineer` | `node-flamegraphs-profiling`, `web-vitals-inp-lcp-optimization` |

---

## 📌 Usage Policy in This Codebase
- **Default Rule**: Do not bulk install. 
- **Selective Retrieval**: When a task touches an unfamiliar library or deep domain not covered by the current tools, pull only that single skill or inspect its markdown specification.

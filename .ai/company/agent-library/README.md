# Mr. Backlog Agent Library

Dit is de centrale agent library voor alle Mr. Backlog projecten. Deze agents vormen de **standaard** voor hoe AI-assistenten samenwerken in onze projecten.

## 🎯 Filosofie

Deze agents zijn ontworpen volgens de **"Iron Dome"** principes:

- ✅ Kwaliteit boven snelheid
- ✅ Type safety in alle lagen
- ✅ Validation op elke grens
- ✅ Testing is verplicht
- ✅ Documentatie is deliverable

## 📚 Agent Categorieën

### Core Agents (Altijd beschikbaar)

Deze agents zijn in **elk project** beschikbaar:

| Agent                | Rol                           | Wanneer gebruiken                                            |
| -------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Orchestrator**     | Coördinator van alle agents   | Bij complete feature implementatie (User Story → Production) |
| **Architect**        | System design & DDD structuur | Bij nieuwe features, refactoring, tech beslissingen          |
| **Business Analyst** | Requirements & User Stories   | Bij onduidelijke requirements, nieuwe features               |
| **Data Engineer**    | Backend V2 (Python/FastAPI)   | Bij backend werk, data modeling, API's                       |
| **Frontend Dev**     | React/TypeScript UI           | Bij frontend werk, UI components, forms                      |
| **Fullstack Dev**    | End-to-end vertical slices    | Bij simpele CRUD features, integration work                  |
| **QA Specialist**    | Testing & quality assurance   | Bij bugs, edge cases, voor deployment                        |

### Specialized Agents (Op aanvraag)

Deze agents zijn **optioneel** en project-specifiek:

| Agent                   | Rol                                   | Wanneer gebruiken                                |
| ----------------------- | ------------------------------------- | ------------------------------------------------ |
| **PIM Specialist**      | Product Information Management expert | Bij catalog features, product data modeling      |
| **E-commerce Expert**   | E-commerce patterns & best practices  | Bij checkout flows, inventory, pricing           |
| **Database Specialist** | Database, Auth & Security expert      | Bij RLS policies, Auth flows, Query optimization |
| **DevOps Engineer**     | CI/CD, Docker, deployments            | Bij infrastructure, deployment issues            |
| **Security Specialist** | Security reviews & compliance         | Bij auth features, data privacy, APIs            |

## 🚀 Gebruik in Projecten

### Optie A: Direct gebruik (Default)

Refereer in je `.antigravity/config.json`:

```json
{
  "agentContext": {
    "companyAgents": ".ai/company/agent-library/core/"
  },
  "agents": {
    "orchestrator": {
      "file": ".ai/company/agent-library/core/ORCHESTRATOR.md"
    }
  }
}
```

## 🔄 Updates & Versioning

Agents in deze library volgen semantic versioning:

```text
.ai/company/agent-library/
├── core/
│   └── ORCHESTRATOR.md  # @version 2.1.0
```

**Update strategie:**

1. **Patch (2.1.0 → 2.1.1):** Bug fixes, typo's
   - Auto-update in alle projecten ✅
2. **Minor (2.1.0 → 2.2.0):** Nieuwe features, backwards compatible
   - Review & test in 1 project
   - Rollout naar andere projecten
3. **Major (2.0.0 → 3.0.0):** Breaking changes
   - Test uitgebreid
   - Update projecten individueel
   - Mogelijk project-specifieke overrides nodig

## 📝 Contributing

Bij verbeteren van agents:

1. Test eerst in een project
2. Documenteer de wijziging
3. Update version in agent file
4. Commit met beschrijving
5. Communiceer naar andere projecten

## 🎯 Best Practices

**DO's ✅**

- Gebruik Orchestrator voor complete features
- Laat agents hun specialisme doen
- Vertrouw op quality gates
- Documenteer afwijkingen
- Voor parallel work: zie [WORKTREE_PLAYBOOK.md](../../project/WORKTREE_PLAYBOOK.md)

**DON'Ts ❌**

- Niet alle agents tegelijk gebruiken voor kleine tasks
- Niet agents aanpassen zonder testing
- Niet quality gates skippen "omdat het haast heeft"
- Niet verschillende versies door elkaar gebruiken

## 📞 Support

Vragen over agents? Check:

- Deze README
- Specifieke agent documentation
- `.ai/company/AGENT_TASKING_PROTOCOL.md`
- Quality rules in `QUALITY_RULES.md`

# Project Goals (North Star)

This document defines the strategic vision for the DataBiz platform.
Every technical decision and feature slice must align with these goals.

## 1. Core Mission

To be the ultimate **Branch-Specific AI-Driven ETL & PIM** for the B2B Workwear industry.
We transform raw, chaotic **Supplier Source Information** into **Usable, Standardized Data** to create a competitive operational advantage.

## 2. Competitive Advantage (The "Why")

Our value proposition is built on three pillars that directly impact the bottom line:

### A. Speed of Execution

- **Goal**: Drastically reduce the "Time-to-Market" for new products.
- **Metric**: Process and publish complex supplier catalogs in **minutes**, not days.
- **Impact**: Be the first to offer new collections to customers.

### B. Margin Control

- **Goal**: Intelligent pricing and cost management.
- **Metric**: Real-time visibility into purchase prices vs. sales prices across all variants.
- **Impact**: Better steering on margins per product/category, preventing "blind spots" in profitability.

### C. Cost Reduction via Automation

- **Goal**: Eliminate manual data entry and "copy-paste" errors.
- **Metric**: Zero manual touchpoints for standard data updates.
- **Impact**: Lower operational costs by automating the flow of data to downstream systems.

## 3. Integration Ecosystem (The "Flow")

DataBiz is not an island; it is the **Central Nervous System** that feeds critical data to:

1.  **Sales Channels**: Webshops, Marketplaces, B2B Portals (Rich content, correct stock/price).
2.  **Financial Systems**: ERP, Invoicing (Accurate purchase data, ledger codes).
3.  **Logistics**: WMS, Shipping (Dimensions, weights, customs codes).

## 4. Technical Enablers (The "How")

To achieve the business goals above, the system relies on:

- **Hybrid Architecture**: Python (V2) for heavy data processing/AI, Node.js (V1) for fast API interactions.
- **Iron Dome Reliability**: Strict validation ensures that _only_ clean, standardized data enters the downstream systems. Bad data stops here.
- **AI-Driven Intelligence**: Using LLMs to understand messy supplier data (mapping, categorization) so humans don't have to.

## 5. Agent Collaboration Goals

### Vision

AI agents work as an autonomous development team, taking User Stories from the Product Owner and delivering production-ready slices with minimal human intervention.

### Success Criteria

- ✅ Agents can complete a simple CRUD slice independently (DB → API → UI → Tests)
- ✅ Quality gates prevent broken handoffs
- ✅ Product Owner only needed for business decisions and final acceptance
- ✅ Clear audit trail of agent activities per slice

### Phases

1. **Phase 1** (Current): Individual agents can perform their specialized tasks
2. **Phase 2** (Target): Orchestrator coordinates multi-agent slice completion
3. **Phase 3** (Future): Agents proactively suggest improvements and optimizations

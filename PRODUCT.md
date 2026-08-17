# Reqcore — Product Vision & Current Direction

> Last verified: 2026-08-16 against Reqcore 1.6.0 and the current unreleased work.

## The Applicant Intelligence Layer for High-Volume Hiring

Reqcore is an open-core Applicant Tracking System (ATS) for organizations that receive more applications than their team can review reliably. It reads the whole applicant pool, evaluates each application against recruiter-controlled criteria, and turns the pile into a trustworthy shortlist with visible evidence behind every score.

Reqcore can run the full hiring workflow, from publishing a role through hiring. Its go-to-market wedge is narrower: help a team evaluate one existing applicant pile without first forcing an ATS migration. The immediate outcome is a defensible shortlist; the broader ATS becomes valuable once the team wants to keep sourcing, review, communication, and interviews in the same system.

AI supports triage and comparison. It does not make the hiring decision.

## Problem Statement

Modern recruiting workflows have five structural problems:

1. **Applicant overload**: Easy Apply and AI-generated mass applications mean a role can attract hundreds or thousands of applicants. Most systems store the pile but still leave a recruiter to work through it manually.
2. **Arrival-order bias**: Under pressure, teams often review the first manageable batch rather than the entire pool. Strong candidates who applied later may never be considered.
3. **Opaque automation**: A match percentage without criteria, evidence, confidence, or gaps cannot be meaningfully checked. It creates trust, governance, and compliance risk.
4. **High switching costs**: A team should be able to prove the value of better screening on one role before migrating its hiring operation or waiting weeks for a new role to collect applicants.
5. **Pricing that punishes adoption**: Per-seat and per-applicant pricing makes it more expensive to involve hiring managers or process the full applicant pool.

## Product Promise

### 1. Review the Whole Pile

Reqcore is designed to evaluate every usable application against the same role-specific rubric, whether the role has 40 applicants or 4,000. Unlimited applicants are included on every hosted plan.

### 2. Show the Reasoning

Every AI analysis produces a composite score and a per-criterion breakdown with evidence, confidence, strengths, and gaps. Recruiters control the criteria, weights, evidence sources, provider, and whether scoring runs automatically. Results remain reviewable and can be overridden by the hiring team.

### 3. Deliver Value Before Migration

Teams can import candidates, attach them to a role, score the pool, and inspect a shortlist without replacing their current ATS first. The product should keep reducing the work required to bring in a closed or active role and prove value in minutes.

### 4. Price by Hiring Activity, Not Headcount

Hosted plans scale by simultaneously open roles, not seats or applicant volume. Organizations can invite the people needed to make a decision without increasing the bill.

### 5. Keep the Core Verifiable

The complete intake, pipeline, parsing, scoring, and shortlist workflow is AGPLv3-licensed and self-hostable. The scoring path does not depend on proprietary code, so evaluators and self-hosters can inspect how candidate data is handled and how ranking works.

## Target Market

The primary market is organizations with continuously open or repeatedly high-volume roles. Staffing and recruitment agencies are the initial beachhead because they are easy to identify, already have applicant piles, and can validate a shortlist against roles they have filled.

| Persona | Description | Primary need |
|---|---|---|
| **Recruiter / Sourcer** | Reviews large applicant pools and moves candidates through the process | Find strong candidates across the whole pool without losing the evidence behind the ranking |
| **Agency Owner / Recruiting Lead** | Runs several recruiters, clients, and active roles | Increase review consistency and placement throughput without adding seat costs |
| **Hiring Manager** | Compares shortlisted candidates and makes the hiring decision | Clear comparisons, supporting evidence, and process visibility |
| **HR / Operations Administrator** | Owns access, settings, privacy, and compliance | Tenant isolation, permissions, retention controls, and auditable activity |

### Best fit

- Staffing and recruitment agencies handling recurring applicant volume
- BPOs and call centers, healthcare and home-care staffing, warehousing and logistics, multi-site retail and hospitality, and franchise groups
- In-house teams with permanently open roles or recurring high-volume hiring
- Any organization with a role whose applicant volume exceeds its realistic review capacity

### Not the focus

- Micro-businesses hiring one or two people a year
- Teams that need payroll, timesheets, workforce management, or a broad HRIS before they need applicant review
- Enterprise buyers that require a large integration and services suite before they can test the core screening workflow
- Fully autonomous hiring decisions without accountable human review

## Current Product

### Applicant Intake and Job Distribution

- [x] Job creation and management with draft → open → closed → archived lifecycle
- [x] Structured location, compensation, remote-work, experience-level, and publication data
- [x] Public job board and configurable branded career pages
- [x] Custom application forms with nine field types, required documents, and candidate-facing confirmation
- [x] Public application intake with candidate deduplication, secure document upload, abuse protection, and source attribution
- [x] Search-friendly job pages with `JobPosting` structured data, sitemap support, and an XML job-board feed
- [x] Trackable campaign links, source reporting, and AI-generated multilingual social share copy
- [x] CSV candidate import with mapping and review, plus PDF/DOC/DOCX drag-and-drop candidate creation
- [x] Ordered application rules that route candidates from objective screening answers

### Review, Pipeline, and Shortlisting

- [x] Organization-wide candidate pool and application tracking per job
- [x] List, drawer, and Kanban pipeline views across new → screening → interview → offer → hired/rejected
- [x] Search, filters, configurable columns, custom candidate/application properties, and saved views
- [x] Per-recruiter application read receipts and dashboard queues for applicants that actually need attention
- [x] Private S3-compatible document storage with authenticated preview and download
- [x] PDF, DOC, and DOCX resume parsing with reparsing and failure handling
- [x] Recruiter-defined or AI-generated scoring criteria with configurable weights
- [x] Manual, bulk, and automatic-on-apply AI analysis
- [x] Visible composite and per-criterion scores with evidence, confidence, strengths, gaps, provider, model, and latest-run metadata
- [x] Managed platform AI plus organization-level provider configuration and bring-your-own-key support for OpenAI-compatible, Anthropic, Google, and local providers
- [x] An org- or job-scoped AI recruiting assistant that can inspect jobs, applicants, resumes, interviews, comments, and scores without bypassing tenant or job scope

### Collaboration and Candidate Communication

- [x] Multi-member organizations with owner, admin, and member permissions
- [x] Invitations, reusable invite links, organization discovery, and join-request approval
- [x] Team comments on candidates, applications, and jobs
- [x] Candidate and organization activity timelines, including system-generated status changes
- [x] Interview scheduling for video, phone, in-person, technical, panel, and take-home formats
- [x] Candidate-facing interview email, ICS calendar updates, confirmation/reschedule/decline actions, and delivery retry state
- [x] Optional Google Calendar synchronization
- [x] Email templates, recruiter notification preferences, instant/digest delivery, bounce handling, and lifecycle email hooks
- [x] Two-way candidate conversations and a hosted candidate inbox

### Operations, Privacy, and Security

- [x] Multi-tenant data isolation and centralized role-based authorization
- [x] Email/password authentication, verification and recovery, social sign-in, session controls, and enterprise OIDC SSO
- [x] Stripe billing, active-role limits, AI usage budgets, and in-product usage meters
- [x] Localized routes and interface support for English, Spanish, French, German, Norwegian Bokmål, and Vietnamese, with some translations still partial
- [x] GDPR-oriented candidate export, correction, quarantine, restoration, retention windows, legal holds, and permanent erasure of database and object-storage data
- [x] Private object storage, filename and MIME validation, server-proxied documents, nonce-based CSP, security headers, and endpoint rate limiting
- [x] Docker Compose self-hosting with automatic migrations, demo data, backup/update tooling, and a pre-built container image
- [x] Unit, security, and Playwright critical-flow test coverage with CI validation

## Open-Core Boundary

The repository uses an open-core model:

- **AGPLv3 core**: jobs, candidates, applications, pipeline, documents, public job and application pages, career-page foundation, resume parsing, scoring criteria, AI analysis, matching evidence, the assistant, interviews, privacy tooling, and the underlying activity/source data.
- **Commercial `ee/` layer**: paid hosted surfaces currently include candidate-conversation delivery, the standalone inbox and attachments, organization-wide audit-log access, source and AI analytics endpoints, and organization SSO management.

The intake, scoring, and shortlist path does not depend on `ee/`; candidate messaging and interview-email delivery do cross that boundary. Self-hosting is a best-effort, unsupported deployment path; hosted support and uptime commitments apply only to Reqcore Cloud. Runtime plan gates still apply where configured. See [SELF-HOSTING.md](SELF-HOSTING.md) and [`ee/README.md`](ee/README.md).

## Hosted Pricing Model

Every plan includes unlimited applicants, hires, and team members. Plans scale with open roles and capability:

| Plan | Monthly price | Open-role limit | Product boundary |
|---|---:|---:|---|
| **Free** | $0 | 1 | Core workflow plus bounded first-shortlist, assistant, and candidate-conversation allowances |
| **Solo** | $79 | 2 | Full shortlisting workflow, BYOK, source analytics, and unlimited started candidate conversations |
| **Team** | $239 | 8 | Deeper AI allowance, calendar integration, organization timeline, and AI analytics |
| **Scale** | $599 | 24 | SSO, audit and retention controls, DPA/SLA, and dedicated onboarding |
| **Agency** | Contact | Unlimited | Custom contract and role volume |

Current default Free allowances are 50 lifetime platform-funded application analyses (intended to demonstrate one shortlist), 20 assistant prompts, and five started candidate conversations. Configuration can override these operational limits; [`shared/billing.ts`](shared/billing.ts) is the implementation source of truth.

## Active Development and Near-Term Priorities

Work on feature branches is not part of the current release until merged.

- [ ] Finish AI-assisted screening-question generation and safe, deterministic rule generation without using sensitive candidate attributes
- [ ] Ship configurable reporting dashboards for hiring volume, pipeline, source, speed, and outcome analysis
- [ ] Extend bulk intake to match resume archives (ZIP/RAR) with ATS or job-board CSV exports
- [ ] Create a shareable shortlist artifact with visible reasoning for agency clients and hiring managers
- [ ] Add the first ATS integration, chosen from validated customer workflows, for distribution and practical data handoff
- [ ] Instrument the activation loop: pile uploaded → scoring completed → shortlist viewed → second role started

Lower-priority possibilities include custom pipeline stages, a candidate portal, phone/SMS communication, and broader ATS integrations. They should not displace faster time-to-shortlist, better evidence, or easier pile ingestion without customer validation.

## Product Principles

1. **Consider every applicant**: The product exists to correct partial review and arrival-order bias, not merely make the first-page review faster.
2. **Show the proof**: Scores must expose the criterion, source evidence, confidence, strengths, gaps, model, and run context needed for human review.
3. **Keep humans accountable**: AI recommends and explains; recruiters define the rubric, verify the evidence, override results, and own the decision.
4. **Earn trust before migration**: A team should reach a credible shortlist on one role with minimal setup and no irreversible commitment.
5. **Summaries first, details on demand**: Dense applicant pools need progressive disclosure, strong filters, and fast keyboard-friendly workflows.
6. **Treat candidate data as sensitive by default**: Tenant scoping, private documents, limited AI context, retention, and erasure are product requirements rather than deployment extras.
7. **Stay focused**: Reqcore is an applicant-review and hiring workflow, not a payroll, HRIS, or workforce-management suite.
8. **Use plain, high-integrity language**: Lead with the hiring outcome. Avoid magical AI claims, unsupported compliance promises, and marketing language inside operational UI.

## Success Metrics

### Activation

- **Time to first shortlist**: Time from account creation or pile import to a recruiter viewing a scored shortlist
- **Applicant coverage**: Percentage of usable applications evaluated against the configured rubric
- **Shortlist activation rate**: Percentage of imported or collected applicant piles that reach a viewed shortlist

### Value and Trust

- **Explanation completeness**: Percentage of AI scores with criterion-level evidence and run metadata visible
- **Shortlist validation**: Where a known hire from a completed role ranks when the full historical pool is evaluated
- **Human review rate**: Percentage of shortlisted candidates opened by a recruiter before a final stage decision
- **Communication reliability**: Candidate and interview messages delivered successfully or left visibly retryable

### Retention and Business

- **Second-role rate**: Organizations that start another role within 30 days of their first shortlist
- **First-shortlist-to-paid conversion**: Organizations that upgrade after seeing the core outcome
- **Active roles per paying organization**: Expansion through genuine hiring activity
- **Logo and role retention**: Whether Reqcore becomes part of the recurring hiring process rather than a one-off scoring tool

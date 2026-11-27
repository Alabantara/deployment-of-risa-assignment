# CampusFest Kolkata (Challenge B: Sponsorship Growth) — Phase 0, Phase 1 & Phase 2 Quantitative Foundation

## Phase 0: Core Decisions

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Challenge** | **Challenge B — Sponsorship Growth** (Maximize sponsorship cash collected before the festival) | Rich multi-table relational dataset (12 sheets, 180 brands, 950 deduplicated interactions, 433 brand qualification states, 58 opportunities, 228 stage transitions) with clear funnel leaks and a critical **"confirmed/signed INR vs. cash collected before fest"** gap. |
| **Tier-1 City** | **Kolkata, West Bengal** | 1. **Dense Student Ecosystem:** West Bengal enrolls **24.5–27+ lakh** higher-ed students across **~1,588 colleges** (AISHE), anchored in Kolkata by **140+ University of Calcutta colleges**, **200+ MAKAUT institutes**, Jadavpur University (~10k–13k students), and IIM Calcutta. Lower state college density (~16 vs. ~32 national avg per lakh) concentrates larger enrollments per campus.<br>2. **Sponsor HQ Density Aligned to Winning Verticals:** Central/South Kolkata houses national HQs of **ITC Limited** (Alipore), **Emami Group** (Kasba/EM Bypass), **Exide** (Chowringhee), **McNROE**, **Keventer Agro**, **Bandhan Bank**, and **UCO Bank**, while **Salt Lake Sector V & New Town** host **TCS, Wipro, Cognizant, IBM, Accenture, Oracle, SAP, PwC, and EY** — matching the dataset's highest-converting verticals (F&B, Consumer Products, Mobility, Education).<br>3. **Proven Urban Fest Benchmarks:** Premier Kolkata fests validate both turnout and pricing — **St. Xavier's Xaviesta** (2,500–4,000+ footfall over 2 days; Associate tier ~₹3,00,000), **Jadavpur University Sanskriti** (10,000–25,000+ footfall), and **IIM Calcutta Intaglio**. `CampusFest 2025` (2,150 unique check-ins, 2,540 confirmed registrations) sits squarely in this premier urban tier. |
| **Target Stack (Phases 5–6)** | **React (Vite) + Supabase + Gemini API (Tool-Calling) + Vercel** | Clean persistent data layer with a frozen original dataset snapshot + live SQL/RPC tool-calling so the AI copilot executes deterministic calculations in code rather than hallucinating numbers. |

---

## Phase 1: Dataset Cleaning & Diagnostic Profiling

### 1.1 Data Cleaning & Integrity Audit
Frozen original dataset preserved untouched in [Sponsor Dataset.xlsx](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/datasets/Datasets/Sponsor%20Dataset.xlsx). Cleaned tables exported to [data/cleaned/](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/data/cleaned/).

- **Deduplication (Import Retries Removed):**
  - `Sponsor interactions`: `953` raw rows -> **`950`** unique `interaction_id`s (`3` exact duplicates removed: `SI00001` Beardo, `SI00019` Mosaic Mobility, `SI00110` Bramble Living).
  - `Brand qualification`: `434` raw rows -> **`433`** unique `history_id`s (`1` exact duplicate removed: `BQ0003` Beardo).
  - `Opportunity history`: `230` raw rows -> **`228`** unique `history_id`s (`2` exact duplicates removed: `OH00001` O001, `OH00015` O004).
- **Entity Granularity & Traps:**
  - `180` unique brands, `270` contacts (`180` Partnerships Managers, `90` Brand Marketing Leads), `370` unique outreach attempts across `6` sponsor campaigns (`SC01`–`SC06`), `58` opportunities across `57` unique brands (`Beardo` has 2 opps: `O001` won ₹2,00,000 and `O002` lost ₹30,000).
  - **Signed vs. Cash Collected Caveat:** As documented in `Read me` and `Field guide`, `confirmed_value_inr` is a simple reported partnership commitment (split into `cash` vs `in_kind`), **not proof of bank receipt**. Moreover, `Cobalt Learning` (`O006`, ₹80,000) reached `partner_confirmed` on `2025-02-25` and **withdrew 23 days later** (`2025-03-20`) — a **4.0% empirical post-signing withdrawal rate (1 of 25 ever-confirmed deals)**.

### 1.2 Historical Funnel & Target Variance (`2025-01-15` to `2025-04-20`)
- **Targets (`Targets` sheet):**
  - Launch Plan (`2025-01-15`): `40` qualified brands, `20` confirmed partnerships.
  - Revised Plan (`2025-03-15`): `55` qualified brands, `28` confirmed partnerships.
- **Actual Funnel:**
  - **Prospects:** `180` brands (`370` attempts across 12 active weeks; `35.6` attempts/week avg, `49/wk` peak).
  - **Conversations (`meeting_held`):** `60` brands (**`33.3%`** of prospects).
  - **Qualified Brands (latest state):** `60` brands (**`109.1%`** of revised 55-brand goal!).
  - **Opportunities Created:** `58` opps across `57` brands (only `42` of `60` qualified brands got an opp!).
  - **Proposals Sent:** `46` opps (**`76.7%`** of conversations/qualified brands; `25.6%` of prospects).
  - **Negotiating:** `39` opps (`84.8%` of proposals).
  - **Ever Confirmed → Net Signed:** `25` ever confirmed (`54.3%` of proposals) → **`24` net confirmed** (**`52.2%`** of proposals; **`85.7%`** of revised 28-deal target — **4 deals short**).
  - **Cash vs. In-Kind Split:** **`20` cash deals** (`83.3%`) = **`₹20,00,000`** (`₹1,00,000` exact mean, `₹95,000` median, range `₹50,000–₹2,00,000`) + **`4` in-kind deals** (`16.7%`) = **`₹2,40,000`** (`₹60,000` exact mean).
  - **Estimated Pre-Fest Cash Collected (at 75% benchmark pre-event tranche realization):** **`₹15,00,000`** (leaving `₹5,00,000` exposed to post-event Proof-of-Performance holdbacks / slippage).

### 1.3 Five Sharp Patterns Discovered in the Data
1. **The Cold-vs-Warm Chasm (`100%` of revenue from `13%` of effort):**
   - **Warm/Inbound Trio (`SC02` Warm Partner Intros, `SC04` Partner Interest Form, `SC05` Creator Network Referrals):** `48` attempts (`13.0%` of attempts) across `44` brands → `36` meetings (`81.8%`) → `25` opps → **`24` confirmed (`96.0%` opp win rate!)** = **`₹20,00,000` cash + `₹2,40,000` in-kind (100% of all revenue)**.
   - **Cold/Revival Trio (`SC01` Brand Discovery Email, `SC03` Brand Leader LinkedIn, `SC06` Past Conversation Revival):** `322` attempts (`87.0%` of effort; `SC01` alone burned `224` attempts = `60.5%` and caused all `7` opt-outs) → `24` meetings → `33` opps → **`0` confirmed (`0.0%` win rate!)**, `6` lost, `1` withdrawn, and `26` frozen in stale stages for `12–80` days.
2. **The Broken Qualification-to-Opportunity Gate (`30%` leak on best channels):**
   - **`18` of `60` qualified brands (`30.0%`) never had an opportunity created** — including **`6` from `SC04` (Partner Interest Form)** and **`6` from `SC05` (Creator Network Referrals)**, both of which had **`100%` opp win rates** when worked!
   - Simultaneously, **`15` of `58` opportunities (`25.9%`) were created on non-qualified brands** (`6` dormant, `6` engaged, `3` unqualified) from `SC01/SC03/SC06`, clogging bandwidth.
3. **The Cold `Media` Pricing Trap (`85.7%` of all losses):**
   - **`6` of `7` lost deals** were `Media` brands pitched at **`₹1,25,000` cash** via cold/revival channels (`0/6` won). Meanwhile, warm `Media` deals closed `4/4` (`100%`) at **`₹35,000–₹95,000`** (avg `₹71,250`, including 1 in-kind).
   - Core cash verticals with **`0` losses**: `Food & Beverage` (`50.0%` opp win rate, `₹3.90L` cash + `₹1.60L` in-kind), `Mobility` (`45.5%`, `₹4.45L` cash), and `Consumer Products` (`41.7%`, `₹4.50L` cash).
4. **The Contact Role Bottleneck (`Partnerships Manager` = `100%` of deals):**
   - `Brand Marketing Lead` contacts (`90` contacts) generated `28` replies (`21.4%` positive), `1` meeting, and **`0` opportunities**. `Partnerships Manager` contacts (`180` contacts) generated `59` meetings, **`58/58` opportunities (`100%`)**, and **`24/24` wins (`100%`)**.
5. **Sales Cycle Velocity Predicts Loss (`2.2x` proposal stall):**
   - Won deals close in a median of **`16.08` days** from first interaction (`5.96d` to opp + `5.12d` to proposal + **`5.00d` proposal-to-close**). Lost deals take **`24.08` days** (`11.00d` proposal-to-close — stalling over `2x` longer after proposal).

---

## Phase 1.4: Three-Column Assumptions Register

| Domain | Sourced Fact (with Citation) | Derived from Dataset (`Sponsor Dataset.xlsx`) | Explicit Model Assumption (Kolkata Base & Stretch) |
| :--- | :--- | :--- | :--- |
| **City Student Scale & Fest Footfall** | West Bengal has **24.5–27+ lakh** higher-ed students across **~1,588 colleges** ([AISHE / DoHE WB](https://aishe.gov.in)); Kolkata anchors **140+ CU colleges** ([caluniv.ac.in](https://caluniv.ac.in)), **200+ MAKAUT institutes** ([makautwb.ac.in](https://makautwb.ac.in)), and **St. Xavier's Xaviesta** draws **2,500–4,000+ footfall** ([sxuk.edu.in](https://sxuk.edu.in)). | `Attendee Dataset.xlsx` records **2,540** confirmed registrations and **2,150** unique checked-in visitors across 2 fest days (vs. 2,200 revised goal). | Kolkata `CampusFest` sustains **2,500–4,000** 2-day footfall, supporting Tier-1 urban fest pricing tiers. |
| **Sponsor HQ & Category Fit** | Kolkata hosts national HQs for **ITC, Emami, Exide, McNROE, Keventer, Bandhan Bank, UCO Bank**, plus **Salt Lake Sector V** IT/BFSI hubs (**TCS, Wipro, Cognizant, PwC, EY**) ([tamtam.ai](https://tamtam.ai), [builtinkolkata.in](https://builtinkolkata.in)). | Core converting verticals: `Food & beverage` (`50.0%` opp win), `Mobility` (`45.5%`), `Consumer products` (`41.7%`), `Education` (`27.3%`). Cold `Media` (`₹1.25L`) lost `6/6`. | Expanding targeted outreach from `180` to **`200`** Kolkata prospects focuses on F&B, FMCG, BFSI/Fintech, EV/Mobility, and EdTech HQs while routing `Media` to barter/lower tiers. |
| **Funnel Conversions & Leak Recovery** | Gen-Z campus activations convert via warm creator/experiential formats over cold outreach ([contarctica.com](https://contarctica.com), [youthfluence.in](https://youthfluence.in)). | Overall `Prospect->Conv` = `33.3%` (Warm `81.8%` vs. Cold `17.0%`); `Conv->Proposal` = `76.7%` (`18/60` qualified dropped); `Proposal->Net Signed` = `52.2%` (`96%` warm vs. `0%` cold). | **Base:** `32.5%` conv, `80.0%` prop, `50.0%` win, `85.0%` cash mix.<br>**Stretch:** `36.0%` conv (warm mix shift), `87.5%` prop (CRM auto-opp on `SC04/SC05`), `54.0%` win (cut cold `₹1.25L` Media), `88.0%` cash mix. |
| **Pricing & Deal Size** | St. Xavier's Kolkata Associate tier priced at **~₹3,00,000** ([scribd.com](https://scribd.com)); Indian city/tier-1 fests price Title at **₹2L–₹15L+** and Booths/Stalls at **₹25k–₹1.5L** ([ingluglobal.in](https://ingluglobal.in)). | `20` cash deals averaged **`₹1,00,000`** (median `₹95,000`, max `₹2,00,000` Beardo); `4` in-kind averaged **`₹60,000`**. | **Base:** `₹1,00,000` avg cash deal (`0` Title, `2` Assoc, `7` Cat, `7` Event, `6` Booth).<br>**Stretch:** **`₹1,15,000`** (`+15%`) by closing `1` Title (`₹4.0L`) + Category Exclusivity (`+25%` tier premium on `8` slots). |
| **Pre-Fest Cash Collection & Default Risk** | Standard Indian campus contracts split tranches: **20–30%** on signing, **40–50%** pre-event/on-site, **20–30%** post-event PoP ([youthfluence.in](https://youthfluence.in), [sponsorshipsearch.com](https://sponsorshipsearch.com)). | `confirmed_value_inr` is not cash in bank; `1/25` confirmed deals (`Cobalt Learning`, ₹80k) withdrew 23 days post-signing (**`4.0%`** withdrawal rate). | **Downside:** `70%` collected pre-fest (`30%` holdback/slippage). **Base:** `78%`. **Stretch:** **`90%`** via Early-Bird `50%` upfront + `100%` by `T-7` days for prime booth/stage lock-in. |
| **Team & Inventory Constraints** | Student committees operate part-time alongside academics over a fixed pre-fest selling window. | Dataset spans `12` active weeks (`Jan 20–Apr 12`), `4` owners (`Riya, Kabir, Nisha, Meera`), averaging `35.6` attempts/wk (peak `49/wk`). | **Team Cap:** `4` members × `10` hrs/wk × `12` wks = **`480` hrs**. **Cash Inventory Cap:** **`32` slots** (`1` Title, `3` Assoc, `8` Cat, `10` Event, `10` Booth). Base (`460.0` hrs, `95.8%`) and Stretch (`409.7` hrs, `85.4%`; `29.9` cash deals) stay cleanly within both caps. |

---

## Phase 2: Quantitative Model Summary

Full live-formula workbook: [CampusFest_Kolkata_Sponsorship_Model.xlsx](file:///c:/Users/ravis/OneDrive/Desktop/Desktop/9th_sem/My%20Projects/lab-YMS%20+%20RISA/model/CampusFest_Kolkata_Sponsorship_Model.xlsx)

### 2.1 Scenario Comparison (`Prospects -> Conversations -> Proposals -> Signed -> Cash Collected`)

| Metric | Historical (Dataset) | Downside Case | Base Case | Stretch Case | Stretch vs. Base |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Target Prospects (Brands)** | 180 | 180 | 200 | 200 | 0 |
| **Prospect -> Conversation %** | 33.3% | 25.0% | 32.5% | 36.0% | +3.5pp |
| **Conversations (Meetings Held)** | 60.0 | 45.0 | 65.0 | 72.0 | +7.0 |
| **Conversation -> Proposal %** | 76.7% | 72.0% | 80.0% | 87.5% | +7.5pp |
| **Proposals Sent** | 46.0 | 32.4 | 52.0 | 63.0 | +11.0 |
| **Proposal -> Net Signed Win %** | 52.2% | 45.0% | 50.0% | 54.0% | +4.0pp |
| **Net Signed Partnerships** | 24.0 | 14.6 | 26.0 | 34.0 | +8.0 |
| **Cash Deal Mix %** | 83.3% | 80.0% | 85.0% | 88.0% | +3.0pp |
| **Cash Deals Signed (Cap = 32)** | 20.0 | 11.7 | 22.1 | 29.9 | +7.8 |
| **Avg Cash Deal Size (INR)** | ₹1,00,000 | ₹90,000 | ₹1,00,000 | ₹1,15,000 | +₹15,000 |
| **Signed Cash Value (INR)** | ₹20,00,000 | ₹10,49,760 | ₹22,10,000 | ₹34,42,824 | +₹12,32,824 |
| **Pre-Fest Cash Collection %** | 75.0% | 70.0% | 78.0% | 90.0% | +12.0pp |
| **CASH COLLECTED BEFORE FEST** | **₹15,00,000** | **₹7,34,832** | **₹17,23,800** | **₹30,98,542** | **+₹13,74,742 (+79.8%)** |
| **Acquisition Budget (INR)** | ₹60,000 | ₹60,000 | ₹75,000 | ₹1,00,000 | +₹25,000 |
| **Cash ROI Multiple** | 25.0x | 12.2x | 23.0x | 31.0x | +8.0x |

### 2.2 Top Sensitivity Drivers (Varying Downside-to-Stretch Around Base = ₹17,23,800)
1. **Prospect → Conversation Rate (`25.0% → 36.0%`):** **`₹5,83,440` swing** (`₹13,26,000` to `₹19,09,440`, `+10.8%` upside vs. Base) — governed by warm intro & creator referral mix.
2. **Pre-Fest Cash Collection Rate (`70.0% → 90.0%`):** **`₹4,42,000` swing** (`₹15,47,000` to `₹19,89,000`, **`+15.4%` single-lever upside** vs. Base) — governed by Early-Bird upfront milestone structure.
3. **Average Cash Deal Size (`₹90,000 → ₹1,15,000`):** **`₹4,30,950` swing** (`₹15,51,420` to `₹19,82,370`, **`+15.0%` upside** vs. Base) — governed by Category Exclusivity pricing & Title slot close.
4. **Conversation → Proposal Rate (`72.0% → 87.5%`):** **`₹3,33,986` swing** (`+9.4%` upside) — fixing the 30% qualified-lead drop.
5. **Proposal → Net Signed Win Rate (`45.0% → 54.0%`):** **`₹3,10,284` swing** (`+8.0%` upside) — cutting cold `₹1.25L` Media losses.

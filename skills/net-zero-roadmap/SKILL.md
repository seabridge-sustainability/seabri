# Net Zero Roadmap

A practical guide for small and medium businesses and organizations starting on the path to measure, reduce, and eventually eliminate their greenhouse gas emissions — without paying for expensive consultants to do work you can do yourself.

---

## Understanding What You Are Measuring

### Scope 1: Direct Emissions

Scope 1 emissions come from sources your organization owns or controls directly.

**Examples**:
- Natural gas burned in furnaces, boilers, or water heaters you own
- Diesel or gasoline burned in company-owned vehicles and equipment
- Propane used in forklifts, outdoor heaters, or manufacturing processes
- Refrigerant leaks from air conditioning and refrigeration systems — refrigerants are potent greenhouse gases; a small leak can equal several tonnes of CO2 equivalent

**Why they matter first**: Scope 1 is where you have the most direct control. If you drive company vehicles and own a building with a gas boiler, Scope 1 is where your decarbonization starts. These emissions are also the most straightforward to measure.

### Scope 2: Purchased Energy

Scope 2 covers greenhouse gas emissions from electricity, steam, heat, or cooling you purchase from a utility or other supplier. You do not generate these emissions on-site, but the generation process emits greenhouse gases on your behalf.

**Examples**:
- Electricity from the grid used for lighting, HVAC, equipment, data centers
- Steam purchased from a district heating system

**Two calculation methods — this distinction matters**:

**Location-based**: Uses the average emissions intensity of the electricity grid in your region. In the US, the EPA publishes grid emission factors by subregion through the eGRID database at epa.gov/egrid. The average US grid is approximately 0.386 kg CO2e per kWh (2022 data), but ranges from under 0.1 in the Pacific Northwest (hydro-heavy) to over 0.5 in coal-heavy regions.

**Market-based**: Uses the emission factor associated with the specific electricity source you have contractually chosen — through Renewable Energy Certificates (RECs), a Power Purchase Agreement (PPA), or a green tariff. If you have purchased RECs or have a renewable PPA, your market-based Scope 2 can be zero even while your location-based Scope 2 is not.

**Disclosure practice**: Most reporting frameworks require you to report both. The location-based figure shows what is actually happening on the physical grid. The market-based figure reflects your contractual choices. Be clear about which you are citing in any public statement.

### Scope 3: Value Chain Emissions

Scope 3 covers all other indirect emissions connected to your activities — everything that happens in your value chain that is not captured in Scopes 1 and 2.

**Upstream examples** (from your suppliers):
- Emissions from producing and shipping raw materials and goods you purchase
- Business travel — flights, hotels, rental cars
- Employee commuting
- Emissions from waste you send to landfill

**Downstream examples** (from your customers):
- Emissions from customers using your products (an automotive manufacturer's Scope 3 includes tailpipe emissions when customers drive the cars they sell)
- Emissions from end-of-life treatment of your products

**Scale**: For most organizations, Scope 3 represents 70-90% of total emissions. For a retailer, it is dominated by manufacturing of products they sell. For a food company, by agricultural production. For a software company, often by the electricity use of data centers they do not own. For a bank or investor, by the emissions financed through their loan and investment portfolio.

**Why Scope 3 is the hardest part**: You do not control your suppliers or customers. Data quality is lower — you often estimate from spend data rather than measure directly. Progress requires supplier engagement over years, and results are harder to verify. Despite the difficulty, this is where most of the impact lies.

---

## The GHG Protocol: The Global Standard

The GHG Protocol Corporate Accounting and Reporting Standard is the methodology framework used by the majority of the world's organizations for emissions measurement. If you are going to measure and report emissions seriously, this is the foundation.

**Where to get it**: ghgprotocol.org — free to download. The Corporate Standard is the starting point. The Scope 3 Standard is the companion document for value chain emissions.

**What it defines**: Which emission sources belong in each scope, how to calculate emissions using activity data and emission factors, how to set your organizational boundary, how to handle acquisitions and divestitures.

**Why following this standard matters**: When lenders, investors, customers, or reporting frameworks (CDP, TCFD, ISSB S2) ask about your emissions, they expect GHG Protocol alignment. Inventing your own methodology creates confusion and makes your numbers impossible to compare across organizations.

---

## How to Conduct a Carbon Footprint Assessment Without a Consultant

### Step 1: Set Your Organizational Boundary

Decide which entities are included in your inventory. The GHG Protocol offers two approaches:

**Operational control**: Include 100% of emissions from operations over which you have operational control (you set and implement operating policies). Most appropriate for most organizations.

**Financial control**: Include 100% of emissions from operations where you have financial control. Similar result in many cases but differs for joint ventures and franchise arrangements.

Document your boundary clearly — which facilities and legal entities are in, which are out, and why. This matters when your boundary changes.

### Step 2: Collect Activity Data

Activity data is the quantity of the activity that causes emissions — therms of natural gas burned, gallons of diesel consumed, kilowatt-hours of electricity used.

**Common data sources**:
- **Utility bills**: Your billing history provides kWh, therms, or CCF. Request 12-24 months of history from your utility. The Green Button program (greenbuttonalliance.org) provides downloadable utility data from many US utilities.
- **Fuel receipts or fleet management system records**: Gallons of diesel, gasoline, propane. Fleet management systems (GPS tracking, fuel cards) often export fuel consumption data directly.
- **Airline booking or expense records**: For business travel — typically found in your corporate travel system or expense management software.
- **Waste disposal invoices**: Tons of waste sent to landfill.
- **Spend data for Scope 3 estimation**: When activity-level data is unavailable, total spending by supplier category can be multiplied by spend-based emission factors.

### Step 3: Apply Emission Factors

An emission factor converts your activity data into CO2-equivalent (CO2e) emissions.

**Scope 1 (combustion)**: US EPA emission factors for fossil fuels are at epa.gov/climateleadership/ghg-emission-factors-hub. Natural gas: approximately 53.06 kg CO2 per million BTU. Diesel: approximately 73.96 kg CO2 per million BTU. Convert your therms or gallons to BTU using standard conversion factors, then apply.

**Scope 2 (electricity)**: Use EPA eGRID emission factors for your grid subregion. Available at epa.gov/egrid.

**Scope 3**: The EPA Supply Chain Greenhouse Gas Emission Factors (at epa.gov/climateleadership/supply-chain-ghg-emission-factors) provide spend-based factors by NAICS code. Multiply your spend by category by the relevant factor per dollar of spend. This is a rough estimate — sufficient for identifying your largest categories and where to focus.

### Free Tools to Use

**EPA's ENERGY STAR Portfolio Manager** (energystar.gov/portfoliomanager): Tracks energy use and emissions for commercial buildings. Free. Widely used. Can import utility data automatically from many utilities via the Green Button program.

**EPA's GHG Inventory Tool for Small Business**: A free Excel-based tool. Available at epa.gov/climateleadership/ghg-inventory-tools. Appropriate for most small organizations measuring Scopes 1 and 2.

**USEEIO Supply Chain Model**: EPA's free economic input-output model for Scope 3 spend-based estimates. Available at epa.gov/land-research/us-environmentally-extended-input-output-useeio-technical-content.

**Watershed, Persefoni, Sweep, Plan A**: Software platforms that automate more of the data collection and calculation. Free tiers exist; enterprise versions range from $10,000-100,000+/year. Worth evaluating when your reporting requirements or portfolio complexity grows.

---

## Terminology: What the Claims Actually Mean

### Net Zero

**What it should mean**: Deep absolute reductions of approximately 90-95% of value chain emissions from a base year, followed by high-quality permanent carbon removal to neutralize the remaining unavoidable residual emissions. The Science Based Targets initiative (SBTi) Corporate Net Zero Standard defines the threshold as at least 90% reduction before any neutralization.

**What it often means in practice**: Variable. Some "net zero" claims involve primarily purchasing carbon credits rather than making real reductions. Claims validated by SBTi are meaningfully more credible than self-declared net zero.

### Carbon Neutral

Total emissions balanced by carbon credits (offsets) such that net emissions equal zero in accounting terms. It is a legitimate milestone but a lower bar than net zero — it does not require actual deep reductions. An organization can be "carbon neutral" while purchasing offsets to cover high ongoing emissions.

**Not inherently misleading if disclosed transparently**: The problem arises when the claim is used in marketing in ways that suggest all emissions have been eliminated, rather than offset.

### Climate Positive / Carbon Negative

Removing more CO2 from the atmosphere than the organization emits — a net negative footprint. Microsoft has publicly committed to being carbon negative by 2030. Goes beyond net zero.

### "Net Zero Scope 1 and 2"

Some organizations declare net zero for direct operations and purchased electricity only — not the value chain. For a company whose Scope 3 is 80% of its total footprint, this covers only a small fraction of the actual climate impact. Read these claims critically.

---

## Science-Based Targets (SBTi)

The Science Based Targets initiative validates corporate emission reduction targets against climate science. An SBTi-validated target is becoming a de facto standard for credible climate commitments in most sectors.

**Where to start**: sciencebasedtargets.org — the SBTi Target Dashboard shows what organizations in your sector have committed to and what their trajectories look like.

**What validation requires**:

**Near-term target (typically to 2030)**: For a 1.5°C-aligned target, at least 42% absolute reduction in Scope 1 and 2 emissions from a base year. Scope 3 targets required if your Scope 3 is more than 40% of total emissions (almost always true for product-based businesses). Targets are validated against SBTi sector-specific pathways.

**Long-term net zero target (to 2050)**: Reducing total value chain emissions by at least 90% from the base year. No later than 2050.

**Submission process**: Submit a commitment letter to SBTi (signals intent, starts a 24-month clock to submit formal targets). Develop targets using SBTi guidance. Submit for formal review — typically 2-6 months. Annual public progress reporting required once validated.

**SME route**: Organizations with fewer than 500 employees and less than €50M revenue can use the simpler SME route — less data-intensive, faster to validate.

**Why pursue validation**: External credibility. Increasingly required in supplier questionnaires from large corporate customers, in investor due diligence, and in procurement processes.

---

## Decarbonization Levers by Category

### Energy

**Switch to renewable electricity** — the fastest Scope 2 improvement:
- Rooftop solar (capital investment, long-term savings — see Home Resilience Audit skill for evaluation methodology)
- Power Purchase Agreement (PPA) with a renewable generator — often 10-20 year contracts, fixed price, no upfront cost
- Green tariff from your utility — utility provides renewable electricity at a small premium
- Renewable Energy Certificates (RECs) — the weakest option but a starting point; additionality is contested

**Improve energy efficiency**: LED lighting retrofits (payback typically 1-3 years), HVAC upgrades, motors and variable speed drives, building envelope improvements. Every efficiency improvement reduces both cost and emissions.

**Electrify on-site combustion**: Replace gas-fired boilers, water heaters, and process heat with electric alternatives. Heat pumps, electric boilers, induction heating. Eliminating natural gas from your operations removes Scope 1 emissions permanently.

### Fleet

**Electrify light-duty vehicles**: Company cars and light vans are the easiest starting point. EVs are now cost-competitive over total cost of ownership in most applications. The federal Clean Vehicle Credit (Section 30D) applies to commercial purchases as well as personal.

**Electrify medium-duty where feasible**: Electrification of delivery vehicles (box trucks, cargo vans) is advancing rapidly. Evaluate your duty cycle — most delivery routes are well within current EV range.

**Route optimization and right-sizing**: Fewer vehicle-miles in right-sized vehicles reduces emissions and operating cost before electrification.

### Buildings

**Energy efficiency first**: Air sealing, insulation, HVAC upgrades. The same hierarchy from the Home Resilience Audit skill applies. Every kWh you do not use costs nothing to decarbonize.

**ENERGY STAR certification**: For commercial buildings, ENERGY STAR requires a score of 75 or above in Portfolio Manager. A verifiable, recognized marker of efficiency performance.

### Supply Chain

**Supplier emissions disclosure**: Request key suppliers to disclose emissions via CDP's Supply Chain program (cdp.net). Large buyers have meaningful leverage to request this.

**Supplier switching**: Evaluate lower-carbon alternatives for your most emissions-intensive purchased inputs. A small number of spend categories typically represent the majority of your Scope 3 upstream footprint.

**Procurement policy**: Include carbon criteria in your supplier evaluation framework. Carbon does not need to be the only or decisive factor — it needs to be a factor.

---

## Carbon Credits: When Legitimate, When Not

Carbon credits represent a reduction, avoidance, or removal of one metric tonne of CO2e. They are sold through voluntary markets. Quality varies enormously.

### Legitimate Use Cases

Carbon credits are appropriate as a supplement to real reductions — for residual emissions that cannot yet be eliminated, not as a substitute for actual operational cuts. The SBTi is explicit: credits should not count toward near-term science-based reduction targets. They can be used to achieve carbon neutrality claims alongside actual targets, or to neutralize unavoidable residual emissions after deep reductions have been made.

### High-Integrity Credits

**Gold Standard** (goldstandard.org): Requires rigorous additionality, permanence, and co-benefit standards. Projects include clean cookstoves, renewable energy in developing markets, biochar. Third-party verified.

**Verified Carbon Standard / Verra VCS** (verra.org): The largest voluntary carbon market standard. Wide range of project types. Quality varies within VCS — look for projects with additional quality labels (CCB for biodiversity co-benefits, SD Vista for social development) for higher confidence.

**Carbon removal credits from frontier technologies**: Direct air capture with geological storage, enhanced weathering, ocean-based removal. Expensive ($400-2,000+/tonne) but permanent removal rather than avoidance. Frontier Climate (frontierclimate.com) purchases these on behalf of member organizations.

### Low-Integrity Credits (Avoid)

- Avoided deforestation (REDD+) credits with weak additionality baselines: Investigative reporting (The Guardian, 2023; academic studies) found many major REDD+ projects had substantially overstated their credited impact.
- RECs or credits from projects in markets where renewable energy was already mandated or economically viable without offset revenue.
- Credits priced below $5/tonne: At prices far below the social cost of carbon (estimated at $50-200/tonne in most analyses), either the project impact is questionable or the verification is inadequate.

---

## Interim Milestones: Why 2030 Matters as Much as 2050

A 2050 net zero target without credible near-term milestones is not a plan — it is a hope. The physics of climate change is about cumulative CO2 in the atmosphere.

**The carbon budget perspective**: The remaining global carbon budget consistent with limiting warming to 1.5°C is small. Emissions in this decade determine whether that goal remains achievable. Delaying meaningful action to 2040 or 2045 consumes the budget that would have kept options open.

**Lock-in risk**: Capital investments made today — new gas-fired equipment, long-term real estate leases in high-carbon buildings, fossil fuel supply contracts — will still be operating in 2035-2045. Decisions made now determine whether your 2030 targets are achievable.

**What a credible 2030 target looks like**: For a 1.5°C-aligned organization, approximately 42-50% absolute reduction in Scope 1 and 2 from a 2020 base year by 2030. For Scope 3: 25-50% reduction per unit of revenue or per product. These numbers come from the SBTi and the IPCC Sixth Assessment Report.

**The "hockey stick" problem**: Many corporate targets show near-flat emissions through 2030 and a dramatic decline thereafter. This implies relying on future technologies at costs that do not yet exist while delaying deployment of available solutions that are already cost-competitive. Set interim annual milestones and track against them publicly.

---

## What Investors and Lenders Now Require

**TCFD and ISSB S2**: The Task Force on Climate-related Financial Disclosures framework has become the global standard. It is now integrated into IFRS S2 — the International Sustainability Standards Board's climate disclosure standard, being adopted as mandatory in the UK, Australia, Canada, Singapore, Japan, and others. Four pillars: Governance, Strategy, Risk Management, Metrics and Targets.

**CDP**: The world's largest environmental disclosure platform. Used by investors and corporate customers to collect emissions data and assess performance. CDP scores organizations on disclosure quality. Being in the CDP system, even at a basic disclosure level, is increasingly expected by institutional investors and large corporate customers.

**Lender requirements**: Commercial lenders — particularly European banks and US banks with net zero commitments — are asking borrowers for emissions data, reduction targets, and climate transition plans as part of credit underwriting. Starting with larger corporate loans but moving toward mid-market and eventually small business lending.

**The practical implication**: Even if you are private and not legally required to disclose, your customers, lenders, and potential acquirers or investors will ask. Having measured, disclosed, and shown progress positions you materially better in those conversations.

---

## Transition Risk: Which Sectors Face What

**Carbon price risk**: Industries where carbon taxes or cap-and-trade programs directly increase operating costs. Currently most active in the EU Emissions Trading System (ETS). The US has regional programs — Regional Greenhouse Gas Initiative (RGGI) in the Northeast, California cap-and-trade. Carbon prices at $50-100/tonne materially affect economics of cement, steel, aluminum, chemicals, and high-emissions manufacturing.

**Stranded asset risk**: Assets that may lose economic value before the end of their useful life due to the energy transition. Most commonly discussed for fossil fuel reserves and infrastructure (coal mines, gas pipelines, LNG terminals), but also applies to inefficient real estate facing tightening energy codes, high-emission manufacturing equipment, and ICE vehicle fleets in long-term contracts.

**Technology displacement risk**: Sectors where cheaper, cleaner alternatives are rapidly approaching and in some cases surpassing cost parity with incumbent technology. Solar and wind have already disrupted gas-fired power economics. EVs are disrupting ICE vehicle supply chains. Heat pumps are disrupting gas heating equipment markets. The pace of disruption is faster than most forecasts anticipated.

**Customer and supply chain risk**: As large corporations set emission reduction targets and set Scope 3 expectations, they begin selecting suppliers based on climate performance. This is already happening in automotive OEM supply chains, apparel and footwear, and food and beverage. Organizations that cannot show progress face growing customer risk.

---

## Quick Reference Checklist

**Measurement foundation**:
- [ ] Set organizational boundary — operational or financial control, which entities are in
- [ ] Collect 12 months of utility bills (electricity, natural gas)
- [ ] Collect fuel consumption data for owned vehicles and equipment
- [ ] Identify top 5 Scope 3 categories by spend or by activity
- [ ] Apply EPA eGRID factors for Scope 2 (epa.gov/egrid)
- [ ] Apply EPA supply chain factors for Scope 3 estimates (epa.gov/climateleadership)
- [ ] Consider EPA GHG Inventory Tool for Small Business (free, Excel-based)

**Terminology and credibility**:
- [ ] Distinguish carbon neutral (can rely on offsets) from net zero (90% real reductions + removal of residual)
- [ ] Document whether Scope 2 is location-based or market-based
- [ ] Know which emission factor source you used and when it was published

**Targets**:
- [ ] Review SBTi sector pathways at sciencebasedtargets.org
- [ ] Set a near-term 2030 target with annual intermediate milestones
- [ ] Consider SBTi commitment letter submission for external validation

**Reduction actions**:
- [ ] Renewable electricity: evaluate green tariff, PPA, or rooftop solar
- [ ] Efficiency audit: lighting, HVAC, building envelope
- [ ] Fleet electrification plan for light-duty vehicles
- [ ] Engage top 5 suppliers on emissions disclosure (CDP supply chain)

**Carbon credits (if using)**:
- [ ] Use Gold Standard or well-verified VCS credits only
- [ ] Position credits as supplement to real reductions, not substitute
- [ ] Avoid avoided-deforestation credits without strong additionality verification
- [ ] Price check: credits under $5/tonne should raise quality concerns

**Disclosure**:
- [ ] Determine if CDP disclosure is expected by your investors or customers (cdp.net)
- [ ] Assess TCFD/ISSB S2 applicability for your organization
- [ ] Publish annual emissions data and progress against targets

---

*Sources: GHG Protocol Corporate Accounting and Reporting Standard (ghgprotocol.org), Science Based Targets initiative Corporate Net Zero Standard (sciencebasedtargets.org), IPCC Sixth Assessment Report Working Group III (2022), US EPA eGRID database (epa.gov/egrid), EPA Supply Chain GHG Emission Factors, CDP (cdp.net), IFRS S2 Climate-related Disclosures, Gold Standard (goldstandard.org), Verra Verified Carbon Standard (verra.org).*

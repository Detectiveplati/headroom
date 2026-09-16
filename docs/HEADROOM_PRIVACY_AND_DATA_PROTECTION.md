# Headroom --- Privacy & Data Protection

> **Purpose:** A practical pre-launch checklist for Headroom if it is
> commercialised or published on the Apple App Store / Google Play.
>
> **Important:** This is a product and engineering checklist, not legal
> advice. Requirements and store policies can change. Re-check current
> PDPA, Apple App Store, Google Play, and any applicable MAS
> requirements before launch.

## 1. Product Scope

Headroom is intended to be positioned as **personal spending analysis
and planning software**, not as a bank, payment service, investment
platform, or financial adviser.

Initial scope should preferably remain:

-   User manually imports their own bank statement or transaction
    export.
-   Headroom parses and categorises transactions.
-   Headroom provides spending analysis, trends, goals, and planning
    tools.
-   Headroom does **not** require the user's internet-banking
    credentials.
-   Headroom does **not** initiate payments or transfers.
-   Headroom does **not** provide investment execution or regulated
    financial advice.

If Headroom later connects directly to banks, initiates payments,
transfers money, provides investment recommendations, or otherwise
enters regulated financial services, conduct a separate Singapore
regulatory and licensing review before releasing those features.

## 2. Privacy-by-Design Principle

Collect and retain only the data Headroom genuinely needs.

Preferred data flow:

``` text
Bank statement / transaction export
        ↓
Parse locally on the user's device where practical
        ↓
Extract required transaction information
        ↓
User reviews/corrects transactions
        ↓
Store only required transaction fields
        ↓
Original statement is not retained
```

Where technically feasible, prefer **local/on-device statement parsing**
so the original bank statement never reaches Headroom's servers.

Avoid retaining unnecessary statement information such as:

-   Full bank account numbers
-   Residential addresses
-   Unnecessary personal identifiers
-   Full original PDF statements
-   Other information that is not required for Headroom's functionality

Prefer storing only necessary fields such as:

``` text
user_id
transaction_date
merchant_or_description
amount
category
account_alias
```

## 3. Singapore PDPA Checklist

Before commercial launch, verify Headroom's obligations under
Singapore's Personal Data Protection Act (PDPA).

At minimum, address:

-   [ ] Identify what personal data Headroom collects.
-   [ ] Define and document the purpose for each type of collected data.
-   [ ] Notify users of those purposes.
-   [ ] Obtain consent where required.
-   [ ] Do not collect more personal data than reasonably necessary.
-   [ ] Implement reasonable security arrangements to protect personal
    data.
-   [ ] Establish data-retention rules and delete/anonymise data when no
    longer required.
-   [ ] Provide applicable mechanisms for users to access/correct their
    personal data.
-   [ ] Handle withdrawal of consent appropriately.
-   [ ] Assess overseas data transfers and ensure appropriate protection
    where applicable.
-   [ ] Establish a personal-data breach response process.
-   [ ] Understand when a breach must be reported to the PDPC and/or
    affected individuals.
-   [ ] Designate a Data Protection Officer (DPO).
-   [ ] Make the organisation's DPO/business contact information
    publicly available.
-   [ ] Maintain an up-to-date privacy policy reflecting Headroom's
    actual architecture.

Reference: Singapore Personal Data Protection Commission (PDPC), **Data
Protection Obligations**.

## 4. Apple App Store Requirements

Before App Store submission:

-   [ ] Maintain a publicly accessible privacy policy.
-   [ ] Accurately complete Apple's App Privacy disclosures.
-   [ ] Explain what data Headroom collects.
-   [ ] Explain why each type of data is collected.
-   [ ] Disclose relevant third-party processing/sharing.
-   [ ] Document retention and deletion practices.
-   [ ] Provide appropriate account/data deletion controls.
-   [ ] Ensure requested permissions and collected data are necessary
    for Headroom's functionality.
-   [ ] Ensure privacy disclosures match actual application behaviour
    and SDK behaviour.
-   [ ] Review the current App Review Guidelines immediately before
    submission.

Because financial information is particularly sensitive, avoid
presenting Headroom as a bank or regulated financial institution unless
the business actually meets the applicable requirements.

Reference: Apple **App Review Guidelines** and current Apple privacy
requirements.

## 5. Google Play Requirements

Financial/payment information is treated by Google Play as personal and
sensitive user data.

Before Google Play submission:

-   [ ] Maintain a publicly accessible privacy policy.
-   [ ] Accurately complete the Google Play **Data Safety** section.
-   [ ] Clearly disclose collection and use of financial information.
-   [ ] Use secure transmission (for example, TLS/HTTPS) whenever
    sensitive data leaves the device.
-   [ ] Limit collection to data required for expected app
    functionality.
-   [ ] Do not sell users' sensitive financial data.
-   [ ] Properly disclose relevant third-party SDK/API data handling.
-   [ ] Provide required account-deletion functionality if Headroom
    supports user accounts.
-   [ ] Provide the required external mechanism/web resource for account
    deletion where applicable.
-   [ ] Re-check the current Google Play User Data policy immediately
    before release.

Reference: Google Play **User Data Policy**.

## 6. Bank Statement Handling

### Preferred

``` text
User chooses statement
        ↓
Local parsing
        ↓
Required transactions extracted
        ↓
Original file discarded locally
        ↓
Only necessary structured transaction data is synchronised
```

### If Server-Side Parsing Is Necessary

If statements must reach Headroom's infrastructure:

-   [ ] Encrypt data in transit.
-   [ ] Restrict access to the processing service.
-   [ ] Do not log statement contents.
-   [ ] Do not include sensitive statement data in error
    reporting/analytics.
-   [ ] Automatically delete the original statement immediately after
    successful processing unless retention is genuinely necessary.
-   [ ] Define automatic cleanup for failed/abandoned imports.
-   [ ] Encrypt sensitive stored information appropriately.
-   [ ] Maintain auditable access controls.
-   [ ] Clearly disclose this processing to users.

Do not claim that statements "never leave the device" unless this is
technically true for every relevant import path.

## 7. AI / LLM Data Protection

Do **not** automatically send raw bank statements or complete
transaction histories to an external LLM.

Prefer calculating financial metrics inside Headroom first:

``` text
Raw transactions
       ↓
Headroom analytics engine
       ↓
Aggregated/sanitised information

Dining: $482
Transport: $231
Groceries: $617
Shopping: $821
Income: $4,800
Expenses: $3,422
       ↓
AI insight generation
```

Before using an external AI provider:

-   [ ] Determine exactly what information is transmitted.
-   [ ] Minimise/pseudonymise data before transmission.
-   [ ] Remove names, account numbers, addresses, and unnecessary
    transaction descriptions where possible.
-   [ ] Review the provider's data retention and training policies.
-   [ ] Review processor/subprocessor locations.
-   [ ] Assess overseas-transfer obligations.
-   [ ] Document the provider in internal data-flow documentation.
-   [ ] Disclose relevant third-party processing to users.
-   [ ] Ensure provider settings prevent training on Headroom customer
    data where available/appropriate.

Never make privacy claims that conflict with the AI provider's actual
handling of data.

## 8. Security Baseline

Before accepting real customer financial data:

-   [ ] HTTPS/TLS everywhere.
-   [ ] Encryption for sensitive data at rest where appropriate.
-   [ ] Strong authentication.
-   [ ] Secure password hashing.
-   [ ] MFA support where appropriate.
-   [ ] Strict database authorisation/isolation between users.
-   [ ] No financial information in application logs.
-   [ ] No secrets/API keys in client code or source control.
-   [ ] Principle of least privilege for infrastructure/database access.
-   [ ] Production access restricted and auditable.
-   [ ] Dependency/security update process.
-   [ ] Secure backups.
-   [ ] Defined backup-retention/deletion policy.
-   [ ] Incident-response procedure.
-   [ ] Vulnerability/security review before commercial launch.

Treat transaction data as sensitive even when it does not contain a card
number or bank-account number.

## 9. User Privacy Controls

Create a dedicated area such as:

``` text
Settings
└── Privacy & Data
    ├── What Headroom stores
    ├── Download my data
    ├── Delete imported transactions
    ├── Delete an account/data source
    ├── Delete my Headroom account
    ├── Privacy Policy
    └── Contact Data Protection Officer
```

Deletion should actually propagate through production systems according
to the documented retention policy, including relevant
backups/processors where required and technically applicable.

## 10. Marketing Claims

Privacy can be a Headroom differentiator, but every claim must be
technically verifiable.

Potential claims **only if true**:

> Your original bank statement never leaves your device.

> Headroom never asks for your internet-banking password.

> Original statements aren't retained.

> We don't sell your financial information.

> You control and can delete your financial data.

Avoid vague or absolute claims such as:

> 100% secure.

> Impossible to hack.

> Completely anonymous.

No system can responsibly guarantee those statements.

## 11. Third-Party Services

Maintain an internal register covering every external service that can
receive Headroom user information.

Examples:

  Service Type        Data Potentially Received       Review Required
  ------------------- ------------------------------- -----------------
  Hosting/database    Account + transaction data      Yes
  Authentication      Account identifiers             Yes
  AI provider         Sanitised analysis inputs       Yes
  Error monitoring    Technical telemetry             Yes
  Product analytics   Usage telemetry                 Yes
  Email provider      Email/contact information       Yes
  Payment processor   Subscription/payment metadata   Yes

For every provider, document:

-   Purpose
-   Data transmitted
-   Storage location
-   Retention
-   Subprocessors
-   Security controls
-   Contract/data-processing terms
-   Whether information is used for advertising or model training
-   How deletion requests propagate

## 12. Pre-Launch Privacy Review

Before accepting paying customers:

-   [ ] Map the complete data lifecycle.
-   [ ] Identify every database/storage location.
-   [ ] Identify every third-party processor.
-   [ ] Review PDPA obligations against the production architecture.
-   [ ] Review current Apple requirements.
-   [ ] Review current Google Play requirements.
-   [ ] Review whether any planned functionality creates MAS/regulatory
    obligations.
-   [ ] Finalise Privacy Policy and Terms.
-   [ ] Test account/data deletion end-to-end.
-   [ ] Test export/access functionality.
-   [ ] Verify statement deletion behaviour.
-   [ ] Verify logs contain no sensitive financial information.
-   [ ] Verify AI requests contain only intended information.
-   [ ] Verify App Store / Play Store disclosures against actual network
    behaviour.
-   [ ] Conduct a security review.
-   [ ] Have a Singapore privacy professional/lawyer review the final
    production data flow where appropriate.

## 13. Architecture Rule

When deciding whether to collect additional information, use this order:

``` text
Can Headroom work without collecting it?
            │
          YES ──→ Don't collect it.
            │
           NO
            ↓
Can it be processed locally?
            │
          YES ──→ Process locally.
            │
           NO
            ↓
Can it be anonymised/aggregated first?
            │
          YES ──→ Transform before upload.
            │
           NO
            ↓
Collect only what is necessary,
protect it, disclose the purpose,
define retention, and provide deletion.
```

## 14. Official References to Re-check Before Launch

Policies and legislation can change. Always use the current official
versions:

-   Singapore PDPC --- Personal Data Protection Act / Data Protection
    Obligations: https://www.pdpc.gov.sg/
-   Apple --- App Review Guidelines:
    https://developer.apple.com/app-store/review/guidelines/
-   Apple --- App Privacy:
    https://developer.apple.com/app-store/app-privacy-details/
-   Google Play --- User Data Policy:
    https://support.google.com/googleplay/android-developer/
-   Monetary Authority of Singapore (if Headroom expands into
    potentially regulated financial activities): https://www.mas.gov.sg/

------------------------------------------------------------------------

**Last reviewed:** 17 September 2026

**Review again:** Before any public beta, commercial launch, App
Store/Google Play submission, major change to financial-data processing,
introduction of bank connectivity, or introduction/change of an external
AI provider.

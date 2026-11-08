# Privacy implementation notes

Basic reading uses a local anonymous guest ID. Favorites, page progress, completion and downloads stay in browser/device storage; they are not sent to a child analytics service. There is no reader account requirement, advertising SDK, advertising identifier integration, behavioral advertising, public child profile, child messaging or purchase flow. The app requests no precise location or exact birthdate. Age filters are declared ranges.

Parent information and development entitlement controls use a simple arithmetic gate. This gate is a UI barrier, **not verified parental consent**. Production billing and parent authentication are absent. Future external navigation, account management and purchasing must retain appropriate parent controls.

The server necessarily handles HTTP requests and infrastructure logs. Hosting operators must define log redaction, retention, access, backups and deletion before launch. Media URLs contain short-lived scoped capabilities: redact query strings from production request logs. Do not log future subscription proofs or personal child data.

Local Favorites can be removed individually and downloads deleted in the app. Clearing the app's browser/device storage resets all guest state. A dedicated reset/export UI is not included. Future cloud profiles need explicit parent-managed export/deletion and a carefully designed guest-data migration.

No COPPA, app-store or other legal compliance certification is claimed. Before public distribution, obtain review appropriate to launch regions, finalize privacy notices and consent requirements, review all SDK/deployment data flows, assess the parental gate, establish retention/deletion procedures and test accessibility. No legal conclusion follows from these implementation choices alone.

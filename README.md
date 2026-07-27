# Ledgerly — Personal Expense Tracker

A full-stack personal finance dashboard built with TypeScript, React 19,
Next.js 16, Vinext/Vite, Cloudflare Workers, D1 and Drizzle ORM.

## Open in VS Code

1. Extract the ZIP file.
2. Open the extracted `ledgerly-personal-expense-tracker` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Check that Node.js 22.13 or newer is installed:

   ```bash
   node --version
   ```

5. Install the dependencies:

   ```bash
   npm install
   ```

6. Start the local development server:

   ```bash
   npm run dev
   ```

7. Open the local URL displayed in the terminal.

## Useful commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run db:generate
```

## Main folders

- `app/page.tsx` — dashboard and user interactions
- `app/globals.css` — complete responsive visual design
- `app/api/transactions` — transaction API endpoints
- `db/schema.ts` — D1 transaction table definition
- `db/index.ts` — database connection
- `drizzle` — generated SQL database migration
- `worker/index.ts` — Cloudflare Worker entry point

## Database note

The hosted application uses Cloudflare D1. The included Sites configuration
provides a local development binding when the project is run with its current
tooling. The production database and existing online transactions are not
contained in this ZIP.

## CSV import

The CSV parser is implemented in `app/page.tsx`. It detects common columns such
as Date, Description, Merchant, Amount, Debit and Credit. Different banks can
use different headings, so bank-specific formats may require small additions
to the matching logic.

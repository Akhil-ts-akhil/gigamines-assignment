# Giga Mines: Assignment Submission

Part 1 is a responsive React landing page. Part 2 is an architecture proposal with a runnable proof of concept.

## Part 1: Landing page (React + Vite)
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```
Features: 14-block page flow from the one-pager, mobile and desktop layouts, hero particle animation, interactive "Inside Giga Mines" zone explorer, count-up numbers, and an enquiry form with client-side validation (segment, name, email, phone, organisation, message, DPDP consent, honeypot spam field).
Palette follows the brief: navy #0F2840, orange #EE7B2B (navy text on orange buttons), blue #2E87C6. Respects `prefers-reduced-motion`.

**Form endpoint:** set `VITE_FORM_ENDPOINT` (for example in Vercel env vars) to a JSON POST endpoint. Without it the form simulates success.
**Placeholders:** statistics, partner logos, news and the final element list are marked "to be confirmed", as the one-pager lists them as needed before launch.

### Deploy
Vercel or Netlify: import the repo, build command `npm run build`, output directory `dist`.

## Part 2: Architecture + PoC
- Proposal: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Script:
```bash
cd poc
pip install -r requirements.txt
python pipeline.py samples --out output
```
Outputs `accepted.csv`, `review_queue.csv`, `failures.json`, `documents.db`, and a `quarantine/` folder.

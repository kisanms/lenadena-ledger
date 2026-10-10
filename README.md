# LenaDena Ledger

Build LenaDena: a mobile PWA digital ledger and khata app for Indian merchants, shopkeepers, and suppliers.

Main purpose:
- Two categories: Customers and Suppliers (with support for supplier-to-supplier credit records).
- Keep records of money to receive and money to pay.
- Support partial payments as well as full payments, properly deducting the amount and updating running balances automatically.
- Keep complete transaction history and passbook records for every customer and supplier.
- When a record is saved, offer one-tap WhatsApp sharing with a formatted balance and receipt message to their WhatsApp number, plus native Web Share sheet.
- Support importing contacts using the mobile Web Contact Picker API with fallback manual entry.
- Mobile PWA with persistent session caching so the app stays open on the dashboard and only asks for login upon explicit logout.
- First-time splash screen / onboarding shown once for new users.
- Authentication supporting Google Sign-In, 4-digit quick security PIN unlock (with biometrics fallback), and Email OTP.
- Cloud database storage with Lovable Cloud to persist contacts, transactions, running balances, and multi-device sync securely.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

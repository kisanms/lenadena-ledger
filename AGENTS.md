<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## LenaDena architecture
- Ledger data is read/written from the browser via the generated client with RLS (no server functions needed); party balances are maintained by a DB trigger on entries — never compute/write balance from the client.
- Entry direction: 'gave' increases balance, 'got' decreases; positive balance = money to receive.
- App gate (onboarding → login → PIN lock) lives in src/components/AppGate.tsx wrapping the root Outlet; PIN/biometric lock is device-local (localStorage), not an auth factor.

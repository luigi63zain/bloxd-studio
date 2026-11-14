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

- Load homepage counts through `loadHomeStats`; never request private community counts without a signed-in user, and discard results after identity changes to prevent stale disclosure.
- Wrap script outputs with the shared idempotent `withCodeCredit` helper at generation and sharing boundaries so old Forge scripts and new scripts receive the same credit without altering game behavior.
- The photo maker uses source-grounded pose assets and browser canvas export, keeping pose selection and downloads available without a paid generation request.
- Social rewards and staff gifts are authorized and deduplicated in database functions/triggers; clients only request actions, so currency cannot be edited directly.
- Post media uses short-lived signed URLs for signed-in readers; Forge file reads require an existing public creation or uploader ownership to avoid exposing unshared uploads.
- Forge creation imports preserve the original binary attachment alongside builder data; raw code remixes copy the source instead of opening an empty block canvas.

# AI prompts used

Tool: Claude Code CLI (with the Playwright MCP server for live DOM exploration).

Every prompt from the session, verbatim and in order. Lines starting with `!` are shell commands I ran
myself inside the Claude Code session. Notes in *italics* record what each prompt led to, and in
particular the places where the AI's output was wrong and got corrected.

## Part 1: framework and tests

1. > implement test automation using typescript an playwright use amielnoy@gmail.com as email and amielnoy as nick name use playwright best practices build automation frame work of 3 layest testflow flows and page objects
2. > according to the file

   *Pointed the AI at the assignment .docx, which defines the target (Talkspace signup) and the 10 tests.*
3. > use play wright mcp
4. > the verification email *(+ screenshot of the real Talkspace verification email)*

   *Correction: the AI had assumed verification by link. The email actually contains a 6-digit OTP code, so the mailbox, flow and tests were rewritten.*
5. > continue

   *The AI found that I had put a credential in `.env.example` (a committed file) and moved it to the gitignored `.env`. A test IMAP login showed it was not a Gmail App Password.*
6. > `! npm run test:e2e`

   *First real run of the tests that submit the form. All 3 failed because of a wrongly guessed locator: the OTP screen has no heading. Fixed from the page snapshot of the failed run.*
7. > npm test

   *8 of 10 passed. Test 5 expected the wrong error copy, and test 7 expected an "already registered" error that the app deliberately never shows (anti-enumeration). The AI also found that test 6 had passed without testing anything, because its loose matcher hit the "Password" label. All three were fixed from screenshots and live checks.*
8. > npm test

   *10/10 passed, 3 consecutive green runs.*
9. > run all tests headed with 5 seconds dely between the tests

## Part 2: GitHub, CI and reporting

10. > push to github
11. > Leave it if you're fine with it being public

    *Decision to keep the assignment .docx in the public repo.*
12. > add github actions pipeline for running the tests
13. > `! gh secret set GMAIL_APP_PASSWORD`

    *Without an interactive prompt this saved an empty secret, so tests 9 and 10 kept skipping in CI.*
14. > add allure and allure steps to all tests publish results to github pages

    *Correction: Playwright's own steps echoed the typed password into the public report, so they were hidden (`detail: false`). A test that failed on purpose also showed that error-context page snapshots print password values. Traces and error-context files are stripped before publishing.*
15. > add @step function to add step descriptions on each test step
16. > fix the 2 skipped tests to pass *(+ screenshot of the 2 skipped tests in the Allure report)*
17. > `! grep '^GMAIL_APP_PASSWORD=' .env | cut -d= -f2- | tr -d ' \n' | gh secret set GMAIL_APP_PASSWORD`

    *Set the secret from `.env` without exposing it. After that, all 10 tests passed in CI.*
18. > the last github actions run has 2 skipped tests

    *That was an older run on the same commit, started before the secret was set. Re-running it gave 10/10.*
19. > please again again a link for allure report on github pages
20. > add the run-name to the workflow

    *Correction: the first version showed the whole multi-line commit message as the title. Now `run-name` only titles manual runs and otherwise falls back to GitHub's default.*
21. > add the allure link to gh actions on the summary
22. > put all prompts here on claude cli in PROMPTS.md
23. > upgrade the github actions versions

    *Release notes checked first: upload-pages-artifact v4+ skips dotfiles (the report has none) and deploy-pages needs `actions: read`. The Node 20 deprecation warnings are gone.*
24. > build me the word file for the part2 of the assignment on pdf file in the root of the repo
25. > make 2 of the short tests data drriven tests load the fields to set and expected results from json

    *Expected results were taken from the live app before being written to the JSON. That surfaced a second password rule and nickname-aware strength scoring. Correction: the "submit is blocked" assertion was vacuous, because the error was already visible before the click. It now proves that no `POST /v2/registration` was sent, and the check was verified to detect a real submit.*
26. > update all docs

    *README rewritten to match the current state (18 test cases, data-driven tests, Allure, CI summary and run titles, new findings). Fixed `<reason>`-style placeholders that GitHub would have removed as HTML tags. Part 2 document regenerated.*

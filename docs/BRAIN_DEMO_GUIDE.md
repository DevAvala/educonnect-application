# Student Brain: presenting the demo

The frontend can be shown **with no backend, no login and no internet** (apart from cosmetic Google Fonts).
Everything on screen is invented. Nothing is sent anywhere or saved.

## Run it (safest: on your own laptop)

```bash
git checkout claude/gracious-curie-ylyt1w
npm install
npm run dev:demo            # opens on http://localhost:5173  (add --port if busy)
```

For a faster, steadier build (recommended on stage):

```bash
npm run build:demo
npm run preview:demo        # serves the built demo
```

Both read `.env.demo` (`VITE_BRAIN_DEMO=true`). A normal `npm run dev` / `npm run build` is **unaffected**:
it still shows the real sign-in page and calls the real API. Demo mode is checked at build time, so it cannot
be switched on in a production build by accident or by editing the browser.

> **Never set `VITE_BRAIN_DEMO` on your real/production hosting project.** If you want a shareable link, make a
> separate demo project that points at this branch and set `VITE_BRAIN_DEMO=true` and
> `VITE_API_URL=https://demo.invalid` there only.

## Put it on Vercel as a shareable link

Use a **separate Vercel project** for the demo. Do not touch your real one.

1. Vercel dashboard, **Add New, Project**, then import `DevAvala/educonnect-application`.
2. On the configure screen: **Framework Preset** = Vite, **Build Command** = `npm run build:demo`,
   **Output Directory** = `dist`. Add **no** environment variables (the demo settings come from `.env.demo`).
3. Click Deploy. The first build uses the repo's default branch (`dev`), which does not have demo mode, so it
   will fail. That is expected.
4. Make Vercel build the demo branch: either push any new commit to `claude/gracious-curie-ylyt1w`
   (for example `git commit --allow-empty -m "trigger demo deploy" && git push`), or in the project go to
   **Settings, Environments, Production, Branch Tracking** and set the branch to
   `claude/gracious-curie-ylyt1w`, then redeploy.
5. Open the deployment URL. You should see "Student Brain, Preview with demo data".
6. If other people need to open the link without a Vercel login: **Settings, Deployment Protection**, turn off
   Vercel Authentication for this demo project. The data is all invented, so this is safe here.

The repo's `vercel.json` already sends every path to `index.html`, so deep links such as
`/dashboard/teacher/brain` work.

If the build fails on Vercel, set **Node.js Version** to 22.x under Settings, General.

## Before you present (5 minutes)

- [ ] Run it once end to end. Refreshing the page resets everything to the starting data.
- [ ] Use a fresh browser window, zoom 100% to 110%, notifications off.
- [ ] Have `docs/demo/test3-marks-sample.csv` and `docs/demo/test3-marks-with-errors.csv` on the desktop.
- [ ] Stay on the **Student Brain** menu item. The other menu items (Dashboard, My Classes, Attendance) are existing
      pages with no demo data, so they will look empty.
- [ ] Have your phone ready: the app is built mobile-first. Open the same address on the venue Wi-Fi.

## Suggested walk-through (about 7 minutes)

1. **Open the app, choose "Teacher view".** "Every student's brain in one place."
2. **Student brains page.** Eight students, each with a small brain. Click **"Arithmetic progressions 5"**.
   "These five students could use support here." Point out the "Not included above" note: students with too
   little evidence are never called behind.
3. **Open the first student.** The animated brain. Tap a point; it shows the evidence behind it. Click
   **"See the assessments behind this"** to show every figure is traceable to a test.
4. **Class insights tab.** Click a topic to jump to the matching students.
5. **Assessments tab, then "Mathematics Mid-Term Exam".** Suggested topics are only suggestions and must be
   approved by the teacher. Edit one question to share its marks between two topics. Approve.
6. **Assessments, "Mathematics Test 3", Enter marks.** Type `9` into a cell (rejected: over the maximum). Type
   `A` for absent. Point out blank is *not* zero. **Import report**: upload `test3-marks-with-errors.csv` to show
   the preview catching problems, then `test3-marks-sample.csv` to apply cleanly.
7. **Back to the entry page (open `/`), choose "Parent view".** The child's learning map, the plain-words
   summary, the animated brain, and the toggle to a second child.

## What to say honestly

- **All data is demo data.** The screens are real; the students and marks are invented.
- **No AI is connected yet.** "Suggest topics" is a stand-in. The plan is to use DeepSeek; it is not set up.
  Do not describe any screen as "AI-powered" tonight.
- **The cut-offs are provisional.** The bands (strong, well, developing, needs focused practice) and the minimum
  evidence rules will be agreed with schools.
- **Backend is next.** The screens are ready; the server work is written up in `docs/STUDENT_BRAIN_API_CONTRACT.md`.
- **It never says why a mark was lost.** EduConnect only sees question-level marks, not written answers.
- **No student view.** Student Brain is for teachers and parents.

## If something goes wrong

- Blank page or odd state: refresh. It resets to the starting data.
- Sent back to the entry page: choose Teacher or Parent again.
- Fonts look different offline: harmless; the app falls back to system fonts.

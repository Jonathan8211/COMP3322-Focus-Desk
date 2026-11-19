# FocusDesk — Project Proposal

**COMP3322 Modern Technologies on World Wide Web**
**Project format:** Individual project
**Deployed application:** https://c3322-pg23.cs.hku.hk (HKU VPN access; self-signed HTTPS certificate)

## 1. Member information and preliminary task allocation

| Public repository account | Project format | Planned responsibilities |
| --- | --- | --- |
| Jonathan8211 | Individual project | Define requirements and user journeys; design the interface and MySQL schema; implement the React frontend, Express API and Docker deployment; test functionality, account isolation and responsive layouts; prepare documentation and presentation. |

The student's full name and student number are provided through the private course submission, rather than published in this public repository. The full project scope belongs to one student; no team roles are assigned to other people.

## 2. Project title and one-paragraph description

**FocusDesk** is a responsive personal workspace for students and other self-directed users who want to plan work and reflect on their progress in one place. After signing in, a user can organize tasks into projects and checklists; view the same tasks as a list, board, table or calendar; write grouped notes and dated journal entries; and monitor progress on a dashboard. Themes and an animated animal companion make the experience more inviting. Optional, consent-based DeepSeek features can estimate a journal entry's mood and create a narrative weekly or monthly review, while the planning and writing tools remain usable without the AI service. The application runs in a browser on desktop and phone screens and keeps each user's records in a private account.

## 3. Problem and target-user context

Students often keep deadlines, project tasks, notes and daily reflections in separate places. This makes it harder to see what needs attention today, what has been completed and how an experience relates to ongoing work. FocusDesk brings these activities into one personal workspace without requiring an elaborate team-management system. Its target users are individual students and others managing their own study or work.

A responsive web application fits this pattern: users may plan at a desk, check a deadline on a phone and return later to write a journal entry. A single account and server-side database keep those views consistent. The product is a planning and reflection aid, not an hourly calendar, clinical mood assessment or automatic task planner.

## 4. Feature list and scope

The categories below are separate. **Must-have** features form the complete core workflow; **Nice-to-have** features were added only after that workflow was functional.

### Must-have: core features

| ID | Feature | User-visible result |
| --- | --- | --- |
| M1 | Accounts and private records | Register, sign in and sign out; return to saved data. Requests are scoped to the signed-in account. Email is a login identifier; the app does not send verification or recovery email. |
| M2 | Tasks and checklists | Create, edit, filter, complete, reopen and delete tasks. Set priority, optional due date, project and recurrence. Add and tick checklist items, see progress, and carry reset items into a recurring task's next instance. |
| M3 | Projects | Create, view and remove personal projects; group tasks by project. Removing a project leaves its tasks intact. |
| M4 | Connected task views | Use list, three-column board, table, completed view and month calendar for the same tasks. The board supports moving tasks between columns. Calendar day cells show due-task titles and a selected day's tasks; it is not an hourly scheduler. |
| M5 | Notes and daily journal | Write rich-text notes, organize them into one-level groups or leave them unfiled. Save a journal entry and separate reflection for a selected local date; return to, edit or delete past entries. |
| M6 | Progress dashboard | See task totals, pending, completed and overdue counts, a completion rate and a chart. |
| M7 | Appearance settings | Choose Cute, Luxe or Dark theme and retain the choice between visits. |
| M8 | Focus companion | Choose a cat, dog, rabbit, fox or goose, or hide the companion. Completing a task briefly triggers a celebration without blocking core controls. |
| M9 | Reproducible deployment | Run the responsive web app, REST API and persistent MySQL database with Docker Compose on the course Linux server. |

### Nice-to-have: optional features delivered after the core

| ID | Feature | User-visible result and boundary |
| --- | --- | --- |
| N1 | Animated companion | The selected pet walks within its panel and cycles through eating, playing and sleeping, with varied direction and duration. Animations adapt to reduced-motion preferences and small screens. |
| N2 | Opt-in journal mood estimate | After the user reviews and confirms sending a saved journal entry, DeepSeek returns an estimated integer mood score (0–100) and brief comment. The score is stored with the entry. Scores below 60 trigger a short five-pet comfort gesture; scores above 85 trigger the selected pet's celebration; other scores leave the ordinary cycle in place. The estimate is for reflection, not diagnosis. |
| N3 | Opt-in weekly and monthly reviews | The user chooses a week or month and previews all recorded task completions, saved journal text and available mood scores for that period before confirming an AI request. The result is a concise narrative of accomplishments, experiences and recorded mood. If the period exceeds the request limit, the AI review is unavailable rather than silently omitting records; factual counts remain available. Reflection fields are excluded from the material sent to DeepSeek. |

Daily AI planning or first-open reminders, yearly reviews, email recovery, external calendar integration and hourly scheduling are **not** implemented features of this release. AI suggestions do not create or change tasks.

## 5. High-level user workflow

1. A new user registers; a returning user signs in and opens the dashboard. The interface shows the user's own task summary and clear empty states when no data exists.
2. The user creates a project and task, adds a due date or recurrence rule if needed, and breaks the task into checklist items. Validation messages explain invalid input.
3. The user checks the task in the list, board, table or month calendar. Completing it updates the views and dashboard; the chosen pet briefly celebrates. A recurring task generates its next instance with unchecked checklist items.
4. The user groups notes for a project, then selects a journal date to write about the day and add a separate reflection. Earlier dates can be reopened and edited.
5. If desired, the user requests a mood estimate for a saved journal entry or opens Reviews for a week or month. In both cases, the user sees what will be sent and confirms before DeepSeek is contacted. The core app remains usable if that service is unavailable.
6. The user can change the theme or pet in Settings, sign out and later resume with the same account data.

**Main page flow:** Register / Sign in → Dashboard → Tasks / Projects → Task details and checklist; the same task is available through Board, Table, Completed and Calendar. Notes, Journal, Reviews and Settings are reached from the workspace navigation.

## 6. Full technology stack and external integrations

| Layer | Selected technology | Role |
| --- | --- | --- |
| Frontend SPA | React 19, React Router 7, Vite 8, Tailwind CSS 4 | Responsive single-page interface, routes, styling and production build. |
| UI and dates | dnd-kit, Tiptap, TanStack Table, Recharts, Luxon | Board interaction, rich-text notes, tabular tasks, charting and local-date handling. |
| Backend REST API | Node.js 22, Express 5, Joi | Resource endpoints, authentication, validation and business rules, with appropriate HTTP status codes. |
| Data and sessions | MySQL 8.4 via mysql2; JWT and password hashing | Sole server-side database, versioned schema migrations, account-scoped records and authenticated sessions. |
| Deployment | Docker Compose on a Linux VM; Caddy | Separate web, API and MySQL containers; static SPA hosting and `/api` reverse proxy; persistent database volume. MySQL has no public port. |
| Optional external service | DeepSeek API | Consent-based mood estimates and weekly/monthly narrative reviews only. The API credential is kept outside the public source repository and is available only to the server-side API. |

The public repository includes Dockerfiles, Compose configuration, an example environment file and deployment instructions. Real credentials and private certificate keys are excluded. The repository README documents the deployed URL and how to rebuild the application.

## 7. Anticipated learning challenges and self-assessment

| Challenge | Why it matters | Practical plan |
| --- | --- | --- |
| Protecting multi-user data | A polished interface is insufficient if a user can access another user's tasks, notes or journal. | Learn the session and protected-route flow; validate inputs server-side; check ownership in database queries; test two accounts against cross-user read, update and delete attempts. |
| Keeping tasks and dates consistent | One task appears in several views and can have recurrence, checklist items and a local due date. | Keep the API and MySQL as the source of truth; use transactions for related writes; record real completion events; test recurrence, refresh, date boundaries and several time zones. |
| Building a responsive and dependable deployment | React, Express, MySQL and Docker must work together on a resource-limited Linux VM; an optional AI service may time out or fail. | Check key journeys at desktop and phone widths; run lint, build and API checks; verify Compose startup and database persistence; test explicit AI consent and a graceful failure path while preserving the core workflow. |

## 8. Completion and review criteria

The core release is ready for review when a user can perform the workflow in Section 5 on the deployed application; task changes stay consistent across views; private records remain account-scoped and persist after refresh and container restart; invalid input receives a clear response; and essential pages remain usable on desktop and phone screens. Optional AI features additionally require explicit preview and confirmation, clear failure handling and no automatic changes to tasks. The committed source and deployment files should reproduce the running application without placing real secrets in Git.

| Review area | Concrete check | Expected result |
| --- | --- | --- |
| Planning workflow | Create a project and dated task, add checklist items, complete it and reopen another task view. | Task state stays consistent across views, the due task is visible on the calendar, and checklist progress remains correct in task details. |
| Private writing | Save a grouped note and a journal entry, sign out, sign back in and reopen an earlier date. | Both records remain available to their owner; another account cannot access them. |
| Optional AI | Preview and confirm a mood estimate or period review, then repeat with the external service unavailable. | Only confirmed material is sent; the user receives a clear failure message and can still use tasks, notes and journal. |
| Production deployment | Rebuild with the documented Compose setup and restart the containers. | The SPA, API and MySQL start successfully, stored records persist, and no real credential is in the public repository. |

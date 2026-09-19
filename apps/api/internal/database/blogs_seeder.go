package database

import (
	"log"
	"time"

	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/models"
)

// demoBlogSlugs are the framework demo posts the Grit scaffold used to seed.
// They are not Megagig content, so SeedBlogs removes them (by these exact
// slugs only — a post written in admin is never touched).
var demoBlogSlugs = []string{
	"getting-started-with-grit",
	"building-modern-apis-with-go-and-gin",
	"the-power-of-monorepo-architecture",
	"advanced-rbac-patterns",
}

// SeedBlogs replaces the Grit demo posts with four starter posts and only
// seeds while no posts exist, so admin-written posts are never overwritten.
//
// The four posts are DRAFTS the founder asked for, meant to be reviewed and
// edited in admin. They are evergreen guidance: no invented statistics,
// client stories, results or quotes, and no author is assigned (the public
// byline falls back to the company name). The few Nigeria-specific facts
// (VAT rate, the Nigeria Data Protection Act, Paystack/Flutterwave) should
// be re-verified before launch — tax rules and rates change.
func SeedBlogs(db *gorm.DB) error {
	// Hard delete: the slug column has a unique index that soft-deleted rows
	// would keep occupying.
	if res := db.Unscoped().Where("slug IN ?", demoBlogSlugs).Delete(&models.Blog{}); res.Error != nil {
		return res.Error
	} else if res.RowsAffected > 0 {
		log.Printf("Removed %d Grit demo blog posts", res.RowsAffected)
	}

	var count int64
	db.Model(&models.Blog{}).Count(&count)
	if count > 0 {
		log.Println("Blogs already seeded, skipping...")
		return nil
	}

	day := 24 * time.Hour
	now := time.Now()
	published := func(daysAgo int) *time.Time {
		t := now.Add(-time.Duration(daysAgo) * day)
		return &t
	}

	blogs := []models.Blog{
		{
			Title:          "AI Automation for Nigerian Businesses: Where to Start and What to Automate First",
			Slug:           "ai-automation-for-nigerian-businesses",
			Excerpt:        "AI automation is not about replacing your team. It is about taking repetitive digital work off their desks. Here is how to pick the right first workflow, keep people in control, and design for the way Nigerian businesses actually operate.",
			Tags:           []string{"AI Automation", "Business Operations"},
			SEOTitle:       "AI Automation for Nigerian Businesses: What to Automate First",
			SEODescription: "A practical guide to AI automation for Nigerian businesses: how to choose your first workflow, keep humans in the loop, and design for WhatsApp, connectivity and data privacy.",
			Published:      true,
			PublishedAt:    published(2),
			Content: `<h2>What AI automation actually means</h2>
<p>When people hear "AI automation", they often picture robots replacing staff. In practice, most useful automation is far more modest and far more valuable: taking repetitive digital work off people's desks so they can spend their time on judgement, relationships and problem-solving.</p>
<p>Reading and sorting incoming messages, copying figures from a receipt into a spreadsheet, drafting a routine reply, summarising yesterday's sales, chasing an unpaid invoice — none of this needs a person's best thinking, yet it consumes hours every week in almost every business.</p>

<h2>Start with the work, not the technology</h2>
<p>The most common mistake is starting with a tool ("we should use AI") instead of a problem ("we lose an hour a day to this"). Begin by listing the tasks your team repeats most often, then look for the ones that fit a pattern. Good first candidates tend to include:</p>
<ul>
<li><strong>Customer enquiries.</strong> Triaging incoming WhatsApp, email and web messages, answering common questions and routing the rest to the right person.</li>
<li><strong>Document data entry.</strong> Pulling amounts, dates and names out of invoices, receipts and forms and posting them into your accounting or inventory system.</li>
<li><strong>Reporting.</strong> Producing a plain-language daily or weekly summary of sales, stock and cash position instead of someone assembling it by hand.</li>
<li><strong>Follow-ups.</strong> Reminding customers about overdue payments, appointments or renewals, in the right tone, at the right time.</li>
<li><strong>Internal search.</strong> Letting staff ask a question and find the answer in your own policies, price lists and procedures.</li>
</ul>

<h2>A simple test for your first workflow</h2>
<p>Not every task is worth automating. Before you commit, ask four questions:</p>
<ol>
<li><strong>Is it frequent?</strong> A task done daily repays the effort far faster than one done twice a year.</li>
<li><strong>Does it follow a pattern?</strong> If a sensible new hire could learn the rules in a day, software probably can too.</li>
<li><strong>What does a mistake cost?</strong> Start where an occasional error is cheap to catch and fix, not where it could cost you a customer or a large payment.</li>
<li><strong>Is the data available?</strong> Automation needs inputs it can actually reach. If the information lives in someone's head or a paper file, digitising it is step one.</li>
</ol>

<h2>Keep a person in the loop</h2>
<p>AI systems are very good at producing a draft and occasionally wrong with great confidence. For anything that involves money, commitments to customers or sensitive information, design the workflow so the AI prepares and a person approves. Over time, as you see how reliable the automation is, you can let low-risk steps run on their own and keep review on the high-risk ones.</p>
<blockquote><p>The goal is not to remove people from the process. It is to remove the boring parts so that people can do the parts that need them.</p></blockquote>

<h2>Design for Nigerian realities</h2>
<p>Tools built for other markets often stumble on local conditions. When you plan an automation project here, build these in from the start:</p>
<ul>
<li><strong>WhatsApp is where customers are.</strong> Many businesses run sales and support largely through WhatsApp, so automation that only works through email or a web form misses the main channel.</li>
<li><strong>Messages are informal and multilingual.</strong> Customers mix English, Pidgin and local languages, with abbreviations and voice notes. Test any AI component on your real messages, not just on textbook examples.</li>
<li><strong>Connectivity is uneven.</strong> Workflows should queue work and retry when a connection drops rather than failing silently.</li>
<li><strong>Costs move with the exchange rate.</strong> Many AI services bill in US dollars based on usage, so budget for currency movement and monitor usage so a busy month does not produce a surprise bill.</li>
<li><strong>Personal data needs care.</strong> The Nigeria Data Protection Act sets expectations for how personal data is collected and handled. Be deliberate about what customer information you send to third-party AI services, and get advice on your obligations.</li>
</ul>

<h2>Start small, then expand</h2>
<p>Pick one workflow. Map how it works today, step by step, including the awkward exceptions. Build a small version, run it alongside the manual process for a while, and compare results honestly. Only when it is reliable should you widen it or move to the next task.</p>
<p>A few mistakes come up again and again:</p>
<ul>
<li>Automating a process that is already broken, which just makes the mess faster.</li>
<li>Having no owner, so nobody notices when it quietly stops working.</li>
<li>Skipping a fallback, so a single failure stops the business.</li>
<li>Promising staff or customers more than the system can reliably deliver.</li>
</ul>

<h2>How we approach it</h2>
<p>At Megagig, we start by understanding the workflow as your team actually runs it, then choose the smallest automation that removes real effort, with review steps where the stakes are high. If you would like to explore where automation could help in your business, take a look at our <a href="/services/ai-automation">AI automation service</a>, or <a href="/start-project">tell us about your project</a> and we will get back to you with next steps.</p>`,
		},
		{
			Title:          "Accounting Software Implementation: A Practical Guide for Growing Nigerian Businesses",
			Slug:           "accounting-software-implementation-guide",
			Excerpt:        "Most accounting software projects that struggle do so because of process and data, not the software. This guide walks through preparing your chart of accounts, migrating data cleanly, handling Nigerian tax and payment realities, and going live with confidence.",
			Tags:           []string{"Accounting Software", "Business Operations"},
			SEOTitle:       "Accounting Software Implementation Guide for Nigerian Businesses",
			SEODescription: "How to implement accounting software in a growing Nigerian business: chart of accounts, data migration, VAT and payment reconciliation, training and a safe go-live.",
			Published:      true,
			PublishedAt:    published(9),
			Content: `<h2>Why implementations struggle</h2>
<p>When an accounting software rollout goes badly, the software is rarely the real problem. The usual causes are messy opening data, no agreed way of recording transactions, and a team that was never properly trained. The good news is that all three are within your control, and all three are easier to fix before go-live than after.</p>

<h2>Map how money actually moves</h2>
<p>Before you compare features, write down how money flows through your business today. Be specific:</p>
<ul>
<li>How do customers pay you: cash, bank transfer, POS terminals, card gateways, mobile money, cheques?</li>
<li>Who receives that money, and where does it land first?</li>
<li>How many bank accounts, branches or outlets do you have?</li>
<li>Who raises invoices, who approves purchases, and who reconciles the bank?</li>
<li>Who needs which reports, and how often?</li>
</ul>
<p>This map becomes your requirements list. It also exposes gaps, such as cash handled by people who never record it, that no software can fix on its own.</p>

<h2>Design your chart of accounts first</h2>
<p>The chart of accounts is the skeleton of your books. A chart that mirrors how you manage the business, with revenue split by product line or branch, costs grouped in a way managers understand, and clear separation of assets, liabilities and equity, makes reports useful from day one. Copying a generic template and adjusting later usually means re-mapping months of data.</p>
<p>Agree the structure with whoever will read the reports, ideally with your accountant, before anything is entered.</p>

<h2>Migrate data carefully</h2>
<p>Data migration is where most of the effort hides. Treat it as its own mini-project:</p>
<ol>
<li><strong>Choose a cut-off date.</strong> A clean period end, such as the start of a month or financial year, makes opening balances easy to verify.</li>
<li><strong>Clean before you import.</strong> Remove duplicate customers and suppliers, fix inconsistent names, and settle old disputed balances. Importing mess just relocates it.</li>
<li><strong>Bring across only what you need.</strong> Opening balances, open invoices and bills, customer and supplier lists, and current stock are usually enough. Years of detailed history can stay in the old system for reference.</li>
<li><strong>Reconcile the result.</strong> After import, confirm that the trial balance, receivables, payables and stock values match the old system to the naira.</li>
</ol>

<h2>Handle Nigerian tax and payment realities</h2>
<ul>
<li><strong>Tax must be configurable.</strong> VAT is charged at 7.5% at the time of writing, and withholding tax applies to certain payments. Tax rates and rules change, so make sure they are settings you can update rather than values baked into the system, and confirm current requirements with a qualified accountant.</li>
<li><strong>Reconcile many channels.</strong> Payments often arrive through several banks, POS providers and gateways such as Paystack or Flutterwave, which settle in batches and net off their fees. Your setup should let you match a single settlement to the many sales inside it.</li>
<li><strong>Record cash properly.</strong> If a lot of your trade is in cash, decide who records it, when, and how it is banked, then build that routine into the software.</li>
</ul>

<h2>Set roles and controls</h2>
<p>Decide who can create, approve, edit and delete which records. Separate duties where you can: the person who raises a payment should not be the only one who approves it. Good permissions protect the business and also protect honest staff from suspicion when something goes wrong.</p>

<h2>Train people and run in parallel</h2>
<p>Train each person on the tasks they will actually perform, using your real examples, not generic demos. Then run the old and new systems side by side through one full month-end. Differences you find during a parallel run are cheap lessons. The same differences found after you have switched off the old system are expensive ones.</p>

<h2>A go-live checklist</h2>
<ol>
<li>Chart of accounts approved and loaded.</li>
<li>Opening balances reconciled to the old system.</li>
<li>Tax rates and rules set up and checked.</li>
<li>Bank and payment accounts connected or ready for import.</li>
<li>User roles and approvals configured.</li>
<li>Staff trained and a named person available to answer questions.</li>
<li>Parallel run completed and differences explained.</li>
<li>A backup taken before the switch.</li>
</ol>

<h2>After go-live: let the software do more</h2>
<p>Once the basics are stable, look at where automation can save effort: recurring invoices, payment reminders, automatic bank statement imports, and scheduled management reports. Small automations like these often deliver more than any new feature.</p>
<p>If you would like help getting accounting processes and software working smoothly together, see our <a href="/services/accounting-software-automations">accounting software automations</a> service, or <a href="/start-project">tell us about your project</a> and we will suggest a sensible starting point.</p>`,
		},
		{
			Title:          "Custom Software Design: Getting It Right Before Writing a Line of Code",
			Slug:           "custom-software-design-before-you-build",
			Excerpt:        "The most expensive mistakes in custom software are made before anyone writes code. Learn when custom software makes sense, how to define a sensible first release, and what to design up front so the system can grow with your business.",
			Tags:           []string{"Custom Software", "Product Design"},
			SEOTitle:       "Custom Software Design: What to Decide Before You Build",
			SEODescription: "When to build custom software, how to scope a first release, and the design decisions worth making before development starts: users, workflows, data, integrations and ownership.",
			Published:      true,
			PublishedAt:    published(16),
			Content: `<h2>Design decides the outcome</h2>
<p>Custom software succeeds or fails largely on decisions made before development begins: who it is for, what problem it solves, and what the first version should include. A well-designed system is cheaper to build, easier to use and far easier to change. A poorly designed one costs more at every stage.</p>

<h2>Is custom software the right choice?</h2>
<p>Off-the-shelf software is often the right answer, and a good partner will tell you so. Custom software starts to make sense when:</p>
<ul>
<li>Your process is a genuine competitive advantage and generic tools force you to work around it.</li>
<li>You are stitching together several tools with spreadsheets and manual copying between them.</li>
<li>You need to integrate with local systems, such as banks, payment providers or messaging channels, that standard products handle poorly.</li>
<li>You want to own and control the platform, especially if you plan to offer it to your own customers as a product.</li>
</ul>
<p>If a standard tool covers about eighty per cent of your needs and the rest can be handled by a small change in how you work, start there.</p>

<h2>Start with people and problems</h2>
<p>Before any screens or database tables, answer these questions in plain language:</p>
<ol>
<li>Who will use the system, and what are their different roles?</li>
<li>What are the three to five things each of them must be able to do?</li>
<li>What is painful about how they do it today?</li>
<li>How will we know, after launch, that it worked?</li>
</ol>
<p>Talk to the people who will actually use the software, not only the people who manage them. The person entering data at the counter usually knows things the office never sees.</p>

<h2>Scope a small first release</h2>
<p>The urge to include everything in version one is the surest route to delay and overspend. Instead, sort every request into three groups:</p>
<ul>
<li><strong>Must have:</strong> the system is useless without it.</li>
<li><strong>Should have:</strong> valuable, but the business can operate without it for a while.</li>
<li><strong>Later:</strong> good ideas that can wait until real usage shows what matters.</li>
</ul>
<p>Ship the must-haves, put the software in front of real users, and let their feedback shape what comes next. It is much cheaper to add a feature people are asking for than to remove one nobody uses.</p>

<h2>Design the data and the workflow first</h2>
<p>The data model, meaning what things the system tracks and how they relate, is the hardest part to change later. Spend time on it. Sketch the key records (customers, orders, invoices, stock, approvals), how they connect, and what states they move through.</p>
<p>Then prototype the screens before building them. Clickable mock-ups let users react to something concrete, and changing a drawing costs a fraction of changing finished code. Good <a href="/services/ui-ux-design">UI and UX design</a> at this stage removes most surprises later.</p>

<h2>Plan for the real environment</h2>
<ul>
<li><strong>Connectivity.</strong> If users work in places with unreliable internet, decide early whether parts of the system must work offline and sync later.</li>
<li><strong>Integrations.</strong> List the payment, messaging, accounting and banking systems you will need to connect to, and check their documentation and costs before you commit to a design.</li>
<li><strong>Devices.</strong> Know whether people will use phones, tablets, desktop computers or all three, and design for the smallest and oldest of them.</li>
<li><strong>Permissions.</strong> Decide who can see and change what. It is far easier to design roles in from the start than to bolt them on.</li>
</ul>

<h2>Build for change</h2>
<p>Your business will change, so the software must be able to change with it. That means a modular structure, automated tests that catch regressions, a repeatable way to deploy updates, and documentation that lets another developer understand the system. These are not luxuries. They are what keep the cost of the tenth feature close to the cost of the first.</p>

<h2>Be clear about ownership</h2>
<p>Agree in writing who owns the source code, where the system will be hosted, who holds the accounts and credentials, and what happens if you and your developer part ways. You should never be in a position where the system that runs your business cannot be maintained by anyone but one person.</p>

<h2>What drives cost</h2>
<p>Every project is different, which is why we scope and quote each one individually. The biggest drivers are usually the number of user roles, the number and complexity of integrations, data migration from existing systems, reporting requirements and the platforms involved. A clear brief and a well-scoped first release keep all of these under control.</p>

<h2>Red flags when choosing a partner</h2>
<ul>
<li>A fixed price offered before anyone has asked about your workflow.</li>
<li>No discussion of who owns the code or where it will be hosted.</li>
<li>No plan for testing, deployment or support after launch.</li>
<li>Reluctance to show you working software early and often.</li>
</ul>
<p>If you are thinking about a custom system, read more about our <a href="/services/custom-software-saas">custom software and SaaS development</a>, or <a href="/start-project">start a conversation</a> about your project.</p>`,
		},
		{
			Title:          "Building Mobile Apps for Nigeria: Offline-First, Low-Data and Built for Real Devices",
			Slug:           "building-mobile-apps-for-nigeria",
			Excerpt:        "A mobile app that works beautifully on a fast connection and a flagship phone can fail in the field. Here is how to design and build apps that hold up on patchy networks, limited data and the devices people actually use in Nigeria.",
			Tags:           []string{"Mobile Apps", "Product Design"},
			SEOTitle:       "Building Mobile Apps for Nigeria: Offline-First and Low-Data",
			SEODescription: "Practical guidance for building mobile apps in Nigeria: offline-first design, low-data usage, testing on real devices, payments, notifications and choosing between native and cross-platform.",
			Published:      true,
			PublishedAt:    published(23),
			Content: `<h2>Build for where your users really are</h2>
<p>An app that runs smoothly on a fast office connection and a recent flagship phone can be frustrating or unusable in the field. Nigerian users often deal with fluctuating networks, data costs that make every megabyte count, and a wide range of Android devices, including older and lower-spec phones. The apps that succeed here are designed for those conditions from the first sketch, not patched for them at the end.</p>

<h2>Choose your platforms deliberately</h2>
<p>Android is widely used across Nigeria, so it is usually the first platform to support. But your audience decides. A product aimed at a particular professional or higher-income group may need iOS from day one. Look at who your users are, what phones they carry and how they will find the app, then pick the platforms that reach them rather than trying to be everywhere at once.</p>

<h2>Design offline-first</h2>
<p>Offline-first means the app works with no connection by default and treats the network as a bonus. In practice that involves:</p>
<ul>
<li><strong>A local database</strong> on the phone that holds the data people need in front of them.</li>
<li><strong>A sync queue</strong> that records what the user did while offline and sends it when a connection returns.</li>
<li><strong>Clear conflict rules</strong> for when two people change the same record. Decide up front whether the latest change wins, or whether someone must review it.</li>
<li><strong>Honest feedback</strong> so users can see what has synced, what is waiting and what failed.</li>
</ul>
<p>This is more work than a screen that simply calls an API, but for a point-of-sale, a field agent or a pharmacy counter, it is the difference between a tool people trust and one they abandon. It is the approach behind our own products, such as <a href="/product/pharmacycopilot">PharmacyCopilot</a>.</p>

<h2>Respect your users' data</h2>
<ul>
<li>Keep payloads small and request only what a screen needs.</li>
<li>Compress and resize images before they are uploaded or downloaded.</li>
<li>Cache what does not change often, so it is not fetched again.</li>
<li>Avoid autoplaying video and large background downloads.</li>
<li>Keep the app itself small, since download size affects who will install it.</li>
</ul>

<h2>Test on real devices</h2>
<p>Emulators on a fast laptop hide problems. Test on inexpensive, older Android phones with limited memory, on slow and interrupted networks, and with low battery. Watch for slow start-up, laggy scrolling, memory crashes and screens that assume a large display. If it feels acceptable on a modest phone, it will feel excellent on a good one.</p>

<h2>Payments and identity</h2>
<p>Most apps that take money will integrate a provider such as Paystack or Flutterwave, and it is worth designing for failure: a payment can be slow, time out or succeed after the app has closed. Always confirm payment status on the server, never trust only what the app reports, and give users a clear way to check what happened. For sign-in, one-time codes by SMS are common, but delivery can be delayed, so offer a resend option and consider alternatives such as a code delivered another way.</p>

<h2>Notifications need a plan B</h2>
<p>Push notifications are convenient but not guaranteed to arrive on time, or at all, on every phone. For messages that really matter, such as an order confirmation or a security alert, provide a fallback such as SMS or WhatsApp, and make sure the app shows the same information when it is next opened.</p>

<h2>Native or cross-platform?</h2>
<p>For most business apps, a cross-platform approach such as React Native with Expo lets one team build and maintain Android and iOS versions from a shared codebase, which reduces both cost and the chance of the two drifting apart. Fully native development is worth considering when you need deep hardware access or very demanding performance. Choose based on your requirements, not fashion.</p>

<h2>Security and privacy</h2>
<p>Store tokens and sensitive data in the platform's secure storage, use encrypted connections, and collect only the personal data you genuinely need. The Nigeria Data Protection Act sets out obligations for handling personal data, so build privacy in from the start and take advice on what applies to your app.</p>

<h2>Before you launch</h2>
<ol>
<li>Works fully offline for its core tasks, and syncs reliably afterwards.</li>
<li>Tested on low-end devices and slow networks.</li>
<li>Payments verified server-side, with clear success and failure states.</li>
<li>Crash and error reporting in place so you hear about problems quickly.</li>
<li>Store listing, screenshots and privacy policy ready for review.</li>
<li>A plan for updates, support and feedback after release.</li>
</ol>
<p>Thinking about a mobile app? Explore our <a href="/services/mobile-app-development">mobile app development</a> service, or <a href="/start-project">tell us what you have in mind</a> and we will help you scope it.</p>`,
		},
	}

	if err := db.Create(&blogs).Error; err != nil {
		return err
	}
	log.Printf("Created %d blog posts", len(blogs))
	return nil
}

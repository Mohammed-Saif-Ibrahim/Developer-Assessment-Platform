import "dotenv/config";
import argon2 from "argon2";
import { getDb, schema } from "@dap/database";
import { slugify } from "@dap/shared";

async function main() {
  const db = getDb();
  console.log("Seeding database...");

  // --- Admin user ---------------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed the admin user"
    );
  }

  const existingAdmin = await db.query.adminUsers.findFirst({
    where: (a, { eq }) => eq(a.email, adminEmail),
  });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);
    await db.insert(schema.adminUsers).values({
      email: adminEmail,
      passwordHash,
      name: "Platform Admin",
      role: "admin",
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // --- Subjects + topics ---------------------------------------------------
  // NOTE: PostgreSQL was previously defined twice in this array (the second
  // definition was missing the "Arrays" topic). Subject creation is keyed on
  // slug, so the duplicate never created a second row, but it was dead code
  // that made the topic list ambiguous at a glance. It has been removed.
  const subjectDefs: {
    name: string;
    description: string;
    icon: string;
    topics: string[];
  }[] = [
    {
      name: "HTML",
      description: "Semantic structure, forms, accessibility, and modern HTML.",
      icon: "html",
      topics: [
        "Semantics",
        "Forms",
        "Accessibility",
        "Tables",
        "Media",
        "SEO",
      ],
    },
    {
      name: "CSS",
      description: "Selectors, layout, responsive design, and modern CSS.",
      icon: "css",
      topics: [
        "Selectors",
        "Box Model",
        "Flexbox",
        "Grid",
        "Positioning",
        "Responsive Design",
        "Animations",
        "Specificity",
      ],
    },
    {
      name: "JavaScript",
      description: "Core language mechanics, from variables to the event loop.",
      icon: "js",
      topics: [
        "Variables",
        "Scope",
        "Closures",
        "Arrays",
        "Objects",
        "Promises",
        "Async/Await",
        "Event Loop",
        "Prototypes",
      ],
    },
    {
      name: "TypeScript",
      description: "Static types layered on top of JavaScript.",
      icon: "ts",
      topics: [
        "Basic Types",
        "Interfaces",
        "Generics",
        "Union Types",
        "Utility Types",
        "Type Narrowing",
        "Type Guards",
        "Advanced Types",
        "Decorators",
      ],
    },
    {
      name: "React",
      description: "Components, hooks, state, and rendering behavior.",
      icon: "react",
      topics: [
        "Components",
        "Props",
        "State",
        "Hooks",
        "useEffect",
        "Context",
        "Rendering",
        "Performance",
        "Advanced Patterns",
      ],
    },
    {
      name: "Node.js",
      description: "Server-side JavaScript, APIs, modules, and runtime fundamentals.",
      icon: "node",
      topics: [
        "Runtime Basics",
        "Modules",
        "File System",
        "Events",
        "Event Loop",
        "Streams",
        "Buffers",
        "HTTP",
        "NPM",
        "Environment Variables",
        "Process",
        "Error Handling",
        "Performance",
      ],
    },
    {
      name: "Next.js",
      description: "React framework features including routing, rendering, and server-side capabilities.",
      icon: "nextjs",
      topics: [
        "App Router",
        "Routing",
        "Navigation",
        "Layouts",
        "Server Components",
        "Client Components",
        "Rendering",
        "Data Fetching",
        "Server Actions",
        "API Routes",
        "Middleware",
        "Caching",
        "Metadata",
        "Environment Variables",
        "Authentication",
      ],
    },
    {
      name: "SQL",
      description: "Relational querying and database fundamentals.",
      icon: "sql",
      topics: [
        "SELECT",
        "Joins",
        "Aggregation",
        "Subqueries",
        "CTEs",
        "Indexes",
        "Transactions",
        "Constraints",
        "Window Functions",
      ],
    },
    {
      name: "PostgreSQL",
      description: "PostgreSQL-specific features, querying, performance, and database administration.",
      icon: "postgres",
      topics: [
        "PostgreSQL Basics",
        "Data Types",
        "Arrays",
        "Joins",
        "Indexes",
        "Transactions",
        "Constraints",
        "JSONB",
        "CTEs",
        "Window Functions",
        "Performance",
        "Extensions",
      ],
    },
  ];

  const subjectIdByName = new Map<string, string>();
  const topicIdByKey = new Map<string, string>();

  for (const def of subjectDefs) {
    const slug = slugify(def.name);
    let subject = await db.query.subjects.findFirst({ where: (s, { eq }) => eq(s.slug, slug) });
    if (!subject) {
      [subject] = await db
        .insert(schema.subjects)
        .values({ name: def.name, slug, description: def.description, icon: def.icon, isPublished: true })
        .returning();
      console.log(`Created subject: ${def.name}`);
    }
    subjectIdByName.set(def.name, subject.id);

    for (let i = 0; i < def.topics.length; i++) {
      const topicName = def.topics[i];
      const topicSlug = slugify(topicName);
      let topic = await db.query.topics.findFirst({
        where: (t, { and, eq }) => and(eq(t.subjectId, subject!.id), eq(t.slug, topicSlug)),
      });
      if (!topic) {
        [topic] = await db
          .insert(schema.topics)
          .values({ subjectId: subject.id, name: topicName, slug: topicSlug, sortOrder: i })
          .returning();
      }
      topicIdByKey.set(`${def.name}:${topicName}`, topic.id);
    }
  }

  // --- Sample questions -----------------------------------------------------
  type SeedQuestion = {
    subject: string;
    topic: string;
    type: "theory" | "code_output" | "debugging" | "multiple_correct";
    difficulty: "easy" | "medium" | "hard" | "advanced";
    questionText: string;
    codeSnippet?: string;
    codeLanguage?: string;
    explanation: string;
    options: { text: string; correct: boolean }[];
  };

  const seedQuestions: SeedQuestion[] = [
    // =========================================================================
    // HTML
    // =========================================================================
    {
      subject: "HTML",
      topic: "Semantics",
      type: "theory",
      difficulty: "easy",
      questionText: "Which HTML element is most appropriate for the main navigation links of a website?",
      explanation:
        "The <nav> element represents a section of a page containing navigation links and provides semantic meaning to browsers and assistive technologies.",
      options: [
        { text: "<nav>", correct: true },
        { text: "<section>", correct: false },
        { text: "<links>", correct: false },
        { text: "<menu-bar>", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Semantics",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the primary purpose of semantic HTML elements?",
      explanation:
        "Semantic elements such as <header>, <main>, <article>, and <footer> communicate the meaning and structure of content to browsers, search engines, and assistive technologies.",
      options: [
        { text: "To describe the meaning and structure of content", correct: true },
        { text: "To automatically style elements", correct: false },
        { text: "To make JavaScript execute faster", correct: false },
        { text: "To replace CSS completely", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Semantics",
      type: "debugging",
      difficulty: "medium",
      questionText: "What is the main problem with this page structure?",
      codeSnippet:
        "<div class=\"header\">\n  <div class=\"nav\">...</div>\n</div>\n<div class=\"main\">\n  <div class=\"article\">...</div>\n</div>\n<div class=\"footer\">...</div>",
      codeLanguage: "html",
      explanation:
        "Using only generic <div> elements with class names discards the built-in semantic meaning that <header>, <nav>, <main>, <article>, and <footer> would provide to browsers and assistive technologies.",
      options: [
        { text: "It relies on class names instead of semantic elements to convey structure", correct: true },
        { text: "Divs are not allowed to be nested", correct: false },
        { text: "The page will fail to render in modern browsers", correct: false },
        { text: "Class attributes are deprecated in HTML", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Forms",
      type: "theory",
      difficulty: "easy",
      questionText: "Which attribute is used to associate a <label> with a specific form input?",
      explanation:
        "The label's for attribute should match the id of the associated input element.",
      options: [
        { text: "for", correct: true },
        { text: "name", correct: false },
        { text: "target", correct: false },
        { text: "bind", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Forms",
      type: "code_output",
      difficulty: "medium",
      questionText: "What type of value will the browser submit for this checkbox when it is checked?",
      codeSnippet: "<input type=\"checkbox\" name=\"subscribe\" value=\"yes\">",
      codeLanguage: "html",
      explanation:
        "When a checkbox is checked, its name and value are submitted. In this example, the submitted value for subscribe is yes.",
      options: [
        { text: "yes", correct: true },
        { text: "true", correct: false },
        { text: "checked", correct: false },
        { text: "1", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Forms",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which HTML attributes can be used to add native client-side validation to a form input?",
      explanation:
        "required, pattern, and min/max are native HTML validation attributes the browser enforces before submission. placeholder only shows hint text and does not validate input.",
      options: [
        { text: "required", correct: true },
        { text: "pattern", correct: true },
        { text: "min / max", correct: true },
        { text: "placeholder", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Accessibility",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the purpose of the alt attribute on an <img> element?",
      explanation:
        "The alt attribute provides alternative text describing an image, which is important for accessibility and is displayed when the image cannot be loaded.",
      options: [
        { text: "To provide alternative text describing the image", correct: true },
        { text: "To specify the image's CSS class", correct: false },
        { text: "To define the image dimensions", correct: false },
        { text: "To preload the image", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Accessibility",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the purpose of the aria-label attribute?",
      explanation:
        "aria-label provides an accessible name for an element when there is no visible text label, so assistive technologies can announce its purpose.",
      options: [
        { text: "To provide an accessible name when no visible text label exists", correct: true },
        { text: "To style an element for screen readers only", correct: false },
        { text: "To hide an element from all users", correct: false },
        { text: "To validate form input", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Accessibility",
      type: "debugging",
      difficulty: "hard",
      questionText: "What accessibility problem does this button have?",
      codeSnippet: "<div onclick=\"submitForm()\">\n  <img src=\"submit-icon.png\">\n</div>",
      codeLanguage: "html",
      explanation:
        "A <div> is not focusable or announced as interactive by assistive technology, and the image has no alt text, so screen reader and keyboard users cannot identify or activate this control. A native <button> with a text label or accessible name should be used instead.",
      options: [
        { text: "It uses a non-interactive element with no accessible name instead of a real button", correct: true },
        { text: "The onclick attribute is deprecated in all browsers", correct: false },
        { text: "Images cannot be placed inside a div", correct: false },
        { text: "The div will not render without a class attribute", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Tables",
      type: "theory",
      difficulty: "easy",
      questionText: "Which HTML element is used to define a table row?",
      explanation:
        "The <tr> element represents a row in an HTML table. Cells inside the row are defined using <td> or <th> elements.",
      options: [
        { text: "<tr>", correct: true },
        { text: "<row>", correct: false },
        { text: "<td>", correct: false },
        { text: "<table-row>", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Tables",
      type: "theory",
      difficulty: "medium",
      questionText: "Which HTML element should be used for a header cell in a table?",
      explanation:
        "The <th> element represents a header cell in an HTML table and provides semantic information about the column or row it describes.",
      options: [
        { text: "<th>", correct: true },
        { text: "<thead-cell>", correct: false },
        { text: "<header>", correct: false },
        { text: "<td-header>", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Tables",
      type: "code_output",
      difficulty: "medium",
      questionText: "How many columns does the second row span in this table?",
      codeSnippet:
        "<table>\n  <tr>\n    <td>A</td>\n    <td>B</td>\n  </tr>\n  <tr>\n    <td colspan=\"2\">C</td>\n  </tr>\n</table>",
      codeLanguage: "html",
      explanation:
        "The colspan attribute specifies how many columns a table cell should span. A value of 2 makes the cell span both columns.",
      options: [
        { text: "1 column", correct: false },
        { text: "2 columns", correct: true },
        { text: "3 columns", correct: false },
        { text: "The entire table automatically", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Tables",
      type: "multiple_correct",
      difficulty: "advanced",
      questionText: "Which practices improve the accessibility of a data table?",
      explanation:
        "Using <th> with a scope attribute, providing a <caption>, and associating headers with data cells all help assistive technology understand a table's structure. Relying only on visual spacing conveys nothing to screen readers.",
      options: [
        { text: "Using scope=\"col\" or scope=\"row\" on header cells", correct: true },
        { text: "Providing a <caption> that describes the table's purpose", correct: true },
        { text: "Using <th> for header cells instead of styled <td> cells", correct: true },
        { text: "Relying only on CSS spacing to separate columns visually", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Media",
      type: "theory",
      difficulty: "easy",
      questionText: "Which HTML element is used to embed an image in a webpage?",
      explanation:
        "The <img> element embeds an image into an HTML document. The src attribute specifies the image resource.",
      options: [
        { text: "<img>", correct: true },
        { text: "<image>", correct: false },
        { text: "<picture-img>", correct: false },
        { text: "<media>", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Media",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does the controls attribute do in this video element?",
      codeSnippet: "<video src=\"movie.mp4\" controls></video>",
      codeLanguage: "html",
      explanation:
        "The controls attribute tells the browser to display built-in controls such as play, pause, volume, and seeking controls for the video.",
      options: [
        { text: "Displays the browser's built-in video controls", correct: true },
        { text: "Automatically plays the video", correct: false },
        { text: "Loops the video continuously", correct: false },
        { text: "Downloads the video automatically", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "Media",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the primary purpose of the <picture> element?",
      explanation:
        "The <picture> element allows developers to provide multiple image sources and let the browser choose an appropriate source based on conditions such as viewport size or supported formats.",
      options: [
        { text: "To provide multiple image sources for responsive or art-directed images", correct: true },
        { text: "To automatically compress every image", correct: false },
        { text: "To replace CSS background images", correct: false },
        { text: "To create image editing tools in the browser", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "SEO",
      type: "theory",
      difficulty: "easy",
      questionText: "Which HTML element is commonly used to define the main title of a webpage for search engines?",
      explanation:
        "The <title> element defines the document title shown in the browser tab and is an important piece of metadata used by search engines.",
      options: [
        { text: "<title>", correct: true },
        { text: "<heading>", correct: false },
        { text: "<h0>", correct: false },
        { text: "<meta-title>", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "SEO",
      type: "theory",
      difficulty: "medium",
      questionText: "Which meta tag is commonly used to provide a description of a webpage to search engines?",
      explanation:
        "The meta description provides a concise description of the page and may be used by search engines when generating search result snippets.",
      options: [
        { text: "<meta name=\"description\" content=\"...\">", correct: true },
        { text: "<meta name=\"keywords\" content=\"...\">", correct: false },
        { text: "<description>...</description>", correct: false },
        { text: "<meta name=\"seo\" content=\"...\">", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "SEO",
      type: "code_output",
      difficulty: "hard",
      questionText: "Which heading structure is generally the most appropriate for a page with one main topic and several sections?",
      codeSnippet:
        "<h1>Web Development</h1>\n<h2>HTML</h2>\n<h2>CSS</h2>\n<h2>JavaScript</h2>",
      codeLanguage: "html",
      explanation:
        "A page should generally have a clear primary heading represented by h1, with major subsections represented by h2 headings.",
      options: [
        { text: "One h1 followed by h2 headings for major sections", correct: true },
        { text: "Only h6 headings should be used", correct: false },
        { text: "Every section should use h1 regardless of hierarchy", correct: false },
        { text: "Heading elements should never be used for structure", correct: false },
      ],
    },
    {
      subject: "HTML",
      topic: "SEO",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which practices can improve the semantic SEO structure of an HTML page?",
      explanation:
        "Using semantic elements, meaningful headings, descriptive page titles, and useful meta descriptions helps communicate the structure and purpose of a page.",
      options: [
        { text: "Using meaningful heading hierarchy", correct: true },
        { text: "Using semantic HTML elements", correct: true },
        { text: "Providing a descriptive <title>", correct: true },
        { text: "Replacing all semantic elements with generic <div> elements", correct: false },
      ],
    },
    // =========================================================================
    // CSS
    // =========================================================================
    {
      subject: "CSS",
      topic: "Selectors",
      type: "theory",
      difficulty: "easy",
      questionText: "Which CSS selector targets all elements with the class name 'card'?",
      explanation:
        "A class selector begins with a period followed by the class name, so .card targets every element whose class attribute contains card.",
      options: [
        { text: ".card", correct: true },
        { text: "#card", correct: false },
        { text: "card", correct: false },
        { text: "*card", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Selectors",
      type: "theory",
      difficulty: "easy",
      questionText: "Which pseudo-class applies styles when the user's pointer is hovering over an element?",
      explanation:
        ":hover applies styles while the pointer is positioned over the matched element.",
      options: [
        { text: ":hover", correct: true },
        { text: ":focus", correct: false },
        { text: ":active", correct: false },
        { text: ":visited", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Selectors",
      type: "code_output",
      difficulty: "medium",
      questionText: "Which elements does this selector match?",
      codeSnippet: ".card > p {\n  color: gray;\n}",
      codeLanguage: "css",
      explanation:
        "The child combinator (>) matches only direct children, so this rule styles <p> elements that are immediate children of an element with class card, not deeper descendants.",
      options: [
        { text: "Only <p> elements that are direct children of .card", correct: true },
        { text: "Every <p> element anywhere inside .card", correct: false },
        { text: "Only the .card element itself", correct: false },
        { text: "Every <p> element on the page", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Selectors",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which of the following are valid CSS selectors?",
      explanation:
        "Attribute selectors, the adjacent sibling combinator, and the :not() pseudo-class are all valid CSS syntax. \"$card\" is not a recognized CSS selector prefix.",
      options: [
        { text: "[type=\"text\"]", correct: true },
        { text: "h2 + p", correct: true },
        { text: ":not(.active)", correct: true },
        { text: "$card", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Box Model",
      type: "code_output",
      difficulty: "medium",
      questionText: "What is the total width of this element when box-sizing is set to content-box?",
      codeSnippet:
        ".box {\n  width: 200px;\n  padding: 20px;\n  border: 5px solid black;\n  box-sizing: content-box;\n}",
      codeLanguage: "css",
      explanation:
        "With content-box, the declared width applies only to the content. The total width is 200px + 40px padding + 10px border = 250px.",
      options: [
        { text: "200px", correct: false },
        { text: "220px", correct: false },
        { text: "240px", correct: false },
        { text: "250px", correct: true },
      ],
    },
    {
      subject: "CSS",
      topic: "Box Model",
      type: "theory",
      difficulty: "medium",
      questionText: "What does margin collapsing refer to in CSS?",
      explanation:
        "Margin collapsing occurs when the vertical margins of adjacent block-level elements combine into a single margin equal to the larger of the two, rather than adding together.",
      options: [
        { text: "Adjacent vertical margins combining into a single, larger margin", correct: true },
        { text: "Padding shrinking automatically when the viewport is small", correct: false },
        { text: "Borders being removed when width is set to 0", correct: false },
        { text: "Margins being converted into padding on nested elements", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Box Model",
      type: "code_output",
      difficulty: "hard",
      questionText: "What is the total rendered width of this element?",
      codeSnippet:
        ".box {\n  width: 200px;\n  padding: 20px;\n  border: 5px solid black;\n  box-sizing: border-box;\n}",
      codeLanguage: "css",
      explanation:
        "With border-box, the declared width already includes padding and border, so the total rendered width stays 200px.",
      options: [
        { text: "200px", correct: true },
        { text: "240px", correct: false },
        { text: "250px", correct: false },
        { text: "220px", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Flexbox",
      type: "theory",
      difficulty: "medium",
      questionText: "Which CSS property is used to align flex items along the main axis?",
      explanation:
        "justify-content controls the alignment and distribution of flex items along the main axis.",
      options: [
        { text: "justify-content", correct: true },
        { text: "align-items", correct: false },
        { text: "align-content", correct: false },
        { text: "place-items", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Flexbox",
      type: "code_output",
      difficulty: "hard",
      questionText: "Where will the items be positioned with this CSS?",
      codeSnippet:
        ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}",
      codeLanguage: "css",
      explanation:
        "justify-content: center centers items along the main axis, while align-items: center centers them along the cross axis. With the default row direction, this results in both horizontal and vertical centering.",
      options: [
        { text: "Centered horizontally only", correct: false },
        { text: "Centered vertically only", correct: false },
        { text: "Centered horizontally and vertically", correct: true },
        { text: "Aligned to the top-left corner", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Specificity",
      type: "debugging",
      difficulty: "hard",
      questionText: "Which color will be applied to the paragraph?",
      codeSnippet:
        "p {\n  color: blue;\n}\n\n.text {\n  color: green;\n}\n\n#main .text {\n  color: red;\n}",
      codeLanguage: "css",
      explanation:
        "The #main .text selector has higher specificity than both the class selector and element selector, so the paragraph will be red if it matches that selector.",
      options: [
        { text: "Blue", correct: false },
        { text: "Green", correct: false },
        { text: "Red", correct: true },
        { text: "The browser will ignore all three rules", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Specificity",
      type: "debugging",
      difficulty: "advanced",
      questionText: "Why does this rule fail to override the earlier, lower-specificity rule even though it appears later in the file?",
      codeSnippet:
        ".button {\n  background: blue !important;\n}\n\n#submit-button {\n  background: green;\n}",
      codeLanguage: "css",
      explanation:
        "!important elevates a declaration above the normal specificity cascade, so it wins over the ID selector's rule regardless of source order, unless another !important declaration with equal or higher specificity overrides it.",
      options: [
        { text: "!important overrides normal specificity rules regardless of source order", correct: true },
        { text: "ID selectors are always ignored by browsers", correct: false },
        { text: "The rules were declared in the wrong file", correct: false },
        { text: "background is not affected by specificity", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Grid",
      type: "theory",
      difficulty: "easy",
      questionText: "Which CSS declaration enables CSS Grid layout on an element?",
      explanation:
        "Setting display: grid establishes a grid formatting context for the element and allows its children to participate in CSS Grid layout.",
      options: [
        { text: "display: grid", correct: true },
        { text: "position: grid", correct: false },
        { text: "layout: grid", correct: false },
        { text: "grid: enabled", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Grid",
      type: "code_output",
      difficulty: "medium",
      questionText: "How many equal-width columns does this grid create?",
      codeSnippet:
        ".container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}",
      codeLanguage: "css",
      explanation:
        "repeat(3, 1fr) creates three grid columns, with each column receiving one equal fraction of the available space.",
      options: [
        { text: "1 column", correct: false },
        { text: "2 columns", correct: false },
        { text: "3 equal-width columns", correct: true },
        { text: "4 equal-width columns", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Grid",
      type: "theory",
      difficulty: "hard",
      questionText: "What does the fr unit represent in CSS Grid?",
      explanation:
        "The fr unit represents a fraction of the available space in the grid container after fixed-size tracks and other constraints are accounted for.",
      options: [
        { text: "A fraction of the available grid space", correct: true },
        { text: "A fixed number of pixels", correct: false },
        { text: "A percentage of the viewport height only", correct: false },
        { text: "The number of rows in a grid", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Positioning",
      type: "theory",
      difficulty: "easy",
      questionText: "Which position value removes an element from the normal document flow and positions it relative to its containing block?",
      explanation:
        "position: absolute removes the element from normal flow and positions it using offsets relative to its containing block, typically a positioned ancestor.",
      options: [
        { text: "absolute", correct: true },
        { text: "relative", correct: false },
        { text: "static", correct: false },
        { text: "inline", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Positioning",
      type: "code_output",
      difficulty: "medium",
      questionText: "Where will the child element be positioned?",
      codeSnippet:
        ".parent {\n  position: relative;\n}\n\n.child {\n  position: absolute;\n  top: 0;\n  right: 0;\n}",
      codeLanguage: "css",
      explanation:
        "Because the parent has position: relative, it establishes the containing block for the absolutely positioned child. top: 0 and right: 0 place the child at the parent's top-right corner.",
      options: [
        { text: "At the top-right of the positioned parent", correct: true },
        { text: "At the top-left of the viewport", correct: false },
        { text: "At the center of the parent", correct: false },
        { text: "At the bottom-right of the viewport", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Responsive Design",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the primary purpose of a CSS media query?",
      explanation:
        "Media queries allow CSS rules to be applied conditionally based on characteristics such as viewport width, height, orientation, or user preferences.",
      options: [
        { text: "To apply styles based on device or viewport conditions", correct: true },
        { text: "To create JavaScript event listeners", correct: false },
        { text: "To download external CSS files", correct: false },
        { text: "To automatically convert desktop websites into mobile apps", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Responsive Design",
      type: "code_output",
      difficulty: "medium",
      questionText: "When will the following CSS rule apply?",
      codeSnippet:
        "@media (max-width: 768px) {\n  .container {\n    padding: 10px;\n  }\n}",
      codeLanguage: "css",
      explanation:
        "The rule inside the media query applies when the viewport width is 768px or less.",
      options: [
        { text: "When the viewport is 768px or narrower", correct: true },
        { text: "When the viewport is wider than 768px", correct: false },
        { text: "Only when the screen is exactly 768px wide", correct: false },
        { text: "Only on desktop screens", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Animations",
      type: "theory",
      difficulty: "medium",
      questionText: "Which CSS at-rule is used to define the stages of a CSS animation?",
      explanation:
        "@keyframes defines the intermediate stages and styles of a CSS animation.",
      options: [
        { text: "@keyframes", correct: true },
        { text: "@animation", correct: false },
        { text: "@frames", correct: false },
        { text: "@transition", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Animations",
      type: "code_output",
      difficulty: "hard",
      questionText: "How long will this animation take to complete one iteration?",
      codeSnippet:
        ".box {\n  animation-name: slide;\n  animation-duration: 2s;\n}\n\n@keyframes slide {\n  from { transform: translateX(0); }\n  to { transform: translateX(100px); }\n}",
      codeLanguage: "css",
      explanation:
        "The animation-duration property specifies how long one iteration of the animation takes. Here it is 2 seconds.",
      options: [
        { text: "0.5 seconds", correct: false },
        { text: "1 second", correct: false },
        { text: "2 seconds", correct: true },
        { text: "100 seconds", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Animations",
      type: "multiple_correct",
      difficulty: "advanced",
      questionText: "Which CSS properties can be used to control how an animation behaves?",
      explanation:
        "CSS provides several animation properties including duration, timing function, delay, iteration count, direction, and fill mode.",
      options: [
        { text: "animation-duration", correct: true },
        { text: "animation-timing-function", correct: true },
        { text: "animation-iteration-count", correct: true },
        { text: "animation-database-mode", correct: false },
      ],
    },
    // =========================================================================
    // JavaScript
    // =========================================================================
    {
      subject: "JavaScript",
      topic: "Closures",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a closure in JavaScript?",
      explanation:
        "A closure is formed when a function retains access to variables from its enclosing scope even after that outer function has returned.",
      options: [
        { text: "A function bundled with references to its surrounding lexical scope", correct: true },
        { text: "A way to close a database connection", correct: false },
        { text: "A loop that never terminates", correct: false },
        { text: "A synonym for an anonymous function", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Promises",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet: "Promise.resolve(5)\n  .then(x => x * 2)\n  .then(console.log);",
      codeLanguage: "javascript",
      explanation:
        "The first .then transforms 5 into 10, and the second .then logs the resolved value, 10.",
      options: [
        { text: "5", correct: false },
        { text: "10", correct: true },
        { text: "Promise", correct: false },
        { text: "Error", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Variables",
      type: "code_output",
      difficulty: "easy",
      questionText: "What does this code log?",
      codeSnippet: "const x = \"5\";\nconsole.log(x + 2);",
      codeLanguage: "javascript",
      explanation:
        "The + operator triggers string concatenation when either operand is a string, so \"5\" + 2 becomes \"52\".",
      options: [
        { text: "7", correct: false },
        { text: "52", correct: true },
        { text: "NaN", correct: false },
        { text: "TypeError", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Prototypes",
      type: "theory",
      difficulty: "hard",
      questionText: "What does typeof null return?",
      explanation:
        "This is a long-standing JavaScript quirk: typeof null returns \"object\" due to a bug preserved for backward compatibility.",
      options: [
        { text: "null", correct: false },
        { text: "undefined", correct: false },
        { text: "object", correct: true },
        { text: "boolean", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Event Loop",
      type: "debugging",
      difficulty: "hard",
      questionText: "Which statement about this code is correct?",
      codeSnippet:
        "console.log('a');\nsetTimeout(() => console.log('b'), 0);\nPromise.resolve().then(() => console.log('c'));\nconsole.log('d');",
      codeLanguage: "javascript",
      explanation:
        "Synchronous code runs first (a, d), then microtasks like promise callbacks (c), then macrotasks like setTimeout (b).",
      options: [
        { text: "Logs in order: a, d, c, b", correct: true },
        { text: "Logs in order: a, b, c, d", correct: false },
        { text: "Logs in order: a, c, d, b", correct: false },
        { text: "Logs in order: a, d, b, c", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Arrays",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which of the following array methods mutate the original array?",
      explanation:
        "push and splice mutate the array in place; map and filter always return a new array and leave the original untouched.",
      options: [
        { text: "push()", correct: true },
        { text: "map()", correct: false },
        { text: "splice()", correct: true },
        { text: "filter()", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Variables",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the main difference between let and const?",
      explanation:
        "Both let and const are block-scoped. A variable declared with const cannot be reassigned after initialization, while a let variable can be reassigned.",
      options: [
        { text: "const variables cannot be reassigned, while let variables can", correct: true },
        { text: "let is function-scoped, while const is block-scoped", correct: false },
        { text: "const variables can never contain objects", correct: false },
        { text: "There is no difference between them", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Scope",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this code output?",
      codeSnippet: "let x = 10;\n{\n  let x = 20;\n  console.log(x);\n}\nconsole.log(x);",
      codeLanguage: "javascript",
      explanation:
        "The inner let x is block-scoped and shadows the outer x. Therefore the first log prints 20 and the second prints 10.",
      options: [
        { text: "20, then 20", correct: false },
        { text: "10, then 10", correct: false },
        { text: "20, then 10", correct: true },
        { text: "10, then 20", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Variables",
      type: "theory",
      difficulty: "medium",
      questionText: "What happens when you access a let variable before its declaration?",
      explanation:
        "let and const declarations are hoisted but remain in the temporal dead zone until execution reaches their declaration. Accessing them before that point throws a ReferenceError.",
      options: [
        { text: "It returns undefined", correct: false },
        { text: "It throws a ReferenceError", correct: true },
        { text: "It returns null", correct: false },
        { text: "It automatically creates a global variable", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Scope",
      type: "theory",
      difficulty: "medium",
      questionText: "What does lexical scope mean in JavaScript?",
      explanation:
        "Lexical scope means that the accessibility of variables is determined by where functions and blocks are written in the source code.",
      options: [
        { text: "Variable accessibility is determined by where code is written", correct: true },
        { text: "Variables are accessible from every function", correct: false },
        { text: "Variables are determined by the order functions execute", correct: false },
        { text: "Only global variables have scope", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Closures",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet:
        "function counter() {\n  let count = 0;\n  return () => ++count;\n}\n\nconst increment = counter();\nconsole.log(increment());\nconsole.log(increment());",
      codeLanguage: "javascript",
      explanation:
        "The returned function forms a closure over count, so it retains access to the same count variable between calls.",
      options: [
        { text: "1, then 1", correct: false },
        { text: "0, then 1", correct: false },
        { text: "1, then 2", correct: true },
        { text: "2, then 2", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Arrays",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this code output?",
      codeSnippet: "const numbers = [1, 2, 3, 4];\nconst result = numbers.map(n => n * 2);\nconsole.log(result);",
      codeLanguage: "javascript",
      explanation:
        "map creates a new array containing the result of applying the callback to every element.",
      options: [
        { text: "[1, 2, 3, 4]", correct: false },
        { text: "[2, 4, 6, 8]", correct: true },
        { text: "[1, 4, 9, 16]", correct: false },
        { text: "8", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Arrays",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the main difference between map() and forEach()?",
      explanation:
        "map returns a new array containing transformed values, while forEach executes a callback for each element and does not create a transformed array.",
      options: [
        { text: "map returns a new array, while forEach does not", correct: true },
        { text: "forEach always returns a new array", correct: false },
        { text: "map can only be used with numbers", correct: false },
        { text: "There is no difference", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Arrays",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet:
        "const numbers = [1, 2, 3, 4, 5];\nconst result = numbers.filter(n => n % 2 === 0);\nconsole.log(result);",
      codeLanguage: "javascript",
      explanation:
        "filter creates a new array containing only elements for which the callback returns true.",
      options: [
        { text: "[1, 3, 5]", correct: false },
        { text: "[2, 4]", correct: true },
        { text: "[1, 2, 3, 4, 5]", correct: false },
        { text: "6", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Objects",
      type: "theory",
      difficulty: "easy",
      questionText: "Which syntax correctly accesses the name property of an object called user?",
      explanation:
        "Both dot notation and bracket notation can access object properties. Dot notation is the simplest syntax when the property name is known directly.",
      options: [
        { text: "user.name", correct: true },
        { text: "user->name", correct: false },
        { text: "user::name", correct: false },
        { text: "user[name()]", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Objects",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet:
        "const user = { name: 'Saif', age: 21 };\nconst { name } = user;\nconsole.log(name);",
      codeLanguage: "javascript",
      explanation:
        "Object destructuring extracts the name property from user and assigns its value to the name variable.",
      options: [
        { text: "user", correct: false },
        { text: "Saif", correct: true },
        { text: "name", correct: false },
        { text: "undefined", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Objects",
      type: "theory",
      difficulty: "medium",
      questionText: "What does the spread syntax (...) do when used with an object?",
      explanation:
        "Object spread copies the enumerable own properties of an object into another object.",
      options: [
        { text: "Copies enumerable properties into another object", correct: true },
        { text: "Creates a deep clone of every nested object", correct: false },
        { text: "Deletes the original object", correct: false },
        { text: "Freezes the object", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Promises",
      type: "theory",
      difficulty: "medium",
      questionText: "Which states can a JavaScript Promise have?",
      explanation:
        "A Promise starts as pending and eventually becomes either fulfilled or rejected. Once settled, it cannot transition to another state.",
      options: [
        { text: "pending, fulfilled, and rejected", correct: true },
        { text: "waiting, running, and finished", correct: false },
        { text: "created, executing, and destroyed", correct: false },
        { text: "success, failure, and cancelled", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Promises",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet:
        "Promise.resolve(10)\n  .then(value => value + 5)\n  .then(value => console.log(value));",
      codeLanguage: "javascript",
      explanation:
        "The first then receives 10 and returns 15. The next then receives that returned value and logs 15.",
      options: [
        { text: "10", correct: false },
        { text: "15", correct: true },
        { text: "5", correct: false },
        { text: "Promise", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Async/Await",
      type: "theory",
      difficulty: "medium",
      questionText: "What does an async function always return?",
      explanation:
        "An async function always returns a Promise. A returned value is automatically wrapped in a fulfilled Promise.",
      options: [
        { text: "A Promise", correct: true },
        { text: "A callback", correct: false },
        { text: "undefined", correct: false },
        { text: "A generator", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Async/Await",
      type: "debugging",
      difficulty: "hard",
      questionText: "What is the correct way to handle a rejected Promise when using await?",
      codeSnippet:
        "async function loadData() {\n  const data = await fetchData();\n  console.log(data);\n}",
      codeLanguage: "javascript",
      explanation:
        "A rejected Promise awaited inside an async function throws an error. try/catch can be used to handle that rejection.",
      options: [
        { text: "Wrap the await operation in try/catch", correct: true },
        { text: "Use setTimeout around await", correct: false },
        { text: "Convert await into a callback", correct: false },
        { text: "A rejected Promise cannot be handled", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Event Loop",
      type: "code_output",
      difficulty: "hard",
      questionText: "What is the output order?",
      codeSnippet:
        "console.log('1');\n\nsetTimeout(() => console.log('2'), 0);\n\nPromise.resolve().then(() => console.log('3'));\n\nconsole.log('4');",
      codeLanguage: "javascript",
      explanation:
        "Synchronous statements execute first, followed by Promise microtasks, and then timer callbacks. Therefore the order is 1, 4, 3, 2.",
      options: [
        { text: "1, 2, 3, 4", correct: false },
        { text: "1, 4, 3, 2", correct: true },
        { text: "1, 3, 4, 2", correct: false },
        { text: "3, 1, 4, 2", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Prototypes",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the prototype chain used for in JavaScript?",
      explanation:
        "When a property or method is not found directly on an object, JavaScript looks up its prototype chain to find the property.",
      options: [
        { text: "Property and method inheritance between objects", correct: true },
        { text: "Managing asynchronous callbacks", correct: false },
        { text: "Converting objects into JSON", correct: false },
        { text: "Creating private variables automatically", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Prototypes",
      type: "code_output",
      difficulty: "hard",
      questionText: "What will this code output?",
      codeSnippet:
        "const parent = { greet() { return 'hello'; } };\nconst child = Object.create(parent);\nconsole.log(child.greet());",
      codeLanguage: "javascript",
      explanation:
        "child inherits from parent through its prototype. Since child does not have its own greet method, JavaScript finds it on parent.",
      options: [
        { text: "hello", correct: true },
        { text: "undefined", correct: false },
        { text: "TypeError", correct: false },
        { text: "parent", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Scope",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which statements about JavaScript scope are correct?",
      explanation:
        "let and const are block-scoped, while var is function-scoped. Functions can access variables from their outer lexical scopes.",
      options: [
        { text: "let is block-scoped", correct: true },
        { text: "const is block-scoped", correct: true },
        { text: "var is function-scoped", correct: true },
        { text: "Every variable is automatically global", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Promises",
      type: "multiple_correct",
      difficulty: "hard",
      questionText: "Which statements about Promise.all() are correct?",
      explanation:
        "Promise.all waits for all supplied Promises to fulfill. If any Promise rejects, the returned Promise rejects with that rejection.",
      options: [
        { text: "It fulfills when all supplied Promises fulfill", correct: true },
        { text: "It rejects if any supplied Promise rejects", correct: true },
        { text: "It returns the fulfilled values in input order", correct: true },
        { text: "It guarantees that every Promise is cancelled when one rejects", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Closures",
      type: "code_output",
      difficulty: "hard",
      questionText: "What will this code output?",
      codeSnippet:
        "function createGreeting(name) {\n  return function () {\n    return `Hello ${name}`;\n  };\n}\n\nconst greet = createGreeting('Saif');\nconsole.log(greet());",
      codeLanguage: "javascript",
      explanation:
        "The returned function closes over the name parameter from createGreeting, so it can still access 'Saif' after createGreeting has returned.",
      options: [
        { text: "Hello Saif", correct: true },
        { text: "Hello undefined", correct: false },
        { text: "Saif", correct: false },
        { text: "ReferenceError", correct: false },
      ],
    },
    // =========================================================================
    // TypeScript
    // =========================================================================
    {
      subject: "TypeScript",
      topic: "Union Types",
      type: "code_output",
      difficulty: "medium",
      questionText: "Which value is a valid assignment for this type?",
      codeSnippet: "type Status = \"loading\" | \"success\" | \"error\";\nlet current: Status;",
      codeLanguage: "typescript",
      explanation: "A union type restricts the variable to exactly one of the listed literal values.",
      options: [
        { text: "\"success\"", correct: true },
        { text: "\"pending\"", correct: false },
        { text: "true", correct: false },
        { text: "1", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Generics",
      type: "theory",
      difficulty: "hard",
      questionText: "What problem do generics primarily solve in TypeScript?",
      explanation:
        "Generics let functions and types stay reusable across different input types while preserving full type safety.",
      options: [
        { text: "Reusable, type-safe components that work over a variety of types", correct: true },
        { text: "Faster runtime execution", correct: false },
        { text: "Automatic null checking", correct: false },
        { text: "Smaller bundle sizes", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Basic Types",
      type: "theory",
      difficulty: "easy",
      questionText: "Which TypeScript type should be used for a variable that stores either a string or a number?",
      explanation:
        "A union type combines multiple possible types using the | operator.",
      options: [
        { text: "string | number", correct: true },
        { text: "string & number", correct: false },
        { text: "string, number", correct: false },
        { text: "any<string, number>", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Basic Types",
      type: "code_output",
      difficulty: "easy",
      questionText: "What is the result of this TypeScript code after compilation?",
      codeSnippet: "let age: number = 25;\nage = \"25\";",
      codeLanguage: "typescript",
      explanation:
        "The variable is explicitly typed as number, so assigning a string produces a TypeScript compile-time error.",
      options: [
        { text: "The variable becomes a string", correct: false },
        { text: "A TypeScript compile-time error occurs", correct: true },
        { text: "The value becomes NaN", correct: false },
        { text: "The assignment is silently ignored", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Interfaces",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the primary purpose of an interface in TypeScript?",
      explanation:
        "Interfaces describe the expected structure of objects and provide compile-time type checking.",
      options: [
        { text: "To describe the structure of an object", correct: true },
        { text: "To create runtime validation automatically", correct: false },
        { text: "To replace JavaScript classes at runtime", correct: false },
        { text: "To execute asynchronous code", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Interfaces",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which object satisfies this interface?",
      codeSnippet:
        "interface User {\n  id: number;\n  name: string;\n}",
      codeLanguage: "typescript",
      explanation:
        "The object must contain both id as a number and name as a string.",
      options: [
        { text: "{ id: 1, name: \"Saif\" }", correct: true },
        { text: "{ id: \"1\", name: \"Saif\" }", correct: false },
        { text: "{ name: \"Saif\" }", correct: false },
        { text: "{ id: 1, name: 100 }", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Union Types",
      type: "theory",
      difficulty: "easy",
      questionText: "What does the never type represent in TypeScript?",
      explanation:
        "The never type represents values that never occur, commonly used for functions that never return or exhaustive checks.",
      options: [
        { text: "A value that can be anything", correct: false },
        { text: "A value that is always null", correct: false },
        { text: "A value that never occurs", correct: true },
        { text: "An optional value", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Generics",
      type: "code_output",
      difficulty: "medium",
      questionText: "What type does the generic function preserve for the returned value?",
      codeSnippet:
        "function identity<T>(value: T): T {\n  return value;\n}\n\nconst result = identity(42);",
      codeLanguage: "typescript",
      explanation:
        "TypeScript infers T as number when identity is called with 42, so result is typed as number.",
      options: [
        { text: "string", correct: false },
        { text: "number", correct: true },
        { text: "unknown", correct: false },
        { text: "any", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Generics",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the main advantage of using a generic constraint such as T extends object?",
      explanation:
        "A generic constraint restricts the types that can be supplied while still preserving generic type information.",
      options: [
        { text: "It restricts T to types satisfying the constraint", correct: true },
        { text: "It converts every value to an object at runtime", correct: false },
        { text: "It disables type checking", correct: false },
        { text: "It makes the generic type equivalent to any", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Utility Types",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does Partial<User> do?",
      codeSnippet:
        "interface User {\n  id: number;\n  name: string;\n}\n\ntype UpdateUser = Partial<User>;",
      codeLanguage: "typescript",
      explanation:
        "Partial makes every property of the supplied type optional.",
      options: [
        { text: "Makes all properties readonly", correct: false },
        { text: "Makes all properties optional", correct: true },
        { text: "Removes all properties", correct: false },
        { text: "Makes all properties nullable", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Utility Types",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which are built-in TypeScript utility types?",
      explanation:
        "Partial, Pick, Omit, Record, and Readonly are all built-in utility types.",
      options: [
        { text: "Partial<T>", correct: true },
        { text: "Pick<T, K>", correct: true },
        { text: "Omit<T, K>", correct: true },
        { text: "Flatten<T>", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Interfaces",
      type: "theory",
      difficulty: "medium",
      questionText: "What is declaration merging in TypeScript?",
      explanation:
        "Declaration merging allows multiple declarations with the same name, such as interfaces, to be combined into a single definition.",
      options: [
        { text: "Combining compatible declarations with the same name", correct: true },
        { text: "Combining two JavaScript files at runtime", correct: false },
        { text: "Automatically merging npm packages", correct: false },
        { text: "Converting interfaces into classes", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Basic Types",
      type: "debugging",
      difficulty: "medium",
      questionText: "What is the main problem with using any in this function?",
      codeSnippet:
        "function getUser(): any {\n  return fetchUser();\n}\n\nconst user = getUser();\nuser.nonExistentMethod();",
      codeLanguage: "typescript",
      explanation:
        "Using any disables most compile-time type checking, allowing invalid property access and method calls.",
      options: [
        { text: "any prevents TypeScript from checking the value safely", correct: true },
        { text: "any always converts the value to a string", correct: false },
        { text: "any can only contain numbers", correct: false },
        { text: "any makes the function asynchronous", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Basic Types",
      type: "theory",
      difficulty: "hard",
      questionText: "Why is unknown generally safer than any?",
      explanation:
        "unknown can hold any value, but TypeScript requires narrowing before operations are performed on it.",
      options: [
        { text: "unknown requires type checking or narrowing before use", correct: true },
        { text: "unknown only accepts strings", correct: false },
        { text: "unknown is converted to never", correct: false },
        { text: "unknown bypasses all compiler checks", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Union Types",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does TypeScript know about value inside the if block?",
      codeSnippet:
        "function print(value: string | number) {\n  if (typeof value === \"string\") {\n    value.toUpperCase();\n  }\n}",
      codeLanguage: "typescript",
      explanation:
        "The typeof check narrows the union from string | number to string within the block.",
      options: [
        { text: "value is narrowed to string", correct: true },
        { text: "value is narrowed to number", correct: false },
        { text: "value becomes any", correct: false },
        { text: "No narrowing occurs", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Generics",
      type: "theory",
      difficulty: "hard",
      questionText: "What does keyof T produce in a generic TypeScript type?",
      explanation:
        "keyof produces a union of the known property keys of a type.",
      options: [
        { text: "A union of the keys of T", correct: true },
        { text: "A union of the values of T", correct: false },
        { text: "An array containing T", correct: false },
        { text: "A runtime object containing T's keys", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Utility Types",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this mapped type create?",
      codeSnippet:
        "type Flags<T> = {\n  [K in keyof T]: boolean;\n};",
      codeLanguage: "typescript",
      explanation:
        "The mapped type iterates over every property key of T and changes its property type to boolean.",
      options: [
        { text: "A type with the same keys and boolean values", correct: true },
        { text: "A type containing only string keys", correct: false },
        { text: "A type where every property is removed", correct: false },
        { text: "A runtime object with boolean values", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Basic Types",
      type: "debugging",
      difficulty: "advanced",
      questionText: "What is the purpose of the satisfies operator in this example?",
      codeSnippet:
        "type Config = {\n  port: number;\n};\n\nconst config = {\n  port: 3000,\n  mode: \"production\"\n} satisfies Config;",
      codeLanguage: "typescript",
      explanation:
        "satisfies checks that an expression conforms to a type while generally preserving the expression's more specific inferred type.",
      options: [
        { text: "It checks compatibility without replacing the expression's inferred type", correct: true },
        { text: "It converts config into the Config type at runtime", correct: false },
        { text: "It removes mode from the object", correct: false },
        { text: "It disables excess property checking", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Generics",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a conditional type in TypeScript?",
      explanation:
        "Conditional types select one type or another based on whether a type relationship satisfies a condition.",
      options: [
        { text: "A type expression that selects a type based on a condition", correct: true },
        { text: "A runtime if statement", correct: false },
        { text: "A replacement for interfaces", correct: false },
        { text: "A type that can only contain booleans", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Utility Types",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What is the resulting type of Result?",
      codeSnippet:
        "type ApiResponse<T> = {\n  data: T;\n  error?: string;\n};\n\ntype Result = ApiResponse<{ id: number }>;",
      codeLanguage: "typescript",
      explanation:
        "The generic parameter is substituted with { id: number }, producing an object with data of that type and an optional error.",
      options: [
        { text: "{ data: { id: number }; error?: string }", correct: true },
        { text: "{ data: number; error: string }", correct: false },
        { text: "{ id: number; error: boolean }", correct: false },
        { text: "ApiResponse<any>", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Narrowing",
      type: "theory",
      difficulty: "easy",
      questionText: "What is type narrowing in TypeScript?",
      explanation:
        "Type narrowing is the process by which TypeScript refines a variable's type to a more specific type within a certain code path, typically based on a runtime check.",
      options: [
        { text: "Refining a broader type to a more specific type within a code path", correct: true },
        { text: "Reducing the number of properties on an interface", correct: false },
        { text: "Converting a type into a smaller bundle size", correct: false },
        { text: "Removing generics from a function signature", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Narrowing",
      type: "code_output",
      difficulty: "medium",
      questionText: "What type is animal narrowed to inside the if block?",
      codeSnippet:
        "class Dog { bark() {} }\nclass Cat { meow() {} }\n\nfunction speak(animal: Dog | Cat) {\n  if (animal instanceof Dog) {\n    animal.bark();\n  }\n}",
      codeLanguage: "typescript",
      explanation:
        "The instanceof check narrows the union Dog | Cat down to Dog within the if block, so calling bark() is type-safe there.",
      options: [
        { text: "Dog", correct: true },
        { text: "Cat", correct: false },
        { text: "Dog | Cat", correct: false },
        { text: "unknown", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Narrowing",
      type: "debugging",
      difficulty: "hard",
      questionText: "Why does TypeScript still treat value as string | number below, even though it was checked earlier?",
      codeSnippet:
        "function process(value: string | number) {\n  const isString = typeof value === \"string\";\n\n  setTimeout(() => {\n    if (isString) {\n      value.toUpperCase();\n    }\n  }, 100);\n}",
      codeLanguage: "typescript",
      explanation:
        "Narrowing is only valid within the same synchronous control-flow analysis. Once the check is captured in a boolean and used inside a separate callback, TypeScript cannot guarantee value hasn't changed, so it does not carry the narrowed type into the closure.",
      options: [
        { text: "Narrowing does not persist across a captured boolean inside a separate callback", correct: true },
        { text: "typeof cannot be used to check for strings", correct: false },
        { text: "setTimeout callbacks cannot access outer variables", correct: false },
        { text: "TypeScript ignores all narrowing inside functions", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Guards",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a user-defined type guard in TypeScript?",
      explanation:
        "A user-defined type guard is a function whose return type is a type predicate (e.g. value is Foo), which TypeScript uses to narrow a value's type at call sites.",
      options: [
        { text: "A function with a type predicate return type that narrows its argument", correct: true },
        { text: "A class decorator that validates constructor arguments", correct: false },
        { text: "A runtime library that replaces TypeScript's compiler", correct: false },
        { text: "A generic constraint applied to interfaces only", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Guards",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this type guard allow TypeScript to infer inside the if block?",
      codeSnippet:
        "interface Fish { swim(): void; }\ninterface Bird { fly(): void; }\n\nfunction isFish(pet: Fish | Bird): pet is Fish {\n  return (pet as Fish).swim !== undefined;\n}\n\nfunction move(pet: Fish | Bird) {\n  if (isFish(pet)) {\n    pet.swim();\n  }\n}",
      codeLanguage: "typescript",
      explanation:
        "The pet is Fish type predicate tells TypeScript that whenever isFish(pet) returns true, pet should be narrowed to Fish, making pet.swim() type-safe inside the block.",
      options: [
        { text: "pet is narrowed to Fish", correct: true },
        { text: "pet is narrowed to Bird", correct: false },
        { text: "pet becomes any", correct: false },
        { text: "No narrowing occurs because isFish is a custom function", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Type Guards",
      type: "multiple_correct",
      difficulty: "advanced",
      questionText: "Which of the following can act as type guards that narrow a union type in TypeScript?",
      explanation:
        "typeof checks, instanceof checks, the in operator, and user-defined type predicate functions are all recognized by TypeScript as valid narrowing mechanisms.",
      options: [
        { text: "typeof value === \"string\"", correct: true },
        { text: "value instanceof SomeClass", correct: true },
        { text: "\"prop\" in value", correct: true },
        { text: "value as unknown as SomeType", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Advanced Types",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a template literal type in TypeScript?",
      explanation:
        "Template literal types build new string literal types by combining literal types using template string syntax, similar to JavaScript template literals but evaluated at the type level.",
      options: [
        { text: "A string literal type built by combining other literal types", correct: true },
        { text: "A runtime template engine bundled with TypeScript", correct: false },
        { text: "A type that can only represent numbers", correct: false },
        { text: "A decorator applied to string properties", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Advanced Types",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What type does Greeting represent?",
      codeSnippet:
        "type Name = \"Ada\" | \"Grace\";\ntype Greeting = `Hello, ${Name}!`;",
      codeLanguage: "typescript",
      explanation:
        "The template literal type distributes over the union, producing the union of every combination: \"Hello, Ada!\" | \"Hello, Grace!\".",
      options: [
        { text: "\"Hello, Ada!\" | \"Hello, Grace!\"", correct: true },
        { text: "\"Hello, Name!\"", correct: false },
        { text: "string", correct: false },
        { text: "never", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Advanced Types",
      type: "theory",
      difficulty: "advanced",
      questionText: "What does the infer keyword do inside a conditional type?",
      explanation:
        "infer introduces a type variable within a conditional type's extends clause, allowing TypeScript to capture and reuse part of a matched type, such as extracting a function's return type.",
      options: [
        { text: "It captures a type from within a conditional type's extends clause for reuse", correct: true },
        { text: "It forces a value to be inferred as any", correct: false },
        { text: "It disables type inference for a variable", correct: false },
        { text: "It converts a generic type into a union of its constraints", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Decorators",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a decorator in TypeScript?",
      explanation:
        "A decorator is a special kind of declaration, prefixed with @, that can be attached to a class, method, accessor, property, or parameter to modify or annotate its behavior.",
      options: [
        { text: "A function that can annotate or modify a class or its members", correct: true },
        { text: "A CSS utility applied to React components", correct: false },
        { text: "A built-in HTML attribute", correct: false },
        { text: "A runtime type validator generated automatically", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Decorators",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this class decorator do when Greeter is instantiated?",
      codeSnippet:
        "function logged(constructor: Function) {\n  console.log(`Creating instance of ${constructor.name}`);\n}\n\n@logged\nclass Greeter {\n  greet() {\n    return \"Hello\";\n  }\n}\n\nnew Greeter();",
      codeLanguage: "typescript",
      explanation:
        "A class decorator receives the class constructor and runs when the class definition is evaluated. Here it logs a message identifying the decorated class.",
      options: [
        { text: "It logs \"Creating instance of Greeter\" when the class is defined", correct: true },
        { text: "It prevents Greeter from being instantiated", correct: false },
        { text: "It automatically calls greet() on every instance", correct: false },
        { text: "It converts Greeter into an interface", correct: false },
      ],
    },
    {
      subject: "TypeScript",
      topic: "Decorators",
      type: "theory",
      difficulty: "advanced",
      questionText: "What must typically be enabled in tsconfig.json to use the legacy experimental decorators proposal in TypeScript?",
      explanation:
        "Historically, TypeScript's decorator support was implemented behind the experimentalDecorators compiler flag (often paired with emitDecoratorMetadata for reflection-based libraries).",
      options: [
        { text: "experimentalDecorators", correct: true },
        { text: "strictNullChecks", correct: false },
        { text: "allowJs", correct: false },
        { text: "esModuleInterop", correct: false },
      ],
    },
    // =========================================================================
    // React
    // =========================================================================
    {
      subject: "React",
      topic: "Components",
      type: "theory",
      difficulty: "easy",
      questionText: "What is a React component?",
      explanation:
        "A React component is a reusable piece of UI that can accept inputs through props and return elements describing what should be rendered.",
      options: [
        { text: "A reusable piece of UI represented by a function or class", correct: true },
        { text: "A CSS stylesheet", correct: false },
        { text: "A database table", correct: false },
        { text: "A browser API", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Components",
      type: "theory",
      difficulty: "easy",
      questionText: "Which naming convention is normally used for React component names?",
      explanation:
        "React components are conventionally named using PascalCase, such as UserProfile or DashboardCard.",
      options: [
        { text: "PascalCase", correct: true },
        { text: "snake_case", correct: false },
        { text: "UPPERCASE_ONLY", correct: false },
        { text: "kebab-case", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Props",
      type: "theory",
      difficulty: "easy",
      questionText: "What are props in React?",
      explanation:
        "Props are read-only values passed from a parent component to a child component.",
      options: [
        { text: "Read-only data passed from parent to child", correct: true },
        { text: "Internal state stored by the browser", correct: false },
        { text: "CSS variables", correct: false },
        { text: "Database records automatically loaded by React", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Props",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this component render?",
      codeSnippet:
        "function Greeting({ name }) {\n  return <h1>Hello {name}</h1>;\n}\n\n<Greeting name=\"Saif\" />",
      codeLanguage: "javascript",
      explanation:
        "The name prop is passed with the value 'Saif', so the component renders an h1 containing Hello Saif.",
      options: [
        { text: "Hello name", correct: false },
        { text: "Hello Saif", correct: true },
        { text: "Saif Hello", correct: false },
        { text: "Nothing", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "State",
      type: "theory",
      difficulty: "easy",
      questionText: "Why should React state usually be updated using its setter function rather than directly?",
      explanation:
        "The state setter informs React that state has changed and schedules a re-render. Direct mutation does not reliably trigger the required rendering behavior.",
      options: [
        { text: "The setter tells React to update and re-render based on the new state", correct: true },
        { text: "Direct mutation is always a syntax error", correct: false },
        { text: "The setter stores state in localStorage", correct: false },
        { text: "React state cannot contain objects", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "State",
      type: "code_output",
      difficulty: "medium",
      questionText: "What value will count have after the button handler finishes?",
      codeSnippet:
        "const [count, setCount] = useState(0);\n\nfunction handleClick() {\n  setCount(count + 1);\n  setCount(count + 1);\n}",
      codeLanguage: "javascript",
      explanation:
        "Both updates calculate count + 1 from the same current render value. Therefore both requests set the state to 1 rather than incrementing twice.",
      options: [
        { text: "0", correct: false },
        { text: "1", correct: true },
        { text: "2", correct: false },
        { text: "It throws an error", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "State",
      type: "code_output",
      difficulty: "medium",
      questionText: "What is the result of this click handler?",
      codeSnippet:
        "const [count, setCount] = useState(0);\n\nfunction handleClick() {\n  setCount(c => c + 1);\n  setCount(c => c + 1);\n}",
      codeLanguage: "javascript",
      explanation:
        "Functional state updates receive the latest queued state value, so the first update produces 1 and the second produces 2.",
      options: [
        { text: "0", correct: false },
        { text: "1", correct: false },
        { text: "2", correct: true },
        { text: "It throws an error", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Hooks",
      type: "theory",
      difficulty: "medium",
      questionText: "Which rule must be followed when calling React Hooks?",
      explanation:
        "Hooks should be called at the top level of React components or custom Hooks, not inside loops, conditions, or nested functions.",
      options: [
        { text: "Hooks must be called at the top level of components or custom Hooks", correct: true },
        { text: "Hooks can only be called inside loops", correct: false },
        { text: "Hooks must always be called inside event handlers", correct: false },
        { text: "Hooks can only be called from class components", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "useEffect",
      type: "theory",
      difficulty: "medium",
      questionText: "When does useEffect normally run?",
      explanation:
        "useEffect runs after React has committed the component's render to the DOM. Its dependency array controls when the effect is re-run.",
      options: [
        { text: "After the component's render has been committed", correct: true },
        { text: "Before the component function executes", correct: false },
        { text: "Only when the browser is closed", correct: false },
        { text: "Only during server startup", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "useEffect",
      type: "code_output",
      difficulty: "medium",
      questionText: "When will this effect run after the initial render?",
      codeSnippet:
        "useEffect(() => {\n  console.log('Effect');\n}, []);",
      codeLanguage: "javascript",
      explanation:
        "An empty dependency array means the effect does not depend on changing reactive values and normally runs after the initial mount.",
      options: [
        { text: "After the initial mount", correct: true },
        { text: "After every render", correct: false },
        { text: "Only when the component receives new props", correct: false },
        { text: "Never", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "useEffect",
      type: "debugging",
      difficulty: "hard",
      questionText: "What is the main problem with this effect?",
      codeSnippet:
        "useEffect(() => {\n  setCount(count + 1);\n}, [count]);",
      codeLanguage: "javascript",
      explanation:
        "The effect updates count while also depending on count. Each update changes count and causes the effect to run again, potentially creating an infinite update loop.",
      options: [
        { text: "It can repeatedly update count and cause an infinite render loop", correct: true },
        { text: "useEffect cannot call setState", correct: false },
        { text: "The dependency array must always be empty", correct: false },
        { text: "count cannot be used inside an effect", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Rendering",
      type: "theory",
      difficulty: "medium",
      questionText: "Why does React require a key when rendering a list of elements?",
      explanation:
        "Keys help React identify which list items have changed, been added, or removed, allowing it to reconcile the list efficiently.",
      options: [
        { text: "To help React identify elements between renders", correct: true },
        { text: "To encrypt list data", correct: false },
        { text: "To automatically sort the list", correct: false },
        { text: "To make every element globally unique in the browser", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Rendering",
      type: "debugging",
      difficulty: "medium",
      questionText: "What is the main issue with using an array index as a key for a dynamic list?",
      codeSnippet:
        "items.map((item, index) => (\n  <Todo key={index} item={item} />\n))",
      codeLanguage: "javascript",
      explanation:
        "If items are inserted, removed, or reordered, indexes can change. This can cause React to associate component state with the wrong item.",
      options: [
        { text: "Indexes can change when the list is reordered or modified", correct: true },
        { text: "React does not allow numeric keys", correct: false },
        { text: "The list will never render", correct: false },
        { text: "Indexes make CSS stop working", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Context",
      type: "theory",
      difficulty: "medium",
      questionText: "What problem does React Context primarily help solve?",
      explanation:
        "Context allows values to be shared with components deeper in the tree without passing those values manually through every intermediate component.",
      options: [
        { text: "Sharing values across a component tree without manually passing props through every level", correct: true },
        { text: "Replacing JavaScript completely", correct: false },
        { text: "Automatically fetching API data", correct: false },
        { text: "Creating CSS animations", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Rendering",
      type: "code_output",
      difficulty: "hard",
      questionText: "What will happen when this component renders?",
      codeSnippet:
        "function App() {\n  const user = { name: 'Saif' };\n  return <Profile user={user} />;\n}",
      codeLanguage: "javascript",
      explanation:
        "A new user object is created on every render. Its reference therefore changes on every render, even though its contents are the same.",
      options: [
        { text: "A new user object reference is created on every render", correct: true },
        { text: "The object is automatically memoized", correct: false },
        { text: "React converts the object into a string", correct: false },
        { text: "The component cannot render objects as props", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Hooks",
      type: "theory",
      difficulty: "hard",
      questionText: "What is useMemo primarily used for?",
      explanation:
        "useMemo caches the result of a calculation between renders until its dependencies change. It can be useful for avoiding expensive recalculations.",
      options: [
        { text: "Memoizing the result of an expensive calculation", correct: true },
        { text: "Fetching data from a server", correct: false },
        { text: "Creating global state automatically", correct: false },
        { text: "Replacing useState in every component", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Hooks",
      type: "theory",
      difficulty: "hard",
      questionText: "What is useCallback primarily used for?",
      explanation:
        "useCallback memoizes a function reference so that the same function can be reused between renders until its dependencies change.",
      options: [
        { text: "Memoizing a function reference between renders", correct: true },
        { text: "Executing a function automatically after every render", correct: false },
        { text: "Converting a function into a Promise", correct: false },
        { text: "Storing API responses permanently", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Hooks",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this useMemo call return?",
      codeSnippet:
        "const total = useMemo(() => {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}, [items]);",
      codeLanguage: "javascript",
      explanation:
        "useMemo returns the calculated total and reuses the previous result until the items dependency changes.",
      options: [
        { text: "The sum of all item prices", correct: true },
        { text: "The items array itself", correct: false },
        { text: "A Promise containing the total", correct: false },
        { text: "A function that calculates the total", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Components",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the purpose of lifting state up in React?",
      explanation:
        "Lifting state up means moving shared state to the closest common parent so multiple child components can access and update the same source of truth.",
      options: [
        { text: "Moving shared state to a common parent component", correct: true },
        { text: "Moving all state into the browser", correct: false },
        { text: "Converting state into props permanently", correct: false },
        { text: "Removing state from an application", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "State",
      type: "multiple_correct",
      difficulty: "medium",
      questionText: "Which statements about React state are correct?",
      explanation:
        "State updates schedule React to render again, and state should be treated as immutable. Functional updates are useful when the next state depends on the previous state.",
      options: [
        { text: "Updating state can trigger a re-render", correct: true },
        { text: "State should generally be treated as immutable", correct: true },
        { text: "Functional updates can be useful when the next state depends on the previous state", correct: true },
        { text: "State changes are automatically persisted to localStorage", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Rendering",
      type: "multiple_correct",
      difficulty: "hard",
      questionText: "Which practices can help avoid unnecessary React re-renders?",
      explanation:
        "Memoizing components with React.memo and stabilizing function or calculated values with useCallback/useMemo can reduce unnecessary renders when used appropriately.",
      options: [
        { text: "Using React.memo when a component benefits from memoization", correct: true },
        { text: "Using useCallback when a stable function reference is useful", correct: true },
        { text: "Using useMemo for expensive calculations when appropriate", correct: true },
        { text: "Calling setState on every render", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Context",
      type: "code_output",
      difficulty: "hard",
      questionText: "What happens when useContext is called for a context that has no matching Provider above the component?",
      codeSnippet:
        "const ThemeContext = createContext('light');\n\nfunction App() {\n  const theme = useContext(ThemeContext);\n  return <div>{theme}</div>;\n}",
      codeLanguage: "javascript",
      explanation:
        "When there is no matching Provider above the component, useContext returns the default value supplied to createContext, which is 'light' in this example.",
      options: [
        { text: "It returns 'light'", correct: true },
        { text: "It always returns undefined", correct: false },
        { text: "It throws a TypeError", correct: false },
        { text: "It creates a Provider automatically", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "useEffect",
      type: "multiple_correct",
      difficulty: "hard",
      questionText: "Which are common valid uses of useEffect?",
      explanation:
        "Effects are intended for synchronizing a component with external systems such as network requests, subscriptions, timers, or browser APIs.",
      options: [
        { text: "Subscribing to an external event source", correct: true },
        { text: "Synchronizing with browser APIs", correct: true },
        { text: "Fetching data in response to a dependency change", correct: true },
        { text: "Calculating a simple value that could be derived during rendering", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Hooks",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the primary purpose of the useState hook?",
      explanation: "useState lets a function component declare and update local, re-render-triggering state.",
      options: [
        { text: "To declare local component state", correct: true },
        { text: "To fetch data from an API", correct: false },
        { text: "To define global CSS", correct: false },
        { text: "To create a new React component", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "useEffect",
      type: "debugging",
      difficulty: "medium",
      questionText: "What is wrong with this effect?",
      codeSnippet: "useEffect(() => {\n  fetchUser(id).then(setUser);\n});",
      codeLanguage: "javascript",
      explanation:
        "Without a dependency array, this effect runs after every render, which can cause an infinite fetch loop once setUser triggers a re-render.",
      options: [
        { text: "It is missing a dependency array, so it re-runs on every render", correct: true },
        { text: "useEffect cannot call async functions", correct: false },
        { text: "setUser must be called synchronously", correct: false },
        { text: "fetchUser needs to be awaited inside useEffect directly", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Props",
      type: "theory",
      difficulty: "easy",
      questionText: "How does data typically flow between a parent and child component?",
      explanation: "React data flow is one-directional: parents pass data down to children via props.",
      options: [
        { text: "Top-down, from parent to child via props", correct: true },
        { text: "Bottom-up automatically", correct: false },
        { text: "Only through global state", correct: false },
        { text: "Randomly, depending on render order", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Performance",
      type: "theory",
      difficulty: "medium",
      questionText: "What does wrapping a component in React.memo do?",
      explanation:
        "React.memo skips re-rendering a component if its props are shallowly equal to the props from the previous render, which can avoid unnecessary work for pure components.",
      options: [
        { text: "Skips re-rendering when props are shallowly unchanged", correct: true },
        { text: "Permanently caches the component's output forever", correct: false },
        { text: "Prevents the component from ever updating", correct: false },
        { text: "Converts the component into a Server Component", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Performance",
      type: "code_output",
      difficulty: "hard",
      questionText: "Why might ExpensiveChild still re-render every time Parent renders, despite being wrapped in React.memo?",
      codeSnippet:
        "const ExpensiveChild = React.memo(function ExpensiveChild({ onClick }) {\n  return <button onClick={onClick}>Click</button>;\n});\n\nfunction Parent() {\n  const [count, setCount] = useState(0);\n  return (\n    <ExpensiveChild onClick={() => setCount(count + 1)} />\n  );\n}",
      codeLanguage: "javascript",
      explanation:
        "A new inline arrow function is created on every render of Parent, so the onClick prop reference changes each time, defeating React.memo's shallow prop comparison. Wrapping the handler in useCallback would stabilize the reference.",
      options: [
        { text: "A new onClick function reference is created on every render", correct: true },
        { text: "React.memo does not work with functions as props", correct: false },
        { text: "useState always forces every child to re-render", correct: false },
        { text: "Buttons are excluded from memoization", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Performance",
      type: "multiple_correct",
      difficulty: "advanced",
      questionText: "Which techniques can help reduce unnecessary rendering work in a large React application?",
      explanation:
        "Code-splitting with lazy loading, windowing/virtualizing long lists, and memoizing expensive pure components are established performance techniques. Storing every piece of derived data in state instead of computing it during render tends to add unnecessary re-renders and synchronization bugs.",
      options: [
        { text: "Code-splitting routes or components with React.lazy", correct: true },
        { text: "Virtualizing long lists so only visible items render", correct: true },
        { text: "Memoizing expensive pure components with React.memo", correct: true },
        { text: "Storing every derived value in state instead of computing it during render", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Advanced Patterns",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the render props pattern in React?",
      explanation:
        "The render props pattern shares logic between components by passing a function as a prop that a component calls to determine what to render.",
      options: [
        { text: "Sharing logic by passing a function prop that returns what to render", correct: true },
        { text: "Rendering a component directly to a CSS file", correct: false },
        { text: "A built-in React hook for prop validation", correct: false },
        { text: "A way to pass props without using JSX", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Advanced Patterns",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this compound component pattern allow Tabs.Tab to do?",
      codeSnippet:
        "function Tabs({ children }) {\n  const [active, setActive] = useState(0);\n  return (\n    <TabsContext.Provider value={{ active, setActive }}>\n      {children}\n    </TabsContext.Provider>\n  );\n}\n\nTabs.Tab = function Tab({ index, children }) {\n  const { active, setActive } = useContext(TabsContext);\n  return (\n    <button onClick={() => setActive(index)}>\n      {children}\n    </button>\n  );\n};",
      codeLanguage: "javascript",
      explanation:
        "Compound components share implicit state through context, so Tabs.Tab can read and update the active tab without the parent needing to pass that state down explicitly through props.",
      options: [
        { text: "Access and update shared tab state through context, without explicit prop drilling", correct: true },
        { text: "Render completely independently of the Tabs component", correct: false },
        { text: "Automatically fetch tab content from an API", correct: false },
        { text: "Bypass React's rendering lifecycle", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Advanced Patterns",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a higher-order component (HOC) in React?",
      explanation:
        "A higher-order component is a function that takes a component and returns a new component, typically adding shared behavior or data without modifying the original component directly.",
      options: [
        { text: "A function that takes a component and returns an enhanced component", correct: true },
        { text: "A component that can only render other components of the same type", correct: false },
        { text: "A built-in React hook for composing effects", correct: false },
        { text: "A CSS-in-JS utility for styling components", correct: false },
      ],
    },
    // =========================================================================
    // Node.js
    // =========================================================================
    {
      subject: "Node.js",
      topic: "Runtime Basics",
      type: "theory",
      difficulty: "easy",
      questionText: "What is Node.js?",
      explanation:
        "Node.js is a JavaScript runtime built on Chrome's V8 engine that allows JavaScript to run outside the browser.",
      options: [
        { text: "A JavaScript runtime built on the V8 engine", correct: true },
        { text: "A JavaScript framework for building CSS", correct: false },
        { text: "A relational database", correct: false },
        { text: "A browser extension", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Modules",
      type: "theory",
      difficulty: "easy",
      questionText: "Which built-in Node.js module is commonly used to work with files?",
      explanation:
        "The fs module provides APIs for interacting with the file system, including reading and writing files.",
      options: [
        { text: "fs", correct: true },
        { text: "http", correct: false },
        { text: "events", correct: false },
        { text: "url", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Modules",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this CommonJS code output?",
      codeSnippet:
        "const path = require('path');\nconsole.log(path.basename('/users/saif/app.js'));",
      codeLanguage: "javascript",
      explanation:
        "path.basename() returns the final portion of a path, so the result is app.js.",
      options: [
        { text: "/users/saif/app.js", correct: false },
        { text: "users", correct: false },
        { text: "app.js", correct: true },
        { text: ".js", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Modules",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the purpose of module.exports in CommonJS?",
      explanation:
        "module.exports defines the value that another CommonJS module receives when it uses require() to import the module.",
      options: [
        { text: "To expose values from a module to other modules", correct: true },
        { text: "To install an npm package", correct: false },
        { text: "To start the Node.js event loop", correct: false },
        { text: "To create an HTTP server automatically", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Event Loop",
      type: "code_output",
      difficulty: "medium",
      questionText: "What is the output order of this Node.js code?",
      codeSnippet:
        "console.log('A');\n\nsetTimeout(() => console.log('B'), 0);\n\nPromise.resolve().then(() => console.log('C'));\n\nconsole.log('D');",
      codeLanguage: "javascript",
      explanation:
        "Synchronous code executes first, followed by Promise microtasks, and then timer callbacks.",
      options: [
        { text: "A, B, C, D", correct: false },
        { text: "A, D, C, B", correct: true },
        { text: "A, C, D, B", correct: false },
        { text: "C, A, D, B", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Event Loop",
      type: "theory",
      difficulty: "medium",
      questionText: "Why is Node.js well suited for I/O-heavy applications?",
      explanation:
        "Node.js uses an event-driven architecture and non-blocking I/O, allowing it to handle many concurrent I/O operations without blocking the main JavaScript thread.",
      options: [
        { text: "It uses event-driven, non-blocking I/O", correct: true },
        { text: "Every request runs in a separate JavaScript thread", correct: false },
        { text: "It avoids asynchronous operations", correct: false },
        { text: "It stores all application data in memory", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "File System",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does fs.readFileSync() do?",
      codeSnippet:
        "const fs = require('fs');\nconst data = fs.readFileSync('data.txt', 'utf8');\nconsole.log(data);",
      codeLanguage: "javascript",
      explanation:
        "readFileSync performs a synchronous file read and blocks execution until the file has been read or an error occurs.",
      options: [
        { text: "Reads the file asynchronously", correct: false },
        { text: "Reads the file synchronously", correct: true },
        { text: "Deletes the file", correct: false },
        { text: "Creates a new file", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "File System",
      type: "debugging",
      difficulty: "hard",
      questionText: "What is the main concern with using fs.readFileSync() inside a request handler?",
      codeSnippet:
        "app.get('/report', (req, res) => {\n  const report = fs.readFileSync('large-report.json', 'utf8');\n  res.send(report);\n});",
      codeLanguage: "javascript",
      explanation:
        "A synchronous file operation blocks the Node.js event loop while the file is being read, potentially delaying other requests.",
      options: [
        { text: "It can block the event loop while the file is being read", correct: true },
        { text: "It always deletes the file after reading", correct: false },
        { text: "It automatically creates multiple Node.js processes", correct: false },
        { text: "It can only read JavaScript files", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "HTTP",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which status code is commonly used when an HTTP request succeeds and a resource is returned?",
      codeSnippet:
        "const http = require('http');\n\nhttp.createServer((req, res) => {\n  res.statusCode = 200;\n  res.end('OK');\n});",
      codeLanguage: "javascript",
      explanation:
        "HTTP status code 200 means the request was successfully processed.",
      options: [
        { text: "200", correct: true },
        { text: "301", correct: false },
        { text: "404", correct: false },
        { text: "500", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "HTTP",
      type: "theory",
      difficulty: "medium",
      questionText: "Which built-in Node.js module can be used to create an HTTP server?",
      explanation:
        "The http module provides createServer() and other APIs for building HTTP servers.",
      options: [
        { text: "http", correct: true },
        { text: "fs", correct: false },
        { text: "crypto", correct: false },
        { text: "stream", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "NPM",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the primary purpose of package.json in a Node.js project?",
      explanation:
        "package.json describes project metadata, dependencies, scripts, and other configuration used by the Node.js/npm ecosystem.",
      options: [
        { text: "To define project metadata, dependencies, and scripts", correct: true },
        { text: "To store the Node.js runtime itself", correct: false },
        { text: "To replace the operating system", correct: false },
        { text: "To compile JavaScript into machine code", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "NPM",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does npm install express --save do in a typical Node.js project?",
      codeSnippet: "npm install express --save",
      codeLanguage: "bash",
      explanation:
        "The command installs Express and records it as a project dependency in package.json. Modern npm versions save dependencies by default.",
      options: [
        { text: "Installs Express and records it as a dependency", correct: true },
        { text: "Removes Express from the project", correct: false },
        { text: "Starts the Express server", correct: false },
        { text: "Converts Express into TypeScript", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Environment Variables",
      type: "theory",
      difficulty: "medium",
      questionText: "How can a Node.js application access an environment variable called PORT?",
      explanation:
        "Node.js exposes environment variables through process.env.",
      options: [
        { text: "process.env.PORT", correct: true },
        { text: "env.PORT()", correct: false },
        { text: "process.PORT", correct: false },
        { text: "global.env.PORT", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Environment Variables",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this code log if PORT is set to 4000 in the environment?",
      codeSnippet: "console.log(process.env.PORT);",
      codeLanguage: "javascript",
      explanation:
        "Environment variables exposed through process.env are represented as strings, so PORT will be the string '4000'.",
      options: [
        { text: "4000 as a number", correct: false },
        { text: "'4000' as a string", correct: true },
        { text: "true", correct: false },
        { text: "undefined", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Streams",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a major advantage of Node.js streams when handling large files?",
      explanation:
        "Streams process data incrementally instead of loading the entire file into memory at once, which can reduce memory usage.",
      options: [
        { text: "They allow data to be processed incrementally", correct: true },
        { text: "They always make files smaller", correct: false },
        { text: "They disable asynchronous I/O", correct: false },
        { text: "They store the entire file in memory first", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Streams",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this code create?",
      codeSnippet:
        "const fs = require('fs');\nconst stream = fs.createReadStream('large.txt');\nstream.on('data', chunk => {\n  console.log(chunk.length);\n});",
      codeLanguage: "javascript",
      explanation:
        "createReadStream creates a readable stream that emits chunks of the file as data becomes available.",
      options: [
        { text: "A readable stream that emits file chunks", correct: true },
        { text: "A complete string containing the entire file", correct: false },
        { text: "A writable database connection", correct: false },
        { text: "A synchronous file descriptor only", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Error Handling",
      type: "debugging",
      difficulty: "hard",
      questionText: "What is the problem with this async function?",
      codeSnippet:
        "async function getUser() {\n  const user = await fetchUser();\n  return user;\n}\n\ngetUser();",
      codeLanguage: "javascript",
      explanation:
        "If fetchUser() rejects, the rejection propagates through getUser(). The caller should await the function in a try/catch or attach a catch handler.",
      options: [
        { text: "The returned Promise should be handled for possible rejection", correct: true },
        { text: "async functions cannot use await", correct: false },
        { text: "fetchUser must always be synchronous", correct: false },
        { text: "Promises cannot reject in Node.js", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Process",
      type: "theory",
      difficulty: "medium",
      questionText: "What does process.exit(1) generally indicate?",
      explanation:
        "A non-zero exit code conventionally indicates that a process terminated because of an error or unsuccessful condition.",
      options: [
        { text: "The process is exiting with an unsuccessful status", correct: true },
        { text: "The process is restarting automatically", correct: false },
        { text: "The process is entering debug mode", correct: false },
        { text: "The process is opening a new HTTP connection", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Events",
      type: "multiple_correct",
      difficulty: "hard",
      questionText: "Which statements about Node.js EventEmitter are correct?",
      explanation:
        "EventEmitter allows objects to emit named events and lets listeners subscribe to those events using methods such as on() and once().",
      options: [
        { text: "It allows listeners to subscribe to named events", correct: true },
        { text: "emit() can trigger listeners for an event", correct: true },
        { text: "once() creates a listener that runs at most once", correct: true },
        { text: "EventEmitter is only available through third-party packages", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Performance",
      type: "theory",
      difficulty: "advanced",
      questionText: "Which approach is generally most appropriate for CPU-intensive work in a Node.js application?",
      explanation:
        "CPU-intensive JavaScript executed on the main thread can block the Node.js event loop. Worker Threads can move CPU-heavy work to separate threads, allowing the main event loop to remain responsive.",
      options: [
        { text: "Use Worker Threads to move CPU-intensive work off the main thread", correct: true },
        { text: "Use synchronous file system operations for better performance", correct: false },
        { text: "Increase the number of callbacks in the event loop", correct: false },
        { text: "Store all CPU-intensive calculations in environment variables", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Buffers",
      type: "theory",
      difficulty: "easy",
      questionText: "What is a Buffer in Node.js?",
      explanation:
        "A Buffer represents a fixed-length chunk of raw binary data, used for working with things like file contents, network packets, and streams before they are interpreted as a specific encoding.",
      options: [
        { text: "A fixed-length representation of raw binary data", correct: true },
        { text: "A caching layer for HTTP responses", correct: false },
        { text: "A wrapper around JSON objects", correct: false },
        { text: "A built-in database client", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Buffers",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code output?",
      codeSnippet: "const buf = Buffer.from('hello');\nconsole.log(buf.toString('utf8'));",
      codeLanguage: "javascript",
      explanation:
        "Buffer.from('hello') creates a Buffer containing the UTF-8 encoded bytes of the string, and toString('utf8') decodes those bytes back into the original text.",
      options: [
        { text: "hello", correct: true },
        { text: "<Buffer 68 65 6c 6c 6f>", correct: false },
        { text: "5", correct: false },
        { text: "undefined", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Buffers",
      type: "theory",
      difficulty: "hard",
      questionText: "Why does encoding matter when converting between a Buffer and a string?",
      explanation:
        "A Buffer stores raw bytes with no inherent text meaning. The encoding (such as utf8, base64, or hex) determines how those bytes are interpreted as characters, so using the wrong encoding can produce garbled or incorrect text.",
      options: [
        { text: "The encoding determines how raw bytes are interpreted as characters", correct: true },
        { text: "Encoding only affects how fast a Buffer is created", correct: false },
        { text: "Buffers cannot be converted to strings at all", correct: false },
        { text: "Encoding changes the length of the underlying binary data", correct: false },
      ],
    },
    // =========================================================================
    // Next.js
    // =========================================================================
    {
      subject: "Next.js",
      topic: "App Router",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the App Router in Next.js?",
      explanation:
        "The App Router is Next.js's routing architecture based on the app directory and React Server Components.",
      options: [
        { text: "A routing architecture based on the app directory", correct: true },
        { text: "A CSS framework", correct: false },
        { text: "A database ORM", correct: false },
        { text: "A Node.js package manager", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Routing",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which URL maps to this Next.js App Router page?",
      codeSnippet: "app/\n  dashboard/\n    page.tsx",
      codeLanguage: "typescript",
      explanation:
        "A page.tsx file inside app/dashboard creates the /dashboard route.",
      options: [
        { text: "/dashboard", correct: true },
        { text: "/app/dashboard", correct: false },
        { text: "/page/dashboard", correct: false },
        { text: "/dashboard/page", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Routing",
      type: "theory",
      difficulty: "medium",
      questionText: "What does a dynamic route such as app/blog/[slug]/page.tsx represent?",
      explanation:
        "The [slug] segment is dynamic and can match different URL values such as /blog/hello-world or /blog/nextjs.",
      options: [
        { text: "A route with a dynamic URL segment", correct: true },
        { text: "A route that only accepts the literal URL /blog/[slug]", correct: false },
        { text: "A static CSS route", correct: false },
        { text: "A route that can only be accessed from the server", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Components",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the default component type for a component in the Next.js App Router?",
      explanation:
        "Components in the App Router are Server Components by default unless they are explicitly marked with 'use client'.",
      options: [
        { text: "Server Component", correct: true },
        { text: "Client Component", correct: false },
        { text: "Class Component", correct: false },
        { text: "Static Component", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Components",
      type: "debugging",
      difficulty: "hard",
      questionText: "Why can this component not directly use useState?",
      codeSnippet:
        "import { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}",
      codeLanguage: "typescript",
      explanation:
        "In the App Router, components are Server Components by default. Interactive state requires the component to be marked with 'use client'.",
      options: [
        { text: "It needs 'use client' to use client-side state", correct: true },
        { text: "useState is not supported by React", correct: false },
        { text: "Buttons cannot be used in Next.js", correct: false },
        { text: "Server Components cannot return JSX", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Client Components",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does 'use client' at the top of a file indicate?",
      codeSnippet:
        "'use client';\n\nimport { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}",
      codeLanguage: "typescript",
      explanation:
        "The 'use client' directive marks the module as a Client Component boundary, allowing client-side features such as state and event handlers.",
      options: [
        { text: "The module is treated as a Client Component boundary", correct: true },
        { text: "The page becomes static HTML only", correct: false },
        { text: "The component is converted into a database model", correct: false },
        { text: "The component can no longer use React", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Data Fetching",
      type: "theory",
      difficulty: "medium",
      questionText: "Where can data fetching commonly happen in a Next.js Server Component?",
      explanation:
        "Server Components can perform asynchronous data fetching on the server before rendering the UI.",
      options: [
        { text: "Directly in an async Server Component", correct: true },
        { text: "Only inside useEffect", correct: false },
        { text: "Only inside browser event handlers", correct: false },
        { text: "Only in CSS files", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Data Fetching",
      type: "code_output",
      difficulty: "medium",
      questionText: "What is valid about this Next.js Server Component?",
      codeSnippet:
        "export default async function Page() {\n  const res = await fetch('https://api.example.com/users');\n  const users = await res.json();\n\n  return <pre>{JSON.stringify(users)}</pre>;\n}",
      codeLanguage: "typescript",
      explanation:
        "Server Components can be asynchronous and can await server-side data fetching before returning their UI.",
      options: [
        { text: "The component can await server-side data before rendering", correct: true },
        { text: "Server Components cannot be async", correct: false },
        { text: "fetch can only run in useEffect", correct: false },
        { text: "res.json() must always run in the browser", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Rendering",
      type: "theory",
      difficulty: "medium",
      questionText: "What does static rendering mean in Next.js?",
      explanation:
        "Static rendering generates a route ahead of time so the result can be reused for requests until the relevant data or route is regenerated.",
      options: [
        { text: "The route is rendered ahead of requests and can be reused", correct: true },
        { text: "The route can never contain HTML", correct: false },
        { text: "The route must execute entirely in the browser", correct: false },
        { text: "The route cannot use React components", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Rendering",
      type: "theory",
      difficulty: "hard",
      questionText: "What is dynamic rendering in Next.js?",
      explanation:
        "Dynamic rendering means a route is rendered at request time rather than being generated only ahead of time.",
      options: [
        { text: "Rendering a route at request time", correct: true },
        { text: "Rendering every component exclusively in the browser", correct: false },
        { text: "Rendering only CSS at build time", correct: false },
        { text: "Disabling server-side rendering", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Metadata",
      type: "code_output",
      difficulty: "easy",
      questionText: "What is the purpose of exporting metadata from a Next.js App Router page or layout?",
      codeSnippet:
        "import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: 'Dashboard',\n  description: 'Admin dashboard',\n};",
      codeLanguage: "typescript",
      explanation:
        "The metadata export allows Next.js to generate document metadata such as the page title and description.",
      options: [
        { text: "To define document metadata such as title and description", correct: true },
        { text: "To define PostgreSQL tables", correct: false },
        { text: "To create API authentication tokens", correct: false },
        { text: "To configure Tailwind classes", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Layouts",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the purpose of layout.tsx in the Next.js App Router?",
      explanation:
        "A layout defines UI that is shared across routes within its segment and persists during navigation between those routes.",
      options: [
        { text: "To define shared UI for routes within a segment", correct: true },
        { text: "To define only database migrations", correct: false },
        { text: "To replace package.json", correct: false },
        { text: "To create environment variables", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Layouts",
      type: "code_output",
      difficulty: "medium",
      questionText: "Which component renders the content of child routes inside this layout?",
      codeSnippet:
        "export default function Layout({ children }: { children: React.ReactNode }) {\n  return (\n    <div>\n      <nav>Navigation</nav>\n      {children}\n    </div>\n  );\n}",
      codeLanguage: "typescript",
      explanation:
        "The children prop represents the nested route content rendered inside the layout.",
      options: [
        { text: "{children}", correct: true },
        { text: "{layout}", correct: false },
        { text: "<Outlet />", correct: false },
        { text: "{page}", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Navigation",
      type: "theory",
      difficulty: "easy",
      questionText: "Which Next.js component should generally be used for client-side navigation between internal routes?",
      explanation:
        "The Link component from next/link provides client-side navigation and prefetching behavior for internal routes.",
      options: [
        { text: "Link from next/link", correct: true },
        { text: "Anchor from next/anchor", correct: false },
        { text: "Navigate from next/navigation only", correct: false },
        { text: "RouterLink from next/router", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Navigation",
      type: "code_output",
      difficulty: "medium",
      questionText: "What route will this Link navigate to?",
      codeSnippet:
        "import Link from 'next/link';\n\n<Link href=\"/dashboard\">Dashboard</Link>",
      codeLanguage: "typescript",
      explanation:
        "The href value is /dashboard, so clicking the Link navigates to the dashboard route.",
      options: [
        { text: "/dashboard", correct: true },
        { text: "/link/dashboard", correct: false },
        { text: "/app/dashboard", correct: false },
        { text: "/dashboard/page.tsx", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "API Routes",
      type: "theory",
      difficulty: "medium",
      questionText: "Where are Route Handlers commonly defined in the Next.js App Router?",
      explanation:
        "A route.ts file can define HTTP handlers such as GET and POST inside the app directory.",
      options: [
        { text: "In a route.ts file inside the app directory", correct: true },
        { text: "Only inside public/", correct: false },
        { text: "Only inside styles/", correct: false },
        { text: "Inside package.json", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "API Routes",
      type: "code_output",
      difficulty: "hard",
      questionText: "Which HTTP method does this Route Handler implement?",
      codeSnippet:
        "import { NextResponse } from 'next/server';\n\nexport async function POST() {\n  return NextResponse.json({ success: true });\n}",
      codeLanguage: "typescript",
      explanation:
        "Exporting a function named POST defines a handler for HTTP POST requests to that route.",
      options: [
        { text: "POST", correct: true },
        { text: "GET", correct: false },
        { text: "PUT", correct: false },
        { text: "DELETE", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Environment Variables",
      type: "debugging",
      difficulty: "hard",
      questionText: "What is the important security difference between these two environment variables?",
      codeSnippet:
        "DATABASE_URL=postgres://user:password@localhost/db\nNEXT_PUBLIC_API_URL=https://api.example.com",
      codeLanguage: "bash",
      explanation:
        "Variables prefixed with NEXT_PUBLIC_ can be exposed to browser-side code. Sensitive credentials such as database URLs should not use that prefix.",
      options: [
        { text: "NEXT_PUBLIC_API_URL may be exposed to the browser, while DATABASE_URL should remain server-only", correct: true },
        { text: "Both variables are automatically hidden from the browser", correct: false },
        { text: "DATABASE_URL must use NEXT_PUBLIC_", correct: false },
        { text: "NEXT_PUBLIC_ variables are encrypted automatically", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Middleware",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is middleware commonly used for in Next.js?",
      explanation:
        "Next.js middleware can run before a request is completed and can be used for tasks such as authentication checks, redirects, rewrites, and request-based logic.",
      options: [
        { text: "Running request-time logic such as authentication checks and redirects", correct: true },
        { text: "Replacing React components", correct: false },
        { text: "Managing PostgreSQL schemas", correct: false },
        { text: "Compiling TypeScript into SQL", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Caching",
      type: "multiple_correct",
      difficulty: "advanced",
      questionText: "Which statements about Next.js data fetching and caching are correct?",
      explanation:
        "Next.js provides caching and revalidation mechanisms for server-side data fetching. The exact caching behavior depends on the API and configuration being used.",
      options: [
        { text: "Server-side fetch requests can participate in Next.js caching behavior", correct: true },
        { text: "Revalidation can be used to refresh cached data", correct: true },
        { text: "Caching behavior can affect when fresh data is retrieved", correct: true },
        { text: "Every fetch request in Next.js is permanently cached with no way to change its behavior", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Actions",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a Server Action in Next.js?",
      explanation:
        "A Server Action is an asynchronous function marked with 'use server' that runs on the server and can be called directly from Server or Client Components, commonly used to handle form submissions and mutations.",
      options: [
        { text: "An async function marked 'use server' that runs on the server and can be invoked from components", correct: true },
        { text: "A CSS class applied only to server-rendered elements", correct: false },
        { text: "A background cron job configured in next.config.js", correct: false },
        { text: "A client-side hook for managing local component state", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Actions",
      type: "code_output",
      difficulty: "hard",
      questionText: "What happens when this form is submitted?",
      codeSnippet:
        "async function createPost(formData: FormData) {\n  'use server';\n  const title = formData.get('title');\n  await db.posts.create({ title });\n}\n\nexport default function NewPost() {\n  return (\n    <form action={createPost}>\n      <input name=\"title\" />\n      <button type=\"submit\">Create</button>\n    </form>\n  );\n}",
      codeLanguage: "typescript",
      explanation:
        "The form's action is bound to createPost, a Server Action. Submitting the form invokes createPost on the server with the submitted FormData, without the developer needing to write a separate API route or client-side fetch call.",
      options: [
        { text: "The Server Action runs on the server with the submitted form data", correct: true },
        { text: "The form data is only logged in the browser console", correct: false },
        { text: "createPost executes entirely in the client bundle", correct: false },
        { text: "The submission is blocked because actions require a route.ts file", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Actions",
      type: "theory",
      difficulty: "advanced",
      questionText: "How do Server Actions primarily differ from traditional Next.js API Routes for handling mutations?",
      explanation:
        "Server Actions can be defined as functions and called directly from components without manually creating a separate route handler and client-side fetch call, while still executing exclusively on the server.",
      options: [
        { text: "They can be invoked directly from components without a separate route handler and manual fetch call", correct: true },
        { text: "They execute entirely in the browser instead of the server", correct: false },
        { text: "They replace the need for a database entirely", correct: false },
        { text: "They can only be used inside next.config.js", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Authentication",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a common approach for protecting routes in the Next.js App Router based on authentication state?",
      explanation:
        "Checking session or token state in middleware, or in Server Components before rendering, are common ways to guard routes and redirect unauthenticated users.",
      options: [
        { text: "Checking authentication state in middleware or Server Components and redirecting when needed", correct: true },
        { text: "Authentication is handled automatically with no code required", correct: false },
        { text: "Only client-side CSS can restrict access to a route", correct: false },
        { text: "Routes cannot be protected in the App Router", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Authentication",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does this middleware do for unauthenticated requests to /dashboard?",
      codeSnippet:
        "export function middleware(request: NextRequest) {\n  const session = request.cookies.get('session');\n\n  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {\n    return NextResponse.redirect(new URL('/login', request.url));\n  }\n\n  return NextResponse.next();\n}",
      codeLanguage: "typescript",
      explanation:
        "The middleware checks for a session cookie before requests to /dashboard are completed. If no session is present, it redirects the request to /login instead of allowing access to the protected route.",
      options: [
        { text: "It redirects the request to /login before the dashboard route renders", correct: true },
        { text: "It deletes the user's session cookie", correct: false },
        { text: "It allows the request through regardless of the session", correct: false },
        { text: "It only runs after the dashboard page has already rendered", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Authentication",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a key practical trade-off between cookie-based sessions and JWTs for authentication in a Next.js application?",
      explanation:
        "Server-managed sessions can typically be revoked immediately by invalidating server-side state, while stateless JWTs are harder to revoke before expiry unless additional infrastructure (such as a blocklist) is introduced.",
      options: [
        { text: "Server-managed sessions are easier to revoke immediately; stateless JWTs are harder to revoke before they expire", correct: true },
        { text: "JWTs cannot be used with Next.js under any circumstances", correct: false },
        { text: "Cookie-based sessions cannot be used with Server Components", correct: false },
        { text: "Both approaches are functionally identical with no trade-offs", correct: false },
      ],
    },
    // =========================================================================
    // SQL
    // =========================================================================
    {
      subject: "SQL",
      topic: "Joins",
      type: "theory",
      difficulty: "medium",
      questionText: "What does an INNER JOIN return?",
      explanation: "An INNER JOIN returns only the rows where the join condition matches in both tables.",
      options: [
        { text: "Only rows with matching values in both tables", correct: true },
        { text: "All rows from the left table regardless of a match", correct: false },
        { text: "All rows from both tables, matched or not", correct: false },
        { text: "Only rows that exist in neither table", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "code_output",
      difficulty: "easy",
      questionText: "What does COUNT(*) return for an empty table?",
      codeSnippet: "SELECT COUNT(*) FROM empty_table;",
      codeLanguage: "sql",
      explanation: "COUNT(*) always returns a row with the value 0 for an empty table, never NULL.",
      options: [
        { text: "0", correct: true },
        { text: "NULL", correct: false },
        { text: "An error", correct: false },
        { text: "An empty result set", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Joins",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the purpose of a LEFT JOIN?",
      explanation:
        "A LEFT JOIN returns every row from the left table and matching rows from the right table, using NULL when no match exists.",
      options: [
        { text: "Return all left-table rows and matching right-table rows", correct: true },
        { text: "Return only matching rows", correct: false },
        { text: "Return only unmatched rows", correct: false },
        { text: "Return all rows from the right table only", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Joins",
      type: "code_output",
      difficulty: "easy",
      questionText: "What does this query return?",
      codeSnippet:
        "SELECT u.name, o.id\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id;",
      codeLanguage: "sql",
      explanation:
        "Every user is returned. Users without orders still appear, with NULL in the order columns.",
      options: [
        { text: "Only users who have orders", correct: false },
        { text: "Every user, with NULL for users without orders", correct: true },
        { text: "Only orders without users", correct: false },
        { text: "Only users without orders", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "theory",
      difficulty: "easy",
      questionText: "What is the difference between WHERE and HAVING?",
      explanation:
        "WHERE filters rows before grouping, while HAVING filters groups after aggregation.",
      options: [
        { text: "WHERE filters rows; HAVING filters groups", correct: true },
        { text: "WHERE filters groups; HAVING filters rows", correct: false },
        { text: "They are always interchangeable", correct: false },
        { text: "HAVING can never use aggregate functions", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query return?",
      codeSnippet:
        "SELECT department_id, COUNT(*)\nFROM employees\nGROUP BY department_id;",
      codeLanguage: "sql",
      explanation:
        "GROUP BY creates one group for each department_id and COUNT(*) counts rows within each group.",
      options: [
        { text: "One count for the entire table", correct: false },
        { text: "One count for each department", correct: true },
        { text: "Only departments with one employee", correct: false },
        { text: "A count of distinct employees globally", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the primary purpose of an index?",
      explanation:
        "Indexes provide a data structure that can make lookups and certain ordering operations faster, at the cost of storage and write overhead.",
      options: [
        { text: "Improve performance of suitable queries", correct: true },
        { text: "Guarantee every query becomes faster", correct: false },
        { text: "Replace database constraints", correct: false },
        { text: "Automatically remove duplicate rows", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Indexes",
      type: "debugging",
      difficulty: "medium",
      questionText: "Why might this index not be useful for the query?",
      codeSnippet:
        "CREATE INDEX idx_users_email ON users(email);\n\nSELECT * FROM users\nWHERE LOWER(email) = 'user@example.com';",
      codeLanguage: "sql",
      explanation:
        "A normal index on email does not necessarily support an expression involving LOWER(email). An expression/function-based index or another appropriate strategy may be required depending on the database.",
      options: [
        { text: "The query applies LOWER(email), not the indexed expression directly", correct: true },
        { text: "Indexes cannot contain text columns", correct: false },
        { text: "SELECT * prevents every index from being used", correct: false },
        { text: "WHERE clauses cannot use indexes", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Transactions",
      type: "theory",
      difficulty: "medium",
      questionText: "What does COMMIT do in a transaction?",
      explanation:
        "COMMIT permanently makes the transaction's changes visible according to the database's transaction semantics.",
      options: [
        { text: "Persist the transaction's changes", correct: true },
        { text: "Undo all transaction changes", correct: false },
        { text: "Create an index", correct: false },
        { text: "Lock every table permanently", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Transactions",
      type: "code_output",
      difficulty: "medium",
      questionText: "What happens to the UPDATE after ROLLBACK?",
      codeSnippet:
        "BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nROLLBACK;",
      codeLanguage: "sql",
      explanation:
        "ROLLBACK aborts the transaction and undoes the UPDATE performed within that transaction.",
      options: [
        { text: "The update is undone", correct: true },
        { text: "The update is committed twice", correct: false },
        { text: "The account is deleted", correct: false },
        { text: "The database becomes read-only", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Joins",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a CROSS JOIN?",
      explanation:
        "A CROSS JOIN produces the Cartesian product, pairing every row from the first table with every row from the second table.",
      options: [
        { text: "The Cartesian product of two tables", correct: true },
        { text: "Only matching rows between tables", correct: false },
        { text: "Only unmatched rows", correct: false },
        { text: "A join based automatically on primary keys", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "code_output",
      difficulty: "hard",
      questionText: "What is the difference between COUNT(*) and COUNT(column_name)?",
      codeSnippet:
        "SELECT COUNT(*), COUNT(email)\nFROM users;",
      codeLanguage: "sql",
      explanation:
        "COUNT(*) counts rows, while COUNT(email) counts only rows where email is not NULL.",
      options: [
        { text: "COUNT(*) counts rows; COUNT(email) ignores NULL emails", correct: true },
        { text: "Both always return exactly the same value", correct: false },
        { text: "COUNT(*) ignores NULL rows", correct: false },
        { text: "COUNT(email) counts only duplicate emails", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Transactions",
      type: "theory",
      difficulty: "hard",
      questionText: "Which ACID property ensures that a transaction's changes are all-or-nothing?",
      explanation:
        "Atomicity means a transaction either completes as a whole or is rolled back as a whole.",
      options: [
        { text: "Atomicity", correct: true },
        { text: "Consistency", correct: false },
        { text: "Isolation", correct: false },
        { text: "Durability", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "hard",
      questionText: "Why can adding too many indexes hurt database performance?",
      explanation:
        "Indexes consume storage and must be maintained when rows are inserted, updated, or deleted.",
      options: [
        { text: "Writes become more expensive because indexes must be maintained", correct: true },
        { text: "Indexes automatically delete old rows", correct: false },
        { text: "Indexes prevent SELECT queries", correct: false },
        { text: "Indexes always increase table size infinitely", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Joins",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What problem can occur with this query when users have multiple orders?",
      codeSnippet:
        "SELECT u.id, u.name\nFROM users u\nJOIN orders o ON o.user_id = u.id;",
      codeLanguage: "sql",
      explanation:
        "The join produces one result row for each matching order, so a user with multiple orders appears multiple times.",
      options: [
        { text: "Users with multiple orders can appear multiple times", correct: true },
        { text: "The query automatically groups users", correct: false },
        { text: "Only users with exactly one order are returned", correct: false },
        { text: "The query deletes duplicate users", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a window function?",
      explanation:
        "A window function performs calculations across related rows while retaining individual result rows instead of collapsing them into groups.",
      options: [
        { text: "A function that calculates across related rows without collapsing them", correct: true },
        { text: "A function that creates database windows", correct: false },
        { text: "A replacement for every JOIN", correct: false },
        { text: "A function that permanently stores query results", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Aggregation",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What does ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) do?",
      codeSnippet:
        "SELECT name, department_id, salary,\n       ROW_NUMBER() OVER (\n         PARTITION BY department_id\n         ORDER BY salary DESC\n       ) AS rank\nFROM employees;",
      codeLanguage: "sql",
      explanation:
        "Rows are numbered separately within each department, with the highest salary receiving row number 1.",
      options: [
        { text: "Ranks employees by salary separately within each department", correct: true },
        { text: "Ranks every employee globally regardless of department", correct: false },
        { text: "Groups employees into one row per department", correct: false },
        { text: "Deletes employees with duplicate salaries", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Transactions",
      type: "debugging",
      difficulty: "advanced",
      questionText: "Why can two concurrent transactions produce unexpected results under weak isolation?",
      explanation:
        "Weak transaction isolation can allow phenomena such as dirty reads, non-repeatable reads, or phantom reads depending on the database and isolation level.",
      options: [
        { text: "Concurrent transactions may observe intermediate or changing data", correct: true },
        { text: "Transactions always execute sequentially", correct: false },
        { text: "SQL automatically disables concurrency", correct: false },
        { text: "Indexes eliminate all concurrency problems", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a composite index?",
      explanation:
        "A composite index is an index built over multiple columns, with column order affecting which query patterns it efficiently supports.",
      options: [
        { text: "An index containing multiple columns", correct: true },
        { text: "An index containing multiple databases", correct: false },
        { text: "An index that can only store integers", correct: false },
        { text: "An index automatically created for every table", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Subqueries",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query return?",
      codeSnippet:
        "SELECT name\nFROM employees\nWHERE salary > (\n  SELECT AVG(salary)\n  FROM employees\n);",
      codeLanguage: "sql",
      explanation:
        "The subquery calculates the average salary across all employees. The outer query then returns employees whose salary is greater than that average.",
      options: [
        { text: "Employees earning more than the average salary", correct: true },
        { text: "Employees earning exactly the average salary", correct: false },
        { text: "Employees earning less than the average salary", correct: false },
        { text: "Only the employee with the highest salary", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "SELECT",
      type: "theory",
      difficulty: "easy",
      questionText: "What does SELECT DISTINCT do?",
      explanation:
        "SELECT DISTINCT removes duplicate rows from the result set, returning only unique combinations of the selected columns.",
      options: [
        { text: "Removes duplicate rows from the result set", correct: true },
        { text: "Selects only the first row of a table", correct: false },
        { text: "Sorts the result set alphabetically", correct: false },
        { text: "Deletes duplicate rows from the underlying table", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "SELECT",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which rows does this query return?",
      codeSnippet:
        "SELECT name, price\nFROM products\nWHERE price > 50;",
      codeLanguage: "sql",
      explanation:
        "The WHERE clause filters rows so only products with a price greater than 50 are included in the result.",
      options: [
        { text: "Products with a price greater than 50", correct: true },
        { text: "Every product in the table", correct: false },
        { text: "Products with a price of exactly 50", correct: false },
        { text: "Products with a price less than 50", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "SELECT",
      type: "code_output",
      difficulty: "medium",
      questionText: "In what order will the results be sorted?",
      codeSnippet:
        "SELECT name, department, salary\nFROM employees\nORDER BY department ASC, salary DESC;",
      codeLanguage: "sql",
      explanation:
        "Rows are first sorted alphabetically by department, and within each department they are sorted by salary from highest to lowest.",
      options: [
        { text: "By department ascending, then by salary descending within each department", correct: true },
        { text: "By salary ascending only", correct: false },
        { text: "By department descending, then by salary ascending", correct: false },
        { text: "Randomly, since two ORDER BY columns cancel out", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "CTEs",
      type: "theory",
      difficulty: "medium",
      questionText: "What is a Common Table Expression (CTE)?",
      explanation:
        "A CTE, defined with a WITH clause, is a named temporary result set that can be referenced within a single SQL statement, often used to make complex queries more readable.",
      options: [
        { text: "A named temporary result set defined with WITH and used within a statement", correct: true },
        { text: "A permanent table stored in the database schema", correct: false },
        { text: "A type of index used for text search", correct: false },
        { text: "A trigger that runs before an INSERT", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "CTEs",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query return?",
      codeSnippet:
        "WITH high_earners AS (\n  SELECT * FROM employees WHERE salary > 100000\n)\nSELECT name FROM high_earners\nWHERE department = 'Engineering';",
      codeLanguage: "sql",
      explanation:
        "The CTE high_earners first filters employees earning more than 100000. The outer query then further filters that result to only Engineering employees.",
      options: [
        { text: "Names of Engineering employees earning more than 100000", correct: true },
        { text: "Names of all Engineering employees regardless of salary", correct: false },
        { text: "Names of all employees earning more than 100000, regardless of department", correct: false },
        { text: "An error, because CTEs cannot be filtered further", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "CTEs",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a recursive CTE used for?",
      explanation:
        "A recursive CTE references itself to repeatedly process rows, which is commonly used to query hierarchical or graph-like data such as organizational charts or category trees.",
      options: [
        { text: "Querying hierarchical or recursive data by having the CTE reference itself", correct: true },
        { text: "Automatically indexing every table in a query", correct: false },
        { text: "Encrypting query results", correct: false },
        { text: "Replacing all JOIN operations", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Constraints",
      type: "theory",
      difficulty: "easy",
      questionText: "What does a PRIMARY KEY constraint guarantee?",
      explanation:
        "A PRIMARY KEY constraint ensures the column (or columns) uniquely identifies each row and cannot contain NULL values.",
      options: [
        { text: "Uniquely identifies each row and disallows NULL", correct: true },
        { text: "Automatically indexes every column in the table", correct: false },
        { text: "Allows duplicate values as long as they are indexed", correct: false },
        { text: "Encrypts the column's values", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Constraints",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this constraint enforce?",
      codeSnippet:
        "CREATE TABLE orders (\n  id INT PRIMARY KEY,\n  user_id INT,\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);",
      codeLanguage: "sql",
      explanation:
        "The FOREIGN KEY constraint ensures that every user_id value in orders must correspond to an existing id value in the users table.",
      options: [
        { text: "Every order's user_id must reference an existing user", correct: true },
        { text: "Orders cannot have a user_id column", correct: false },
        { text: "Users are automatically deleted when an order is deleted", correct: false },
        { text: "The orders table cannot contain more than one row per user", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Constraints",
      type: "debugging",
      difficulty: "hard",
      questionText: "Why does this INSERT statement fail?",
      codeSnippet:
        "CREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(255) UNIQUE\n);\n\nINSERT INTO users (id, email) VALUES (1, 'user@example.com');\nINSERT INTO users (id, email) VALUES (2, 'user@example.com');",
      codeLanguage: "sql",
      explanation:
        "The UNIQUE constraint on email prevents two rows from having the same email value, so the second INSERT violates the constraint and fails.",
      options: [
        { text: "It violates the UNIQUE constraint on email", correct: true },
        { text: "It violates the PRIMARY KEY constraint on id", correct: false },
        { text: "VARCHAR columns cannot store email addresses", correct: false },
        { text: "Only one row can ever be inserted into a table", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Window Functions",
      type: "theory",
      difficulty: "medium",
      questionText: "How do window functions differ from GROUP BY aggregation?",
      explanation:
        "GROUP BY collapses multiple rows into a single summarized row per group, while window functions perform calculations across a set of related rows but keep each row separate in the output.",
      options: [
        { text: "Window functions keep individual rows; GROUP BY collapses rows into groups", correct: true },
        { text: "Window functions always return fewer rows than the input", correct: false },
        { text: "GROUP BY and window functions always produce identical results", correct: false },
        { text: "Window functions can only be used with COUNT()", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Window Functions",
      type: "code_output",
      difficulty: "hard",
      questionText: "What is the key difference between RANK() and DENSE_RANK() when there is a tie?",
      codeSnippet:
        "SELECT name, score,\n       RANK() OVER (ORDER BY score DESC) AS rnk,\n       DENSE_RANK() OVER (ORDER BY score DESC) AS drnk\nFROM results;",
      codeLanguage: "sql",
      explanation:
        "RANK() leaves gaps in the ranking sequence after a tie (e.g. 1, 2, 2, 4), while DENSE_RANK() does not skip any numbers after a tie (e.g. 1, 2, 2, 3).",
      options: [
        { text: "RANK() leaves gaps after ties; DENSE_RANK() does not", correct: true },
        { text: "DENSE_RANK() leaves gaps after ties; RANK() does not", correct: false },
        { text: "They always produce identical results", correct: false },
        { text: "RANK() ignores ties completely", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Window Functions",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What does this query calculate for each row?",
      codeSnippet:
        "SELECT order_date, amount,\n       SUM(amount) OVER (ORDER BY order_date) AS running_total\nFROM orders;",
      codeLanguage: "sql",
      explanation:
        "With an ORDER BY inside the window definition and no explicit frame, SUM(amount) OVER (...) accumulates a running total from the first row up through the current row.",
      options: [
        { text: "A running total of amount ordered by order_date", correct: true },
        { text: "The overall total of amount across all rows, repeated on every row", correct: false },
        { text: "The average amount per order_date", correct: false },
        { text: "The difference between consecutive order amounts", correct: false },
      ],
    },
    // =========================================================================
    // PostgreSQL
    // =========================================================================
    {
      subject: "PostgreSQL",
      topic: "PostgreSQL Basics",
      type: "theory",
      difficulty: "easy",
      questionText: "Which command-line client is commonly used to interact with PostgreSQL?",
      explanation:
        "psql is PostgreSQL's standard interactive terminal client.",
      options: [
        { text: "psql", correct: true },
        { text: "mysql", correct: false },
        { text: "mongo", correct: false },
        { text: "redis-cli", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "PostgreSQL Basics",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which PostgreSQL data type is appropriate for storing a variable-length string?",
      codeSnippet:
        "CREATE TABLE users (\n  name VARCHAR(100)\n);",
      codeLanguage: "sql",
      explanation:
        "VARCHAR stores variable-length character strings, optionally with a maximum length.",
      options: [
        { text: "VARCHAR", correct: true },
        { text: "BOOLEAN", correct: false },
        { text: "INTEGER", correct: false },
        { text: "TIMESTAMP", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "JSONB",
      type: "theory",
      difficulty: "easy",
      questionText: "What is JSONB in PostgreSQL?",
      explanation:
        "JSONB stores JSON data in a decomposed binary representation that supports efficient processing and indexing.",
      options: [
        { text: "A binary representation of JSON designed for efficient processing", correct: true },
        { text: "A replacement for all relational tables", correct: false },
        { text: "A JSON string that cannot be indexed", correct: false },
        { text: "A PostgreSQL-specific boolean type", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Arrays",
      type: "code_output",
      difficulty: "easy",
      questionText: "Which PostgreSQL column definition creates an integer array?",
      codeSnippet:
        "CREATE TABLE products (\n  tag_ids INTEGER[]\n);",
      codeLanguage: "sql",
      explanation:
        "PostgreSQL supports array types by appending [] to the element type.",
      options: [
        { text: "INTEGER[]", correct: true },
        { text: "ARRAY INTEGER", correct: false },
        { text: "INTEGER ARRAY()", correct: false },
        { text: "LIST<INTEGER>", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "medium",
      questionText: "Which PostgreSQL index type is commonly used for equality and range comparisons on scalar values?",
      explanation:
        "B-tree is PostgreSQL's default index type and is suitable for many equality and ordering/range queries.",
      options: [
        { text: "B-tree", correct: true },
        { text: "GIST only", correct: false },
        { text: "Hash only", correct: false },
        { text: "BRIN only", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this PostgreSQL index do?",
      codeSnippet:
        "CREATE INDEX idx_users_email\nON users(email);",
      codeLanguage: "sql",
      explanation:
        "The index creates an index on the email column, which can improve suitable lookups involving that column.",
      options: [
        { text: "Creates an index on users.email", correct: true },
        { text: "Creates a unique constraint on email", correct: false },
        { text: "Encrypts email values", correct: false },
        { text: "Sorts the physical table permanently", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Transactions",
      type: "theory",
      difficulty: "medium",
      questionText: "What is MVCC in PostgreSQL?",
      explanation:
        "Multiversion Concurrency Control allows transactions to work with different row versions, reducing the need for readers and writers to block each other.",
      options: [
        { text: "Multiversion Concurrency Control", correct: true },
        { text: "Multi-Value Column Constraint", correct: false },
        { text: "Memory-Verified Column Cache", correct: false },
        { text: "Multiple Variable Connection Control", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Transactions",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this command do in PostgreSQL?",
      codeSnippet: "BEGIN;\nUPDATE accounts SET balance = balance - 50 WHERE id = 1;\nROLLBACK;",
      codeLanguage: "sql",
      explanation:
        "ROLLBACK cancels the changes made since the transaction began.",
      options: [
        { text: "It undoes the UPDATE", correct: true },
        { text: "It commits the UPDATE", correct: false },
        { text: "It drops the accounts table", correct: false },
        { text: "It creates a savepoint", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "JSONB",
      type: "code_output",
      difficulty: "medium",
      questionText: "Which operator extracts a JSONB object field as JSONB?",
      codeSnippet:
        "SELECT profile -> 'address'\nFROM users;",
      codeLanguage: "sql",
      explanation:
        "The -> operator extracts a JSON object field and returns it as JSON/JSONB rather than text.",
      options: [
        { text: "->", correct: true },
        { text: "->>", correct: false },
        { text: "#>", correct: false },
        { text: "@>", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "JSONB",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the difference between PostgreSQL's -> and ->> JSON operators?",
      explanation:
        "The -> operator returns JSON/JSONB, while ->> extracts the value as text.",
      options: [
        { text: "-> returns JSON/JSONB; ->> returns text", correct: true },
        { text: "-> returns text; ->> returns JSON/JSONB", correct: false },
        { text: "Both always return integers", correct: false },
        { text: "Both operators modify the JSON value", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Arrays",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does the @> operator test when used with PostgreSQL arrays?",
      codeSnippet:
        "SELECT ARRAY[1, 2, 3] @> ARRAY[2];",
      codeLanguage: "sql",
      explanation:
        "For arrays, @> tests whether the left array contains all elements of the right array.",
      options: [
        { text: "Whether the left array contains the right array's elements", correct: true },
        { text: "Whether both arrays are identical in order", correct: false },
        { text: "Whether the arrays have the same length", correct: false },
        { text: "Whether the right array contains the left array", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a partial index in PostgreSQL?",
      explanation:
        "A partial index contains entries only for rows satisfying a specified WHERE predicate.",
      options: [
        { text: "An index built only for rows matching a condition", correct: true },
        { text: "An incomplete index that PostgreSQL cannot use", correct: false },
        { text: "An index containing only half of every value", correct: false },
        { text: "An index that exists only during a transaction", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "code_output",
      difficulty: "hard",
      questionText: "What is the purpose of this PostgreSQL index?",
      codeSnippet:
        "CREATE INDEX idx_active_users\nON users(email)\nWHERE active = true;",
      codeLanguage: "sql",
      explanation:
        "This partial index contains entries only for active users, which can make suitable queries on active users more efficient.",
      options: [
        { text: "Index only rows where active is true", correct: true },
        { text: "Prevent inactive users from being inserted", correct: false },
        { text: "Make email globally unique", correct: false },
        { text: "Automatically set active to true", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Transactions",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a SAVEPOINT used for in PostgreSQL?",
      explanation:
        "A savepoint establishes a point inside a transaction that you can roll back to without rolling back the entire transaction.",
      options: [
        { text: "Create a point for partial rollback within a transaction", correct: true },
        { text: "Permanently commit the transaction", correct: false },
        { text: "Create a database backup", correct: false },
        { text: "Create a new database user", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "theory",
      difficulty: "advanced",
      questionText: "What is a BRIN index particularly useful for?",
      explanation:
        "BRIN indexes are compact and can be effective when column values have a natural correlation with their physical row order, especially for very large tables.",
      options: [
        { text: "Large tables where values correlate with physical row order", correct: true },
        { text: "Only small lookup tables", correct: false },
        { text: "Replacing all B-tree indexes", correct: false },
        { text: "Encrypting table data", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "JSONB",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What does the @> operator test for JSONB values?",
      codeSnippet:
        "SELECT '{\"role\":\"admin\",\"active\":true}'::jsonb\n       @> '{\"role\":\"admin\"}'::jsonb;",
      codeLanguage: "sql",
      explanation:
        "For JSONB, @> tests whether the left JSONB value contains the right JSONB structure.",
      options: [
        { text: "Whether the left JSONB contains the specified structure", correct: true },
        { text: "Whether both JSONB values are textually identical", correct: false },
        { text: "Whether the right JSONB contains the left JSONB", correct: false },
        { text: "Whether the JSONB values can be converted to arrays", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Transactions",
      type: "theory",
      difficulty: "advanced",
      questionText: "Which PostgreSQL isolation level provides the strongest standard isolation behavior?",
      explanation:
        "Among PostgreSQL's transaction isolation levels, SERIALIZABLE provides the strongest isolation and detects potentially conflicting concurrent transactions.",
      options: [
        { text: "SERIALIZABLE", correct: true },
        { text: "READ UNCOMMITTED", correct: false },
        { text: "READ COMMITTED", correct: false },
        { text: "REPEATABLE READ", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Indexes",
      type: "debugging",
      difficulty: "advanced",
      questionText: "Why might PostgreSQL ignore an index even when one exists for the filtered column?",
      codeSnippet:
        "CREATE INDEX idx_orders_customer_id\nON orders(customer_id);\n\nSELECT * FROM orders\nWHERE customer_id = 42;",
      codeLanguage: "sql",
      explanation:
        "PostgreSQL's planner chooses the cheapest estimated execution plan. For example, if a large percentage of rows match, a sequential scan may be cheaper than using the index.",
      options: [
        { text: "The planner may estimate that a sequential scan is cheaper", correct: true },
        { text: "PostgreSQL always uses every available index", correct: false },
        { text: "Indexes can only be used for INSERT statements", correct: false },
        { text: "PostgreSQL ignores all indexes on integer columns", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "PostgreSQL Basics",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What is the purpose of EXPLAIN ANALYZE in PostgreSQL?",
      codeSnippet:
        "EXPLAIN ANALYZE\nSELECT * FROM users\nWHERE email = 'user@example.com';",
      codeLanguage: "sql",
      explanation:
        "EXPLAIN ANALYZE executes the query and reports the actual execution plan, including runtime and row information.",
      options: [
        { text: "Execute the query and show its actual execution plan and timing", correct: true },
        { text: "Create an index automatically", correct: false },
        { text: "Rewrite the query permanently", correct: false },
        { text: "Disable the query planner", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "PostgreSQL Basics",
      type: "theory",
      difficulty: "advanced",
      questionText: "Why is VACUUM important in PostgreSQL?",
      explanation:
        "PostgreSQL's MVCC leaves obsolete row versions after updates and deletes. VACUUM helps reclaim or make reusable storage and maintains visibility information.",
      options: [
        { text: "It helps clean up obsolete row versions created by MVCC", correct: true },
        { text: "It permanently deletes every unused table", correct: false },
        { text: "It replaces PostgreSQL indexes", correct: false },
        { text: "It commits open transactions", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Data Types",
      type: "theory",
      difficulty: "easy",
      questionText: "What does the SERIAL type do when used for a column in PostgreSQL?",
      explanation:
        "SERIAL is shorthand for creating an auto-incrementing integer column backed by a sequence, commonly used for primary keys.",
      options: [
        { text: "Creates an auto-incrementing integer backed by a sequence", correct: true },
        { text: "Stores serialized JSON data", correct: false },
        { text: "Forces a column to always be NULL", correct: false },
        { text: "Encrypts the column automatically", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Data Types",
      type: "code_output",
      difficulty: "medium",
      questionText: "What is the key difference between these two column types?",
      codeSnippet:
        "CREATE TABLE events (\n  starts_at TIMESTAMP,\n  starts_at_tz TIMESTAMPTZ\n);",
      codeLanguage: "sql",
      explanation:
        "TIMESTAMPTZ stores a point in time and normalizes it to UTC internally, converting on input/output based on the session's time zone, while plain TIMESTAMP stores the value with no time zone awareness.",
      options: [
        { text: "TIMESTAMPTZ is time-zone aware; TIMESTAMP is not", correct: true },
        { text: "TIMESTAMP stores dates only, with no time component", correct: false },
        { text: "TIMESTAMPTZ can only store past dates", correct: false },
        { text: "There is no functional difference between them", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Data Types",
      type: "theory",
      difficulty: "hard",
      questionText: "What is a common trade-off of using a randomly generated UUID as a primary key instead of a sequential integer?",
      explanation:
        "Random UUIDs avoid predictable, guessable identifiers and work well for distributed ID generation, but they can hurt B-tree index locality and write performance on very large tables compared to sequential integers.",
      options: [
        { text: "Random UUIDs can reduce index locality and increase write overhead on large tables", correct: true },
        { text: "UUIDs cannot be indexed in PostgreSQL", correct: false },
        { text: "UUIDs are always faster to join than integers", correct: false },
        { text: "PostgreSQL does not support a UUID data type", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Joins",
      type: "theory",
      difficulty: "easy",
      questionText: "What does a FULL OUTER JOIN return in PostgreSQL?",
      explanation:
        "A FULL OUTER JOIN returns all rows from both tables, matching where possible, and filling in NULLs for the side that has no match.",
      options: [
        { text: "All rows from both tables, with NULLs where there is no match", correct: true },
        { text: "Only rows that match in both tables", correct: false },
        { text: "Only rows from the left table", correct: false },
        { text: "Only rows that don't match in either table", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Joins",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query find?",
      codeSnippet:
        "SELECT u.id, u.name\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL;",
      codeLanguage: "sql",
      explanation:
        "This is a common anti-join pattern: the LEFT JOIN keeps every user, and filtering for o.id IS NULL keeps only the users that had no matching order.",
      options: [
        { text: "Users who have never placed an order", correct: true },
        { text: "Users who have placed at least one order", correct: false },
        { text: "Orders with no associated user", correct: false },
        { text: "Every user regardless of orders", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Joins",
      type: "code_output",
      difficulty: "hard",
      questionText: "What relationship does this self join reveal?",
      codeSnippet:
        "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nJOIN employees m ON e.manager_id = m.id;",
      codeLanguage: "sql",
      explanation:
        "A self join relates a table to itself. Here, each employee row is joined to the row representing their manager, pairing employee names with their manager's name.",
      options: [
        { text: "Each employee paired with their manager's name", correct: true },
        { text: "Only employees who have no manager", correct: false },
        { text: "A list of all managers with no employees", correct: false },
        { text: "Duplicate rows for every employee regardless of manager", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Constraints",
      type: "theory",
      difficulty: "easy",
      questionText: "What does a CHECK constraint do in PostgreSQL?",
      explanation:
        "A CHECK constraint enforces that values in a column (or combination of columns) satisfy a specified boolean condition before the row can be inserted or updated.",
      options: [
        { text: "Ensures values satisfy a specified condition", correct: true },
        { text: "Automatically indexes the column", correct: false },
        { text: "Encrypts the column's data", correct: false },
        { text: "Creates a foreign key relationship", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Constraints",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this constraint prevent?",
      codeSnippet:
        "CREATE TABLE products (\n  id SERIAL PRIMARY KEY,\n  price NUMERIC NOT NULL\n);",
      codeLanguage: "sql",
      explanation:
        "The NOT NULL constraint on price means every row must have an explicit price value; attempting to insert a row without one will fail.",
      options: [
        { text: "Inserting a product row without a price value", correct: true },
        { text: "Inserting more than one product", correct: false },
        { text: "Setting the price to zero", correct: false },
        { text: "Updating the price after insertion", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Constraints",
      type: "debugging",
      difficulty: "hard",
      questionText: "Why does this DELETE statement fail by default?",
      codeSnippet:
        "CREATE TABLE customers (id SERIAL PRIMARY KEY);\nCREATE TABLE orders (\n  id SERIAL PRIMARY KEY,\n  customer_id INT REFERENCES customers(id)\n);\n\nDELETE FROM customers WHERE id = 1;",
      codeLanguage: "sql",
      explanation:
        "By default, a foreign key constraint blocks deleting a referenced row if dependent rows still exist, unless the constraint specifies an ON DELETE behavior such as CASCADE or SET NULL.",
      options: [
        { text: "Existing orders still reference that customer_id, and there is no ON DELETE rule to handle it", correct: true },
        { text: "PostgreSQL does not support DELETE statements", correct: false },
        { text: "The customers table has no primary key", correct: false },
        { text: "Foreign keys prevent all DELETE statements from ever running", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "CTEs",
      type: "theory",
      difficulty: "medium",
      questionText: "How is a CTE introduced in a PostgreSQL query?",
      explanation:
        "A CTE is introduced with the WITH keyword, followed by a name and the query whose result set that name will represent within the statement.",
      options: [
        { text: "With a WITH clause followed by a name and a query", correct: true },
        { text: "With a CREATE VIEW statement only", correct: false },
        { text: "With a TEMP TABLE keyword only", correct: false },
        { text: "CTEs cannot be used in PostgreSQL", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "CTEs",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query return?",
      codeSnippet:
        "WITH recent_orders AS (\n  SELECT * FROM orders\n  WHERE created_at > NOW() - INTERVAL '7 days'\n)\nSELECT customer_id, COUNT(*)\nFROM recent_orders\nGROUP BY customer_id;",
      codeLanguage: "sql",
      explanation:
        "The CTE first narrows down to orders from the last 7 days, and the outer query then counts how many of those recent orders belong to each customer.",
      options: [
        { text: "The number of orders placed by each customer in the last 7 days", correct: true },
        { text: "The total number of orders ever placed by each customer", correct: false },
        { text: "A single row containing the overall order count", correct: false },
        { text: "An error, because CTEs cannot be grouped afterward", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "CTEs",
      type: "theory",
      difficulty: "advanced",
      questionText: "What does it mean for a PostgreSQL CTE to be materialized?",
      explanation:
        "A materialized CTE is computed once and stored as a temporary result the rest of the query reads from, whereas a non-materialized CTE can be inlined and optimized together with the outer query, depending on the PostgreSQL version and usage.",
      options: [
        { text: "The CTE's result is computed once and stored, rather than being inlined into the outer query", correct: true },
        { text: "The CTE is permanently saved as a table in the schema", correct: false },
        { text: "The CTE is converted into an index automatically", correct: false },
        { text: "Materialized CTEs run entirely on the client instead of the server", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Window Functions",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the general purpose of a window function in PostgreSQL?",
      explanation:
        "Window functions compute values across a set of rows related to the current row (a \"window\"), such as running totals or rankings, without collapsing the result into one row per group.",
      options: [
        { text: "To compute values across a related set of rows while keeping each row in the output", correct: true },
        { text: "To permanently reorder rows in a table", correct: false },
        { text: "To create a new physical table for each window", correct: false },
        { text: "To replace GROUP BY in every query", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Window Functions",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does LAG() return for the first row of each partition in this query?",
      codeSnippet:
        "SELECT order_date, amount,\n       LAG(amount) OVER (ORDER BY order_date) AS previous_amount\nFROM orders;",
      codeLanguage: "sql",
      explanation:
        "LAG() accesses a value from a preceding row within the window. For the very first row in the ordering, there is no preceding row, so LAG() returns NULL by default.",
      options: [
        { text: "NULL, because there is no preceding row", correct: true },
        { text: "0", correct: false },
        { text: "The same value as amount on that row", correct: false },
        { text: "An error, because LAG() requires a default value", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Window Functions",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What does NTILE(4) do in this query?",
      codeSnippet:
        "SELECT name, salary,\n       NTILE(4) OVER (ORDER BY salary DESC) AS quartile\nFROM employees;",
      codeLanguage: "sql",
      explanation:
        "NTILE(4) divides the ordered rows as evenly as possible into 4 groups (quartiles) and assigns each row a group number from 1 to 4.",
      options: [
        { text: "Divides employees into 4 roughly equal groups based on salary rank", correct: true },
        { text: "Returns the top 4 highest-paid employees only", correct: false },
        { text: "Multiplies each salary value by 4", correct: false },
        { text: "Groups employees into exactly 4 departments", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Performance",
      type: "theory",
      difficulty: "medium",
      questionText: "What does the ANALYZE command do in PostgreSQL?",
      explanation:
        "ANALYZE collects statistics about table contents that the query planner uses to choose efficient execution plans, such as row counts and value distributions.",
      options: [
        { text: "Collects statistics used by the query planner", correct: true },
        { text: "Deletes unused rows from a table", correct: false },
        { text: "Creates a backup of the database", correct: false },
        { text: "Encrypts table contents", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Performance",
      type: "debugging",
      difficulty: "hard",
      questionText: "EXPLAIN shows a sequential scan on a large, frequently filtered table even though an index exists. What is a likely reason?",
      explanation:
        "Outdated table statistics (fixed by running ANALYZE), a query predicate the index doesn't support well, or a genuinely low-selectivity filter where scanning is cheaper than using the index are all common causes of the planner preferring a sequential scan.",
      options: [
        { text: "Stale statistics or a low-selectivity predicate can make the planner prefer a sequential scan", correct: true },
        { text: "PostgreSQL always prefers sequential scans over indexes by default", correct: false },
        { text: "Indexes are disabled automatically on large tables", correct: false },
        { text: "EXPLAIN cannot report on index usage", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Performance",
      type: "theory",
      difficulty: "advanced",
      questionText: "Why is connection pooling (e.g. with PgBouncer) often important for PostgreSQL performance under high concurrency?",
      explanation:
        "Each PostgreSQL connection consumes server-side resources, and opening/closing many short-lived connections adds overhead. A connection pooler reuses a smaller set of backend connections across many client requests, reducing that overhead.",
      options: [
        { text: "It reduces the overhead of creating and tearing down many database connections", correct: true },
        { text: "It replaces the need for indexes entirely", correct: false },
        { text: "It automatically rewrites slow queries", correct: false },
        { text: "It encrypts all traffic between the application and the database", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Extensions",
      type: "theory",
      difficulty: "easy",
      questionText: "What is a PostgreSQL extension?",
      explanation:
        "An extension packages additional SQL objects (types, functions, operators, index types, and more) that can be loaded into a database with CREATE EXTENSION to add functionality beyond the built-in feature set.",
      options: [
        { text: "A package of additional functionality that can be loaded into a database", correct: true },
        { text: "A separate database engine that replaces PostgreSQL", correct: false },
        { text: "A required plugin for every PostgreSQL installation", correct: false },
        { text: "A browser add-on for viewing query results", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Extensions",
      type: "code_output",
      difficulty: "medium",
      questionText: "What capability does this command add to the database?",
      codeSnippet: "CREATE EXTENSION pg_trgm;",
      codeLanguage: "sql",
      explanation:
        "pg_trgm adds trigram-based text similarity functions and operator classes, commonly used to support fast fuzzy text search and similarity matching.",
      options: [
        { text: "Trigram-based text similarity and fuzzy search support", correct: true },
        { text: "Automatic table partitioning", correct: false },
        { text: "Built-in full database encryption", correct: false },
        { text: "Replication between two PostgreSQL servers", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Extensions",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the primary purpose of the PostGIS extension?",
      explanation:
        "PostGIS adds support for geographic and geometric data types along with spatial functions and indexing, enabling location-based queries directly in PostgreSQL.",
      options: [
        { text: "Adding geospatial data types and spatial query support", correct: true },
        { text: "Adding support for JSON documents", correct: false },
        { text: "Adding full-text search only", correct: false },
        { text: "Replacing PostgreSQL's transaction system", correct: false },
      ],
    },
    // =========================================================================
    // Top-up questions — bringing every remaining topic (across all subjects)
    // up to a minimum of three questions each, for even coverage.
    // =========================================================================
    {
      subject: "CSS",
      topic: "Flexbox",
      type: "theory",
      difficulty: "easy",
      questionText: "Which property controls the direction flex items are laid out in?",
      explanation:
        "flex-direction sets whether flex items are placed in a row or column, and whether that axis is reversed.",
      options: [
        { text: "flex-direction", correct: true },
        { text: "flex-flow-direction", correct: false },
        { text: "flex-order", correct: false },
        { text: "align-direction", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Positioning",
      type: "theory",
      difficulty: "medium",
      questionText: "What does position: sticky do?",
      explanation:
        "A sticky element behaves like a relatively positioned element until it crosses a specified threshold, at which point it behaves like a fixed element within its containing block.",
      options: [
        { text: "Toggles between relative and fixed positioning based on scroll position", correct: true },
        { text: "Removes the element from the document entirely", correct: false },
        { text: "Always fixes the element to the viewport", correct: false },
        { text: "Behaves identically to position: static", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Responsive Design",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the difference between a mobile-first and a desktop-first media query strategy?",
      explanation:
        "Mobile-first CSS starts with base styles for small screens and uses min-width media queries to add complexity for larger screens, while desktop-first does the reverse with max-width queries.",
      options: [
        { text: "Mobile-first uses min-width queries to scale up; desktop-first uses max-width queries to scale down", correct: true },
        { text: "They always produce identical CSS output", correct: false },
        { text: "Desktop-first cannot use media queries at all", correct: false },
        { text: "Mobile-first only works with CSS Grid", correct: false },
      ],
    },
    {
      subject: "CSS",
      topic: "Specificity",
      type: "theory",
      difficulty: "medium",
      questionText: "Which generally has higher specificity: an ID selector or a class selector?",
      explanation:
        "ID selectors have higher specificity than class selectors, which in turn have higher specificity than element/type selectors.",
      options: [
        { text: "An ID selector", correct: true },
        { text: "A class selector", correct: false },
        { text: "They always have equal specificity", correct: false },
        { text: "It depends only on source order, not specificity", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Async/Await",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this code log?",
      codeSnippet: "async function getValue() {\n  return 42;\n}\n\ngetValue().then(console.log);",
      codeLanguage: "javascript",
      explanation:
        "An async function's return value is automatically wrapped in a resolved Promise, so .then receives 42.",
      options: [
        { text: "42", correct: true },
        { text: "Promise { 42 }", correct: false },
        { text: "undefined", correct: false },
        { text: "TypeError", correct: false },
      ],
    },
    {
      subject: "JavaScript",
      topic: "Event Loop",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the difference between the microtask queue and the macrotask (callback) queue?",
      explanation:
        "Microtasks, such as Promise callbacks, are fully drained before the event loop moves on to the next macrotask, such as a setTimeout callback.",
      options: [
        { text: "All queued microtasks run before the next macrotask executes", correct: true },
        { text: "Macrotasks always run before any microtasks", correct: false },
        { text: "They are processed in a completely random order", correct: false },
        { text: "There is no difference between them", correct: false },
      ],
    },
    {
      subject: "React",
      topic: "Context",
      type: "code_output",
      difficulty: "medium",
      questionText: "What happens to consumers of ThemeContext when the Provider's value changes?",
      codeSnippet:
        "<ThemeContext.Provider value={theme}>\n  <App />\n</ThemeContext.Provider>",
      codeLanguage: "javascript",
      explanation:
        "When the value passed to a Context Provider changes, every component consuming that context re-renders with the new value, regardless of how deeply nested it is.",
      options: [
        { text: "Every consuming component re-renders with the new value", correct: true },
        { text: "Only the Provider itself re-renders", correct: false },
        { text: "Consumers keep the old value until the page reloads", correct: false },
        { text: "Nothing happens unless useEffect is used", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Runtime Basics",
      type: "theory",
      difficulty: "medium",
      questionText: "What does it mean that Node.js is single-threaded for JavaScript execution?",
      explanation:
        "Node.js runs application JavaScript on a single main thread, using the event loop and, for some operations, a background thread pool (libuv) to handle I/O without blocking that main thread.",
      options: [
        { text: "JavaScript callbacks run on one main thread while I/O is handled non-blockingly", correct: true },
        { text: "Node.js can only run one process at a time on a machine", correct: false },
        { text: "Every request spawns its own operating system thread", correct: false },
        { text: "Node.js cannot use multiple CPU cores under any circumstances", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Runtime Basics",
      type: "code_output",
      difficulty: "easy",
      questionText: "What does process.version typically return when logged?",
      codeSnippet: "console.log(process.version);",
      codeLanguage: "javascript",
      explanation:
        "process.version returns a string with the currently running Node.js version, such as v20.11.0.",
      options: [
        { text: "A string containing the running Node.js version", correct: true },
        { text: "The version of the operating system", correct: false },
        { text: "The version of npm installed", correct: false },
        { text: "undefined", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Events",
      type: "code_output",
      difficulty: "medium",
      questionText: "What will this code log?",
      codeSnippet:
        "const EventEmitter = require('events');\nconst emitter = new EventEmitter();\n\nemitter.on('greet', name => console.log(`Hello ${name}`));\nemitter.emit('greet', 'Saif');",
      codeLanguage: "javascript",
      explanation:
        "emit('greet', 'Saif') synchronously invokes every listener registered for the 'greet' event, passing 'Saif' as the argument.",
      options: [
        { text: "Hello Saif", correct: true },
        { text: "greet", correct: false },
        { text: "undefined", correct: false },
        { text: "Nothing, because emit runs asynchronously", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Events",
      type: "theory",
      difficulty: "medium",
      questionText: "Which core Node.js classes are commonly built on top of EventEmitter?",
      explanation:
        "Many core Node.js APIs, such as HTTP servers and streams, extend EventEmitter so they can emit named events like 'request', 'data', or 'end'.",
      options: [
        { text: "HTTP servers and streams", correct: true },
        { text: "Only the fs module", correct: false },
        { text: "Only third-party npm packages", correct: false },
        { text: "process.env", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Process",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this code do?",
      codeSnippet:
        "process.on('uncaughtException', err => {\n  console.error('Unhandled error:', err);\n  process.exit(1);\n});",
      codeLanguage: "javascript",
      explanation:
        "This registers a listener that catches otherwise-unhandled synchronous errors anywhere in the process, logs them, and exits with a failure status code.",
      options: [
        { text: "Logs uncaught errors and exits the process with a failure code", correct: true },
        { text: "Prevents the process from ever crashing", correct: false },
        { text: "Automatically restarts the Node.js process", correct: false },
        { text: "Only catches errors inside try/catch blocks", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Process",
      type: "theory",
      difficulty: "hard",
      questionText: "What information does process.argv provide?",
      explanation:
        "process.argv is an array containing the command used to launch the process, the path to the executed script, and any additional command-line arguments passed to it.",
      options: [
        { text: "The command-line arguments used to launch the Node.js process", correct: true },
        { text: "The list of installed npm packages", correct: false },
        { text: "The current memory usage of the process", correct: false },
        { text: "The environment variables available to the process", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Error Handling",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the difference between an operational error and a programmer error in Node.js?",
      explanation:
        "Operational errors are expected runtime conditions such as a failed network request or invalid user input, and should typically be handled gracefully. Programmer errors are bugs, such as calling a function with the wrong arguments, which usually indicate code that needs to be fixed rather than caught and continued.",
      options: [
        { text: "Operational errors are expected runtime conditions; programmer errors are bugs in the code", correct: true },
        { text: "There is no meaningful distinction between the two", correct: false },
        { text: "Operational errors can never be caught with try/catch", correct: false },
        { text: "Programmer errors only occur inside asynchronous code", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Error Handling",
      type: "code_output",
      difficulty: "easy",
      questionText: "What will this code log?",
      codeSnippet:
        "try {\n  JSON.parse('{invalid}');\n} catch (err) {\n  console.log('Caught:', err.message);\n}",
      codeLanguage: "javascript",
      explanation:
        "JSON.parse throws a SyntaxError on malformed JSON, and the catch block logs a message describing the caught error.",
      options: [
        { text: "Caught: followed by a syntax error message", correct: true },
        { text: "{invalid}", correct: false },
        { text: "undefined", correct: false },
        { text: "The program crashes with no output", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "App Router",
      type: "code_output",
      difficulty: "medium",
      questionText: "What special file is required to make a segment publicly routable in the App Router?",
      codeSnippet: "app/\n  about/\n    page.tsx",
      codeLanguage: "typescript",
      explanation:
        "A page.tsx (or .js/.jsx) file makes a route segment publicly accessible; folders without a page file are not directly routable on their own.",
      options: [
        { text: "page.tsx", correct: true },
        { text: "index.tsx", correct: false },
        { text: "route.config.ts", correct: false },
        { text: "main.tsx", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "App Router",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the purpose of a loading.tsx file in the App Router?",
      explanation:
        "A loading.tsx file defines an automatic loading UI (using React Suspense) shown while the corresponding route segment's content is being fetched or rendered.",
      options: [
        { text: "Defines a loading UI shown while the route segment loads", correct: true },
        { text: "Defines global CSS for the entire application", correct: false },
        { text: "Replaces the need for a page.tsx file", correct: false },
        { text: "Configures environment variables for the route", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Client Components",
      type: "theory",
      difficulty: "medium",
      questionText: "Why might a component need to be a Client Component in the App Router?",
      explanation:
        "Client Components are needed for interactivity and browser-only APIs, such as event handlers, state, effects, or accessing window/localStorage.",
      options: [
        { text: "It needs interactivity, state, effects, or browser-only APIs", correct: true },
        { text: "It needs to fetch data from a database", correct: false },
        { text: "It needs to export metadata", correct: false },
        { text: "Every component must be a Client Component by default", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Client Components",
      type: "theory",
      difficulty: "hard",
      questionText: "Can a Server Component render a Client Component, and vice versa?",
      explanation:
        "A Server Component can import and render a Client Component, but a Client Component cannot directly import a Server Component as a child in the same way — Server Components must instead be passed down as children/props from a Server Component boundary.",
      options: [
        { text: "Server Components can render Client Components, but the reverse requires passing Server Components as children/props", correct: true },
        { text: "Neither can ever render the other", correct: false },
        { text: "Only Client Components can render Server Components", correct: false },
        { text: "They are functionally identical with no restrictions", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Environment Variables",
      type: "theory",
      difficulty: "easy",
      questionText: "Where should a Next.js application typically define local environment variables during development?",
      explanation:
        "Next.js automatically loads environment variables from a .env.local file (and other .env variants) at the root of the project.",
      options: [
        { text: "In a .env.local file at the project root", correct: true },
        { text: "Directly inside next.config.js as plain strings only", correct: false },
        { text: "Inside package.json under a 'secrets' field", correct: false },
        { text: "In the browser's localStorage", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Metadata",
      type: "theory",
      difficulty: "medium",
      questionText: "What is the purpose of the generateMetadata function in the Next.js App Router?",
      explanation:
        "generateMetadata lets a page or layout compute metadata dynamically, for example based on route params or fetched data, rather than using a static metadata object.",
      options: [
        { text: "To generate metadata dynamically based on route params or fetched data", correct: true },
        { text: "To generate images for a page automatically", correct: false },
        { text: "To create a sitemap.xml file", correct: false },
        { text: "To define CSS custom properties", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Metadata",
      type: "code_output",
      difficulty: "hard",
      questionText: "What will the page title be for this dynamic blog post route?",
      codeSnippet:
        "export async function generateMetadata({ params }) {\n  const post = await getPost(params.slug);\n  return { title: post.title };\n}",
      codeLanguage: "typescript",
      explanation:
        "generateMetadata is called with the route's params, fetches the corresponding post, and returns a metadata object whose title is used as the page's document title.",
      options: [
        { text: "It is set to the fetched post's title", correct: true },
        { text: "It is always 'Untitled'", correct: false },
        { text: "It is set to params.slug directly with no fetch", correct: false },
        { text: "Metadata cannot be generated asynchronously", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Middleware",
      type: "code_output",
      difficulty: "medium",
      questionText: "Where does this middleware.ts file need to live to apply to a Next.js project?",
      codeSnippet: "middleware.ts",
      codeLanguage: "typescript",
      explanation:
        "Next.js middleware is defined in a single middleware.ts (or .js) file at the project root (or inside src/, if that convention is used), and can use a matcher config to scope which routes it applies to.",
      options: [
        { text: "At the project root (or inside src/)", correct: true },
        { text: "Inside every individual route folder", correct: false },
        { text: "Inside the public/ directory", correct: false },
        { text: "Inside package.json", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Middleware",
      type: "theory",
      difficulty: "hard",
      questionText: "What runtime does Next.js middleware execute in by default?",
      explanation:
        "Next.js middleware runs in the Edge Runtime by default, a lightweight JavaScript runtime with a restricted API surface compared to the full Node.js runtime.",
      options: [
        { text: "The Edge Runtime", correct: true },
        { text: "A full Node.js server runtime with no restrictions", correct: false },
        { text: "Directly inside the browser", correct: false },
        { text: "A Python-based runtime", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Caching",
      type: "theory",
      difficulty: "medium",
      questionText: "What does route segment revalidation control in the Next.js App Router?",
      explanation:
        "Revalidation controls how often a cached route or fetched data is considered stale and should be regenerated, whether through a fixed time interval or on-demand triggers.",
      options: [
        { text: "How often cached content is considered stale and regenerated", correct: true },
        { text: "Which CSS framework a route uses", correct: false },
        { text: "Whether a route is publicly accessible", correct: false },
        { text: "How TypeScript types are generated for a route", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Caching",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does the revalidate option do in this fetch call?",
      codeSnippet: "fetch('https://api.example.com/data', { next: { revalidate: 60 } });",
      codeLanguage: "typescript",
      explanation:
        "Setting next.revalidate: 60 tells Next.js to cache the fetch result and treat it as stale after 60 seconds, at which point the next request can trigger regeneration.",
      options: [
        { text: "Caches the result and allows it to be revalidated after 60 seconds", correct: true },
        { text: "Retries the fetch request 60 times", correct: false },
        { text: "Delays the fetch request by 60 seconds", correct: false },
        { text: "Disables caching entirely for this request", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "API Routes",
      type: "theory",
      difficulty: "easy",
      questionText: "Which function name is used to define a GET handler in a Next.js Route Handler?",
      explanation:
        "Exporting a function named GET from a route.ts file defines the handler for HTTP GET requests to that route.",
      options: [
        { text: "GET", correct: true },
        { text: "handleGet", correct: false },
        { text: "onGet", correct: false },
        { text: "getRequest", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Data Fetching",
      type: "code_output",
      difficulty: "hard",
      questionText: "What does { cache: 'no-store' } do in this fetch call?",
      codeSnippet: "fetch('https://api.example.com/live-data', { cache: 'no-store' });",
      codeLanguage: "typescript",
      explanation:
        "Setting cache: 'no-store' opts the fetch request out of Next.js's caching entirely, so fresh data is fetched on every request.",
      options: [
        { text: "Fetches fresh data on every request, bypassing the cache", correct: true },
        { text: "Permanently caches the response forever", correct: false },
        { text: "Stores the response only in the browser", correct: false },
        { text: "Prevents the fetch from ever completing", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Layouts",
      type: "theory",
      difficulty: "medium",
      questionText: "Do layouts re-render when navigating between sibling routes that share that layout?",
      explanation:
        "Shared layouts persist across navigations between routes that use them; they do not lose state or re-mount when navigating between sibling pages under the same layout.",
      options: [
        { text: "No, the shared layout persists across the navigation", correct: true },
        { text: "Yes, the entire layout always remounts on every navigation", correct: false },
        { text: "Only if the layout has no children prop", correct: false },
        { text: "Only when using the Pages Router", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Navigation",
      type: "theory",
      difficulty: "medium",
      questionText: "What does the Next.js Link component do by default to improve navigation performance?",
      explanation:
        "Link automatically prefetches the linked route's code (and, depending on configuration, data) when the link enters the viewport, making subsequent navigation feel faster.",
      options: [
        { text: "Prefetches the linked route in the background", correct: true },
        { text: "Preloads every route in the application on first load", correct: false },
        { text: "Disables client-side navigation for that link", correct: false },
        { text: "Forces a full page reload on every click", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Rendering",
      type: "code_output",
      difficulty: "advanced",
      questionText: "What does exporting dynamic = 'force-dynamic' from a page do?",
      codeSnippet: "export const dynamic = 'force-dynamic';",
      codeLanguage: "typescript",
      explanation:
        "This route segment config option forces the route to be rendered dynamically on every request, opting it out of static rendering and full-route caching.",
      options: [
        { text: "Forces the route to render dynamically on every request", correct: true },
        { text: "Forces the route to be statically generated at build time only", correct: false },
        { text: "Disables the route entirely", correct: false },
        { text: "Converts the route into an API Route Handler", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Server Components",
      type: "theory",
      difficulty: "advanced",
      questionText: "Why can't a Server Component use browser-only APIs like window or localStorage directly?",
      explanation:
        "Server Components execute on the server, where there is no browser environment, so browser-only globals like window and localStorage are not available during their execution.",
      options: [
        { text: "They execute on the server, where no browser environment exists", correct: true },
        { text: "window and localStorage were removed from JavaScript entirely", correct: false },
        { text: "Server Components run inside a sandboxed browser tab", correct: false },
        { text: "Next.js disables all global objects by default", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Subqueries",
      type: "theory",
      difficulty: "easy",
      questionText: "What is a subquery in SQL?",
      explanation:
        "A subquery is a query nested inside another SQL statement, often used within WHERE, FROM, or SELECT clauses to compute an intermediate result.",
      options: [
        { text: "A query nested inside another SQL statement", correct: true },
        { text: "A query that runs on a separate database server", correct: false },
        { text: "A stored procedure written in a different language", correct: false },
        { text: "A query that can only return a single column", correct: false },
      ],
    },
    {
      subject: "SQL",
      topic: "Subqueries",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does this query return?",
      codeSnippet:
        "SELECT name\nFROM departments\nWHERE id IN (\n  SELECT department_id FROM employees WHERE salary > 90000\n);",
      codeLanguage: "sql",
      explanation:
        "The subquery finds department_id values for employees earning more than 90000. The outer query then returns the names of departments matching any of those ids.",
      options: [
        { text: "Departments that have at least one employee earning more than 90000", correct: true },
        { text: "Every department regardless of salaries", correct: false },
        { text: "Employees earning more than 90000", correct: false },
        { text: "Departments with no employees at all", correct: false },
      ],
    },
    {
      subject: "PostgreSQL",
      topic: "Arrays",
      type: "theory",
      difficulty: "medium",
      questionText: "Which function can be used to expand a PostgreSQL array into a set of rows?",
      explanation:
        "unnest() takes an array and expands it into a set of rows, one per element, which is useful for joining array data with other tables.",
      options: [
        { text: "unnest()", correct: true },
        { text: "array_agg()", correct: false },
        { text: "array_flatten()", correct: false },
        { text: "explode()", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "File System",
      type: "theory",
      difficulty: "easy",
      questionText: "Which fs method reads a file without blocking the event loop?",
      explanation:
        "fs.readFile() performs an asynchronous, non-blocking read and invokes a callback (or resolves a Promise via fs/promises) once the file has been read.",
      options: [
        { text: "fs.readFile()", correct: true },
        { text: "fs.readFileSync()", correct: false },
        { text: "fs.openSync()", correct: false },
        { text: "fs.statSync()", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Event Loop",
      type: "theory",
      difficulty: "hard",
      questionText: "What are the phases of the Node.js event loop broadly responsible for?",
      explanation:
        "The Node.js event loop cycles through phases such as timers, pending callbacks, poll (I/O), check (setImmediate), and close callbacks, each responsible for a different category of queued work.",
      options: [
        { text: "Processing different categories of queued callbacks in a defined order", correct: true },
        { text: "Compiling JavaScript into machine code", correct: false },
        { text: "Managing npm package installation", correct: false },
        { text: "Rendering HTML on the server", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Streams",
      type: "theory",
      difficulty: "medium",
      questionText: "What are the four fundamental stream types in Node.js?",
      explanation:
        "Node.js provides Readable, Writable, Duplex (both readable and writable), and Transform (a duplex stream that can modify data as it passes through) streams.",
      options: [
        { text: "Readable, Writable, Duplex, and Transform", correct: true },
        { text: "Input, Output, Error, and Log", correct: false },
        { text: "Sync, Async, Buffered, and Unbuffered", correct: false },
        { text: "Fast, Slow, Cached, and Live", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "HTTP",
      type: "code_output",
      difficulty: "medium",
      questionText: "What does res.setHeader() do before res.end() is called?",
      codeSnippet:
        "http.createServer((req, res) => {\n  res.setHeader('Content-Type', 'application/json');\n  res.end(JSON.stringify({ ok: true }));\n});",
      codeLanguage: "javascript",
      explanation:
        "setHeader() queues a response header to be sent with the response. It must be called before the headers are flushed, which typically happens once writing the body begins or the response ends.",
      options: [
        { text: "It sets a response header to be sent with the response", correct: true },
        { text: "It sends the response body immediately", correct: false },
        { text: "It closes the HTTP server", correct: false },
        { text: "It parses the incoming request headers", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "NPM",
      type: "theory",
      difficulty: "hard",
      questionText: "What is the purpose of a package-lock.json file?",
      explanation:
        "package-lock.json records the exact resolved versions of installed dependencies (and their dependencies), ensuring consistent installs across machines and environments.",
      options: [
        { text: "Locks exact dependency versions for consistent, reproducible installs", correct: true },
        { text: "Stores the application's source code", correct: false },
        { text: "Replaces the need for package.json", correct: false },
        { text: "Encrypts installed packages", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Environment Variables",
      type: "theory",
      difficulty: "hard",
      questionText: "Why is it generally considered unsafe to commit a .env file containing secrets to version control?",
      explanation:
        "A committed .env file exposes credentials such as API keys and database passwords to anyone with repository access, and remains in the project's history even if later removed, creating a lasting security risk.",
      options: [
        { text: "It exposes secrets to anyone with repository access, including in the commit history", correct: true },
        { text: "Node.js cannot read .env files that are tracked by git", correct: false },
        { text: ".env files are automatically encrypted by git", correct: false },
        { text: "It has no security implications as long as the repository is private", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Performance",
      type: "theory",
      difficulty: "medium",
      questionText: "Why can a long-running, purely synchronous loop hurt a Node.js server's responsiveness?",
      explanation:
        "Since Node.js runs JavaScript on a single main thread, a long synchronous computation blocks that thread, preventing the event loop from processing other pending callbacks and requests until it finishes.",
      options: [
        { text: "It blocks the single main thread, delaying all other pending callbacks and requests", correct: true },
        { text: "It automatically spawns a new thread for every loop iteration", correct: false },
        { text: "Synchronous code always runs slower than asynchronous code", correct: false },
        { text: "It has no effect on other requests being handled", correct: false },
      ],
    },
    {
      subject: "Node.js",
      topic: "Performance",
      type: "code_output",
      difficulty: "hard",
      questionText: "Why can this route handler degrade performance under load?",
      codeSnippet:
        "app.get('/hash', (req, res) => {\n  let result = req.query.value;\n  for (let i = 0; i < 5_000_000; i++) {\n    result = hashOnce(result);\n  }\n  res.send(result);\n});",
      codeLanguage: "javascript",
      explanation:
        "The tight synchronous loop performs CPU-bound work directly on the main thread, blocking the event loop and delaying every other concurrent request until the loop finishes.",
      options: [
        { text: "The CPU-bound loop blocks the event loop, delaying other concurrent requests", correct: true },
        { text: "req.query.value is always undefined", correct: false },
        { text: "Express cannot handle GET requests with loops", correct: false },
        { text: "hashOnce() automatically runs on a separate thread", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Routing",
      type: "theory",
      difficulty: "hard",
      questionText: "What does a catch-all route segment such as app/docs/[...slug]/page.tsx match?",
      explanation:
        "A catch-all segment, denoted with [...slug], matches any number of path segments after /docs, capturing them as an array (for example /docs/a/b/c produces slug: ['a', 'b', 'c']).",
      options: [
        { text: "Any number of path segments after /docs, captured as an array", correct: true },
        { text: "Only a single segment directly after /docs", correct: false },
        { text: "Only the literal path /docs/slug", correct: false },
        { text: "No routes, since catch-all segments are invalid syntax", correct: false },
      ],
    },
    {
      subject: "Next.js",
      topic: "Environment Variables",
      type: "code_output",
      difficulty: "medium",
      questionText: "Which of these two variables will be accessible in client-side browser code?",
      codeSnippet: "API_SECRET=xyz123\nNEXT_PUBLIC_ANALYTICS_ID=UA-12345",
      codeLanguage: "bash",
      explanation:
        "Only variables prefixed with NEXT_PUBLIC_ are inlined into the client-side JavaScript bundle at build time; variables without that prefix remain server-only.",
      options: [
        { text: "Only NEXT_PUBLIC_ANALYTICS_ID", correct: true },
        { text: "Only API_SECRET", correct: false },
        { text: "Both variables", correct: false },
        { text: "Neither variable", correct: false },
      ],
    },

  ];

  let createdCount = 0;
  for (const q of seedQuestions) {
    const subjectId = subjectIdByName.get(q.subject);
    if (!subjectId) {
      console.warn(`Skipping "${q.questionText}" — unknown subject "${q.subject}"`);
      continue;
    }

    const topicKey = `${q.subject}:${q.topic}`;
    let topicId = topicIdByKey.get(topicKey);

    if (!topicId) {
      const topicSlug = slugify(q.topic);
      let topic = await db.query.topics.findFirst({
        where: (t, { and, eq }) => and(eq(t.subjectId, subjectId), eq(t.slug, topicSlug)),
      });
      if (!topic) {
        const existingTopicsCount = await db.query.topics.findMany({
          where: (t, { eq }) => eq(t.subjectId, subjectId),
        });
        [topic] = await db
          .insert(schema.topics)
          .values({
            subjectId,
            name: q.topic,
            slug: topicSlug,
            sortOrder: existingTopicsCount.length,
          })
          .returning();
        console.log(`Created missing topic: ${q.subject} → ${q.topic}`);
      }
      topicId = topic.id;
      topicIdByKey.set(topicKey, topicId);
    }

    // Dedupe on subject + topic + questionText + codeSnippet, not questionText alone.
    // Generic prompts like "What will this code output?" are reused across many
    // different questions, so questionText by itself is not a safe uniqueness key.
    const existing = await db.query.questions.findFirst({
      where: (question, { and, eq, isNull }) =>
        and(
          eq(question.subjectId, subjectId),
          eq(question.topicId, topicId),
          eq(question.questionText, q.questionText),
          q.codeSnippet
            ? eq(question.codeSnippet, q.codeSnippet)
            : isNull(question.codeSnippet)
        ),
    });
    if (existing) continue;

    const [question] = await db
      .insert(schema.questions)
      .values({
        subjectId,
        topicId,
        type: q.type,
        difficulty: q.difficulty,
        questionText: q.questionText,
        codeSnippet: q.codeSnippet ?? null,
        codeLanguage: q.codeLanguage ?? null,
        explanation: q.explanation,
        isPublished: true,
      })
      .returning();

    await db.insert(schema.questionOptions).values(
      q.options.map((o, idx) => ({
        questionId: question.id,
        optionText: o.text,
        isCorrect: o.correct,
        sortOrder: idx,
      }))
    );
    createdCount += 1;
  }

  console.log(`Seed complete. Created ${createdCount} new questions.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

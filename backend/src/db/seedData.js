export const AGENT_EMAIL = "user@triagesync.test";

export const users = [
  { name: "Admin Lead", email: "admin@triagesync.test", password: "Admin@123", role: "ADMIN" },
  { name: "Agent Demo", email: AGENT_EMAIL, password: "User@123", role: "USER" },
];

export const resources = [
  { name: "Conference Room A", type: "ROOM", capacity: 10, description: "Main meeting room with a projector", isActive: true },
  { name: "Conference Room B", type: "ROOM", capacity: 6, description: null, isActive: true },
  { name: "Network Lab", type: "LAB", capacity: 12, description: "Lab for reproducing network issues", isActive: true },
  { name: "Device Testing Lab", type: "LAB", capacity: 8, description: null, isActive: true },
  { name: "Diagnostic Scanner", type: "EQUIPMENT", capacity: 1, description: "Handheld scanner for hardware diagnostics", isActive: true },
  { name: "Packet Analyzer", type: "EQUIPMENT", capacity: 2, description: "Currently under maintenance", isActive: false },
];

export const tickets = [
  {
    externalId: "SEED-001",
    subject: "Refund request for duplicate charge",
    body: "I was charged twice for my last order and need a refund for the second payment.",
    autoCategory: "BILLING", category: "BILLING", priority: "HIGH",
  },
  {
    externalId: "SEED-002",
    subject: "Invoice shows wrong company name",
    body: "The latest invoice lists an old company name. Please reissue it with the correct details.",
    autoCategory: "BILLING", category: "BILLING", priority: "MEDIUM",
  },
  {
    externalId: "SEED-003",
    subject: "Cannot reset my password",
    body: "The password reset email never reaches my inbox, so I cannot get back into my account.",
    autoCategory: "LOGIN", category: "LOGIN", priority: "MEDIUM",
  },
  {
    externalId: "SEED-004",
    subject: "Locked out after too many attempts",
    body: "My account is locked out after several failed attempts and I need access today.",
    autoCategory: "LOGIN", category: "LOGIN", priority: "URGENT",
  },
  {
    externalId: "SEED-005",
    subject: "2FA codes are not coming through",
    body: "The 2FA text message code does not reach my phone when I open the app.",
    autoCategory: "LOGIN", category: "LOGIN", priority: "MEDIUM",
  },
  {
    externalId: "SEED-006",
    subject: "My package has not arrived",
    body: "Ordered two weeks ago, the tracking page shows no update and the package has not arrived yet.",
    autoCategory: "DELIVERY", category: "DELIVERY", priority: "HIGH",
  },
  {
    externalId: "SEED-007",
    subject: "Wrong shipping address on order",
    body: "I entered the wrong shipping address. Can it be changed before dispatch?",
    autoCategory: "DELIVERY", category: "DELIVERY", priority: "MEDIUM",
  },
  {
    externalId: "SEED-008",
    subject: "App crashes when saving settings",
    body: "The mobile app crashes every time I tap save on the settings screen.",
    autoCategory: "BUG", category: "BUG", priority: "MEDIUM",
  },
  {
    externalId: "SEED-009",
    subject: "Server error 500 on checkout",
    body: "The checkout page returns an error 500 after I submit the form.",
    autoCategory: "BUG", category: "BUG", priority: "HIGH",
  },
  {
    externalId: "SEED-010",
    subject: "Production down for our whole team",
    body: "Urgent: the dashboard is broken and production down for every user on our team.",
    autoCategory: "BUG", category: "BUG", priority: "URGENT",
  },
  {
    externalId: "SEED-011",
    subject: "Add dark mode to the dashboard",
    body: "It would be great to have a dark theme option for late night work.",
    autoCategory: "FEATURE_REQUEST", category: "FEATURE_REQUEST", priority: "MEDIUM",
  },
  {
    externalId: "SEED-012",
    subject: "Export tickets to CSV",
    body: "Please let us export the ticket list to a CSV file for monthly reporting.",
    autoCategory: "FEATURE_REQUEST", category: "FEATURE_REQUEST", priority: "LOW",
  },
  {
    externalId: "SEED-013",
    subject: "<script>alert('xss')</script> Invoice page looks wrong",
    body: "<img src=x onerror=alert(1)> The <b>invoice</b> total is not showing correctly.",
    autoCategory: "BILLING", category: "BILLING", priority: "HIGH",
  },
  {
    externalId: "SEED-014",
    subject: "Charged after cancelling subscription",
    body: "I cancelled my plan last month but a payment was taken again today.",
    autoCategory: "BILLING", category: "BILLING", priority: "MEDIUM",
    status: "IN_PROGRESS", isReviewed: true, assigned: true,
    events: [["status", "OPEN", "IN_PROGRESS"]],
  },
  {
    externalId: "SEED-015",
    subject: "Login page shows a blank screen",
    body: "After entering my email on the login page the screen turns white and nothing happens.",
    autoCategory: "LOGIN", category: "BUG", priority: "MEDIUM",
    status: "IN_PROGRESS", isReviewed: true, isHumanOverride: true,
    events: [
      ["category", "LOGIN", "BUG"],
      ["status", "OPEN", "IN_PROGRESS"],
    ],
  },
  {
    externalId: "SEED-016",
    subject: "Parcel delivered to the wrong house",
    body: "The delivery confirmation says delivered, but the parcel went to a neighbouring house.",
    autoCategory: "DELIVERY", category: "DELIVERY", priority: "MEDIUM",
    status: "RESOLVED", isReviewed: true,
    events: [["status", "OPEN", "RESOLVED"]],
  },
  {
    externalId: "SEED-017",
    subject: "Please add Spanish language support",
    body: "Our customers would like the help centre to be available in Spanish.",
    autoCategory: "FEATURE_REQUEST", category: "FEATURE_REQUEST", priority: "LOW",
    status: "CLOSED", isReviewed: true,
    events: [
      ["priority", "MEDIUM", "LOW"],
      ["status", "OPEN", "CLOSED"],
    ],
  },
];
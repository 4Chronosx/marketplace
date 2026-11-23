import type { Listing } from "./listings";

type Row = [category: string, title: string, price: number, description: string];

// Two listings per category so every category page has content. The first row
// matches the "Bike 24 inch" listing in docs/mockups/detailed-listing-page.png.
const ROWS: Row[] = [
  ["sporting-goods", "Bike 24 inch", 99, "Lightly used 24 inch bike in great shape. Recently tuned up, new tires. Pickup only."],
  ["vehicles", "2015 Toyota Camry SE", 9500, "92k miles, one owner, clean title. Regular oil changes, records available."],
  ["property-rentals", "Sunny 1BR apartment near downtown", 2300, "Bright one-bedroom with in-unit laundry. Walkable to Caltrain. Available next month."],
  ["apparel", "North Face puffer jacket, size M", 85, "Worn a handful of times, no tears or stains. Warm and packable."],
  ["classifieds", "Piano lessons for beginners", 40, "Patient teacher with 10 years of experience. All ages welcome. Per-hour rate."],
  ["electronics", "iPhone 13, 128GB, unlocked", 420, "Works perfectly, battery health 91%. Includes case and charger."],
  ["entertainment", "PlayStation 5 with two controllers", 400, "Disc edition, lightly used. Comes with two controllers and three games."],
  ["family", "Graco stroller, lightly used", 75, "Folds easily, smooth ride, includes rain cover and cup holder."],
  ["free-stuff", "Moving boxes, assorted sizes", 0, "About 30 sturdy boxes, various sizes. Please take them all. Porch pickup."],
  ["garden-outdoor", "Weber charcoal grill", 90, "18 inch kettle grill, cleaned and ready to go. Includes cover."],
  ["hobbies", "Acrylic paint set, 48 colors", 25, "Barely opened set with brushes and a small easel. Great for beginners."],
  ["home-goods", "IKEA Kallax shelf, white", 45, "4x2 cube shelf, no damage. Disassembled for easy transport."],
  ["home-improvement", "DeWalt cordless drill kit", 95, "20V drill with two batteries, charger and case. Works great."],
  ["home-sales", "3BR/2BA home, open house Sunday", 1850000, "Renovated kitchen, large backyard, close to top schools. Open house 1-4pm."],
  ["musical-instruments", "Yamaha acoustic guitar", 160, "Solid top, comes with gig bag and a spare set of strings."],
  ["office-supplies", "Standing desk, adjustable", 210, "Electric height adjustment, 60 inch top. Memory presets work."],
  ["pet-supplies", "Large dog crate", 55, "Heavy-duty folding crate with divider and tray. Fits a large breed."],
  ["toys-games", "LEGO Star Wars set, sealed", 70, "Unopened box, never displayed. Smoke-free home."],
  ["buy-and-sell-groups", "Neighborhood furniture swap", 0, "Monthly swap meet. Bring something, take something. This Saturday at the park."],
  ["vehicles", "Trek mountain bike carrier rack", 120, "Hitch-mounted rack for two bikes. Fits 2 inch receivers."],
  ["property-rentals", "Room in shared house, utilities included", 1200, "Private room, shared bath, quiet street. Month-to-month lease."],
  ["apparel", "Levi's 501 jeans, 32x32", 30, "Classic fit, dark wash, worn a few times."],
  ["classifieds", "Moving help, hourly rate", 35, "Two friendly movers with a truck. Local moves and heavy lifting."],
  ["electronics", "Sony WH-1000XM4 headphones", 180, "Noise-cancelling, excellent condition. Includes case and cable."],
  ["entertainment", "Vinyl record collection (60 LPs)", 150, "Mixed rock and jazz, all in good condition. Sold as a lot."],
  ["family", "Wooden crib with mattress", 120, "Converts to toddler bed. Mattress included, no recalls."],
  ["free-stuff", "Houseplants, free to a good home", 0, "Several healthy pothos and snake plants. Come pick what you like."],
  ["garden-outdoor", "Patio set, table and 4 chairs", 220, "Powder-coated aluminum, weather-resistant cushions included."],
  ["hobbies", "Beginner telescope", 130, "70mm refractor with tripod and two eyepieces. Great for the moon and planets."],
  ["home-goods", "Ceramic dinnerware set (12 pc)", 40, "Service for four, no chips. Dishwasher and microwave safe."],
  ["home-improvement", "Ladder, 6 ft fiberglass", 60, "Type 1A rating, sturdy and in good shape."],
  ["home-sales", "Condo near Caltrain, 2BR", 975000, "Top-floor unit, updated bathrooms, one parking spot, low HOA."],
  ["musical-instruments", "Roland digital piano", 450, "88 weighted keys, stand and sustain pedal included."],
  ["office-supplies", "Herman Miller Aeron chair", 350, "Size B, fully adjustable, mesh in great condition."],
  ["pet-supplies", "Cat tree, 5 ft", 40, "Multi-level with scratching posts and a cozy hideout."],
  ["sporting-goods", "Yoga mat and blocks set", 20, "Non-slip mat with two foam blocks and a strap."],
  ["toys-games", "Catan board game", 30, "Complete, played twice. Includes the 5-6 player expansion."],
  ["buy-and-sell-groups", "Community garage sale group invite", 0, "Join our neighborhood garage sale group to list items and find deals nearby."],
];

const LOCATIONS = [
  "Palo Alto, CA",
  "Palo Alto, CA",
  "Mountain View, CA",
  "Menlo Park, CA",
  "Palo Alto, CA",
  "Redwood City, CA",
  "Sunnyvale, CA",
];

const SELLERS = [
  "Wei Gu",
  "Greg Wientjes",
  "Maria Lopez",
  "Sam Patel",
  "Alex Chen",
  "Jordan Smith",
  "Priya Nair",
  "Chris Taylor",
];

// Fixed anchor (not the current time) so the module is deterministic and safe
// to evaluate during prerendering.
const ANCHOR_MS = Date.UTC(2026, 10, 23, 12, 0, 0);
const HOUR_MS = 60 * 60 * 1000;

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
}

export const MOCK_LISTINGS: Listing[] = ROWS.map(
  ([category, title, price, description], index) => {
    const seller = SELLERS[index % SELLERS.length];
    return {
      id: String(index + 1),
      title,
      description,
      price,
      category,
      location: LOCATIONS[index % LOCATIONS.length],
      seller_name: seller,
      seller_email: emailFor(seller),
      image_url: null,
      created_at: new Date(ANCHOR_MS - index * 7 * HOUR_MS).toISOString(),
    };
  },
);

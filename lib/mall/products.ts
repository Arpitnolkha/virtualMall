import type { MallProduct } from "@/types/mall";
import { productVariants } from "./productVariants";
export const products: MallProduct[] = [
  {
    id: "school-backpack",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 1299,
        currency: "INR",
        unit: "per backpack",
      },
      materials:
        "600D polyester outer fabric with polyester lining and foam-padded straps.",
      durability:
        "Reinforced stitching at the strap attachments for everyday school use. Water-resistant against light splashes; not waterproof. No tested lifespan or load rating is supplied.",
      comfort:
        "Soft shoulder padding, adjustable straps and a padded back panel; comfort depends on fit and the weight carried.",
      care: "Wipe with a damp cloth and mild soap, then air-dry. Do not machine-wash.",
      specifications: {
        capacity: "22 litres",
        storage: "3 zipped compartments and 2 side pockets",
        dimensions: "43 × 30 × 16 cm",
      },
    },
    name: "School Backpack",
    category: "Bags",
    description:
      "A lightweight backpack designed for school and everyday adventures.",
    features: [
      "Multiple compartments",
      "Water-resistant fabric",
      "Padded shoulder straps",
    ],
    suitableFor: "School and everyday carrying",
    suggestedQuestions: [
      "Is it waterproof?",
      "How much can it carry?",
      "Is it comfortable?",
    ],
    answers: {
      "Is it waterproof?":
        "It’s water-resistant, so it can handle light splashes. It isn’t fully waterproof.",
      "How much can it carry?":
        "The demo backpack has a 22-litre capacity, three zipped compartments and two side pockets. A maximum load rating is not supplied.",
      "Is it comfortable?":
        "Padded shoulder straps help make everyday carrying comfortable.",
    },
    position: [-3, 1.48, 0.7],
    color: "#d67b51",
    icon: "▣",
  },
  {
    id: "running-shoes",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 2499,
        currency: "INR",
        unit: "per pair",
      },
      materials: "Polyester mesh upper, EVA foam midsole and rubber outsole.",
      durability:
        "Rubber outsole designed for everyday wear on paved paths. Not specified for rugged trails; no mileage guarantee is supplied.",
      comfort:
        "Soft cushioning and a breathable upper for walking and light jogging. Fit varies by wearer; try them on.",
      care: "Brush away dry dirt, spot-clean with mild soap, and air-dry away from direct heat.",
      specifications: {
        closure: "Lace-up",
        fit: "Regular fit",
        use: "Walking, everyday activity and light jogging; available sizes are not supplied",
      },
    },
    name: "Running Shoes",
    category: "Movement",
    description:
      "A comfortable pair for active days, from the playground to your daily run.",
    features: ["Cushioned soles", "Breathable upper", "Lightweight design"],
    suitableFor: "Everyday activity",
    suggestedQuestions: [
      "Are they comfortable?",
      "Are they breathable?",
      "Can I run in them?",
    ],
    answers: {
      "Are they comfortable?":
        "Cushioned soles and a lightweight design are made for comfortable everyday movement.",
      "Are they breathable?": "Yes, the upper is designed to be breathable.",
      "Can I run in them?":
        "They’re designed for running and everyday activity. Try the fit before choosing a pair.",
    },
    position: [-1, 1.48, 0.7],
    color: "#e9bd57",
    icon: "↗",
  },
  {
    id: "water-bottle",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 699,
        currency: "INR",
        unit: "per bottle",
      },
      materials:
        "Stainless-steel body with a polypropylene lid, silicone seal and carry loop.",
      durability:
        "Reusable metal body for everyday carrying. Strong impacts may dent it; the closed lid is leak-resistant, not a guarantee against all leaks.",
      comfort:
        "Easy-carry loop and a smooth bottle body; a wide mouth makes filling and cleaning easier.",
      care: "Hand-wash with mild dish soap, rinse, and leave open to dry. Dishwasher compatibility is not specified.",
      specifications: {
        capacity: "750 millilitres",
        construction: "Single-wall bottle; not insulated",
        lid: "Screw lid with carry loop",
      },
    },
    name: "Water Bottle",
    category: "Everyday",
    description:
      "A reusable bottle to keep water close wherever the day takes you.",
    features: ["Leak-resistant lid", "Easy-carry loop", "Reusable design"],
    suitableFor: "School, work and outings",
    suggestedQuestions: [
      "Does it leak?",
      "Is it reusable?",
      "Is it easy to carry?",
    ],
    answers: {
      "Does it leak?":
        "The lid is designed to resist leaks when properly closed.",
      "Is it reusable?": "Yes! It’s designed to be refilled and reused.",
      "Is it easy to carry?": "The carry loop makes it easy to take along.",
    },
    position: [1, 1.48, 0.7],
    color: "#83b6ac",
    icon: "◉",
  },
  {
    id: "book",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 399,
        currency: "INR",
        unit: "per book",
      },
      materials: "Printed paper pages with a laminated hardcover.",
      durability:
        "Hardcover protects the pages during normal reading. Paper is not water-resistant; keep it dry.",
      comfort:
        "Compact format and a matte page finish for comfortable handling and reduced page glare.",
      care: "Keep dry, use a bookmark, and wipe only the cover with a soft dry cloth.",
      specifications: {
        length: "128 illustrated pages",
        dimensions: "15 × 21 cm",
        format:
          "Hardcover adventure story; title, author and age range are not supplied",
      },
    },
    name: "Book",
    category: "Discover",
    description:
      "A colorful adventure book for curious minds and quiet afternoons.",
    features: ["Illustrated pages", "Easy-to-hold format", "Adventure story"],
    suitableFor: "Reading and discovery",
    suggestedQuestions: [
      "What is it about?",
      "Does it have pictures?",
      "Who is it for?",
    ],
    answers: {
      "What is it about?":
        "It’s an illustrated adventure story for curious readers.",
      "Does it have pictures?": "Yes, it includes colorful illustrations.",
      "Who is it for?":
        "It’s for readers who enjoy adventure stories. An age range isn’t specified in this demo.",
    },
    position: [3, 1.48, 0.7],
    color: "#929bc4",
    icon: "▤",
  },
  {
    id: "toy-car",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 299,
        currency: "INR",
        unit: "per toy car",
      },
      materials: "Die-cast metal body, ABS plastic base and rubber wheels.",
      durability:
        "Made for gentle push-along play on smooth surfaces. Avoid drops and rough outdoor surfaces; no impact-test certification is supplied.",
      comfort:
        "Small hand-held shape with freely rolling wheels for push-along play.",
      care: "Wipe with a soft damp cloth and dry. Do not soak.",
      specifications: {
        dimensions: "10 × 4 × 3 cm",
        operation: "Manual push-along; no motor or batteries",
        ageRating:
          "Not supplied; check the final product label before giving it to a child",
      },
    },
    name: "Toy Car",
    category: "Play",
    description: "A cheerful little car made for big imaginary road trips.",
    features: ["Rolling wheels", "Compact shape", "Bright finish"],
    suitableFor: "Imaginative play",
    suggestedQuestions: [
      "Do the wheels move?",
      "How big is it?",
      "What age is it for?",
    ],
    answers: {
      "Do the wheels move?": "Yes, its wheels are designed to roll.",
      "How big is it?": "The demo toy car measures 10 by 4 by 3 centimetres.",
      "What age is it for?":
        "The age rating isn’t specified here. Check the final product label before choosing it for a child.",
    },
    position: [-3, 1.1, 3.1],
    color: "#dc825e",
    icon: "▰",
  },
  {
    id: "football",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 799,
        currency: "INR",
        unit: "per ball",
      },
      materials: "Synthetic PU outer panels with a rubber bladder.",
      durability:
        "Stitched panels for recreational play on grass. Rough concrete can wear the outer surface faster; no lifespan guarantee is supplied.",
      comfort:
        "Light cushioning and a textured cover for comfortable recreational passing and ball control.",
      care: "Wipe clean after use and dry naturally. Follow the inflation guidance on the final ball label.",
      specifications: {
        size: "Size 5",
        use: "Recreational football on grass",
        included: "One ball; pump not included",
      },
    },
    name: "Football",
    category: "Movement",
    description:
      "A classic football for friendly games and afternoons outside.",
    features: ["Textured surface", "Classic panel design", "Lightweight feel"],
    suitableFor: "Outdoor games",
    suggestedQuestions: [
      "Can I use it outdoors?",
      "What size is it?",
      "Is it easy to grip?",
    ],
    answers: {
      "Can I use it outdoors?": "It’s designed for outdoor games.",
      "What size is it?": "The demo football is size five.",
      "Is it easy to grip?":
        "The textured surface helps with grip and control.",
    },
    position: [-1, 1.1, 3.1],
    color: "#e4dfcc",
    icon: "⚽",
  },
  {
    id: "headphones",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 1999,
        currency: "INR",
        unit: "per headset",
      },
      materials:
        "ABS plastic ear-cup shells with foam cushions covered in synthetic leather and a padded headband.",
      durability:
        "Designed for normal indoor listening. Avoid bending the headband sharply or exposing it to moisture; no water-resistance rating is supplied.",
      comfort:
        "Soft over-ear cushions and an adjustable padded headband. Take breaks if pressure or warmth becomes uncomfortable.",
      care: "Wipe the cushions with a soft, slightly damp cloth. Keep liquids away from the drivers and connectors.",
      specifications: {
        design: "Over-ear, adjustable headband",
        connectivity:
          "Not supplied; wired or wireless connection is not confirmed",
        audioFeatures:
          "Noise cancellation, microphone and battery specifications are not supplied",
      },
    },
    name: "Headphones",
    category: "Everyday",
    description:
      "Over-ear headphones for your favorite music and a little time to yourself.",
    features: ["Padded ear cups", "Adjustable headband", "Over-ear design"],
    suitableFor: "Music and everyday listening",
    suggestedQuestions: [
      "Are they wireless?",
      "Are they comfortable?",
      "Can I adjust them?",
    ],
    answers: {
      "Are they wireless?": "Connection details aren’t specified in this demo.",
      "Are they comfortable?":
        "Padded ear cups provide cushioning for everyday listening.",
      "Can I adjust them?": "Yes, the headband is adjustable.",
    },
    position: [1, 1.1, 3.1],
    color: "#8a96a5",
    icon: "Ω",
  },
  {
    id: "lunch-box",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 599,
        currency: "INR",
        unit: "per lunch box",
      },
      materials:
        "Polypropylene body and lid with a silicone sealing ring and plastic clips.",
      durability:
        "Rigid shell and secure clips for everyday packed lunches. Avoid dropping it or forcing the clips; not specified as fully leakproof.",
      comfort:
        "Compact rectangular shape and an easy-carry handle for everyday carrying.",
      care: "Hand-wash with mild dish soap, rinse, and dry with the lid open. Microwave and dishwasher safety are not specified.",
      specifications: {
        capacity: "1 litre",
        storage: "3 divided compartments",
        dimensions: "20 × 14 × 7 cm",
      },
    },
    name: "Lunch Box",
    category: "Everyday",
    description:
      "A handy lunch box that keeps the day’s favorite bites together.",
    features: ["Divided compartments", "Secure clips", "Compact shape"],
    suitableFor: "School and packed lunches",
    suggestedQuestions: [
      "Does it have compartments?",
      "Is it microwave safe?",
      "How does it close?",
    ],
    answers: {
      "Does it have compartments?":
        "Yes, divided compartments help keep your food organized.",
      "Is it microwave safe?":
        "Microwave safety isn’t specified. Check the final product label before heating.",
      "How does it close?": "Secure clips hold the lid in place.",
    },
    position: [3, 1.1, 3.1],
    color: "#c2ca89",
    icon: "▱",
  },
  {
    id: "teddy-bear",
    name: "Teddy Bear",
    category: "Play",
    description: "A soft teddy bear for cuddles and imaginary adventures.",
    features: ["Soft plush finish", "Stuffed body", "Seated shape"],
    suitableFor: "Cuddles and imaginative play",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 799,
        currency: "INR",
        unit: "per toy",
      },
      materials: "Polyester plush fabric with polyester-fibre filling.",
      durability:
        "Designed for gentle indoor play. Inspect seams and filling regularly; no tested lifespan is supplied.",
      comfort:
        "Soft stuffed body for holding and cuddling; not intended as infant bedding.",
      care: "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine-wash compatibility is not specified.",
      specifications: {
        dimensions: "30 cm seated height",
        operation: "No batteries or electronic sounds",
        ageRating:
          "Not supplied; check the final product label and supervision guidance before giving it to a child",
      },
    },
    suggestedQuestions: [
      "Is it soft?",
      "How much does it cost?",
      "How do I clean it?",
    ],
    answers: {
      "Is it soft?":
        "Yes, this demo teddy has a soft polyester plush cover and fibre filling.",
      "How much does it cost?": "The illustrative demo price is ₹799 per toy.",
      "How do I clean it?":
        "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine washing is not specified.",
    },
    position: [0, 1.1, 3.1],
    color: "#bc9561",
    icon: "✦",
  },
  {
    id: "plush-elephant",
    name: "Plush Elephant",
    category: "Play",
    description: "A cuddly elephant with floppy ears and a soft trunk.",
    features: ["Floppy ears", "Soft trunk", "Plush body"],
    suitableFor: "Cuddles and imaginative play",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 999,
        currency: "INR",
        unit: "per toy",
      },
      materials: "Polyester plush fabric with polyester-fibre filling.",
      durability:
        "Designed for gentle indoor play. Inspect seams and filling regularly; no tested lifespan is supplied.",
      comfort:
        "Soft stuffed body for holding and cuddling; not intended as infant bedding.",
      care: "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine-wash compatibility is not specified.",
      specifications: {
        dimensions: "35 cm seated height",
        operation: "No batteries or electronic sounds",
        ageRating:
          "Not supplied; check the final product label and supervision guidance before giving it to a child",
      },
    },
    suggestedQuestions: [
      "What is it made of?",
      "How much does it cost?",
      "How do I clean it?",
    ],
    answers: {
      "What is it made of?":
        "This demo elephant has polyester plush fabric and polyester-fibre filling.",
      "How much does it cost?": "The illustrative demo price is ₹999 per toy.",
      "How do I clean it?":
        "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine washing is not specified.",
    },
    position: [0, 1.1, 3.1],
    color: "#bc9561",
    icon: "✦",
  },
  {
    id: "plush-lion",
    name: "Plush Lion",
    category: "Play",
    description:
      "A friendly plush lion with a fluffy mane for imaginative safari play.",
    features: ["Fluffy mane", "Soft paws", "Seated shape"],
    suitableFor: "Cuddles and imaginative play",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 899,
        currency: "INR",
        unit: "per toy",
      },
      materials:
        "Polyester plush fabric and faux-fur mane with polyester-fibre filling.",
      durability:
        "Designed for gentle indoor play. Inspect seams and filling regularly; no tested lifespan is supplied.",
      comfort:
        "Soft stuffed body for holding and cuddling; not intended as infant bedding.",
      care: "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine-wash compatibility is not specified.",
      specifications: {
        dimensions: "30 cm seated height",
        operation: "No batteries or electronic sounds",
        ageRating:
          "Not supplied; check the final product label and supervision guidance before giving it to a child",
      },
    },
    suggestedQuestions: [
      "Is the mane soft?",
      "How much does it cost?",
      "How do I clean it?",
    ],
    answers: {
      "Is the mane soft?":
        "Yes, the demo lion has a soft faux-fur polyester mane.",
      "How much does it cost?": "The illustrative demo price is ₹899 per toy.",
      "How do I clean it?":
        "Spot-clean with mild soap and a damp cloth, then air-dry completely. Machine washing is not specified.",
    },
    position: [0, 1.1, 3.1],
    color: "#bc9561",
    icon: "✦",
  },
  {
    id: "rainbow-stacker",
    name: "Rainbow Stacker",
    category: "Play",
    description:
      "Colorful nesting arches to stack, arrange and turn into imaginary bridges.",
    features: ["Nesting arches", "Freestanding pieces", "Colorful finish"],
    suitableFor: "Sorting, stacking and imaginative play",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 649,
        currency: "INR",
        unit: "per set",
      },
      materials: "Painted wood; coating certification is not supplied.",
      durability:
        "Made for gentle indoor stacking. Keep dry and avoid drops that may chip the finish; no impact-test certification is supplied.",
      comfort:
        "Hand-held pieces for arranging and stacking; suitability depends on the final age rating.",
      care: "Wipe with a slightly damp cloth and dry immediately. Do not soak.",
      specifications: {
        dimensions: "6 nesting arches; largest arch 18 × 9 × 3 cm",
        operation: "No batteries or electronic sounds",
        ageRating:
          "Not supplied; check the final product label and supervision guidance before giving it to a child",
      },
    },
    suggestedQuestions: [
      "How do you play with it?",
      "How much does it cost?",
      "How do I clean it?",
    ],
    answers: {
      "How do you play with it?":
        "Stack or nest the six arches, or arrange them as tunnels and bridges for imaginative play.",
      "How much does it cost?": "The illustrative demo price is ₹649 per set.",
      "How do I clean it?":
        "Wipe with a slightly damp cloth and dry immediately; do not soak.",
    },
    position: [0, 1.1, 3.1],
    color: "#bc9561",
    icon: "✦",
  },
  {
    id: "stacking-rings",
    name: "Stacking Rings",
    category: "Play",
    description:
      "A colorful ring tower for sorting by size and stacking by hand.",
    features: ["Graduated ring sizes", "Upright stacking post", "Stable base"],
    suitableFor: "Sorting, stacking and imaginative play",
    details: {
      catalogStatus: "demo",
      price: {
        amount: 449,
        currency: "INR",
        unit: "per set",
      },
      materials:
        "Painted wood rings, post and base; coating certification is not supplied.",
      durability:
        "Made for gentle indoor stacking. Keep dry and avoid drops that may chip the finish; no impact-test certification is supplied.",
      comfort:
        "Hand-held pieces for arranging and stacking; suitability depends on the final age rating.",
      care: "Wipe with a slightly damp cloth and dry immediately. Do not soak.",
      specifications: {
        dimensions: "6 rings with one base and post; 18 cm assembled height",
        operation: "No batteries or electronic sounds",
        ageRating:
          "Not supplied; check the final product label and supervision guidance before giving it to a child",
      },
    },
    suggestedQuestions: [
      "Does it need batteries?",
      "How much does it cost?",
      "How do I clean it?",
    ],
    answers: {
      "Does it need batteries?":
        "No, this demo ring tower is a manual stacking toy and needs no batteries.",
      "How much does it cost?": "The illustrative demo price is ₹449 per set.",
      "How do I clean it?":
        "Wipe with a slightly damp cloth and dry immediately; do not soak.",
    },
    position: [0, 1.1, 3.1],
    color: "#bc9561",
    icon: "✦",
  },
  ...productVariants,
];

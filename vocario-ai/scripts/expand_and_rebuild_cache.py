"""
Script mở rộng toàn diện từ vựng nhận diện (Everything Detection Upgrade)
Từ ~1022 lớp -> 2000+ lớp, mở rộng 20 bối cảnh đời sống
Tự động encode bằng YOLO-World CLIP Text Encoder và lưu offline vector cache.
"""

import os
import sys
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICES_DIR = os.path.join(BASE_DIR, "services")
CACHE_DIR = os.path.join(SERVICES_DIR, "cache")
THEMES_PATH = os.path.join(SERVICES_DIR, "themes_classes.json")
TARGET_CLASSES_PATH = os.path.join(SERVICES_DIR, "target_classes.txt")
FEATS_CACHE_PATH = os.path.join(CACHE_DIR, "yolo_1000_feats.pt")

os.makedirs(CACHE_DIR, exist_ok=True)

# 1. Danh sách bổ sung chi tiết cho các bối cảnh hiện có và bối cảnh mới
THEMES_DATA = {
    "study_office": {
        "nameVi": "Bàn Học, Văn Phòng & Trường Học",
        "keywords": [
            "bàn học", "desk", "văn phòng", "office", "study", "học", "trường học", "school", "classroom"
        ],
        "classes": [
            "laptop", "computer monitor", "keyboard", "computer mouse", "mousepad", "desk", "chair",
            "office chair", "swivel chair", "desk lamp", "reading lamp", "book", "notebook", "textbook",
            "novel", "dictionary", "magazine", "newspaper", "pen", "ballpoint pen", "pencil",
            "colored pencil", "crayon", "marker", "highlighter", "whiteboard marker", "fountain pen",
            "eraser", "pencil sharpener", "pencil case", "pen holder", "pencil pot", "ruler", "scissors",
            "stapler", "staples", "staple remover", "paperclip", "binder clip", "calculator", "backpack",
            "schoolbag", "briefcase", "folder", "binder", "clipboard", "document", "contract", "certificate",
            "resume", "sticky notes", "post-it note", "notepad", "envelope", "stamp", "stamp pad", "letter",
            "diary", "journal", "calendar", "wall calendar", "desk calendar", "whiteboard", "chalkboard",
            "blackboard", "globe", "map", "compass", "protractor", "set square", "tape measure", "tape",
            "scotch tape", "masking tape", "glue", "glue stick", "correction tape", "pushpin", "thumbtack",
            "hole puncher", "paper shredder", "filing cabinet", "bookshelf", "bookcase", "drawer",
            "desk drawer", "trash can", "wastebasket", "clock", "wall clock", "table clock", "alarm clock",
            "telephone", "desk phone", "smartphone", "tablet", "ipad", "headphones", "earphones",
            "water bottle", "thermos", "mug", "coffee cup", "tea cup", "photo frame", "picture frame",
            "plant", "potted plant", "succulent", "coaster", "hourglass", "document organizer",
            "file organizer", "paper organizer", "desk organizer", "phone stand", "tablet stand",
            "laptop stand", "desk pad", "stationery", "index card", "bulletin board", "bookstand",
            "magnifying glass", "cable organizer", "usb hub", "paper tray", "letter opener",
            "desk fan", "wrist rest", "headphone stand", "id card", "lanyard", "business card"
        ]
    },
    "kitchen_appliances": {
        "nameVi": "Nhà Bếp & Thiết Bị Gia Dụng",
        "keywords": [
            "bếp", "kitchen", "nấu", "cook", "nướng", "chiên", "xào", "nấu nướng"
        ],
        "classes": [
            "refrigerator", "freezer", "microwave oven", "microwave", "oven", "toaster oven", "toaster",
            "gas stove", "induction cooktop", "electric stove", "cooktop", "stove", "range hood",
            "dishwasher", "electric kettle", "kettle", "coffee maker", "espresso machine", "blender",
            "food processor", "hand mixer", "stand mixer", "juicer", "air fryer", "deep fryer",
            "rice cooker", "slow cooker", "pressure cooker", "instant pot", "steamer", "toaster",
            "waffle maker", "sandwich maker", "panini press", "grill", "electric grill", "water dispenser",
            "water filter", "sink", "kitchen sink", "faucet", "kitchen tap", "kitchen counter",
            "countertop", "kitchen island", "kitchen cabinet", "pantry", "dish rack", "drying rack",
            "cutting board", "chopping board", "kitchen knife", "chef knife", "bread knife", "paring knife",
            "santoku knife", "cleaver", "knife block", "knife sharpener", "frying pan", "skillet",
            "saucepan", "stockpot", "pot", "pan", "wok", "casserole dish", "baking sheet", "baking pan",
            "muffin tin", "cake pan", "roasting pan", "colander", "strainer", "sieve", "salad spinner",
            "mixing bowl", "measuring cup", "measuring spoon", "kitchen scale", "timer", "kitchen timer",
            "meat thermometer", "rolling pin", "pastry brush", "whisk", "spatula", "silicone spatula",
            "slotted spoon", "ladle", "soup ladle", "tongs", "kitchen tongs", "tongs", "peeler", "potato peeler",
            "grater", "cheese grater", "can opener", "bottle opener", "corkscrew", "garlic press",
            "citrus squeezer", "mortar and pestle", "trivet", "pot holder", "oven mitt", "apron",
            "paper towel holder", "paper towel roll", "dish soap", "sponge", "scrub sponge", "dishcloth",
            "tea towel", "trash can", "garbage can", "recycling bin", "compost bin", "spice rack",
            "spice jar", "oil dispenser", "vinegar bottle", "salt shaker", "pepper mill"
        ]
    },
    "dining_tableware": {
        "nameVi": "Bàn Ăn, Dụng Cụ Bếp & Bữa Ăn",
        "keywords": [
            "bàn ăn", "dining", "thưởng thức", "bữa ăn", "ăn uống", "dụng cụ ăn", "tableware", "cutlery"
        ],
        "classes": [
            "dining table", "dining chair", "tablecloth", "table runner", "placemat", "coaster",
            "napkin", "cloth napkin", "paper napkin", "napkin ring", "napkin holder", "plate",
            "dinner plate", "salad plate", "bread plate", "dessert plate", "charger plate", "bowl",
            "soup bowl", "salad bowl", "cereal bowl", "rice bowl", "noodle bowl", "dessert bowl",
            "serving bowl", "serving dish", "serving platter", "platter", "tray", "serving tray",
            "fork", "dinner fork", "salad fork", "dessert fork", "knife", "dinner knife", "steak knife",
            "butter knife", "spoon", "dinner spoon", "soup spoon", "dessert spoon", "teaspoon",
            "tablespoon", "chopsticks", "chopstick rest", "drinking glass", "water glass", "tumbler",
            "highball glass", "wine glass", "red wine glass", "white wine glass", "champagne flute",
            "cocktail glass", "martini glass", "whiskey glass", "shot glass", "beer glass", "beer mug",
            "pint glass", "cup", "coffee cup", "teacup", "mug", "saucer", "teapot", "tea set",
            "pitcher", "water pitcher", "carafe", "decanter", "salt shaker", "pepper shaker",
            "salt and pepper shakers", "sugar bowl", "creamer", "milk jug", "butter dish", "gravy boat",
            "oil cruet", "vinegar cruet", "condiment dish", "toothpick holder", "candle", "candlestick",
            "candelabra", "centerpiece", "vase", "flower arrangement", "lazy susan", "bread basket",
            "fruit bowl", "fruit basket", "serving tongs", "cake server", "pie server", "salad servers"
        ]
    },
    "food_fruits_groceries": {
        "nameVi": "Thực Phẩm, Trái Cây & Bách Hóa",
        "keywords": [
            "món ăn", "thực phẩm", "food", "trái cây", "fruit", "rau củ", "vegetable", "đồ ăn", "groceries"
        ],
        "classes": [
            "apple", "green apple", "red apple", "banana", "orange", "mandarin", "tangerine",
            "clementine", "lemon", "lime", "grapefruit", "grapes", "red grapes", "green grapes",
            "strawberry", "blueberry", "raspberry", "blackberry", "cranberry", "watermelon",
            "cantaloupe", "honeydew melon", "pineapple", "mango", "papaya", "kiwi", "peach",
            "nectarine", "plum", "cherry", "pear", "apricot", "avocado", "coconut", "pomegranate",
            "fig", "date", "guava", "dragonfruit", "lychee", "durian", "passion fruit", "persimmon",
            "tomato", "cherry tomato", "potato", "sweet potato", "onion", "red onion", "yellow onion",
            "green onion", "scallion", "shallot", "garlic", "ginger", "carrot", "cucumber", "broccoli",
            "cauliflower", "cabbage", "red cabbage", "lettuce", "romaine lettuce", "spinach", "kale",
            "celery", "asparagus", "bell pepper", "green bell pepper", "red bell pepper",
            "yellow bell pepper", "chili pepper", "jalapeno", "eggplant", "zucchini", "squash",
            "pumpkin", "corn", "corn on the cob", "green beans", "peas", "snow peas", "mushroom",
            "button mushroom", "shiitake mushroom", "bread", "white bread", "wheat bread", "baguette",
            "french bread", "croissant", "toast", "sliced bread", "bun", "hamburger bun", "hot dog bun",
            "bagel", "english muffin", "pita bread", "tortilla", "pancake", "waffle", "cereal",
            "cornflakes", "oatmeal", "granola", "rice", "white rice", "brown rice", "fried rice",
            "noodles", "instant noodles", "ramen", "pasta", "spaghetti", "macaroni", "penne",
            "lasagna", "pizza", "pepperoni pizza", "cheese pizza", "burger", "cheeseburger",
            "hamburger", "hot dog", "sandwich", "club sandwich", "submarine sandwich", "taco",
            "burrito", "quesadilla", "sushi", "sashimi", "sushi roll", "dumpling", "spring roll",
            "egg roll", "soup", "noodle soup", "salad", "caesar salad", "green salad", "steak",
            "beef", "pork", "pork chop", "chicken", "roasted chicken", "fried chicken", "chicken breast",
            "chicken wing", "chicken nugget", "duck", "turkey", "fish", "salmon", "tuna", "shrimp",
            "prawn", "crab", "lobster", "squid", "clam", "oyster", "mussel", "egg", "boiled egg",
            "fried egg", "poached egg", "scrambled eggs", "omelet", "bacon", "sausage", "hot dog sausage",
            "ham", "salami", "cheese", "cheddar cheese", "mozzarella cheese", "swiss cheese",
            "parmesan cheese", "cream cheese", "butter", "margarine", "yogurt", "milk", "whole milk",
            "skim milk", "almond milk", "soy milk", "juice", "orange juice", "apple juice", "grape juice",
            "lemonade", "soda", "cola", "sparkling water", "bottled water", "iced tea", "green tea",
            "black tea", "coffee", "iced coffee", "latte", "cappuccino", "espresso", "cookie",
            "chocolate chip cookie", "biscuit", "cracker", "cake", "birthday cake", "chocolate cake",
            "cupcake", "donut", "muffin", "pie", "apple pie", "brownie", "chocolate", "chocolate bar",
            "candy", "gummy candy", "lollipop", "ice cream", "ice cream cone", "popsicle", "popcorn",
            "potato chips", "tortilla chips", "pretzels", "peanuts", "almonds", "walnuts", "cashews"
        ]
    },
    "living_room_decor": {
        "nameVi": "Phòng Khách, Nội Thất & Đồ Trang Trí",
        "keywords": [
            "khách", "living", "sofa", "ghế dài", "nội thất", "trang trí", "decor"
        ],
        "classes": [
            "sofa", "couch", "sectional sofa", "loveseat", "armchair", "recliner", "accent chair",
            "rocking chair", "chaise lounge", "ottoman", "footstool", "pouf", "bean bag chair",
            "coffee table", "end table", "side table", "console table", "nesting tables", "tv stand",
            "media console", "entertainment center", "television", "smart tv", "tv remote", "remote control",
            "bookshelf", "bookcase", "display cabinet", "credenza", "sideboard", "fireplace",
            "electric fireplace", "mantel", "fireplace screen", "carpet", "area rug", "floor runner",
            "curtain", "drapes", "sheer curtains", "window blinds", "window shades", "throw pillow",
            "cushion", "throw blanket", "floor lamp", "table lamp", "chandelier", "pendant light",
            "ceiling light", "ceiling fan", "wall sconce", "wall art", "painting", "framed painting",
            "canvas print", "framed photo", "photo frame", "picture frame", "wall mirror", "floor mirror",
            "wall clock", "grandfather clock", "vase", "flower vase", "decorative bowl", "decorative tray",
            "sculpture", "statue", "figurine", "candle", "pillar candle", "scented candle",
            "candle holder", "candlestick", "lantern", "reed diffuser", "aroma diffuser", "indoor plant",
            "potted plant", "houseplant", "fiddle leaf fig", "monstera", "snake plant", "pothos",
            "palm plant", "artificial plant", "flower pot", "planter", "magazine rack", "coat rack",
            "coat stand", "umbrella stand", "key bowl", "bookends", "tissue box", "tissue box cover",
            "air conditioner", "indoor unit", "air purifier", "space heater", "radiator", "standing fan"
        ]
    },
    "bedroom_personal_space": {
        "nameVi": "Phòng Ngủ & Không Gian Riêng Tư",
        "keywords": [
            "ngủ", "bedroom", "giường", "bed", "chăn", "gối", "phòng riêng"
        ],
        "classes": [
            "bed", "single bed", "double bed", "queen bed", "king bed", "bunk bed", "canopy bed",
            "daybed", "trundle bed", "mattress", "box spring", "bed frame", "headboard", "footboard",
            "pillow", "bed pillow", "memory foam pillow", "body pillow", "throw pillow", "pillowcase",
            "bedsheet", "fitted sheet", "flat sheet", "duvet", "duvet cover", "comforter", "quilt",
            "bedspread", "blanket", "weighted blanket", "fleece blanket", "nightstand", "bedside table",
            "bedside lamp", "reading light", "alarm clock", "digital alarm clock", "wardrobe", "closet",
            "armoire", "dresser", "chest of drawers", "tallboy", "clothes hanger", "coat hanger",
            "closet organizer", "vanity table", "dressing table", "vanity mirror", "makeup mirror",
            "vanity stool", "vanity chair", "jewelry box", "jewelry organizer", "valet tray",
            "full-length mirror", "standing mirror", "wall mirror", "laundry basket", "laundry hamper",
            "clothes hamper", "drying rack", "clothes horse", "ironing board", "steam iron", "iron",
            "garment steamer", "slippers", "house slippers", "bedroom slippers", "robe", "bathrobe",
            "pajamas", "sleepwear", "sleep mask", "earplugs", "white noise machine", "humidifier",
            "dehumidifier", "air purifier", "electric blanket", "hot water bottle", "bedside rug"
        ]
    },
    "bathroom_toiletries": {
        "nameVi": "Phòng Tắm & Đồ Dùng Vệ Sinh",
        "keywords": [
            "tắm", "bath", "toilet", "vệ sinh", "bồn tắm", "vòi sen", "lavabo"
        ],
        "classes": [
            "bathtub", "soaking tub", "whirlpool tub", "shower", "shower stall", "shower enclosure",
            "shower head", "rain shower head", "handheld shower", "shower curtain", "shower curtain rod",
            "shower curtain rings", "shower door", "shower caddy", "shower shelf", "soap holder",
            "soap dish", "bar soap", "liquid soap", "hand soap", "soap dispenser", "body wash",
            "shower gel", "bubble bath", "bath salts", "bath bomb", "shampoo", "shampoo bottle",
            "conditioner", "conditioner bottle", "hair mask", "hair treatment", "face wash",
            "facial cleanser", "scrub", "body scrub", "loofah", "bath sponge", "body brush",
            "pumice stone", "washcloth", "towel", "bath towel", "hand towel", "fingertip towel",
            "bath sheet", "bathrobe", "towel rack", "towel bar", "towel ring", "towel hook",
            "heated towel rail", "bath mat", "bath rug", "toilet", "toilet bowl", "toilet seat",
            "toilet lid", "toilet tank", "flush lever", "toilet paper", "toilet paper roll",
            "toilet paper holder", "toilet paper stand", "toilet brush", "toilet brush holder",
            "bidet", "bidet sprayer", "sink", "bathroom sink", "washbasin", "pedestal sink",
            "vanity sink", "faucet", "bathroom faucet", "mixer tap", "drain", "sink stopper",
            "bathroom mirror", "vanity mirror", "lighted mirror", "magnifying mirror", "medicine cabinet",
            "bathroom cabinet", "vanity cabinet", "toothbrush", "manual toothbrush", "electric toothbrush",
            "toothbrush holder", "toothpaste", "toothpaste tube", "mouthwash", "mouthwash bottle",
            "dental floss", "dental floss picks", "tongue scraper", "hair dryer", "blow dryer",
            "hair straightener", "flat iron", "curling iron", "hair curler", "hairbrush", "comb",
            "wide-tooth comb", "hair clips", "bobby pins", "hair ties", "scrunchies", "headband",
            "shower cap", "razor", "safety razor", "disposable razor", "straight razor", "electric shaver",
            "shaving cream", "shaving foam", "shaving gel", "shaving brush", "aftershave", "aftershave lotion",
            "deodorant", "antiperspirant", "roll-on deodorant", "spray deodorant", "perfume", "cologne",
            "body spray", "body lotion", "moisturizer", "hand cream", "face cream", "sunscreen",
            "cotton balls", "cotton pads", "cotton swabs", "q-tips", "tweezers", "nail clippers",
            "toenail clippers", "nail file", "emery board", "cuticle pusher", "nail scissors",
            "bathroom scale", "digital scale", "trash can", "step can", "plunger"
        ]
    },
    "clothing_footwear": {
        "nameVi": "Quần Áo & Giày Dép Hằng Ngày",
        "keywords": [
            "quần áo", "giày", "thời trang", "clothing", "fashion", "váy", "áo", "quần", "footwear"
        ],
        "classes": [
            "shirt", "t-shirt", "tee", "graphic tee", "polo shirt", "collared shirt", "dress shirt",
            "button-down shirt", "flannel shirt", "hawaiian shirt", "blouse", "tunic", "tank top",
            "sleeveless shirt", "halter top", "crop top", "tube top", "camisole", "sweater",
            "pullover", "crewneck sweater", "v-neck sweater", "turtleneck", "mock neck sweater",
            "cardigan", "cable-knit sweater", "hoodie", "zip-up hoodie", "pullover hoodie",
            "sweatshirt", "crewneck sweatshirt", "jacket", "leather jacket", "biker jacket",
            "denim jacket", "jean jacket", "bomber jacket", "varsity jacket", "puffer jacket",
            "down jacket", "parka", "windbreaker", "anorak", "fleece jacket", "track jacket",
            "blazer", "suit jacket", "tuxedo jacket", "sport coat", "coat", "overcoat", "trench coat",
            "peacoat", "duffle coat", "raincoat", "poncho", "vest", "puffer vest", "waistcoat",
            "sweater vest", "pants", "trousers", "dress pants", "slacks", "chinos", "khakis",
            "jeans", "blue jeans", "skinny jeans", "straight-leg jeans", "bootcut jeans", "flare jeans",
            "wide-leg jeans", "distressed jeans", "cargo pants", "sweatpants", "joggers", "track pants",
            "leggings", "yoga pants", "tights", "stockings", "shorts", "denim shorts", "jean shorts",
            "cargo shorts", "bermuda shorts", "athletic shorts", "running shorts", "basketball shorts",
            "board shorts", "swim trunks", "biking shorts", "skirt", "mini skirt", "midi skirt",
            "maxi skirt", "pleated skirt", "pencil skirt", "a-line skirt", "denim skirt", "leather skirt",
            "wrap skirt", "dress", "sundress", "casual dress", "shirt dress", "wrap dress", "shift dress",
            "bodycon dress", "maxi dress", "midi dress", "mini dress", "cocktail dress", "evening gown",
            "ball gown", "wedding dress", "bridesmaid dress", "little black dress", "suit", "business suit",
            "three-piece suit", "tuxedo", "overalls", "dungarees", "jumpsuit", "romper", "playsuit",
            "pajamas", "pajama set", "pajama pants", "nightgown", "nightshirt", "bathrobe", "dressing gown",
            "underwear", "underpants", "boxers", "boxer briefs", "briefs", "panties", "thong",
            "bra", "sports bra", "strapless bra", "push-up bra", "undershirt", "thermal underwear",
            "long johns", "socks", "ankle socks", "crew socks", "knee-high socks", "no-show socks",
            "dress socks", "athletic socks", "wool socks", "compression socks", "shoes", "sneakers",
            "running shoes", "athletic shoes", "tennis shoes", "gym shoes", "walking shoes", "canvas shoes",
            "high-top sneakers", "low-top sneakers", "slip-on shoes", "skate shoes", "loafers", "penny loafers",
            "tassel loafers", "dress shoes", "oxford shoes", "derby shoes", "brogues", "monk strap shoes",
            "boat shoes", "deck shoes", "moccasins", "driving shoes", "boots", "ankle boots", "booties",
            "chelsea boots", "chukka boots", "combat boots", "military boots", "work boots", "hiking boots",
            "cowboy boots", "western boots", "riding boots", "knee-high boots", "over-the-knee boots",
            "rain boots", "wellington boots", "snow boots", "winter boots", "sandals", "flat sandals",
            "strappy sandals", "gladiator sandals", "slide sandals", "slides", "flip-flops", "thong sandals",
            "clogs", "mules", "espadrilles", "high heels", "pumps", "stiletto heels", "kitten heels",
            "block heels", "wedge heels", "wedges", "platform shoes", "flats", "ballet flats",
            "pointed flats", "slippers", "house slippers", "moccasin slippers"
        ]
    },
    "accessories_personal": {
        "nameVi": "Phụ Kiện Cá Nhân & Trang Sức",
        "keywords": [
            "cá nhân", "personal", "phụ kiện", "túi xách", "trang sức", "nón", "mũ", "kính", "đồng hồ"
        ],
        "classes": [
            "hat", "baseball cap", "snapback", "fitted cap", "trucker hat", "beanie", "knit cap",
            "winter hat", "fedora", "trilby", "panama hat", "bucket hat", "boonie hat", "beret",
            "newsboy cap", "flat cap", "sun hat", "wide-brim hat", "straw hat", "cowboy hat",
            "top hat", "bowler hat", "visor", "sun visor", "fascinator", "headband", "bandana",
            "scarf", "winter scarf", "knit scarf", "wool scarf", "silk scarf", "infinity scarf",
            "blanket scarf", "pashmina", "shawl", "wrap", "gloves", "leather gloves", "winter gloves",
            "knit gloves", "wool gloves", "fleece gloves", "ski gloves", "driving gloves", "fingerless gloves",
            "mittens", "earmuffs", "belt", "leather belt", "dress belt", "casual belt", "webbed belt",
            "fabric belt", "chain belt", "woven belt", "belt buckle", "suspenders", "braces",
            "tie", "necktie", "silk tie", "skinny tie", "bow tie", "pre-tied bow tie", "cravat",
            "ascot", "pocket square", "tie clip", "tie bar", "tie pin", "cufflinks", "collar stays",
            "sunglasses", "aviator sunglasses", "wayfarer sunglasses", "round sunglasses", "cat-eye sunglasses",
            "oversized sunglasses", "sport sunglasses", "polarized sunglasses", "eyeglasses", "glasses",
            "reading glasses", "spectacles", "glasses frame", "glasses case", "eyeglass chain",
            "watch", "wristwatch", "analog watch", "digital watch", "chronograph", "automatic watch",
            "quartz watch", "dress watch", "diver watch", "pilot watch", "field watch", "smartwatch",
            "fitness tracker", "pocket watch", "watch band", "watch strap", "leather watch band",
            "metal watch band", "bag", "handbag", "purse", "shoulder bag", "crossbody bag",
            "tote bag", "canvas tote", "clutch", "evening bag", "wristlet", "satchel", "messenger bag",
            "courier bag", "backpack", "daypack", "mini backpack", "bookbag", "briefcase",
            "attache case", "laptop bag", "laptop sleeve", "duffel bag", "gym bag", "weekender bag",
            "travel bag", "fanny pack", "waist bag", "belt bag", "sling bag", "bucket bag",
            "hobo bag", "bowling bag", "doctor bag", "luggage", "suitcase", "rolling suitcase",
            "carry-on suitcase", "garment bag", "wallet", "bifold wallet", "trifold wallet",
            "money clip", "cardholder", "card case", "coin purse", "checkbook", "passport holder",
            "passport cover", "luggage tag", "keychain", "key ring", "key fob", "car key",
            "house key", "lanyard", "badge holder", "umbrella", "compact umbrella", "folding umbrella",
            "golf umbrella", "parasol", "cane", "walking stick", "fan", "folding fan", "hand fan",
            "jewelry", "necklace", "pendant necklace", "chain necklace", "choker", "collar necklace",
            "locket", "pearl necklace", "beaded necklace", "statement necklace", "bracelet", "bangle",
            "cuff bracelet", "charm bracelet", "chain bracelet", "tennis bracelet", "beaded bracelet",
            "leather bracelet", "anklet", "ankle bracelet", "ring", "band ring", "cocktail ring",
            "statement ring", "solitaire ring", "signet ring", "stacking rings", "wedding band",
            "wedding ring", "engagement ring", "promise ring", "class ring", "earrings", "stud earrings",
            "hoop earrings", "huggie earrings", "drop earrings", "dangle earrings", "chandelier earrings",
            "ear cuff", "ear climber", "brooch", "pin", "lapel pin", "enamel pin", "hairpin",
            "bobby pin", "hair clip", "barrette", "alligator clip", "claw clip", "banana clip",
            "hair comb", "tiara", "crown"
        ]
    },
    "digital_tech_gadgets": {
        "nameVi": "Thiết Bị Công Nghệ & Điện Tử",
        "keywords": [
            "công nghệ", "tech", "điện tử", "gadget", "máy tính", "laptop", "điện thoại", "thiết bị"
        ],
        "classes": [
            "smartphone", "mobile phone", "cell phone", "iphone", "android phone", "feature phone",
            "flip phone", "foldable phone", "phone case", "screen protector", "phone stand",
            "phone mount", "pop socket", "selfie stick", "tablet", "ipad", "android tablet",
            "graphic tablet", "drawing tablet", "pen display", "stylus", "apple pencil", "digital pen",
            "tablet case", "tablet stand", "e-reader", "kindle", "laptop", "notebook computer",
            "ultrabook", "macbook", "gaming laptop", "chromebook", "2-in-1 laptop", "laptop charger",
            "power adapter", "laptop stand", "laptop cooling pad", "laptop sleeve", "desktop computer",
            "pc", "computer tower", "gaming pc", "all-in-one pc", "imac", "mini pc", "computer monitor",
            "monitor", "lcd monitor", "led monitor", "curved monitor", "ultrawide monitor", "gaming monitor",
            "4k monitor", "dual monitor", "monitor arm", "monitor stand", "keyboard", "mechanical keyboard",
            "wireless keyboard", "bluetooth keyboard", "gaming keyboard", "ergonomic keyboard", "numeric keypad",
            "keycaps", "wrist rest", "computer mouse", "wireless mouse", "bluetooth mouse", "gaming mouse",
            "ergonomic mouse", "vertical mouse", "trackball mouse", "mousepad", "gaming mousepad",
            "extended mousepad", "desk pad", "printer", "inkjet printer", "laser printer", "all-in-one printer",
            "photo printer", "3d printer", "scanner", "flatbed scanner", "document scanner", "photocopier",
            "fax machine", "external hard drive", "portable hard drive", "external ssd", "portable ssd",
            "usb flash drive", "thumb drive", "pen drive", "memory card", "sd card", "micro sd card",
            "cf card", "card reader", "sd card reader", "usb hub", "usb-c hub", "docking station",
            "thunderbolt dock", "cable", "usb cable", "usb-c cable", "lightning cable", "micro-usb cable",
            "hdmi cable", "displayport cable", "ethernet cable", "lan cable", "audio cable", "aux cable",
            "power cable", "extension cord", "power strip", "surge protector", "cable organizer",
            "cable clip", "cable tie", "power bank", "portable charger", "battery pack", "wireless charger",
            "magsafe charger", "charging pad", "charging stand", "multi-device charger", "wall charger",
            "fast charger", "car charger", "headphones", "over-ear headphones", "on-ear headphones",
            "wireless headphones", "bluetooth headphones", "noise-canceling headphones", "gaming headset",
            "studio headphones", "headphone stand", "earphones", "earbuds", "wireless earbuds",
            "true wireless earbuds", "bluetooth earbuds", "airpods", "in-ear monitors", "earphone case",
            "speaker", "bluetooth speaker", "portable speaker", "smart speaker", "smart display",
            "soundbar", "subwoofer", "computer speakers", "desktop speakers", "bookshelf speakers",
            "home theater system", "microphone", "usb microphone", "condenser microphone", "dynamic microphone",
            "lavalier microphone", "wireless microphone", "boom arm", "microphone stand", "pop filter",
            "shock mount", "audio interface", "mixer", "audio mixer", "webcam", "hd webcam", "4k webcam",
            "streaming camera", "ring light", "desk ring light", "key light", "softbox light",
            "video light", "green screen", "camera", "digital camera", "dslr camera", "mirrorless camera",
            "point-and-shoot camera", "action camera", "gopro", "360 camera", "instant camera",
            "polaroid camera", "film camera", "camcorder", "security camera", "cctv camera",
            "webcam", "dash cam", "camera lens", "prime lens", "zoom lens", "wide-angle lens",
            "telephoto lens", "macro lens", "lens cap", "lens hood", "camera bag", "camera strap",
            "tripod", "camera tripod", "phone tripod", "tabletop tripod", "flexible tripod", "gorillapod",
            "monopod", "gimbal", "handheld gimbal", "phone gimbal", "camera stabilizer", "drone",
            "quadcopter", "camera drone", "fpv drone", "drone controller", "game console", "video game console",
            "playstation", "ps5", "ps4", "xbox", "xbox series x", "xbox series s", "nintendo switch",
            "handheld console", "retro console", "game controller", "gamepad", "wireless controller",
            "joystick", "arcade stick", "flight stick", "racing wheel", "gaming pedals", "vr headset",
            "virtual reality headset", "meta quest", "vr controllers", "smart tv", "television",
            "streaming device", "chromecast", "apple tv", "fire tv stick", "roku", "projector",
            "video projector", "home theater projector", "mini projector", "portable projector",
            "projection screen", "calculator", "scientific calculator", "graphing calculator",
            "voice recorder", "digital voice recorder", "dictaphone", "smart plug", "smart bulb",
            "smart thermostat", "smart lock", "robot vacuum"
        ]
    },
    "outdoor_vehicles_street": {
        "nameVi": "Phương Tiện Giao Thông, Xe Cộ & Đường Phố",
        "keywords": [
            "ngoài trời", "outdoor", "xe", "giao thông", "đường phố", "xe cộ", "street", "xe máy", "ô tô"
        ],
        "classes": [
            "car", "automobile", "sedan", "coupe", "hatchback", "station wagon", "estate car",
            "convertible", "cabriolet", "sports car", "supercar", "muscle car", "luxury car",
            "electric car", "hybrid car", "suv", "compact suv", "crossover", "minivan", "van",
            "passenger van", "cargo van", "delivery van", "camper van", "pickup truck", "truck",
            "flatbed truck", "box truck", "semi-truck", "tractor-trailer", "18-wheeler", "dump truck",
            "garbage truck", "cement mixer", "concrete mixer", "tanker truck", "tow truck", "flatbed tow truck",
            "crane truck", "boom truck", "bucket truck", "fire truck", "fire engine", "ambulance",
            "police car", "police cruiser", "squad car", "patrol car", "taxi", "cab", "limousine",
            "hearse", "armored car", "bus", "city bus", "transit bus", "public bus", "school bus",
            "tour bus", "coach bus", "intercity bus", "double-decker bus", "articulated bus", "bendy bus",
            "shuttle bus", "minibus", "trolleybus", "tram", "streetcar", "cable car", "light rail",
            "train", "passenger train", "commuter train", "intercity train", "high-speed train",
            "bullet train", "freight train", "cargo train", "locomotive", "diesel locomotive",
            "electric locomotive", "steam train", "subway train", "metro train", "underground train",
            "monorail", "railroad car", "train carriage", "motorcycle", "motorbike", "cruiser",
            "chopper", "sportbike", "sport motorcycle", "touring motorcycle", "dirt bike", "motocross bike",
            "dual-sport motorcycle", "scooter", "motor scooter", "moped", "vespa", "underbone",
            "trike", "three-wheeled motorcycle", "sidecar", "bicycle", "bike", "road bike",
            "racing bicycle", "mountain bike", "mtb", "gravel bike", "hybrid bike", "city bike",
            "commuter bike", "cruiser bicycle", "beach cruiser", "electric bike", "e-bike", "folding bike",
            "bmx bike", "fixie", "fixed-gear bicycle", "touring bicycle", "tandem bicycle", "cargo bike",
            "recumbent bicycle", "tricycle", "trike", "unicycle", "electric scooter", "e-scooter",
            "kick scooter", "pro scooter", "stunt scooter", "hoverboard", "self-balancing scooter",
            "segway", "skateboard", "longboard", "cruiser skateboard", "penny board", "electric skateboard",
            "roller skates", "quad skates", "rollerblades", "inline skates", "wagon", "handcart",
            "pushcart", "pull cart", "wheelbarrow", "dolly", "hand truck", "rickshaw", "cycle rickshaw",
            "pedicab", "auto rickshaw", "tuk-tuk", "golf cart", "utility vehicle", "atv", "all-terrain vehicle",
            "quad bike", "four-wheeler", "utv", "side-by-side", "snowmobile", "tractor", "farm tractor",
            "combine harvester", "combine", "harvester", "forklift", "pallet jack", "skid steer",
            "skid steer loader", "bobcat", "backhoe", "backhoe loader", "excavator", "digger",
            "bulldozer", "dozer", "road roller", "steamroller", "motor grader", "grader", "asphalt paver",
            "paver", "crane", "tower crane", "mobile crane", "crawler crane", "cherry picker",
            "scissor lift", "street", "road", "paved road", "asphalt road", "gravel road", "dirt road",
            "highway", "freeway", "motorway", "expressway", "interstate", "avenue", "boulevard",
            "lane", "alley", "alleyway", "cul-de-sac", "intersection", "crossroads", "junction",
            "roundabout", "traffic circle", "rotary", "overpass", "flyover", "underpass", "tunnel",
            "road tunnel", "bridge", "suspension bridge", "cable-stayed bridge", "arch bridge",
            "footbridge", "pedestrian bridge", "sidewalk", "pavement", "walkway", "path", "pathway",
            "footpath", "pedestrian zone", "curb", "curbstone", "gutter", "crosswalk", "pedestrian crossing",
            "zebra crossing", "traffic light", "stoplight", "traffic signal", "pedestrian signal",
            "walk signal", "traffic sign", "road sign", "street sign", "stop sign", "yield sign",
            "speed limit sign", "one-way sign", "no entry sign", "no parking sign", "do not enter sign",
            "warning sign", "directional sign", "information sign", "billboard", "advertising billboard",
            "electronic billboard", "street lamp", "street light", "lamp post", "lantern post",
            "fire hydrant", "parking meter", "mailbox", "post box", "drop box", "trash can",
            "public trash can", "garbage bin", "recycling bin", "litter bin", "bench", "park bench",
            "street bench", "bus stop", "bus shelter", "bus station", "train station", "subway entrance",
            "metro entrance", "subway station", "railroad crossing", "level crossing", "crossing gate",
            "railroad track", "train track", "traffic cone", "safety cone", "pylon", "construction barrel",
            "barricade", "traffic barricade", "jersey barrier", "concrete barrier", "guardrail",
            "crash barrier", "bollard", "parking barrier", "wheel clamp", "parking space", "parking lot",
            "parking garage", "multi-story car park", "carport", "driveway", "gas station", "petrol station",
            "gas pump", "fuel dispenser", "ev charging station", "electric vehicle charger", "car wash",
            "toll booth", "toll gate", "manhole", "manhole cover", "storm drain", "catch basin",
            "utility pole", "telephone pole", "power pole", "power lines", "transformer", "fire alarm box",
            "emergency call box", "fence", "chain-link fence", "metal fence", "picket fence", "wall",
            "brick wall", "stone wall", "concrete wall", "retaining wall", "barrier", "gate",
            "swing gate", "sliding gate", "barrier gate", "turnstile", "speed bump", "rumble strip"
        ]
    },
    "nature_animals_plants": {
        "nameVi": "Tự Nhiên, Động Vật & Cây Cối",
        "keywords": [
            "tự nhiên", "động vật", "animal", "pet", "thú cưng", "hoa", "cây", "nature", "chó", "mèo"
        ],
        "classes": [
            "tree", "oak tree", "pine tree", "palm tree", "willow tree", "maple tree", "birch tree",
            "cherry tree", "apple tree", "evergreen tree", "deciduous tree", "conifer", "spruce tree",
            "fir tree", "cypress tree", "cedar tree", "redwood tree", "eucalyptus tree", "banyan tree",
            "baobab tree", "bonsai tree", "bonsai", "sapling", "seedling", "tree trunk", "tree bark",
            "tree branch", "bough", "twig", "tree stump", "log", "fallen log", "root", "tree roots",
            "bush", "shrub", "hedge", "topiary", "bramble", "thicket", "grass", "lawn", "turf",
            "meadow", "pasture", "blade of grass", "clover", "four-leaf clover", "moss", "lichen",
            "fern", "bracken", "bamboo", "bamboo stalk", "reed", "cattail", "rush", "vine",
            "climbing vine", "ivy", "creeper", "seaweed", "kelp", "algae", "flower", "wildflower",
            "rose", "red rose", "white rose", "yellow rose", "pink rose", "tulip", "sunflower",
            "daisy", "gerbera daisy", "orchid", "lily", "water lily", "lotus", "lotus flower",
            "carnation", "lavender", "dandelion", "dandelion puff", "marigold", "hibiscus",
            "cherry blossom", "sakura", "peony", "poppy", "iris", "hydrangea", "chrysanthemum",
            "violet", "pansy", "snapdragon", "daffodil", "narcissus", "magnolia", "jasmine",
            "morning glory", "bougainvillea", "plumeria", "frangipani", "flower petal", "flower bud",
            "bouquet", "bunch of flowers", "flower arrangement", "potted plant", "houseplant",
            "succulent", "cactus", "saguaro cactus", "prickly pear", "aloe vera", "snake plant",
            "spider plant", "peace lily", "monstera", "pothos", "philodendron", "rubber plant",
            "fiddle leaf fig", "jade plant", "air plant", "terrarium", "flowerpot", "planter",
            "hanging basket", "window box", "leaf", "fallen leaf", "autumn leaf", "pine needle",
            "pinecone", "acorn", "seed", "seed pod", "sprout", "mushroom", "toadstool", "wild mushroom",
            "fungus", "bracket fungus", "rock", "stone", "pebble", "boulder", "gravel", "cobblestone",
            "cliff", "rocky cliff", "crag", "rock formation", "cave", "cavern", "grotto", "mountain",
            "snow-capped mountain", "mountain peak", "summit", "hill", "hillside", "mound", "knoll",
            "volcano", "valley", "canyon", "gorge", "ravine", "plateau", "sand", "sand dune",
            "desert", "soil", "dirt", "mud", "clay", "puddle", "pond", "lake", "swamp", "marsh",
            "bog", "wetland", "river", "stream", "creek", "brook", "waterfall", "cascade", "ocean",
            "sea", "wave", "breaking wave", "surf", "tide pool", "beach", "sandy beach", "pebble beach",
            "coast", "shore", "shoreline", "coastline", "bay", "cove", "inlet", "island", "islet",
            "atoll", "reef", "coral reef", "coral", "sea anemone", "glacier", "iceberg", "ice",
            "icicle", "snow", "snowflake", "snowdrift", "sky", "cloud", "white cloud", "cumulus cloud",
            "storm cloud", "rain cloud", "sun", "sunshine", "sunbeam", "sunrise", "sunset", "moon",
            "full moon", "crescent moon", "star", "night sky", "rainbow", "lightning", "rain",
            "raindrop", "dog", "puppy", "golden retriever", "labrador", "german shepherd", "bulldog",
            "french bulldog", "beagle", "poodle", "chihuahua", "husky", "siberian husky", "corgi",
            "pug", "dachshund", "boxer dog", "rottweiler", "doberman", "shiba inu", "terrier",
            "border collie", "dalmatian", "great dane", "cat", "kitten", "tabby cat", "black cat",
            "white cat", "calico cat", "ginger cat", "siamese cat", "persian cat", "maine coon",
            "british shorthair", "sphynx cat", "bengal cat", "bird", "pigeon", "dove", "sparrow",
            "robin", "swallow", "bluebird", "cardinal", "canary", "finch", "crow", "raven",
            "magpie", "jay", "blue jay", "blackbird", "starling", "seagull", "gull", "pelican",
            "albatross", "cormorant", "heron", "egret", "stork", "crane bird", "flamingo", "swan",
            "white swan", "black swan", "goose", "duck", "mallard", "duckling", "peacock", "peahen",
            "pheasant", "quail", "partridge", "turkey", "wild turkey", "chicken", "rooster", "hen",
            "chick", "parrot", "macaw", "cockatoo", "cockatiel", "parakeet", "budgerigar", "lovebird",
            "toucan", "hornbill", "woodpecker", "kingfisher", "hummingbird", "owl", "barn owl",
            "great horned owl", "snowy owl", "screech owl", "eagle", "bald eagle", "golden eagle",
            "hawk", "falcon", "peregrine falcon", "kestrel", "osprey", "vulture", "condor", "penguin",
            "emperor penguin", "ostrich", "emu", "kiwi bird", "mammal", "horse", "foal", "stallion",
            "mare", "pony", "donkey", "burro", "mule", "zebra", "cow", "bull", "calf", "heifer",
            "ox", "bison", "buffalo", "water buffalo", "yak", "sheep", "ram", "ewe", "lamb",
            "goat", "billy goat", "kid goat", "pig", "boar", "wild boar", "piglet", "sow",
            "deer", "stag", "doe", "fawn", "buck", "elk", "moose", "reindeer", "caribou",
            "antelope", "gazelle", "impala", "wildbeest", "gnu", "camel", "dromedary", "bactrian camel",
            "llama", "alpaca", "giraffe", "elephant", "african elephant", "asian elephant",
            "rhinoceros", "rhino", "hippopotamus", "hippo", "lion", "lioness", "lion cub", "tiger",
            "bengal tiger", "tiger cub", "leopard", "cheetah", "jaguar", "panther", "black panther",
            "cougar", "mountain lion", "puma", "lynx", "bobcat", "ocelot", "bear", "grizzly bear",
            "brown bear", "black bear", "polar bear", "panda", "giant panda", "red panda", "koala",
            "kangaroo", "wallaby", "wombat", "tasmanian devil", "platypus", "monkey", "chimpanzee",
            "gorilla", "orangutan", "baboon", "mandrill", "macaque", "capuchin", "lemur", "gibbon",
            "wolf", "gray wolf", "coyote", "jackal", "dingo", "fox", "red fox", "arctic fox",
            "fennec fox", "hyena", "spotted hyena", "rabbit", "bunny", "hare", "squirrel", "chipmunk",
            "groundhog", "marmot", "prairie dog", "beaver", "otter", "sea otter", "river otter",
            "badger", "honey badger", "skunk", "raccoon", "possum", "opossum", "hedgehog", "porcupine",
            "armadillo", "anteater", "sloth", "three-toed sloth", "mole", "shrew", "bat", "fruit bat",
            "vampire bat", "flying fox", "marine mammal", "whale", "blue whale", "humpback whale",
            "sperm whale", "orca", "killer whale", "beluga whale", "narwhal", "dolphin", "bottlenose dolphin",
            "porpoise", "seal", "harbor seal", "sea lion", "walrus", "manatee", "dugong", "reptile",
            "turtle", "sea turtle", "tortoise", "box turtle", "snapping turtle", "lizard", "gecko",
            "chameleon", "iguana", "bearded dragon", "komodo dragon", "monitor lizard", "skink",
            "gila monster", "snake", "garter snake", "python", "boa constrictor", "anaconda",
            "viper", "pit viper", "rattlesnake", "cobra", "king cobra", "mamba", "black mamba",
            "coral snake", "crocodile", "alligator", "caiman", "gharial", "amphibian", "frog",
            "tree frog", "poison dart frog", "bullfrog", "toad", "salamander", "newt", "axolotl",
            "fish", "freshwater fish", "saltwater fish", "goldfish", "koi", "carp", "trout",
            "salmon", "bass", "catfish", "pike", "perch", "tilapia", "angelfish", "guppy", "betta",
            "siamese fighting fish", "clownfish", "anemonefish", "tang", "blue tang", "tuna",
            "mackerel", "cod", "halibut", "flounder", "swordfish", "marlin", "sailfish", "barracuda",
            "pufferfish", "blowfish", "lionfish", "moray eel", "eel", "seahorse", "pipefish",
            "stingray", "manta ray", "ray", "shark", "great white shark", "hammerhead shark",
            "tiger shark", "whale shark", "invertebrate", "octopus", "squid", "giant squid",
            "cuttlefish", "nautilus", "jellyfish", "sea jelly", "man-of-war", "starfish", "sea star",
            "sea urchin", "sand dollar", "sea cucumber", "crab", "hermit crab", "fiddler crab",
            "blue crab", "king crab", "lobster", "spiny lobster", "crayfish", "crawfish", "shrimp",
            "prawn", "krill", "barnacle", "snail", "land snail", "sea snail", "slug", "sea slug",
            "nudibranch", "clam", "mussel", "oyster", "scallop", "seashell", "conch shell", "insect",
            "butterfly", "monarch butterfly", "swallowtail butterfly", "blue morpho", "caterpillar",
            "chrysalis", "cocoon", "moth", "silk moth", "luna moth", "bee", "honeybee", "bumblebee",
            "queen bee", "wasp", "hornet", "yellowjacket", "ant", "queen ant", "fire ant", "carpenter ant",
            "army ant", "termite", "beetle", "ladybug", "ladybird", "scarab beetle", "stag beetle",
            "rhinoceros beetle", "firefly", "lightning bug", "glowworm", "dragonfly", "damselfly",
            "grasshopper", "locust", "cricket", "katydid", "praying mantis", "mantis", "walking stick",
            "stick insect", "cicada", "fly", "housefly", "fruit fly", "horsefly", "mosquito", "gnat",
            "flea", "tick", "bedbug", "cockroach", "roach", "spider", "jumping spider", "wolf spider",
            "tarantula", "black widow", "orb-weaver", "daddy longlegs", "spider web", "cobweb",
            "scorpion", "centipede", "millipede", "earthworm", "worm", "leech"
        ]
    },
    "sports_recreation": {
        "nameVi": "Thể Thao & Hoạt Động Ngoài Trời",
        "keywords": [
            "thể thao", "sport", "fitness", "vận động", "bóng", "bóng đá", "bóng rổ", "chạy bộ", "bơi"
        ],
        "classes": [
            "ball", "sports ball", "soccer ball", "football", "american football", "basketball",
            "volleyball", "beach volleyball", "baseball", "softball", "tennis ball", "golf ball",
            "ping pong ball", "table tennis ball", "billiard ball", "pool ball", "cue ball",
            "bowling ball", "rugby ball", "cricket ball", "lacrosse ball", "field hockey ball",
            "handball", "dodgeball", "medicine ball", "slam ball", "exercise ball", "swiss ball",
            "stability ball", "racket", "racquet", "tennis racket", "badminton racket", "squash racket",
            "racquetball racket", "paddle", "table tennis paddle", "ping pong paddle", "pickleball paddle",
            "canoe paddle", "kayak paddle", "stand-up paddle", "bat", "baseball bat", "wooden baseball bat",
            "aluminum baseball bat", "softball bat", "cricket bat", "stick", "hockey stick", "ice hockey stick",
            "field hockey stick", "lacrosse stick", "curling broom", "golf club", "driver", "wood",
            "iron", "wedge", "putter", "golf bag", "golf tee", "golf glove", "cue", "pool cue",
            "billiard cue", "snooker cue", "chalk", "pool cue chalk", "net", "tennis net", "badminton net",
            "volleyball net", "ping pong net", "soccer net", "hockey net", "goal", "soccer goal",
            "hockey goal", "lacrosse goal", "basketball hoop", "basketball rim", "basketball backboard",
            "basketball net", "pin", "bowling pin", "target", "archery target", "bullseye", "bow",
            "archery bow", "recurve bow", "compound bow", "arrow", "quiver", "dartboard", "darts",
            "dart", "frisbee", "flying disc", "boomerang", "kite", "stunt kite", "skateboard",
            "longboard", "roller skates", "quad skates", "rollerblades", "inline skates", "ice skates",
            "figure skates", "hockey skates", "speed skates", "skis", "downhill skis", "cross-country skis",
            "water skis", "ski poles", "snowboard", "snowboard bindings", "sled", "sledge", "toboggan",
            "bobsleigh", "luge", "surfboard", "longboard surfboard", "shortboard surfboard", "bodyboard",
            "boogie board", "paddleboard", "sup board", "windsurf board", "kiteboard", "wakeboard",
            "kneeboard", "skimboard", "canoe", "kayak", "sea kayak", "whitewater kayak", "rowboat",
            "scull", "sailboat", "laser sailboat", "windsurfer", "bicycle", "racing bike", "mountain bike",
            "bmx bike", "helmet", "bicycle helmet", "motorcycle helmet", "football helmet", "baseball helmet",
            "batting helmet", "hockey helmet", "ski helmet", "snowboard helmet", "climbing helmet",
            "skate helmet", "equestrian helmet", "goggles", "swimming goggles", "ski goggles", "snowboard goggles",
            "safety goggles", "diving mask", "scuba mask", "snorkel", "swim fins", "flippers", "kickboard",
            "pull buoy", "life jacket", "life vest", "pfd", "wetsuit", "drysuit", "rash guard",
            "swimsuit", "swim trunks", "swim cap", "nose clip", "earplugs", "gloves", "baseball glove",
            "baseball mitt", "catchers mitt", "batting gloves", "boxing gloves", "sparring gloves",
            "mma gloves", "goalkeeper gloves", "goalie gloves", "weightlifting gloves", "gym gloves",
            "cycling gloves", "ski gloves", "snowboard gloves", "climbing gloves", "pads", "knee pads",
            "elbow pads", "wrist guards", "shin guards", "thigh pads", "shoulder pads", "chest protector",
            "mouthguard", "athletic supporter", "cup", "uniform", "jersey", "sports jersey", "team jersey",
            "shorts", "sports shorts", "gym shorts", "running shorts", "tracksuit", "sweatpants",
            "sweatshirt", "hoodie", "tank top", "athletic shirt", "compression shirt", "compression pants",
            "spats", "gi", "karate gi", "judo gi", "taekwondo dobok", "belt", "karate belt", "black belt",
            "running shoes", "track spikes", "cleats", "soccer cleats", "football cleats", "baseball cleats",
            "golf shoes", "bowling shoes", "climbing shoes", "boxing boots", "wrestling shoes", "court shoes",
            "skate shoes", "treadmill", "stationary bike", "exercise bike", "spin bike", "elliptical trainer",
            "elliptical", "rowing machine", "indoor rower", "stair climber", "stepper", "weight bench",
            "incline bench", "flat bench", "squat rack", "power rack", "smith machine", "cable crossover machine",
            "lat pulldown machine", "leg press machine", "barbell", "olympic barbell", "ez curl bar",
            "weight plate", "bumper plate", "dumbbell", "adjustable dumbbell", "hex dumbbell", "kettlebell",
            "cast iron kettlebell", "pull-up bar", "chin-up bar", "dip station", "parallel bars",
            "gymnastic rings", "resistance bands", "exercise bands", "loop bands", "jump rope",
            "skipping rope", "speed rope", "foam roller", "massage roller", "ab roller", "ab wheel",
            "push-up bars", "balance board", "wobble board", "bosu ball", "plyometric box", "plyo box",
            "agility ladder", "speed cones", "training cones", "hurdles", "starting blocks", "baton",
            "relay baton", "javelin", "shot put", "discus", "hammer", "vaulting pole", "landing mat",
            "crash mat", "gymnastic mat", "yoga mat", "pilates mat", "yoga block", "yoga strap",
            "yoga wheel", "punching bag", "heavy bag", "speed bag", "double-end bag", "kick pad",
            "focus mitts", "boxing ring", "octagon", "cage", "tatami", "climbing wall", "climbing hold",
            "climbing harness", "carabiner", "belay device", "climbing rope", "chalk bag", "bouldering pad",
            "crash pad", "stopwatch", "digital stopwatch", "whistle", "referee whistle", "clipboard",
            "coach clipboard", "cone", "traffic cone", "corner flag", "penalty card", "red card",
            "yellow card", "scoreboard", "electronic scoreboard", "podium", "winners podium", "trophy",
            "cup trophy", "medal", "gold medal", "silver medal", "bronze medal", "ribbon", "blue ribbon",
            "pennant", "sports pennant", "team flag", "banner", "gym bag", "sports duffel", "ball pump",
            "air pump", "ball needle", "pressure gauge"
        ]
    },
    "medical_store_services": {
        "nameVi": "Y Tế Cửa Hàng & Dịch Vụ Đời Sống",
        "keywords": [
            "y tế", "medical", "thuốc", "siêu thị", "store", "shop", "cửa hàng", "tiệm", "dịch vụ"
        ],
        "classes": [
            "medicine", "pill", "tablet", "capsule", "gelcap", "caplet", "lozenge", "cough drop",
            "effervescent tablet", "chewable tablet", "medicine bottle", "pill bottle", "prescription bottle",
            "vial", "medicine dropper", "dropper bottle", "blister pack", "strip pack", "foil packet",
            "syrup", "cough syrup", "liquid medicine", "suspension", "elixir", "oral syringe",
            "medicine cup", "measuring spoon", "ointment", "cream", "topical cream", "lotion",
            "antiseptic cream", "antibiotic ointment", "hydrocortisone cream", "gel", "aloe gel",
            "spray", "nasal spray", "throat spray", "inhaler", "metered dose inhaler", "asthma inhaler",
            "nebulizer", "eye drops", "ear drops", "saline solution", "contact lens solution",
            "rubbing alcohol", "isopropyl alcohol", "hydrogen peroxide", "antiseptic solution", "betadine",
            "iodine", "witch hazel", "first aid kit", "first aid box", "emergency kit", "bandage",
            "adhesive bandage", "band-aid", "sterile bandage", "fabric bandage", "butterfly bandage",
            "liquid bandage", "gauze", "sterile gauze", "gauze pad", "gauze roll", "gauze bandage",
            "medical tape", "adhesive tape", "micropore tape", "zinc oxide tape", "elastic bandage",
            "crepe bandage", "ace bandage", "compression bandage", "triangular bandage", "sling",
            "arm sling", "splint", "finger splint", "cast", "plaster cast", "fiberglass cast",
            "cotton balls", "cotton pads", "cotton rounds", "cotton buds", "cotton swabs", "q-tips",
            "thermometer", "digital thermometer", "infrared thermometer", "forehead thermometer",
            "ear thermometer", "mercury thermometer", "fever strip", "blood pressure monitor",
            "sphygmomanometer", "blood pressure cuff", "stethoscope", "pulse oximeter", "finger pulse oximeter",
            "blood glucose meter", "glucometer", "glucose test strips", "lancet", "lancing device",
            "insulin pen", "insulin syringe", "syringe", "disposable syringe", "hypodermic needle",
            "safety needle", "alcohol prep pad", "alcohol swab", "tourniquet", "medical gloves",
            "examination gloves", "latex gloves", "nitrile gloves", "vinyl gloves", "surgical mask",
            "face mask", "procedure mask", "n95 mask", "kn95 mask", "respirator", "face shield",
            "protective goggles", "safety glasses", "shoe covers", "disposable gown", "hand sanitizer",
            "sanitizer bottle", "sanitizer dispenser", "disinfecting wipes", "antibacterial wipes",
            "sanitizing spray", "hot water bottle", "heating pad", "electric heating pad", "ice pack",
            "cold pack", "gel ice pack", "instant cold pack", "compress", "hot compress", "cold compress",
            "brace", "knee brace", "ankle brace", "wrist brace", "elbow brace", "back brace",
            "lumbar support", "neck brace", "cervical collar", "compression socks", "compression stockings",
            "crutches", "underarm crutches", "forearm crutches", "walking stick", "cane", "quad cane",
            "walker", "rollator", "walking frame", "wheelchair", "manual wheelchair", "electric wheelchair",
            "commode chair", "shower chair", "bath bench", "pill organizer", "pill dispenser",
            "weekly pill box", "pill cutter", "pill splitter", "pill crusher", "mortar and pestle",
            "magnifying glass", "reading magnifier", "hearing aid", "behind-the-ear hearing aid",
            "in-the-ear hearing aid", "hearing aid batteries", "denture", "false teeth", "denture cup",
            "denture adhesive", "denture cleaning tablets", "mouthguard", "night guard", "retainer",
            "retainer case", "eye patch", "nasal strips", "anti-snoring device", "earplugs",
            "foam earplugs", "silicone earplugs", "scale", "bathroom scale", "medical scale",
            "height rod", "stadiometer", "medical chart", "patient chart", "clipboard", "prescription",
            "prescription pad", "doctor prescription", "shopping cart", "grocery cart", "shopping basket",
            "hand basket", "store shelf", "supermarket shelf", "display rack", "gondola shelf",
            "endcap display", "refrigerated display", "freezer case", "deli counter", "bakery display",
            "produce stand", "checkout counter", "cash register", "pos terminal", "card reader",
            "credit card terminal", "barcode scanner", "handheld scanner", "flatbed scanner",
            "receipt printer", "price tag", "shelf tag", "barcode label", "shopping bag", "paper shopping bag",
            "plastic shopping bag", "reusable shopping bag", "tote bag", "cart return", "turnstile"
        ]
    },
    # 6 BỐI CẢNH MỚI TOÀN DIỆN
    "gym_fitness": {
        "nameVi": "Gym, Thể Hình & Rèn Luyện Thể Lực",
        "keywords": [
            "gym", "thể hình", "tập gym", "fitness", "workout", "cơ bắp", "thể dục", "tạ", "phòng gym"
        ],
        "classes": [
            "dumbbell", "barbell", "kettlebell", "weight plate", "bench press", "treadmill",
            "exercise bike", "elliptical trainer", "rowing machine", "pull-up bar", "yoga mat",
            "foam roller", "resistance band", "jump rope", "punching bag", "boxing gloves",
            "gym bag", "shaker bottle", "water bottle", "weightlifting belt", "wrist wraps",
            "chalk bag", "locker", "gym bench", "squat rack", "cable machine", "smith machine",
            "leg press machine", "lat pulldown machine", "exercise ball", "medicine ball", "bosu ball",
            "step platform", "ab roller", "ankle weights", "dip station", "speed ladder",
            "battle ropes", "stopwatch", "heart rate monitor", "sweatband", "gym towel",
            "weight rack", "weight tree", "grip strengthener", "gymnastic rings", "parallettes",
            "safety collar", "weight clip", "foam pad", "incline bench", "decline bench", "preacher bench",
            "trap bar", "ez bar", "cable attachment", "tricep rope", "lat bar", "d-handle"
        ]
    },
    "restaurant_cafe": {
        "nameVi": "Nhà Hàng, Quán Cafe & Trà",
        "keywords": [
            "nhà hàng", "quán cafe", "cà phê", "cafe", "coffee", "restaurant", "quán ăn", "trà", "tiệm trà"
        ],
        "classes": [
            "coffee machine", "espresso machine", "coffee grinder", "coffee maker", "french press",
            "pour-over dripper", "coffee bean", "coffee bean jar", "menu", "cash register", "pos terminal",
            "serving tray", "takeout cup", "paper cup", "plastic cup", "straw", "coffee cup", "saucer",
            "teacup", "teapot", "tea infuser", "sugar dispenser", "creamer", "syrup bottle",
            "bar counter", "bar stool", "countertop", "napkin holder", "condiment shaker", "blender",
            "milk pitcher", "frothing pitcher", "receipt", "bill holder", "order pad", "apron",
            "ice bucket", "ice scoop", "cocktail shaker", "wine bottle", "wine glass", "beer glass",
            "beer tap", "cake display", "pastry display", "chalkboard menu", "high chair", "table number",
            "dining booth", "service bell", "coaster", "moka pot", "chemex", "aeropress", "tamper",
            "knock box", "portafilter", "coffee scale", "cupping spoon", "carafe", "takeout bag"
        ]
    },
    "hospital_healthcare": {
        "nameVi": "Bệnh Viện, Y Tế & Chăm Sóc Sức Khỏe",
        "keywords": [
            "bệnh viện", "y tế", "sức khỏe", "hospital", "clinic", "phòng khám", "bác sĩ", "doctor", "nurse", "thuốc", "y tá"
        ],
        "classes": [
            "stethoscope", "syringe", "needle", "thermometer", "wheelchair", "crutches", "walker",
            "hospital bed", "iv drip", "iv stand", "blood pressure monitor", "sphygmomanometer",
            "first aid kit", "surgical mask", "medical mask", "medical gloves", "latex gloves",
            "medicine bottle", "pill bottle", "blister pack", "capsule", "tablet pill", "gauze",
            "bandage", "adhesive bandage", "band-aid", "cotton ball", "cotton swab", "antiseptic bottle",
            "scalpel", "forceps", "tweezers", "medical scissors", "surgical tray", "kidney dish",
            "x-ray viewer", "ultrasound machine", "defibrillator", "pulse oximeter", "oxygen mask",
            "oxygen tank", "medical chart", "clipboard", "scrubs", "lab coat", "exam table",
            "hand sanitizer dispenser", "sharps container", "biohazard bin", "microscope", "petri dish",
            "saline bag", "catheter", "ecg monitor", "patient monitor", "gurney", "stretcher"
        ]
    },
    "art_craft_hobbies": {
        "nameVi": "Mỹ Thuật, Hội Họa & Thủ Công",
        "keywords": [
            "mỹ thuật", "hội họa", "thủ công", "vẽ", "tranh", "art", "craft", "painting", "drawing", "điêu khắc"
        ],
        "classes": [
            "canvas", "easel", "palette", "paintbrush", "paint roller", "palette knife", "acrylic paint",
            "oil paint", "watercolor paint", "paint tube", "sketchpad", "sketchbook", "drawing paper",
            "charcoal stick", "pastels", "calligraphy brush", "ink bottle", "drawing board", "pencil case",
            "clay", "sculpture", "pottery wheel", "pottery vase", "carving tool", "chisel", "hot glue gun",
            "glue sticks", "craft scissors", "utility knife", "cutting mat", "sewing machine", "sewing needle",
            "thread spool", "pin cushion", "measuring tape", "thimble", "fabric", "yarn", "knitting needles",
            "crochet hook", "embroidery hoop", "origami paper", "glitter", "beads", "sequins", "ribbon",
            "washi tape", "stencil", "craft knife", "magnifying desk lamp", "color wheel", "tracing paper",
            "oil pastels", "graphite pencil", "water cup", "paint tray", "craft wire", "clay modeling tool"
        ]
    },
    "construction_tools": {
        "nameVi": "Dụng Cụ Lao Động, Xây Dựng & Sửa Chữa",
        "keywords": [
            "công cụ", "xây dựng", "sửa chữa", "lao động", "thợ", "tools", "construction", "hardware", "cơ khí"
        ],
        "classes": [
            "hammer", "screwdriver", "flathead screwdriver", "phillips screwdriver", "wrench",
            "adjustable wrench", "socket wrench", "pipe wrench", "pliers", "needle-nose pliers",
            "wire strippers", "drill", "cordless drill", "drill bit", "tape measure", "spirit level",
            "handsaw", "hacksaw", "circular saw", "jigsaw", "utility knife", "box cutter", "chisel",
            "file", "sandpaper", "sanding block", "crowbar", "pry bar", "putty knife", "trowel",
            "ladder", "step ladder", "toolbox", "tool belt", "safety helmet", "hard hat", "safety glasses",
            "goggles", "ear defenders", "work gloves", "respirator", "dust mask", "reflective vest",
            "nail", "screw", "bolt", "nut", "washer", "anchor", "duct tape", "electrical tape",
            "extension cord", "work bench", "vise", "clamp", "c-clamp", "caulking gun", "wheelbarrow",
            "chainsaw", "miter saw", "angle grinder", "heat gun", "soldering iron", "staple gun"
        ]
    },
    "baby_toys_kids": {
        "nameVi": "Đồ Chơi, Trẻ Em & Đồ Dùng Sơ Sinh",
        "keywords": [
            "đồ chơi", "trẻ em", "em bé", "sơ sinh", "toys", "baby", "kid", "child", "toddler"
        ],
        "classes": [
            "teddy bear", "stuffed animal", "plush toy", "doll", "dollhouse", "action figure",
            "toy car", "toy truck", "toy train", "toy airplane", "building blocks", "lego bricks",
            "wooden blocks", "jigsaw puzzle", "board game", "playmat", "baby stroller", "pram",
            "baby carriage", "baby crib", "cot", "bassinet", "baby bed", "high chair", "baby bouncer",
            "baby swing", "baby walker", "baby bottle", "feeding bottle", "pacifier", "dummy",
            "teether", "baby rattle", "sippy cup", "baby bib", "diaper", "nappy", "baby wipes",
            "baby bath", "bath toy", "rubber duck", "baby mobile", "tricycle", "balance bike",
            "scooter", "rocking horse", "playpen", "potty", "toy chest", "toy box", "crayons", "finger paint",
            "playdough", "bubble blower", "spinning top", "yo-yo", "kite", "slingshot", "water gun"
        ]
    }
}


def build_and_rebuild():
    start_time = time.time()
    print("==================================================================")
    print("🚀 BẮT ĐẦU MỞ RỘNG TỪ VỰNG NHẬN DIỆN & TÁI TẠO VECTOR CACHE OFFLINE")
    print("==================================================================")

    # 1. Thu thập và làm sạch danh sách từ vựng
    all_classes_set = set()
    cleaned_themes = {}

    for theme_key, theme_info in THEMES_DATA.items():
        raw_classes = theme_info.get("classes", [])
        cleaned_classes = []
        for c in raw_classes:
            word = c.strip().lower()
            if word and word not in cleaned_classes:
                cleaned_classes.append(word)
                all_classes_set.add(word)

        cleaned_themes[theme_key] = {
            "nameVi": theme_info.get("nameVi", theme_key),
            "keywords": theme_info.get("keywords", []),
            "classes": cleaned_classes
        }
        print(f"  📁 Bối cảnh '{theme_key}': {len(cleaned_classes)} từ vựng")

    # Giữ lại từ vựng cũ nếu có trong target_classes.txt
    if os.path.exists(TARGET_CLASSES_PATH):
        with open(TARGET_CLASSES_PATH, "r", encoding="utf-8") as f:
            for line in f:
                w = line.strip().lower()
                if w and not w.startswith("#"):
                    all_classes_set.add(w)

    sorted_classes = sorted(list(all_classes_set))
    total_classes = len(sorted_classes)
    print(f"\n✨ Tổng số từ vựng duy nhất đạt được: {total_classes} từ (sau de-duplication)")

    # 2. Ghi ra themes_classes.json
    print(f"💾 Đang lưu {THEMES_PATH}...")
    with open(THEMES_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned_themes, f, ensure_ascii=False, indent=2)

    # 3. Ghi ra target_classes.txt
    print(f"💾 Đang lưu {TARGET_CLASSES_PATH}...")
    with open(TARGET_CLASSES_PATH, "w", encoding="utf-8") as f:
        f.write(f"# VOCARIO EVERYTHING TARGET VOCABULARY ({total_classes} classes)\n")
        f.write(f"# Auto-generated on {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        for cls_name in sorted_classes:
            f.write(f"{cls_name}\n")

    # 4. Tải mô hình YOLO-World và mã hóa vector CLIP (txt_feats)
    print("\n🧠 Đang khởi động YOLO-World để mã hóa đặc trưng Text Embeddings...")
    from ultralytics import YOLOWorld

    model_path = "yolov8s-worldv2.pt"
    finetuned = os.path.join(BASE_DIR, "runs", "train", "vocario_yolo_world_finetune", "weights", "best.pt")
    if os.path.exists(finetuned):
        model_path = finetuned
        print(f"  -> Dùng checkpoint Fine-tuned: {model_path}")
    else:
        print(f"  -> Dùng checkpoint Pretrained Base: {model_path}")

    model = YOLOWorld(model_path)
    
    # Mã hóa CLIP
    print(f"⚡ Đang mã hóa {total_classes} lớp từ vựng qua CLIP Text Encoder...")
    encode_t0 = time.time()
    model.set_classes(sorted_classes)
    encode_dur = time.time() - encode_t0
    print(f"✅ Mã hóa thành công trong {encode_dur:.2f}s!")

    txt_feats = model.model.txt_feats.cpu()
    print(f"📊 Tensor txt_feats shape: {txt_feats.shape}, dtype: {txt_feats.dtype}")

    # 5. Lưu cache offline
    print(f"💾 Đang lưu vector cache offline vào {FEATS_CACHE_PATH}...")
    torch.save({
        "classes": sorted_classes,
        "txt_feats": txt_feats
    }, FEATS_CACHE_PATH)

    cache_size_mb = os.path.getsize(FEATS_CACHE_PATH) / (1024 * 1024)
    total_time = time.time() - start_time
    print(f"🎉 HOÀN TẤT! File cache kích thước: {cache_size_mb:.2f} MB")
    print(f"⏱️ Tổng thời gian thực thi: {total_time:.2f}s")
    print("==================================================================")


if __name__ == "__main__":
    build_and_rebuild()

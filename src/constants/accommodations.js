// ─── Dynamic Accommodation Generator (location-aware) ───
export const ACCOM_TEMPLATES = [
  { suffix: "Boutique Hotel", type: "Hotel", baseTags: ["Pool", "Spa", "Restaurant"], baseRating: 4.7, price: "£££" },
  { suffix: "Lodge & Suites", type: "Lodge", baseTags: ["Garden", "Bar", "Parking"], baseRating: 4.5, price: "££" },
  { suffix: "Country Cottage", type: "Cottage", baseTags: ["3 beds", "Fireplace", "Pet friendly"], baseRating: 4.8, price: "££" },
  { suffix: "B&B", type: "B&B", baseTags: ["Breakfast", "Central", "Parking"], baseRating: 4.6, price: "£" },
  { suffix: "Retreat & Spa", type: "Hotel", baseTags: ["Hot tub", "Wellness", "Fine dining"], baseRating: 4.9, price: "£££" },
  { suffix: "Serviced Apartment", type: "Apartment", baseTags: ["Self-catering", "WiFi", "Kitchen"], baseRating: 4.3, price: "££" },
  { suffix: "Manor House", type: "Hotel", baseTags: ["4 rooms", "Breakfast", "EV charger"], baseRating: 4.6, price: "£££" },
  { suffix: "Glamping Pod", type: "Glamping", baseTags: ["Unique", "Nature", "Stargazing"], baseRating: 4.7, price: "££" },
  { suffix: "Inn", type: "Inn", baseTags: ["Pub", "Traditional", "Dog friendly"], baseRating: 4.4, price: "£" },
  { suffix: "Guest House", type: "Guest House", baseTags: ["Homely", "Garden", "Breakfast"], baseRating: 4.5, price: "£" },
];

export const REGION_ACCOM_TEMPLATES = {
  japan: [
    { suffix: "Ryokan", type: "Traditional Inn", baseTags: ["Tatami", "Onsen", "Kaiseki dinner"], baseRating: 4.8, price: "£££" },
    { suffix: "Capsule Hotel", type: "Capsule", baseTags: ["Central", "Modern", "Budget"], baseRating: 4.2, price: "£" },
    { suffix: "Business Hotel", type: "Hotel", baseTags: ["Clean", "Convenient", "Wi-Fi"], baseRating: 4.3, price: "££" },
    { suffix: "Boutique Hotel", type: "Hotel", baseTags: ["Design", "Rooftop bar", "City view"], baseRating: 4.7, price: "£££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Local area", "Shared kitchen", "Friendly"], baseRating: 4.5, price: "£" },
    { suffix: "Luxury Resort", type: "Resort", baseTags: ["Spa", "Garden", "Fine dining"], baseRating: 4.9, price: "££££" },
  ],
  france: [
    { suffix: "Boutique Hôtel", type: "Boutique Hotel", baseTags: ["Charming", "Central", "Breakfast"], baseRating: 4.6, price: "£££" },
    { suffix: "Chambre d'Hôtes", type: "B&B", baseTags: ["Homely", "Local host", "Garden"], baseRating: 4.7, price: "££" },
    { suffix: "Auberge", type: "Inn", baseTags: ["Restaurant", "Countryside", "Character"], baseRating: 4.5, price: "££" },
    { suffix: "Aparthotel", type: "Apartment", baseTags: ["Kitchen", "Self-catering", "Spacious"], baseRating: 4.4, price: "££" },
    { suffix: "Luxury Palace", type: "Luxury Hotel", baseTags: ["5-star", "Spa", "Concierge"], baseRating: 4.9, price: "££££" },
  ],
  spain: [
    { suffix: "Parador", type: "Historic Hotel", baseTags: ["Heritage", "Restaurant", "Views"], baseRating: 4.7, price: "£££" },
    { suffix: "Hostal", type: "Guesthouse", baseTags: ["Budget", "Central", "Friendly"], baseRating: 4.2, price: "£" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop terrace", "Pool"], baseRating: 4.6, price: "£££" },
    { suffix: "Apartamento", type: "Apartment", baseTags: ["Kitchen", "Local area", "Balcony"], baseRating: 4.4, price: "££" },
    { suffix: "Casa Rural", type: "Country House", baseTags: ["Rural", "Pool", "Peaceful"], baseRating: 4.5, price: "££" },
  ],
  italy: [
    { suffix: "Albergo", type: "Hotel", baseTags: ["Central", "Breakfast", "Terrace"], baseRating: 4.5, price: "££" },
    { suffix: "Agriturismo", type: "Farm Stay", baseTags: ["Countryside", "Local food", "Pool"], baseRating: 4.7, price: "££" },
    { suffix: "Pensione", type: "Guesthouse", baseTags: ["Family-run", "Budget", "Charming"], baseRating: 4.3, price: "£" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Historic building", "Restaurant"], baseRating: 4.8, price: "£££" },
    { suffix: "Palazzo", type: "Luxury", baseTags: ["Heritage", "Spa", "Fine dining"], baseRating: 4.9, price: "££££" },
  ],
  usa: [
    { suffix: "Downtown Hotel", type: "Hotel", baseTags: ["Central", "Gym", "Business"], baseRating: 4.4, price: "£££" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop", "Bar"], baseRating: 4.7, price: "£££" },
    { suffix: "Motel", type: "Motel", baseTags: ["Road trip", "Parking", "Budget"], baseRating: 3.8, price: "£" },
    { suffix: "Airbnb Apartment", type: "Apartment", baseTags: ["Kitchen", "Local area", "Flexible"], baseRating: 4.5, price: "££" },
    { suffix: "Resort & Spa", type: "Resort", baseTags: ["Pool", "Spa", "Restaurant"], baseRating: 4.8, price: "££££" },
  ],
  thailand: [
    { suffix: "Beach Resort", type: "Resort", baseTags: ["Beachfront", "Pool", "Spa"], baseRating: 4.7, price: "££" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop", "Central"], baseRating: 4.6, price: "££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Budget", "Friendly", "Local area"], baseRating: 4.3, price: "£" },
    { suffix: "Hostel", type: "Hostel", baseTags: ["Social", "Dorm", "Bar"], baseRating: 4.1, price: "£" },
    { suffix: "Luxury Villa", type: "Villa", baseTags: ["Private pool", "Staff", "Ocean view"], baseRating: 4.9, price: "££££" },
  ],
  uae: [
    { suffix: "Luxury Hotel", type: "Hotel", baseTags: ["5-star", "Pool", "Spa"], baseRating: 4.8, price: "££££" },
    { suffix: "Beach Resort", type: "Resort", baseTags: ["Private beach", "All-inclusive", "Water sports"], baseRating: 4.7, price: "££££" },
    { suffix: "Aparthotel", type: "Apartment", baseTags: ["Kitchen", "City view", "Gym"], baseRating: 4.5, price: "£££" },
    { suffix: "Budget Hotel", type: "Hotel", baseTags: ["Clean", "Metro access", "Wi-Fi"], baseRating: 4.2, price: "££" },
  ],
  maldives: [
    { suffix: "Water Villa", type: "Villa", baseTags: ["Overwater", "Private deck", "Snorkeling"], baseRating: 4.9, price: "££££" },
    { suffix: "Beach Bungalow", type: "Bungalow", baseTags: ["Beachfront", "Sunrise view", "Reef access"], baseRating: 4.8, price: "££££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Local island", "Budget", "Diving"], baseRating: 4.4, price: "££" },
    { suffix: "All-Inclusive Resort", type: "Resort", baseTags: ["Spa", "Fine dining", "Excursions"], baseRating: 4.9, price: "£££££" },
  ],
};

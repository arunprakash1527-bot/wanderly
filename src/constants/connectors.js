import { T } from '../styles/tokens';

// ─── Connector Config (API Integration Points) ───
// status: "connected" = live and working, "coming_soon" = planned/not yet wired
export const CONNECTORS = {
  maps: { name: "Google Maps", apis: ["Maps JS", "Places", "Directions", "Geocoding"], icon: "🗺️", status: "connected", color: T.green },
  weather: { name: "OpenWeatherMap", apis: ["Current Weather", "5-Day Forecast", "Weather Alerts"], icon: "🌤️", status: "connected", color: T.blue },
  ev: { name: "Open Charge Map", apis: ["Nearby Chargers", "Route Planning", "Connector Types"], icon: "⚡", status: "connected", color: T.green },
  ai: { name: "Claude AI", apis: ["Chat", "Recommendations", "Itinerary Gen", "Summarisation"], icon: "🤖", status: "connected", color: T.a },
  currency: { name: "Frankfurter (ECB)", apis: ["Exchange Rates", "Currency Conversion"], icon: "💱", status: "connected", color: T.green },
  auth: { name: "Supabase Auth", apis: ["Email/Pass", "Google SSO", "Session Management"], icon: "👤", status: "connected", color: T.pink },
  places: { name: "Google Places", apis: ["Nearby Search", "Place Details", "Photos", "Reviews"], icon: "📍", status: "connected", color: T.coral },
  booking: { name: "Viator / GetYourGuide", apis: ["Activity Search", "Deep Links", "Booking"], icon: "🎟️", status: "connected", color: T.purple },
  accommodation: { name: "Booking.com / Airbnb", apis: ["Search", "Availability", "Property Details"], icon: "🏨", status: "coming_soon", color: T.amber },
  traffic: { name: "TomTom / HERE", apis: ["Traffic Flow", "Incidents", "Route Planning"], icon: "🚗", status: "coming_soon", color: T.red },
  flights: { name: "Skyscanner / Amadeus", apis: ["Flight Search", "Price Alerts", "Check-in"], icon: "✈️", status: "coming_soon", color: T.blue },
  translate: { name: "Google Translate", apis: ["Text Translation", "Language Detection"], icon: "🌐", status: "coming_soon", color: T.purple },
  payments: { name: "Stripe", apis: ["Split Payments", "Subscriptions", "Refunds"], icon: "💳", status: "coming_soon", color: T.purple },
  calendar: { name: "Google Calendar", apis: ["Sync Itinerary", "Reminders", "Invites"], icon: "📅", status: "coming_soon", color: T.blue },
  photos: { name: "Cloudinary / S3", apis: ["Upload", "Transform", "AI Tagging"], icon: "📸", status: "coming_soon", color: T.coral },
  notifications: { name: "Firebase / OneSignal", apis: ["Push", "In-App", "Email"], icon: "🔔", status: "coming_soon", color: T.amber },
  rideshare: { name: "Uber / Bolt", apis: ["Price Estimate", "Request Ride"], icon: "🚕", status: "coming_soon", color: T.t1 },
  restaurants: { name: "OpenTable / TheFork", apis: ["Search", "Deep Links", "Reservation"], icon: "🍽️", status: "connected", color: T.coral },
};

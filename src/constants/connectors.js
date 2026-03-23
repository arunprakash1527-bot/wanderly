import { T } from '../styles/tokens';

// ─── Connector Config (API Integration Points) ───
export const CONNECTORS = {
  maps: { name: "Google Maps Platform", apis: ["Maps JS", "Places", "Directions", "Geocoding", "Distance Matrix"], icon: "🗺️", status: "ready", color: T.green },
  weather: { name: "OpenWeatherMap", apis: ["Current Weather", "5-Day Forecast", "Weather Alerts"], icon: "🌤️", status: "ready", color: T.blue },
  places: { name: "Google Places / Foursquare", apis: ["Nearby Search", "Place Details", "Photos", "Reviews"], icon: "📍", status: "ready", color: T.coral },
  booking: { name: "Viator / GetYourGuide", apis: ["Activity Search", "Availability", "Booking", "Cancellation"], icon: "🎟️", status: "ready", color: T.purple },
  accommodation: { name: "Booking.com / Airbnb", apis: ["Search", "Availability", "Property Details", "Booking"], icon: "🏨", status: "ready", color: T.amber },
  ev: { name: "Open Charge Map", apis: ["Nearby Chargers", "Charger Details", "Availability", "Connector Types"], icon: "⚡", status: "ready", color: T.green },
  traffic: { name: "TomTom / HERE", apis: ["Traffic Flow", "Incidents", "Route Planning", "ETA"], icon: "🚗", status: "ready", color: T.red },
  flights: { name: "Skyscanner / Amadeus", apis: ["Flight Search", "Price Alerts", "Seat Maps", "Check-in"], icon: "✈️", status: "ready", color: T.blue },
  translate: { name: "Google Translate", apis: ["Text Translation", "Language Detection", "Camera Translation"], icon: "🌐", status: "ready", color: T.purple },
  currency: { name: "Wise / XE", apis: ["Exchange Rates", "Currency Conversion", "Rate Alerts"], icon: "💱", status: "ready", color: T.green },
  payments: { name: "Stripe", apis: ["Payment Intent", "Subscriptions", "Split Payments", "Refunds"], icon: "💳", status: "ready", color: T.purple },
  calendar: { name: "Google Calendar", apis: ["Create Event", "Sync Itinerary", "Reminders", "Invites"], icon: "📅", status: "ready", color: T.blue },
  photos: { name: "Cloudinary / S3", apis: ["Upload", "Transform", "AI Tagging", "Video Generation"], icon: "📸", status: "ready", color: T.coral },
  ai: { name: "Claude / GPT", apis: ["Chat", "Recommendations", "Itinerary Gen", "Summarization"], icon: "🤖", status: "ready", color: T.a },
  notifications: { name: "Firebase / OneSignal", apis: ["Push", "In-App", "Email", "SMS"], icon: "🔔", status: "ready", color: T.amber },
  social: { name: "Auth0 / Firebase Auth", apis: ["Google SSO", "Apple SSO", "Email/Pass", "Magic Link"], icon: "👤", status: "ready", color: T.pink },
  rideshare: { name: "Uber / Bolt", apis: ["Price Estimate", "Request Ride", "Trip Status", "Receipt"], icon: "🚕", status: "ready", color: T.t1 },
  restaurants: { name: "OpenTable / TheFork", apis: ["Search", "Availability", "Reservation", "Menu"], icon: "🍽️", status: "ready", color: T.coral },
};

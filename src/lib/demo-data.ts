export type EventItem = {
  id: string; title: string; category: string; description: string; date: string;
  time: string; location: string; lat: number; lng: number; attendees: number;
  capacity: number; host: string; initials: string; interests: string[]; color: string; persisted?: boolean;
};

export const seedEvents: EventItem[] = [
  { id:"e1", title:"Sunset sketch club", category:"Creative", description:"A low-key drawing session on the steps. Bring a sketchbook, or just come hang out and see what everyone is making.", date:"Today", time:"5:30 PM", location:"Lower Field, McGill", lat:45.5041, lng:-73.5772, attendees:8, capacity:14, host:"Maya Chen", initials:"MC", interests:["Art","Outdoors"], color:"#e8a86b" },
  { id:"e2", title:"Beginner bouldering", category:"Sports", description:"First time is welcome. We’ll meet by the front desk and share a few intro passes.", date:"Today", time:"6:15 PM", location:"Allez Up, Griffintown", lat:45.4923, lng:-73.5587, attendees:5, capacity:8, host:"Theo Martin", initials:"TM", interests:["Climbing","Fitness"], color:"#80b8ac" },
  { id:"e3", title:"Coffee & conversation (FR/EN)", category:"Social", description:"Practice a little French or English over a warm drink. No pressure, no lesson plan — just good conversation.", date:"Tomorrow", time:"10:00 AM", location:"Café Olimpico, Mile End", lat:45.5213, lng:-73.5967, attendees:11, capacity:16, host:"Amira Haddad", initials:"AH", interests:["Languages","Coffee"], color:"#c59bc7" },
  { id:"e4", title:"Jean-Talon market walk", category:"Outdoors", description:"Explore the market, pick up something new, and find a spot for a picnic if the weather holds.", date:"Tomorrow", time:"1:00 PM", location:"Jean-Talon Market", lat:45.5358, lng:-73.6146, attendees:6, capacity:10, host:"Leo Park", initials:"LP", interests:["Food","Photography"], color:"#d8bd73" },
  { id:"e5", title:"Study hall: design & tech", category:"Study", description:"A focused co-working block with a stretch break halfway through. Bring whatever you’re working on.", date:"Wed, Nov 25", time:"3:00 PM", location:"McLennan Library", lat:45.5033, lng:-73.5742, attendees:9, capacity:20, host:"Sam Rivera", initials:"SR", interests:["Design","Technology"], color:"#86a7d8" },
];

export const interestOptions = ["Art & design", "Live music", "Outdoors", "Food & coffee", "Fitness", "Books", "Technology", "Languages", "Photography", "Volunteering"];

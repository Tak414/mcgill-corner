"use client";

import { useEffect, useMemo, useState } from "react";
import { EventItem, seedEvents } from "@/lib/demo-data";
import { InteractiveMap } from "@/components/interactive-map";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { id:"explore", label:"Explore", icon:"⌖" },
  { id:"discover", label:"Discover", icon:"◫" },
  { id:"community", label:"Community", icon:"◎" },
  { id:"profile", label:"Profile", icon:"◉" },
];
const filters = ["All", "Social", "Creative", "Outdoors", "Sports", "Study"];

function Icon({ children }: { children: React.ReactNode }) { return <span className="icon" aria-hidden="true">{children}</span>; }

export default function Home() {
  const [active, setActive] = useState("explore");
  const [filter, setFilter] = useState("All");
  const [events, setEvents] = useState(seedEvents);
  const [rsvps, setRsvps] = useState<string[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [modal, setModal] = useState<"create"|"welcome"|"signin"|null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [locating, setLocating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Social");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [joinedOnboard, setJoinedOnboard] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState("YOUR CAMPUS TODAY");
  const [time, setTime] = useState("18:00");
  const [capacity, setCapacity] = useState("12");

  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem("unlock:events");
      const storedRsvps = localStorage.getItem("unlock:rsvps");
      if (storedEvents) setEvents(JSON.parse(storedEvents) as EventItem[]);
      if (storedRsvps) setRsvps(JSON.parse(storedRsvps) as string[]);
    } catch { /* Invalid demo cache is ignored; the seeded fixtures are safe defaults. */ }
    setDemoLoaded(true);
    setTodayLabel(new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase());
    const client = supabase;
    if (!client) return;
    let mounted = true;
    const loadSupabaseData = async () => {
      const { data: authData } = await client.auth.getUser();
      if (!mounted) return;
      setUserId(authData.user?.id ?? null);
      const { data: rows } = await client.from("events").select("id,title,description,category,starts_at,location_label,location,capacity,organizer_id").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(40);
      if (!mounted || !rows?.length) return;
      const ids = rows.map((row) => row.id);
      const [{ data: people }, { data: counts }, { data: myRsvps }] = await Promise.all([
        client.from("profiles").select("id,username").in("id", rows.map((row) => row.organizer_id)),
        client.rpc("get_event_attendee_counts", { p_event_ids: ids }),
        authData.user ? client.from("event_attendees").select("event_id").eq("profile_id", authData.user.id).in("status", ["going", "attended"]) : Promise.resolve({ data: [] as { event_id: string }[] }),
      ]);
      if (!mounted) return;
      const hosts = new Map((people ?? []).map((person) => [person.id, person.username]));
      const attendeeCounts = new Map<string, number>((counts ?? []).map((item: { event_id: string; going_count: number | string }) => [item.event_id, Number(item.going_count)]));
      const mapped: EventItem[] = rows.map((row, index) => {
        let lat = 45.5041; let lng = -73.5772;
        if (typeof row.location === "string") { const point = row.location.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i); if (point) { lng = Number(point[1]); lat = Number(point[2]); } }
        else if (row.location && typeof row.location === "object" && "coordinates" in row.location) { const coords = (row.location as { coordinates: number[] }).coordinates; if (coords.length >= 2) [lng, lat] = coords; }
        const starts = new Date(row.starts_at);
        const host = hosts.get(row.organizer_id) ?? "Campus host";
        return { id: row.id, persisted: true, title: row.title, category: row.category, description: row.description, date: starts.toLocaleDateString("en-CA", { month:"short", day:"numeric" }), time: starts.toLocaleTimeString("en-CA", { hour:"numeric", minute:"2-digit" }), location: row.location_label, lat, lng, attendees: attendeeCounts.get(row.id) ?? 0, capacity: row.capacity, host, initials: host.slice(0,2).toUpperCase(), interests: [row.category], color: ["#e8a86b","#80b8ac","#c59bc7","#d8bd73","#86a7d8"][index % 5] };
      });
      setEvents((current) => [...mapped, ...current.filter((event) => !ids.includes(event.id))]);
      if (myRsvps) setRsvps((current) => [...new Set([...current, ...myRsvps.map((item) => item.event_id)])]);
    };
    void loadSupabaseData();
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => { if (mounted) setUserId(session?.user.id ?? null); });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!demoLoaded) return;
    localStorage.setItem("unlock:events", JSON.stringify(events));
    localStorage.setItem("unlock:rsvps", JSON.stringify(rsvps));
  }, [demoLoaded, events, rsvps]);

  const visibleEvents = useMemo(() => events.filter((event) =>
    (filter === "All" || event.category === filter) &&
    `${event.title} ${event.location} ${event.category}`.toLowerCase().includes(search.toLowerCase())
  ), [events, filter, search]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const joinEvent = async (event: EventItem) => {
    const joining = !rsvps.includes(event.id);
    if (userId && supabase && event.persisted) {
      if (joining) {
        const { error } = await supabase.from("event_attendees").insert({ event_id: event.id, profile_id: userId, status: "going", social_mode: "friend" });
        if (error) { notify(error.message); return; }
      } else {
        const { error } = await supabase.from("event_attendees").delete().eq("event_id", event.id).eq("profile_id", userId);
        if (error) { notify(error.message); return; }
      }
    }
    setRsvps(joining ? [...rsvps, event.id] : rsvps.filter((id) => id !== event.id));
    setEvents(events.map((item) => item.id === event.id ? { ...item, attendees: Math.max(0, item.attendees + (joining ? 1 : -1)) } : item));
    notify(joining ? "You’re on the list · see you there" : "RSVP cancelled");
  };
  const createEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const startsAt = new Date(`${date}T${time}`);
    if (startsAt <= new Date()) { notify("Choose a future date and time"); return; }
    let id = crypto.randomUUID();
    let persisted = false;
    if (userId && supabase) {
      const { data: university } = await supabase.from("universities").select("id").eq("slug", "mcgill").maybeSingle();
      if (!university) { notify("McGill campus setup is missing in Supabase"); return; }
      const { data: row, error } = await supabase.from("events").insert({ organizer_id: userId, university_id: university.id, title, category, description: description || "A new campus meetup. Come by and say hi.", starts_at: startsAt.toISOString(), location_label: location || "McGill campus", location: "SRID=4326;POINT(-73.579 45.51)", capacity: Number(capacity) }).select("id").single();
      if (error || !row) { notify(error?.message || "Could not publish event"); return; }
      id = row.id; persisted = true;
    }
    const item: EventItem = { id, persisted, title, category, description: description || "A new campus meetup. Come by and say hi.", date: startsAt.toLocaleDateString("en-CA", { month:"short", day:"numeric" }), time: startsAt.toLocaleTimeString("en-CA", { hour:"numeric", minute:"2-digit" }), location: location || "McGill campus", lat:45.5041, lng:-73.5772, attendees:1, capacity:Number(capacity), host:"You", initials:"YO", interests:[category], color:"#8ba8e8" };
    setEvents([item, ...events]); setRsvps([...rsvps, item.id]); setModal(null); setTitle(""); setDescription(""); setLocation(""); setDate(""); setActive("discover"); notify("Your event is live");
  };
  const requestLocation = () => {
    if (!navigator.geolocation) { notify("Location isn’t available in this browser"); return; }
    setLocating(true); navigator.geolocation.getCurrentPosition((position) => { setLocating(false); if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) { window.dispatchEvent(new CustomEvent("unlock:locate", { detail: { longitude: position.coords.longitude, latitude: position.coords.latitude } })); notify("Map centred near you"); } else notify("Location permission granted · add a Mapbox token to centre the map"); }, () => { setLocating(false); notify("Location permission wasn’t granted"); }, { timeout:8000 });
  };
  const sendSignInLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) { notify("Add Supabase keys to .env.local to enable sign in"); return; }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setAuthBusy(false);
    if (error) notify(error.message); else { setModal(null); notify("Check your email for a sign-in link"); }
  };

  const sectionTitle = active === "explore" ? "Explore nearby" : active === "discover" ? "Find your people" : active === "community" ? "Your community" : "Your profile";
  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={(e)=>{e.preventDefault();setActive("explore")}}><span className="brand-mark">u</span><span>unlock<span className="brand-dot">.</span></span></a>
      <div className="campus-pill"><span className="campus-dot"/> McGill University <span className="chevron">⌄</span></div>
      <div className="nav-label">YOUR SPACE</div>
      <nav className="side-nav">{navItems.map(item=><button key={item.id} className={`nav-item ${active===item.id?"active":""}`} onClick={()=>setActive(item.id)}><Icon>{item.icon}</Icon>{item.label}{item.id==="discover"&&<span className="nav-count">5</span>}</button>)}</nav>
      <div className="side-spacer"/>
      <div className="sidebar-progress"><div className="progress-top"><span>EXPLORATION</span><span>32%</span></div><div className="progress-track"><span style={{width:"32%"}}/></div><div className="progress-caption">3 of 9 neighbourhoods found</div><button className="text-button" onClick={()=>notify("Next up: Mile End · 2 km away")}>View your map <span>↗</span></button></div>
      <button className="user-chip" onClick={()=>setActive("profile")}><span className="avatar avatar-you">JL</span><span className="user-meta"><b>Jamie Lee</b><small>Level 4 · Explorer</small></span><span className="more">···</span></button>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">u</span> unlock<span className="brand-dot">.</span></div><div className="crumb"><span>McGill University</span><span className="crumb-sep">/</span><b>{navItems.find(n=>n.id===active)?.label}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={()=>notify("You’re all caught up")}>♧<i className="notification-dot"/></button><button className="top-avatar" onClick={()=>setActive("profile")}>JL</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">{todayLabel} <span className="eyebrow-line"/></div><h1>{sectionTitle}<span className="heading-period">.</span></h1><p>{active === "explore" ? "A little closer to somewhere new." : active === "discover" ? "Good things happen when you show up." : active === "community" ? "The people making campus feel smaller." : "A record of places and people you’ve found."}</p></div><button className="primary-button" onClick={()=>setModal("create")}><span>＋</span> Host something</button></div>
        {active === "explore" && <div className="map-layout">
          <div className="map-panel">
            <div className="map-top"><div className="map-search"><span>⌕</span><input aria-label="Search map" placeholder="Search places or events" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="map-filter" onClick={()=>setShowList(!showList)}><span>☷</span> {showList?"Map":"List"}</button></div>
            <div className="map-canvas">
              <InteractiveMap events={visibleEvents} onSelect={setSelected}/>
              <div className="map-grid"/><div className="map-water water-one"/><div className="map-water water-two"/>
              <div className="map-district district-mcgill"><b>McGILL GHETTO</b><span>DISCOVERED</span></div><div className="map-district district-plateau"><b>PLATEAU-MONT-ROYAL</b><span>PARTIALLY EXPLORED</span></div><div className="map-district district-mile"><b>MILE END</b><span>UNDISCOVERED</span></div><div className="map-district district-downtown"><b>DOWNTOWN</b><span>DISCOVERED</span></div>
              <div className="road road-main"/><div className="road road-cross"/><div className="road road-diag"/><div className="road road-diag two"/>
              <div className="place-label label-campus">◈ &nbsp;McGill University</div><div className="place-label label-park">◇ &nbsp;Parc du Mont-Royal</div><div className="place-label label-street">Rue Sherbrooke O</div>
              {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !showList && visibleEvents.slice(0,5).map((event,index)=><button key={event.id} className={`map-pin pin-${index}`} style={{"--pin":event.color} as React.CSSProperties} onClick={()=>setSelected(event)} aria-label={`Open ${event.title}`}><span className="pin-core">{index===0?"✳":index===1?"⌁":index===2?"◌":index===3?"↟":"▦"}</span><span className="pin-label">{event.title}</span></button>)}
              <div className="you-marker"><span/><i/></div>
              {showList && <div className="map-list">{visibleEvents.map(event=><button key={event.id} onClick={()=>setSelected(event)}><span className="mini-dot" style={{background:event.color}}/><span><b>{event.title}</b><small>{event.date} · {event.location}</small></span><span>›</span></button>)}</div>}
              <div className="map-controls"><button onClick={requestLocation} aria-label="Centre map on me">{locating?"…":"◎"}</button><button onClick={()=>notify("Zoom in to explore the neighbourhoods")}>＋</button><button onClick={()=>notify("Zoom out")}>−</button></div><div className="map-credit">Map data · OpenStreetMap contributors</div>
            </div>
            <div className="map-legend"><span><i className="legend-event"/> Events near you</span><span><i className="legend-found"/> Explored</span><span><i className="legend-fog"/> Still to find</span><button onClick={()=>notify("Your map progress is up to date")}>How exploration works <span>↗</span></button></div>
          </div>
          <aside className="right-rail"><div className="rail-heading"><div><div className="eyebrow">GOOD THINGS AROUND YOU</div><h2>Happening soon</h2></div><button className="arrow-link" onClick={()=>setActive("discover")}>See all <span>→</span></button></div>
            <div className="event-stack">{visibleEvents.slice(0,3).map((event,index)=><button className="event-card" key={event.id} onClick={()=>setSelected(event)}><div className="event-art" style={{"--art":event.color} as React.CSSProperties}><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-glyph">{["✳","⌁","◌"][index%3]}</span><span className="event-date-chip">{event.date.toUpperCase()}</span></div><div className="event-card-body"><div className="event-category">{event.category.toUpperCase()} <span>·</span> {event.time}</div><h3>{event.title}</h3><div className="event-location">⌖ &nbsp;{event.location}</div><div className="event-card-foot"><div className="attendee-stack"><span>MC</span><span>LP</span><span>+{event.attendees}</span></div><span>{event.attendees}/{event.capacity} going</span></div></div></button>)}</div>
            <div className="quest-card"><div className="quest-icon">✧</div><div className="quest-copy"><div className="eyebrow">WEEKLY QUEST <span className="xp-tag">+75 XP</span></div><b>Try something new</b><p>Join an event in a neighbourhood you haven’t explored.</p><div className="quest-progress"><span style={{width:"38%"}}/></div><small>1 of 3 steps complete</small></div><button className="quest-arrow" onClick={()=>setActive("discover")}>↗</button></div>
          </aside>
        </div>}
        {active === "discover" && <section className="discover-view"><div className="discover-toolbar"><div className="filter-row">{filters.map(f=><button key={f} className={`filter-chip ${filter===f?"selected":""}`} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search-field"><span>⌕</span><input placeholder="Search events" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="discover-grid">{visibleEvents.map((event,index)=><button className="event-card discover-card" key={event.id} onClick={()=>setSelected(event)}><div className="event-art" style={{"--art":event.color} as React.CSSProperties}><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-glyph">{["✳","⌁","◌","↟","▦"][index%5]}</span><span className="event-date-chip">{event.date.toUpperCase()}</span></div><div className="event-card-body"><div className="event-category">{event.category.toUpperCase()} <span>·</span> {event.time}</div><h3>{event.title}</h3><p className="event-description">{event.description}</p><div className="event-location">⌖ &nbsp;{event.location}</div><div className="event-card-foot"><div className="host-line"><span className="avatar tiny-avatar">{event.initials}</span><span>Hosted by {event.host}</span></div><span>{event.attendees}/{event.capacity}</span></div></div></button>)}</div>{visibleEvents.length===0&&<div className="empty-state"><span>◌</span><h3>No events found</h3><p>Try another filter, or host something for your community.</p><button className="primary-button" onClick={()=>setModal("create")}>Host an event</button></div>}</section>}
        {active === "community" && <section className="community-view"><div className="community-banner"><div><div className="eyebrow">BETTER TOGETHER</div><h2>Small acts make a<br/>campus feel like home.</h2><p>XP celebrates showing up, making space, and helping people connect.</p></div><div className="banner-emblem">✳</div></div><div className="community-columns"><div className="panel-card"><div className="panel-title"><div><div className="eyebrow">THIS WEEK</div><h2>Community contributors</h2></div><button className="period-select" onClick={()=>notify("Showing this week")}>This week⌄</button></div>{[["MC","Maya Chen","Hosted a sketch club","420 XP"],["LP","Leo Park","Welcomed 3 newcomers","385 XP"],["AH","Amira Haddad","Joined 4 events","340 XP"],["TM","Theo Martin","Discovered 2 areas","295 XP"],["JL","Jamie Lee","Joined a study session","260 XP"]].map((row,i)=><div className={`leader-row ${i===4?"you-row":""}`} key={row[0]}><span className="rank">0{i+1}</span><span className={`avatar leader-avatar avatar-${i}`}>{row[0]}</span><span className="leader-person"><b>{row[1]}{i===4&&<small>YOU</small>}</b><small>{row[2]}</small></span><span className="leader-xp">{row[3]}</span></div>)}</div><div className="panel-card progress-card"><div className="eyebrow">YOUR JOURNEY</div><h2>Level 4 <span>Explorer</span></h2><div className="level-line"><span/><span/></div><p><b>260 XP</b> <span>· 240 XP to Level 5</span></p><div className="stat-grid"><div><b>03</b><small>Areas found</small></div><div><b>07</b><small>Events joined</small></div><div><b>02</b><small>People welcomed</small></div></div><button className="text-button" onClick={()=>setActive("explore")}>See exploration map <span>→</span></button></div></div></section>}
        {active === "profile" && <section className="profile-view"><div className="profile-header"><div className="profile-avatar">JL<span>✦</span></div><div className="profile-info"><div className="eyebrow">YOUR PROFILE <span className="profile-level">LEVEL 4</span></div><h2>Jamie Lee</h2><p>McGill University · Montreal</p><div className="profile-bio">Here for good conversations, long walks, and finding the best dumplings in the city.</div><div className="interest-list">{["Art & design","Outdoors","Food & coffee","Live music"].map(x=><span key={x}>{x}</span>)}</div></div><button className="secondary-button" onClick={()=>setModal("signin")}>Sign in / create account</button></div><div className="profile-columns"><div className="panel-card"><div className="eyebrow">YOUR ACTIVITY</div><h2>Places & moments</h2><div className="activity-item"><span className="activity-symbol">⌖</span><span><b>Found the McGill Ghetto</b><small>Explored · +50 XP</small></span><time>2d ago</time></div><div className="activity-item"><span className="activity-symbol">◎</span><span><b>Joined a campus study hall</b><small>Showed up · +100 XP</small></span><time>4d ago</time></div><div className="activity-item"><span className="activity-symbol">✧</span><span><b>Welcomed Alex to their first event</b><small>Community · +30 XP</small></span><time>1w ago</time></div></div><div className="panel-card privacy-card"><div className="eyebrow">YOUR COMFORT, YOUR CALL</div><h2>Discovery settings</h2><div className="setting-row"><span><b>Friend mode</b><small>Open to meeting new friends</small></span><button className="toggle on" onClick={e=>{e.currentTarget.classList.toggle("on");notify("Friend mode updated")}}><i/></button></div><div className="setting-row"><span><b>Dating mode</b><small>Only visible to other opted-in people</small></span><button className="toggle" onClick={e=>{e.currentTarget.classList.toggle("on");notify("Dating preference updated")}}><i/></button></div><div className="setting-row"><span><b>Show me at events</b><small>Let attendees see your profile</small></span><button className="toggle on" onClick={e=>{e.currentTarget.classList.toggle("on");notify("Visibility updated")}}><i/></button></div><div className="privacy-note">⌑ &nbsp; Your live location is never shown to other people.</div></div></div></section>}
      </div>
      <nav className="mobile-nav">{navItems.map(item=><button key={item.id} className={active===item.id?"selected":""} onClick={()=>setActive(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </section>
    {selected && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="event-modal"><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className="modal-art" style={{"--art":selected.color} as React.CSSProperties}><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-glyph">✳</span></div><div className="modal-content"><div className="event-category">{selected.category.toUpperCase()} <span>·</span> {selected.date.toUpperCase()}</div><h2>{selected.title}</h2><p>{selected.description}</p><div className="detail-line">◷ &nbsp;{selected.date} · {selected.time}</div><div className="detail-line">⌖ &nbsp;{selected.location}</div><div className="host-detail"><span className="avatar">{selected.initials}</span><span><small>HOSTED BY</small><b>{selected.host}</b></span><span className="shared-interests">{selected.interests[0]} in common</span></div><div className="modal-attendees"><b>{selected.attendees} people are going</b><span>Friend mode is the default · meet at the event</span></div><button className={`primary-button wide-button ${rsvps.includes(selected.id)?"joined-button":""}`} onClick={()=>joinEvent(selected)}>{rsvps.includes(selected.id)?"✓  You’re going · cancel RSVP":"I’m interested · RSVP"}</button><small className="privacy-caption">Your profile is only shared with event attendees based on your settings.</small></div></section></div>}
    {modal === "create" && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="create-modal"><button className="modal-close" onClick={()=>setModal(null)}>×</button><div className="eyebrow">MAKE A LITTLE SPACE FOR PEOPLE</div><h2>Host something<span className="heading-period">.</span></h2><p>It can be as simple as coffee, a walk, or a study break.</p><form onSubmit={createEvent}><label>Event name<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What are we doing?"/></label><div className="form-split"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{filters.slice(1).map(f=><option key={f}>{f}</option>)}</select></label><label>Date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="form-split"><label>Time<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Capacity<input required type="number" min="2" max="500" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label></div><label>Where<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="A place or campus landmark"/></label><label>A little more about it<textarea maxLength={300} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What should people know?" rows={3}/></label><button className="primary-button wide-button" type="submit">Publish event <span>→</span></button><small className="form-note">Hosted events are public to your campus community.</small></form></section></div>}
    {modal === "signin" && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="create-modal welcome-modal"><button className="modal-close" onClick={()=>setModal(null)}>×</button><div className="welcome-symbol">u</div><div className="eyebrow">YOUR CAMPUS, YOUR PEOPLE</div><h2>Come on in<span className="heading-period">.</span></h2><p>We’ll send you a secure sign-in link. No password to remember.</p><form onSubmit={sendSignInLink}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@university.ca"/></label><button className="primary-button wide-button" type="submit" disabled={authBusy}>{authBusy?"Sending…":"Email me a sign-in link"}</button></form><button className="text-button" onClick={()=>{setModal(null);notify("You’re exploring in demo mode")}}>Continue with demo data <span>→</span></button><small className="form-note">Friendship comes first here. Dating is always opt in.</small></section></div>}
    {modal === "welcome" && <div className="modal-backdrop"><section className="create-modal welcome-modal"><div className="welcome-symbol">u</div><div className="eyebrow">WELCOME TO YOUR CAMPUS</div><h2>Find your next thing<span className="heading-period">.</span></h2><p>Tell us what you’re into. We’ll help you find events and people who feel like your kind of people.</p><button className="primary-button wide-button" onClick={()=>{setModal(null);setJoinedOnboard(true);notify("Welcome in · your map is ready")}}>Let’s explore <span>→</span></button><small className="form-note">Friendship comes first here. Dating is always opt in.</small></section></div>}
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
    <span className="sr-only">{joinedOnboard?"Onboarding completed":""}</span>
  </main>;
}

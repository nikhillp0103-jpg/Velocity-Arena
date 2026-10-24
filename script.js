const activities=[
{name:"Box Cricket",icon:"🏏",desc:"Turf cricket for teams",price:799,venues:18,img:"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=85"},
{name:"Gaming Café",icon:"🎮",desc:"PC, console & esports",price:149,venues:24,img:"https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85"},
{name:"Bowling",icon:"🎳",desc:"Lanes, strikes & fun",price:299,venues:11,img:"https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85"},
{name:"Go-Karting",icon:"🏎️",desc:"Race, drift & compete",price:499,venues:7,img:"https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=85"},
{name:"Badminton",icon:"🏸",desc:"Courts for casual play",price:199,venues:15,img:"https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=85"},
{name:"Football Turf",icon:"⚽",desc:"5v5 & 7v7 turfs",price:899,venues:13,img:"https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85"},
{name:"Pool / Snooker",icon:"🎱",desc:"Tables & cue sports",price:199,venues:10,img:"https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=900&q=85"},
{name:"VR Gaming",icon:"🥽",desc:"Immersive VR worlds",price:399,venues:8,img:"https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=900&q=85"},
{name:"Basketball",icon:"🏀",desc:"Indoor & outdoor courts",price:249,venues:6,img:"https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=85"},
{name:"Laser Tag",icon:"🔫",desc:"Squad battles & missions",price:349,venues:5,img:"https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=85"}
];

let favorites=readStoredJson("va_favorites",[]);
let venues=[],cities=[],bookings=[],currentUser=null,currentVenue=null,currentSlot=null,currentDate=new Date(),discount=0;
let currentCity="ahmedabad",quickSearchApplied=false,quickSearchText="",searchAvailableVenueIds=null;
try{currentCity=localStorage.getItem("va_city")||"ahmedabad"}catch{}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const toast=(msg)=>{const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2600)};
const openModal=(html)=>{$("#modalContent").innerHTML=html;$("#modalBackdrop").classList.add("open")};
const closeModal=()=>$("#modalBackdrop").classList.remove("open");
function readStoredJson(key,fallback){
  try{
    const stored=localStorage.getItem(key);
    if(!stored)return fallback;
    const value=JSON.parse(stored);
    return Array.isArray(value)?value:fallback;
  }catch{return fallback}
}
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function apiErrorMessage(result,status){
  const error=result&&typeof result==="object"?result.error:null;
  if(typeof error==="string"&&error.trim())return error.trim();
  if(error&&typeof error==="object"){
    if(typeof error.message==="string"&&error.message.trim())return error.message.trim();
    if(typeof error.code==="string"&&error.code.trim()){
      if(error.code==="FUNCTION_INVOCATION_FAILED"||error.code==="FUNCTION_INVOCATION_TIMEOUT"){
        return "The booking service is warming up. Tap Retry in a moment.";
      }
      return `Server error (${error.code}). Please try again.`;
    }
  }
  if(status>=500)return "The booking service is temporarily unavailable. Please try again.";
  return `Request failed (${status}).`;
}
async function api(path,options={}){
  let response;
  try{
    response=await fetch(path,{credentials:"same-origin",...options,headers:{"Content-Type":"application/json","Accept":"application/json",...(options.headers||{})}});
  }catch{
    throw new Error("Cannot reach the app server. Double-click start.bat, then open http://localhost:3000.");
  }
  const responseText=await response.text();
  const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("application/json")){
    if(response.status===404||response.status===405||/^\s*</.test(responseText)){
      throw new Error("This page is running on a static preview, not the app server. Double-click start.bat and open http://localhost:3000.");
    }
    if(response.status>=500)throw new Error("The booking service is temporarily unavailable. Please try again.");
    throw new Error(`The app server returned an unexpected response (${response.status}). Start the app with start.bat and retry.`);
  }
  if(!responseText.trim())throw new Error(`The app server returned an empty response (${response.status}). Restart it with start.bat and retry.`);
  let result;
  try{result=JSON.parse(responseText)}
  catch{throw new Error(`The app server returned invalid JSON (${response.status}). Restart it with start.bat and retry.`)}
  if(!response.ok)throw new Error(apiErrorMessage(result,response.status));
  if(!result||typeof result!=="object")throw new Error("The app server returned an invalid response. Restart it with start.bat and retry.");
  return result;
}
function loginRedirect(destination){
  const next=destination||window.location.pathname+window.location.hash;
  window.location.assign(`/auth.html?next=${encodeURIComponent(next)}`);
}
function dateValue(date){
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}
function displayDate(value){
  const date=new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function updateAccountButton(){
  const button=$("#loginBtn");
  if(button)button.textContent=currentUser?`Hi, ${currentUser.name.split(" ")[0]}`:"Login / Sign Up";
}
function showServerNotice(error){
  const notice=$("#serverNotice");
  if(!notice)return;
  notice.hidden=false;
  notice.title=error.message;
  notice.classList.toggle("server-notice-warning",!error.message.includes("static preview"));
}
function cityName(){
  return cities.find(city=>city.slug===currentCity)?.name||"Ahmedabad";
}
function updateCityLabels(){
  const selected=cityName();
  $("#locationBtn").textContent=`⌖ ${selected}`;
  $("#searchLocation span").textContent=selected;
  $("#playersCity").textContent=selected;
  $("#searchCityCaption").textContent=selected;
}
function venueTuple(venue){
  return [venue.name,venue.activity,venue.rating,venue.reviewCount,venue.distanceKm,venue.price,venue.environment,venue.maxPlayers,Boolean(venue.isOpen),venue.imageUrl,venue.id,venue.city];
}
async function loadCityData(citySlug=currentCity){
  const [cityResponse,venueResponse]=await Promise.all([
    api("/api/cities"),
    api(`/api/venues?city=${encodeURIComponent(citySlug)}`)
  ]);
  if(!Array.isArray(cityResponse.cities)||!Array.isArray(venueResponse.venues))throw new Error("The local city listings could not be loaded.");
  cities=cityResponse.cities;
  if(!cities.some(city=>city.slug===citySlug))throw new Error("That city is not available in the local listings.");
  currentCity=citySlug;
  quickSearchApplied=false;
  quickSearchText="";
  searchAvailableVenueIds=null;
  venues=venueResponse.venues.map(venueTuple);
  try{
    if(citySlug==="ahmedabad"&&localStorage.getItem("va_favorites_version")!=="2"){
      favorites=favorites.map(index=>venues[index]?.[10]).filter(Number.isSafeInteger);
      localStorage.setItem("va_favorites",JSON.stringify(favorites));
      localStorage.setItem("va_favorites_version","2");
    }
  }catch{}
  try{localStorage.setItem("va_city",currentCity)}catch{}
  updateCityLabels();
  renderVenues();
  await loadMatches();
}
async function chooseCity(citySlug){
  if(citySlug===currentCity){closeModal();return}
  const confirmation=$("#cityChooseButton");
  if(confirmation){confirmation.disabled=true;confirmation.textContent="Loading city…"}
  try{await loadCityData(citySlug);closeModal();toast(`Showing locally saved activities in ${cityName()}`)}
  catch(error){if(confirmation){confirmation.disabled=false;confirmation.textContent="Browse this city"}toast(error.message)}
}
function openCityPicker(){
  const options=cities.map(city=>`<option value="${city.slug}" ${city.slug===currentCity?"selected":""}>${escapeHtml(city.name)} — ${escapeHtml(city.state)}</option>`).join("");
  openModal(`<div class="modal-sub">LOCAL CITY LISTINGS</div><h2>Choose your city</h2><p class="modal-sub">Browse the venue and player listings saved for your city.</p><label class="modal-label" for="cityPickerSelect">CITY</label><select class="modal-input" id="cityPickerSelect">${options}</select><p class="booking-demo-note">Listings are locally seeded examples, not verified live venue inventory.</p><button class="primary-btn full" id="cityChooseButton">Browse this city</button>`);
  $("#cityChooseButton").addEventListener("click",()=>chooseCity($("#cityPickerSelect").value));
}
async function loadAccount(){
  const result=await api("/api/auth/me");
  currentUser=result.user;
  updateAccountButton();
}
async function resumePendingBooking(){
  if(new URLSearchParams(window.location.search).get("resumeBooking")!=="1")return;
  const cleanUrl=new URL(window.location.href);
  cleanUrl.searchParams.delete("resumeBooking");
  window.history.replaceState(null,"",`${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  let pending=null;
  try{
    pending=JSON.parse(sessionStorage.getItem("va_pending_booking")||"null");
    sessionStorage.removeItem("va_pending_booking");
  }catch{
    try{sessionStorage.removeItem("va_pending_booking")}catch{}
  }
  if(!pending||!currentUser){toast("Log in again and choose your booking slot to continue.");return}
  if(!Number.isSafeInteger(pending.venueId)||typeof pending.city!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(pending.date)||typeof pending.time!=="string"){
    toast("Your saved booking slot expired. Please choose a venue and slot again.");return;
  }
  try{
    if(pending.city!==currentCity)await loadCityData(pending.city);
    $("#searchDate").value=pending.date;
    const slots=await openBooking(pending.venueId);
    const selected=slots.find(slot=>slot.time===pending.time&&slot.available);
    if(!selected){toast("That slot is no longer available. Please choose another time.");return}
    const playerSelect=$("#bookingPlayers");
    if(playerSelect&&[...playerSelect.options].some(option=>Number(option.value)===pending.players)){
      playerSelect.value=String(pending.players);updateBookingTotal();
    }
    const slotButton=$$(".slot").find(button=>button.textContent.startsWith(pending.time));
    if(slotButton)selectSlot(slotButton,pending.time);
    continueBooking();
  }catch(error){toast(`Couldn't restore your booking: ${error.message}`)}
}

function renderActivities(){
  $("#activityGrid").innerHTML=activities.slice(0,8).map(a=>`
  <article class="activity-card">
    <div class="activity-image" style="background-image:url('${a.img}')"></div>
    <div class="activity-content"><div class="activity-icon">${a.icon}</div><h3>${a.name}</h3><p>${a.desc}</p>
    <div class="activity-bottom"><b>From ₹${a.price}</b><button onclick="filterActivity('${a.name}')">Explore →</button></div></div>
  </article>`).join("");
}
function populateTypeFilter(){
  $("#typeFilter").innerHTML='<option value="">All types</option>'+[...new Set(activities.map(x=>x.name))].map(x=>`<option>${x}</option>`).join("");
}
function renderVenues(){
  let arr=venues.map(v=>({v,i:v[10]}));
  const chip=$(".chip.active")?.dataset.filter||"all";
  const type=$("#typeFilter").value, rating=+$("#ratingFilter").value, players=+$("#playerFilter").value;
  arr=arr.filter(({v})=>{
    if(chip==="indoor"&&v[6]!=="indoor")return false;
    if(chip==="outdoor"&&v[6]!=="outdoor")return false;
    if(chip==="open"&&!v[8])return false;
    if(chip==="under500"&&v[5]>=500)return false;
    if(type&&v[1]!==type)return false;
    if(rating&&v[2]<rating)return false;
    if(players&&v[7]<players)return false;
    if(quickSearchApplied&&(Number($("#searchPlayers").value)>v[7]||!searchAvailableVenueIds?.includes(v[10])))return false;
    if(quickSearchText&&!`${v[0]} ${v[1]} ${v[11]}`.toLocaleLowerCase("en-IN").includes(quickSearchText))return false;
    if($("#todayFilter").checked&&!v[8])return false;
    if($("#openFilter").checked&&!v[8])return false;
    if($("#indoorFilter").checked&&v[6]!=="indoor")return false;
    if($("#outdoorFilter").checked&&v[6]!=="outdoor")return false;
    return true;
  });
  const sort=$("#sortSelect").value;
  if(sort==="low")arr.sort((a,b)=>a.v[5]-b.v[5]);
  if(sort==="high")arr.sort((a,b)=>b.v[5]-a.v[5]);
  if(sort==="near")arr.sort((a,b)=>a.v[4]-b.v[4]);
  if(sort==="rating")arr.sort((a,b)=>b.v[2]-a.v[2]);
  $("#venueGrid").innerHTML=arr.length?arr.map(({v,i})=>`
    <article class="venue-card">
      <div class="venue-img" style="background-image:url('${v[9]}')">
        <button class="heart ${favorites.includes(i)?"active":""}" onclick="toggleFavorite(${i},this)">♥</button>
        <span class="status ${v[8]?"open":"closed"}">${v[8]?"● Open Now":"● Closed"}</span>
      </div>
      <div class="venue-body"><div class="venue-title"><h3>${escapeHtml(v[0])}</h3><span class="rating">★ ${v[2]}</span></div>
      <div class="venue-type">${escapeHtml(v[1])}</div><div class="venue-meta"><span>↗ ${v[4]} km away · ${escapeHtml(v[11])}</span><span>Up to ${v[7]} players</span></div>
      <div class="venue-price">From <b>₹${v[5]}</b> <span>/ hour</span></div>
      <button class="primary-btn full" style="margin-top:13px;min-height:40px" onclick="openBooking(${i})">View Slots</button></div>
    </article>`).join(""):`<div class="empty-state"><h3>Oops! No activities found.</h3><p>Try changing your filters.</p><button class="secondary-btn" onclick="clearFilters()">Clear Filters</button></div>`;
}
function toggleFavorite(i,btn){
  favorites=favorites.includes(i)?favorites.filter(x=>x!==i):[...favorites,i];
  try{localStorage.setItem("va_favorites",JSON.stringify(favorites))}catch{toast("This browser could not save your favorites")}
  btn.classList.toggle("active");
  toast(favorites.includes(i)?"Added to favorites":"Removed from favorites");
}
function filterActivity(name){
  quickSearchApplied=false;quickSearchText="";searchAvailableVenueIds=null;
  $("#typeFilter").value=name; renderVenues(); $("#venues").scrollIntoView({behavior:"smooth"}); toast(`Showing ${name} venues in ${cityName()}`);
}
function clearFilters(){
  quickSearchApplied=false;quickSearchText="";searchAvailableVenueIds=null;
  $(".chip.active")?.classList.remove("active");document.querySelector('[data-filter="all"]').classList.add("active");
  $("#typeFilter").value="";$("#searchActivity").value="";$("#ratingFilter").value="0";$("#playerFilter").value="0";
  ["todayFilter","openFilter","indoorFilter","outdoorFilter"].forEach(x=>$("#"+x).checked=false);renderVenues();
}
function openBooking(i){
  currentVenue=i;currentSlot=null;discount=0;
  currentDate=new Date();
  const selectedSearchDate=$("#searchDate").value;
  if(selectedSearchDate){const parsedDate=new Date(`${selectedSearchDate}T12:00:00`);if(!Number.isNaN(parsedDate.getTime()))currentDate=parsedDate}
  const v=venues.find(venue=>venue[10]===i);
  if(!v){toast("That venue is no longer available. Refresh the listings and try again.");return}
  const days=[0,1,2,3].map(n=>{const d=new Date(currentDate);d.setDate(d.getDate()+n);return d});
  const requestedPlayers=Number($("#searchPlayers").value)||8;
  const selectedPlayers=[16,12,10,8,6,4,2].find(count=>count<=requestedPlayers&&count<=v[7])||2;
  openModal(`<div class="modal-sub">BOOK A SLOT · ${v[1].toUpperCase()}</div><h2>${v[0]}</h2><p class="modal-sub">★ ${v[2]} · ${v[4]} km · From ₹${v[5]}/hour</p>
  <span class="modal-label">SELECT DATE</span><div class="slot-dates">${days.map((d,n)=>`<button class="slot-date ${n===0?"active":""}" onclick="selectDate(this,'${dateValue(d)}')"><b>${d.toLocaleDateString("en-IN",{weekday:"short"})}</b>${d.getDate()} ${d.toLocaleDateString("en-IN",{month:"short"})}</button>`).join("")}</div>
  <span class="modal-label">SELECT TIME SLOT</span><div class="slot-grid">${["5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"].map((x,n)=>`<button class="slot ${n===2?"active":""}" onclick="selectSlot(this,'${x}')">${x}<br><small>${n===5?"Almost full":"Available"}</small></button>`).join("")}</div>
  <span class="modal-label">PLAYERS · UP TO ${v[7]}</span><select class="modal-input" id="bookingPlayers">${[2,4,6,8,10,12,16].filter(x=>x<=v[7]).map(x=>`<option value="${x}" ${x===selectedPlayers?"selected":""}>${x} players</option>`).join("")}</select>
  <div class="summary-box"><div class="summary-line"><span>Slot price</span><b>₹${v[5]}</b></div><div class="summary-line"><span>Players</span><b id="summaryPlayers">${selectedPlayers}</b></div><div class="summary-line"><span>Taxes</span><b>₹${Math.round(v[5]*.05)}</b></div><div class="summary-line total"><span>Total</span><b id="summaryTotal">₹${Math.round(v[5]*1.05)}</b></div></div>
  <button class="primary-btn full" onclick="continueBooking()">Continue →</button>`);
  setTimeout(()=>$("#bookingPlayers").addEventListener("change",updateBookingTotal),0);
  return loadVenueSlots(i,dateValue(currentDate));
}
async function loadVenueSlots(venueId,date){
  const container=$(".slot-grid");
  if(!container)return [];
  container.classList.add("slots-loading");
  try{
    const {slots}=await api(`/api/availability?venueId=${encodeURIComponent(venueId)}&date=${encodeURIComponent(date)}`);
    if(!container.isConnected)return [];
    if(!Array.isArray(slots))throw new Error("Availability data was incomplete. Please retry.");
    container.innerHTML=slots.map((slot,index)=>`<button class="slot ${slot.available&&index===2?"active":""}" ${slot.available?"":"disabled"} onclick="selectSlot(this,'${String(slot.time).replace(/'/g,"\\'")}')">${escapeHtml(slot.time)}<br><small>${slot.available?"Available":"Booked"}</small></button>`).join("");
    currentSlot=slots.find((slot,index)=>slot.available&&index===2)?.time||slots.find(slot=>slot.available)?.time||null;
    if(!currentSlot)toast("No slots are available on this date. Choose another date.");
    return slots;
  }catch(error){
    const message=typeof error?.message==="string"&&error.message.trim()?error.message:"Couldn't load time slots. Please retry.";
    if(container.isConnected)container.innerHTML=`<p class="slot-error">${escapeHtml(message)} <button class="text-link" type="button" onclick="loadVenueSlots(${Number(venueId)},'${date}')">Retry</button></p>`;
    return [];
  }
  finally{if(container.isConnected)container.classList.remove("slots-loading")}
}
function selectDate(btn,date){$$(".slot-date").forEach(x=>x.classList.remove("active"));btn.classList.add("active");currentDate=new Date(`${date}T12:00:00`);currentSlot=null;loadVenueSlots(currentVenue,date)}
function selectSlot(btn,slot){if(btn.disabled)return;$$(".slot").forEach(x=>x.classList.remove("active"));btn.classList.add("active");currentSlot=slot}
function updateBookingTotal(){const p=parseInt($("#bookingPlayers").value,10);$("#summaryPlayers").textContent=p;$("#summaryTotal").textContent="₹"+Math.round((venues.find(venue=>venue[10]===currentVenue)?.[5]||0)*1.05)}
function continueBooking(){
  if(!currentSlot){toast("Select an available time slot before continuing.");return}
  if(!currentUser){
    try{
      sessionStorage.setItem("va_pending_booking",JSON.stringify({venueId:currentVenue,city:currentCity,date:dateValue(currentDate),time:currentSlot,players:Number($("#bookingPlayers").value)}));
      loginRedirect("/?resumeBooking=1");
    }catch{toast("Please log in first, then select this venue and slot again.")}
    return;
  }
  const v=venues.find(venue=>venue[10]===currentVenue);
  if(!v){toast("That venue is no longer available. Please start your booking again.");return}
  openModal(`<div class="modal-sub">PLAYER DETAILS</div><h2>Almost there.</h2><p class="modal-sub">Confirm your ${v[1]} slot at ${v[0]}. Availability is checked again before the booking is saved.</p>
  <span class="modal-label">BOOKING FOR</span><p class="booking-account-name">${escapeHtml(currentUser.name)} · ${escapeHtml(currentUser.email)}</p>
  <label class="modal-label" for="bookPhone">MOBILE NUMBER</label><input class="modal-input" id="bookPhone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile number" maxlength="10">
  <span class="modal-label">PAYMENT</span><p class="booking-demo-note">Demo checkout — no payment will be charged.</p>
  <span class="modal-label">COUPON</span><div style="display:flex;gap:7px"><input class="modal-input" id="coupon" placeholder="Try PLAY10"><button class="secondary-btn" onclick="applyCoupon()">Apply</button></div>
  <div class="summary-box"><div class="summary-line"><span>${v[0]} · ${currentSlot}</span><b>₹${v[5]}</b></div><div class="summary-line"><span>Taxes</span><b>₹${Math.round(v[5]*.05)}</b></div><div class="summary-line"><span>Discount</span><b id="discountLine">- ₹0</b></div><div class="summary-line total"><span>Final amount</span><b id="finalAmount">₹${Math.round(v[5]*1.05)}</b></div></div>
  <button class="primary-btn full" onclick="confirmBooking()">Confirm booking · demo checkout →</button>`);
}
function applyCoupon(){
  const code=$("#coupon").value.trim().toUpperCase();
  const v=venues.find(venue=>venue[10]===currentVenue);
  if(code==="PLAY10"&&v){discount=Math.round(v[5]*.1);toast("10% coupon applied");$("#discountLine").textContent="- ₹"+discount;$("#finalAmount").textContent="₹"+(Math.round(v[5]*1.05)-discount)}
  else toast("Try PLAY10 for 10% off");
}
async function confirmBooking(){
  if(!currentUser){loginRedirect();return}
  const phone=$("#bookPhone").value.trim();
  if(!/^[6-9]\d{9}$/.test(phone)){toast("Enter a valid 10-digit Indian mobile number");$("#bookPhone").focus();return}
  const v=venues.find(venue=>venue[10]===currentVenue),button=$(".modal .primary-btn.full");
  if(!v){toast("That venue is no longer available. Please start your booking again.");return}
  button.disabled=true;button.textContent="Confirming booking…";
  try{
    const result=await api("/api/bookings",{method:"POST",body:JSON.stringify({venueId:currentVenue,city:currentCity,date:dateValue(currentDate),time:currentSlot||"7:00 PM",players:parseInt($("#bookingPlayers")?.value||"8",10),coupon:$("#coupon")?.value.trim().toUpperCase()==="PLAY10"?"PLAY10":"",phone})});
    const b=result.booking;
    openModal(`<div class="success"><div class="success-mark">✓</div><h2>Booking Confirmed!</h2><p class="modal-sub">You're all set, ${escapeHtml(currentUser.name)}. Show this ticket at the venue.</p><img class="booking-qr" src="/api/bookings/${encodeURIComponent(b.id)}/qr" alt="QR ticket for booking ${escapeHtml(b.id)}" width="192" height="192"><div class="summary-box" style="text-align:left"><div class="summary-line"><span>Booking ID</span><b>${escapeHtml(b.id)}</b></div><div class="summary-line"><span>Venue</span><b>${escapeHtml(b.venue)}</b></div><div class="summary-line"><span>City</span><b>${escapeHtml(b.city)}</b></div><div class="summary-line"><span>Activity</span><b>${escapeHtml(b.activity)}</b></div><div class="summary-line"><span>Date & Time</span><b>${displayDate(b.date)} · ${escapeHtml(b.time)}</b></div><div class="summary-line total"><span>Total · demo checkout</span><b>₹${b.amount}</b></div></div><button class="primary-btn full" onclick="closeModal();openBookings()">Done — view my tickets</button></div>`);
  }catch(error){toast(error.message);button.disabled=false;button.textContent="Confirm booking · demo checkout →"}
}
function openSimple(title,body){openModal(`<h2>${title}</h2><p class="modal-sub">${body}</p><button class="primary-btn full" onclick="closeModal()">Got it</button>`)}
async function openBookings(){
  if(!currentUser){loginRedirect();return}
  openModal(`<div class="modal-sub">YOUR ACCOUNT</div><h2>My Bookings</h2><p class="modal-sub">Loading your bookings…</p>`);
  try{
    const result=await api("/api/bookings");bookings=result.bookings;
    const list=bookings.length?bookings.map(b=>`<article class="summary-box booking-ticket"><div class="booking-ticket-head"><div><b>${escapeHtml(b.venue)}</b><p class="modal-sub">${escapeHtml(b.activity)} · ${escapeHtml(b.city||"")} · ${displayDate(b.date)} · ${escapeHtml(b.time)}</p></div><span class="booking-status">${escapeHtml(b.status)}</span></div><div class="summary-line"><span>Booking ID</span><b>${escapeHtml(b.id)}</b></div><div class="summary-line"><span>Players</span><b>${b.players}</b></div><div class="summary-line total"><span>Total · demo checkout</span><b>₹${b.amount}</b></div><img class="booking-qr" src="/api/bookings/${encodeURIComponent(b.id)}/qr" alt="QR ticket for booking ${escapeHtml(b.id)}" width="152" height="152"><p class="booking-ticket-help">Show this QR ticket at the venue. Scanning it verifies your booking.</p></article>`).join(""):`<div class="success"><div class="success-mark">＋</div><h2>No bookings yet</h2><p class="modal-sub">You haven't booked anything yet.</p><a class="primary-btn" href="#activities" onclick="closeModal()">Explore Activities</a></div>`;
    openModal(`<div class="modal-sub">YOUR ACCOUNT · ${escapeHtml(currentUser.name)}</div><h2>My Bookings</h2><p class="modal-sub">Your saved activity reservations and QR tickets.</p>${list}`);
  }catch(error){openModal(`<h2>Couldn't load bookings</h2><p class="modal-sub">${escapeHtml(error.message)}</p><button class="primary-btn full" onclick="openBookings()">Try again</button>`)}
}
async function openProfile(){
  if(!currentUser){loginRedirect();return}
  openModal(`<div class="modal-sub">YOUR ACCOUNT</div><h2>${escapeHtml(currentUser.name)}</h2><p class="modal-sub">${escapeHtml(currentUser.email)}</p><button class="primary-btn full" onclick="openBookings()">My bookings & QR tickets</button><button class="secondary-btn full profile-logout" onclick="logout()">Log out</button>`);
}
async function logout(){
  try{await api("/api/auth/logout",{method:"POST",body:"{}"});currentUser=null;bookings=[];updateAccountButton();closeModal();toast("You are now logged out")}
  catch(error){toast(error.message)}
}
function matchIcon(activity){
  const item=activities.find(entry=>entry.name===activity);
  return item?item.icon:"🎮";
}
function matchClass(activity){
  if(activity==="Box Cricket")return "cricket";
  if(activity==="Badminton")return "badminton";
  return "gaming";
}
function matchDateLabel(value){
  const date=new Date(`${value}T12:00:00`),today=new Date();
  today.setHours(12,0,0,0);
  const difference=Math.round((date-today)/86400000);
  if(difference===0)return "Today";
  if(difference===1)return "Tomorrow";
  return displayDate(value);
}
async function loadMatches(){
  try{
    const {matches}=await api(`/api/matches?city=${encodeURIComponent(currentCity)}`);
    $("#playerGrid").innerHTML=matches.length?matches.map(match=>{
      const progress=Math.min(100,Math.round(match.playerCount/match.playerLimit*100));
      const joined=Boolean(match.joined),full=match.playerCount>=match.playerLimit;
      return `<article class="player-card"><div class="player-icon ${matchClass(match.activity)}">${matchIcon(match.activity)}</div><div class="player-info"><span>${escapeHtml(match.activity.toUpperCase())}</span><h3>${escapeHtml(match.title)}</h3><p>${matchDateLabel(match.date)} · ${escapeHtml(match.time)} · ${escapeHtml(match.venue)}</p><div class="progress"><i style="width:${progress}%"></i></div><small>${match.playerCount} / ${match.playerLimit} players · ₹${match.pricePerPlayer}/person</small></div><button class="join-btn" data-match-id="${escapeHtml(match.id)}" ${joined||full?"disabled":""}>${joined?"Joined":full?"Full":"Join"}</button></article>`;
    }).join(""):`<div class="empty-state"><h3>No open matches yet</h3><p>Create a match and invite local players.</p></div>`;
  }catch(error){toast(`Couldn't load matches: ${error.message}`)}
}
function updateMatchVenues(){
  const activity=$("#matchActivity").value;
  const matches=venues.map((venue,index)=>({venue,index})).filter(({venue})=>venue[1]===activity);
  $("#matchVenue").innerHTML=matches.map(({venue})=>`<option value="${venue[10]}">${escapeHtml(venue[0])}</option>`).join("");
  const selectedVenue=matches[0]?.venue;
  if(selectedVenue){
    const selectedLimit=Math.min(Number($("#matchLimit").value)||8,selectedVenue[7]);
    $("#matchLimit").innerHTML=[2,4,6,8,10,12,16].filter(count=>count<=selectedVenue[7]).map(count=>`<option ${count===selectedLimit?"selected":""}>${count}</option>`).join("");
  }
}
function openMatchForm(){
  if(!currentUser){loginRedirect();return}
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  openModal(`<div class="modal-sub">FIND YOUR TEAMMATES</div><h2>Create a match</h2><p class="modal-sub">Your match will appear in Find Players. You’ll be added as the first player.</p><p class="booking-demo-note">Listed prices are for reference; no payment is collected.</p><form id="createMatchForm" class="create-match-form"><label class="modal-label" for="matchTitle">MATCH NAME</label><input class="modal-input" id="matchTitle" minlength="3" maxlength="60" required placeholder="e.g. Saturday night cricket"><label class="modal-label" for="matchActivity">ACTIVITY</label><select class="modal-input" id="matchActivity">${[...new Set(activities.map(item=>item.name))].map(item=>`<option>${escapeHtml(item)}</option>`).join("")}</select><label class="modal-label" for="matchVenue">VENUE</label><select class="modal-input" id="matchVenue"></select><label class="modal-label" for="matchDate">DATE</label><input class="modal-input" id="matchDate" type="date" min="${dateValue(new Date())}" value="${dateValue(tomorrow)}" required><label class="modal-label" for="matchTime">TIME</label><select class="modal-input" id="matchTime">${["5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"].map(time=>`<option>${time}</option>`).join("")}</select><div class="match-form-row"><label><span class="modal-label">PLAYER LIMIT</span><select class="modal-input" id="matchLimit">${[2,4,6,8,10,12,16].map(count=>`<option ${count===8?"selected":""}>${count}</option>`).join("")}</select></label><label><span class="modal-label">₹ / PLAYER</span><input class="modal-input" id="matchPrice" type="number" min="0" max="5000" value="180" required></label></div><button class="primary-btn full" type="submit">Create match</button></form>`);
  updateMatchVenues();
  $("#matchActivity").addEventListener("change",updateMatchVenues);
  $("#createMatchForm").addEventListener("submit",submitMatch);
}
async function submitMatch(event){
  event.preventDefault();
  const button=$("#createMatchForm button[type='submit']");
  button.disabled=true;button.textContent="Creating match…";
  try{
    await api("/api/matches",{method:"POST",body:JSON.stringify({title:$("#matchTitle").value.trim(),activity:$("#matchActivity").value,venueId:Number($("#matchVenue").value),city:currentCity,date:$("#matchDate").value,time:$("#matchTime").value,playerLimit:Number($("#matchLimit").value),pricePerPlayer:Number($("#matchPrice").value)})});
    closeModal();toast("Your match is live. You’re on the team!");await loadMatches();
  }catch(error){toast(error.message);button.disabled=false;button.textContent="Create match"}
}
async function joinMatch(id,button){
  if(!currentUser){loginRedirect();return}
  button.disabled=true;button.textContent="Joining…";
  try{
    await api(`/api/matches/${encodeURIComponent(id)}/join`,{method:"POST",body:"{}"});
    toast("You joined the match.");await loadMatches();
  }catch(error){toast(error.message);button.disabled=false;button.textContent="Join"}
}
async function openTournament(name){
  try{
    const {tournaments}=await api("/api/tournaments"),tournament=tournaments.find(item=>item.name===name);
    if(!tournament){toast("Tournament not found");return}
    openModal(`<div class="modal-sub">${escapeHtml(tournament.activity.toUpperCase())} · ${tournament.registrationOpen?"REGISTRATION OPEN":"COMING SOON"}</div><h2>${escapeHtml(tournament.name)}</h2><div class="summary-box"><div class="summary-line"><span>Venue</span><b>${escapeHtml(tournament.venue)}</b></div><div class="summary-line"><span>Date</span><b>${displayDate(tournament.date)}</b></div><div class="summary-line"><span>Entry</span><b>₹${tournament.entryFee}</b></div><div class="summary-line"><span>Capacity</span><b>${escapeHtml(tournament.capacity)}</b></div><div class="summary-line total"><span>Prize pool</span><b>${escapeHtml(tournament.prize)}</b></div></div><p class="booking-demo-note">Local demo registration; no entry fee is charged.</p>${tournament.registered?'<p class="tournament-registered">You are registered for this tournament.</p>':`<button class="primary-btn full" ${tournament.registrationOpen?`onclick="registerTournament('${escapeHtml(tournament.id)}')"`:"disabled"}>${tournament.registrationOpen?"Register team · demo checkout":"Registration opening soon"}</button>`}`);
  }catch(error){toast(error.message)}
}
async function loadTournamentDates(){
  try{
    const {tournaments}=await api("/api/tournaments");
    for(const button of $$("[data-tournament]")){
      const tournament=tournaments.find(item=>item.name===button.dataset.tournament);
      const details=button.closest(".tour-body");
      if(!tournament||!details)continue;
      const dateLine=details.querySelector("p");
      if(dateLine)dateLine.textContent=`📍 ${tournament.venue} · ${displayDate(tournament.date)}`;
      const badge=details.closest(".tournament-card")?.querySelector(".tour-image span");
      if(badge)badge.textContent=tournament.registrationOpen?"REGISTRATION OPEN":"COMING SOON";
    }
  }catch(error){toast(`Tournament listings unavailable: ${error.message}`)}
}
async function registerTournament(id){
  if(!currentUser){loginRedirect();return}
  const button=$(".modal .primary-btn.full");
  if(button){button.disabled=true;button.textContent="Registering…"}
  try{
    const result=await api(`/api/tournaments/${encodeURIComponent(id)}/register`,{method:"POST",body:"{}"});
    toast(result.message);closeModal();
  }catch(error){toast(error.message);if(button){button.disabled=false;button.textContent="Register team · demo checkout"}}
}

function bindFaqs(){
  $$(".faq-question").forEach(button => {
    button.addEventListener("click", () => {
      const item = button.parentElement;
      const isOpen = item.classList.contains("open");
      $$(".faq-item").forEach(faq => faq.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });
}

$("#modalClose").onclick=closeModal;$("#modalBackdrop").onclick=e=>{if(e.target.id==="modalBackdrop")closeModal()};
$("#menuBtn").onclick=()=>$("#mobileMenu").classList.add("open");$("#closeMenu").onclick=()=>$("#mobileMenu").classList.remove("open");$$(".mobile-menu a").forEach(a=>a.onclick=()=>$("#mobileMenu").classList.remove("open"));
$("#filterOpen").onclick=()=>$("#filterPanel").classList.add("open");$("#closeFilter").onclick=()=>$("#filterPanel").classList.remove("open");
$("#clearFilters").onclick=clearFilters;
$$(".chip").forEach(c=>c.onclick=()=>{$$(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");renderVenues()});
["typeFilter","ratingFilter","playerFilter","todayFilter","openFilter","indoorFilter","outdoorFilter","sortSelect"].forEach(id=>$("#"+id).addEventListener("change",renderVenues));
$("#findSlotsBtn").onclick=async()=>{
  const selectedDate=$("#searchDate").value,date=new Date(`${selectedDate}T12:00:00`);
  if(!selectedDate||Number.isNaN(date.getTime())||date<new Date(`${dateValue(new Date())}T00:00:00`)){toast("Choose a valid date from today onward");$("#searchDate").focus();return}
  const button=$("#findSlotsBtn");button.disabled=true;button.textContent="Checking slots…";
  try{
    const availability=await Promise.all(venues.map(venue=>api(`/api/availability?venueId=${venue[10]}&date=${encodeURIComponent(selectedDate)}`)));
    searchAvailableVenueIds=venues.filter((venue,index)=>Number($("#searchPlayers").value)<=venue[7]&&availability[index].slots.some(slot=>slot.available)).map(venue=>venue[10]);
    quickSearchText="";
    quickSearchApplied=true;
    if($("#searchActivity").value)$("#typeFilter").value=$("#searchActivity").value;
    renderVenues();
    $("#venues").scrollIntoView({behavior:"smooth"});
    toast(`${$("#venueGrid").querySelectorAll(".venue-card").length} venues with available slots in ${cityName()}`);
  }catch(error){toast(`Couldn't check availability: ${error.message}`)}
  finally{button.disabled=false;button.innerHTML='Find Slots <span>→</span>'}
};
$("#searchDate").addEventListener("change",()=>{quickSearchApplied=false;searchAvailableVenueIds=null});
$("#searchPlayers").addEventListener("change",()=>{quickSearchApplied=false;searchAvailableVenueIds=null});
$("#searchActivity").addEventListener("change",()=>{quickSearchApplied=false;searchAvailableVenueIds=null});
function runGlobalSearch(query){
  const normalized=query.trim().toLocaleLowerCase("en-IN");
  if(!normalized)return;
  const cityMatch=cities.find(city=>city.name.toLocaleLowerCase("en-IN")===normalized);
  if(cityMatch){chooseCity(cityMatch.slug);return}
  const activity=activities.find(item=>normalized.includes(item.name.toLocaleLowerCase("en-IN")));
  if(activity){$("#searchActivity").value=activity.name;$("#typeFilter").value=activity.name;quickSearchText=""}
  else{$("#typeFilter").value="";quickSearchText=normalized}
  quickSearchApplied=false;
  const results=venues.filter(venue=>!quickSearchText||`${venue[0]} ${venue[1]} ${venue[11]}`.toLocaleLowerCase("en-IN").includes(quickSearchText));
  if(!results.length){toast(`No local listings match “${query.trim()}” in ${cityName()}`);return}
  renderVenues();
  closeModal();
  $("#venues").scrollIntoView({behavior:"smooth"});
  toast(activity?`Showing ${activity.name} in ${cityName()}`:`Showing ${results.length} matching listings`);
}
$("#globalSearchBtn").onclick=()=>{
  openModal(`<div class="modal-sub">SEARCH LOCAL LISTINGS</div><h2>Find your next game</h2><form id="globalSearchForm" class="create-match-form"><label class="modal-label" for="globalSearchInput">ACTIVITY, VENUE OR CITY</label><input class="modal-input" id="globalSearchInput" placeholder="Try badminton or bowling" maxlength="80" required><button class="primary-btn full" type="submit">Search venues</button></form>`);
  $("#globalSearchForm").addEventListener("submit",event=>{event.preventDefault();runGlobalSearch($("#globalSearchInput").value)});
};
$("#locationBtn").onclick=openCityPicker;
$("#searchLocation").onclick=openCityPicker;
$("#nearbyBtn").onclick=()=>{$("#venues").scrollIntoView({behavior:"smooth"});toast(`Showing locally saved listings in ${cityName()}`)};
$("#loginBtn").onclick=()=>currentUser?openProfile():loginRedirect();
$("#bottomProfile").onclick=openProfile;
$("#createMatchBtn").onclick=$("#createMatchBtn2").onclick=openMatchForm;
$("#playerGrid").addEventListener("click",event=>{const button=event.target.closest(".join-btn[data-match-id]");if(button)joinMatch(button.dataset.matchId,button)});
$$("[data-deal]").forEach(b=>b.onclick=async()=>{const c=b.dataset.deal;if(c==="PLAY10"){try{await navigator.clipboard.writeText("PLAY10");toast("PLAY10 copied to clipboard")}catch{toast("Use coupon PLAY10 at checkout")}}else{filterActivity("Box Cricket")}});
$$("[data-tournament]").forEach(b=>b.onclick=()=>openTournament(b.dataset.tournament));
const footerInformation={
  about:["About Velocity Arena","A local demo for browsing sports and gaming activities, discovering public matches, and reserving sample venue slots."],
  contact:["Contact","This local demo has no support inbox configured. Please contact the selected venue directly to verify its location, price, and availability."],
  careers:["Careers","A careers page is not configured in this local demo."],
  cancellation:["Cancellation policy","No real payment is collected and these are sample reservations. Contact the venue directly about changing a booking."],
  terms:["Terms","Prices, listings, and availability are local demo data. No payment is processed and no real venue partnership is implied."],
  privacy:["Privacy","Account and booking records are stored in the local SQLite database. Do not use real passwords or sensitive personal information in this demo."]
};
$$("[data-footer-info]").forEach(link=>link.addEventListener("click",event=>{
  event.preventDefault();
  const information=footerInformation[link.dataset.footerInfo];
  if(information)openSimple(...information);
}));
$$(".nav-bookings,.bottom-nav a[href='#bookings']").forEach(b=>b.onclick=e=>{e.preventDefault();openBookings()});
$("#newsletterForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const email=$("#newsletterEmail").value.trim();
  if(!email){toast("Please enter your email");$("#newsletterEmail").focus();return}
  const button=$("#newsletterBtn");button.disabled=true;
  try{const result=await api("/api/newsletter",{method:"POST",body:JSON.stringify({email})});toast(result.message);$("#newsletterEmail").value=""}
  catch(error){toast(error.message)}
  finally{button.disabled=false}
});
const d=new Date();$("#searchDate").value=dateValue(d);$("#searchDate").min=dateValue(d);
let secs=4*3600+18*60+32;
const countdownTimer=setInterval(()=>{const countdown=$("#dealCountdown");if(!countdown){clearInterval(countdownTimer);return}secs=Math.max(0,secs-1);const h=String(Math.floor(secs/3600)).padStart(2,"0"),m=String(Math.floor(secs%3600/60)).padStart(2,"0"),s=String(secs%60).padStart(2,"0");countdown.textContent=`Ends in ${h}:${m}:${s}`},1000);
bindFaqs();renderActivities();populateTypeFilter();
const cityDataReady=loadCityData(currentCity).catch(error=>{
  if(currentCity!=="ahmedabad")return loadCityData("ahmedabad");
  throw error;
}).catch(error=>{
  showServerNotice(error);
  $("#venueGrid").innerHTML=`<div class="empty-state"><h3>Local listings unavailable</h3><p>${escapeHtml(error.message)} Check that the local server is running, then refresh.</p></div>`;
  toast(`Local listings could not be loaded: ${error.message}`);
});
const accountReady=loadAccount().catch(error=>{showServerNotice(error);toast(`Account service unavailable: ${error.message}`);return null});
Promise.all([cityDataReady,accountReady]).then(resumePendingBooking).catch(error=>toast(`Couldn't resume your booking: ${error.message}`));
loadTournamentDates();

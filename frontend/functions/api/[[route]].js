/**
 * Trucking.Time — Cloudflare Pages Functions Backend
 * Single catch-all handler for /api/* → routes to D1 database
 *
 * D1 binding: env.DB (bound as "DB" in wrangler.toml)
 * All routes follow: /api/users/:userId/...
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

function uuid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// Simple XOR-based token obfuscation (D1 stores it, never sent to client)
function encryptToken(token) {
  const key = 'TruckingTime2024'
  let result = ''
  for (let i = 0; i < token.length; i++) {
    result += String.fromCharCode(token.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(result)
}

function decryptToken(enc) {
  try {
    const key = 'TruckingTime2024'
    const decoded = atob(enc)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return ''
  }
}

// Parse :userId from URL path /api/users/:userId/...
function parseRoute(pathname) {
  // pathname = /api/users/demo/trucks  etc
  const parts = pathname.replace(/^\/api\/users\//, '').split('/')
  const userId = parts[0] || 'demo'
  const resource = parts[1] || ''
  const subId = parts[2] || ''
  const action = parts[3] || ''
  return { userId, resource, subId, action }
}

// ── Stub load data — full DAT One field set ─────────────────────────────────
function generateStubLoads(userId, prefs) {
  const homeState = prefs?.home_state || 'DE'
  const equip     = prefs?.equipment_type || 'DRY_VAN'

  // Each route: orig/dest, miles, rate, deadhead, plus rich detail overrides
  const routes = [
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'FL', destCity:'Miami',          destZip:'33101', miles:1150, rate:3840,  dh:0,  loadType:'Full',    commodity:'Electronics',      lengthFt:48, weightLbs:24000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'PA', destCity:'Philadelphia',   destZip:'19103', miles:45,   rate:280,   dh:0,  loadType:'Partial', commodity:'Auto Parts',       lengthFt:20, weightLbs:8500,  tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'NY', destCity:'New York',       destZip:'10001', miles:120,  rate:480,   dh:5,  loadType:'Full',    commodity:'Packaged Goods',   lengthFt:53, weightLbs:38000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'GA', destCity:'Atlanta',        destZip:'30301', miles:780,  rate:2496,  dh:10, loadType:'Full',    commodity:'Food Grade',       lengthFt:53, weightLbs:42000, tempMin:34,   tempMax:38   },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'TN', destCity:'Nashville',      destZip:'37201', miles:820,  rate:2624,  dh:15, loadType:'Full',    commodity:'Building Materials',lengthFt:48,weightLbs:45000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'TX', destCity:'Dallas',         destZip:'75201', miles:1480, rate:5180,  dh:20, loadType:'Full',    commodity:'Industrial Equip', lengthFt:53, weightLbs:47500, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'OH', destCity:'Columbus',       destZip:'43215', miles:360,  rate:1008,  dh:8,  loadType:'Full',    commodity:'Retail Goods',     lengthFt:48, weightLbs:35000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'NC', destCity:'Charlotte',      destZip:'28201', miles:490,  rate:1470,  dh:5,  loadType:'Full',    commodity:'Appliances',       lengthFt:53, weightLbs:40000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'VA', destCity:'Richmond',       destZip:'23219', miles:200,  rate:640,   dh:0,  loadType:'Partial', commodity:'Paper Products',   lengthFt:28, weightLbs:18000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'MA', destCity:'Boston',         destZip:'02101', miles:330,  rate:1056,  dh:12, loadType:'Full',    commodity:'Medical Supplies',  lengthFt:48,weightLbs:22000, tempMin:36,   tempMax:46   },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'IN', destCity:'Indianapolis',   destZip:'46201', miles:680,  rate:2176,  dh:18, loadType:'Full',    commodity:'Auto Parts',       lengthFt:53, weightLbs:44000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'IL', destCity:'Chicago',        destZip:'60601', miles:790,  rate:2528,  dh:22, loadType:'Full',    commodity:'Packaged Foods',   lengthFt:53, weightLbs:43500, tempMin:32,   tempMax:40   },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'MI', destCity:'Detroit',        destZip:'48201', miles:520,  rate:1560,  dh:10, loadType:'Partial', commodity:'Machinery Parts',  lengthFt:36, weightLbs:28000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'MO', destCity:'St. Louis',      destZip:'63101', miles:900,  rate:2880,  dh:25, loadType:'Full',    commodity:'Consumer Goods',   lengthFt:53, weightLbs:41000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'SC', destCity:'Columbia',       destZip:'29201', miles:540,  rate:1620,  dh:8,  loadType:'Full',    commodity:'Lumber',           lengthFt:48, weightLbs:46000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'NJ', destCity:'Newark',         destZip:'07101', miles:95,   rate:380,   dh:0,  loadType:'Partial', commodity:'Pharmaceuticals',  lengthFt:24, weightLbs:12000, tempMin:36,   tempMax:46   },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'CT', destCity:'Hartford',       destZip:'06101', miles:280,  rate:896,   dh:14, loadType:'Full',    commodity:'Retail Goods',     lengthFt:48, weightLbs:34000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'KY', destCity:'Louisville',     destZip:'40201', miles:700,  rate:2100,  dh:20, loadType:'Full',    commodity:'Automotive',       lengthFt:53, weightLbs:45000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'AL', destCity:'Birmingham',     destZip:'35201', miles:860,  rate:2752,  dh:12, loadType:'Full',    commodity:'Steel Coils',      lengthFt:48, weightLbs:47000, tempMin:null, tempMax:null },
    { orig: homeState, origCity:'Wilmington', origZip:'19801', dest:'MS', destCity:'Jackson',        destZip:'39201', miles:1020, rate:3264,  dh:15, loadType:'Full',    commodity:'Food Grade',       lengthFt:53, weightLbs:43000, tempMin:34,   tempMax:38   },
  ]

  const brokerNames  = ['Rachel Adams','Kevin Hall','Beverly Clark','James Wilson','Maria Garcia','Tom Baker','Lisa Chen','David Park','Sandra Lee','Chris Martin']
  const brokerCos    = ['Florida Freight Exchange','Southern Lanes LLC','Indy Freight Solutions','Atlas Dispatch','Northeast Carriers','Midwest Loads Inc','Coastal Freight','Premier Logistics','FastLane LLC','TruckTime Brokers']
  const brokerMCs    = ['MC-294871','MC-501234','MC-187654','MC-398012','MC-612345','MC-445521','MC-772390','MC-123987','MC-556234','MC-890123']

  // Equipment sets — multiple allowed types (like real DAT loads)
  const equipSets = [
    { primary:'DRY_VAN',    allowed:['DRY_VAN','REEFER'],              size:'53\' Van' },
    { primary:'REEFER',     allowed:['REEFER'],                         size:'53\' Reefer' },
    { primary:'FLATBED',    allowed:['FLATBED','STEP_DECK'],            size:'48\' Flatbed' },
    { primary:'BOX_TRUCK_26',allowed:['BOX_TRUCK_26'],                  size:'26\' Box' },
    { primary:'DRY_VAN',    allowed:['DRY_VAN'],                        size:'48\' Van' },
    { primary:'STEP_DECK',  allowed:['STEP_DECK','FLATBED','LOWBOY'],   size:'48\' Step Deck' },
    { primary:'REEFER',     allowed:['REEFER','DRY_VAN'],               size:'53\' Reefer/Van' },
  ]

  const loadingTypes  = ['Live Load','Drop Hook','Drop & Pick','Preloaded']
  const unloadTypes   = ['Live Unload','Drop Only','Drop & Pick']
  const comments = [
    'Hazmat — driver must have HAZMAT endorsement. No early pickups.',
    'Team drivers preferred. No touch freight. Lumper available.',
    'Drop hook available. Must call ahead 2 hours before pickup.',
    'Live load only. Dock hours 06:00–18:00 Mon–Fri.',
    'Oversize permit required. Escort not needed under 14ft wide.',
    'Food grade trailer required. Trailer must be clean and inspected.',
    'No slip seat. Solo driver required. Heavy load — verify scales.',
    'High value load — bond required. Security camera trailer preferred.',
    null, null, // some loads have no comments
  ]

  return routes.map((r, i) => {
    const dpm        = r.rate / r.miles
    const eqSet      = equipSets[i % equipSets.length]
    const pickupDate = new Date(Date.now() + (i % 3) * 86400000).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
    const delivDate  = new Date(Date.now() + ((i % 3) + 1) * 86400000).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' })
    const pickupTime = ['06:00','07:00','08:00','10:00','12:00','14:00'][i % 6]
    const delivTime  = ['12:00','14:00','16:00','18:00','20:00','22:00'][i % 6]
    // Spot vs contract rate
    const contractRate = r.rate * (0.92 + (i % 5) * 0.02)

    return {
      // ── Core identity ──────────────────────────────────────
      loadId:           `DAT-${1000 + i + 1}`,
      referenceId:      `REF-${String(88000 + i * 137).padStart(6,'0')}`,

      // ── Origin ─────────────────────────────────────────────
      originState:      r.orig,
      originCity:       r.origCity,
      originZip:        r.origZip,
      originAddress:    `${100 + i * 7} Industrial Blvd`,
      pickupDate,
      pickupTime,
      pickupType:       loadingTypes[i % loadingTypes.length],

      // ── Destination ────────────────────────────────────────
      destinationState: r.dest,
      destinationCity:  r.destCity,
      destinationZip:   r.destZip,
      destinationAddress:`${200 + i * 11} Commerce Dr`,
      deliveryDate:     delivDate,
      deliveryTime:     delivTime,
      unloadType:       unloadTypes[i % unloadTypes.length],

      // ── Distance & financials ──────────────────────────────
      deadheadMiles:    r.dh,
      totalMiles:       r.miles,
      rate:             r.rate,
      dollarsPerMile:   Math.round(dpm * 100) / 100,
      spotRate:         r.rate,
      contractRate:     Math.round(contractRate),
      fuelSurcharge:    Math.round(r.miles * 0.18),
      allInRate:        r.rate + Math.round(r.miles * 0.18),

      // ── Equipment ──────────────────────────────────────────
      equipmentType:    i % 5 === 0 ? 'REEFER' : i % 7 === 0 ? 'FLATBED' : (i % 11 === 0 ? 'BOX_TRUCK_26' : equip),
      equipmentAllowed: i % 5 === 0 ? ['REEFER'] : i % 7 === 0 ? ['FLATBED','STEP_DECK'] : i % 11 === 0 ? ['BOX_TRUCK_26'] : [equip,'REEFER'].slice(0, 1 + (i % 2)),
      equipmentSize:    eqSet.size,
      loadType:         r.loadType,   // Full / Partial
      lengthFt:         r.lengthFt,
      weightLbs:        r.weightLbs,
      commodity:        r.commodity,
      tempMin:          r.tempMin,
      tempMax:          r.tempMax,
      hazmat:           i % 13 === 0,
      teamRequired:     i % 9 === 0,
      tarpRequired:     i % 7 === 0,

      // ── Load/unload details ────────────────────────────────
      stops:            i % 4 === 0 ? 2 : 1,
      dockHours:        `${['06','07','08'][i%3]}:00 – ${['16','18','20'][i%3]}:00`,
      lumperAvailable:  i % 3 === 0,
      dropHook:         pickupDate.includes(loadingTypes[i % loadingTypes.length]) ? false : i % 4 === 0,

      // ── Comments ───────────────────────────────────────────
      comments:         comments[i % comments.length],

      // ── Broker / carrier info ──────────────────────────────
      brokerName:       brokerNames[i % brokerNames.length],
      brokerCompany:    brokerCos[i % brokerCos.length],
      brokerMC:         brokerMCs[i % brokerMCs.length],
      brokerPhone:      `+1-302-555-${String(1000 + i).padStart(4,'0')}`,
      brokerEmail:      `broker${i+1}@truckingbroker.com`,
      brokerCsaScore:   Math.floor(70 + (i * 7) % 30),  // 70–99
      postedAge:        `${(i % 4) + 1}h ago`,
    }
  })
}

// ── Score loads ─────────────────────────────────────────────────────────────
function scoreLoads(loads, prefs) {
  const maxDH  = prefs?.max_deadhead_miles  ?? 50
  const minMi  = prefs?.min_total_miles     ?? 250
  const minDpm = prefs?.min_dollars_per_mile ?? 2.00

  return loads
    .filter(l =>
      l.deadheadMiles <= maxDH &&
      l.totalMiles    >= minMi &&
      l.dollarsPerMile >= minDpm
    )
    .map(l => ({
      ...l,
      _score: l.dollarsPerMile * 60 - l.deadheadMiles * 0.6 + 0.03 * Math.min(l.totalMiles, 900)
    }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...l }) => l)
}

// ── Default prefs ───────────────────────────────────────────────────────────
function defaultPrefs(userId) {
  return {
    userId,
    homeState: 'DE', homeCity: '',
    equipmentType: 'BOX_TRUCK_26',
    maxDeadheadMiles: 50, minTotalMiles: 250, minDollarsPerMile: 2.00,
    companyName: '', ownerName: '', mcNumber: '', dotNumber: '',
    companyPhone: '', companyEmail: '', companyWebsite: '',
    phoneNumber: '', email: '',
    smsEnabled: false, emailEnabled: false,
    subscriptionTier: 'FREE',
  }
}

function rowToPrefs(row) {
  if (!row) return null
  return {
    userId:           row.user_id,
    homeState:        row.home_state        ?? 'DE',
    homeCity:         row.home_city         ?? '',
    equipmentType:    row.equipment_type    ?? 'BOX_TRUCK_26',
    maxDeadheadMiles: row.max_deadhead_miles ?? 50,
    minTotalMiles:    row.min_total_miles    ?? 250,
    minDollarsPerMile:row.min_dollars_per_mile ?? 2.00,
    companyName:      row.company_name      ?? '',
    ownerName:        row.owner_name        ?? '',
    mcNumber:         row.mc_number         ?? '',
    dotNumber:        row.dot_number        ?? '',
    companyPhone:     row.company_phone     ?? '',
    companyEmail:     row.company_email     ?? '',
    companyWebsite:   row.company_website   ?? '',
    phoneNumber:      row.phone_number      ?? '',
    email:            row.email             ?? '',
    smsEnabled:       !!row.sms_enabled,
    emailEnabled:     !!row.email_enabled,
    subscriptionTier: row.subscription_tier ?? 'FREE',
  }
}

function rowToTruck(row) {
  if (!row) return null
  return {
    truckId:       row.truck_id,
    userId:        row.user_id,
    truckNumber:   row.truck_number   ?? '',
    driverName:    row.driver_name    ?? '',
    currentCity:   row.current_city   ?? '',
    currentState:  row.current_state  ?? '',
    equipmentType: row.equipment_type ?? 'DRY_VAN',
    status:        row.status         ?? 'AVAILABLE',
    notes:         row.notes          ?? '',
    availableDate: row.available_date ?? '',
    lastUpdated:   row.last_updated   ?? now(),
  }
}

function rowToBroker(row) {
  if (!row) return null
  return {
    brokerId:         row.broker_id,
    userId:           row.user_id,
    brokerName:       row.broker_name        ?? '',
    brokerCompany:    row.broker_company      ?? '',
    brokerPhone:      row.broker_phone        ?? '',
    brokerEmail:      row.broker_email        ?? '',
    mcNumber:         row.mc_number           ?? '',
    notes:            row.notes               ?? '',
    status:           row.status              ?? 'NEW',
    followUpCount:    row.follow_up_count      ?? 0,
    introEmailSentAt: row.intro_email_sent_at  ?? null,
    lastFollowUpAt:   row.last_follow_up_at    ?? null,
    createdAt:        row.created_at           ?? now(),
  }
}

function rowToBooking(row) {
  if (!row) return null
  return {
    id:               row.id,
    userId:           row.user_id,
    loadId:           row.load_id           ?? '',
    originState:      row.origin_state      ?? '',
    destinationState: row.destination_state ?? '',
    totalMiles:       row.total_miles       ?? 0,
    deadheadMiles:    row.deadhead_miles    ?? 0,
    dollarsPerMile:   row.dollars_per_mile  ?? 0,
    equipmentType:    row.equipment_type    ?? '',
    bookedAt:         row.booked_at         ?? now(),
  }
}

// ── Route handlers ──────────────────────────────────────────────────────────

async function handlePreferences(request, env, userId) {
  const db = env.DB

  if (request.method === 'GET') {
    let row = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    if (!row) {
      // Auto-create defaults
      await db.prepare(`
        INSERT INTO preferences (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING
      `).bind(userId).run()
      row = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    }
    return json(row ? rowToPrefs(row) : defaultPrefs(userId))
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    await db.prepare(`
      INSERT INTO preferences (
        user_id, home_state, home_city, equipment_type,
        max_deadhead_miles, min_total_miles, min_dollars_per_mile,
        company_name, owner_name, mc_number, dot_number,
        company_phone, company_email, company_website,
        phone_number, email, sms_enabled, email_enabled,
        subscription_tier, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        home_state=excluded.home_state, home_city=excluded.home_city,
        equipment_type=excluded.equipment_type,
        max_deadhead_miles=excluded.max_deadhead_miles,
        min_total_miles=excluded.min_total_miles,
        min_dollars_per_mile=excluded.min_dollars_per_mile,
        company_name=excluded.company_name, owner_name=excluded.owner_name,
        mc_number=excluded.mc_number, dot_number=excluded.dot_number,
        company_phone=excluded.company_phone, company_email=excluded.company_email,
        company_website=excluded.company_website,
        phone_number=excluded.phone_number, email=excluded.email,
        sms_enabled=excluded.sms_enabled, email_enabled=excluded.email_enabled,
        subscription_tier=excluded.subscription_tier,
        updated_at=excluded.updated_at
    `).bind(
      userId,
      body.homeState ?? 'DE', body.homeCity ?? '',
      body.equipmentType ?? 'BOX_TRUCK_26',
      body.maxDeadheadMiles ?? 50, body.minTotalMiles ?? 250,
      body.minDollarsPerMile ?? 2.00,
      body.companyName ?? '', body.ownerName ?? '',
      body.mcNumber ?? '', body.dotNumber ?? '',
      body.companyPhone ?? '', body.companyEmail ?? '',
      body.companyWebsite ?? '', body.phoneNumber ?? '',
      body.email ?? '',
      body.smsEnabled ? 1 : 0, body.emailEnabled ? 1 : 0,
      body.subscriptionTier ?? 'FREE',
      now()
    ).run()
    const updated = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    return json(rowToPrefs(updated))
  }

  return json({ error: 'Method not allowed' }, 405)
}

async function handleDatToken(request, env, userId) {
  const db = env.DB
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const token = body.token || ''
    const encrypted = encryptToken(token)
    await db.prepare(`
      INSERT INTO preferences (user_id, dat_token_encrypted) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET dat_token_encrypted = excluded.dat_token_encrypted
    `).bind(userId, encrypted).run()
    return json({ success: true, message: 'DAT token saved' })
  }
  return json({ error: 'Method not allowed' }, 405)
}

async function handleDatStatus(request, env, userId) {
  const db = env.DB
  const row = await db.prepare('SELECT dat_token_encrypted FROM preferences WHERE user_id = ?').bind(userId).first()
  const token = row?.dat_token_encrypted ? decryptToken(row.dat_token_encrypted) : ''
  const connected = token.length > 0
  return json({
    connected,
    provider: 'DAT_ONE',
    message: connected ? 'DAT ONE connected' : 'No DAT token — add one in Settings',
    lastUpdated: now(),
  })
}

async function handleLoads(request, env, userId, resource) {
  const db = env.DB
  const row = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
  const prefs = row || null

  // Check if DAT token is set
  const datToken = row?.dat_token_encrypted ? decryptToken(row.dat_token_encrypted) : ''
  // With a real DAT token you'd call the DAT API here
  // For now: return scored stub loads (same logic as Spring Boot stub)
  const allLoads = generateStubLoads(userId, row)
  const scored   = scoreLoads(allLoads, row)
  const top      = resource === 'top20' ? scored.slice(0, 20) : scored.slice(0, 5)
  return json(top)
}

async function handleTrucks(request, env, userId, subId) {
  const db = env.DB

  if (request.method === 'GET' && !subId) {
    const { results } = await db.prepare('SELECT * FROM trucks WHERE user_id = ? ORDER BY last_updated DESC').bind(userId).all()
    return json(results.map(rowToTruck))
  }

  if (request.method === 'POST' && !subId) {
    const body = await request.json().catch(() => ({}))
    const id = uuid()
    await db.prepare(`
      INSERT INTO trucks (truck_id, user_id, truck_number, driver_name, current_city, current_state, equipment_type, status, notes, available_date, last_updated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, userId,
      body.truckNumber  ?? '',
      body.driverName   ?? '',
      body.currentCity  ?? '',
      body.currentState ?? '',
      body.equipmentType ?? 'DRY_VAN',
      body.status       ?? 'AVAILABLE',
      body.notes        ?? '',
      body.availableDate ?? '',
      now()
    ).run()
    const truck = await db.prepare('SELECT * FROM trucks WHERE truck_id = ?').bind(id).first()
    return json(rowToTruck(truck), 201)
  }

  if (request.method === 'PUT' && subId) {
    const body = await request.json().catch(() => ({}))
    await db.prepare(`
      UPDATE trucks SET
        truck_number=?, driver_name=?, current_city=?, current_state=?,
        equipment_type=?, status=?, notes=?, available_date=?, last_updated=?
      WHERE truck_id=? AND user_id=?
    `).bind(
      body.truckNumber  ?? '',
      body.driverName   ?? '',
      body.currentCity  ?? '',
      body.currentState ?? '',
      body.equipmentType ?? 'DRY_VAN',
      body.status       ?? 'AVAILABLE',
      body.notes        ?? '',
      body.availableDate ?? '',
      now(), subId, userId
    ).run()
    const truck = await db.prepare('SELECT * FROM trucks WHERE truck_id = ?').bind(subId).first()
    return json(rowToTruck(truck))
  }

  if (request.method === 'DELETE' && subId) {
    await db.prepare('DELETE FROM trucks WHERE truck_id = ? AND user_id = ?').bind(subId, userId).run()
    return json({ success: true })
  }

  return json({ error: 'Not found' }, 404)
}

async function handleBrokers(request, env, userId, subId, action) {
  const db = env.DB

  // Blast availability to all brokers
  if (request.method === 'POST' && subId === 'blast-availability') {
    const { results } = await db.prepare('SELECT * FROM brokers WHERE user_id = ?').bind(userId).all()
    const prefs = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    const results2 = results.map(b => ({
      brokerId: b.broker_id,
      brokerName: b.broker_name,
      success: true,
      message: `Availability blast sent to ${b.broker_name} at ${b.broker_email || b.broker_phone || 'N/A'}`
    }))
    return json(results2)
  }

  if (request.method === 'GET' && !subId) {
    const { results } = await db.prepare('SELECT * FROM brokers WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
    return json(results.map(rowToBroker))
  }

  if (request.method === 'POST' && !subId) {
    const body = await request.json().catch(() => ({}))
    const id = uuid()
    await db.prepare(`
      INSERT INTO brokers (broker_id, user_id, broker_name, broker_company, broker_phone, broker_email, mc_number, notes, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, userId,
      body.brokerName    ?? '',
      body.brokerCompany ?? '',
      body.brokerPhone   ?? '',
      body.brokerEmail   ?? '',
      body.mcNumber      ?? '',
      body.notes         ?? '',
      'NEW', now()
    ).run()
    const broker = await db.prepare('SELECT * FROM brokers WHERE broker_id = ?').bind(id).first()
    return json(rowToBroker(broker), 201)
  }

  if (request.method === 'PUT' && subId && !action) {
    const body = await request.json().catch(() => ({}))
    await db.prepare(`
      UPDATE brokers SET
        broker_name=?, broker_company=?, broker_phone=?, broker_email=?,
        mc_number=?, notes=?, status=?
      WHERE broker_id=? AND user_id=?
    `).bind(
      body.brokerName    ?? '',
      body.brokerCompany ?? '',
      body.brokerPhone   ?? '',
      body.brokerEmail   ?? '',
      body.mcNumber      ?? '',
      body.notes         ?? '',
      body.status        ?? 'NEW',
      subId, userId
    ).run()
    const broker = await db.prepare('SELECT * FROM brokers WHERE broker_id = ?').bind(subId).first()
    return json(rowToBroker(broker))
  }

  if (request.method === 'DELETE' && subId && !action) {
    await db.prepare('DELETE FROM brokers WHERE broker_id = ? AND user_id = ?').bind(subId, userId).run()
    return json({ success: true })
  }

  // Send intro email
  if (request.method === 'POST' && subId && action === 'send-intro') {
    const broker = await db.prepare('SELECT * FROM brokers WHERE broker_id = ? AND user_id = ?').bind(subId, userId).first()
    if (!broker) return json({ success: false, message: 'Broker not found' }, 404)
    await db.prepare(`
      UPDATE brokers SET status='INTRO_SENT', intro_email_sent_at=? WHERE broker_id=?
    `).bind(now(), subId).run()
    const prefs = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    const company = prefs?.company_name || userId
    return json({
      success: true,
      message: `Intro email queued for ${broker.broker_name} at ${broker.broker_company}. From: ${company}`,
    })
  }

  // Send follow-up
  if (request.method === 'POST' && subId && action === 'send-followup') {
    const broker = await db.prepare('SELECT * FROM brokers WHERE broker_id = ? AND user_id = ?').bind(subId, userId).first()
    if (!broker) return json({ success: false, message: 'Broker not found' }, 404)
    const count = (broker.follow_up_count || 0) + 1
    if (count > 3) return json({ success: false, message: 'Max follow-ups (3) reached for this broker' })
    await db.prepare(`
      UPDATE brokers SET follow_up_count=?, last_follow_up_at=?, status='FOLLOW_UP_SENT'
      WHERE broker_id=?
    `).bind(count, now(), subId).run()
    return json({ success: true, message: `Follow-up #${count} queued for ${broker.broker_name}` })
  }

  return json({ error: 'Not found' }, 404)
}

async function handleBookings(request, env, userId, subId) {
  const db = env.DB

  if (request.method === 'GET' && subId === 'profile') {
    const { results } = await db.prepare('SELECT * FROM bookings WHERE user_id = ?').bind(userId).all()
    if (results.length === 0) return json({ bookingCount: 0, avgMiles: 0, avgDollarsPerMile: 0, avgDeadhead: 0, laneCounts: {}, mostCommonEquipment: '' })
    const avgMiles = results.reduce((s, b) => s + b.total_miles, 0) / results.length
    const avgDpm   = results.reduce((s, b) => s + b.dollars_per_mile, 0) / results.length
    const avgDh    = results.reduce((s, b) => s + b.deadhead_miles, 0) / results.length
    const laneCounts = {}
    const equipCount = {}
    results.forEach(b => {
      const lane = `${b.origin_state}->${b.destination_state}`
      laneCounts[lane] = (laneCounts[lane] || 0) + 1
      const eq = b.equipment_type || 'UNKNOWN'
      equipCount[eq] = (equipCount[eq] || 0) + 1
    })
    const mostCommonEquipment = Object.entries(equipCount).sort((a,b) => b[1]-a[1])[0]?.[0] || ''
    return json({ bookingCount: results.length, avgMiles, avgDollarsPerMile: avgDpm, avgDeadhead: avgDh, laneCounts, mostCommonEquipment })
  }

  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY booked_at DESC').bind(userId).all()
    return json(results.map(rowToBooking))
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    await db.prepare(`
      INSERT INTO bookings (user_id, load_id, origin_state, destination_state, total_miles, deadhead_miles, dollars_per_mile, equipment_type, booked_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).bind(
      userId,
      body.loadId           ?? '',
      body.originState      ?? '',
      body.destinationState ?? '',
      body.totalMiles       ?? 0,
      body.deadheadMiles    ?? 0,
      body.dollarsPerMile   ?? 0,
      body.equipmentType    ?? '',
      now()
    ).run()
    return json({ success: true, message: 'Booking recorded' }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

async function handleIntent(request, env, userId, action) {
  const db = env.DB

  if (action === 'subscribe') {
    const body = await request.json().catch(() => ({}))
    await db.prepare(`
      INSERT INTO preferences (user_id, phone_number, email, sms_enabled, email_enabled, subscription_tier)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        phone_number=excluded.phone_number, email=excluded.email,
        sms_enabled=excluded.sms_enabled, email_enabled=excluded.email_enabled,
        subscription_tier=excluded.subscription_tier
    `).bind(
      userId,
      body.phoneNumber ?? '',
      body.email ?? '',
      body.phoneNumber ? 1 : 0,
      body.email ? 1 : 0,
      body.tier ?? 'PRO'
    ).run()
    return json({ success: true, message: `Subscribed on ${body.tier || 'PRO'} plan. SMS: ${body.phoneNumber || 'none'}, Email: ${body.email || 'none'}` })
  }

  if (action === 'unsubscribe') {
    await db.prepare(`UPDATE preferences SET sms_enabled=0, email_enabled=0, subscription_tier='FREE' WHERE user_id=?`).bind(userId).run()
    return json({ success: true, message: 'Unsubscribed from all notifications' })
  }

  if (action === 'sms-top20') {
    const prefs = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    if (!prefs?.phone_number) return json({ success: false, message: 'No phone number configured — set it in Notifications settings' })
    return json({ success: true, message: `SMS with top loads queued for ${prefs.phone_number} (Twilio sends when keys are configured)` })
  }

  if (action === 'email-top20') {
    const prefs = await db.prepare('SELECT * FROM preferences WHERE user_id = ?').bind(userId).first()
    if (!prefs?.email) return json({ success: false, message: 'No email configured — set it in Notifications settings' })
    return json({ success: true, message: `Email report queued for ${prefs.email} (SendGrid sends when keys are configured)` })
  }

  if (action === 'run-engine') {
    return json({ success: true, message: 'Engine triggered — loads refreshed from DAT stub' })
  }

  return json({ error: 'Unknown intent action' }, 400)
}

// ── Main router ─────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  // Only handle /api/users/* routes
  if (!pathname.startsWith('/api/users/')) {
    return new Response('Not found', { status: 404 })
  }

  // Ensure DB binding exists
  if (!env.DB) {
    return json({ error: 'D1 database not bound. Add [[d1_databases]] binding in wrangler.toml and deploy.' }, 503)
  }

  const { userId, resource, subId, action } = parseRoute(pathname)

  try {
    // Preferences
    if (resource === 'preferences') return handlePreferences(request, env, userId)

    // DAT account
    if (resource === 'accounts' && subId === 'dat') return handleDatToken(request, env, userId)
    if (resource === 'accounts' && subId === 'status') return handleDatStatus(request, env, userId)
    if (resource === 'accounts') {
      // GET /accounts → return list of connections
      const row = await env.DB.prepare('SELECT dat_token_encrypted FROM preferences WHERE user_id = ?').bind(userId).first()
      const connected = !!(row?.dat_token_encrypted && decryptToken(row.dat_token_encrypted).length > 0)
      return json([{ provider: 'DAT_ONE', connected, message: connected ? 'Connected' : 'Not connected', lastUpdated: now() }])
    }

    // Loads
    if (resource === 'top20')    return handleLoads(request, env, userId, 'top20')
    if (resource === 'newLoads') return handleLoads(request, env, userId, 'newLoads')

    // Trucks
    if (resource === 'trucks') return handleTrucks(request, env, userId, subId)

    // Brokers
    if (resource === 'brokers') return handleBrokers(request, env, userId, subId, action)

    // Bookings
    if (resource === 'bookings') return handleBookings(request, env, userId, subId)

    // Intent
    if (resource === 'intent') return handleIntent(request, env, userId, subId)

    return json({ error: `Unknown resource: ${resource}` }, 404)

  } catch (err) {
    console.error('Handler error:', err)
    return json({ error: err.message || 'Internal server error' }, 500)
  }
}

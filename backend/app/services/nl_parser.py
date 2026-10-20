"""
GARUDA Natural-Language Agent.
Handles two categories:
  1. Operational commands  – parse into DisruptionEvent, re-plan, return diff
  2. Q&A (in-domain + general) – answer anything about the scenario, plans,
     aircraft, weather, AI/tech, or general knowledge like a mini assistant.
Tries OpenAI GPT-4o-mini if key present, otherwise uses the rich rule engine.
"""
from __future__ import annotations
import os, re, datetime, json
from typing import Optional

from app.models.domain import DisruptionEvent, NLRequest, NLResponse


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 – Operational command parser (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

_CALLSIGN_MAP = {
    "viper 11": "AC01", "viper 12": "AC02", "viper 13": "AC03",
    "raptor 21": "AC04", "raptor 22": "AC05", "raptor 23": "AC06",
    "hawk 31": "AC07", "hawk 32": "AC08", "hawk 33": "AC09", "hawk 34": "AC10",
    "ghost 41": "AC11", "ghost 42": "AC12",
}

def _detect_whatif(text: str) -> bool:
    patterns = ["what if", "what happens if", "what breaks", "hypothetically",
                "simulate", "suppose", "if we", "if weather"]
    return any(p in text.lower() for p in patterns)


def _rule_parse(text: str) -> Optional[DisruptionEvent]:
    lower = text.lower()
    m = re.search(r"(viper|raptor|hawk|ghost)\s*(\d+)\s+(is\s+)?(down|unserviceable|unavailable|broken|u/s)", lower)
    if m:
        callsign = f"{m.group(1)} {m.group(2)}".upper()
        ac_id    = _CALLSIGN_MAP.get(callsign.lower(), callsign)
        return DisruptionEvent(type="AIRCRAFT_UNSERVICEABLE", target_id=ac_id,
                               severity="HIGH", detail=f"{callsign} unserviceable")

    m = re.search(r"crew\s+(\w+)\s+(unavailable|sick|unfit|grounded)", lower)
    if m:
        return DisruptionEvent(type="CREW_UNAVAILABLE", target_id=m.group(1).upper(),
                               severity="MEDIUM", detail="crew status")

    if re.search(r"jam|jamm", lower):
        return DisruptionEvent(type="COMMS_JAM", severity="HIGH", detail="comms jam")

    if re.search(r"weather\s+(clos|deterior|bad|wors)", lower):
        return DisruptionEvent(type="WEATHER_CLOSING", severity="MEDIUM", detail="weather deterioration")

    if re.search(r"new\s+threat", lower):
        return DisruptionEvent(type="NEW_THREAT", severity="HIGH", detail="20.5,77.0,60")

    m = re.search(r"priorit\w+\s+(m\d{2}|mission\s+\w+)", lower)
    if m:
        return DisruptionEvent(type="PRIORITY_CHANGE", target_id=m.group(1).upper(),
                               severity="MEDIUM", detail="1")

    return None


def _is_command(text: str) -> bool:
    """Returns True if the text looks like an operational command rather than a question."""
    lower = text.lower().strip()
    command_triggers = [
        r"(viper|raptor|hawk|ghost)\s*\d+.*(down|unserviceable|broken|unavailable|u/s)",
        r"crew\s+\w+\s+(unavailable|sick|grounded)",
        r"\bjam\b", r"\bjamming\b",
        r"weather\s+(clos|deterior|bad)",
        r"new\s+threat",
        r"priorit\w+\s+m\d{2}",
        r"inject",
        r"escalate\s+\w",
    ]
    return any(re.search(p, lower) for p in command_triggers)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 – Q&A engine (in-domain + general knowledge)
# ══════════════════════════════════════════════════════════════════════════════

# ── Scenario knowledge base (loaded lazily) ───────────────────────────────────
def _get_scenario():
    try:
        from app.services import scenario as sc_svc
        return sc_svc.get()
    except Exception:
        return None


def _get_plan():
    try:
        from app.services import scenario as sc_svc, optimiser
        sc = sc_svc.get()
        return optimiser.optimise(sc, priority_weight=0.5, seed=42, contested=sc.contested)
    except Exception:
        return None


# ── General knowledge dictionary ─────────────────────────────────────────────
_GENERAL_KB: list[tuple[list[str], str]] = [
    # GARUDA / system
    (["what is garuda", "what does garuda do", "what is this system", "what is tempo"],
     "GARUDA is an AI-enabled Air Operations Dynamic Retasking Console. It fuses aircraft availability, crew status, weapon loads, weather, airspace, and threat intelligence into a single tactical picture. It uses a CP-SAT constraint solver to generate optimised mission plans in under 1 second, and re-plans automatically when disruptions occur — keeping the commander in the loop at every step."),

    (["how does replan work", "how does the optimiser work", "cp-sat", "constraint solver", "how are missions assigned"],
     "GARUDA uses Google OR-Tools CP-SAT — a Constraint Programming SAT solver. It models aircraft, crew, weapons, and missions as variables with constraints (range, role match, weapon compatibility, crew duty hours, SAM avoidance). The solver maximises weighted mission coverage (priority × risk tolerance) and returns three plans (A/B/C) in under 1 second. If no OR-Tools solution is found, a greedy fallback assigns by priority order."),

    (["monte carlo", "robustness", "what is robustness", "survival rate", "how is robustness calculated"],
     "Robustness is calculated by running 500 Monte Carlo simulations on each plan. Each run randomly applies perturbations — aircraft engine failure, weather shift, crew delay, threat zone expansion — and counts how many missions still succeed. The survival % is the fraction of runs where the plan held. Plans with >80% survival are considered robust; below 60% means fragile."),

    (["multi agent", "negotiation", "agents", "bid veto award", "how does negotiation work"],
     "GARUDA runs four specialist agents: AircraftAgent (evaluates range and failure probability), CrewAgent (checks duty hours and qualifications), WeaponsAgent (verifies weapon-role compatibility), and WeatherAgent (assesses weather impact on routes). Each agent BIDs for missions it can support or VETOs ones it can't. A CoordinatorAgent resolves conflicts by priority → risk → scarcity, issuing AWARD decisions."),

    (["what is sead", "sead mission", "suppression of enemy air defense"],
     "SEAD stands for Suppression of Enemy Air Defenses. These missions target radar sites, SAM launchers, and air defense control nodes to reduce the threat to other aircraft. In GARUDA, RAPTOR aircraft are typically assigned SEAD roles using anti-radiation missiles (HARM)."),

    (["what is cas", "close air support"],
     "CAS stands for Close Air Support — air attacks against enemy targets in close proximity to friendly forces. HAWK aircraft in GARUDA are assigned CAS missions using precision-guided munitions."),

    (["what is isr", "intelligence surveillance reconnaissance"],
     "ISR stands for Intelligence, Surveillance, and Reconnaissance. GHOST aircraft in GARUDA conduct ISR missions to gather battlefield intelligence using sensors and cameras, typically without weapons."),

    (["what is a sam", "sam threat", "surface to air missile", "threat zone"],
     "A SAM (Surface-to-Air Missile) system is a ground-based air defense weapon. In GARUDA, SAM threat zones are shown as red dashed circles on the map. Routes that pass through SAM zones are flagged as high-risk, and the optimiser tries to route aircraft around or above them."),

    (["what is c-mapss", "cmapss", "failure prediction", "how is failure probability calculated"],
     "C-MAPSS (Commercial Modular Aero-Propulsion System Simulation) is a NASA turbofan engine degradation dataset. GARUDA trains a Gradient Boosting Machine (GBM) model on this data to predict aircraft engine failure probability based on engine hours flown vs maximum rated hours. The model outputs a probability (0–1) and Remaining Useful Life (RUL) in hours for each aircraft."),

    (["what is open meteo", "weather data", "where does weather come from"],
     "GARUDA fetches real hourly weather forecasts from Open-Meteo (open-meteo.com) — a free, no-API-key weather service. Data includes wind speed, wind direction, cloud cover, visibility, and precipitation for each airbase and route center. This is cached locally and used to compute weather impact scores per mission."),

    (["what is contested mode", "contested environment", "jamming"],
     "Contested mode simulates electronic warfare — GPS jamming, radar disruption, and IFF (Identification Friend or Foe) degradation. When active, a jamming polygon appears on the map, data source confidence drops (shown as LOW CONF tags on assignments), and the system warns the commander that decisions carry reduced certainty. It models real-world degraded operations."),

    (["what is zulu time", "what is utc", "zulu"],
     "Zulu time is military/aviation shorthand for UTC (Coordinated Universal Time). All timestamps in GARUDA are in Zulu to avoid confusion across time zones. The format is DDHHMM — day, hour, minute — followed by Z for Zulu. For example, 141530Z means the 14th at 15:30 UTC."),

    (["what is plan a", "what is plan b", "what is plan c", "difference between plans"],
     "GARUDA generates three plan options (A, B, C) with different priority-vs-risk trade-offs. Plan A maximises mission coverage and is typically the most aggressive. Plan B balances coverage and risk. Plan C is the most conservative, minimising risk at the cost of some coverage. The system marks the plan with the best robustness score as 'Recommended'."),

    (["what is a diff", "plan diff", "what is pending diff"],
     "A Plan Diff shows what changed between the current plan and the new plan after a disruption. Each line shows a mission, the BEFORE assignment (old aircraft/crew), the AFTER assignment (new aircraft/crew), and a one-line reason explaining why. The commander must press ACCEPT to commit the change or REJECT to revert."),

    (["what is a disruption", "types of disruption", "disruption types"],
     "GARUDA supports 6 disruption types: AIRCRAFT_UNSERVICEABLE (aircraft breaks down), CREW_UNAVAILABLE (crew sick or over duty hours), WEATHER_CLOSING (weather deteriorates at an airbase or route), NEW_THREAT (a new SAM or threat zone appears), COMMS_JAM (communications jammed — triggers contested mode), and PRIORITY_CHANGE (mission urgency increases)."),

    (["what is the scenario", "exercise iron monsoon", "what exercise"],
     "The scenario is EXERCISE IRON MONSOON — a simulated Indian subcontinent air operations exercise. It has 12 aircraft across 4 types (VIPER/RAPTOR/HAWK/GHOST), 10 crews, 8 missions ranging from STRIKE to ISR, 4 real airbases (Pune, Lohegaon, Nagpur, Hyderabad), and 4 SAM threat zones. All operational data is simulated for exercise purposes."),

    (["what airbases", "airbase locations", "where are the bases"],
     "GARUDA uses 4 real Indian airbases: Pune (VAPO), Lohegaon (VABB), Nagpur (VANP), and Hyderabad (VOHY). Their coordinates, runway counts, elevation, fuel stocks, and ammo capacity are sourced from OurAirports.com."),

    (["how do i use this", "how to use garuda", "help", "what can i do"],
     "Here's a quick guide:\n1. VIEW — The map shows aircraft, airbases, mission targets, and SAM threat rings. The Gantt timeline shows mission assignments per aircraft.\n2. REPLAN — Click 'REPLAN' or press the button to generate optimised Plans A/B/C.\n3. INJECT — Press I or click 'Inject Disruption' to simulate an event. The system replans and shows a BEFORE→AFTER diff.\n4. ACCEPT/REJECT — Press A to accept a plan change or R to reject it.\n5. WHAT-IF — Ask me anything like 'What if VIPER 12 is down?' and I'll explain without changing state."),

    (["keyboard shortcuts", "shortcuts", "hotkeys"],
     "Keyboard shortcuts: I = Inject Disruption, A = Accept plan diff, R = Reject plan diff, M = Open/close NL Command, C = Toggle Contested mode, Esc = Close any open panel."),
]


def _qa_rule(text: str, sc) -> Optional[str]:
    """Match against knowledge base and live scenario data. Returns answer string or None."""
    lower = text.lower().strip()

    # ── Knowledge base lookup ─────────────────────────────────────────────────
    for triggers, answer in _GENERAL_KB:
        if any(t in lower for t in triggers):
            return answer

    # ── Live scenario Q&A ─────────────────────────────────────────────────────
    if sc is None:
        return None

    # Aircraft status queries
    if re.search(r"how many aircraft|aircraft count|total aircraft", lower):
        ready = [a for a in sc.aircraft if a.status == "READY"]
        unserv = [a for a in sc.aircraft if a.status == "UNSERVICEABLE"]
        return (f"There are {len(sc.aircraft)} aircraft total. "
                f"{len(ready)} are READY and {len(unserv)} are UNSERVICEABLE. "
                f"Ready: {', '.join(a.callsign for a in ready[:6])}{'...' if len(ready) > 6 else ''}.")

    if re.search(r"which aircraft.*(ready|available)|ready aircraft", lower):
        ready = [a for a in sc.aircraft if a.status == "READY"]
        return f"{len(ready)} aircraft are ready: {', '.join(a.callsign for a in ready)}."

    if re.search(r"which aircraft.*(unserviceable|down|broken)|unserviceable aircraft", lower):
        unserv = [a for a in sc.aircraft if a.status == "UNSERVICEABLE"]
        if not unserv:
            return "All aircraft are currently serviceable — no unserviceable aircraft at this time."
        return f"{len(unserv)} aircraft are unserviceable: {', '.join(a.callsign for a in unserv)}."

    # Specific aircraft lookup
    m = re.search(r"(viper|raptor|hawk|ghost)\s*(\d+)", lower)
    if m:
        callsign = f"{m.group(1).upper()} {m.group(2)}"
        ac = next((a for a in sc.aircraft if a.callsign.upper() == callsign), None)
        if ac:
            risk = "HIGH RISK" if ac.fail_probability > 0.4 else "MEDIUM RISK" if ac.fail_probability > 0.2 else "LOW RISK"
            return (f"{ac.callsign} — Status: {ac.status}, Role: {ac.role}, "
                    f"Base: {ac.base}, Engine Hours: {ac.engine_hours:.0f}/{ac.max_engine_hours:.0f}, "
                    f"Failure Probability: {ac.fail_probability*100:.0f}% ({risk}), "
                    f"Range: {ac.range_km:.0f} km.")

    # Mission queries
    if re.search(r"how many missions|mission count|total missions", lower):
        return (f"There are {len(sc.missions)} missions in this exercise: "
                f"{', '.join(m.name for m in sc.missions)}.")

    if re.search(r"list.*missions|what.*missions|missions list|show missions", lower):
        lines = [f"• {m.name} (P{m.priority} {m.type})" for m in sorted(sc.missions, key=lambda x: x.priority)]
        return "Current missions (by priority):\n" + "\n".join(lines)

    # Crew queries
    if re.search(r"crew|how many crew|available crew", lower):
        avail = [c for c in sc.crews if c.available]
        return (f"There are {len(sc.crews)} crew members total. "
                f"{len(avail)} are currently available.")

    # Threat queries
    if re.search(r"threat|sam|how many.*threat|active.*threat", lower):
        active = [t for t in sc.threat_zones if t.active]
        return (f"There are {len(sc.threat_zones)} SAM threat zones, {len(active)} currently active: "
                f"{', '.join(t.name + ' (' + t.severity + ')' for t in active)}.")

    # Weather queries
    if re.search(r"weather|wind|cloud|visibility|precipitation", lower):
        if sc.weather:
            locs = [w.location for w in sc.weather]
            return (f"Weather data is cached for {len(sc.weather)} locations: {', '.join(locs)}. "
                    f"The latest fetch includes hourly wind speed, wind direction, cloud cover, visibility, and precipitation. "
                    f"Open the Predictions panel (PRED tab) to see mission-level weather impact scores.")
        return "No weather data is currently cached. Run 'python data/fetch_weather.py' to populate it."

    # High risk aircraft
    if re.search(r"high risk|most risk|dangerous|likely to fail|worst aircraft", lower):
        risky = sorted(sc.aircraft, key=lambda a: a.fail_probability, reverse=True)[:3]
        lines = [f"• {a.callsign}: {a.fail_probability*100:.0f}% failure probability" for a in risky]
        return "Top 3 highest-risk aircraft:\n" + "\n".join(lines)

    # Best aircraft
    if re.search(r"best aircraft|safest aircraft|lowest risk aircraft|most reliable", lower):
        best = sorted(sc.aircraft, key=lambda a: a.fail_probability)[:3]
        lines = [f"• {a.callsign}: only {a.fail_probability*100:.0f}% failure probability" for a in best]
        return "Top 3 safest aircraft:\n" + "\n".join(lines)

    # Plan status
    if re.search(r"current plan|active plan|what.*(plan|assigned)|mission assignment", lower):
        return ("Use the REPLAN button to generate the latest optimised plan. "
                "The DIFF tab on the right shows all current assignments with reasons. "
                "Plan A is typically the recommended option.")

    # Contested mode
    if re.search(r"is contested|contested.*on|contested.*off|contested.*active", lower):
        state = "ACTIVE" if sc.contested else "INACTIVE"
        return f"Contested mode is currently {state}. Press C or click the CONTESTED button to toggle it."

    # Greetings
    if re.search(r"^(hi|hello|hey|good morning|good afternoon|good evening|howdy)[\s!.]*$", lower):
        return ("Hello! I'm GARUDA's mission assistant. I can answer questions about the current exercise, "
                "aircraft status, missions, weather, threats, or how the system works. "
                "You can also give me operational commands like 'VIPER 12 is down' to trigger a replan.")

    # Thanks
    if re.search(r"^(thanks|thank you|thx|cheers|great|awesome|nice)[\s!.]*$", lower):
        return "Understood. Ready for your next query or command."

    # Who are you
    if re.search(r"who are you|what are you|introduce yourself|your name", lower):
        return ("I am GARUDA's embedded mission assistant — an AI agent that understands your operational scenario "
                "in real-time. I can answer questions about aircraft, crews, missions, weather, threats, plans, and "
                "AI techniques used in this system. I can also execute operational commands and trigger replans.")

    return None


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 – OpenAI fallback (enriched prompt)
# ══════════════════════════════════════════════════════════════════════════════

def _llm_answer(text: str, sc) -> Optional[str]:
    """Full conversational answer via OpenAI with scenario context injected."""
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        return None
    try:
        import openai
        client = openai.OpenAI(api_key=key)

        # Build concise scenario context
        context = ""
        if sc:
            ready = [a.callsign for a in sc.aircraft if a.status == "READY"]
            unserv = [a.callsign for a in sc.aircraft if a.status == "UNSERVICEABLE"]
            missions = [f"{m.name}(P{m.priority},{m.type})" for m in sc.missions]
            context = (
                f"Scenario: {sc.name}. "
                f"Aircraft ready: {', '.join(ready)}. "
                f"Unserviceable: {', '.join(unserv) or 'none'}. "
                f"Missions: {', '.join(missions)}. "
                f"Active threats: {sum(1 for t in sc.threat_zones if t.active)} SAM zones. "
                f"Contested mode: {'ON' if sc.contested else 'OFF'}."
            )

        system = (
            "You are GARUDA, an AI mission assistant embedded in a military air operations dashboard. "
            "You answer questions about the current exercise scenario, aircraft, missions, threats, weather, "
            "and how the AI/optimisation systems work. You also answer general questions helpfully and concisely. "
            "For operational commands (e.g. 'VIPER 12 is down'), say you'll process it as a disruption. "
            "Be concise — 2-4 sentences max unless a detailed list is needed. "
            f"Current scenario context: {context}"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system},
                      {"role": "user",   "content": text}],
            temperature=0.4,
            max_tokens=300,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return None


def _llm_parse_event(text: str) -> Optional[DisruptionEvent]:
    """Try OpenAI to extract structured disruption event."""
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        return None
    try:
        import openai
        client = openai.OpenAI(api_key=key)
        system = (
            "You are a military C2 system parser. Extract a single disruption event from "
            "the operator text. Reply ONLY as JSON with keys: "
            "type (AIRCRAFT_UNSERVICEABLE|CREW_UNAVAILABLE|WEATHER_CLOSING|NEW_THREAT|COMMS_JAM|PRIORITY_CHANGE), "
            "target_id (string or null), severity (LOW|MEDIUM|HIGH|CRITICAL), detail (string)."
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system},
                      {"role": "user",   "content": text}],
            temperature=0,
            max_tokens=200,
        )
        raw = json.loads(resp.choices[0].message.content)
        return DisruptionEvent(**raw)
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 – Main process function
# ══════════════════════════════════════════════════════════════════════════════

def process(req: NLRequest) -> NLResponse:
    text      = req.text.strip()
    is_whatif = _detect_whatif(text)
    sc        = _get_scenario()

    # ── Path A: Looks like an operational command ─────────────────────────────
    if _is_command(text):
        event  = _llm_parse_event(text) or _rule_parse(text)
        commit = req.commit and not is_whatif

        if event is None:
            answer = (f"I recognised this as an operational command but couldn't extract a structured event. "
                      f"Try: 'VIPER 12 is down', 'Crew CHEN unavailable', or 'New threat at 20.1N 78.3E'.")
            return NLResponse(intent="UNKNOWN", explanation=answer, chat_answer=answer, is_what_if=True)

        expl_map = {
            "AIRCRAFT_UNSERVICEABLE": f"{event.target_id} marked unserviceable — re-optimising without that asset.",
            "CREW_UNAVAILABLE":       f"Crew {event.target_id} removed — reassigning affected missions.",
            "WEATHER_CLOSING":        "Weather deterioration flagged — rerouting or delaying affected missions.",
            "NEW_THREAT":             "New threat zone injected — affected routes will be deconflicted.",
            "COMMS_JAM":              "Comms jam active — switching to contested mode, confidence degraded.",
            "PRIORITY_CHANGE":        f"Priority of {event.target_id} elevated — re-optimising allocation.",
        }
        explanation = expl_map.get(event.type, f"Event parsed: {event.type}")
        what_if     = not commit
        if what_if:
            chat_answer = f"[WHAT-IF] {explanation} No state change has been committed — this is a simulation only."
        else:
            chat_answer = f"[COMMITTED] {explanation} The plan is being re-optimised now."

        return NLResponse(
            intent=event.type,
            structured_event=event if not what_if else None,
            explanation=explanation,
            chat_answer=chat_answer,
            is_what_if=what_if,
        )

    # ── Path B: Q&A — try rule engine, then OpenAI, then fallback ────────────
    answer = _qa_rule(text, sc) or _llm_answer(text, sc)

    if answer:
        return NLResponse(
            intent="QA",
            explanation=answer,
            chat_answer=answer,
            is_what_if=True,
        )

    # ── Path C: Complete fallback ─────────────────────────────────────────────
    fallback = (
        "I'm not sure how to answer that yet. Here are things I can help with:\n"
        "• Aircraft status: 'Which aircraft are ready?' or 'Tell me about VIPER 12'\n"
        "• Missions: 'List all missions' or 'How many missions are there?'\n"
        "• Threats: 'What SAM threats are active?'\n"
        "• Operational commands: 'GHOST 41 is down' or 'New threat at 20N 78E'\n"
        "• System questions: 'How does the CP-SAT optimiser work?' or 'What is Monte Carlo?'\n"
        "• Scenario: 'What is Exercise Iron Monsoon?'"
    )
    return NLResponse(
        intent="UNKNOWN",
        explanation=fallback,
        chat_answer=fallback,
        is_what_if=True,
    )

const m = require("../../../miniprogram/pages/worldcup/matches.js");
const t = require("../../../miniprogram/pages/worldcup/teams.js");
const fs = require("fs");

const esc = (s) => (s || "").replace(/'/g, "''");

// Build name/flag lookup from matches.js groups (teams.js only has stats, not name/flag)
const nameMap = {};
const flagMap = {};
for (const [, teams] of Object.entries(m.groups)) {
  for (const t of teams) {
    nameMap[t.code] = t.name;
    flagMap[t.code] = t.flag;
  }
}

let sql = "";

const teamsObj = t.teamDetails || t;
for (const [code, td] of Object.entries(teamsObj)) {
  const group = Object.entries(m.groups).find(([,v]) => v.some(x => x.code === code))?.[0] || "";
  const squad = td.squad && td.squad.length > 0
    ? "'" + JSON.stringify(td.squad).replace(/'/g, "''") + "'"
    : "NULL";
  sql += "INSERT INTO worldcup_teams (code, name, flag, group_name, fifa_rank, appearances, best_result, coach, key_player, squad_confirmed, squad_data) VALUES (" +
    "'" + code + "', " +
    "'" + esc(nameMap[code]) + "', " +
    "'" + esc(flagMap[code]) + "', " +
    "'" + group + "', " +
    (td.fifaRank || "NULL") + ", " +
    (td.appearances || 0) + ", " +
    "'" + esc(td.best) + "', " +
    "'" + esc(td.coach) + "', " +
    "'" + esc(td.keyPlayer) + "', " +
    (td.squadConfirmed ? "true" : "false") + ", " +
    squad +
    ") ON CONFLICT (code) DO NOTHING;\n";
}

const allMatches = [...m.groupMatches, ...m.knockoutMatches];
for (const ma of allMatches) {
  const g = ma.group ? "'" + ma.group + "'" : "NULL";
  const r = ma.round || "NULL";
  const sa = ma.scoreA !== null && ma.scoreA !== undefined ? ma.scoreA : "NULL";
  const sb = ma.scoreB !== null && ma.scoreB !== undefined ? ma.scoreB : "NULL";
  sql += "INSERT INTO worldcup_matches (id, date, time, team_a_code, team_a_name, team_a_flag, team_b_code, team_b_name, team_b_flag, group_name, stage, round, status, score_a, score_b) VALUES (" +
    ma.id + ", " +
    "'" + ma.date + "', " +
    "'" + ma.time + "', " +
    "'" + ma.teamA.code + "', " +
    "'" + esc(ma.teamA.name) + "', " +
    "'" + ma.teamA.flag + "', " +
    "'" + ma.teamB.code + "', " +
    "'" + esc(ma.teamB.name) + "', " +
    "'" + ma.teamB.flag + "', " +
    g + ", " +
    "'" + ma.stage + "', " +
    r + ", " +
    "'" + ma.status + "', " +
    sa + ", " +
    sb +
    ") ON CONFLICT (id) DO NOTHING;\n";
}

fs.writeFileSync("/tmp/seed.sql", sql);
console.log("Generated " + sql.split("\n").length + " lines, " + sql.length + " chars");

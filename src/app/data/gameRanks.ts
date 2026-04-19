// Game-specific rank systems
export const GAME_RANKS: { [game: string]: string[] | null } = {
  // FPS / Tactical Shooters
  "Valorant": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
  "Apex Legends": ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator"],
  "Overwatch 2": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Top 500"],
  "Call of Duty: Warzone": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Crimson", "Iridescent", "Top 250"],
  "Counter-Strike 2": [
    "Silver I", "Silver II", "Silver III", "Silver IV", "Silver Elite", "Silver Elite Master",
    "Gold Nova I", "Gold Nova II", "Gold Nova III", "Gold Nova Master",
    "Master Guardian I", "Master Guardian II", "Master Guardian Elite",
    "Distinguished Master Guardian", "Legendary Eagle", "Legendary Eagle Master",
    "Supreme Master First Class", "Global Elite"
  ],
  "Rainbow Six Siege": ["Copper", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Champion"],
  "The Finals": ["Bronze", "Silver", "Gold", "Platinum", "Diamond"],

  // MOBA / Strategy
  "League of Legends": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
  "Dota 2": ["Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"],
  "Smite": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"],
  "Teamfight Tactics": ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"],
  "Hearthstone Battlegrounds": ["2000+", "4000+", "6000+", "8000+", "10000+"],
  "Auto Chess": ["Pawn", "Knight", "Bishop", "Rook", "King", "Queen"],

  // Survival / Co-op
  "Minecraft": null, // No official rank system
  "Valheim": null, // No official rank system
  "ARK: Survival Ascended": null, // No official rank system
  "Sons of the Forest": null, // No official rank system
  "Palworld": null, // No official rank system

  // Party Games
  "Jackbox Party Pack": null, // No official rank system
  "Among Us": null, // No official rank system
  "Fall Guys": ["Rookie", "Bronze", "Silver", "Gold", "Fame Ranks"],
  "Party Animals": null, // No official rank system
  "Goose Goose Duck": null, // No official rank system

  // Sports & Racing
  "EA Sports FC": ["Division 10", "Division 9", "Division 8", "Division 7", "Division 6", "Division 5", "Division 4", "Division 3", "Division 2", "Division 1", "Elite Division"],
  "NBA 2K": ["Bronze", "Silver", "Gold", "Hall of Fame", "Legend"],
  "Rocket League": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend"],
  "Madden NFL": ["Rookie", "Pro", "All-Pro", "All-Madden"],

  // MMO / RPG
  "World of Warcraft": ["Unranked", "Combatant", "Challenger", "Rival", "Duelist", "Gladiator", "Rank 1"],
  "Final Fantasy XIV": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Crystal"],
  "Elder Scrolls Online": null, // No fixed rank tiers
  "Destiny 2": ["Copper", "Bronze", "Silver", "Gold", "Platinum", "Adept", "Ascendant"],

  // Extraction / Hardcore
  "Escape from Tarkov": null, // No official rank system
  "Dark and Darker": ["Bronze", "Silver", "Gold", "Pathfinder", "Voyager", "Exemplar"],
  "Hunt: Showdown": ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star", "6 Star"]
};

// Game-specific ID systems
export const GAME_ID_SYSTEMS: { [game: string]: { label: string; placeholder: string } } = {
  // FPS / Tactical Shooters
  "Valorant": {
    label: "Riot ID",
    placeholder: "Username#Tagline (e.g., Player#NA1)"
  },
  "Apex Legends": {
    label: "Player ID",
    placeholder: "EA ID / Gamertag / PSN ID / Steam ID"
  },
  "Overwatch 2": {
    label: "Battle.net Tag",
    placeholder: "Username#12345"
  },
  "Call of Duty: Warzone": {
    label: "Activision ID",
    placeholder: "Username#1234567"
  },
  "Counter-Strike 2": {
    label: "Steam ID",
    placeholder: "Steam Friend Code or Steam Username"
  },
  "Rainbow Six Siege": {
    label: "Ubisoft Connect ID",
    placeholder: "Your Ubisoft Connect username"
  },
  "The Finals": {
    label: "Player ID",
    placeholder: "Embark ID or Platform Gamertag"
  },

  // MOBA / Strategy
  "League of Legends": {
    label: "Riot ID",
    placeholder: "Username#Tagline (e.g., Player#NA1)"
  },
  "Dota 2": {
    label: "Steam ID",
    placeholder: "Steam Friend Code or Steam Username"
  },
  "Smite": {
    label: "Hi-Rez Username",
    placeholder: "Your Hi-Rez account username"
  },
  "Teamfight Tactics": {
    label: "Riot ID",
    placeholder: "Username#Tagline (e.g., Player#NA1)"
  },
  "Hearthstone Battlegrounds": {
    label: "Battle.net Tag",
    placeholder: "Username#12345"
  },
  "Auto Chess": {
    label: "Account ID",
    placeholder: "Dragonest Account ID or Steam ID"
  },

  // Survival / Co-op
  "Minecraft": {
    label: "Gamertag",
    placeholder: "Minecraft Gamertag or Microsoft Xbox ID"
  },
  "Valheim": {
    label: "Steam ID",
    placeholder: "Steam Friend Code or Steam Username"
  },
  "ARK: Survival Ascended": {
    label: "Player ID",
    placeholder: "Steam ID / Xbox Gamertag / PSN ID"
  },
  "Sons of the Forest": {
    label: "Steam ID",
    placeholder: "Steam Friend Code or Steam Username"
  },
  "Palworld": {
    label: "Player ID",
    placeholder: "Steam Friend Code or Xbox Gamertag"
  },

  // Party Games
  "Jackbox Party Pack": {
    label: "Host Info",
    placeholder: "Room Code or Host Username"
  },
  "Among Us": {
    label: "Player ID",
    placeholder: "Friend Code or In-Game Username"
  },
  "Fall Guys": {
    label: "Epic Games ID",
    placeholder: "Your Epic Games username"
  },
  "Party Animals": {
    label: "Player ID",
    placeholder: "Xbox Gamertag or Steam Friend Code"
  },
  "Goose Goose Duck": {
    label: "Player ID",
    placeholder: "Steam Friend Code or In-Game Friend Code"
  },

  // Sports & Racing
  "EA Sports FC": {
    label: "Player ID",
    placeholder: "EA ID / Gamertag / PSN ID"
  },
  "NBA 2K": {
    label: "Player ID",
    placeholder: "2K Account Username / Gamertag / PSN ID"
  },
  "Rocket League": {
    label: "Epic Games ID",
    placeholder: "Your Epic Games username"
  },
  "Madden NFL": {
    label: "Player ID",
    placeholder: "EA ID / Gamertag / PSN ID"
  },

  // MMO / RPG
  "World of Warcraft": {
    label: "Character Info",
    placeholder: "Battle.net Tag + Character Name + Realm"
  },
  "Final Fantasy XIV": {
    label: "Character Info",
    placeholder: "Character Name + World Server"
  },
  "Elder Scrolls Online": {
    label: "UserID",
    placeholder: "@Username"
  },
  "Destiny 2": {
    label: "Bungie Name",
    placeholder: "Username#1234"
  },

  // Extraction / Hardcore
  "Escape from Tarkov": {
    label: "Tarkov Username",
    placeholder: "Your Escape from Tarkov username"
  },
  "Dark and Darker": {
    label: "Player ID",
    placeholder: "Nexon Account ID or Platform Username"
  },
  "Hunt: Showdown": {
    label: "Player ID",
    placeholder: "Steam Friend Code / Xbox Gamertag / PSN ID"
  }
};

// Check if a game has an official rank system
export function hasRankSystem(game: string): boolean {
  return GAME_RANKS[game] !== null && GAME_RANKS[game] !== undefined;
}

// Get ranks for a specific game
export function getRanksForGame(game: string): string[] | null {
  return GAME_RANKS[game] || null;
}

// Get display label for rank field based on game
export function getRankLabelForGame(game: string): string {
  if (game === "Hunt: Showdown") return "MMR Star Rating";
  if (game === "Hearthstone Battlegrounds") return "Rating Tier";
  if (game === "Elder Scrolls Online") return "Rating";
  return "Skill Rank";
}

// Get ID system info for a specific game
export function getIdSystemForGame(game: string): { label: string; placeholder: string } {
  return GAME_ID_SYSTEMS[game] || {
    label: "In-Game ID",
    placeholder: "Your gaming username"
  };
}
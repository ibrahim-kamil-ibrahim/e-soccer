export function getTemplate(entity) {
  const templates = {
    teams: {
      entity: "teams",
      columns: [
        { header: "Team Name", field: "name", required: true, example: "Dire Dawa Stars", type: "string" },
        { header: "Short Name", field: "shortName", required: false, example: "DDS", type: "string" },
        { header: "Team Logo", field: "logo", required: false, example: "/uploads/logo.png", type: "string" },
        { header: "City", field: "city", required: true, example: "Dire Dawa", type: "string" },
        { header: "Description", field: "description", required: false, example: "One of the top clubs in Dire Dawa.", type: "string" },
        { header: "Region", field: "region", required: false, example: "Dire Dawa", type: "string" },
        { header: "Competition", field: "competitionName", required: false, example: "Dire Dawa League", type: "lookup", lookup: { model: "Competition", displayField: "name" } },
        { header: "Division", field: "division", required: false, example: "Premier", type: "string" },
        { header: "Type", field: "type", required: false, example: "Club", type: "string" },
        { header: "Position", field: "position", required: false, example: 1, type: "number" },
        { header: "Form", field: "form", required: false, example: "WWWDL", type: "string" },
        { header: "Stadium", field: "stadium", required: false, example: "Dire Dawa Stadium", type: "string" },
        { header: "Capacity", field: "capacity", required: false, example: 25000, type: "number" },
        { header: "League", field: "league", required: false, example: "Ethiopian Premier League", type: "string" },
        { header: "Founded", field: "founded", required: false, example: 1974, type: "number" },
        { header: "Home Jersey", field: "homeJersey", required: false, example: "Green", type: "string" },
        { header: "Away Jersey", field: "awayJersey", required: false, example: "White", type: "string" },
        { header: "Website", field: "website", required: false, example: "https://dirstars.et", type: "string" },
        { header: "Facebook", field: "facebook", required: false, example: "https://facebook.com/dirstars", type: "string" },
        { header: "Telegram", field: "telegram", required: false, example: "https://t.me/dirstars", type: "string" },
        { header: "Instagram", field: "instagram", required: false, example: "https://instagram.com/dirstars", type: "string" },
        { header: "Phone", field: "phone", required: false, example: "+251 911 123 456", type: "string" },
        { header: "Email", field: "email", required: false, example: "info@dirstars.et", type: "string" },
        { header: "Featured", field: "isFeatured", required: false, example: false, type: "boolean" },
        { header: "Published", field: "published", required: false, example: true, type: "boolean" },
        { header: "Status", field: "status", required: false, example: "PUBLISHED", type: "enum", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        { header: "Sort Order", field: "sortOrder", required: false, example: 1, type: "number" },
      ],
    },
    players: {
      entity: "players",
      columns: [
        { header: "Name", field: "name", required: true, example: "Abdi Ibrahim", type: "string" },
        { header: "Team", field: "teamName", required: true, example: "Dire Dawa Stars", type: "lookup", lookup: { model: "Team", displayField: "name" } },
        { header: "Position", field: "position", required: false, example: "Forward", type: "string" },
        { header: "Date of Birth", field: "dateOfBirth", required: false, example: "1998-03-15", type: "date" },
        { header: "Age", field: "age", required: false, example: 26, type: "number" },
        { header: "Nationality", field: "nationality", required: false, example: "Ethiopian", type: "string" },
        { header: "City", field: "city", required: false, example: "Dire Dawa", type: "string" },
        { header: "Height", field: "height", required: false, example: "178cm", type: "string" },
        { header: "Weight", field: "weight", required: false, example: 72, type: "number" },
        { header: "Preferred Foot", field: "preferredFoot", required: false, example: "Left", type: "string" },
        { header: "Jersey Number", field: "jerseyNumber", required: false, example: 10, type: "number" },
        { header: "Player Status", field: "playerStatus", required: false, example: "Active", type: "string" },
        { header: "Photo", field: "photo", required: false, example: "/uploads/player.jpg", type: "string" },
        { header: "Biography", field: "biography", required: false, example: "Talented young forward.", type: "string" },
        { header: "Instagram", field: "instagram", required: false, example: "https://instagram.com/abdi", type: "string" },
        { header: "Featured", field: "isFeatured", required: false, example: false, type: "boolean" },
        { header: "Status", field: "status", required: false, example: "PUBLISHED", type: "enum", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        { header: "Goals", field: "goals", required: false, example: 15, type: "number" },
        { header: "Assists", field: "assists", required: false, example: 8, type: "number" },
        { header: "Matches", field: "matches", required: false, example: 28, type: "number" },
        { header: "Yellow Cards", field: "yellowCards", required: false, example: 3, type: "number" },
        { header: "Red Cards", field: "redCards", required: false, example: 0, type: "number" },
        { header: "Minutes Played", field: "minutesPlayed", required: false, example: 2400, type: "number" },
      ],
    },
    matches: {
      entity: "matches",
      columns: [
        { header: "Competition", field: "competitionName", required: false, example: "Dire Dawa League", type: "lookup", lookup: { model: "Competition", displayField: "name" } },
        { header: "Season", field: "season", required: false, example: "2025-26", type: "string" },
        { header: "Division", field: "division", required: false, example: "Premier", type: "string" },
        { header: "Home Team", field: "homeTeamName", required: true, example: "Dire Dawa Stars", type: "lookup", lookup: { model: "Team", displayField: "name" } },
        { header: "Away Team", field: "awayTeamName", required: true, example: "East Africa SC", type: "lookup", lookup: { model: "Team", displayField: "name" } },
        { header: "Home Score", field: "homeScore", required: false, example: 2, type: "number" },
        { header: "Away Score", field: "awayScore", required: false, example: 1, type: "number" },
        { header: "Status", field: "status", required: false, example: "FT", type: "enum", enum: ["UPCOMING", "LIVE", "FT", "POSTPONED", "CANCELLED"] },
        { header: "Minute", field: "minute", required: false, example: 90, type: "number" },
        { header: "Date", field: "date", required: true, example: "2025-08-15", type: "date" },
        { header: "Time", field: "timeField", required: false, example: "15:00", type: "string" },
        { header: "Venue", field: "venue", required: false, example: "Dire Dawa Stadium", type: "string" },
        { header: "Referee", field: "referee", required: false, example: "Abebe Tadesse", type: "string" },
        { header: "Attendance", field: "attendance", required: false, example: 12000, type: "number" },
      ],
    },
    competitions: {
      entity: "competitions",
      columns: [
        { header: "Name", field: "name", required: true, example: "Dire Dawa League", type: "string" },
        { header: "Short Name", field: "shortName", required: false, example: "DDL", type: "string" },
        { header: "Country", field: "country", required: false, example: "Ethiopia", type: "string" },
        { header: "Region", field: "region", required: false, example: "Dire Dawa", type: "string" },
        { header: "Level", field: "level", required: false, example: "Professional", type: "string" },
        { header: "Type", field: "type", required: false, example: "League", type: "string" },
        { header: "Season", field: "season", required: false, example: "2025-26", type: "string" },
        { header: "Description", field: "description", required: false, example: "Top tier local league.", type: "string" },
        { header: "Logo", field: "logo", required: false, example: "/uploads/comp-logo.png", type: "string" },
        { header: "Color", field: "color", required: false, example: "#16A34A", type: "string" },
        { header: "Status", field: "status", required: false, example: "PUBLISHED", type: "enum", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        { header: "Sort Order", field: "sortOrder", required: false, example: 1, type: "number" },
      ],
    },
    cities: {
      entity: "cities",
      columns: [
        { header: "Name", field: "name", required: true, example: "Dire Dawa", type: "string" },
        { header: "Region", field: "region", required: true, example: "Dire Dawa", type: "string" },
        { header: "City Type", field: "cityType", required: false, example: "Chartered City", type: "string" },
        { header: "Sub-city", field: "subcity", required: false, example: "Dechatu", type: "string" },
        { header: "Woreda", field: "woreda", required: false, example: "Woreda 3", type: "string" },
        { header: "Kebele", field: "kebele", required: false, example: "Kebele 5", type: "string" },
        { header: "Logo", field: "logo", required: false, example: "/uploads/city-logo.png", type: "string" },
        { header: "Description", field: "description", required: false, example: "Second largest city in Ethiopia.", type: "string" },
        { header: "Latitude", field: "latitude", required: false, example: 9.56, type: "number" },
        { header: "Longitude", field: "longitude", required: false, example: 41.87, type: "number" },
        { header: "Featured", field: "isFeatured", required: false, example: true, type: "boolean" },
        { header: "Status", field: "status", required: false, example: "PUBLISHED", type: "enum", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        { header: "Sort Order", field: "sortOrder", required: false, example: 1, type: "number" },
      ],
    },
    news: {
      entity: "news",
      columns: [
        { header: "Title", field: "title", required: true, example: "Dire Dawa Stars Win Championship", type: "string" },
        { header: "Summary", field: "summary", required: false, example: "Stars clinch title after dramatic final match.", type: "string" },
        { header: "Content", field: "content", required: false, example: "Full article content here...", type: "string" },
        { header: "Category", field: "category", required: false, example: "Match Report", type: "string" },
        { header: "Author", field: "author", required: false, example: "John Reporter", type: "string" },
        { header: "Cover Image", field: "coverImage", required: false, example: "/uploads/news-cover.jpg", type: "string" },
        { header: "Published At", field: "publishedAt", required: false, example: "2025-08-16", type: "date" },
        { header: "Status", field: "status", required: false, example: "PUBLISHED", type: "enum", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
        { header: "Featured", field: "featured", required: false, example: true, type: "boolean" },
      ],
    },
    media: {
      entity: "media",
      columns: [
        { header: "Filename", field: "filename", required: false, example: "team-logo.png", type: "string" },
        { header: "URL", field: "url", required: true, example: "/uploads/team-logo.png", type: "string" },
        { header: "MIME Type", field: "mimeType", required: false, example: "image/png", type: "string" },
        { header: "Size", field: "size", required: false, example: 245678, type: "number" },
        { header: "Width", field: "width", required: false, example: 500, type: "number" },
        { header: "Height", field: "height", required: false, example: 500, type: "number" },
        { header: "Category", field: "category", required: false, example: "TEAM_LOGO", type: "enum", enum: ["TEAM_LOGO", "PLAYER_PHOTO", "NEWS_COVER", "COMPETITION_LOGO", "HOMEPAGE", "OTHER"] },
      ],
    },
    users: {
      entity: "users",
      columns: [
        { header: "Name", field: "name", required: true, example: "Admin User", type: "string" },
        { header: "Email", field: "email", required: true, example: "admin@example.com", type: "string" },
        { header: "Username", field: "username", required: false, example: "adminuser", type: "string" },
        { header: "Password", field: "password", required: false, example: "SecurePass123", type: "string" },
        { header: "Role", field: "role", required: false, example: "ADMIN", type: "enum", enum: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
        { header: "Status", field: "status", required: false, example: "ACTIVE", type: "enum", enum: ["ACTIVE", "INACTIVE"] },
      ],
    },
  };

  const t = templates[entity];
  if (!t) throw new Error(`Unknown entity: ${entity}`);
  return t;
}

export function slugify(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `article-${Date.now()}`;
}

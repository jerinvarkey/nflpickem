# St. G's NFL Pick'em 2025-2026

A real-time NFL playoff pick'em app with live scores from ESPN, hidden picks until kickoff, and automatic scoring.

![NFL Pick'em Screenshot](screenshot.png)

## Features

✅ **Live Scores** - Auto-updates from ESPN every 30 seconds during games  
✅ **Hidden Picks** - Picks are hidden from other players until kickoff  
✅ **Smart Scoring** - Base points + seed bonus rewards underdog picks  
✅ **Mobile Friendly** - Responsive design works on all devices  
✅ **Admin Mode** - Password-protected admin to manage picks and results  
✅ **No Database Required** - Works out of the box (add Supabase for persistence)

## Quick Start

### Deploy to Vercel (Easiest)

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Deploy!

That's it! The app works without any configuration.

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Scoring System

| Round | Base Points | Formula | Example |
|-------|-------------|---------|---------|
| Wild Card | 1 | 1 + seed | #7 seed win = 8 pts |
| Divisional | 2 | 2 + seed | #6 seed win = 8 pts |
| Conference | 4 | 4 + seed | #5 seed win = 9 pts |
| Super Bowl | 8 | 8 + seed | #4 seed win = 12 pts |

**Picking underdogs pays off!** A #7 seed winning in Wild Card is worth 8 points vs just 2 for a #1 seed.

## Admin Mode

Click "⚙️ Admin" and enter password: `stgs2026`

Admin can:
- View all picks (even hidden ones)
- Manually override results if needed

To change the password, set the `ADMIN_PASSWORD` environment variable in Vercel.

## Customization

### Update Team Seeding

Edit the `TEAM_SEEDS` object in `app/page.tsx`:

```typescript
const TEAM_SEEDS = {
  'Broncos': { seed: 1, conference: 'AFC' },
  // ... update for your season
}
```

### Add/Remove Players

Edit the `initialPlayers` array:

```typescript
const initialPlayers = ['Jerin', 'Jijesh', 'Jaison', ...]
```

### Pre-populate Picks

Edit the `initialPicks` object:

```typescript
const initialPicks = {
  'PlayerName': {
    'wc-1': 'Patriots',  // Wild Card game 1
    'div-1': 'Bills',    // Divisional game 1
    // ...
  }
}
```

## Adding Data Persistence (Optional)

For picks to persist across page refreshes:

### Option 1: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Create table:

```sql
create table picks (
  id serial primary key,
  player text not null,
  game_id text not null,
  pick text not null,
  created_at timestamp default now(),
  unique(player, game_id)
);
```

4. Add environment variables to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option 2: Vercel KV

Coming soon - simpler key-value storage option.

## Tech Stack

- **Next.js 14** - React framework
- **ESPN API** - Free, no key required
- **Tailwind-free** - Pure CSS, no build complexity

## API Reference

The app uses ESPN's public scoreboard API:

```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
```

This returns all current NFL games with:
- Teams, scores, records
- Game status (scheduled/live/final)
- Kickoff times
- Quarter/clock for live games

## License

MIT - Use however you want!

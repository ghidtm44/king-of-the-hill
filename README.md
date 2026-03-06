# King of the Hill - Daily Battle Arena

A pixelated retro web game where players compete for the most points in a 24-hour daily cycle.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database setup

Run the SQL migration in your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Execute the SQL

### 3. Environment (optional)

Create `.env` for production:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy to Netlify

```bash
npm run build
```

Then deploy the `dist` folder to Netlify, or connect your repo for automatic deploys.

## Game Rules

- **12pm EST**: Game begins
- **Each hour**: Allocate attack points, buy items
- **Last second of each hour**: Results evaluated
- **11am EST**: Winner crowned, Hall of Fame updated

### Classes
- **Attacker (7/3)**: High attack, low defense
- **Defender (3/7)**: Low attack, high defense  
- **Balanced (5/5)**: Equal attack and defense

### Combat
- If total attack against you > your defense: Take damage to health
- If total attack against you < your defense: Gain the difference as points!

## Tech Stack

- React + Vite
- Supabase (database)
- Netlify (hosting)

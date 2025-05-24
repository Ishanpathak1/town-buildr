# Lo-Fi Town Builder

A cooperative, relaxing tile-placement game where multiple players can build a town together in real-time. Features soothing lo-fi music and a calm atmosphere.

## Features

- **Cooperative Building**: Place tiles on a shared 20x20 grid in real-time
- **Multiple Tile Types**: Forest 🌲, House 🏠, Market 🏪, Water 💧, etc.
- **Real-time Updates**: See other players' cursors and tile placements instantly
- **Lo-Fi Music**: Relaxing background music while you build
- **Voting System**: Vote on special events every 2 minutes

## Tech Stack

- **Frontend**: React with Vite and TypeScript
- **Real-time Multiplayer**: Supabase Realtime
- **Graphics**: Pixi.js for tile-based 2D rendering
- **Audio**: Howler.js for background lo-fi music
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm or yarn
- A Supabase account and project

### Setup Supabase

1. Create a new Supabase project
2. Create a table called `tiles` with the following columns:
   - `id` (uuid, primary key)
   - `x` (integer, not null)
   - `y` (integer, not null)
   - `type` (varchar, not null)
   - `placed_by` (varchar)

3. Create a table called `players` with the following columns:
   - `id` (varchar, primary key)
   - `cursor` (jsonb, not null)
   - `last_active` (timestamp with time zone)

4. Enable Realtime for both tables

### Environment Setup

Create a `.env` file in the project root with your Supabase credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Audio Files

1. Place lo-fi music files in the `public/audio` directory:
   - `lofi-background.mp3` - Main background music
   - `place.mp3` - Sound effect for placing a tile
   - `click.mp3` - Sound effect for UI interactions

### Installation

```bash
# Clone the repository (if using git)
git clone <repository-url>
cd lo-fi-town-builder

# Install dependencies
npm install

# Start the development server
npm run dev
```

## How to Play

1. Select a tile type from the palette on the left
2. Click on the grid to place the selected tile
3. See other players' cursors as they move around
4. Vote on events every 2 minutes
5. Enjoy building a beautiful town together!

## License

MIT

## Credits

Built with ❤️ for relaxing collaborative play.

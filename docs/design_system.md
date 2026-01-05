# Design System Guide

## 1. Design Principles
- **Dynamic & Energetic**: Use high-contrast colors and subtle motion to reflect the energy of sports.
- **Data-First**: Stats and numbers should be prominent, readable, and beautiful (Chewy font for numbers?).
- **Glassmorphism**: Use modern translucent cards against dark/vibrant backgrounds for a premium feel.
- **Mobile Optimized**: Touch targets must be >44px. Bottom navigation for core views.

## 2. Color Palette (Tailwind)

### Primary (Brand)
- `primary-500`: `#00E676` (Vibrant Green - Pitch flavor)
- `primary-600`: `#00C853` (Action pressed)
- `accent-500`: `#2979FF` (Electric Blue - Information/Link)

### Neutral (Dark Mode Base)
- `canvas-900`: `#121212` (App Background)
- `surface-800`: `#1E1E1E` (Card Background)
- `surface-700`: `#2C2C2C` (Input/Hover)
- `text-100`: `#FFFFFF` (Heading)
- `text-400`: `#A1A1AA` (Body/Subtext)

### Functional
- `constructive`: `#00E676` (Win / Goal)
- `destructive`: `#FF1744` (Loss / Delete / Error)
- `caution`: `#FFC400` (Draw / Warning)

## 3. Typography
- **Headings**: `font-sans` (Inter or Pretendard), Weight 700. Tight tracking.
- **Body**: `font-sans` (Inter or Pretendard), Weight 400.
- **Numbers/Score**: `font-mono` or `Oswald/Bebas Neue` for large score displays. `tracking-widest`.

## 4. Components

### 4.1. Buttons
- **Primary**: `bg-primary-500 text-black font-bold roounded-xl hover:scale-105 transition-transform`
- **Secondary**: `bg-surface-700 text-white font-medium rounded-xl border border-white/10`
- **Ghost**: `text-text-400 hover:text-white`

### 4.2. Cards (The "Match Card")
```html
<div class="bg-surface-800/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl">
  <!-- Content -->
</div>
```

### 4.3. Inputs
- Minimalist style.
- `bg-surface-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none`

## 5. Micro-interactions
- **Touch Feedback**: All interactive elements should have `active:scale-95` feedback.
- **List Loading**: Skeleton loaders with shimmer effect (`animate-pulse`).
- **Goal Celebration**: Confetti or subtle particle explosion when a goal record is added.

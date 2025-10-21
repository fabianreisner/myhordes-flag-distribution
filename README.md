# 🧟 MyHordes Flag Distribution Simulator

A Monte Carlo simulation tool to calculate zombie attack distribution probabilities in [MyHordes](https://myhordes.eu), with support for flag-based attraction mechanics.

## 🎯 Overview

This script simulates 1 million zombie attacks to determine the probability distribution of how many zombies each citizen receives during a night attack. It supports two modes:

- **Mode 1: No Flag Distribution** - Pure random weighted distribution (baseline)
- **Mode 2: Flag Distribution** - Citizens with flags attract 2.5% of attacking zombies each, plus their random share

## ✨ New Season Changes

This version has been updated for **Season 18** mechanics using the official game code:

✅ **Added**: Season 18 cubic zombie growth formula (extracted from attack estimator)  
✅ **Added**: Active zombie factor system based on game conditions  
✅ **Added**: Proper flag attraction mechanics (2.5% per flag)  
✅ **Added**: Door state, building level, chaos, and devastated effects  
✅ **Added**: Double-roll probability distribution (biases toward lower zombie counts)  
✅ **Removed**: Old simplified player/soul-based formula  

See `SEASON_18_FORMULA.md` for detailed explanation of the zombie calculation formula.

## ⚙️ Configuration

Edit the configuration section at the top of `distribution.php`:

```php
// Mode selection
$enable_flags = true;          // false = Mode 1 (no flags), true = Mode 2 (flags)
$num_flags = 3;                // Number of flag holders

// Game state
$town_day = 46;                // Current day +1 for night behavior
$players_alive = 39;           // Number of alive citizens in town
$town_population = 40;         // Total population (for scaling)

// Environmental conditions
$door_open = false;            // Is the door open?
$door_state_seconds = null;    // Seconds door has been open (null if closed)
$house_level = 1;              // Average building level (1-5)
$chaos = false;                // Chaos status
$devastated = false;           // Devastated status
$town_defense = 0;             // Total defense
$red_souls = 0;                // Number of red souls

// Simulation
$simulations = 1000000;        // Number of simulations to run
```

## 🚀 Usage

```bash
php distribution.php
```

## � Example Output

### Mode 2: With Flags
```
================================================================================
  MYHORDES FLAG DISTRIBUTION SIMULATION
================================================================================

Mode: Flag Distribution (Mode 2)
Attack Night of 45 -> 46

Game Conditions:
  Players Alive: 39
  Targets per Night: 39
  Door: Closed
  Building Level: 1

Flag Configuration:
  Flags: 3
  Average Zombies per Flag: ~7.66 (2.5% of attacking)
  Average Total Attracted: ~22.98
  Average Remaining for Distribution: ~283.47

Attack Statistics:
  Average Attacking Zombies: 306.4493
  Simulations: 1,000,000

Distribution Probabilities:
  P(attacks == 0): 3.0118%
  P(attacks == 1): 6.1409%
  P(attacks == 2): 6.2345%
  P(attacks == 3): 6.2781%
  P(attacks == 4): 6.3675%
  P(attacks == 5): 6.5133%
  P(attacks == 6): 6.5795%
  P(attacks >= 7+): 58.8743%
```

### Mode 1: No Flags  
```
Mode: No Flags (Mode 1)
Attack Night of 45 -> 46

Attack Statistics:
  Average Attacking Zombies: 306.4188

Distribution Probabilities:
  P(attacks == 0): 3.0218%
  P(attacks == 1): 6.1541%
  P(attacks >= 7+): 58.9084%
```

## 🎮 Game Mechanics Implemented

### Active Zombie Factor
The percentage of zombies that can actually attack is determined by:
- **Base**: Random 45-55
- **Door**: Closed +0, Open <30min +10, Open >30min +25
- **Building Level**: Scaled by population
- **Chaos**: +10
- **Devastated**: +10

### In-Town Target Selection
```
in_town = min(10 + 2 * floor(max(0, day - 10) / 2), total_alive)
```
- Days 1-10: Up to 10 targets
- Days 11-12: Up to 12 targets
- Days 13-14: Up to 14 targets, etc.

### Flag Attraction (Mode 2)
Each flag holder attracts: `round(attacking * 0.025)` zombies (2.5%)

These are subtracted from the main pool, then added back after random distribution.

**Important**: Flag holders receive guaranteed attraction + their random share!

### Weighted Random Distribution
1. Each target gets random weight (0.0-1.0)
2. One "unlucky" target gets +0.3 boost
3. Weights normalized, zombies allocated proportionally
4. Leftovers distributed randomly

## 📦 Requirements

- PHP 7.4 or newer (for arrow functions)
- CLI access

## 📚 Documentation Files

- `distribution.php` - CLI simulation script
- `simulate.php` - Web API backend
- `index.html` - Web interface
- `README.md` - This file
- `SEASON_18_FORMULA.md` - **Detailed zombie calculation formula explanation**
- `MIGRATION_GUIDE.md` - Migration documentation from old version
- `IMPLEMENTATION_PLAN.md` - Technical architecture and design
- `STATS_ENHANCEMENT.md` - Min/max/avg statistics documentation

## 📌 Notes

- Based on official MyHordes game mechanics by Motion Twin
- Updated for current season by analyzing the myhordes-master codebase
- Intended for community use and game theorycrafting
- With 1M simulations: ±0.02% accuracy (95% confidence)

## 🎯 Use Cases

- **Town Planning**: Estimate how many flags provide optimal coverage
- **Personal Risk**: Calculate your attack probability with/without a flag
- **Defense Strategy**: Compare different game conditions (door open/closed, building levels)
- **Theorycrafting**: Understand the math behind zombie distribution

## 🙏 Credits

Game mechanics by Motion Twin  
Simulation and analysis by the MyHordes community  
Updated for current season using myhordes-master codebase

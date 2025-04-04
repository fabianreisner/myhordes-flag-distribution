# 🧟 Zombie Attack Spread Simulator for MyHordes

This PHP script simulates the nightly zombie attack distribution in the browser game [MyHordes](https://myhordes.eu) under specific conditions.

## 🧰 Purpose

With the introduction of the **Flag** item in MyHordes, players can attract **2.5%** of all overflowing zombies to themselves during the night. In a town with **40 players**, this means zombies should be distributed evenly across all citizens — with a few leftovers due to rounding.

This script helps simulate **how zombies are actually spread**, including:
- The effect of **random distribution** when dividing leftover zombies.
- The odds of **being attacked**, and by how many zombies.
- The **impact of the "unlucky" bonus** (one citizen gets slightly more attention).

## 📈 What It Does

- Calculates how many zombies are **in town** and **attacking** on a given day.
- Distributes those zombies across the current citizens, simulating the same conditions as during an attack in MyHordes.
- Boosts one random citizen's attack weight by **+0.3** to reflect the known bias in distribution.
- Repeats the simulation **1,000,000 times** to produce accurate probability results.

### Example Output
    Day: 10
    P(attacks == 0): 27.3541%
    P(attacks == 1): 37.4910%
    P(attacks == 2): 23.8205%
    P(attacks == 3): 8.1234%
    P(attacks == 4): 2.3391%
    P(attacks == 5): 0.6710%
    P(attacks == 6): 0.1612%
    P(attacks >= 7+): 0.0397%
## ⚙️ How It Works

1. **Determine players in town** (`$in_town`) based on current game day.
2. **Calculate total zombies** using in-game logic:
   - Based on day
   - Player house level
   - number of players (alive & in-town)
3. **Apply flag effect**:
   - Each of 40 players gets ~2.5% of overflow zombies.
   - Remainders are randomly distributed.
4. **Simulate millions of attacks** to determine outcome probabilities.

## 📦 Requirements

- PHP 7.4 or newer
- CLI access to run the script:

```bash
php zombie_simulator.php
```

## 📌 Notes

- Based on official game mechanics and observed in-game behavior.
- Intended for community use and game theorycrafting, not affiliated with the official MyHordes devs.

## 🧪 Simulation Goals

- Understand how evenly zombie attacks are spread using flags.
- Estimate personal risk during night attacks.
- Help town planners make informed decisions about flag usage and defenses.
<?php

// ============================================================================
// CONFIGURATION
// ============================================================================

// Mode selection
$enable_flags = true;          // Set to false for Mode 1 (no flags), true for Mode 2 (flag distribution)
$num_flags = 40;               // Number of citizens who have flags (0-40). Default: 40 (everyone)

// Game state
$town_day = 46;                // Current day +1 for how the night behaves
$players_alive = 39;           // Number of alive citizens in town
$town_population = 40;         // Total town population (for scaling calculations)

// Environmental conditions
$door_open = false;            // Is the town door open?
$door_state_seconds = null;    // How long has door been in this state? (null if closed, int seconds if open)
$house_level = 1;              // Average/tercile building level (1-5). 1=basic, 2=barracks, etc.
$chaos = false;                // Is town in chaos?
$devastated = false;           // Is town devastated?
$town_defense = 0;             // Total town defense (for overflow calculation)
$red_souls = 0;                // Number of red souls (affects zombie count)

// Simulation settings
$simulations = 1000000;        // 1 million simulations
$attack_distribution = array_fill(0, 8, 0); // Stores counts for 0-6, and 7+
$average_attacking = 0;

// Internal variables
$num_in_town = 10; // Default, updated dynamically
$all_targets = range(1, $players_alive); // Example pool, adjust as needed

// Compute $in_town based on the day
$num_in_town = min(
    10 + 2 * floor(max(0, $town_day - 10) / 2),
    ceil(count($all_targets) * 1.0)
);

// ============================================================================
// ZOMBIE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate the active zombie factor based on game conditions
 * This determines what percentage of zombies can actually attack citizens (0.0 to 1.0)
 * 
 * @return float Factor between 0.0 and 1.0
 */
function calculateActiveZombieFactor($players_alive, $door_open = false, $door_state_seconds = null, $house_level = 1, $chaos = false, $devastated = false, $town_population = 40) {
    $targets = $players_alive;
    $b_level = $house_level;
    
    // Base random component (45-55)
    $level = mt_rand(45, 55);
    
    // Door state bonus
    if ($door_open && $door_state_seconds !== null) {
        if ($door_state_seconds < 1800) {  // <30 minutes
            $level += 10;
        } else {
            $level += 25;
        }
    }
    // Note: If door is closed, no bonus
    
    // Scale by targets and building level
    $level *= ((max(15, $targets) + (max(0, $b_level) * 2)) / $town_population);
    
    // Chaos and devastated bonuses
    $level += ($chaos ? 10 : 0);
    $level += ($devastated ? 10 : 0);
    
    // Return factor between 0.0 and 1.0
    return max(0, min($level / 100.0, 1.0));
}

/**
 * Calculate total zombies that attack the town (before defense)
 * 
 * @return int Total zombie count
 */
function calculateTotalZombies($town_day, $players_alive, $red_souls = 0) {
    // Base calculation from original script
    $base = ($players_alive / 3.0) * $town_day;
    
    // Red soul multiplier (4% per red soul as placeholder)
    $soul_factor = 1 + (0.04 * $red_souls);
    
    return round($base * $soul_factor);
}

/**
 * Calculate attacking zombies considering active factor and defense
 * 
 * @return int Final number of zombies that can attack citizens
 */
function calculateAttackingZombies($town_day, $players_alive, $defense = 0, $door_open = false, $door_state_seconds = null, $house_level = 1, $chaos = false, $devastated = false, $red_souls = 0, $town_population = 40) {
    // Total zombies attacking the town
    $total_zombies = calculateTotalZombies($town_day, $players_alive, $red_souls);
    
    // Zombies that get through defense
    $overflow = max(0, $total_zombies - $defense);
    
    // Active factor limits how many can actually attack citizens
    $active_factor = calculateActiveZombieFactor($players_alive, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population);
    $max_active = round($total_zombies * $active_factor);
    
    // Final attacking zombies
    return min($max_active, $overflow);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Randomly selects N elements from an array
 * @param array $a
 * @param int $num
 * @param bool $force_array
 * @return mixed|array|null
 */
function pick(array $a, int $num = 1, bool $force_array = false): mixed {
    if ($num <= 0 || empty($a)) return $force_array ? [] : null;
    elseif ($num === 1) return $force_array ? [$a[array_rand($a, 1)]] : $a[array_rand($a, 1)];
    elseif (count($a) === 1) return array_values($a);
    else return array_map(fn($k) => $a[$k], array_rand($a, min($num, count($a))));
}

for ($sim = 0; $sim < $simulations; $sim++) {
    // Calculate attacking zombies using new system
    $attacking = calculateAttackingZombies(
        $town_day, 
        $players_alive, 
        $town_defense, 
        $door_open, 
        $door_state_seconds, 
        $house_level, 
        $chaos, 
        $devastated,
        $red_souls,
        $town_population
    );
    
    $average_attacking += $attacking;
    
    // Pick up to $num_in_town targets
    $targets = pick($all_targets, $num_in_town, true);
    $num_targets = count($targets);
    
    // ========================================================================
    // FLAG DISTRIBUTION LOGIC
    // ========================================================================
    
    // Handle flag attraction if enabled
    $flag_holders = [];
    $remaining_attacking = $attacking;
    
    if ($enable_flags && $num_flags > 0 && $num_targets > 0) {
        // Randomly assign flags to some of the selected targets
        $num_flags_to_assign = min($num_flags, $num_targets);
        
        if ($num_flags_to_assign === 1) {
            $flag_holder_indices = [mt_rand(0, $num_targets - 1)];
        } else {
            $flag_holder_indices = array_rand(range(0, $num_targets - 1), $num_flags_to_assign);
            if (!is_array($flag_holder_indices)) $flag_holder_indices = [$flag_holder_indices];
        }
        
        // Calculate attraction per flag (2.5% of attacking zombies)
        $zombies_per_flag = (int)round($attacking * 0.025);
        $total_attracted = $zombies_per_flag * count($flag_holder_indices);
        
        // Store flag holders and their guaranteed zombies
        foreach ($flag_holder_indices as $idx) {
            $flag_holders[$idx] = $zombies_per_flag;
        }
        
        // Subtract from main pool for random distribution
        $remaining_attacking = max(0, $attacking - $total_attracted);
    }
    
    // ========================================================================
    // WEIGHTED RANDOM DISTRIBUTION (of remaining zombies)
    // ========================================================================

    // ========================================================================
    // WEIGHTED RANDOM DISTRIBUTION (of remaining zombies)
    // ========================================================================

    // Generate random weights
    $repartition = array_map(fn() => mt_rand() / mt_getrandmax(), range(0, $num_targets - 1));

    // One unlucky target gets +0.3 boost
    $unlucky_index = mt_rand(0, $num_targets - 1);
    $repartition[$unlucky_index] += 0.3;

    // Normalize weights
    $sum = array_sum($repartition);
    foreach ($repartition as &$value) {
        $value /= $sum;
    }
    unset($value);

    // Allocate attacks from remaining pool
    $attack_counts = array_map(fn($p) => max(0, min($remaining_attacking, round($p * $remaining_attacking))), $repartition);
    $remaining_attacks = $remaining_attacking - array_sum($attack_counts);

    // Distribute leftover attacks randomly
    while ($remaining_attacks > 0 && $num_targets > 0) {
        $random_index = mt_rand(0, $num_targets - 1);
        $attack_counts[$random_index]++;
        $remaining_attacks--;
    }
    
    // Add flag zombies to flag holders (they get guaranteed attraction + their random share)
    foreach ($flag_holders as $idx => $flag_zombies) {
        $attack_counts[$idx] += $flag_zombies;
    }

    // Count occurrences of attack numbers
    foreach ($attack_counts as $count) {
        if ($count >= 7) {
            $attack_distribution[7]++; // 7+
        } elseif ($count >= 1 && $count <= 6) {
            $attack_distribution[$count]++;
        }
    }

    $zero_attacks = $num_targets - count(array_filter($attack_counts, fn($c) => $c > 0));
    $attack_distribution[0] += $zero_attacks;
}

// Convert counts to probabilities
$total_counts = array_sum($attack_distribution);

echo "================================================================================\n";
echo "  MYHORDES FLAG DISTRIBUTION SIMULATION\n";
echo "================================================================================\n\n";

echo "Mode: " . ($enable_flags ? "Flag Distribution (Mode 2)" : "No Flags (Mode 1)") . "\n";
echo "Attack Night of ".($town_day - 1) . " -> ". $town_day."\n\n";

echo "Game Conditions:\n";
echo "  Players Alive: {$players_alive}\n";
echo "  Targets per Night: {$num_in_town}\n";
echo "  Door: " . ($door_open ? "Open (" . ($door_state_seconds !== null ? $door_state_seconds . "s" : "unknown") . ")" : "Closed") . "\n";
echo "  Building Level: {$house_level}\n";
echo "  Chaos: " . ($chaos ? "Yes" : "No") . "\n";
echo "  Devastated: " . ($devastated ? "Yes" : "No") . "\n";
echo "  Town Defense: {$town_defense}\n";
echo "  Red Souls: {$red_souls}\n";

if ($enable_flags) {
    $avg_zombies_per_flag = round($average_attacking / $simulations * 0.025, 2);
    echo "\nFlag Configuration:\n";
    echo "  Flags: {$num_flags}\n";
    echo "  Average Zombies per Flag: ~{$avg_zombies_per_flag} (2.5% of attacking)\n";
    echo "  Average Total Attracted: ~" . round($avg_zombies_per_flag * $num_flags, 2) . "\n";
    echo "  Average Remaining for Distribution: ~" . round($average_attacking / $simulations - ($avg_zombies_per_flag * $num_flags), 2) . "\n";
}

echo "\nAttack Statistics:\n";
echo "  Average Attacking Zombies: ".number_format($average_attacking / $simulations, 4) . "\n";
echo "  Simulations: " . number_format($simulations) . "\n";

echo "\nDistribution Probabilities:\n";
foreach ($attack_distribution as $attacks => $count) {
    $prob = $count / $total_counts * 100;
    if ($attacks < 7) {
        echo "  P(attacks == $attacks): " . number_format($prob, 4) . "%\n";
    } else {
        echo "  P(attacks >= 7+): " . number_format($prob, 4) . "%\n";
    }
}

echo "\n================================================================================\n";

?>

<?php
header('Content-Type: application/json');

// Get input from POST
$input = json_decode(file_get_contents('php://input'), true);

// Extract configuration
$mode = $input['mode'];
$enable_flags = $mode === 'with-flags';
$custom_attacking_zombies = isset($input['customAttackingZombies']) && $input['customAttackingZombies'] !== null ? (int)$input['customAttackingZombies'] : null;
$use_custom_zombies = $custom_attacking_zombies !== null;
$num_flags = (int)$input['numFlags'];
$town_day = (int)$input['townDay'];
$players_alive = (int)$input['playersAlive'];
$town_population = (int)$input['townPopulation'];
$town_defense = (int)$input['townDefense'];
$house_level = (int)$input['houseLevel'];
$chaos = (bool)$input['chaos'];
$devastated = (bool)$input['devastated'];
$simulations = (int)$input['simulations'];

// Personal defense tiers - array of {defense: number, count: number}
// Example: [{defense: 60, count: 38}, {defense: 61, count: 2}]
$personal_defense_tiers = isset($input['personalDefenseTiers']) ? $input['personalDefenseTiers'] : [];

// Door state
$door_open = $input['doorState'] !== 'closed';
$door_state_seconds = match($input['doorState']) {
    'open-recent' => 1000,  // <30min
    'open-long' => 3600,    // >30min
    default => null
};

// ============================================================================
// ZOMBIE CALCULATION FUNCTIONS
// Based on: myhordes-master/src/Service/NightlyHandler.php
// and: myhordes-master/src/EventListener/Game/Town/Basic/Buildings/BuildingQueryListener.php
// ============================================================================

/**
 * Calculate the active zombie factor (percentage of zombies that are "active")
 * 
 * Source: BuildingQueryListener.php, lines 99-137 (calculateMaxActiveZombies)
 * 
 * @param int $citizens_in_town - Citizens alive AND in town (not in desert) - used as targets count
 * @param bool $door_open - Whether the town door is open
 * @param int|null $door_state_seconds - How long the door has been in current state
 * @param int $house_level - Highest building level in town
 * @param bool $chaos - Is town in chaos
 * @param bool $devastated - Is town devastated
 * @param int $town_population - Original town population (40 for normal towns)
 * @return float - Factor between 0.0 and 1.0
 */
function calculateActiveZombieFactor($citizens_in_town, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population) {
    // Source: BuildingQueryListener.php line 104-105
    // $targets = citizens who are alive AND in town (not in desert)
    $targets = $citizens_in_town;
    $b_level = $house_level;
    
    // Source: BuildingQueryListener.php line 122-128
    // Base random component (45-55)
    $level = mt_rand(45, 55);
    
    // Door state bonus
    // Source: BuildingQueryListener.php lines 123-127
    if ($door_open && $door_state_seconds !== null) {
        if ($door_state_seconds < 1800) {  // <30 minutes
            $level += 10;   // Door opened <30min before attack
        } else {
            $level += 25;   // Door open for longer
        }
    }
    
    // Scale by targets and building level
    // Source: BuildingQueryListener.php line 130
    $level *= ((max(15, $targets) + (max(0, $b_level) * 2)) / $town_population);
    
    // Chaos and devastated bonuses
    // Source: BuildingQueryListener.php lines 132-134
    $level += ($chaos ? 10 : 0);
    $level += ($devastated ? 10 : 0);
    
    // Return factor between 0.0 and 1.0
    // Source: BuildingQueryListener.php line 136
    return max(0, min($level / 100.0, 1.0));
}

/**
 * Calculate total zombies for a given day
 * 
 * Source: Based on PrepareZombieAttackEstimationAction.php (referenced in FORMULA_REFERENCE.md)
 */
function calculateTotalZombies($town_day, $attack_mode = 'normal') {
    $const_ratio_base = 0.5;
    $const_ratio_low = 0.75;
    
    $max_ratio = match($attack_mode) {
        'hard' => 3.1,
        'easy' => $const_ratio_low,
        default => 1.1,
    };
    
    $ratio_min = ($town_day <= 3 ? $const_ratio_low : $max_ratio);
    $ratio_max = ($town_day <= 3 ? ($town_day <= 1 ? $const_ratio_base : $const_ratio_low) : $max_ratio);
    
    $min = round( $ratio_min * pow(max(1, $town_day - 1) * 0.75 + 2.5, 3) );
    $max = round( $ratio_max * pow($town_day * 0.75 + 3.5, 3) );
    
    // Random value in range
    $value = mt_rand($min, $max);
    
    // Re-roll if above midpoint (double-roll system)
    if ($value > ($min + 0.5 * ($max - $min))) {
        $value = mt_rand($min, $max);
    }
    
    return $value;
}

/**
 * Calculate attacking zombies (after defense and active factor)
 * 
 * Source: NightlyHandler.php lines 688, 1004-1012
 */
function calculateAttackingZombies($town_day, $citizens_in_town, $defense, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $original_population, $attack_mode = 'normal') {
    $total_zombies = calculateTotalZombies($town_day, $attack_mode);
    
    return applyDefenseAndActiveFactor($total_zombies, $defense, $door_open, $citizens_in_town, $door_state_seconds, $house_level, $chaos, $devastated, $original_population);
}

/**
 * Apply defense and active factor to get final attacking zombies
 * 
 * Source: NightlyHandler.php
 * - Line 688: $overflow = !$town->getDoor() ? max(0, $zombies - $def) : $zombies;
 * - Lines 1004-1005: $active_factor = ...; $max_active = round($zombies * $active_factor);
 * - Line 1012: $attacking = min($max_active, $overflow);
 */
function applyDefenseAndActiveFactor($total_zombies, $defense, $door_open, $citizens_in_town, $door_state_seconds, $house_level, $chaos, $devastated, $town_population) {
    // Source: NightlyHandler.php line 688
    // Calculate overflow after defense - BUT only if door is closed!
    // If door is open, defense doesn't count
    if ($door_open) {
        $overflow = $total_zombies;  // No defense when door is open
    } else {
        $overflow = max(0, $total_zombies - $defense);  // Defense only applies when door is closed
    }
    
    // Source: NightlyHandler.php lines 1004-1005
    // Calculate active factor - NOTE: based on TOTAL zombies, not overflow!
    // Source: BuildingQueryListener.php - $targets = citizens alive AND in town
    $active_factor = calculateActiveZombieFactor($citizens_in_town, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population);
    $max_active = round($total_zombies * $active_factor);
    
    // Source: NightlyHandler.php line 1012
    // Attacking = minimum of active zombies and overflow
    return min($max_active, $overflow);
}

function pick(array $a, int $num, bool $force_array = false): mixed {
    if ($num <= 0 || empty($a)) return $force_array ? [] : null;
    elseif ($num === 1) return $force_array ? [$a[array_rand($a, 1)]] : $a[array_rand($a, 1)];
    elseif (count($a) === 1) return array_values($a);
    else return array_map(fn($k) => $a[$k], array_rand($a, min($num, count($a))));
}

// ============================================================================
// RUN SIMULATION
// Based on: NightlyHandler.php lines 997-1065
// ============================================================================

// Source: NightlyHandler.php line 998-1000
// All targets are citizens alive AND in town (not in the desert)
$all_targets = range(1, $town_population);

// Source: NightlyHandler.php lines 1007-1010
// Number of citizens that will be targeted this night
// NOTE: This formula limits targets based on day, but caps at actual population
$in_town = min(
    10 + 2 * floor(max(0, $town_day - 10) / 2),
    $town_population  // Can't target more than are actually in town
);

$attack_distribution = array_fill(0, 8, 0);
$death_distribution = [];  // Track number of deaths per simulation
$simulations_with_deaths = 0;
$average_attacking = 0;
$min_attacking = PHP_INT_MAX;
$max_attacking = 0;
$total_zombies_sum = 0;
$min_total_zombies = PHP_INT_MAX;
$max_total_zombies = 0;
$total_zombies_per_flag = 0;
$total_attracted = 0;
$total_remaining_distributed = 0;
$attacks_broke_defense = 0;

for ($sim = 0; $sim < $simulations; $sim++) {
    // Calculate total zombies (actual game value) - unless overridden
    if ($use_custom_zombies) {
        // Use custom value as total zombies (before defense and active factor)
        $total_zombies = $custom_attacking_zombies;
        
        // Apply defense and active factor just like normal calculation
        // Source: BuildingQueryListener.php - uses citizens in town, not players alive
        $attacking = applyDefenseAndActiveFactor(
            $total_zombies,
            $town_defense,
            $door_open,
            $town_population,  // citizens in town (not in desert)
            $door_state_seconds,
            $house_level,
            $chaos,
            $devastated,
            40  // Original town population for scaling
        );
        
        // Track for statistics (don't skip this when using custom zombies!)
        $total_zombies_sum += $total_zombies;
        $min_total_zombies = min($min_total_zombies, $total_zombies);
        $max_total_zombies = max($max_total_zombies, $total_zombies);
    } else {
        $total_zombies = calculateTotalZombies($town_day, 'normal');
        
        $total_zombies_sum += $total_zombies;
        $min_total_zombies = min($min_total_zombies, $total_zombies);
        $max_total_zombies = max($max_total_zombies, $total_zombies);
        
        // Calculate attacking zombies (after defense and active factor)
        // Source: BuildingQueryListener.php - uses citizens in town for active factor
        $attacking = calculateAttackingZombies(
            $town_day, 
            $town_population,  // citizens in town (not in desert)
            $town_defense, 
            $door_open, 
            $door_state_seconds, 
            $house_level, 
            $chaos, 
            $devastated,
            40,  // Original town population for scaling
            'normal'  // attack_mode: 'easy', 'normal', or 'hard'
        );
    }
    
    $average_attacking += $attacking;
    $min_attacking = min($min_attacking, $attacking);
    $max_attacking = max($max_attacking, $attacking);
    
    // Skip distribution if no zombies broke through
    // Source: NightlyHandler.php line 993 - "if ($overflow <= 0) return;"
    if ($attacking <= 0) {
        continue;
    }
    
    $attacks_broke_defense++;
    
    // ========================================================================
    // FLAG ATTRACTION LOGIC - BEFORE target selection!
    // Source: NightlyHandler.php lines 1015-1029
    // Source: CitizenChanceQueryListener.php lines 390-394
    // 
    // IMPORTANT: In the game, flag attraction is calculated for ALL citizens
    // in town, BEFORE the random target selection. Flag holders receive their
    // attracted zombies regardless of whether they're in the random pick.
    // ========================================================================
    
    // Map of citizen index (in $all_targets) => attracted zombies
    $attract_targets = [];
    $remaining_attacking = $attacking;
    
    if ($enable_flags && $num_flags > 0 && $town_population > 0) {
        // Source: Flags can only be used by citizens in town
        $num_flags_in_town = min($num_flags, $town_population);
        
        // For simulation, randomly select which citizens in town have flags
        // (In real game, this is tracked by tg_flag status on specific citizens)
        if ($num_flags_in_town === 1) {
            $flag_holder_indices = [mt_rand(0, $town_population - 1)];
        } else {
            $flag_holder_indices = array_rand($all_targets, $num_flags_in_town);
            if (!is_array($flag_holder_indices)) $flag_holder_indices = [$flag_holder_indices];
        }
        
        // Source: NightlyHandler.php lines 1015-1022
        // Calculate attraction per flag holder: round(attacking * 0.025)
        foreach ($flag_holder_indices as $idx) {
            $attraction = 0.025;  // CitizenChanceQueryListener.php line 391
            $attracted = (int)round($attacking * $attraction);
            if ($attracted > 0) {
                $attract_targets[$idx] = $attracted;
            }
        }
        
        // Source: NightlyHandler.php line 1027
        // Subtract attracted zombies from the pool BEFORE random distribution
        $detracted = array_sum($attract_targets);
        $remaining_attacking = $attacking - $detracted;
        
        // Track statistics
        $total_attracted += $detracted;
    }
    
    // Track the remaining for proper statistics
    $total_remaining_distributed += $remaining_attacking;
    
    // Source: NightlyHandler.php line 1031
    // Pick random citizens to receive the random distribution
    // NOTE: This is AFTER flag attraction is calculated!
    $targets = pick($all_targets, $in_town, true);
    $num_targets = count($targets);
    
    // Create a mapping from $all_targets index to $targets index
    $target_index_map = array_flip($targets);
    
    // ========================================================================
    // RANDOM DISTRIBUTION OF REMAINING ZOMBIES
    // Source: NightlyHandler.php lines 1040-1065
    // ========================================================================
    
    // Track attacks per citizen (using $all_targets indices)
    // This allows flag holders outside $targets to still receive zombies
    $attack_counts_all = array_fill(0, $town_population, 0);
    
    // Source: NightlyHandler.php lines 1040-1044
    // Create random weights for each target in the random selection
    $repartition = array_fill(0, $num_targets, 0);
    for ($i = 0; $i < $num_targets; $i++) {
        $repartition[$i] = mt_rand() / mt_getrandmax(); // random value between 0 and 1.0
    }
    
    // Source: NightlyHandler.php lines 1046-1048
    // One citizen gets especially unlucky (+0.3 weight)
    if ($num_targets > 0) {
        $repartition[mt_rand(0, $num_targets - 1)] += 0.3;
    }
    
    // Source: NightlyHandler.php line 1050
    $sum = array_sum($repartition);
    
    // Source: NightlyHandler.php lines 1052-1057
    // Normalize and distribute remaining zombies among picked targets
    $attacking_cache = $remaining_attacking;
    for ($i = 0; $i < $num_targets; $i++) {
        $repartition[$i] /= $sum;
        $repartition[$i] = max(0, min($attacking_cache, round($repartition[$i] * $remaining_attacking)));
        $attacking_cache -= $repartition[$i];
        
        // Map back to $all_targets index
        $citizen_idx = $targets[$i] - 1;  // $targets contains 1-based values
        $attack_counts_all[$citizen_idx] = (int)$repartition[$i];
    }
    
    // Source: NightlyHandler.php lines 1059-1062
    // Distribute any remaining zombies due to rounding
    while ($attacking_cache > 0 && $num_targets > 0) {
        $random_target_idx = mt_rand(0, $num_targets - 1);
        $citizen_idx = $targets[$random_target_idx] - 1;
        $attack_counts_all[$citizen_idx] += 1;
        $attacking_cache--;
    }
    
    // Source: NightlyHandler.php lines 1119 and 1121-1124
    // Add attracted zombies to flag holders ON TOP of their random share
    // Flag holders receive attracted zombies REGARDLESS of whether they were in $targets
    foreach ($attract_targets as $citizen_idx => $attracted_zombies) {
        $attack_counts_all[$citizen_idx] += $attracted_zombies;
    }
    
    // Track the maximum attacks any single person received in this simulation
    // This tells us: "In X% of nights, the worst-hit person got Y attacks"
    $max_attacks_this_sim = max($attack_counts_all);
    
    // ========================================================================
    // SURVIVAL CHECK - Compare attacks vs personal defense
    // Source: NightlyHandler.php lines 1073-1080
    // "if ($force > $def) { kill... }"
    // ========================================================================
    if (!empty($personal_defense_tiers)) {
        // Build array of personal defense values for each citizen
        $personal_defenses = [];
        foreach ($personal_defense_tiers as $tier) {
            for ($i = 0; $i < $tier['count']; $i++) {
                $personal_defenses[] = $tier['defense'];
            }
        }
        
        // Sort defenses ascending (lowest first) and attacks descending (highest first)
        // This simulates worst-case: highest attacks hit lowest defense citizens
        sort($personal_defenses);
        $sorted_attacks = $attack_counts_all;
        rsort($sorted_attacks);
        
        // Count deaths in this simulation
        $deaths_this_sim = 0;
        for ($i = 0; $i < min(count($sorted_attacks), count($personal_defenses)); $i++) {
            if ($sorted_attacks[$i] > $personal_defenses[$i]) {
                $deaths_this_sim++;
            }
        }
        
        if (!isset($death_distribution[$deaths_this_sim])) {
            $death_distribution[$deaths_this_sim] = 0;
        }
        $death_distribution[$deaths_this_sim]++;
        
        if ($deaths_this_sim > 0) {
            $simulations_with_deaths++;
        }
    }
    
    if (!isset($attack_distribution[$max_attacks_this_sim])) {
        $attack_distribution[$max_attacks_this_sim] = 0;
    }
    $attack_distribution[$max_attacks_this_sim]++;
}

// Calculate probabilities (only when defense was broken)
$total_counts = array_sum($attack_distribution);
$distribution = [];
$cumulative_distribution = [];
$distribution_stats = [
    'mode' => 0,
    'mode_value' => 0,
    'max_attacks' => 0,
    'p99' => 0,
    'p95' => 0,
    'p90' => 0
];

if ($total_counts > 0) {
    // Sort by attack count
    ksort($attack_distribution);
    
    // Calculate individual probabilities, cumulative probabilities, and find mode
    $cumulative_count = 0;
    $max_prob = 0;
    
    foreach ($attack_distribution as $attacks => $count) {
        // Individual probability (chance of getting exactly this many attacks)
        $prob = $count / $total_counts;
        $distribution[$attacks] = $prob;
        
        // Cumulative probability (chance of getting this many attacks or fewer)
        $cumulative_count += $count;
        $cumulative_prob = $cumulative_count / $total_counts;
        $cumulative_distribution[$attacks] = $cumulative_prob;
        
        // Find mode (peak) - exclude 0 attacks as they're not part of the actual attack distribution
        if ($attacks > 0 && $prob > $max_prob) {
            $max_prob = $prob;
            $distribution_stats['mode'] = $attacks;
            $distribution_stats['mode_value'] = $prob;
        }
        
        $distribution_stats['max_attacks'] = max($distribution_stats['max_attacks'], $attacks);
    }
    
    // Calculate percentiles
    $cumulative = 0;
    foreach ($attack_distribution as $attacks => $count) {
        $cumulative += $count;
        $percentile = ($cumulative / $total_counts) * 100;
        
        if ($percentile >= 90 && $distribution_stats['p90'] === 0) {
            $distribution_stats['p90'] = $attacks;
        }
        if ($percentile >= 95 && $distribution_stats['p95'] === 0) {
            $distribution_stats['p95'] = $attacks;
        }
        if ($percentile >= 99 && $distribution_stats['p99'] === 0) {
            $distribution_stats['p99'] = $attacks;
        }
    }
} else {
    // If defense never broken, all probabilities are 0
    $distribution = [];
    $cumulative_distribution = [];
}

// Calculate percentage of attacks that broke defense
$defense_broken_pct = ($attacks_broke_defense / $simulations) * 100;

// Calculate survival statistics if personal defense tiers were provided
$survival_stats = null;
if (!empty($personal_defense_tiers) && $attacks_broke_defense > 0) {
    $lowest_personal_defense = min(array_column($personal_defense_tiers, 'defense'));
    $total_citizens_tracked = array_sum(array_column($personal_defense_tiers, 'count'));
    
    // Calculate survival rate (percentage of simulations with 0 deaths)
    $simulations_no_deaths = $death_distribution[0] ?? 0;
    $survival_rate = ($simulations_no_deaths / $attacks_broke_defense) * 100;
    
    // Calculate death probability
    $death_probability = ($simulations_with_deaths / $attacks_broke_defense) * 100;
    
    // Calculate average deaths when deaths occur
    $total_deaths = 0;
    $max_deaths = 0;
    foreach ($death_distribution as $deaths => $count) {
        $total_deaths += $deaths * $count;
        $max_deaths = max($max_deaths, $deaths);
    }
    $avg_deaths_when_occur = $simulations_with_deaths > 0 ? $total_deaths / $simulations_with_deaths : 0;
    
    $survival_stats = [
        'lowestPersonalDefense' => $lowest_personal_defense,
        'totalCitizensTracked' => $total_citizens_tracked,
        'survivalRate' => $survival_rate,
        'deathProbability' => $death_probability,
        'simulationsWithDeaths' => $simulations_with_deaths,
        'avgDeathsWhenOccur' => $avg_deaths_when_occur,
        'maxDeathsInSim' => $max_deaths,
        'deathDistribution' => $death_distribution
    ];
}

// Prepare response
$response = [
    'mode' => $mode,
    'usingCustomZombies' => $use_custom_zombies,
    'avgTotalZombies' => $use_custom_zombies ? $custom_attacking_zombies : $total_zombies_sum / $simulations,
    'minTotalZombies' => $use_custom_zombies ? $custom_attacking_zombies : $min_total_zombies,
    'maxTotalZombies' => $use_custom_zombies ? $custom_attacking_zombies : $max_total_zombies,
    'avgAttacking' => $average_attacking / $simulations,
    'minAttacking' => $min_attacking,
    'maxAttacking' => $max_attacking,
    'defenseBrokenPct' => $defense_broken_pct,
    'attacksBrokeDefense' => $attacks_broke_defense,
    'simulations' => $simulations,
    'targetsPerNight' => $in_town,
    'distribution' => $distribution,
    'cumulativeDistribution' => $cumulative_distribution,
    'distributionStats' => $distribution_stats,
    'customZombies' => $use_custom_zombies ? $custom_attacking_zombies : null,
    'survivalStats' => $survival_stats
];

if ($enable_flags) {
    $response['zombiesPerFlag'] = ($total_attracted / $simulations) / $num_flags;
    $response['totalAttracted'] = $total_attracted / $simulations;
    $response['remainingForDistribution'] = $total_remaining_distributed / $simulations;
}

echo json_encode($response);

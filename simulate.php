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

// Door state
$door_open = $input['doorState'] !== 'closed';
$door_state_seconds = match($input['doorState']) {
    'open-recent' => 1000,  // <30min
    'open-long' => 3600,    // >30min
    default => null
};

// ============================================================================
// ZOMBIE CALCULATION FUNCTIONS
// ============================================================================

function calculateActiveZombieFactor($players_alive, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population) {
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
    
    // Scale by targets and building level
    $level *= ((max(15, $targets) + (max(0, $b_level) * 2)) / $town_population);
    
    // Chaos and devastated bonuses
    $level += ($chaos ? 10 : 0);
    $level += ($devastated ? 10 : 0);
    
    // Return factor between 0.0 and 1.0
    return max(0, min($level / 100.0, 1.0));
}

function calculateTotalZombies($town_day, $attack_mode = 'normal') {
    // EXACT production formula from PrepareZombieAttackEstimationAction.php
    // Lines 52-67
    
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

function calculateAttackingZombies($town_day, $players_alive, $defense, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population, $attack_mode = 'normal') {
    // Calculate base zombies using Season 18 formula
    $total_zombies = calculateTotalZombies($town_day, $attack_mode);
    
    return applyDefenseAndActiveFactor($total_zombies, $defense, $door_open, $players_alive, $door_state_seconds, $house_level, $chaos, $devastated, $town_population);
}

function applyDefenseAndActiveFactor($total_zombies, $defense, $door_open, $players_alive, $door_state_seconds, $house_level, $chaos, $devastated, $town_population) {
    // Calculate overflow after defense - BUT only if door is closed!
    // If door is open, defense doesn't count
    if ($door_open) {
        $overflow = $total_zombies;  // No defense when door is open
    } else {
        $overflow = max(0, $total_zombies - $defense);  // Defense only applies when door is closed
    }
    
    // Calculate active factor
    $active_factor = calculateActiveZombieFactor($players_alive, $door_open, $door_state_seconds, $house_level, $chaos, $devastated, $town_population);
    $max_active = round($total_zombies * $active_factor);
    
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
// ============================================================================

$all_targets = range(1, $players_alive);
$num_in_town = min(
    10 + 2 * floor(max(0, $town_day - 10) / 2),
    ceil(count($all_targets) * 1.0)
);

$attack_distribution = array_fill(0, 8, 0);
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
        $attacking = applyDefenseAndActiveFactor(
            $total_zombies,
            $town_defense,
            $door_open,
            $players_alive,
            $door_state_seconds,
            $house_level,
            $chaos,
            $devastated,
            $town_population
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
        $attacking = calculateAttackingZombies(
            $town_day, 
            $players_alive, 
            $town_defense, 
            $door_open, 
            $door_state_seconds, 
            $house_level, 
            $chaos, 
            $devastated,
            $town_population,
            'normal'  // attack_mode: 'easy', 'normal', or 'hard'
        );
    }
    
    $average_attacking += $attacking;
    $min_attacking = min($min_attacking, $attacking);
    $max_attacking = max($max_attacking, $attacking);
    
    // Skip distribution if no zombies
    if ($attacking <= 0) {
        continue;
    }
    
    $attacks_broke_defense++;
    
    $targets = pick($all_targets, $num_in_town, true);
    $num_targets = count($targets);
    
    // Flag distribution logic
    $flag_holders = [];
    $flag_holder_set = []; // Track which indices have flags (for statistics)
    $remaining_attacking = $attacking;
    
    if ($enable_flags && $num_flags > 0 && $num_targets > 0) {
        $num_flags_to_assign = min($num_flags, $num_targets);
        
        if ($num_flags_to_assign === 1) {
            $flag_holder_indices = [mt_rand(0, $num_targets - 1)];
        } else {
            $flag_holder_indices = array_rand(range(0, $num_targets - 1), $num_flags_to_assign);
            if (!is_array($flag_holder_indices)) $flag_holder_indices = [$flag_holder_indices];
        }
        
        // Track flag users for later
        foreach ($flag_holder_indices as $idx) {
            $flag_holder_set[$idx] = true;
        }
        
        // Flag distribution logic:
        // 1. Divide active zombies by number of flags and round normally
        $zombies_per_flag = round($attacking / count($flag_holder_indices));
        
        // 2. Distribute to each flag user, subtracting from pool
        $remaining_pool = $attacking;
        $total_given_to_flags = 0;
        
        foreach ($flag_holder_indices as $idx) {
            $zombies_for_this_flag = min($remaining_pool, $zombies_per_flag);
            $flag_holders[$idx] = $zombies_for_this_flag;
            $remaining_pool -= $zombies_for_this_flag;
            $total_given_to_flags += $zombies_for_this_flag;
        }
        
        // Track statistics
        $total_zombies_per_flag += $zombies_per_flag;
        $total_attracted += $total_given_to_flags;
        
        // No remaining zombies - all went to flag users
        $remaining_attacking = 0;
    }
    
    // Track the remaining for proper statistics
    $total_remaining_distributed += $remaining_attacking;
    
    // Weighted random distribution
    $attack_counts = array_fill(0, $num_targets, 0);
    
    // If we have flags, flag users get the attracted zombies split among them
    // and remaining zombies are distributed to everyone
    if (!empty($flag_holders)) {
        // Distribute remaining zombies to everyone (including flag users)
        if ($remaining_attacking > 0) {
            $repartition = array_map(fn() => mt_rand() / mt_getrandmax(), range(0, $num_targets - 1));
            
            $unlucky_index = mt_rand(0, $num_targets - 1);
            $repartition[$unlucky_index] += 0.3;
            
            $sum = array_sum($repartition);
            foreach ($repartition as &$value) {
                $value /= $sum;
            }
            unset($value);
            
            $attack_counts = array_map(fn($p) => max(0, min($remaining_attacking, round($p * $remaining_attacking))), $repartition);
            $remaining_attacks = $remaining_attacking - array_sum($attack_counts);
            
            while ($remaining_attacks > 0 && $num_targets > 0) {
                $random_index = mt_rand(0, $num_targets - 1);
                $attack_counts[$random_index]++;
                $remaining_attacks--;
            }
        }
        
        // Add flag-attracted zombies to flag users
        foreach ($flag_holders as $idx => $flag_zombies) {
            $attack_counts[$idx] += round($flag_zombies);
        }
    } else {
        // No flags: normal weighted distribution
        $repartition = array_map(fn() => mt_rand() / mt_getrandmax(), range(0, $num_targets - 1));
        
        $unlucky_index = mt_rand(0, $num_targets - 1);
        $repartition[$unlucky_index] += 0.3;
        
        $sum = array_sum($repartition);
        foreach ($repartition as &$value) {
            $value /= $sum;
        }
        unset($value);
        
        $attack_counts = array_map(fn($p) => max(0, min($remaining_attacking, round($p * $remaining_attacking))), $repartition);
        $remaining_attacks = $remaining_attacking - array_sum($attack_counts);
        
        while ($remaining_attacks > 0 && $num_targets > 0) {
            $random_index = mt_rand(0, $num_targets - 1);
            $attack_counts[$random_index]++;
            $remaining_attacks--;
        }
    }
    
    // Track all people's attack counts - full distribution
    // This tells us: "X% of person-night combinations received Y attacks"
    foreach ($attack_counts as $count) {
        if (!isset($attack_distribution[$count])) {
            $attack_distribution[$count] = 0;
        }
        $attack_distribution[$count]++;
    }
    
    // Also track people who got 0 attacks
    $zero_attacks = $num_targets - count(array_filter($attack_counts, fn($c) => $c > 0));
    if (!isset($attack_distribution[0])) {
        $attack_distribution[0] = 0;
    }
    $attack_distribution[0] += $zero_attacks;
}

// Calculate probabilities (only when defense was broken)
$total_counts = array_sum($attack_distribution);
$distribution = [];
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
    
    // Calculate probabilities and find mode (excluding 0 attacks for peak detection)
    $max_prob = 0;
    foreach ($attack_distribution as $attacks => $count) {
        $prob = $count / $total_counts;
        $distribution[$attacks] = $prob;
        
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
}

// Calculate percentage of attacks that broke defense
$defense_broken_pct = ($attacks_broke_defense / $simulations) * 100;

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
    'targetsPerNight' => $num_in_town,
    'distribution' => $distribution,
    'distributionStats' => $distribution_stats,
    'customZombies' => $use_custom_zombies ? $custom_attacking_zombies : null
];

if ($enable_flags) {
    $response['zombiesPerFlag'] = $total_zombies_per_flag / $simulations;
    $response['totalAttracted'] = $total_attracted / $simulations;
    $response['remainingForDistribution'] = $total_remaining_distributed / $simulations;
}

echo json_encode($response);

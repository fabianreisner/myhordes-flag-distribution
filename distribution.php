<?php

$num_in_town = 10; // Default, updated dynamically
$simulations = 1000000; // 1 million simulations
$attack_distribution = array_fill(0, 8, 0); // Stores counts for 1-6, and 7+
$average_attacking = 0;
$average_base_zombies = 0;
$town_day = 46; // Current day +1 for how the night behaves
$players_alive = 39;
$all_targets = range(1, $players_alive); // Example pool, adjust as needed

// $house_level = 1 
// 2 for barracks, ect

// Compute $in_town based on the day
$num_in_town = min(
    10 + 2 * floor(max(0, $town_day - 10) / 2),
    ceil(count($all_targets) * 1.0)
);

function calculateMaxActiveZombies($town_day, $players_alive, $house_level = 1) {
  $factor = 1.0 + (mt_rand(0,50)/100.0);
  return round(($players_alive / 3.0) * $town_day * ($house_level + $factor));
}

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
    // Pick up to $num_in_town targets
    $targets = pick($all_targets, $num_in_town, true);
    $num_targets = count($targets);
    $maxActiveZombies = calculateMaxActiveZombies($town_day, $players_alive);
    $base_zombies = round($maxActiveZombies / 40);
    $average_base_zombies += $base_zombies;
    $attacking = $maxActiveZombies % 40 + $base_zombies * (40 - $players_alive);
    $average_attacking += $attacking;


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

    // Allocate attacks
    $attack_counts = array_map(fn($p) => max(0, min($attacking, round($p * $attacking))), $repartition);
    $remaining_attacks = $attacking - array_sum($attack_counts);

    // Distribute leftover attacks randomly
    while ($remaining_attacks > 0 && $num_targets > 0) {
        $random_index = mt_rand(0, $num_targets - 1);
        $attack_counts[$random_index]++;
        $remaining_attacks--;
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

echo "    Attack Night of ".($town_day - 1) . " -> ". $town_day."\n";
echo "    Average Attacking Zombies: ".number_format($average_attacking / $simulations, 4) . "\n";
echo "    Average Base Zombies: ".number_format($average_base_zombies / $simulations, 4) . "\n";
foreach ($attack_distribution as $attacks => $count) {
    $prob = $count / $total_counts * 100;
    if ($attacks < 7) {
        echo "    P(attacks == $attacks): " . number_format($prob, 4) . "%\n";
    } else {
        echo "    P(attacks >= 7+): " . number_format($prob, 4) . "%\n";
    }
}

?>
